#!/usr/bin/env python3
"""Train the full WEAR mask-to-measurements model.

The input contract is deliberately narrow and honest: a front-facing binary
body mask plus user-supplied height, weight, and gender. WEAR has no matching
consumer photographs, so this job does not claim to learn clothing removal or
raw-photo segmentation. Those are evaluated separately with real photos.
"""

from __future__ import annotations

import argparse
from collections import Counter
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

from teacher_target_contract import build_ratio_targets, include_measurement_target


ROW_NAMES = ("neck", "chest", "underbust", "waist", "hips")
ROW_DIRECT_FIELDS = ("y_norm", "left_x_norm", "right_x_norm", "depth_ratio")
ROW_DERIVED_FIELDS = ("visible_width_cm", "depth_cm")
ROW_FIELDS = ROW_DIRECT_FIELDS + ROW_DERIVED_FIELDS
SEGMENT_NAMES = ("shoulders", "right_sleeve", "left_sleeve", "right_inseam", "left_inseam")
IMAGE_WIDTH = 192
IMAGE_HEIGHT = 256
VALID_TRAINING_POSE = "standing_neutral"
LANDMARK_MIN_TRAIN_COVERAGE = 0.95
EXCLUDED_MEASUREMENT_TARGETS = {"stature_mm", "weight_kg"}
CORE_MEASUREMENT_TARGETS = {
    "measurements_mm.chest_circumference_mm",
    "measurements_mm.underbust_circumference_mm",
    "measurements_mm.waist_circumference_mm",
    "measurements_mm.hip_circumference_mm",
    "measurements_mm.neck_base_circumference_mm",
    "measurements_mm.shoulder_breadth_mm",
    "measurements_mm.arm_length_shoulder_to_wrist_mm",
}
CORE_ROW_TARGETS = {
    f"row.{name}.{field}"
    for name in ROW_NAMES
    for field in ROW_FIELDS
}
SYNTHETIC_MAE_LIMITS_CM = {
    "measurements_mm.chest_circumference_mm": 6.0,
    "measurements_mm.underbust_circumference_mm": 6.0,
    "measurements_mm.waist_circumference_mm": 6.0,
    "measurements_mm.hip_circumference_mm": 6.0,
    "measurements_mm.neck_base_circumference_mm": 4.0,
    "measurements_mm.shoulder_breadth_mm": 4.0,
    "measurements_mm.arm_length_shoulder_to_wrist_mm": 5.0,
}
ROW_Y_MAE_LIMIT = 0.035
ROW_EDGE_MAE_LIMIT = 0.025
ROW_DEPTH_RATIO_MAE_LIMIT = 0.15
ROW_PHYSICAL_MAE_LIMIT_CM = 6.0
LANDMARK_AGGREGATE_MAE_LIMIT = 0.03
LANDMARK_BASELINE_WIN_RATE_MIN = 0.80


def runtime_manifest_payload(
    checkpoint: dict[str, Any],
    metrics: dict[str, Any],
) -> dict[str, Any]:
    """Build the small manifest consumed by the local ONNX photo-test API."""

    gate = metrics.get("evaluation_gate") or {}
    return {
        "schemaVersion": checkpoint["schema_version"],
        "modelVersion": checkpoint["model_version"],
        "targetKeys": checkpoint["target_keys"],
        "structuredKeys": checkpoint["structured_keys"],
        "structuredMean": checkpoint["structured_mean"],
        "structuredStd": checkpoint["structured_std"],
        "targetMean": checkpoint["target_mean"],
        "targetStd": checkpoint["target_std"],
        "imageSize": checkpoint["image_size"],
        "trainingPose": checkpoint["training_pose"],
        "maskCleanup": checkpoint["mask_cleanup"],
        "syntheticCandidatePassed": bool(gate.get("synthetic_candidate_passed")),
        "sdkReady": False,
        "split": metrics["split"],
        "keyMeasurements": metrics["key_measurements"],
        "importantLimit": gate.get(
            "note",
            "Passing the synthetic gate still requires a separate paired real-photo test before SDK use.",
        ),
    }


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
        accepted = row.get("accepted") is True
        edge_valid = bool(
            row.get("edge_target_valid") is not False
            and (
                row.get("edge_teacher_accepted") is True
                or (
                    "edge_teacher_accepted" not in row
                    and accepted
                    and row.get("geometry_target_valid") is True
                )
            )
        )
        depth_valid = bool(
            row.get("depth_target_valid") is not False
            and (
                row.get("depth_teacher_accepted") is True
                or (
                    "depth_teacher_accepted" not in row
                    and accepted
                    and row.get("geometry_target_valid") is True
                )
            )
        )
        for field in ("y_norm", "left_x_norm", "right_x_norm"):
            if not edge_valid:
                continue
            value = finite_number(row.get(field))
            if value is not None:
                targets[f"row.{row_name}.{field}"] = value
        depth_ratio = finite_number(row.get("depth_ratio")) if edge_valid and depth_valid else None
        if depth_ratio is not None:
            targets[f"row.{row_name}.depth_ratio"] = depth_ratio
        visible_width_mm = finite_number(row.get("visible_width_mm")) if edge_valid else None
        if visible_width_mm is not None:
            targets[f"row.{row_name}.visible_width_cm"] = visible_width_mm / 10.0
        depth_mm = finite_number(row.get("tape_calibrated_depth_mm")) if depth_valid else None
        if depth_mm is None:
            depth_mm = finite_number(row.get("mesh_depth_mm")) if depth_valid else None
        if depth_mm is not None:
            targets[f"row.{row_name}.depth_cm"] = depth_mm / 10.0

    # Only neutral standing-A scans pass load_records. Their projected
    # landmark segments therefore belong to the exact rendered scan.
    if record.get("landmark_targets_valid") is True:
        landmarks = record.get("landmarks_2d") or {}
        for landmark_name, point in landmarks.items():
            if not isinstance(point, dict) or point.get("visible") is not True:
                continue
            for axis in ("x", "y"):
                value = finite_number(point.get(axis))
                if value is not None:
                    targets[f"landmark.{landmark_name}.{axis}"] = value

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
            if namespace == "measurements_mm" and name in EXCLUDED_MEASUREMENT_TARGETS:
                continue
            if not include_measurement_target(namespace, name, rows):
                # Namespace-level source contract; geometry validity is
                # handled independently by each row target mask.
                continue
            value = finite_number(raw_value)
            if value is not None:
                # Centimeters are easier to read in the exported metrics and SDK.
                targets[f"{namespace}.{name}"] = value / 10.0
    # Ratios are auxiliary prediction targets, never structured inputs. They
    # share the same per-value target mask as every other multi-task output.
    targets.update(build_ratio_targets(record))
    return targets


def load_records(manifest: Path) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    invalid_records: list[str] = []
    missing_masks: list[str] = []
    with manifest.open("r", encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, start=1):
            if not line.strip():
                continue
            record = json.loads(line)
            if record.get("error"):
                continue
            scan_id = str(record.get("scan_id", ""))
            reasons = []
            if record.get("pose") != VALID_TRAINING_POSE:
                reasons.append(f"pose={record.get('pose')!r}")
            if record.get("training_pose_valid") is not True:
                reasons.append("training_pose_valid is not true")
            if not scan_id.endswith("-A"):
                reasons.append(f"scan_id={scan_id!r} is not an A scan")
            if record.get("landmark_targets_valid") is not True:
                reasons.append("landmark targets are not exact for this scan")
            if (record.get("mask_cleanup") or {}).get("method") != "largest-connected-silhouette":
                reasons.append("mask was not cleaned with largest-connected-silhouette")
            if reasons:
                invalid_records.append(f"line {line_number} {scan_id}: {', '.join(reasons)}")
                continue
            mask = Path(str(record.get("mask", "")))
            if not mask.exists():
                missing_masks.append(f"line {line_number} {scan_id}: {mask}")
                continue
            record["_mask_path"] = str(mask)
            record["_targets"] = flatten_targets(record)
            records.append(record)
    if invalid_records:
        raise RuntimeError(
            f"Training manifest contains {len(invalid_records)} semantically invalid successful records; "
            f"examples: {invalid_records[:5]}"
        )
    if missing_masks:
        raise RuntimeError(
            f"Training manifest is missing {len(missing_masks)} mask files; examples: {missing_masks[:5]}"
        )
    subject_ids = [str(record.get("subject_id", "")) for record in records]
    if len(subject_ids) != len(set(subject_ids)):
        raise RuntimeError("Training manifest contains more than one successful A scan for a subject")
    return records


def target_unit(key: str) -> str:
    if (
        key.startswith("measurements_mm.")
        or key.startswith("extracted_standing_mm.")
        or key.endswith((".visible_width_cm", ".depth_cm"))
    ):
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
            mask = image.convert("L").resize((IMAGE_WIDTH, IMAGE_HEIGHT), Image.Resampling.NEAREST)
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


def target_loss_weights(target_keys: list[str]) -> torch.Tensor:
    weights = []
    for key in target_keys:
        if key in CORE_MEASUREMENT_TARGETS:
            weights.append(2.5)
        elif key.startswith("row."):
            weights.append(2.0)
        elif key.startswith("ratio."):
            weights.append(1.5)
        else:
            weights.append(1.0)
    return torch.tensor(weights, dtype=torch.float32)


def masked_loss(
    prediction: torch.Tensor,
    target: torch.Tensor,
    mask: torch.Tensor,
    weights: torch.Tensor,
) -> torch.Tensor:
    per_value = F.smooth_l1_loss(prediction, target, reduction="none", beta=0.5)
    weighted_mask = mask * weights.unsqueeze(0)
    return (per_value * weighted_mask).sum() / weighted_mask.sum().clamp_min(1.0)


@torch.no_grad()
def evaluate_loss(
    model: nn.Module,
    loader: DataLoader,
    device: torch.device,
    weights: torch.Tensor,
) -> float:
    model.eval()
    total_loss = 0.0
    total_batches = 0
    for image, structured, target, mask in loader:
        prediction = model(image.to(device), structured.to(device))
        loss = masked_loss(prediction, target.to(device), mask.to(device), weights)
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
    baseline_errors: list[list[float]] = [[] for _ in target_keys]
    target_mean = torch.from_numpy(normalization.target_mean).to(device)
    target_std = torch.from_numpy(normalization.target_std).to(device)
    for image, structured, target, mask in loader:
        prediction = model(image.to(device), structured.to(device))
        prediction_native = prediction * target_std + target_mean
        target_native = target.to(device) * target_std + target_mean
        error = torch.abs(prediction_native - target_native).cpu().numpy()
        baseline_error = torch.abs(target_native - target_mean.unsqueeze(0)).cpu().numpy()
        valid = mask.numpy() > 0.5
        for column in range(len(target_keys)):
            absolute_errors[column].extend(error[valid[:, column], column].tolist())
            baseline_errors[column].extend(baseline_error[valid[:, column], column].tolist())
    per_target = {}
    for key, values, baseline_values in zip(target_keys, absolute_errors, baseline_errors):
        model_mae = float(np.mean(values)) if values else None
        baseline_mae = float(np.mean(baseline_values)) if baseline_values else None
        improvement = (
            (baseline_mae - model_mae) / baseline_mae * 100.0
            if model_mae is not None and baseline_mae is not None and baseline_mae > 1e-8
            else None
        )
        per_target[key] = {
            "count": len(values),
            "mae": round(model_mae, 5) if model_mae is not None else None,
            "median_absolute_error": round(float(np.median(values)), 5) if values else None,
            "train_mean_baseline_mae": round(baseline_mae, 5) if baseline_mae is not None else None,
            "improvement_vs_train_mean_pct": round(improvement, 3) if improvement is not None else None,
            "beats_train_mean_baseline": bool(
                model_mae is not None and baseline_mae is not None and model_mae < baseline_mae
            ),
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
    landmark_results = {
        key: result
        for key, result in per_target.items()
        if key.startswith("landmark.")
    }
    landmark_maes = [
        float(result["mae"])
        for result in landmark_results.values()
        if result["mae"] is not None and result["count"] >= 20
    ]
    landmark_baseline_wins = [
        bool(result["beats_train_mean_baseline"])
        for result in landmark_results.values()
        if result["mae"] is not None and result["count"] >= 20
    ]
    landmark_summary = {
        "landmark_points": len(landmark_results) // 2,
        "coordinate_targets": len(landmark_results),
        "mean_coordinate_mae": round(float(np.mean(landmark_maes)), 5) if landmark_maes else None,
        "baseline_win_rate": (
            round(sum(landmark_baseline_wins) / len(landmark_baseline_wins), 4)
            if landmark_baseline_wins
            else None
        ),
    }
    failures = []
    for key in sorted(CORE_MEASUREMENT_TARGETS):
        result = per_target.get(key)
        if not result or result["count"] < 20:
            failures.append(f"{key}: insufficient unseen-subject labels")
            continue
        if not result["beats_train_mean_baseline"]:
            failures.append(f"{key}: did not beat the train-mean baseline")
        if result["mae"] is None or result["mae"] > SYNTHETIC_MAE_LIMITS_CM[key]:
            failures.append(
                f"{key}: MAE {result['mae']} cm exceeds {SYNTHETIC_MAE_LIMITS_CM[key]} cm"
            )
    for key in sorted(CORE_ROW_TARGETS):
        result = per_target.get(key)
        if not result or result["count"] < 20:
            failures.append(f"{key}: insufficient unseen-subject labels")
            continue
        if not result["beats_train_mean_baseline"]:
            failures.append(f"{key}: did not beat the train-mean baseline")
        field = key.rsplit(".", 1)[-1]
        if field in {"left_x_norm", "right_x_norm"}:
            limit = ROW_EDGE_MAE_LIMIT
        elif field == "y_norm":
            limit = ROW_Y_MAE_LIMIT
        elif field == "depth_ratio":
            limit = ROW_DEPTH_RATIO_MAE_LIMIT
        else:
            limit = ROW_PHYSICAL_MAE_LIMIT_CM
        if result["mae"] is None or result["mae"] > limit:
            failures.append(f"{key}: MAE {result['mae']} exceeds {limit} {target_unit(key)}")
    if not landmark_maes:
        failures.append("landmarks: no usable unseen-subject landmark labels")
    elif landmark_summary["mean_coordinate_mae"] > LANDMARK_AGGREGATE_MAE_LIMIT:
        failures.append(
            "landmarks: mean normalized coordinate MAE "
            f"{landmark_summary['mean_coordinate_mae']} exceeds {LANDMARK_AGGREGATE_MAE_LIMIT}"
        )
    if (
        landmark_summary["baseline_win_rate"] is None
        or landmark_summary["baseline_win_rate"] < LANDMARK_BASELINE_WIN_RATE_MIN
    ):
        failures.append(
            "landmarks: baseline win rate "
            f"{landmark_summary['baseline_win_rate']} is below {LANDMARK_BASELINE_WIN_RATE_MIN}"
        )
    return {
        "key_measurements": key_measurements,
        "landmarks": landmark_summary,
        "all_targets": per_target,
        "evaluation_gate": {
            "synthetic_candidate_passed": not failures,
            "sdk_ready": False,
            "failures": failures,
            "note": "Passing this gate still requires a separate paired real-photo test before SDK use.",
        },
    }


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
    role_subjects = {
        role: {str(record["subject_id"]) for record in split}
        for role, split in by_role.items()
    }
    overlap = {
        f"{left}-{right}": sorted(role_subjects[left] & role_subjects[right])[:5]
        for left, right in (("train", "validation"), ("train", "test"), ("validation", "test"))
        if role_subjects[left] & role_subjects[right]
    }
    if overlap:
        raise RuntimeError(f"Subject leakage across splits: {overlap}")

    train_target_counts = Counter(
        key
        for record in by_role["train"]
        for key in record["_targets"]
    )
    landmark_coverage_floor = math.ceil(len(by_role["train"]) * LANDMARK_MIN_TRAIN_COVERAGE)
    landmark_prefixes = {
        key.rsplit(".", 1)[0]
        for key in train_target_counts
        if key.startswith("landmark.")
    }
    selected_landmark_prefixes = {
        prefix
        for prefix in landmark_prefixes
        if all(
            train_target_counts.get(f"{prefix}.{axis}", 0) >= landmark_coverage_floor
            for axis in ("x", "y")
        )
    }
    dropped_landmark_prefixes = sorted(landmark_prefixes - selected_landmark_prefixes)
    target_keys = sorted(
        key
        for key in train_target_counts
        if not key.startswith("landmark.") or key.rsplit(".", 1)[0] in selected_landmark_prefixes
    )
    required_targets = CORE_MEASUREMENT_TARGETS | CORE_ROW_TARGETS
    missing_targets = sorted(required_targets - set(target_keys))
    if missing_targets:
        raise RuntimeError(f"Core targets are missing from the training split: {missing_targets}")
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
    loss_weights = target_loss_weights(target_keys).to(device)
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
                loss = masked_loss(prediction, target, mask, loss_weights)
            scaler.scale(loss).backward()
            scaler.step(optimizer)
            scaler.update()
            total += float(loss.item())
            batches += 1
        scheduler.step()
        train_loss = total / max(batches, 1)
        validation_loss = evaluate_loss(model, loaders["validation"], device, loss_weights)
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
            "training_pose": VALID_TRAINING_POSE,
            "target_schema": {
                "target_count": len(target_keys),
                "landmark_points": len(selected_landmark_prefixes),
                "landmark_min_train_coverage": LANDMARK_MIN_TRAIN_COVERAGE,
                "landmark_coverage_floor": landmark_coverage_floor,
                "dropped_sparse_landmarks": dropped_landmark_prefixes,
            },
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
        "training_pose": VALID_TRAINING_POSE,
        "mask_cleanup": "largest-connected-silhouette",
    }
    torch.save(checkpoint, args.output_dir / "model.pt")
    (args.output_dir / "training-history.json").write_text(json.dumps(history, indent=2), encoding="utf-8")
    (args.output_dir / "test-metrics.json").write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    (args.output_dir / "runtime.json").write_text(
        json.dumps(runtime_manifest_payload(checkpoint, metrics), indent=2),
        encoding="utf-8",
    )
    metadata = {
        "schema_version": 1,
        "model_version": args.pipeline_id,
        "input": "front binary body mask plus height_cm, weight_kg, bmi, gender_female",
        "output_target_count": len(target_keys),
        "output_targets": [{"key": key, "unit": target_unit(key)} for key in target_keys],
        "split": metrics["split"],
        "subject_split": metrics["subjects"],
        "training_pose": "neutral standing A only",
        "mask_cleanup": "largest connected human silhouette",
        "row_output": "neck, chest, underbust, waist, and hip height, torso edges, depth ratio, width, depth, and certified-width ratios",
        "row_edge_postprocess": "use trained WEAR torso edges for every row; retain MediaPipe torso isolation only as a safety fallback",
        "full_target_training": {
            "core_measurement_loss_weight": 2.5,
            "row_loss_weight": 2.0,
            "ratio_loss_weight": 1.5,
            "recorded_tape_target": "independent-direct-head-kept-when-PLY-shape-is-missing",
            "ratio_contract": "auxiliary outputs derived only from certified front-observable widths; never model inputs",
            "edge_labels": "closed WEAR torso-section bounds that exclude arms",
            "landmark_points": len(selected_landmark_prefixes),
            "segments": list(SEGMENT_NAMES),
            "dropped_sparse_landmarks": dropped_landmark_prefixes,
        },
        "synthetic_candidate_passed": metrics["evaluation_gate"]["synthetic_candidate_passed"],
        "sdk_ready": False,
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
