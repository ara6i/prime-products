#!/usr/bin/env python3
"""Train the isolated observable waist/hip V3 student without the 448 cohort."""

from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
import os
from pathlib import Path
import random
from typing import Any

import numpy as np
import onnx
from PIL import Image
import torch
import torch.nn.functional as F

from observable_student import (
    CAMERA_FIELDS,
    EXACT_AB_FIELDS,
    FEATURE_FIELDS,
    OUTLINE_FIELDS,
    PCA_COMPONENTS,
    PROFILE_FIELDS,
    ROWS,
    UPPER_BODY_FIELDS,
    DecoderArrays,
    ObservableExportModel,
    ObservableStudentV3,
    deterministic_pca,
    latent_schema,
    output_schema,
)


EXPECTED_TRAIN_SUBJECTS = 3_451
EXPECTED_VALIDATION_SUBJECTS = 427
GEOMETRY_REJECTIONS = {
    "raw-ply-slice-open",
    "reconstructed-or-fallback-slice",
    "section-closure-over-2pct",
    "row-height-disagrees-with-wear-source",
    "row-missing",
    "geometry-target-invalid",
    "teacher-geometry-changes-with-camera",
    "missing-camera-card",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--index", type=Path, required=True)
    parser.add_argument("--masks-dir", type=Path, required=True)
    parser.add_argument("--teacher-audit", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--epochs", type=int, default=160)
    parser.add_argument("--batch-size", type=int, default=512)
    parser.add_argument("--learning-rate", type=float, default=8e-4)
    parser.add_argument("--patience", type=int, default=24)
    parser.add_argument("--workers", type=int, default=min(24, os.cpu_count() or 8))
    parser.add_argument("--device", choices=("auto", "cpu", "mps"), default="auto")
    parser.add_argument("--seed", type=int, default=20260825)
    return parser.parse_args()


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def write_json(path: Path, payload: Any) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n")
    temporary.replace(path)


def summarize(errors: np.ndarray) -> dict[str, int | float | None]:
    finite = np.asarray(errors, dtype=np.float64)
    finite = finite[np.isfinite(finite)]
    if not len(finite):
        return {"count": 0, "mae": None, "median": None, "p90": None, "p95": None, "maximum": None}
    return {
        "count": int(len(finite)),
        "mae": float(finite.mean()),
        "median": float(np.quantile(finite, 0.50)),
        "p90": float(np.quantile(finite, 0.90)),
        "p95": float(np.quantile(finite, 0.95)),
        "maximum": float(finite.max()),
    }


def decode_outline(path: Path) -> np.ndarray:
    resampling = getattr(Image, "Resampling", Image)
    sample_y = np.linspace(0, 127, 64).round().astype(np.int64)
    with Image.open(path) as opened:
        if "A" in opened.getbands():
            alpha = opened.getchannel("A")
            plane = alpha if alpha.getextrema()[0] != alpha.getextrema()[1] else opened.convert("L")
        else:
            plane = opened.convert("L")
        pixels = np.asarray(plane.resize((96, 128), resampling.BILINEAR), dtype=np.float32) / 255.0
    foreground = pixels >= 0.20
    left = np.zeros(128, dtype=np.float32)
    right = np.zeros(128, dtype=np.float32)
    span = np.zeros(128, dtype=np.float32)
    center = np.zeros(128, dtype=np.float32)
    for y in range(128):
        columns = np.flatnonzero(foreground[y])
        if not len(columns):
            continue
        left[y] = columns[0] / 95.0
        right[y] = columns[-1] / 95.0
        span[y] = (columns[-1] - columns[0]) / 95.0
        center[y] = (columns[-1] + columns[0]) / 190.0
    band_area = foreground.reshape(16, 8, 96).mean(axis=(1, 2), dtype=np.float64).astype(np.float32)
    return np.concatenate(
        (
            left[sample_y],
            right[sample_y],
            span[sample_y],
            center[sample_y],
            band_area,
            np.asarray([foreground.mean(dtype=np.float64)], dtype=np.float32),
        )
    )


def geometry_quality(
    scan_ids: np.ndarray,
    failures_by_person: dict[str, dict[str, list[str]]],
    row: str,
) -> np.ndarray:
    return np.asarray(
        [
            not (set(failures_by_person.get(str(scan_id), {}).get(row, [])) & GEOMETRY_REJECTIONS)
            for scan_id in scan_ids
        ],
        dtype=np.bool_,
    )


def feature_arrays(
    packed: Any,
    rows: np.ndarray,
    masks_dir: Path,
    source_index: dict[str, int],
    quality: dict[str, np.ndarray],
    workers: int,
) -> tuple[np.ndarray, np.ndarray]:
    values = np.zeros((len(rows), len(FEATURE_FIELDS)), dtype=np.float32)
    validity = np.zeros_like(values, dtype=np.bool_)
    feature_index = {name: position for position, name in enumerate(FEATURE_FIELDS)}
    values[:, :len(PROFILE_FIELDS)] = packed["profiles"][rows]
    validity[:, :len(PROFILE_FIELDS)] = True

    paths = [masks_dir / f"{sample_id}.png" for sample_id in packed["sample_ids"][rows]]
    missing = [path for path in paths if not path.is_file()]
    if missing:
        raise RuntimeError(f"Missing {len(missing)} input masks; first={missing[0]}")
    with ThreadPoolExecutor(max_workers=workers) as executor:
        outlines = np.stack(list(executor.map(decode_outline, paths))).astype(np.float32, copy=False)
    outline_start = len(PROFILE_FIELDS)
    values[:, outline_start:outline_start + len(OUTLINE_FIELDS)] = outlines
    validity[:, outline_start:outline_start + len(OUTLINE_FIELDS)] = True

    source_fields = EXACT_AB_FIELDS + UPPER_BODY_FIELDS + CAMERA_FIELDS
    for name in source_fields:
        feature_position = feature_index[name]
        source_position = source_index[name]
        values[:, feature_position] = packed["targets"][rows, source_position]
        valid = packed["masks"][rows, source_position].copy()
        if name.startswith("row."):
            row_name = name.split(".")[1]
            valid &= quality[row_name]
        elif name == "ratio.front.shoulder_waist":
            valid &= quality["waist"]
        elif name == "ratio.front.shoulder_hips":
            valid &= quality["hips"]
        elif name == "ratio.front.neck_shoulder":
            valid &= quality["neck"]
        validity[:, feature_position] = valid
    values[~validity] = 0.0
    return values, validity


def shape_columns(source_index: dict[str, int], row: str) -> np.ndarray:
    return np.asarray(
        [
            source_index[f"row.{row}.shape.{point:02d}.{axis}"]
            for point in range(32)
            for axis in ("x", "depth")
        ],
        dtype=np.int64,
    )


def build_latents(
    packed: Any,
    selected_rows: np.ndarray,
    train_rows: np.ndarray,
    train_canonical_rows: np.ndarray,
    source_index: dict[str, int],
    selected_quality: dict[str, np.ndarray],
    canonical_quality: dict[str, np.ndarray],
) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    schema = latent_schema()
    latent_index = {name: position for position, name in enumerate(schema)}
    targets = np.zeros((len(selected_rows), len(schema)), dtype=np.float32)
    masks = np.zeros_like(targets, dtype=np.bool_)
    pca_means = np.zeros((len(ROWS), 64), dtype=np.float32)
    pca_bases = np.zeros((len(ROWS), PCA_COMPONENTS, 64), dtype=np.float32)
    for row_number, row in enumerate(ROWS):
        depth_source = source_index[f"row.{row}.depth_cm"]
        tape_source = source_index[f"tape.{row}.circumference_cm"]
        depth_target = latent_index[f"{row}.depth_cm"]
        tape_target = latent_index[f"{row}.tape_cm"]
        targets[:, depth_target] = packed["targets"][selected_rows, depth_source]
        masks[:, depth_target] = packed["masks"][selected_rows, depth_source] & selected_quality[row]
        # Tape remains an independent WEAR-recorded target, even when a 3D
        # perimeter comparison fails. It never becomes a geometry validity gate.
        targets[:, tape_target] = packed["targets"][selected_rows, tape_source]
        masks[:, tape_target] = packed["masks"][selected_rows, tape_source]

        columns = shape_columns(source_index, row)
        canonical_shape_valid = (
            packed["masks"][train_canonical_rows][:, columns].all(axis=1)
            & canonical_quality[row]
        )
        mean, basis = deterministic_pca(
            packed["targets"][train_canonical_rows[canonical_shape_valid]][:, columns]
        )
        pca_means[row_number] = mean
        pca_bases[row_number] = basis
        shape_valid = packed["masks"][selected_rows][:, columns].all(axis=1) & selected_quality[row]
        coefficients = (packed["targets"][selected_rows][:, columns] - mean) @ basis.T
        for component in range(PCA_COMPONENTS):
            target = latent_index[f"{row}.shape_pca.{component:02d}"]
            targets[:, target] = coefficients[:, component]
            masks[:, target] = shape_valid

    train_count = len(train_rows)
    train_mask = masks[:train_count]
    counts = train_mask.sum(axis=0, dtype=np.int64)
    sums = (targets[:train_count] * train_mask).sum(axis=0, dtype=np.float64)
    means = np.divide(sums, counts, out=np.zeros_like(sums), where=counts > 0)
    centered = np.where(train_mask, targets[:train_count] - means, 0.0)
    variances = np.divide(
        (centered * centered).sum(axis=0, dtype=np.float64),
        counts,
        out=np.ones_like(sums),
        where=counts > 0,
    )
    stds = np.sqrt(np.maximum(variances, 1e-8))
    if np.any(counts <= 0) or not np.isfinite(stds).all():
        raise RuntimeError("A V3 latent has no accepted training labels")
    return targets, masks, means.astype(np.float32), stds.astype(np.float32), pca_means, pca_bases


def shape_metrics(prediction: np.ndarray, truth: np.ndarray) -> dict[str, Any]:
    person_mae = np.abs(prediction - truth).mean(axis=1)
    centered_truth = truth - truth.mean(axis=0, keepdims=True)
    denominator = float((centered_truth * centered_truth).sum())
    residual = prediction - truth
    truth_variance = float(truth.var(axis=0).mean())
    prediction_variance = float(prediction.var(axis=0).mean())
    return {
        **summarize(person_mae),
        "rSquared": None if denominator <= 1e-12 else 1.0 - float((residual * residual).sum()) / denominator,
        "betweenPersonVarianceRatio": None if truth_variance <= 1e-12 else prediction_variance / truth_variance,
    }


def calculate_metrics(
    public_prediction: np.ndarray,
    packed: Any,
    validation_rows: np.ndarray,
    source_index: dict[str, int],
    validation_quality: dict[str, np.ndarray],
) -> dict[str, Any]:
    public_index = {name: position for position, name in enumerate(output_schema())}
    result: dict[str, Any] = {"rows": {}}
    for row in ROWS:
        row_result: dict[str, Any] = {}
        for metric, source_name, public_name in (
            ("depthCm", f"row.{row}.depth_cm", f"row.{row}.depth_cm"),
            ("tapeCm", f"tape.{row}.circumference_cm", f"tape.{row}.circumference_cm"),
        ):
            source = source_index[source_name]
            valid = packed["masks"][validation_rows, source]
            errors = np.abs(public_prediction[valid, public_index[public_name]] - packed["targets"][validation_rows[valid], source])
            row_result[metric] = summarize(errors)
            if metric == "depthCm":
                certified = valid & validation_quality[row]
                certified_errors = np.abs(
                    public_prediction[certified, public_index[public_name]]
                    - packed["targets"][validation_rows[certified], source]
                )
                row_result["depthCmCertifiedGeometry"] = summarize(certified_errors)

        columns = shape_columns(source_index, row)
        positions = np.asarray(
            [public_index[f"row.{row}.shape.{point:02d}.{axis}"] for point in range(32) for axis in ("x", "depth")],
            dtype=np.int64,
        )
        all_shape_valid = packed["masks"][validation_rows][:, columns].all(axis=1)
        certified_shape_valid = all_shape_valid & validation_quality[row]
        row_result["shapeAllAvailable"] = shape_metrics(
            public_prediction[all_shape_valid][:, positions],
            packed["targets"][validation_rows[all_shape_valid]][:, columns],
        )
        row_result["shapeCertifiedGeometry"] = shape_metrics(
            public_prediction[certified_shape_valid][:, positions],
            packed["targets"][validation_rows[certified_shape_valid]][:, columns],
        )
        result["rows"][row] = row_result
    return result


def main() -> None:
    args = parse_args()
    random.seed(args.seed)
    np.random.seed(args.seed)
    torch.manual_seed(args.seed)
    torch.set_num_threads(max(1, min(args.workers, os.cpu_count() or args.workers)))
    device_name = "mps" if args.device == "auto" and torch.backends.mps.is_available() else args.device
    if device_name == "auto":
        device_name = "cpu"
    if device_name == "mps" and not torch.backends.mps.is_available():
        raise RuntimeError("MPS was requested but is unavailable")
    device = torch.device(device_name)
    args.output_dir.mkdir(parents=True, exist_ok=True)

    packed = np.load(args.index, allow_pickle=False)
    source_schema = packed["target_schema"].tolist()
    source_index = {name: position for position, name in enumerate(source_schema)}
    audit = json.loads(args.teacher_audit.read_text())
    failures_by_person = audit["failuresByPerson"]
    roles = packed["roles"]
    canonical = packed["view_ids"] == "canonical"
    train_rows = np.flatnonzero(roles == 0)
    validation_rows = np.flatnonzero((roles == 1) & canonical)
    train_canonical_rows = np.flatnonzero((roles == 0) & canonical)
    if len(train_canonical_rows) != EXPECTED_TRAIN_SUBJECTS or len(validation_rows) != EXPECTED_VALIDATION_SUBJECTS:
        raise RuntimeError(
            f"Split changed: canonical train={len(train_canonical_rows)} validation={len(validation_rows)}"
        )
    if set(packed["scan_ids"][train_rows]) & set(packed["scan_ids"][validation_rows]):
        raise RuntimeError("Subject leakage between training and validation")
    selected_rows = np.concatenate((train_rows, validation_rows))
    selected_scan_ids = packed["scan_ids"][selected_rows]
    selected_quality = {
        row: geometry_quality(selected_scan_ids, failures_by_person, row)
        for row in ("neck", "chest", "underbust", "waist", "hips")
    }
    canonical_quality = {
        row: geometry_quality(packed["scan_ids"][train_canonical_rows], failures_by_person, row)
        for row in ROWS
    }

    print(json.dumps({"state": "extracting_observables", "trainRecords": len(train_rows), "validationRecords": len(validation_rows)}), flush=True)
    raw_features, feature_validity = feature_arrays(
        packed,
        selected_rows,
        args.masks_dir,
        source_index,
        selected_quality,
        args.workers,
    )
    train_count = len(train_rows)
    train_validity = feature_validity[:train_count]
    counts = train_validity.sum(axis=0, dtype=np.int64)
    sums = (raw_features[:train_count] * train_validity).sum(axis=0, dtype=np.float64)
    feature_means = np.divide(sums, counts, out=np.zeros_like(sums), where=counts > 0)
    centered = np.where(train_validity, raw_features[:train_count] - feature_means, 0.0)
    feature_variances = np.divide(
        (centered * centered).sum(axis=0, dtype=np.float64),
        counts,
        out=np.ones_like(sums),
        where=counts > 0,
    )
    feature_stds = np.sqrt(np.maximum(feature_variances, 1e-8))
    imputed = np.where(feature_validity, raw_features, feature_means)
    standardized_features = ((imputed - feature_means) / feature_stds).astype(np.float32)
    prepared_features = np.concatenate((standardized_features, feature_validity.astype(np.float32)), axis=1)

    raw_latents, latent_masks, latent_means, latent_stds, pca_means, pca_bases = build_latents(
        packed,
        selected_rows,
        train_rows,
        train_canonical_rows,
        source_index,
        selected_quality,
        canonical_quality,
    )
    standardized_latents = np.where(
        latent_masks,
        (raw_latents - latent_means) / latent_stds,
        0.0,
    ).astype(np.float32)

    features_tensor = torch.from_numpy(prepared_features)
    targets_tensor = torch.from_numpy(standardized_latents)
    masks_tensor = torch.from_numpy(latent_masks.astype(np.float32))
    train_indices = torch.arange(train_count, dtype=torch.long)
    validation_indices = torch.arange(train_count, len(selected_rows), dtype=torch.long)
    model = ObservableStudentV3().to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=args.learning_rate, weight_decay=2e-3)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=args.epochs, eta_min=args.learning_rate * 0.03)
    schema = latent_schema()
    tape_positions = torch.tensor([schema.index("waist.tape_cm"), schema.index("hips.tape_cm")], dtype=torch.long, device=device)
    geometry_positions = torch.tensor([position for position in range(len(schema)) if position not in tape_positions.tolist()], dtype=torch.long, device=device)
    upper_feature_positions = torch.tensor([FEATURE_FIELDS.index(name) for name in UPPER_BODY_FIELDS], dtype=torch.long, device=device)
    exact_feature_positions = torch.tensor([FEATURE_FIELDS.index(name) for name in EXACT_AB_FIELDS], dtype=torch.long, device=device)

    def masked_huber(prediction: torch.Tensor, expected: torch.Tensor, mask: torch.Tensor) -> torch.Tensor:
        elementwise = F.smooth_l1_loss(prediction, expected, reduction="none", beta=0.75)
        return (elementwise * mask).sum() / mask.sum().clamp_min(1.0)

    def validation_loss() -> float:
        model.eval()
        total = 0.0
        count = 0
        with torch.inference_mode():
            for start in range(0, len(validation_indices), args.batch_size):
                indices = validation_indices[start:start + args.batch_size]
                batch_features = features_tensor[indices].to(device)
                batch_targets = targets_tensor[indices].to(device)
                batch_masks = masks_tensor[indices].to(device)
                prediction = model(batch_features)
                geometry = masked_huber(
                    prediction.index_select(1, geometry_positions),
                    batch_targets.index_select(1, geometry_positions),
                    batch_masks.index_select(1, geometry_positions),
                )
                tape = masked_huber(
                    prediction.index_select(1, tape_positions),
                    batch_targets.index_select(1, tape_positions),
                    batch_masks.index_select(1, tape_positions),
                )
                total += float((geometry + 1.25 * tape).item()) * len(indices)
                count += len(indices)
        return total / max(count, 1)

    best_loss = float("inf")
    best_epoch = 0
    stale = 0
    checkpoint_path = args.output_dir / "checkpoint.pt"
    print(json.dumps({"state": "training", "device": str(device), "parameters": sum(p.numel() for p in model.parameters())}), flush=True)
    for epoch in range(1, args.epochs + 1):
        model.train()
        permutation = train_indices[torch.randperm(len(train_indices))]
        running = 0.0
        records = 0
        for start in range(0, len(permutation), args.batch_size):
            indices = permutation[start:start + args.batch_size]
            batch_features = features_tensor[indices].to(device)
            batch_targets = targets_tensor[indices].to(device)
            batch_masks = masks_tensor[indices].to(device)
            # Missing-number augmentation: the second half is the validity bit,
            # and zero is the standardized imputation mean in the first half.
            for positions, probability in ((upper_feature_positions, 0.15), (exact_feature_positions, 0.03)):
                dropped = torch.rand((len(indices), len(positions)), device=device) < probability
                value_view = batch_features[:, :len(FEATURE_FIELDS)]
                validity_view = batch_features[:, len(FEATURE_FIELDS):]
                value_view[:, positions] = torch.where(dropped, 0.0, value_view[:, positions])
                validity_view[:, positions] = torch.where(dropped, 0.0, validity_view[:, positions])
            prediction = model(batch_features)
            geometry = masked_huber(
                prediction.index_select(1, geometry_positions),
                batch_targets.index_select(1, geometry_positions),
                batch_masks.index_select(1, geometry_positions),
            )
            tape = masked_huber(
                prediction.index_select(1, tape_positions),
                batch_targets.index_select(1, tape_positions),
                batch_masks.index_select(1, tape_positions),
            )
            loss = geometry + 1.25 * tape
            optimizer.zero_grad(set_to_none=True)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 5.0)
            optimizer.step()
            running += float(loss.item()) * len(indices)
            records += len(indices)
        scheduler.step()
        current_validation = validation_loss()
        if current_validation < best_loss - 1e-5:
            best_loss = current_validation
            best_epoch = epoch
            stale = 0
            torch.save(
                {
                    "modelStateDict": {name: value.detach().cpu() for name, value in model.state_dict().items()},
                    "epoch": epoch,
                    "validationLoss": best_loss,
                },
                checkpoint_path,
            )
        else:
            stale += 1
        if epoch == 1 or epoch % 5 == 0 or stale >= args.patience:
            print(json.dumps({"epoch": epoch, "trainLoss": running / records, "validationLoss": current_validation, "bestEpoch": best_epoch, "bestValidationLoss": best_loss}), flush=True)
        if stale >= args.patience:
            break

    checkpoint = torch.load(checkpoint_path, map_location="cpu", weights_only=True)
    model = model.cpu()
    model.load_state_dict(checkpoint["modelStateDict"])
    arrays = DecoderArrays(
        feature_means.astype(np.float32),
        feature_stds.astype(np.float32),
        latent_means,
        latent_stds,
        pca_means,
        pca_bases,
    )
    export_model = ObservableExportModel(model.eval(), arrays).eval()
    validation_raw = torch.from_numpy(raw_features[train_count:])
    validation_validity = torch.from_numpy(feature_validity[train_count:].astype(np.float32))
    with torch.inference_mode():
        public_prediction = export_model(validation_raw, validation_validity).numpy()
    validation_quality = {row: selected_quality[row][train_count:] for row in ROWS}
    metrics = calculate_metrics(public_prediction, packed, validation_rows, source_index, validation_quality)

    # Keep the checkpoint self-contained for exact export/reproduction.
    torch.save(
        {
            **checkpoint,
            "schemaVersion": "wear3d-waist-hips-observable-v3-checkpoint/v1",
            "modelStateDict": model.state_dict(),
            "featureFields": list(FEATURE_FIELDS),
            "latentSchema": latent_schema(),
            "outputSchema": output_schema(),
            "featureMeans": arrays.feature_means,
            "featureStds": arrays.feature_stds,
            "latentMeans": arrays.latent_means,
            "latentStds": arrays.latent_stds,
            "pcaMeans": arrays.pca_means,
            "pcaBases": arrays.pca_bases,
            "trainingIndexSha256": sha256(args.index),
            "teacherAuditSha256": sha256(args.teacher_audit),
            "test448Opened": False,
        },
        checkpoint_path,
    )

    onnx_path = args.output_dir / "model.onnx"
    temporary_onnx = onnx_path.with_suffix(".onnx.tmp")
    example_values = torch.from_numpy(raw_features[train_count:train_count + 1])
    example_validity = torch.from_numpy(feature_validity[train_count:train_count + 1].astype(np.float32))
    with torch.inference_mode():
        reference = export_model(example_values, example_validity).numpy()
    torch.onnx.export(
        export_model,
        (example_values, example_validity),
        temporary_onnx,
        input_names=["observables", "validity"],
        output_names=["targets"],
        dynamic_axes={"observables": {0: "batch"}, "validity": {0: "batch"}, "targets": {0: "batch"}},
        opset_version=17,
        external_data=False,
        dynamo=False,
    )
    onnx.checker.check_model(onnx.load(str(temporary_onnx)))
    temporary_onnx.replace(onnx_path)

    result = {
        "schemaVersion": "wear3d-waist-hips-observable-v3-result/v1",
        "state": "complete",
        "test448Opened": False,
        "trainingSubjects": EXPECTED_TRAIN_SUBJECTS,
        "trainingAugmentedRecords": len(train_rows),
        "validationSubjects": EXPECTED_VALIDATION_SUBJECTS,
        "bestEpoch": best_epoch,
        "bestValidationLoss": best_loss,
        "parameterCount": sum(parameter.numel() for parameter in model.parameters()),
        "teacherContract": {
            "geometryRejectedReasons": sorted(GEOMETRY_REJECTIONS),
            "recordedTapeKeptIndependent": True,
            "perimeterMismatchDoesNotRejectTape": True,
        },
        "inputContract": {
            "featureCount": len(FEATURE_FIELDS),
            "inputs": ["observables", "validity"],
            "requiredForBestAccuracy": ["front silhouette", "height", "weight", "gender", "waist A-to-B", "hip A-to-B"],
            "optionalEnhancers": ["neck/chest/under-bust front widths", "neck/chest/under-bust recorded numbers", "camera correction"],
        },
        "metrics": metrics,
        "artifacts": {
            "checkpoint": str(checkpoint_path.resolve()),
            "checkpointSha256": sha256(checkpoint_path),
            "onnx": str(onnx_path.resolve()),
            "onnxSha256": sha256(onnx_path),
            "onnxBytes": onnx_path.stat().st_size,
            "referenceOutput": reference.flatten().tolist(),
        },
    }
    write_json(args.output_dir / "result.json", result)
    write_json(
        args.output_dir / "runtime.json",
        {
            "schemaVersion": "wear3d-waist-hips-observable-v3-runtime/v1",
            "model": "ObservableStudentV3",
            "modelSha256": result["artifacts"]["onnxSha256"],
            "featureFields": list(FEATURE_FIELDS),
            "outputSchema": output_schema(),
            "missingValueContract": "Set absent observables to 0 and the matching validity field to 0.",
            "test448Opened": False,
        },
    )
    print(json.dumps(result, indent=2, sort_keys=True), flush=True)


if __name__ == "__main__":
    main()
