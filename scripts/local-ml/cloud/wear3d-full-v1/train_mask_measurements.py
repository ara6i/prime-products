#!/usr/bin/env python3
"""Train the full WEAR mask-to-measurements model.

The input contract is deliberately narrow and honest: a front-facing binary
body mask plus user-supplied height, weight, and gender. WEAR has no matching
consumer photographs, so this job does not claim to learn clothing removal or
raw-photo segmentation. Those are evaluated separately with real photos.
"""

from __future__ import annotations

import argparse
import json
import math
import random
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import boto3
import numpy as np
from PIL import Image
import torch
from torch import nn
from torch.nn import functional as F
from torch.utils.data import DataLoader, Dataset


ROW_NAMES = ("neck", "chest", "underbust", "waist", "hips")
ROW_FIELDS = ("y_norm", "left_x_norm", "right_x_norm", "depth_ratio")
SEGMENT_NAMES = ("shoulders", "right_sleeve", "left_sleeve", "right_inseam", "left_inseam")
IMAGE_WIDTH = 192
IMAGE_HEIGHT = 256


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--epochs", type=int, default=24)
    parser.add_argument("--batch-size", type=int, default=64)
    parser.add_argument("--status-bucket", required=True)
    parser.add_argument("--status-key", required=True)
    parser.add_argument("--pipeline-id", required=True)
    parser.add_argument("--workers", type=int, default=2)
    return parser.parse_args()


def finite_number(value: Any) -> float | None:
    try:
        result = float(value)
    except (TypeError, ValueError):
        return None
    return result if math.isfinite(result) else None


def flatten_targets(record: dict[str, Any]) -> dict[str, float]:
    targets: dict[str, float] = {}
    rows = record.get("rows") or {}
    for row_name in ROW_NAMES:
        row = rows.get(row_name) or {}
        if row.get("accepted") is not True:
            continue
        for field in ROW_FIELDS:
            value = finite_number(row.get(field))
            if value is not None:
                targets[f"row.{row_name}.{field}"] = value

    # C scans use A landmarks only for orientation. Their masks and tape/body
    # measurements are still useful, but their projected landmark segments are
    # not valid target coordinates for that exact scan.
    if record.get("landmark_targets_valid") is True:
        segments = record.get("segments") or {}
        for segment_name in SEGMENT_NAMES:
            points = segments.get(segment_name) or []
            for point_index, point in enumerate(points):
                if not isinstance(point, dict) or point.get("visible") is not True:
                    continue
                for axis in ("x", "y"):
                    value = finite_number(point.get(axis))
                    if value is not None:
                        targets[f"segment.{segment_name}.{point_index}.{axis}"] = value

    for namespace in ("measurements_mm", "extracted_standing_mm"):
        values = record.get(namespace) or {}
        for name, raw_value in values.items():
            value = finite_number(raw_value)
            if value is not None:
                # Centimeters are easier to read in the exported metrics and SDK.
                targets[f"{namespace}.{name}"] = value / 10.0
    return targets


def load_records(manifest: Path) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    with manifest.open("r", encoding="utf-8") as handle:
        for line in handle:
            if not line.strip():
                continue
            record = json.loads(line)
            if record.get("error"):
                continue
            mask = Path(str(record.get("mask", "")))
            if not mask.exists():
                continue
            record["_mask_path"] = str(mask)
            record["_targets"] = flatten_targets(record)
            records.append(record)
    return records


def target_unit(key: str) -> str:
    if key.startswith("measurements_mm.") or key.startswith("extracted_standing_mm."):
        return "cm"
    return "normalized_image_or_ratio"


@dataclass
class Normalization:
    structured_mean: np.ndarray
    structured_std: np.ndarray
    target_mean: np.ndarray
    target_std: np.ndarray


def structured_values(record: dict[str, Any]) -> np.ndarray:
    gender = 1.0 if record.get("gender") == "female" else 0.0
    return np.asarray(
        [record["height_cm"], record["weight_kg"], record["bmi"], gender],
        dtype=np.float32,
    )


def compute_normalization(records: list[dict[str, Any]], target_keys: list[str]) -> Normalization:
    structured = np.stack([structured_values(record) for record in records])
    structured_mean = structured.mean(axis=0)
    structured_std = np.maximum(structured.std(axis=0), 1e-5)

    values = np.full((len(records), len(target_keys)), np.nan, dtype=np.float32)
    for row_index, record in enumerate(records):
        for column_index, key in enumerate(target_keys):
            value = record["_targets"].get(key)
            if value is not None:
                values[row_index, column_index] = value
    target_mean = np.nanmean(values, axis=0)
    target_std = np.nanstd(values, axis=0)
    target_mean = np.nan_to_num(target_mean, nan=0.0)
    target_std = np.maximum(np.nan_to_num(target_std, nan=1.0), 1e-4)
    return Normalization(structured_mean, structured_std, target_mean, target_std)


class WearMaskDataset(Dataset):
    def __init__(
        self,
        records: list[dict[str, Any]],
        target_keys: list[str],
        normalization: Normalization,
    ) -> None:
        self.records = records
        self.target_keys = target_keys
        self.normalization = normalization

    def __len__(self) -> int:
        return len(self.records)

    def __getitem__(self, index: int):
        record = self.records[index]
        with Image.open(record["_mask_path"]) as image:
            mask = image.convert("L").resize((IMAGE_WIDTH, IMAGE_HEIGHT), Image.Resampling.BILINEAR)
            image_values = np.asarray(mask, dtype=np.float32) / 255.0
        image_tensor = torch.from_numpy(image_values).unsqueeze(0)

        structured = (structured_values(record) - self.normalization.structured_mean) / self.normalization.structured_std
        target_values = np.zeros(len(self.target_keys), dtype=np.float32)
        target_mask = np.zeros(len(self.target_keys), dtype=np.float32)
        for target_index, key in enumerate(self.target_keys):
            value = record["_targets"].get(key)
            if value is None:
                continue
            target_values[target_index] = (
                (value - self.normalization.target_mean[target_index])
                / self.normalization.target_std[target_index]
            )
            target_mask[target_index] = 1.0
        return (
            image_tensor,
            torch.from_numpy(structured.astype(np.float32)),
            torch.from_numpy(target_values),
            torch.from_numpy(target_mask),
        )


class MaskMeasurementModel(nn.Module):
    def __init__(self, target_count: int) -> None:
        super().__init__()
        channels = (1, 16, 32, 64, 96, 128)
        layers: list[nn.Module] = []
        for input_channels, output_channels in zip(channels, channels[1:]):
            layers.extend(
                [
                    nn.Conv2d(input_channels, output_channels, kernel_size=3, stride=2, padding=1, bias=False),
                    nn.BatchNorm2d(output_channels),
                    nn.SiLU(inplace=True),
                ]
            )
        self.vision = nn.Sequential(*layers, nn.AdaptiveAvgPool2d((8, 6)))
        self.structured = nn.Sequential(nn.Linear(4, 32), nn.SiLU(), nn.Linear(32, 32), nn.SiLU())
        self.head = nn.Sequential(
            nn.Flatten(),
            nn.Linear(128 * 8 * 6 + 32, 384),
            nn.SiLU(),
            nn.Dropout(0.15),
            nn.Linear(384, target_count),
        )

    def forward(self, image: torch.Tensor, structured: torch.Tensor) -> torch.Tensor:
        image_features = self.vision(image).flatten(1)
        structured_features = self.structured(structured)
        return self.head(torch.cat((image_features, structured_features), dim=1))


class StatusWriter:
    def __init__(self, bucket: str, key: str) -> None:
        self.bucket = bucket
        self.key = key
        self.s3 = boto3.client("s3")

    def update(self, *, epoch: int, epochs: int, detail: str) -> None:
        try:
            response = self.s3.get_object(Bucket=self.bucket, Key=self.key)
            status = json.loads(response["Body"].read())
            percent = epoch / max(epochs, 1)
            status.update(
                {
                    "state": "running",
                    "overallPercent": round(70.0 + percent * 24.0, 2),
                    "currentStage": "train",
                    "currentStageLabel": f"Training the photo-mask model: epoch {epoch}/{epochs}",
                    "detail": detail,
                }
            )
            status["stages"][3].update({"state": "running", "percent": round(percent * 100.0, 2)})
            status["updatedAt"] = __import__("datetime").datetime.now(
                __import__("datetime").timezone.utc
            ).isoformat().replace("+00:00", "Z")
            self.s3.put_object(
                Bucket=self.bucket,
                Key=self.key,
                Body=json.dumps(status, indent=2).encode("utf-8"),
                ContentType="application/json",
                ServerSideEncryption="AES256",
            )
        except Exception as error:  # Training must not die because a progress write failed.
            print(f"status_update_warning={type(error).__name__}: {error}", flush=True)


def masked_loss(prediction: torch.Tensor, target: torch.Tensor, mask: torch.Tensor) -> torch.Tensor:
    per_value = F.smooth_l1_loss(prediction, target, reduction="none", beta=0.5)
    return (per_value * mask).sum() / mask.sum().clamp_min(1.0)


@torch.no_grad()
def evaluate_loss(model: nn.Module, loader: DataLoader, device: torch.device) -> float:
    model.eval()
    total_loss = 0.0
    total_batches = 0
    for image, structured, target, mask in loader:
        prediction = model(image.to(device), structured.to(device))
        loss = masked_loss(prediction, target.to(device), mask.to(device))
        total_loss += float(loss.item())
        total_batches += 1
    return total_loss / max(total_batches, 1)


@torch.no_grad()
def native_metrics(
    model: nn.Module,
    loader: DataLoader,
    device: torch.device,
    target_keys: list[str],
    normalization: Normalization,
) -> dict[str, Any]:
    model.eval()
    absolute_errors: list[list[float]] = [[] for _ in target_keys]
    target_mean = torch.from_numpy(normalization.target_mean).to(device)
    target_std = torch.from_numpy(normalization.target_std).to(device)
    for image, structured, target, mask in loader:
        prediction = model(image.to(device), structured.to(device))
        prediction_native = prediction * target_std + target_mean
        target_native = target.to(device) * target_std + target_mean
        error = torch.abs(prediction_native - target_native).cpu().numpy()
        valid = mask.numpy() > 0.5
        for column in range(len(target_keys)):
            absolute_errors[column].extend(error[valid[:, column], column].tolist())
    per_target = {}
    for key, values in zip(target_keys, absolute_errors):
        per_target[key] = {
            "count": len(values),
            "mae": round(float(np.mean(values)), 5) if values else None,
            "median_absolute_error": round(float(np.median(values)), 5) if values else None,
            "unit": target_unit(key),
        }
    key_measurements = {
        key: per_target[key]
        for key in target_keys
        if key in {
            "measurements_mm.chest_circumference_mm",
            "measurements_mm.underbust_circumference_mm",
            "measurements_mm.waist_circumference_mm",
            "measurements_mm.hip_circumference_mm",
            "measurements_mm.neck_base_circumference_mm",
            "measurements_mm.shoulder_breadth_mm",
            "measurements_mm.arm_length_shoulder_to_wrist_mm",
        }
    }
    return {"key_measurements": key_measurements, "all_targets": per_target}


def main() -> None:
    args = parse_args()
    random.seed(20260813)
    np.random.seed(20260813)
    torch.manual_seed(20260813)
    args.output_dir.mkdir(parents=True, exist_ok=True)

    records = load_records(args.manifest)
    if len(records) < 1_000:
        raise RuntimeError(f"Only {len(records)} valid rendered records; refusing full training")
    by_role = {
        role: [record for record in records if record.get("role") == role]
        for role in ("train", "validation", "test")
    }
    if any(not split for split in by_role.values()):
        raise RuntimeError(f"Missing subject-level split: { {key: len(value) for key, value in by_role.items()} }")

    target_keys = sorted({key for record in by_role["train"] for key in record["_targets"]})
    normalization = compute_normalization(by_role["train"], target_keys)
    datasets = {
        role: WearMaskDataset(split, target_keys, normalization)
        for role, split in by_role.items()
    }
    loaders = {
        "train": DataLoader(
            datasets["train"],
            batch_size=args.batch_size,
            shuffle=True,
            num_workers=args.workers,
            pin_memory=True,
            persistent_workers=args.workers > 0,
        ),
        "validation": DataLoader(datasets["validation"], batch_size=args.batch_size, num_workers=args.workers),
        "test": DataLoader(datasets["test"], batch_size=args.batch_size, num_workers=args.workers),
    }

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = MaskMeasurementModel(len(target_keys)).to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=2e-3, weight_decay=2e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=max(args.epochs, 1), eta_min=1e-5)
    scaler = torch.amp.GradScaler("cuda", enabled=device.type == "cuda")
    status = StatusWriter(args.status_bucket, args.status_key)

    best_validation = float("inf")
    best_state: dict[str, torch.Tensor] | None = None
    history = []
    for epoch in range(1, args.epochs + 1):
        model.train()
        total = 0.0
        batches = 0
        for image, structured, target, mask in loaders["train"]:
            image = image.to(device, non_blocking=True)
            structured = structured.to(device, non_blocking=True)
            target = target.to(device, non_blocking=True)
            mask = mask.to(device, non_blocking=True)
            optimizer.zero_grad(set_to_none=True)
            with torch.amp.autocast("cuda", enabled=device.type == "cuda"):
                prediction = model(image, structured)
                loss = masked_loss(prediction, target, mask)
            scaler.scale(loss).backward()
            scaler.step(optimizer)
            scaler.update()
            total += float(loss.item())
            batches += 1
        scheduler.step()
        train_loss = total / max(batches, 1)
        validation_loss = evaluate_loss(model, loaders["validation"], device)
        history.append(
            {
                "epoch": epoch,
                "train_loss": round(train_loss, 7),
                "validation_loss": round(validation_loss, 7),
                "learning_rate": optimizer.param_groups[0]["lr"],
            }
        )
        if validation_loss < best_validation:
            best_validation = validation_loss
            best_state = {key: value.detach().cpu().clone() for key, value in model.state_dict().items()}
        detail = (
            f"Using {len(by_role['train']):,} rendered scans for training and "
            f"{len(by_role['validation']):,} scans from different people for validation. "
            f"Validation loss: {validation_loss:.4f}."
        )
        print(f"epoch={epoch}/{args.epochs} train_loss={train_loss:.6f} validation_loss={validation_loss:.6f}", flush=True)
        status.update(epoch=epoch, epochs=args.epochs, detail=detail)

    if best_state is None:
        raise RuntimeError("Training did not produce a checkpoint")
    model.load_state_dict(best_state)
    model.eval()
    metrics = native_metrics(model, loaders["test"], device, target_keys, normalization)
    metrics.update(
        {
            "split": {role: len(split) for role, split in by_role.items()},
            "subjects": {role: len({record["subject_id"] for record in split}) for role, split in by_role.items()},
            "best_validation_loss": best_validation,
            "device": str(device),
            "synthetic_only": True,
        }
    )

    checkpoint = {
        "schema_version": 1,
        "model_version": args.pipeline_id,
        "state_dict": best_state,
        "target_keys": target_keys,
        "structured_keys": ["height_cm", "weight_kg", "bmi", "gender_female"],
        "structured_mean": normalization.structured_mean.tolist(),
        "structured_std": normalization.structured_std.tolist(),
        "target_mean": normalization.target_mean.tolist(),
        "target_std": normalization.target_std.tolist(),
        "image_size": [IMAGE_WIDTH, IMAGE_HEIGHT],
    }
    torch.save(checkpoint, args.output_dir / "model.pt")
    (args.output_dir / "training-history.json").write_text(json.dumps(history, indent=2), encoding="utf-8")
    (args.output_dir / "test-metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    metadata = {
        "schema_version": 1,
        "model_version": args.pipeline_id,
        "input": "front binary body mask plus height_cm, weight_kg, bmi, gender_female",
        "output_target_count": len(target_keys),
        "output_targets": [{"key": key, "unit": target_unit(key)} for key in target_keys],
        "split": metrics["split"],
        "subject_split": metrics["subjects"],
        "important_limit": "WEAR provides 3D meshes, not paired consumer photos. Real-photo accuracy is not proven by this checkpoint.",
    }
    (args.output_dir / "model-metadata.json").write_text(json.dumps(metadata, indent=2), encoding="utf-8")

    cpu_model = model.cpu()
    example_image = torch.zeros(1, 1, IMAGE_HEIGHT, IMAGE_WIDTH)
    example_structured = torch.zeros(1, 4)
    traced = torch.jit.trace(cpu_model, (example_image, example_structured))
    traced.save(str(args.output_dir / "model.ts"))
    try:
        torch.onnx.export(
            cpu_model,
            (example_image, example_structured),
            args.output_dir / "model.onnx",
            input_names=["body_mask", "profile"],
            output_names=["targets"],
            dynamic_axes={"body_mask": {0: "batch"}, "profile": {0: "batch"}, "targets": {0: "batch"}},
            opset_version=17,
        )
    except Exception as error:
        (args.output_dir / "onnx-export-warning.txt").write_text(
            f"{type(error).__name__}: {error}\n",
            encoding="utf-8",
        )
        print(f"onnx_export_warning={type(error).__name__}: {error}", flush=True)

    print(json.dumps({"records": len(records), "targets": len(target_keys), "device": str(device)}), flush=True)


if __name__ == "__main__":
    main()
