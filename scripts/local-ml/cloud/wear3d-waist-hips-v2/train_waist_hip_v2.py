#!/usr/bin/env python3
"""Train the constrained waist/hip-only WEAR student from immutable v1 teachers."""

from __future__ import annotations

import argparse
import hashlib
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
from torch.nn import functional as F

from waist_hip_student import (
    CAMERA_FIELDS,
    DIRECT_FIELDS,
    IMAGE_HEIGHT,
    IMAGE_WIDTH,
    PCA_COMPONENTS,
    PROFILE_FIELDS,
    ROWS,
    DecoderArrays,
    WaistHipDecoder,
    WaistHipStudent,
    deterministic_pca,
    latent_schema,
    output_schema,
    source_shape_keys,
)


EXPECTED_RECORDS = {"train": 31_059, "validation": 3_843}
EXPECTED_SUBJECTS = {"train": 3_451, "validation": 427}
SOURCE_WIDTH = 192
SOURCE_HEIGHT = 256
LOSS_WEIGHTS = {
    "position": 3.0,
    "geometry": 3.0,
    "tape": 8.0,
    "tape_cm": 6.0,
    "tape_tail": 4.0,
    "tape_consistency": 2.0,
    "shape_pca": 0.5,
    "shape_coordinate": 4.0,
    "shape_concordance": 2.0,
    "ratio": 1.0,
    "camera": 0.25,
}

# Later students may add training-only teacher heads while preserving the
# stable waist/hip latent and ONNX output contracts. The default V2/V4/V5
# path remains unchanged; version wrappers opt in before calling main().
AUXILIARY_TARGET_KEYS: tuple[str, ...] = ()
AUXILIARY_TAPE_ROWS: tuple[str, ...] = ()
AUXILIARY_TAPE_RATIO_PAIRS: tuple[tuple[str, str], ...] = ()
GEOMETRY_QUALITY_ROWS: tuple[str, ...] = ()
GEOMETRY_REJECTION_REASONS: tuple[str, ...] = ()
REQUIRED_TEACHER_AUDIT_SCHEMA: str | None = None
REQUIRED_TEACHER_AUDIT_MODE: str | None = None
VALIDATION_CANONICAL_ONLY = False
THREE_DIMENSIONAL_GEOMETRY_SUPERVISES_TAPE_REPRESENTATION = False


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--index", required=True, type=Path)
    parser.add_argument("--index-metadata", required=True, type=Path)
    parser.add_argument("--masks-dir", required=True, type=Path)
    parser.add_argument("--teacher-audit", type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("--job-id", required=True)
    parser.add_argument("--device", choices=("auto", "cpu", "cuda", "mps"), default="auto")
    parser.add_argument("--epochs", type=int, default=100)
    parser.add_argument("--min-epochs", type=int, default=25)
    parser.add_argument("--patience", type=int, default=18)
    parser.add_argument("--batch-size", type=int, default=768)
    parser.add_argument("--learning-rate", type=float, default=0.0015)
    parser.add_argument("--torch-threads", type=int, default=20)
    parser.add_argument("--decode-workers", type=int, default=20)
    parser.add_argument("--max-wall-minutes", type=float, default=80.0)
    parser.add_argument("--seed", type=int, default=20260825)
    parser.add_argument("--max-train-records", type=int, default=0)
    parser.add_argument("--max-validation-records", type=int, default=0)
    parser.add_argument(
        "--overfit-subjects",
        type=int,
        default=0,
        help="Deliberately score the same N training subjects for the wiring proof; never use for release metrics.",
    )
    parser.add_argument("--local-output-only", action="store_true")
    parser.add_argument("--progress-upload-url", default="")
    parser.add_argument("--checkpoint-upload-url", default="")
    parser.add_argument("--result-upload-url", default="")
    parser.add_argument("--overlay-upload-url", default="")
    return parser.parse_args()


def now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(8 * 1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def write_json(path: Path, payload: Any) -> None:
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n")
    temporary.replace(path)


def meaningful_silhouette(opened: Image.Image) -> Image.Image:
    if "A" in opened.getbands():
        alpha = opened.getchannel("A")
        if alpha.getextrema()[0] != alpha.getextrema()[1]:
            return alpha
    return opened.convert("L")


def distribution(values: np.ndarray) -> dict[str, float | int | None]:
    finite = values[np.isfinite(values)]
    if not len(finite):
        return {"count": 0, "mae": None, "median": None, "p90": None, "p95": None, "maximum": None}
    return {
        "count": int(len(finite)),
        "mae": float(finite.mean()),
        "median": float(np.quantile(finite, 0.5)),
        "p90": float(np.quantile(finite, 0.9)),
        "p95": float(np.quantile(finite, 0.95)),
        "maximum": float(finite.max()),
    }


def masked_position_pixel_losses(
    prediction: torch.Tensor,
    expected: torch.Tensor,
    mask: torch.Tensor,
    pixel_scales: torch.Tensor,
) -> tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
    """Supervise visible row coordinates in pixels, including their worst tail.

    The latent position loss is still useful for population-scale learning, but
    an average standardized loss can hide one- or two-pixel row/edge misses.
    This helper gives later students an opt-in loss that matches the visible
    line metrics used by the strict ten-person capacity gate.
    """

    prediction_pixels = prediction * pixel_scales
    expected_pixels = expected * pixel_scales
    absolute_error = (prediction_pixels - expected_pixels).abs()
    valid_error = absolute_error[mask]
    if not valid_error.numel():
        zero = prediction.sum() * 0.0
        return zero, zero, zero
    huber = F.smooth_l1_loss(
        prediction_pixels,
        expected_pixels,
        reduction="none",
        beta=0.25,
    )
    mean_loss = (huber * mask).sum() / mask.sum().clamp_min(1)
    tail_count = max(1, (valid_error.numel() + 19) // 20)
    tail_loss = torch.topk(valid_error, tail_count).values.mean()
    maximum_loss = valid_error.max()
    return mean_loss, tail_loss, maximum_loss


def masked_geometry_cm_losses(
    prediction: torch.Tensor,
    expected: torch.Tensor,
    mask: torch.Tensor,
) -> tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
    """Apply the same mean/tail/maximum contract directly in centimeters."""

    scales = prediction.new_ones((1, prediction.shape[1]))
    return masked_position_pixel_losses(prediction, expected, mask, scales)


def geometry_quality_from_audit(
    packed: Any,
    audit_path: Path | None,
    index_metadata: dict[str, Any] | None = None,
) -> tuple[dict[str, np.ndarray] | None, dict[str, Any] | None]:
    if not GEOMETRY_QUALITY_ROWS:
        return None, None
    if audit_path is None or not audit_path.is_file():
        raise RuntimeError("This student requires --teacher-audit with certified geometry rows")
    audit = json.loads(audit_path.read_text())
    if (
        REQUIRED_TEACHER_AUDIT_SCHEMA is not None
        and audit.get("schemaVersion") != REQUIRED_TEACHER_AUDIT_SCHEMA
    ):
        raise RuntimeError(
            "The teacher audit schema is stale: "
            f"{audit.get('schemaVersion')!r} != {REQUIRED_TEACHER_AUDIT_SCHEMA!r}"
        )
    if (
        REQUIRED_TEACHER_AUDIT_MODE is not None
        and audit.get("geometryQualityMode") != REQUIRED_TEACHER_AUDIT_MODE
    ):
        raise RuntimeError(
            "The teacher audit quality mode is stale: "
            f"{audit.get('geometryQualityMode')!r} != {REQUIRED_TEACHER_AUDIT_MODE!r}"
        )
    if audit.get("geometryQualityMode") == "source-target-masks":
        if index_metadata is None:
            raise RuntimeError("Fresh source-mask audit requires index metadata")
        scope = audit.get("scope") or {}
        failures_by_person = audit.get("failuresByPerson")
        expected_subjects = {str(value) for value in np.unique(packed["scan_ids"])}
        if (
            audit.get("sourceTargetMasksAuthoritative") is not True
            or audit.get("sourceIndexSha256") != index_metadata.get("indexSha256")
            or audit.get("teacherJobId") != index_metadata.get("teacherJobId")
            or scope.get("trainingSubjects") != EXPECTED_SUBJECTS["train"]
            or scope.get("validationSubjects") != EXPECTED_SUBJECTS["validation"]
            or scope.get("sealedTestSubjectsIncluded") != 0
            or audit.get("sealed448SubjectsUsedForTraining") != 0
            or audit.get("previousWeightsUsed") is not False
            or audit.get("recordedTapeMasksChanged") is not False
            or audit.get("officialWearTapeValuesChanged") is not False
            or not isinstance(failures_by_person, dict)
            or set(failures_by_person) != expected_subjects
        ):
            raise RuntimeError("The fresh source-mask teacher audit provenance failed")
        if any(
            failures_by_person[subject].get(row)
            for subject in failures_by_person
            for row in GEOMETRY_QUALITY_ROWS
        ):
            raise RuntimeError("Source-mask audit must not reapply stale row-wide failures")
        return None, {
            "schemaVersion": audit.get("schemaVersion"),
            "sha256": sha256(audit_path),
            "qualityRows": list(GEOMETRY_QUALITY_ROWS),
            "geometryQualityMode": "source-target-masks",
            "sourceTargetMasksAuthoritative": True,
            "sourceIndexSha256": audit.get("sourceIndexSha256"),
            "counts": audit.get("counts"),
            "targetCoverage": audit.get("rows"),
            "recordedTapeMasksChanged": False,
        }
    failures_by_person = audit.get("failuresByPerson")
    if not isinstance(failures_by_person, dict):
        raise RuntimeError("The teacher audit is missing failuresByPerson")
    quality, counts = geometry_quality_from_failures(packed, failures_by_person)
    return quality, {
        "schemaVersion": audit.get("schemaVersion"),
        "sha256": sha256(audit_path),
        "qualityRows": list(GEOMETRY_QUALITY_ROWS),
        "rejectionReasons": sorted(set(GEOMETRY_REJECTION_REASONS)),
        "counts": counts,
        "recordedTapeMasksChanged": False,
    }


def geometry_quality_from_failures(
    packed: Any,
    failures_by_person: dict[str, Any],
) -> tuple[dict[str, np.ndarray], dict[str, Any]]:
    scan_ids = packed["scan_ids"]
    roles = packed["roles"]
    canonical = packed["view_ids"] == "canonical"
    rejected = set(GEOMETRY_REJECTION_REASONS)
    quality: dict[str, np.ndarray] = {}
    counts: dict[str, Any] = {}
    for row in GEOMETRY_QUALITY_ROWS:
        accepted = np.asarray(
            [
                not (
                    set(failures_by_person.get(str(scan_id), {}).get(row, []))
                    & rejected
                )
                for scan_id in scan_ids
            ],
            dtype=np.bool_,
        )
        quality[row] = accepted
        counts[row] = {
            "trainSubjectsAccepted": int(accepted[(roles == 0) & canonical].sum()),
            "validationSubjectsAccepted": int(accepted[(roles == 1) & canonical].sum()),
            "trainSubjectsTotal": int(((roles == 0) & canonical).sum()),
            "validationSubjectsTotal": int(((roles == 1) & canonical).sum()),
        }
    return quality, counts


def build_targets(
    packed: Any,
    geometry_quality: dict[str, np.ndarray] | None = None,
) -> tuple[
    np.ndarray,
    np.ndarray,
    np.ndarray,
    np.ndarray,
    np.ndarray,
    np.ndarray,
    np.ndarray,
    np.ndarray,
]:
    source_schema = packed["target_schema"].tolist()
    source_index = {key: index for index, key in enumerate(source_schema)}
    source_targets = packed["targets"].astype(np.float32, copy=False)
    source_masks = packed["masks"].astype(np.bool_, copy=False)
    roles = packed["roles"]
    view_ids = packed["view_ids"]
    train_canonical = (roles == 0) & (view_ids == "canonical")
    latent_keys = latent_schema()
    latent_index = {key: index for index, key in enumerate(latent_keys)}
    public_keys = output_schema()
    public_index = {key: index for index, key in enumerate(public_keys)}
    latent_targets = np.zeros((len(roles), len(latent_keys)), dtype=np.float32)
    latent_masks = np.zeros_like(latent_targets, dtype=np.bool_)
    public_targets = np.zeros((len(roles), len(public_keys)), dtype=np.float32)
    public_masks = np.zeros_like(public_targets, dtype=np.bool_)
    pca_means = np.empty((len(ROWS), 64), dtype=np.float32)
    pca_bases = np.empty((len(ROWS), PCA_COMPONENTS, 64), dtype=np.float32)

    for row_number, row in enumerate(ROWS):
        row_quality = (
            geometry_quality[row]
            if geometry_quality is not None and row in geometry_quality
            else np.ones(len(roles), dtype=np.bool_)
        )
        y_source = source_index[f"row.{row}.y_norm"]
        left_source = source_index[f"row.{row}.left_x_norm"]
        right_source = source_index[f"row.{row}.right_x_norm"]
        edge_mask = (
            source_masks[:, y_source]
            & source_masks[:, left_source]
            & source_masks[:, right_source]
            & row_quality
        )
        direct_sources: dict[str, tuple[np.ndarray, np.ndarray]] = {
            "y_norm": (source_targets[:, y_source], source_masks[:, y_source] & row_quality),
            "center_norm": (
                (source_targets[:, left_source] + source_targets[:, right_source]) * 0.5,
                edge_mask,
            ),
            "span_norm": (
                source_targets[:, right_source] - source_targets[:, left_source],
                edge_mask,
            ),
            "width_cm": (
                source_targets[:, source_index[f"row.{row}.width_cm"]],
                source_masks[:, source_index[f"row.{row}.width_cm"]] & row_quality,
            ),
            "depth_cm": (
                source_targets[:, source_index[f"row.{row}.depth_cm"]],
                source_masks[:, source_index[f"row.{row}.depth_cm"]] & row_quality,
            ),
            "tape_cm": (
                source_targets[:, source_index[f"tape.{row}.circumference_cm"]],
                source_masks[:, source_index[f"tape.{row}.circumference_cm"]],
            ),
        }
        for field, (values, valid) in direct_sources.items():
            target = latent_index[f"{row}.{field}"]
            latent_targets[:, target] = values
            latent_masks[:, target] = valid

        shape_sources = np.asarray([source_index[key] for key in source_shape_keys(row)], dtype=np.int64)
        shape_valid = source_masks[:, shape_sources].all(axis=1) & row_quality
        pca_training = source_targets[train_canonical & shape_valid][:, shape_sources]
        mean, basis = deterministic_pca(pca_training)
        pca_means[row_number] = mean
        pca_bases[row_number] = basis
        coefficients = (source_targets[:, shape_sources] - mean) @ basis.T
        coefficient_targets = np.asarray(
            [latent_index[f"{row}.shape_pca.{index:02d}"] for index in range(PCA_COMPONENTS)],
            dtype=np.int64,
        )
        latent_targets[:, coefficient_targets] = coefficients
        latent_masks[:, coefficient_targets] = shape_valid[:, None]

        public_mapping = {
            f"row.{row}.y_norm": f"row.{row}.y_norm",
            f"row.{row}.left_x_norm": f"row.{row}.left_x_norm",
            f"row.{row}.right_x_norm": f"row.{row}.right_x_norm",
            f"row.{row}.width_cm": f"row.{row}.width_cm",
            f"row.{row}.depth_cm": f"row.{row}.depth_cm",
            f"row.{row}.depth_width_ratio": f"row.{row}.depth_width_ratio",
            f"tape.{row}.circumference_cm": f"tape.{row}.circumference_cm",
        }
        for public_key, source_key in public_mapping.items():
            public_targets[:, public_index[public_key]] = source_targets[:, source_index[source_key]]
            valid = source_masks[:, source_index[source_key]]
            if not public_key.startswith("tape."):
                valid = valid & row_quality
            public_masks[:, public_index[public_key]] = valid
        for key, source in zip(source_shape_keys(row), shape_sources, strict=True):
            target = public_index[key]
            public_targets[:, target] = source_targets[:, source]
            public_masks[:, target] = source_masks[:, source] & row_quality

    for field in CAMERA_FIELDS:
        source = source_index[f"camera.{field}"]
        target = latent_index[f"camera.{field}"]
        latent_targets[:, target] = source_targets[:, source]
        latent_masks[:, target] = source_masks[:, source]
        public_target = public_index[f"camera.{field}"]
        public_targets[:, public_target] = source_targets[:, source]
        public_masks[:, public_target] = source_masks[:, source]

    waist_width = public_index["row.waist.width_cm"]
    hip_width = public_index["row.hips.width_cm"]
    front_ratio = public_index["ratio.front.waist_hips"]
    front_valid = public_masks[:, waist_width] & public_masks[:, hip_width] & (public_targets[:, hip_width] > 0)
    public_targets[front_valid, front_ratio] = (
        public_targets[front_valid, waist_width] / public_targets[front_valid, hip_width]
    )
    public_masks[:, front_ratio] = front_valid
    waist_tape = public_index["tape.waist.circumference_cm"]
    hip_tape = public_index["tape.hips.circumference_cm"]
    tape_ratio = public_index["ratio.tape.waist_hips"]
    tape_valid = public_masks[:, waist_tape] & public_masks[:, hip_tape] & (public_targets[:, hip_tape] > 0)
    public_targets[tape_valid, tape_ratio] = public_targets[tape_valid, waist_tape] / public_targets[tape_valid, hip_tape]
    public_masks[:, tape_ratio] = tape_valid

    train = roles == 0
    counts = latent_masks[train].sum(axis=0, dtype=np.int64)
    sums = (latent_targets[train] * latent_masks[train]).sum(axis=0, dtype=np.float64)
    means = np.divide(sums, counts, out=np.zeros_like(sums), where=counts > 0)
    centered = np.where(latent_masks[train], latent_targets[train] - means, 0.0)
    variances = np.divide(
        (centered * centered).sum(axis=0, dtype=np.float64),
        counts,
        out=np.ones_like(sums),
        where=counts > 0,
    )
    standard_deviations = np.sqrt(np.maximum(variances, 1e-8))
    if np.any(counts <= 0) or not np.isfinite(standard_deviations).all():
        raise RuntimeError("A waist/hip latent target has no valid training labels")
    return (
        latent_targets,
        latent_masks,
        public_targets,
        public_masks,
        means.astype(np.float32),
        standard_deviations.astype(np.float32),
        pca_means,
        pca_bases,
    )


def calculate_metrics(
    predictions: np.ndarray,
    expected: np.ndarray,
    masks: np.ndarray,
) -> dict[str, Any]:
    schema = output_schema()
    index = {key: position for position, key in enumerate(schema)}
    rows: dict[str, Any] = {}
    for row in ROWS:
        def errors(key: str, scale: float = 1.0) -> np.ndarray:
            position = index[key]
            valid = masks[:, position]
            return np.abs(predictions[valid, position] - expected[valid, position]) * scale

        left = errors(f"row.{row}.left_x_norm", SOURCE_WIDTH)
        right = errors(f"row.{row}.right_x_norm", SOURCE_WIDTH)
        edge = (left + right) * 0.5
        shape_positions = np.asarray([index[key] for key in source_shape_keys(row)], dtype=np.int64)
        shape_valid = masks[:, shape_positions].all(axis=1)
        shape_prediction = predictions[shape_valid][:, shape_positions]
        shape_truth = expected[shape_valid][:, shape_positions]
        person_shape_mae = np.abs(shape_prediction - shape_truth).mean(axis=1)
        centered_truth = shape_truth - shape_truth.mean(axis=0, keepdims=True)
        residual = shape_prediction - shape_truth
        denominator = float((centered_truth * centered_truth).sum())
        r_squared = None if denominator <= 1e-12 else 1.0 - float((residual * residual).sum()) / denominator
        truth_variance = float(shape_truth.var(axis=0).mean())
        prediction_variance = float(shape_prediction.var(axis=0).mean())
        rows[row] = {
            "yPixels": distribution(errors(f"row.{row}.y_norm", SOURCE_HEIGHT)),
            "edgePixels": distribution(edge),
            "widthCm": distribution(errors(f"row.{row}.width_cm")),
            "depthCm": distribution(errors(f"row.{row}.depth_cm")),
            "depthWidthRatio": distribution(errors(f"row.{row}.depth_width_ratio")),
            "shapeCoordinate": {
                **distribution(person_shape_mae),
                "rSquared": r_squared,
                "betweenPersonVarianceRatio": (
                    None if truth_variance <= 1e-12 else prediction_variance / truth_variance
                ),
            },
            "tapeCm": distribution(errors(f"tape.{row}.circumference_cm")),
        }
    front_ratio = distribution(errors_for_key(predictions, expected, masks, index, "ratio.front.waist_hips"))
    tape_ratio = distribution(errors_for_key(predictions, expected, masks, index, "ratio.tape.waist_hips"))
    return {"rows": rows, "ratios": {"frontWaistHips": front_ratio, "tapeWaistHips": tape_ratio}}


def errors_for_key(
    predictions: np.ndarray,
    expected: np.ndarray,
    masks: np.ndarray,
    index: dict[str, int],
    key: str,
) -> np.ndarray:
    position = index[key]
    valid = masks[:, position]
    return np.abs(predictions[valid, position] - expected[valid, position])


def validation_gates(metrics: dict[str, Any], beats_baseline: bool) -> dict[str, Any]:
    rows = metrics["rows"]
    thresholds = {
        "meanYPixels": 4.0,
        "p95YPixels": 9.0,
        "meanEdgePixels": 2.5,
        "p95EdgePixels": 5.0,
        "meanWidthCm": 1.8,
        "meanDepthCm": 1.8,
        "minimumShapeRSquared": 0.25,
        "minimumShapeVarianceRatio": 0.25,
        "waistMeanTapeCm": 3.0,
        "hipsMeanTapeCm": 2.5,
        "waistP95TapeCm": 7.0,
        "hipsP95TapeCm": 6.0,
    }
    per_row: dict[str, bool] = {}
    for row in ROWS:
        row_metrics = rows[row]
        tape_mean_limit = thresholds[f"{row}MeanTapeCm"]
        tape_p95_limit = thresholds[f"{row}P95TapeCm"]
        per_row[row] = bool(
            row_metrics["yPixels"]["mae"] <= thresholds["meanYPixels"]
            and row_metrics["yPixels"]["p95"] <= thresholds["p95YPixels"]
            and row_metrics["edgePixels"]["mae"] <= thresholds["meanEdgePixels"]
            and row_metrics["edgePixels"]["p95"] <= thresholds["p95EdgePixels"]
            and row_metrics["widthCm"]["mae"] <= thresholds["meanWidthCm"]
            and row_metrics["depthCm"]["mae"] <= thresholds["meanDepthCm"]
            and row_metrics["shapeCoordinate"]["rSquared"] >= thresholds["minimumShapeRSquared"]
            and row_metrics["shapeCoordinate"]["betweenPersonVarianceRatio"] >= thresholds["minimumShapeVarianceRatio"]
            and row_metrics["tapeCm"]["mae"] <= tape_mean_limit
            and row_metrics["tapeCm"]["p95"] <= tape_p95_limit
        )
    return {
        "beatsMeanBaseline": beats_baseline,
        "rows": per_row,
        "validationReadyFor448Benchmark": bool(beats_baseline and all(per_row.values())),
        "thresholds": thresholds,
    }


def render_overlay(
    path: Path,
    images: np.ndarray,
    sample_ids: np.ndarray,
    predictions: np.ndarray,
    expected: np.ndarray,
    masks: np.ndarray,
    positions: list[int],
) -> None:
    schema = output_schema()
    index = {key: position for position, key in enumerate(schema)}
    card_width, card_height, columns = 320, 480, 4
    sheet = Image.new("RGB", (card_width * columns, card_height * math.ceil(len(positions) / columns)), "#07111f")
    colors = {"waist": "#f59e0b", "hips": "#ec4899"}
    for card_number, position in enumerate(positions):
        card = Image.new("RGB", (card_width, card_height), "#07111f")
        silhouette = Image.fromarray(images[position], mode="L")
        body = Image.new("RGB", silhouette.size, "#07111f")
        body.paste(Image.new("RGB", silhouette.size, "#e5e7eb"), mask=silhouette)
        body = body.resize((240, 320), getattr(Image, "Resampling", Image).BILINEAR)
        card.paste(body, (40, 26))
        draw = ImageDraw.Draw(card)
        draw.text((8, 7), str(sample_ids[position]), fill="#ffffff")
        for row in ROWS:
            y_key = index[f"row.{row}.y_norm"]
            left_key = index[f"row.{row}.left_x_norm"]
            right_key = index[f"row.{row}.right_x_norm"]
            if masks[position, [y_key, left_key, right_key]].all():
                truth = expected[position]
                prediction = predictions[position]
                for values, color, width in ((truth, "#fb923c", 4), (prediction, "#22d3ee", 2)):
                    y = 26 + float(values[y_key]) * 320
                    left = 40 + float(values[left_key]) * 240
                    right = 40 + float(values[right_key]) * 240
                    draw.line((left, y, right, y), fill=color, width=width)

        for row_number, row in enumerate(ROWS):
            shape_keys = [index[key] for key in source_shape_keys(row)]
            width_key = index[f"row.{row}.width_cm"]
            depth_key = index[f"row.{row}.depth_cm"]
            if not masks[position, shape_keys + [width_key, depth_key]].all():
                continue
            origin_x = 80 if row_number == 0 else 240
            origin_y = 408
            truth_shape = expected[position, shape_keys].reshape(32, 2)
            prediction_shape = predictions[position, shape_keys].reshape(32, 2)
            truth_physical = truth_shape * np.asarray([expected[position, width_key] / 2, expected[position, depth_key] / 2])
            prediction_physical = prediction_shape * np.asarray([predictions[position, width_key] / 2, predictions[position, depth_key] / 2])
            extent = max(float(np.abs(truth_physical).max()), float(np.abs(prediction_physical).max()), 1.0)
            scale = 58.0 / extent
            for points, color, line_width in ((truth_physical, "#fb923c", 3), (prediction_physical, "#22d3ee", 2)):
                plotted = [(origin_x + float(x) * scale, origin_y + float(depth) * scale) for x, depth in points]
                draw.line(plotted + [plotted[0]], fill=color, width=line_width)
            draw.text((origin_x - 28, 466), row, fill=colors[row])
        x = (card_number % columns) * card_width
        y = (card_number // columns) * card_height
        sheet.paste(card, (x, y))
    sheet.save(path, quality=92)


def main() -> int:
    args = parse_args()
    started_monotonic = time.monotonic()
    random.seed(args.seed)
    np.random.seed(args.seed)
    torch.manual_seed(args.seed)
    if args.device == "cuda" and not torch.cuda.is_available():
        raise RuntimeError("CUDA was requested but is unavailable")
    if args.device == "mps" and not torch.backends.mps.is_available():
        raise RuntimeError("MPS was requested but is unavailable")
    if args.device == "auto":
        selected_device = "cuda" if torch.cuda.is_available() else "mps" if torch.backends.mps.is_available() else "cpu"
    else:
        selected_device = args.device
    device = torch.device(selected_device)
    if device.type == "cpu":
        torch.set_num_threads(max(1, min(args.torch_threads, os.cpu_count() or 1)))
        torch.set_num_interop_threads(min(4, max(1, os.cpu_count() or 1)))
        torch.backends.mkldnn.enabled = True
    if device.type == "cuda":
        torch.backends.cudnn.benchmark = True
        torch.cuda.manual_seed_all(args.seed)

    output_dir = args.output_dir.resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    progress_path = output_dir / "progress.json"
    checkpoint_path = output_dir / "best-checkpoint.pt"
    result_path = output_dir / "final-result.json"
    overlay_path = output_dir / "validation-overlay.jpg"
    if not args.local_output_only and not all((
        args.progress_upload_url,
        args.checkpoint_upload_url,
        args.result_upload_url,
        args.overlay_upload_url,
    )):
        raise RuntimeError("Presigned mode requires four artifact upload URLs")

    def http_put(url: str, body: bytes, content_type: str) -> None:
        request = urllib.request.Request(url, data=body, method="PUT", headers={"Content-Type": content_type})
        with urllib.request.urlopen(request, timeout=240) as response:
            if not 200 <= response.status < 300:
                raise RuntimeError(f"Presigned upload failed with HTTP {response.status}")

    def upload(path: Path, url: str, content_type: str) -> None:
        if not args.local_output_only:
            http_put(url, path.read_bytes(), content_type)

    progress_lock = threading.Lock()
    progress: dict[str, Any] = {
        "schemaVersion": "wear3d-waist-hips-v2-progress/v1",
        "jobId": args.job_id,
        "state": "starting",
        "startedAt": now(),
        "device": str(device),
        "teacherInputsReadOnly": True,
        "previousWeightsUsed": False,
        "sealed448SubjectsUsedForTraining": 0,
        "validationCanonicalOnly": VALIDATION_CANONICAL_ONLY,
    }

    def publish(**updates: Any) -> None:
        with progress_lock:
            progress.update(updates)
            progress["updatedAt"] = now()
            write_json(progress_path, progress)
            upload(progress_path, args.progress_upload_url, "application/json")

    def interrupted(signum: int, _frame: Any) -> None:
        publish(state="interrupted", signal=signum, completedAt=now())
        raise SystemExit(128 + signum)

    signal.signal(signal.SIGTERM, interrupted)
    signal.signal(signal.SIGINT, interrupted)

    metadata = json.loads(args.index_metadata.read_text())
    actual_index_sha256 = sha256(args.index)
    if (
        metadata.get("schemaVersion") != "wear3d-fresh-training-index/v1"
        or metadata.get("indexSha256") != actual_index_sha256
        or metadata.get("records") != EXPECTED_RECORDS
        or metadata.get("subjects") != EXPECTED_SUBJECTS
        or metadata.get("sealedTestSubjectsUsed") != 0
        or metadata.get("previousWeightsUsed") is not False
    ):
        raise RuntimeError("The immutable teacher-index provenance contract failed")
    packed = np.load(args.index, allow_pickle=False)
    if len(packed["sample_ids"]) != sum(EXPECTED_RECORDS.values()):
        raise RuntimeError("The immutable teacher-index record count changed")
    roles = packed["roles"]
    scan_ids = packed["scan_ids"]
    all_view_ids = packed["view_ids"]
    geometry_quality, teacher_audit = geometry_quality_from_audit(
        packed,
        args.teacher_audit,
        metadata,
    )
    full_train_indices = np.flatnonzero(roles == 0)
    full_validation_indices = np.flatnonzero(roles == 1)
    if (
        len(np.unique(scan_ids[full_train_indices])) != EXPECTED_SUBJECTS["train"]
        or len(np.unique(scan_ids[full_validation_indices])) != EXPECTED_SUBJECTS["validation"]
        or set(scan_ids[full_train_indices]) & set(scan_ids[full_validation_indices])
    ):
        raise RuntimeError("Subject separation changed")

    (
        latent_targets_full,
        latent_masks_full,
        public_targets_full,
        public_masks_full,
        latent_means,
        latent_stds,
        pca_means,
        pca_bases,
    ) = build_targets(packed, geometry_quality)
    rng = np.random.default_rng(args.seed)
    overfit_proof = bool(args.overfit_subjects)
    loss_weights = dict(LOSS_WEIGHTS)
    if overfit_proof:
        # V4's tape branch is parameter-isolated from geometry. Give the
        # capacity proof a strong tape signal so sub-centimeter residuals do
        # not stall under Smooth-L1 while leaving the strict gate unchanged.
        loss_weights["tape"] = 24.0
        loss_weights["tape_cm"] = 18.0
        loss_weights["tape_tail"] = 10.0
        loss_weights["tape_consistency"] = 4.0
        if "position_pixel" in loss_weights:
            # The proof is deliberately harder than the release mean gates:
            # every visible row and edge must be sub-pixel accurate.
            loss_weights["position_pixel"] = 18.0
            loss_weights["position_tail"] = 20.0
            loss_weights["position_maximum"] = 8.0
            # Do not let the repaired position terms delay the equally strict
            # A-B width and C-D depth capacity proof.
            loss_weights["geometry"] = 12.0
        if "geometry_cm" in loss_weights:
            loss_weights["geometry_cm"] = 18.0
            loss_weights["geometry_tail"] = 20.0
            loss_weights["geometry_maximum"] = 8.0
    if overfit_proof:
        if not 1 <= args.overfit_subjects <= 100:
            raise RuntimeError("--overfit-subjects must be between 1 and 100")
        canonical_train = full_train_indices[all_view_ids[full_train_indices] == "canonical"]
        complete = latent_masks_full[canonical_train].all(axis=1)
        candidate_subjects = np.sort(np.unique(scan_ids[canonical_train[complete]]))
        if len(candidate_subjects) < args.overfit_subjects:
            raise RuntimeError("Not enough complete training subjects for the overfit proof")
        proof_subjects = candidate_subjects[:args.overfit_subjects]
        train_original = np.flatnonzero((roles == 0) & np.isin(scan_ids, proof_subjects))
        validation_original = train_original.copy()
    else:
        train_original = full_train_indices
        validation_original = (
            full_validation_indices[all_view_ids[full_validation_indices] == "canonical"]
            if VALIDATION_CANONICAL_ONLY
            else full_validation_indices
        )
        if args.max_train_records and args.max_train_records < len(train_original):
            train_original = np.sort(rng.choice(train_original, args.max_train_records, replace=False))
        if args.max_validation_records and args.max_validation_records < len(validation_original):
            validation_original = np.sort(rng.choice(validation_original, args.max_validation_records, replace=False))
    selected_original = np.concatenate((train_original, validation_original))
    train_count = len(train_original)
    train_indices_np = np.arange(train_count, dtype=np.int64)
    validation_indices_np = np.arange(train_count, len(selected_original), dtype=np.int64)
    sample_ids = packed["sample_ids"][selected_original]
    selected_scan_ids = packed["scan_ids"][selected_original]
    _, selected_scan_codes = np.unique(selected_scan_ids, return_inverse=True)
    view_ids = packed["view_ids"][selected_original]
    profiles = packed["profiles"][selected_original].astype(np.float32, copy=False)
    latent_targets = latent_targets_full[selected_original]
    latent_masks = latent_masks_full[selected_original]
    public_targets = public_targets_full[selected_original]
    public_masks = public_masks_full[selected_original]
    auxiliary_keys = list(AUXILIARY_TARGET_KEYS)
    auxiliary_targets: np.ndarray | None = None
    auxiliary_masks: np.ndarray | None = None
    auxiliary_means: np.ndarray | None = None
    auxiliary_stds: np.ndarray | None = None
    if auxiliary_keys:
        source_schema = packed["target_schema"].tolist()
        source_index = {key: position for position, key in enumerate(source_schema)}
        missing = [key for key in auxiliary_keys if key not in source_index]
        if missing:
            raise RuntimeError(f"Auxiliary teacher schema is missing: {missing[:5]}")
        source_positions = np.asarray([source_index[key] for key in auxiliary_keys], dtype=np.int64)
        source_targets = packed["targets"].astype(np.float32, copy=False)[:, source_positions]
        source_masks = packed["masks"].astype(np.bool_, copy=False)[:, source_positions].copy()
        if geometry_quality is not None:
            ratio_rows = {
                "ratio.front.shoulder_waist": ("waist",),
                "ratio.front.shoulder_hips": ("hips",),
                "ratio.front.waist_hips": ("waist", "hips"),
            }
            for position, key in enumerate(auxiliary_keys):
                if key.startswith("row."):
                    row = key.split(".", 2)[1]
                    if row in geometry_quality:
                        source_masks[:, position] &= geometry_quality[row]
                elif key in ratio_rows:
                    for row in ratio_rows[key]:
                        if row in geometry_quality:
                            source_masks[:, position] &= geometry_quality[row]
        auxiliary_targets = source_targets[selected_original]
        auxiliary_masks = source_masks[selected_original]
        auxiliary_train = roles == 0
        counts = source_masks[auxiliary_train].sum(axis=0, dtype=np.int64)
        sums = (source_targets[auxiliary_train] * source_masks[auxiliary_train]).sum(axis=0, dtype=np.float64)
        means = np.divide(sums, counts, out=np.zeros_like(sums), where=counts > 0)
        centered = np.where(source_masks[auxiliary_train], source_targets[auxiliary_train] - means, 0.0)
        variances = np.divide(
            (centered * centered).sum(axis=0, dtype=np.float64),
            counts,
            out=np.ones_like(sums),
            where=counts > 0,
        )
        auxiliary_means = means.astype(np.float32)
        auxiliary_stds = np.sqrt(np.maximum(variances, 1e-8)).astype(np.float32)
        if np.any(counts <= 0) or not np.isfinite(auxiliary_stds).all():
            raise RuntimeError("An auxiliary teacher target has no valid training labels")

        # Waist and hip tape appear in both the stable 50-latent contract and
        # the five-row tape teacher. They must use exactly the same
        # standardization so the model can expose one prediction in both
        # places without a hidden conversion layer.
        latent_key_positions = {key: position for position, key in enumerate(latent_schema())}
        auxiliary_key_positions = {key: position for position, key in enumerate(auxiliary_keys)}
        for row in ROWS:
            auxiliary_position = auxiliary_key_positions[f"tape.{row}.circumference_cm"]
            latent_position = latent_key_positions[f"{row}.tape_cm"]
            if not (
                np.isclose(auxiliary_means[auxiliary_position], latent_means[latent_position], atol=1e-6)
                and np.isclose(auxiliary_stds[auxiliary_position], latent_stds[latent_position], atol=1e-6)
            ):
                raise RuntimeError(f"{row} tape standardization changed between primary and auxiliary targets")

    publish(
        state="decoding_masks",
        trainRecords=train_count,
        validationRecords=len(validation_indices_np),
        totalMasks=len(selected_original),
        decodedMasks=0,
    )
    images = np.empty((len(selected_original), IMAGE_HEIGHT, IMAGE_WIDTH), dtype=np.uint8)
    masks_dir = args.masks_dir.resolve()

    def decode_one(position: int) -> tuple[int, np.ndarray]:
        path = masks_dir / f"{sample_ids[position]}.png"
        if not path.is_file():
            raise RuntimeError(f"Missing immutable teacher mask: {sample_ids[position]}")
        with Image.open(path) as opened:
            silhouette = meaningful_silhouette(opened)
            resized = silhouette.resize((IMAGE_WIDTH, IMAGE_HEIGHT), getattr(Image, "Resampling", Image).BILINEAR)
            return position, np.asarray(resized, dtype=np.uint8)

    decoded = 0
    with ThreadPoolExecutor(max_workers=args.decode_workers) as executor:
        futures = [executor.submit(decode_one, position) for position in range(len(selected_original))]
        for future in as_completed(futures):
            position, image = future.result()
            images[position] = image
            decoded += 1
            if decoded % 2_000 == 0 or decoded == len(selected_original):
                publish(decodedMasks=decoded)
    if int((images.reshape(len(images), -1).std(axis=1) <= 5.0).sum()):
        raise RuntimeError("A decoded teacher silhouette is blank")

    standardized_latents = np.where(
        latent_masks,
        (latent_targets - latent_means) / latent_stds,
        0.0,
    ).astype(np.float32)
    standardized_auxiliary: np.ndarray | None = None
    if auxiliary_targets is not None and auxiliary_masks is not None:
        assert auxiliary_means is not None and auxiliary_stds is not None
        standardized_auxiliary = np.where(
            auxiliary_masks,
            (auxiliary_targets - auxiliary_means) / auxiliary_stds,
            0.0,
        ).astype(np.float32)
    images_tensor = torch.from_numpy(images)
    profiles_tensor = torch.from_numpy(profiles)
    latents_tensor = torch.from_numpy(standardized_latents)
    latent_masks_tensor = torch.from_numpy(latent_masks)
    public_targets_tensor = torch.from_numpy(public_targets)
    public_masks_tensor = torch.from_numpy(public_masks)
    auxiliary_tensor = torch.from_numpy(standardized_auxiliary) if standardized_auxiliary is not None else None
    auxiliary_masks_tensor = torch.from_numpy(auxiliary_masks) if auxiliary_masks is not None else None
    scan_codes_tensor = torch.from_numpy(selected_scan_codes.astype(np.int64, copy=False))
    train_indices = torch.from_numpy(train_indices_np)
    validation_indices = torch.from_numpy(validation_indices_np)

    latent_keys = latent_schema()
    latent_index = {key: position for position, key in enumerate(latent_keys)}
    public_keys = output_schema()
    public_index = {key: position for position, key in enumerate(public_keys)}
    group_indices: dict[str, list[int]] = {name: [] for name in ("position", "geometry", "tape", "shape_pca", "camera")}
    for position, key in enumerate(latent_keys):
        if key.startswith("camera."):
            group_indices["camera"].append(position)
        elif ".shape_pca." in key:
            group_indices["shape_pca"].append(position)
        elif key.endswith((".y_norm", ".center_norm", ".span_norm")):
            group_indices["position"].append(position)
        elif key.endswith((".width_cm", ".depth_cm")):
            group_indices["geometry"].append(position)
        elif key.endswith(".tape_cm"):
            group_indices["tape"].append(position)
    group_tensors = {
        name: torch.tensor(indices, dtype=torch.long, device=device)
        for name, indices in group_indices.items()
    }
    shape_output_indices = torch.tensor(
        [public_index[key] for row in ROWS for key in source_shape_keys(row)],
        dtype=torch.long,
        device=device,
    )
    position_output_indices = torch.tensor(
        [
            public_index[f"row.{row}.{field}"]
            for row in ROWS
            for field in ("y_norm", "left_x_norm", "right_x_norm")
        ],
        dtype=torch.long,
        device=device,
    )
    position_pixel_scales = torch.tensor(
        [
            scale
            for _row in ROWS
            for scale in (SOURCE_HEIGHT, SOURCE_WIDTH, SOURCE_WIDTH)
        ],
        dtype=torch.float32,
        device=device,
    ).view(1, -1)
    geometry_output_indices = torch.tensor(
        [
            public_index[f"row.{row}.{field}"]
            for row in ROWS
            for field in ("width_cm", "depth_cm")
        ],
        dtype=torch.long,
        device=device,
    )
    ratio_output_indices = torch.tensor(
        [
            public_index[f"row.{row}.depth_width_ratio"] for row in ROWS
        ] + [
            public_index["ratio.front.waist_hips"],
            public_index["ratio.tape.waist_hips"],
        ],
        dtype=torch.long,
        device=device,
    )
    tape_output_indices = torch.tensor(
        [public_index[f"tape.{row}.circumference_cm"] for row in ROWS],
        dtype=torch.long,
        device=device,
    )
    tape_latent_indices = torch.tensor(
        [latent_index[f"{row}.tape_cm"] for row in ROWS],
        dtype=torch.long,
        device=device,
    )
    row_shape_latent_indices = {
        row: torch.tensor(
            [latent_index[f"{row}.shape_pca.{component:02d}"] for component in range(PCA_COMPONENTS)],
            dtype=torch.long,
            device=device,
        )
        for row in ROWS
    }
    auxiliary_means_tensor: torch.Tensor | None = None
    auxiliary_stds_tensor: torch.Tensor | None = None
    auxiliary_tape_indices: dict[str, int] = {}
    if auxiliary_keys:
        assert auxiliary_means is not None and auxiliary_stds is not None
        auxiliary_means_tensor = torch.from_numpy(auxiliary_means).to(device).view(1, -1)
        auxiliary_stds_tensor = torch.from_numpy(auxiliary_stds).to(device).view(1, -1)
        auxiliary_index = {key: position for position, key in enumerate(auxiliary_keys)}
        auxiliary_tape_indices = {
            row: auxiliary_index[f"tape.{row}.circumference_cm"]
            for row in AUXILIARY_TAPE_ROWS
        }

    model = WaistHipStudent().to(device)
    if overfit_proof:
        # The wiring/capacity proof must measure whether this exact network can
        # memorize the ten approved subjects. Stochastic regularization and
        # FP16 rounding obscure that signal, so they remain enabled only for
        # the real train/validation run below.
        for module in model.modules():
            if isinstance(module, torch.nn.Dropout):
                module.p = 0.0
    model_name = model.__class__.__name__
    decoder = WaistHipDecoder(
        DecoderArrays(latent_means, latent_stds, pca_means, pca_bases)
    ).to(device)
    parameter_count = sum(parameter.numel() for parameter in model.parameters())
    optimizer = torch.optim.AdamW(
        model.parameters(),
        lr=args.learning_rate,
        weight_decay=0.0 if overfit_proof else 1e-3,
    )
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(
        optimizer, T_max=args.epochs, eta_min=args.learning_rate * 0.01
    )
    amp_enabled = device.type == "cuda" and not overfit_proof
    scaler = torch.amp.GradScaler("cuda", enabled=amp_enabled)

    def masked_regression(prediction: torch.Tensor, expected: torch.Tensor, mask: torch.Tensor) -> torch.Tensor:
        elementwise = F.smooth_l1_loss(prediction, expected, reduction="none", beta=1.0)
        return (elementwise * mask).sum() / mask.sum().clamp_min(1)

    def loss_components(
        prediction_z: torch.Tensor,
        expected_z: torch.Tensor,
        latent_mask: torch.Tensor,
        expected_public: torch.Tensor,
        public_mask: torch.Tensor,
        sample_codes: torch.Tensor | None = None,
        auxiliary_prediction_z: torch.Tensor | None = None,
        auxiliary_expected_z: torch.Tensor | None = None,
        auxiliary_mask: torch.Tensor | None = None,
    ) -> tuple[torch.Tensor, dict[str, torch.Tensor]]:
        components: dict[str, torch.Tensor] = {}
        for name, indices in group_tensors.items():
            components[name] = masked_regression(
                prediction_z.index_select(1, indices),
                expected_z.index_select(1, indices),
                latent_mask.index_select(1, indices),
            )
        decoded = decoder(prediction_z)
        if "position_pixel" in loss_weights:
            position_losses = masked_position_pixel_losses(
                decoded.index_select(1, position_output_indices),
                expected_public.index_select(1, position_output_indices),
                public_mask.index_select(1, position_output_indices),
                position_pixel_scales,
            )
            components["position_pixel"] = position_losses[0]
            components["position_tail"] = position_losses[1]
            components["position_maximum"] = position_losses[2]
        if "geometry_cm" in loss_weights:
            geometry_losses = masked_geometry_cm_losses(
                decoded.index_select(1, geometry_output_indices),
                expected_public.index_select(1, geometry_output_indices),
                public_mask.index_select(1, geometry_output_indices),
            )
            components["geometry_cm"] = geometry_losses[0]
            components["geometry_tail"] = geometry_losses[1]
            components["geometry_maximum"] = geometry_losses[2]
        tape_prediction = decoded.index_select(1, tape_output_indices)
        tape_expected = expected_public.index_select(1, tape_output_indices)
        tape_mask = public_mask.index_select(1, tape_output_indices)
        tape_huber = F.smooth_l1_loss(
            tape_prediction,
            tape_expected,
            reduction="none",
            beta=1.27,
        ) / 1.27
        components["tape_cm"] = (tape_huber * tape_mask).sum() / tape_mask.sum().clamp_min(1)
        valid_tape_huber = tape_huber[tape_mask]
        if valid_tape_huber.numel():
            tail_count = max(1, (valid_tape_huber.numel() + 9) // 10)
            components["tape_tail"] = torch.topk(valid_tape_huber, tail_count).values.mean()
        else:
            components["tape_tail"] = prediction_z.new_tensor(0.0)

        if sample_codes is not None and len(sample_codes) > 1:
            tape_z = prediction_z.index_select(1, tape_latent_indices)
            tape_valid = latent_mask.index_select(1, tape_latent_indices)
            _, inverse = torch.unique(sample_codes, sorted=True, return_inverse=True)
            group_count = int(inverse.max()) + 1
            valid_float = tape_valid.to(tape_z.dtype)
            group_sums = tape_z.new_zeros((group_count, len(ROWS))).index_add_(
                0, inverse, tape_z * valid_float
            )
            group_counts = tape_z.new_zeros((group_count, len(ROWS))).index_add_(
                0, inverse, valid_float
            )
            group_means = group_sums / group_counts.clamp_min(1.0)
            expected_group_tape = group_means.index_select(0, inverse)
            consistency = F.smooth_l1_loss(
                tape_z,
                expected_group_tape,
                reduction="none",
                beta=0.05,
            )
            components["tape_consistency"] = (
                (consistency * tape_valid).sum() / tape_valid.sum().clamp_min(1)
            )
        else:
            components["tape_consistency"] = prediction_z.new_tensor(0.0)

        shape_mask = public_mask.index_select(1, shape_output_indices)
        components["shape_coordinate"] = masked_regression(
            decoded.index_select(1, shape_output_indices) / 0.08,
            expected_public.index_select(1, shape_output_indices) / 0.08,
            shape_mask,
        )
        ratio_mask = public_mask.index_select(1, ratio_output_indices)
        components["ratio"] = masked_regression(
            decoded.index_select(1, ratio_output_indices) / 0.10,
            expected_public.index_select(1, ratio_output_indices) / 0.10,
            ratio_mask,
        )
        concordances: list[torch.Tensor] = []
        for indices in row_shape_latent_indices.values():
            valid = latent_mask.index_select(1, indices).all(dim=1)
            if int(valid.sum()) < 4:
                continue
            predicted = prediction_z[valid].index_select(1, indices)
            expected = expected_z[valid].index_select(1, indices)
            predicted_mean = predicted.mean(dim=0)
            expected_mean = expected.mean(dim=0)
            predicted_centered = predicted - predicted_mean
            expected_centered = expected - expected_mean
            covariance = (predicted_centered * expected_centered).mean(dim=0)
            denominator = (
                predicted_centered.square().mean(dim=0)
                + expected_centered.square().mean(dim=0)
                + (predicted_mean - expected_mean).square()
                + 1e-5
            )
            concordances.append((1.0 - (2.0 * covariance / denominator)).mean())
        components["shape_concordance"] = (
            torch.stack(concordances).mean() if concordances else prediction_z.new_tensor(0.0)
        )
        if auxiliary_keys:
            if (
                auxiliary_prediction_z is None
                or auxiliary_expected_z is None
                or auxiliary_mask is None
                or auxiliary_means_tensor is None
                or auxiliary_stds_tensor is None
            ):
                raise RuntimeError("The auxiliary teacher branch did not provide predictions and targets")
            components["auxiliary"] = masked_regression(
                auxiliary_prediction_z,
                auxiliary_expected_z,
                auxiliary_mask,
            )
            auxiliary_prediction = (
                auxiliary_prediction_z.clamp(-5.0, 5.0) * auxiliary_stds_tensor
                + auxiliary_means_tensor
            )
            auxiliary_expected = (
                auxiliary_expected_z * auxiliary_stds_tensor
                + auxiliary_means_tensor
            )
            tape_positions = torch.tensor(
                [auxiliary_tape_indices[row] for row in AUXILIARY_TAPE_ROWS],
                dtype=torch.long,
                device=device,
            )
            auxiliary_tape_prediction = auxiliary_prediction.index_select(1, tape_positions)
            auxiliary_tape_expected = auxiliary_expected.index_select(1, tape_positions)
            auxiliary_tape_mask = auxiliary_mask.index_select(1, tape_positions)
            auxiliary_tape_huber = F.smooth_l1_loss(
                auxiliary_tape_prediction,
                auxiliary_tape_expected,
                reduction="none",
                beta=1.27,
            ) / 1.27
            components["auxiliary_tape_cm"] = (
                (auxiliary_tape_huber * auxiliary_tape_mask).sum()
                / auxiliary_tape_mask.sum().clamp_min(1)
            )

            tape_ratios: list[torch.Tensor] = []
            for numerator_row, denominator_row in AUXILIARY_TAPE_RATIO_PAIRS:
                numerator = auxiliary_tape_indices[numerator_row]
                denominator = auxiliary_tape_indices[denominator_row]
                valid = auxiliary_mask[:, numerator] & auxiliary_mask[:, denominator]
                if not bool(valid.any()):
                    continue
                predicted_ratio = auxiliary_prediction[valid, numerator] / auxiliary_prediction[
                    valid, denominator
                ].clamp_min(1e-4)
                expected_ratio = auxiliary_expected[valid, numerator] / auxiliary_expected[
                    valid, denominator
                ].clamp_min(1e-4)
                tape_ratios.append(
                    F.smooth_l1_loss(
                        predicted_ratio / 0.05,
                        expected_ratio / 0.05,
                        reduction="mean",
                        beta=1.0,
                    )
                )
            components["auxiliary_tape_ratio"] = (
                torch.stack(tape_ratios).mean()
                if tape_ratios
                else prediction_z.new_tensor(0.0)
            )
        weighted = sum(components[name] * loss_weights[name] for name in loss_weights)
        return weighted / sum(loss_weights.values()), components

    train_groups_by_subject: dict[str, list[int]] = {}
    for position, subject in enumerate(selected_scan_ids[:train_count]):
        train_groups_by_subject.setdefault(str(subject), []).append(position)
    train_subject_groups = [
        torch.tensor(positions, dtype=torch.long)
        for positions in train_groups_by_subject.values()
    ]

    def batches(indices: torch.Tensor, shuffle: bool):
        if shuffle:
            pending: list[torch.Tensor] = []
            pending_size = 0
            for group_number in torch.randperm(len(train_subject_groups)).tolist():
                group = train_subject_groups[group_number]
                if pending and pending_size + len(group) > args.batch_size:
                    yield torch.cat(pending)
                    pending = []
                    pending_size = 0
                pending.append(group)
                pending_size += len(group)
            if pending:
                yield torch.cat(pending)
            return
        order = indices
        for start in range(0, len(order), args.batch_size):
            yield order[start:start + args.batch_size]

    def forward_indices(indices: torch.Tensor) -> tuple[torch.Tensor, torch.Tensor | None]:
        silhouettes = images_tensor[indices].to(device, non_blocking=amp_enabled).unsqueeze(1).float().div_(255.0)
        profile_batch = profiles_tensor[indices].to(device, non_blocking=amp_enabled)
        if auxiliary_keys:
            if not hasattr(model, "forward_with_aux"):
                raise RuntimeError("The selected student does not implement forward_with_aux")
            primary, auxiliary = model.forward_with_aux(silhouettes, profile_batch)
            return primary, auxiliary
        return model(silhouettes, profile_batch), None

    def evaluate(indices: torch.Tensor, keep_predictions: bool = False) -> dict[str, Any]:
        model.eval()
        predictions: list[torch.Tensor] = []
        auxiliary_predictions: list[torch.Tensor] = []
        with torch.no_grad():
            for batch_indices in batches(indices, shuffle=False):
                with torch.autocast(device_type=device.type, dtype=torch.float16, enabled=amp_enabled):
                    prediction, auxiliary_prediction = forward_indices(batch_indices)
                    predictions.append(prediction.float())
                    if auxiliary_prediction is not None:
                        auxiliary_predictions.append(auxiliary_prediction.float())
            prediction_z = torch.cat(predictions, dim=0)
            auxiliary_prediction_z = (
                torch.cat(auxiliary_predictions, dim=0) if auxiliary_predictions else None
            )
            expected_z = latents_tensor[indices].to(device)
            latent_mask = latent_masks_tensor[indices].to(device)
            expected_public = public_targets_tensor[indices].to(device)
            public_mask = public_masks_tensor[indices].to(device)
            loss, components = loss_components(
                prediction_z,
                expected_z,
                latent_mask,
                expected_public,
                public_mask,
                scan_codes_tensor[indices].to(device),
                auxiliary_prediction_z,
                auxiliary_tensor[indices].to(device) if auxiliary_tensor is not None else None,
                auxiliary_masks_tensor[indices].to(device) if auxiliary_masks_tensor is not None else None,
            )
            decoded = decoder(prediction_z)
        return {
            "weightedLoss": float(loss),
            "groupLosses": {name: float(value) for name, value in components.items()},
            "predictions": decoded.cpu().numpy() if keep_predictions else None,
        }

    with torch.no_grad():
        baseline_z = torch.zeros((len(validation_indices), len(latent_keys)), dtype=torch.float32, device=device)
        baseline_auxiliary_z = (
            torch.zeros((len(validation_indices), len(auxiliary_keys)), dtype=torch.float32, device=device)
            if auxiliary_keys
            else None
        )
        baseline_loss, baseline_components = loss_components(
            baseline_z,
            latents_tensor[validation_indices].to(device),
            latent_masks_tensor[validation_indices].to(device),
            public_targets_tensor[validation_indices].to(device),
            public_masks_tensor[validation_indices].to(device),
            scan_codes_tensor[validation_indices].to(device),
            baseline_auxiliary_z,
            auxiliary_tensor[validation_indices].to(device) if auxiliary_tensor is not None else None,
            auxiliary_masks_tensor[validation_indices].to(device) if auxiliary_masks_tensor is not None else None,
        )
    baseline = {
        "weightedLoss": float(baseline_loss),
        "groupLosses": {name: float(value) for name, value in baseline_components.items()},
    }
    publish(
        state="training",
        parameterCount=parameter_count,
        epoch=0,
        epochsPlanned=args.epochs,
        baselineValidation=baseline,
    )

    best_validation_loss = math.inf
    best_epoch = 0
    epochs_without_improvement = 0
    history: list[dict[str, Any]] = []
    stopped_reason = "epochs_completed"
    training_started = time.monotonic()
    for epoch in range(1, args.epochs + 1):
        if (time.monotonic() - started_monotonic) / 60.0 >= args.max_wall_minutes:
            stopped_reason = "maximum_wall_time"
            break
        epoch_started = time.monotonic()
        model.train()
        epoch_loss = 0.0
        epoch_samples = 0
        epoch_components = {name: 0.0 for name in loss_weights}
        for batch_indices in batches(train_indices, shuffle=True):
            optimizer.zero_grad(set_to_none=True)
            with torch.autocast(device_type=device.type, dtype=torch.float16, enabled=amp_enabled):
                prediction_z, auxiliary_prediction_z = forward_indices(batch_indices)
                loss, components = loss_components(
                    prediction_z,
                    latents_tensor[batch_indices].to(device, non_blocking=amp_enabled),
                    latent_masks_tensor[batch_indices].to(device, non_blocking=amp_enabled),
                    public_targets_tensor[batch_indices].to(device, non_blocking=amp_enabled),
                    public_masks_tensor[batch_indices].to(device, non_blocking=amp_enabled),
                    scan_codes_tensor[batch_indices].to(device, non_blocking=amp_enabled),
                    auxiliary_prediction_z,
                    auxiliary_tensor[batch_indices].to(device, non_blocking=amp_enabled)
                    if auxiliary_tensor is not None else None,
                    auxiliary_masks_tensor[batch_indices].to(device, non_blocking=amp_enabled)
                    if auxiliary_masks_tensor is not None else None,
                )
            if not torch.isfinite(loss):
                raise RuntimeError("Waist/hip training produced a non-finite loss")
            scaler.scale(loss).backward()
            scaler.unscale_(optimizer)
            torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=5.0)
            scaler.step(optimizer)
            scaler.update()
            batch_size = len(batch_indices)
            epoch_loss += float(loss.detach()) * batch_size
            epoch_samples += batch_size
            for name, component in components.items():
                epoch_components[name] += float(component.detach()) * batch_size
        scheduler.step()
        validation = evaluate(validation_indices)
        validation_loss = float(validation["weightedLoss"])
        improved = validation_loss < best_validation_loss - 1e-5
        if improved:
            best_validation_loss = validation_loss
            best_epoch = epoch
            epochs_without_improvement = 0
            checkpoint_payload: dict[str, Any] = {
                "model": model_name,
                "modelStateDict": model.state_dict(),
                "latentSchema": latent_keys,
                "outputSchema": public_keys,
                "latentMeans": latent_means.tolist(),
                "latentStandardDeviations": latent_stds.tolist(),
                "pcaMeans": pca_means.tolist(),
                "pcaBases": pca_bases.tolist(),
                "profileFields": list(PROFILE_FIELDS),
                "imageSize": [IMAGE_WIDTH, IMAGE_HEIGHT],
                "teacherJobId": metadata["teacherJobId"],
                "trainingIndexSha256": metadata["indexSha256"],
                "epoch": epoch,
                "validationLoss": validation_loss,
                "teacherInputsReadOnly": True,
                "previousWeightsUsed": False,
                "sealed448SubjectsUsedForTraining": 0,
                "overfitProof": overfit_proof,
                "lossWeights": loss_weights,
                "subjectGroupedBatches": True,
                "validationCanonicalOnly": VALIDATION_CANONICAL_ONLY,
                "teacherAudit": teacher_audit,
            }
            if auxiliary_keys:
                assert auxiliary_means is not None and auxiliary_stds is not None
                checkpoint_payload.update({
                    "auxiliaryTargetSchema": auxiliary_keys,
                    "auxiliaryTargetMeans": auxiliary_means.tolist(),
                    "auxiliaryTargetStandardDeviations": auxiliary_stds.tolist(),
                    "auxiliaryTapeRows": list(AUXILIARY_TAPE_ROWS),
                    "auxiliaryTapeRatioPairs": [list(pair) for pair in AUXILIARY_TAPE_RATIO_PAIRS],
                })
            torch.save(checkpoint_payload, checkpoint_path)
        else:
            epochs_without_improvement += 1
        elapsed = time.monotonic() - training_started
        entry = {
            "epoch": epoch,
            "epochSeconds": time.monotonic() - epoch_started,
            "trainLoss": epoch_loss / max(epoch_samples, 1),
            "trainGroupLosses": {name: value / max(epoch_samples, 1) for name, value in epoch_components.items()},
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
            bestEpoch=best_epoch,
            bestValidationLoss=best_validation_loss,
            epochsWithoutImprovement=epochs_without_improvement,
            averageEpochSeconds=elapsed / epoch,
            validationGroupLosses=validation["groupLosses"],
        )
        print(
            f"epoch={epoch:03d} seconds={entry['epochSeconds']:.2f} "
            f"train={entry['trainLoss']:.6f} validation={validation_loss:.6f} "
            f"best={best_validation_loss:.6f}@{best_epoch}",
            flush=True,
        )
        if epoch >= args.min_epochs and epochs_without_improvement >= args.patience:
            stopped_reason = "early_stopping"
            break

    if not checkpoint_path.is_file():
        raise RuntimeError("Training produced no checkpoint")
    checkpoint = torch.load(checkpoint_path, map_location="cpu", weights_only=False)
    model.load_state_dict(checkpoint["modelStateDict"])
    best_validation = evaluate(validation_indices, keep_predictions=True)
    predictions = best_validation.pop("predictions")
    expected = public_targets[validation_indices_np]
    expected_masks = public_masks[validation_indices_np]
    metrics = calculate_metrics(predictions, expected, expected_masks)
    beats_baseline = bool(best_validation["weightedLoss"] < baseline["weightedLoss"])
    gates = validation_gates(metrics, beats_baseline)
    canonical_positions = [
        int(position)
        for position in validation_indices_np
        if view_ids[position] == "canonical"
    ][:16]
    render_overlay(
        overlay_path,
        images,
        sample_ids,
        np.pad(predictions, ((train_count, 0), (0, 0)), constant_values=0),
        public_targets,
        public_masks,
        canonical_positions,
    )
    result = {
        "schemaVersion": "wear3d-waist-hips-v2-training-result/v1",
        "jobId": args.job_id,
        "state": "completed",
        "completedAt": now(),
        "elapsedMinutes": (time.monotonic() - started_monotonic) / 60.0,
        "device": str(device),
        "model": model_name,
        "parameterCount": parameter_count,
        "teacherInputsReadOnly": True,
        "previousWeightsUsed": False,
        "sealed448SubjectsUsedForTraining": 0,
        "overfitProof": overfit_proof,
        "lossWeights": loss_weights,
        "subjectGroupedBatches": True,
        "validationCanonicalOnly": VALIDATION_CANONICAL_ONLY,
        "teacherAudit": teacher_audit,
        "auxiliaryTeacher": (
            {
                "targetCount": len(auxiliary_keys),
                "tapeRows": list(AUXILIARY_TAPE_ROWS),
                "tapeRatioPairs": [list(pair) for pair in AUXILIARY_TAPE_RATIO_PAIRS],
                "threeDimensionalGeometryIsSeparateFromTape": not (
                    THREE_DIMENSIONAL_GEOMETRY_SUPERVISES_TAPE_REPRESENTATION
                ),
                "threeDimensionalGeometrySupervisesTapeRepresentation": (
                    THREE_DIMENSIONAL_GEOMETRY_SUPERVISES_TAPE_REPRESENTATION
                ),
                "threeDimensionalGeometryIsCircumferenceTarget": False,
                "recordedWearTapeIsSoleCircumferenceTarget": True,
            }
            if auxiliary_keys
            else None
        ),
        "train": {"subjects": int(len(np.unique(selected_scan_ids[:train_count]))), "records": int(train_count)},
        "validation": {
            "subjects": int(len(np.unique(selected_scan_ids[train_count:]))),
            "records": int(len(validation_indices_np)),
        },
        "training": {
            "epochsPlanned": args.epochs,
            "epochsCompleted": len(history),
            "bestEpoch": best_epoch,
            "stoppedReason": stopped_reason,
            "history": history,
        },
        "baselineValidation": baseline,
        "bestValidation": best_validation,
        "metrics": metrics,
        "qualityGates": gates,
        "pca": {"componentsPerRow": PCA_COMPONENTS, "decodedPointsPerRow": 32},
        "limitations": [
            "This private student consumes a front silhouette plus height, weight, BMI and gender, not raw RGB.",
            (
                "Waist and hips are public outputs; neck, chest and under-bust tape and all-five-row geometry "
                "are training-only auxiliary targets."
                if auxiliary_keys
                else "Only waist and hips are trained; neck, chest and under-bust are intentionally excluded."
            ),
            "Normal customer photos still require segmentation and camera normalization before this model.",
        ],
    }
    write_json(result_path, result)
    upload(checkpoint_path, args.checkpoint_upload_url, "application/octet-stream")
    upload(result_path, args.result_upload_url, "application/json")
    upload(overlay_path, args.overlay_upload_url, "image/jpeg")
    publish(
        state="completed",
        completedAt=result["completedAt"],
        elapsedMinutes=result["elapsedMinutes"],
        epochsCompleted=len(history),
        bestEpoch=best_epoch,
        bestValidationLoss=best_validation["weightedLoss"],
        validationReadyFor448Benchmark=gates["validationReadyFor448Benchmark"],
    )
    print(json.dumps({
        "state": "completed",
        "elapsedMinutes": result["elapsedMinutes"],
        "bestEpoch": best_epoch,
        "bestValidationLoss": best_validation["weightedLoss"],
        "qualityGates": gates,
        "metrics": metrics,
    }, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
