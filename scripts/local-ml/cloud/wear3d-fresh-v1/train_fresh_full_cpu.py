#!/usr/bin/env python3
"""Train the full fresh WEAR silhouette-to-geometry student on CPU or CUDA.

This model consumes only a front silhouette plus height, weight, BMI and gender.
Every teacher target has an independent mask. The sealed 448-person test split
is structurally forbidden by the compact index contract.
"""

from __future__ import annotations

import argparse
import json
import math
import os
import random
import signal
import sys
import threading
import time
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np
import torch
from PIL import Image, ImageDraw
from torch import nn

try:
    import boto3
    from botocore.config import Config
except ImportError:  # RunPod uses a preloaded archive and presigned uploads.
    boto3 = None
    Config = None

from fresh_student_contract import (
    IMAGE_HEIGHT,
    IMAGE_WIDTH,
    PROFILE_FIELDS,
    target_groups,
    target_schema,
)


GROUP_WEIGHTS = {"row": 4.0, "shape": 1.5, "tape": 2.0, "ratio": 1.0, "camera": 1.0}
ROW_NAMES = ("neck", "chest", "underbust", "waist", "hips")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--index", required=True, type=Path)
    parser.add_argument("--index-metadata", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("--masks-dir", required=True, type=Path)
    parser.add_argument("--bucket", default="")
    parser.add_argument("--report-prefix", default="")
    parser.add_argument("--job-id", required=True)
    parser.add_argument("--device", choices=("auto", "cpu", "cuda"), default="auto")
    parser.add_argument("--local-inputs-only", action="store_true")
    parser.add_argument("--progress-upload-url", default="")
    parser.add_argument("--checkpoint-upload-url", default="")
    parser.add_argument("--result-upload-url", default="")
    parser.add_argument("--overlay-upload-url", default="")
    parser.add_argument("--epochs", type=int, default=60)
    parser.add_argument("--min-epochs", type=int, default=15)
    parser.add_argument("--patience", type=int, default=10)
    parser.add_argument("--batch-size", type=int, default=512)
    parser.add_argument("--learning-rate", type=float, default=0.002)
    parser.add_argument("--torch-threads", type=int, default=96)
    parser.add_argument("--download-workers", type=int, default=96)
    parser.add_argument("--decode-workers", type=int, default=48)
    parser.add_argument("--max-wall-minutes", type=float, default=100.0)
    parser.add_argument("--seed", type=int, default=20260824)
    return parser.parse_args()


def now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def write_json(path: Path, payload: Any) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n")
    temporary.replace(path)


class ResidualBlock(nn.Module):
    def __init__(self, input_channels: int, output_channels: int, stride: int = 1) -> None:
        super().__init__()
        self.body = nn.Sequential(
            nn.Conv2d(input_channels, output_channels, 3, stride=stride, padding=1, bias=False),
            nn.BatchNorm2d(output_channels),
            nn.SiLU(inplace=True),
            nn.Conv2d(output_channels, output_channels, 3, padding=1, bias=False),
            nn.BatchNorm2d(output_channels),
        )
        self.skip = (
            nn.Identity()
            if stride == 1 and input_channels == output_channels
            else nn.Sequential(
                nn.Conv2d(input_channels, output_channels, 1, stride=stride, bias=False),
                nn.BatchNorm2d(output_channels),
            )
        )
        self.activation = nn.SiLU(inplace=True)

    def forward(self, inputs: torch.Tensor) -> torch.Tensor:
        return self.activation(self.body(inputs) + self.skip(inputs))


class FreshGeometryStudent(nn.Module):
    """Position-preserving CNN with balanced geometry, shape, tape and ratio heads."""

    def __init__(self, output_count: int) -> None:
        super().__init__()
        x_axis = torch.linspace(-1.0, 1.0, IMAGE_WIDTH).view(1, 1, 1, IMAGE_WIDTH)
        y_axis = torch.linspace(-1.0, 1.0, IMAGE_HEIGHT).view(1, 1, IMAGE_HEIGHT, 1)
        grid_x = x_axis.expand(1, 1, IMAGE_HEIGHT, IMAGE_WIDTH)
        grid_y = y_axis.expand(1, 1, IMAGE_HEIGHT, IMAGE_WIDTH)
        self.register_buffer("coordinate_grid", torch.cat((grid_x, grid_y), dim=1), persistent=True)
        self.encoder = nn.Sequential(
            nn.Conv2d(3, 24, 5, stride=2, padding=2, bias=False),
            nn.BatchNorm2d(24),
            nn.SiLU(inplace=True),
            ResidualBlock(24, 24),
            ResidualBlock(24, 48, stride=2),
            ResidualBlock(48, 48),
            ResidualBlock(48, 72, stride=2),
            ResidualBlock(72, 72),
            ResidualBlock(72, 96, stride=2),
            ResidualBlock(96, 96),
        )
        self.profile_encoder = nn.Sequential(
            nn.Linear(len(PROFILE_FIELDS), 32),
            nn.SiLU(inplace=True),
            nn.Linear(32, 32),
            nn.SiLU(inplace=True),
        )
        self.shared = nn.Sequential(
            nn.Linear(96 * 8 * 6 + 32, 512),
            nn.LayerNorm(512),
            nn.SiLU(inplace=True),
            nn.Dropout(0.05),
            nn.Linear(512, 256),
            nn.SiLU(inplace=True),
        )
        self.output = nn.Linear(256, output_count)

    def forward(self, silhouette: torch.Tensor, profile: torch.Tensor) -> torch.Tensor:
        grid = self.coordinate_grid.expand(silhouette.shape[0], -1, -1, -1)
        encoded = self.encoder(torch.cat((silhouette, grid), dim=1)).flatten(1)
        profile_encoded = self.profile_encoder(profile)
        return self.output(self.shared(torch.cat((encoded, profile_encoded), dim=1)))


def meaningful_silhouette(opened: Image.Image) -> Image.Image:
    if "A" in opened.getbands():
        alpha = opened.getchannel("A")
        if alpha.getextrema()[0] != alpha.getextrema()[1]:
            return alpha
    return opened.convert("L")


def main() -> int:
    args = parse_args()
    started_monotonic = time.monotonic()
    started_at = now()
    random.seed(args.seed)
    np.random.seed(args.seed)
    torch.manual_seed(args.seed)
    if args.device == "cuda" and not torch.cuda.is_available():
        raise RuntimeError("CUDA was requested but is unavailable")
    device = torch.device(
        "cuda" if args.device == "cuda" or (args.device == "auto" and torch.cuda.is_available()) else "cpu"
    )
    torch.set_num_threads(max(1, min(args.torch_threads, os.cpu_count() or 1)))
    torch.set_num_interop_threads(4)
    torch.backends.mkldnn.enabled = True
    if device.type == "cuda":
        torch.backends.cudnn.benchmark = True
        torch.cuda.manual_seed_all(args.seed)

    output_dir = args.output_dir.resolve()
    masks_dir = args.masks_dir.resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    masks_dir.mkdir(parents=True, exist_ok=True)
    progress_path = output_dir / "progress.json"
    result_path = output_dir / "final-result.json"
    checkpoint_path = output_dir / "best-checkpoint.pt"
    overlay_path = output_dir / "validation-overlay.jpg"
    report_prefix = args.report_prefix.strip("/")
    if args.local_inputs_only:
        s3 = None
        required_urls = (
            args.progress_upload_url,
            args.checkpoint_upload_url,
            args.result_upload_url,
            args.overlay_upload_url,
        )
        if not all(required_urls):
            raise RuntimeError("Local-input mode requires four presigned artifact upload URLs")
    else:
        if boto3 is None or Config is None or not args.bucket or not report_prefix:
            raise RuntimeError("S3 mode requires boto3, bucket and report prefix")
        s3 = boto3.client(
            "s3",
            config=Config(
                max_pool_connections=max(128, args.download_workers + 16),
                retries={"max_attempts": 8, "mode": "adaptive"},
            ),
        )

    def http_put(url: str, body: bytes, content_type: str) -> None:
        request = urllib.request.Request(
            url,
            data=body,
            method="PUT",
            headers={"Content-Type": content_type},
        )
        with urllib.request.urlopen(request, timeout=180) as response:
            if not 200 <= response.status < 300:
                raise RuntimeError(f"Presigned upload failed with HTTP {response.status}")

    def upload_artifact(path: Path, key: str, content_type: str, upload_url: str) -> None:
        if s3 is not None:
            s3.upload_file(
                str(path), args.bucket, f"{report_prefix}/{key}",
                ExtraArgs={"ServerSideEncryption": "AES256", "ContentType": content_type},
            )
        else:
            http_put(upload_url, path.read_bytes(), content_type)
    progress_lock = threading.Lock()
    progress: dict[str, Any] = {
        "schemaVersion": "wear3d-fresh-full-cpu-progress/v1",
        "jobId": args.job_id,
        "state": "starting",
        "startedAt": started_at,
        "device": str(device),
        "freshInitialization": True,
        "previousWeightsUsed": False,
        "previousPredictionsUsed": False,
        "v9ArtifactUsed": False,
        "sealedTestSubjectsUsed": 0,
    }

    def publish(**updates: Any) -> None:
        with progress_lock:
            progress.update(updates)
            progress["updatedAt"] = now()
            write_json(progress_path, progress)
            if s3 is not None:
                s3.put_object(
                    Bucket=args.bucket,
                    Key=f"{report_prefix}/progress.json",
                    Body=progress_path.read_bytes(),
                    ContentType="application/json",
                    ServerSideEncryption="AES256",
                )
            else:
                http_put(args.progress_upload_url, progress_path.read_bytes(), "application/json")

    def interrupted(signum: int, _frame: Any) -> None:
        try:
            publish(state="interrupted", signal=signum, completedAt=now())
        finally:
            raise SystemExit(128 + signum)

    signal.signal(signal.SIGTERM, interrupted)
    signal.signal(signal.SIGINT, interrupted)

    metadata = json.loads(args.index_metadata.read_text())
    if (
        metadata.get("schemaVersion") != "wear3d-fresh-training-index/v1"
        or metadata.get("records") != {"train": 31_059, "validation": 3_843}
        or metadata.get("subjects") != {"train": 3_451, "validation": 427}
        or metadata.get("sealedTestSubjectsUsed") != 0
        or metadata.get("v9ArtifactUsed") is not False
        or metadata.get("previousWeightsUsed") is not False
    ):
        raise RuntimeError("Fresh training index provenance failed")

    packed = np.load(args.index, allow_pickle=False)
    schema = packed["target_schema"].tolist()
    if schema != target_schema():
        raise RuntimeError("Fresh training target schema mismatch")
    sample_ids = packed["sample_ids"]
    scan_ids = packed["scan_ids"]
    view_ids = packed["view_ids"]
    roles = packed["roles"]
    s3_keys = packed["s3_keys"]
    profiles = packed["profiles"].astype(np.float32, copy=False)
    raw_targets = packed["targets"].astype(np.float32, copy=False)
    target_masks = packed["masks"].astype(np.bool_, copy=False)
    target_means = packed["target_means"].astype(np.float32, copy=False)
    target_stds = packed["target_standard_deviations"].astype(np.float32, copy=False)
    if len(sample_ids) != 34_902 or set(np.unique(roles).tolist()) != {0, 1}:
        raise RuntimeError("Fresh training index record roles changed")
    train_indices_np = np.flatnonzero(roles == 0)
    validation_indices_np = np.flatnonzero(roles == 1)
    if len(np.unique(scan_ids[train_indices_np])) != 3_451 or len(np.unique(scan_ids[validation_indices_np])) != 427:
        raise RuntimeError("Fresh subject split changed inside packed index")

    publish(
        state="downloading_masks",
        trainSubjects=3_451,
        validationSubjects=427,
        trainRecords=int(len(train_indices_np)),
        validationRecords=int(len(validation_indices_np)),
        totalMasks=int(len(sample_ids)),
        downloadedMasks=0,
    )

    def download_one(index: int) -> int:
        destination = masks_dir / f"{sample_ids[index]}.png"
        if destination.is_file() and destination.stat().st_size > 0:
            return index
        temporary = destination.with_suffix(".png.part")
        response = s3.get_object(Bucket=args.bucket, Key=str(s3_keys[index]))
        temporary.write_bytes(response["Body"].read())
        temporary.replace(destination)
        return index

    completed_downloads = 0
    if args.local_inputs_only:
        missing_local = [
            str(sample_ids[index])
            for index in range(len(sample_ids))
            if not (masks_dir / f"{sample_ids[index]}.png").is_file()
        ]
        if missing_local:
            raise RuntimeError(f"Preloaded RunPod archive is missing {len(missing_local)} masks")
        completed_downloads = len(sample_ids)
        publish(downloadedMasks=completed_downloads)
    else:
        with ThreadPoolExecutor(max_workers=args.download_workers) as executor:
            futures = [executor.submit(download_one, index) for index in range(len(sample_ids))]
            for future in as_completed(futures):
                future.result()
                completed_downloads += 1
                if completed_downloads % 1_000 == 0 or completed_downloads == len(sample_ids):
                    publish(downloadedMasks=completed_downloads)

    publish(state="decoding_masks", decodedMasks=0)
    images = np.empty((len(sample_ids), IMAGE_HEIGHT, IMAGE_WIDTH), dtype=np.uint8)

    def decode_one(index: int) -> tuple[int, np.ndarray]:
        with Image.open(masks_dir / f"{sample_ids[index]}.png") as opened:
            silhouette = meaningful_silhouette(opened)
            resized = silhouette.resize(
                (IMAGE_WIDTH, IMAGE_HEIGHT),
                getattr(Image, "Resampling", Image).BILINEAR,
            )
            return index, np.asarray(resized, dtype=np.uint8)

    completed_decodes = 0
    with ThreadPoolExecutor(max_workers=args.decode_workers) as executor:
        futures = [executor.submit(decode_one, index) for index in range(len(sample_ids))]
        for future in as_completed(futures):
            index, array = future.result()
            images[index] = array
            completed_decodes += 1
            if completed_decodes % 2_000 == 0 or completed_decodes == len(sample_ids):
                publish(decodedMasks=completed_decodes)

    image_standard_deviations = images.reshape(len(images), -1).std(axis=1)
    blank_images = int((image_standard_deviations <= 5.0).sum())
    if blank_images:
        raise RuntimeError(f"Fresh silhouette decode produced {blank_images} blank images")

    standardized_targets = np.where(
        target_masks,
        (raw_targets - target_means) / target_stds,
        0.0,
    ).astype(np.float32)
    images_tensor = torch.from_numpy(images)
    profiles_tensor = torch.from_numpy(profiles)
    targets_tensor = torch.from_numpy(standardized_targets)
    masks_tensor = torch.from_numpy(target_masks)
    train_indices = torch.from_numpy(train_indices_np.astype(np.int64))
    validation_indices = torch.from_numpy(validation_indices_np.astype(np.int64))
    groups = target_groups(schema)
    group_tensors = {
        name: torch.tensor(indices, dtype=torch.long, device=device)
        for name, indices in groups.items()
    }

    model = FreshGeometryStudent(len(schema)).to(device)
    parameter_count = sum(parameter.numel() for parameter in model.parameters())
    optimizer = torch.optim.AdamW(
        model.parameters(), lr=args.learning_rate, weight_decay=1e-4
    )
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(
        optimizer, T_max=args.epochs, eta_min=args.learning_rate * 0.02
    )
    amp_enabled = device.type == "cuda"
    scaler = torch.amp.GradScaler("cuda", enabled=amp_enabled)

    def loss_components(
        predictions: torch.Tensor,
        expected: torch.Tensor,
        masks: torch.Tensor,
    ) -> tuple[torch.Tensor, dict[str, torch.Tensor]]:
        components: dict[str, torch.Tensor] = {}
        weighted = predictions.new_tensor(0.0)
        weight_total = 0.0
        squared = (predictions - expected).square()
        for name, indices in group_tensors.items():
            group_mask = masks.index_select(1, indices)
            denominator = group_mask.sum().clamp_min(1)
            component = (
                squared.index_select(1, indices) * group_mask
            ).sum() / denominator
            components[name] = component
            weight = GROUP_WEIGHTS[name]
            weighted = weighted + component * weight
            weight_total += weight
        return weighted / weight_total, components

    def batches(indices: torch.Tensor, shuffle: bool):
        order = indices[torch.randperm(len(indices))] if shuffle else indices
        for start in range(0, len(order), args.batch_size):
            yield order[start:start + args.batch_size]

    def forward_indices(batch_indices: torch.Tensor) -> torch.Tensor:
        silhouettes = images_tensor[batch_indices].to(device, non_blocking=amp_enabled)
        silhouettes = silhouettes.unsqueeze(1).float().div_(255.0)
        profile_batch = profiles_tensor[batch_indices].to(device, non_blocking=amp_enabled)
        return model(silhouettes, profile_batch)

    def evaluate(indices: torch.Tensor, keep_predictions: bool = False) -> dict[str, Any]:
        model.eval()
        group_squared_sums = {name: 0.0 for name in groups}
        group_mask_counts = {name: 0 for name in groups}
        predictions_out: list[np.ndarray] = []
        with torch.no_grad():
            for batch_indices in batches(indices, shuffle=False):
                with torch.autocast(device_type=device.type, dtype=torch.float16, enabled=amp_enabled):
                    predictions = forward_indices(batch_indices)
                expected = targets_tensor[batch_indices].to(device, non_blocking=amp_enabled)
                batch_masks = masks_tensor[batch_indices].to(device, non_blocking=amp_enabled)
                squared = (predictions - expected).square()
                for name, group_indices in group_tensors.items():
                    group_mask = batch_masks.index_select(1, group_indices)
                    group_squared_sums[name] += float(
                        (squared.index_select(1, group_indices) * group_mask).sum()
                    )
                    group_mask_counts[name] += int(group_mask.sum())
                if keep_predictions:
                    predictions_out.append(predictions.cpu().numpy())
        group_losses = {
            name: group_squared_sums[name] / max(group_mask_counts[name], 1)
            for name in groups
        }
        weighted_loss = sum(
            group_losses[name] * GROUP_WEIGHTS[name] for name in groups
        ) / sum(GROUP_WEIGHTS.values())
        return {
            "weightedLoss": weighted_loss,
            "groupLosses": group_losses,
            "predictions": np.concatenate(predictions_out) if keep_predictions else None,
        }

    baseline_group_losses: dict[str, float] = {}
    validation_expected = targets_tensor[validation_indices].to(device)
    validation_masks = masks_tensor[validation_indices].to(device)
    zero_predictions = torch.zeros_like(validation_expected)
    baseline_weighted_tensor, baseline_components = loss_components(
        zero_predictions, validation_expected, validation_masks
    )
    baseline_weighted = float(baseline_weighted_tensor)
    baseline_group_losses = {name: float(value) for name, value in baseline_components.items()}

    publish(
        state="training",
        parameterCount=parameter_count,
        epochsPlanned=args.epochs,
        epoch=0,
        blankImages=blank_images,
        baselineValidationLoss=baseline_weighted,
        baselineValidationGroupLosses=baseline_group_losses,
    )

    best_validation_loss = math.inf
    best_epoch = 0
    epochs_without_improvement = 0
    history: list[dict[str, Any]] = []
    training_started = time.monotonic()
    stopped_reason = "epochs_completed"
    for epoch in range(1, args.epochs + 1):
        if (time.monotonic() - started_monotonic) / 60.0 >= args.max_wall_minutes:
            stopped_reason = "maximum_wall_time"
            break
        epoch_started = time.monotonic()
        model.train()
        epoch_loss_sum = 0.0
        epoch_samples = 0
        epoch_groups = {name: 0.0 for name in groups}
        for batch_indices in batches(train_indices, shuffle=True):
            optimizer.zero_grad(set_to_none=True)
            with torch.autocast(device_type=device.type, dtype=torch.float16, enabled=amp_enabled):
                predictions = forward_indices(batch_indices)
                loss, components = loss_components(
                    predictions,
                    targets_tensor[batch_indices].to(device, non_blocking=amp_enabled),
                    masks_tensor[batch_indices].to(device, non_blocking=amp_enabled),
                )
            if not torch.isfinite(loss):
                raise RuntimeError("Fresh full training produced non-finite loss")
            scaler.scale(loss).backward()
            scaler.unscale_(optimizer)
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=5.0)
            scaler.step(optimizer)
            scaler.update()
            batch_size = len(batch_indices)
            epoch_loss_sum += float(loss.detach()) * batch_size
            epoch_samples += batch_size
            for name, component in components.items():
                epoch_groups[name] += float(component.detach()) * batch_size
        scheduler.step()
        validation = evaluate(validation_indices)
        epoch_seconds = time.monotonic() - epoch_started
        train_loss = epoch_loss_sum / max(epoch_samples, 1)
        train_group_losses = {
            name: value / max(epoch_samples, 1) for name, value in epoch_groups.items()
        }
        validation_loss = float(validation["weightedLoss"])
        improved = validation_loss < best_validation_loss - 1e-5
        if improved:
            best_validation_loss = validation_loss
            best_epoch = epoch
            epochs_without_improvement = 0
            torch.save(
                {
                    "model": "FreshGeometryStudent-v1",
                    "modelStateDict": model.state_dict(),
                    "targetSchema": schema,
                    "targetMeans": target_means.tolist(),
                    "targetStandardDeviations": target_stds.tolist(),
                    "profileFields": list(PROFILE_FIELDS),
                    "imageSize": [IMAGE_WIDTH, IMAGE_HEIGHT],
                    "teacherJobId": metadata["teacherJobId"],
                    "trainingIndexSha256": metadata["indexSha256"],
                    "epoch": epoch,
                    "validationLoss": validation_loss,
                    "freshInitialization": True,
                    "previousWeightsUsed": False,
                    "previousPredictionsUsed": False,
                    "v9ArtifactUsed": False,
                    "sealedTestSubjectsUsed": 0,
                },
                checkpoint_path,
            )
            upload_artifact(
                checkpoint_path, "best-checkpoint.pt", "application/octet-stream",
                args.checkpoint_upload_url,
            )
        else:
            epochs_without_improvement += 1
        elapsed_training = time.monotonic() - training_started
        average_epoch_seconds = elapsed_training / epoch
        estimated_remaining = average_epoch_seconds * max(args.epochs - epoch, 0)
        entry = {
            "epoch": epoch,
            "epochSeconds": epoch_seconds,
            "trainLoss": train_loss,
            "trainGroupLosses": train_group_losses,
            "validationLoss": validation_loss,
            "validationGroupLosses": validation["groupLosses"],
            "learningRate": optimizer.param_groups[0]["lr"],
            "improved": improved,
        }
        history.append(entry)
        publish(
            state="training",
            epoch=epoch,
            epochsPlanned=args.epochs,
            epochSeconds=epoch_seconds,
            averageEpochSeconds=average_epoch_seconds,
            estimatedRemainingSeconds=estimated_remaining,
            estimatedTotalMinutes=(time.monotonic() - started_monotonic + estimated_remaining) / 60.0,
            trainLoss=train_loss,
            validationLoss=validation_loss,
            validationGroupLosses=validation["groupLosses"],
            bestEpoch=best_epoch,
            bestValidationLoss=best_validation_loss,
            epochsWithoutImprovement=epochs_without_improvement,
        )
        print(
            f"epoch={epoch:03d} seconds={epoch_seconds:.2f} "
            f"train={train_loss:.6f} validation={validation_loss:.6f} "
            f"best={best_validation_loss:.6f}@{best_epoch}",
            flush=True,
        )
        if epoch >= args.min_epochs and epochs_without_improvement >= args.patience:
            stopped_reason = "early_stopping"
            break

    if not checkpoint_path.is_file():
        raise RuntimeError("Fresh full training produced no checkpoint")
    checkpoint = torch.load(checkpoint_path, map_location="cpu", weights_only=False)
    model.load_state_dict(checkpoint["modelStateDict"])
    best_validation = evaluate(validation_indices, keep_predictions=True)
    predictions_z = best_validation.pop("predictions")
    predictions_raw = predictions_z * target_stds + target_means
    validation_targets_raw = raw_targets[validation_indices_np]
    validation_masks_np = target_masks[validation_indices_np]
    schema_index = {key: index for index, key in enumerate(schema)}

    def target_mae(key: str) -> float | None:
        index = schema_index[key]
        valid = validation_masks_np[:, index]
        if not valid.any():
            return None
        return float(np.abs(predictions_raw[valid, index] - validation_targets_raw[valid, index]).mean())

    row_metrics: dict[str, Any] = {}
    for row in ROW_NAMES:
        y_mae = target_mae(f"row.{row}.y_norm")
        left_mae = target_mae(f"row.{row}.left_x_norm")
        right_mae = target_mae(f"row.{row}.right_x_norm")
        shape_keys = [
            key for key in schema if key.startswith(f"row.{row}.shape.")
        ]
        shape_errors = [target_mae(key) for key in shape_keys]
        shape_values = [value for value in shape_errors if value is not None]
        row_metrics[row] = {
            "yNormMae": y_mae,
            "yPixelMaeAt256": None if y_mae is None else y_mae * 256.0,
            "edgeNormMae": None if left_mae is None or right_mae is None else (left_mae + right_mae) / 2.0,
            "edgePixelMaeAt192": None if left_mae is None or right_mae is None else (left_mae + right_mae) * 96.0,
            "widthCmMae": target_mae(f"row.{row}.width_cm"),
            "depthCmMae": target_mae(f"row.{row}.depth_cm"),
            "depthWidthRatioMae": target_mae(f"row.{row}.depth_width_ratio"),
            "shapeCoordinateMae": None if not shape_values else float(np.mean(shape_values)),
            "tapeCmMae": target_mae(f"tape.{row}.circumference_cm"),
        }

    ratio_errors = [target_mae(key) for key in schema if key.startswith("ratio.")]
    ratio_values = [value for value in ratio_errors if value is not None]
    camera_metrics = {
        key: target_mae(key)
        for key in schema
        if key.startswith("camera.correction_")
    }
    critical_rows = ("chest", "waist", "hips")
    critical_line_gate = all(
        row_metrics[row]["yPixelMaeAt256"] is not None
        and row_metrics[row]["yPixelMaeAt256"] <= 6.0
        and row_metrics[row]["edgePixelMaeAt192"] is not None
        and row_metrics[row]["edgePixelMaeAt192"] <= 6.0
        for row in critical_rows
    )
    tape_gate = all(
        row_metrics[row]["tapeCmMae"] is not None
        and row_metrics[row]["tapeCmMae"] <= 5.0
        for row in ("waist", "hips")
    )
    beats_baseline = bool(
        best_validation["weightedLoss"] < baseline_weighted
        and best_validation["groupLosses"]["row"] < baseline_group_losses["row"]
    )
    eligible_for_sealed_test = bool(beats_baseline and critical_line_gate and tape_gate)

    canonical_positions = [
        position
        for position, index in enumerate(validation_indices_np)
        if view_ids[index] == "canonical"
    ][:16]
    columns = 4
    card_width = 384
    card_height = 548
    sheet_rows = max(1, math.ceil(len(canonical_positions) / columns))
    sheet = Image.new("RGB", (columns * card_width, 48 + sheet_rows * card_height), "#07111f")
    sheet_draw = ImageDraw.Draw(sheet)
    sheet_draw.text(
        (12, 14),
        f"Full {str(device).upper()} validation: teacher orange | prediction cyan",
        fill="#ffffff",
    )
    for card_number, validation_position in enumerate(canonical_positions):
        index = validation_indices_np[validation_position]
        silhouette = Image.fromarray(images[index], mode="L")
        source = Image.new("RGB", silhouette.size, "#07111f")
        source.paste(Image.new("RGB", silhouette.size, "#e5e7eb"), mask=silhouette)
        source = source.resize((card_width, 512), getattr(Image, "Resampling", Image).BILINEAR)
        draw = ImageDraw.Draw(source)
        for row in critical_rows:
            keys = (
                f"row.{row}.y_norm",
                f"row.{row}.left_x_norm",
                f"row.{row}.right_x_norm",
            )
            indices = [schema_index[key] for key in keys]
            if not validation_masks_np[validation_position, indices].all():
                continue
            teacher_y, teacher_left, teacher_right = validation_targets_raw[validation_position, indices]
            predicted_y, predicted_left, predicted_right = predictions_raw[validation_position, indices]
            draw.line(
                (
                    float(np.clip(teacher_left, 0, 1)) * card_width,
                    float(np.clip(teacher_y, 0, 1)) * 512,
                    float(np.clip(teacher_right, 0, 1)) * card_width,
                    float(np.clip(teacher_y, 0, 1)) * 512,
                ),
                fill="#fb923c",
                width=5,
            )
            draw.line(
                (
                    float(np.clip(predicted_left, 0, 1)) * card_width,
                    float(np.clip(predicted_y, 0, 1)) * 512,
                    float(np.clip(predicted_right, 0, 1)) * card_width,
                    float(np.clip(predicted_y, 0, 1)) * 512,
                ),
                fill="#22d3ee",
                width=2,
            )
        draw.rectangle((0, 0, card_width, 24), fill="#07111f")
        draw.text((8, 6), str(scan_ids[index]), fill="#ffffff")
        x = (card_number % columns) * card_width
        y = 48 + (card_number // columns) * card_height
        sheet.paste(source, (x, y))
    sheet.save(overlay_path, quality=92)

    result = {
        "schemaVersion": "wear3d-fresh-full-cpu-result/v1",
        "jobId": args.job_id,
        "state": "completed",
        "completedAt": now(),
        "elapsedMinutes": (time.monotonic() - started_monotonic) / 60.0,
        "device": str(device),
        "model": "FreshGeometryStudent-v1",
        "parameterCount": parameter_count,
        "freshInitialization": True,
        "previousWeightsUsed": False,
        "previousPredictionsUsed": False,
        "v9ArtifactUsed": False,
        "sealedTestSubjectsUsed": 0,
        "train": {"subjects": 3_451, "records": 31_059},
        "validation": {"subjects": 427, "records": 3_843},
        "training": {
            "epochsPlanned": args.epochs,
            "epochsCompleted": len(history),
            "bestEpoch": best_epoch,
            "stoppedReason": stopped_reason,
            "history": history,
        },
        "baselineValidation": {
            "weightedLoss": baseline_weighted,
            "groupLosses": baseline_group_losses,
        },
        "bestValidation": best_validation,
        "metrics": {
            "rows": row_metrics,
            "meanRatioMae": None if not ratio_values else float(np.mean(ratio_values)),
            "camera": camera_metrics,
        },
        "qualityGates": {
            "beatsMeanBaseline": beats_baseline,
            "criticalLineGate": critical_line_gate,
            "waistHipTapeGate": tape_gate,
            "eligibleForSealedWear448": eligible_for_sealed_test,
        },
        "artifacts": {
            "checkpoint": (
                f"s3://{args.bucket}/{report_prefix}/best-checkpoint.pt"
                if s3 is not None else "presigned-upload:best-checkpoint.pt"
            ),
            "validationOverlay": (
                f"s3://{args.bucket}/{report_prefix}/validation-overlay.jpg"
                if s3 is not None else "presigned-upload:validation-overlay.jpg"
            ),
        },
        "limitations": [
            "This geometry student consumes a synthetic silhouette plus height, weight, BMI and gender, not raw RGB.",
            "A normal photograph still requires segmentation, pose and camera normalization before this model.",
            "The sealed 448-person WEAR test remains untouched until every validation gate passes.",
        ],
    }
    write_json(result_path, result)
    upload_artifact(result_path, "final-result.json", "application/json", args.result_upload_url)
    upload_artifact(overlay_path, "validation-overlay.jpg", "image/jpeg", args.overlay_upload_url)
    publish(
        state="completed",
        completedAt=result["completedAt"],
        elapsedMinutes=result["elapsedMinutes"],
        epochsCompleted=len(history),
        bestEpoch=best_epoch,
        bestValidationLoss=best_validation["weightedLoss"],
        eligibleForSealedWear448=eligible_for_sealed_test,
        finalResultKey=f"{report_prefix}/final-result.json",
    )
    print(json.dumps({
        "state": "completed",
        "elapsedMinutes": result["elapsedMinutes"],
        "epochsCompleted": len(history),
        "bestEpoch": best_epoch,
        "bestValidationLoss": best_validation["weightedLoss"],
        "eligibleForSealedWear448": eligible_for_sealed_test,
    }, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
