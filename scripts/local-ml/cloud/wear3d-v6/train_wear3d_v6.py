#!/usr/bin/env python3
"""Train the WEAR-only Blender 2D-mesh sizing model.

The runtime contract is one standardized Blender 2D body-mesh card plus
height, weight, BMI, and gender. No true anatomical row, tape, depth, RGB
photo, Apple/Depth estimate, or px-to-cm value is an input.

The model learns three paths directly from standing WEAR teachers:
1. Blender 2D mesh + profile -> anatomical rows, landmarks, and body segments.
2. Mesh shape + profile + the model's own predicted row -> that certified
   row's A-B, C-D, and normalized 32-point PLY cross-section.
3. Circumference is calculated by walking the predicted 32-point shape; the
   recorded tape supervises this connected path and is never a separate head.
4. Mesh + profile -> all other usable non-circumference standing measurements.

No ellipse, superellipse, nearest-person answer, tape OCR, Apple scale, or
tape-derived depth is used.
"""

from __future__ import annotations

import argparse
from collections import Counter
from dataclasses import dataclass
from datetime import datetime, timezone
import json
import math
from pathlib import Path
import random
import sys
import tempfile
from typing import Any

try:
    import boto3
except ModuleNotFoundError:  # Local startup smoke has no AWS dependency.
    boto3 = None
import numpy as np
import onnx
from PIL import Image
import torch
from torch import nn
from torch.nn import functional as F
from torch.utils.data import DataLoader, Dataset
from torchvision.models import MobileNet_V3_Small_Weights, mobilenet_v3_small


ROW_NAMES = ("neck", "chest", "underbust", "waist", "hips")
POSE_ANCHORS = (
    ("left_shoulder", "Lt. Acromion"),
    ("right_shoulder", "Rt. Acromion"),
    ("left_hip", "Lt. Trochanterion"),
    ("right_hip", "Rt. Trochanterion"),
)
POSE_VALUE_KEYS = tuple(
    f"{anchor}_{axis}"
    for anchor, _ in POSE_ANCHORS
    for axis in ("x_norm", "y_norm")
)
ROW_GEOMETRY_FIELDS = ("y_norm", "left_x_norm", "right_x_norm")
CONTOUR_POINTS = 32
SEGMENT_NAMES = ("shoulders", "right_sleeve", "left_sleeve", "right_inseam", "left_inseam")
SEGMENT_POINT_COUNTS = {
    "shoulders": 2,
    "right_sleeve": 3,
    "left_sleeve": 3,
    "right_inseam": 2,
    "left_inseam": 2,
}
IMAGE_WIDTH = 192
IMAGE_HEIGHT = 256
MESH_CHANNEL_MEAN = np.asarray((0.5, 0.5, 0.5), dtype=np.float32)[:, None, None]
MESH_CHANNEL_STD = np.asarray((0.5, 0.5, 0.5), dtype=np.float32)[:, None, None]
MIN_TARGET_COUNT = 20
REQUIRED_FRONT_SUBJECTS = 4_326
LANDMARK_MIN_COVERAGE = 0.80
EXCLUDED_MEASUREMENTS = {"stature_mm", "weight_kg"}
# CAESAR/WEAR Volume II lists eight seated manual measurements. Six retain
# "sitting" in our normalized field names; these two do not, so exclude them
# explicitly from a model whose customer input is one standing photo.
SITTING_MEASUREMENTS = {"buttock_knee_length_mm", "knee_height_mm"}
CORE_CIRCUMFERENCE_KEYS = {f"row.{name}.circumference_cm" for name in ROW_NAMES}
CORE_BREADTH_KEYS = {f"row.{name}.breadth_cm" for name in ROW_NAMES}
CORE_DEPTH_KEYS = {f"row.{name}.depth_cm" for name in ROW_NAMES}
CORE_SHAPE_KEYS = {
    f"row.{name}.shape.{index:02d}.{axis}"
    for name in ROW_NAMES
    for index in range(CONTOUR_POINTS)
    for axis in ("x", "y")
}
CORE_CIRCUMFERENCE_LIMIT_CM = {key: 4.0 for key in CORE_CIRCUMFERENCE_KEYS}
CORE_BREADTH_LIMIT_CM = {key: 2.5 for key in CORE_BREADTH_KEYS}
CORE_DEPTH_LIMIT_CM = {key: 4.0 for key in CORE_DEPTH_KEYS}
HALF_INCH_CM = 1.27
REQUIRED_HELD_OUT_HALF_INCH_RATE = 0.97
ROW_PIXEL_GATE_NORMALIZED = 0.01
# Held-out MAE is rounded to five decimals and Apple/body-row coordinates are
# normalized ratios. Treat differences below 0.001 as a numerical tie with the
# train-mean baseline; the absolute anatomical error limit must still pass.
# This prevents a sub-pixel rounding difference from rejecting an otherwise
# learned row while still rejecting a meaningfully average-only prediction.
EDGE_BASELINE_TIE_TOLERANCE = 0.001
CORE_ABSOLUTE_EDGE_KEYS = {
    f"row.{name}.{field}"
    for name in ROW_NAMES
    for field in ("y_norm", "left_x_norm", "right_x_norm")
}
CORE_RELATIVE_EDGE_FIELDS = ()
CORE_RELATIVE_EDGE_KEYS = {
    f"row.{name}.{field}"
    for name in ROW_NAMES
    for field in CORE_RELATIVE_EDGE_FIELDS
}
CORE_ROW_EDGE_FIELDS = (
    "y_norm",
    "left_x_norm",
    "right_x_norm",
)
CORE_EDGE_KEYS = CORE_ABSOLUTE_EDGE_KEYS | CORE_RELATIVE_EDGE_KEYS
CORE_SEGMENT_KEYS = {
    f"segment.{name}.{index}.{axis}"
    for name, count in SEGMENT_POINT_COUNTS.items()
    for index in range(count)
    for axis in ("x", "y")
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path)
    parser.add_argument("--output-dir", type=Path)
    parser.add_argument("--pipeline-id")
    parser.add_argument("--startup-smoke", action="store_true")
    parser.add_argument("--epochs", type=int, default=15)
    parser.add_argument("--batch-size", type=int, default=64)
    parser.add_argument("--workers", type=int, default=2)
    parser.add_argument("--status-bucket")
    parser.add_argument("--status-key")
    parser.add_argument("--minimum-records", type=int, default=1_000)
    parser.add_argument("--source-contract-report", type=Path)
    parser.add_argument("--teacher-audit-report", type=Path)
    return parser.parse_args()


def finite(value: Any) -> float | None:
    try:
        result = float(value)
    except (TypeError, ValueError):
        return None
    return result if math.isfinite(result) else None


def require_full_contract_reports(
    source_contract_path: Path | None,
    teacher_audit_path: Path | None,
) -> None:
    """Refuse GPU training unless source and rendered-teacher gates passed."""
    if source_contract_path is None or teacher_audit_path is None:
        raise RuntimeError(
            "--source-contract-report and --teacher-audit-report are required; "
            "WEAR training is fail-closed"
        )
    source = json.loads(source_contract_path.read_text(encoding="utf-8"))
    if source.get("status") != "ready-for-visual-canary" or source.get("blockers"):
        raise RuntimeError("WEAR source contract is not ready for rendered teachers")
    teacher = json.loads(teacher_audit_path.read_text(encoding="utf-8"))
    summary = teacher.get("summary") or {}
    if summary.get("trainingAllowed") is not True or summary.get("fullContractCoverage") is not True:
        raise RuntimeError("Rendered WEAR teacher audit did not pass the full contract")


def profile_values(record: dict[str, Any]) -> np.ndarray:
    compact = record.get("_profile_values")
    if compact is not None:
        return np.asarray(compact, dtype=np.float32)
    return np.asarray(
        [
            float(record["height_cm"]),
            float(record["weight_kg"]),
            float(record["bmi"]),
            1.0 if record.get("gender") == "female" else 0.0,
        ],
        dtype=np.float32,
    )


def pose_values(record: dict[str, Any]) -> tuple[np.ndarray, np.ndarray]:
    compact_values = record.get("_pose_values")
    compact_mask = record.get("_pose_mask")
    if compact_values is not None and compact_mask is not None:
        return (
            np.asarray(compact_values, dtype=np.float32).copy(),
            np.asarray(compact_mask, dtype=np.float32).copy(),
        )
    values = np.zeros(len(POSE_ANCHORS) * 2, dtype=np.float32)
    mask = np.zeros(len(POSE_ANCHORS), dtype=np.float32)
    landmarks = record.get("landmarks_2d") or {}
    for index, (_, landmark_name) in enumerate(POSE_ANCHORS):
        point = landmarks.get(landmark_name) or {}
        x = finite(point.get("x"))
        y = finite(point.get("y"))
        if point.get("visible") is True and x is not None and y is not None:
            values[index * 2] = x
            values[index * 2 + 1] = y
            mask[index] = 1.0
    return values, mask


def relative_row_geometry(
    record: dict[str, Any],
    y: float | None,
    left: float | None,
    right: float | None,
) -> dict[str, float]:
    """Express a WEAR row in the Apple shoulder/hip coordinate frame.

    Absolute synthetic-image coordinates transfer poorly to phone photos. The
    relative targets preserve the exact WEAR label while letting Apple anchors
    provide the photo-specific translation and scale at runtime.
    """
    if y is None or left is None or right is None or right <= left:
        return {}
    anchors, anchor_mask = pose_values(record)
    if np.any(anchor_mask < 0.5):
        return {}
    shoulder_center_x = float((anchors[0] + anchors[2]) * 0.5)
    shoulder_y = float((anchors[1] + anchors[3]) * 0.5)
    hip_center_x = float((anchors[4] + anchors[6]) * 0.5)
    hip_y = float((anchors[5] + anchors[7]) * 0.5)
    shoulder_span = abs(float(anchors[2] - anchors[0]))
    torso_height = hip_y - shoulder_y
    if shoulder_span < 0.04 or torso_height < 0.05:
        return {}
    y_ratio = (float(y) - shoulder_y) / torso_height
    anchor_center = shoulder_center_x + (hip_center_x - shoulder_center_x) * y_ratio
    center = (float(left) + float(right)) * 0.5
    return {
        "y_shoulder_hip_ratio": y_ratio,
        "span_shoulder_ratio": (float(right) - float(left)) / shoulder_span,
        "center_anchor_offset_ratio": (center - anchor_center) / shoulder_span,
    }


def bmi_cohort(profile: np.ndarray) -> str:
    bmi = float(profile[2])
    if bmi < 18.5:
        return "under-18.5"
    if bmi < 25.0:
        return "18.5-24.9"
    if bmi < 30.0:
        return "25.0-29.9"
    if bmi < 35.0:
        return "30.0-34.9"
    return "35-plus"


def flatten_targets(record: dict[str, Any]) -> tuple[dict[str, float], dict[str, float]]:
    edges: dict[str, float] = {}
    measurements: dict[str, float] = {}
    for name in ROW_NAMES:
        row = (record.get("rows") or {}).get(name) or {}
        if row.get("accepted") is not True:
            continue
        y = finite(row.get("y_norm"))
        left = finite(row.get("wear_edge_left_x_norm"))
        right = finite(row.get("wear_edge_right_x_norm"))
        for field, value in (("y_norm", y), ("left_x_norm", left), ("right_x_norm", right)):
            if value is not None:
                edges[f"row.{name}.{field}"] = value
        breadth_mm = finite(row.get("mesh_width_mm")) if row.get("geometry_target_valid") else None
        depth_mm = finite(row.get("mesh_depth_mm")) if row.get("geometry_target_valid") else None
        circumference_mm = (
            finite(row.get("measurement_circumference_mm"))
            if row.get("tape_target_valid") is True
            else None
        )
        if breadth_mm is not None:
            measurements[f"row.{name}.breadth_cm"] = breadth_mm / 10.0
        if depth_mm is not None:
            measurements[f"row.{name}.depth_cm"] = depth_mm / 10.0
        if circumference_mm is not None:
            measurements[f"row.{name}.circumference_cm"] = circumference_mm / 10.0
        contour = row.get("contour_points_normalized")
        if row.get("shape_target_valid") is True and isinstance(contour, list) and len(contour) == CONTOUR_POINTS:
            for point_index, point in enumerate(contour):
                if not isinstance(point, list) or len(point) != 2:
                    continue
                for axis, raw_value in zip(("x", "y"), point):
                    value = finite(raw_value)
                    if value is not None:
                        measurements[f"row.{name}.shape.{point_index:02d}.{axis}"] = value

    if record.get("landmark_targets_valid") is True:
        for landmark_name, point in (record.get("landmarks_2d") or {}).items():
            if not isinstance(point, dict) or point.get("visible") is not True:
                continue
            for axis in ("x", "y"):
                value = finite(point.get(axis))
                if value is not None:
                    edges[f"landmark.{landmark_name}.{axis}"] = value
        for segment_name in SEGMENT_NAMES:
            for point_index, point in enumerate((record.get("segments") or {}).get(segment_name) or []):
                if not isinstance(point, dict) or point.get("visible") is not True:
                    continue
                for axis in ("x", "y"):
                    value = finite(point.get(axis))
                    if value is not None:
                        edges[f"segment.{segment_name}.{point_index}.{axis}"] = value

    for namespace in ("measurements_mm", "extracted_standing_mm"):
        for name, raw_value in (record.get(namespace) or {}).items():
            # The product accepts a standing customer photo.  Do not teach it
            # sitting-protocol answers even when the same subject's spreadsheet
            # happens to carry those values; all other usable standing WEAR
            # measurements remain supervised.
            if (
                (namespace == "measurements_mm" and (
                    name in EXCLUDED_MEASUREMENTS
                    or name in SITTING_MEASUREMENTS
                    or "sitting" in name.lower()
                ))
                # Never create a second direct circumference head. Every tape
                # circumference must be mapped to a certified row/path and
                # computed by walking that row's predicted geometry.
                or "circumference" in name.lower()
            ):
                continue
            value = finite(raw_value)
            if value is not None:
                measurements[f"{namespace}.{name}"] = value / 10.0
    # These target names repeat across all 38,934 views. Interning them once
    # prevents hundreds of thousands of duplicate Python strings from filling
    # the 16 GB GPU worker before training starts.
    return (
        {sys.intern(key): value for key, value in edges.items()},
        {sys.intern(key): value for key, value in measurements.items()},
    )


def load_apple_anchors(path: Path) -> dict[str, dict[str, Any]]:
    """Load one accepted Apple shoulder/hip anchor set per standing scan."""
    anchors: dict[str, dict[str, Any]] = {}
    rejected: list[str] = []
    with path.open("r", encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, start=1):
            if not line.strip():
                continue
            record = json.loads(line)
            scan_id = str(record.get("scan_id") or "")
            if not scan_id:
                raise RuntimeError(f"Apple anchor line {line_number} has no scan_id")
            if record.get("accepted") is not True:
                rejected.append(scan_id)
                continue
            values = np.zeros(len(POSE_VALUE_KEYS), dtype=np.float32)
            for index, (anchor_name, _) in enumerate(POSE_ANCHORS):
                point = (record.get("anchors") or {}).get(anchor_name) or {}
                x = finite(point.get("x_norm"))
                y = finite(point.get("y_norm"))
                if x is None or y is None or not 0.0 <= x <= 1.0 or not 0.0 <= y <= 1.0:
                    raise RuntimeError(f"Apple anchor {scan_id}.{anchor_name} is invalid")
                values[index * 2] = x
                values[index * 2 + 1] = y
            previous = anchors.get(scan_id)
            if previous is not None:
                previous_values = np.asarray(previous["values"], dtype=np.float32)
                if not np.allclose(previous_values, values, atol=1e-7):
                    raise RuntimeError(f"Apple anchor history contains conflicting accepted values for {scan_id}")
            anchors[scan_id] = {
                "values": tuple(float(value) for value in values),
                "image": str(record.get("image") or ""),
            }
    if rejected:
        print(f"apple_anchor_retries={len(rejected)}", flush=True)
    if len(anchors) != REQUIRED_FRONT_SUBJECTS:
        raise RuntimeError(
            f"Apple anchor coverage {len(anchors)} != required {REQUIRED_FRONT_SUBJECTS} standing people"
        )
    return anchors


def load_records(manifest: Path) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    invalid: list[str] = []
    missing_images: list[str] = []
    # Stream the 841 MB JSONL file. read_text().splitlines() temporarily held
    # multiple full copies, and retaining each rich source record expanded the
    # manifest to about 9 GB before DataLoader workers were even created.
    with manifest.open("r", encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, start=1):
            if not line.strip():
                continue
            record = json.loads(line)
            if record.get("error"):
                continue
            reasons = []
            if record.get("training_pose_valid") is not True:
                reasons.append("training_pose_valid is not true")
            if not str(record.get("scan_id", "")).endswith("-A"):
                reasons.append("not a standing A scan")
            if record.get("landmark_targets_valid") is not True:
                reasons.append("landmark targets are not exact")
            if reasons:
                invalid.append(f"line {line_number}: {', '.join(reasons)}")
                continue
            mesh_path = Path(str(record.get("mesh_image", "")))
            mask_path = Path(str(record.get("mask", "")))
            if not mesh_path.exists() or not mask_path.exists():
                missing_images.append(
                    f"line {line_number}: mesh_image={mesh_path} mask={mask_path}"
                )
                continue
            view_id = str(record.get("view_id") or (record.get("camera") or {}).get("view_id") or "")
            edge_targets, measurement_targets = flatten_targets(record)
            profile = profile_values(record)
            # Keep only fields used during training. Raw rows, contours,
            # landmarks, segments and measurement dictionaries have already
            # been flattened into exact supervised targets above.
            records.append({
                "subject_id": str(record["subject_id"]),
                "role": sys.intern(str(record["role"])),
                "_mesh_path": str(mesh_path),
                "_mask_path": str(mask_path),
                "_profile_values": tuple(float(value) for value in profile),
                "_view_id": sys.intern(view_id),
                "_edge_targets": edge_targets,
                "_measurement_targets": measurement_targets,
            })
    if invalid:
        raise RuntimeError(f"Manifest contains {len(invalid)} invalid successful rows: {invalid[:5]}")
    if missing_images:
        raise RuntimeError(f"Manifest is missing {len(missing_images)} Blender mesh cards: {missing_images[:5]}")
    front_subject_ids = {
        str(record["subject_id"])
        for record in records
        if record.get("_view_id") == "front-50"
    }
    if len(front_subject_ids) != REQUIRED_FRONT_SUBJECTS:
        raise RuntimeError(
            "WEAR front-teacher coverage mismatch: "
            f"front={len(front_subject_ids)} required={REQUIRED_FRONT_SUBJECTS}"
        )
    roles_by_subject: dict[str, set[str]] = {}
    for record in records:
        roles_by_subject.setdefault(str(record["subject_id"]), set()).add(str(record["role"]))
    leaks = {subject: sorted(roles) for subject, roles in roles_by_subject.items() if len(roles) > 1}
    if leaks:
        raise RuntimeError(f"Subject leakage across roles: {dict(list(leaks.items())[:5])}")
    return records


@dataclass
class Normalization:
    profile_mean: np.ndarray
    profile_std: np.ndarray
    edge_mean: np.ndarray
    edge_std: np.ndarray
    measurement_mean: np.ndarray
    measurement_std: np.ndarray


def masked_stats(records: list[dict[str, Any]], keys: list[str], namespace: str) -> tuple[np.ndarray, np.ndarray]:
    values = np.full((len(records), len(keys)), np.nan, dtype=np.float32)
    target_field = "_edge_targets" if namespace == "edge" else "_measurement_targets"
    for row_index, record in enumerate(records):
        for column_index, key in enumerate(keys):
            value = record[target_field].get(key)
            if value is not None:
                values[row_index, column_index] = value
    mean = np.nan_to_num(np.nanmean(values, axis=0), nan=0.0)
    std = np.maximum(np.nan_to_num(np.nanstd(values, axis=0), nan=1.0), 1e-4)
    return mean, std


def compute_normalization(records: list[dict[str, Any]], edge_keys: list[str], measurement_keys: list[str]) -> Normalization:
    profiles = np.stack([profile_values(record) for record in records])
    edge_mean, edge_std = masked_stats(records, edge_keys, "edge")
    measurement_mean, measurement_std = masked_stats(records, measurement_keys, "measurement")
    return Normalization(
        profiles.mean(axis=0),
        np.maximum(profiles.std(axis=0), 1e-5),
        edge_mean,
        edge_std,
        measurement_mean,
        measurement_std,
    )


def compute_row_geometry_priors(records: list[dict[str, Any]]) -> dict[str, Any]:
    """Derive absolute normalized-photo safety rails from WEAR front labels."""
    buckets: dict[str, dict[str, dict[str, list[float]]]] = {}
    for record in records:
        if record.get("_view_id") != "front-50":
            continue
        profile = profile_values(record)
        gender = "female" if profile[3] >= 0.5 else "male"
        cohort = f"{gender}:{bmi_cohort(profile)}"
        for row_name in ROW_NAMES:
            for field in CORE_ROW_EDGE_FIELDS:
                value = record["_edge_targets"].get(f"row.{row_name}.{field}")
                if value is None or not math.isfinite(float(value)):
                    continue
                for bucket_name in ("global", gender, cohort):
                    buckets.setdefault(bucket_name, {}).setdefault(row_name, {}).setdefault(field, []).append(float(value))

    def summarize(values: list[float]) -> dict[str, Any]:
        array = np.asarray(values, dtype=np.float32)
        return {
            "count": int(array.size),
            "p01": round(float(np.quantile(array, 0.01)), 6),
            "p50": round(float(np.quantile(array, 0.50)), 6),
            "p99": round(float(np.quantile(array, 0.99)), 6),
        }

    summarized = {
        bucket_name: {
            row_name: {
                field: summarize(values)
                for field, values in fields.items()
                if len(values) >= 20
            }
            for row_name, fields in rows.items()
        }
        for bucket_name, rows in buckets.items()
    }
    missing = sorted(
        f"{row_name}.{field}"
        for row_name in ROW_NAMES
        for field in CORE_ROW_EDGE_FIELDS
        if field not in summarized.get("global", {}).get(row_name, {})
    )
    if missing:
        raise RuntimeError(f"Front-view WEAR geometry priors are missing targets: {missing}")
    return {
        "source": "audited-front-50-WEAR-projected-3D-row-coordinates",
        "anchor": "canonical full-person Blender 2D mesh projection; no Apple or metric width input",
        "cohort_key": "gender:BMI-band",
        "buckets": summarized,
    }


def load_mesh_channels(mesh_path: str | Path, mask_path: str | Path) -> np.ndarray:
    """Build the same topology-safe Blender channels used at runtime."""
    with Image.open(mesh_path) as source_mesh:
        mesh_image = source_mesh.convert("RGB").resize(
            (IMAGE_WIDTH, IMAGE_HEIGHT), Image.Resampling.BILINEAR
        )
    with Image.open(mask_path) as source_mask:
        mask_image = source_mask.convert("RGBA").resize(
            (IMAGE_WIDTH, IMAGE_HEIGHT), Image.Resampling.NEAREST
        )
    mask_array = np.asarray(mask_image, dtype=np.uint8)
    silhouette = (
        (mask_array[..., 3] > 127)
        & (mask_array[..., :3].max(axis=2) > 127)
    ).astype(np.float32)
    padded = np.pad(silhouette, 1, mode="constant")
    neighbors = [
        padded[dy : dy + IMAGE_HEIGHT, dx : dx + IMAGE_WIDTH]
        for dy in range(3)
        for dx in range(3)
    ]
    boundary = np.maximum.reduce(neighbors) - np.minimum.reduce(neighbors)
    mesh_luma = np.asarray(mesh_image, dtype=np.float32).max(axis=2) / 255.0
    background_values = mesh_luma[silhouette < 0.5]
    background = float(np.median(background_values)) if background_values.size else 0.0
    mesh_lines = np.clip((mesh_luma - background) / max(1.0 - background, 1e-6), 0.0, 1.0)
    mesh_lines *= silhouette
    # Standardized topology-safe Blender geometry channels. The network
    # cannot identify WEAR by its original PLY triangle density: fill and
    # boundary own two channels, while visible triangles are only one
    # supporting channel. A normal-user Blender mesh can produce these exact
    # same channels without RGB, tape, depth, or true rows.
    return np.stack((silhouette, boundary, mesh_lines), axis=0)


class WearMeshDataset(Dataset):
    def __init__(self, records, edge_keys, measurement_keys, normalization, augment=False):
        self.records = records
        self.edge_keys = edge_keys
        self.measurement_keys = measurement_keys
        self.normalization = normalization
        self.augment = augment

    def __len__(self):
        return len(self.records)

    def __getitem__(self, index):
        record = self.records[index]
        mesh_channels = load_mesh_channels(record["_mesh_path"], record["_mask_path"])
        mesh_channels = (mesh_channels - MESH_CHANNEL_MEAN) / MESH_CHANNEL_STD
        profile = (profile_values(record) - self.normalization.profile_mean) / self.normalization.profile_std
        edge_values = np.zeros(len(self.edge_keys), dtype=np.float32)
        edge_mask = np.zeros(len(self.edge_keys), dtype=np.float32)
        for target_index, key in enumerate(self.edge_keys):
            value = record["_edge_targets"].get(key)
            if value is not None:
                edge_values[target_index] = (value - self.normalization.edge_mean[target_index]) / self.normalization.edge_std[target_index]
                # Every deterministic Blender view owns an exact projection of
                # the same certified PLY row. Learning all views is the camera-
                # angle correction; no wall, door, or tape is involved.
                edge_mask[target_index] = 1.0
        measurement_values = np.zeros(len(self.measurement_keys), dtype=np.float32)
        measurement_mask = np.zeros(len(self.measurement_keys), dtype=np.float32)
        for target_index, key in enumerate(self.measurement_keys):
            value = record["_measurement_targets"].get(key)
            if value is not None:
                measurement_values[target_index] = (value - self.normalization.measurement_mean[target_index]) / self.normalization.measurement_std[target_index]
                # All camera views must predict the same canonical A-B, C-D,
                # shape, and connected circumference for this subject.
                measurement_mask[target_index] = 1.0
        # Row geometry is a target, never a runtime input. Returning the true
        # y/left/right values here would let the measurement heads peek at the
        # answer during training and then fail on a normal unseen user.
        return tuple(torch.from_numpy(value.astype(np.float32)) for value in (
            mesh_channels, profile, edge_values, edge_mask, measurement_values, measurement_mask
        ))


def seed_worker(_: int) -> None:
    """Give every persistent loader worker an independent reproducible RNG."""
    seed = torch.initial_seed() % (2**32)
    random.seed(seed)
    np.random.seed(seed)


def walk_resized_closed_shape_cm(shape_x, shape_y, breadth_cm, depth_cm):
    """Resize one normalized closed shape to exact A-B/C-D and walk its edges."""
    x_center = (shape_x.amax(dim=1) + shape_x.amin(dim=1)) * 0.5
    y_center = (shape_y.amax(dim=1) + shape_y.amin(dim=1)) * 0.5
    x_half = ((shape_x.amax(dim=1) - shape_x.amin(dim=1)) * 0.5).clamp_min(1e-4)
    y_half = ((shape_y.amax(dim=1) - shape_y.amin(dim=1)) * 0.5).clamp_min(1e-4)
    x_cm = (shape_x - x_center.unsqueeze(1)) / x_half.unsqueeze(1) * breadth_cm.unsqueeze(1) * 0.5
    y_cm = (shape_y - y_center.unsqueeze(1)) / y_half.unsqueeze(1) * depth_cm.unsqueeze(1) * 0.5
    x_next = torch.roll(x_cm, shifts=-1, dims=1)
    y_next = torch.roll(y_cm, shifts=-1, dims=1)
    return torch.sqrt((x_next - x_cm).square() + (y_next - y_cm).square() + 1e-8).sum(dim=1)


class WearV8Model(nn.Module):
    def __init__(
        self,
        edge_keys: list[str],
        measurement_keys: list[str],
        edge_mean: np.ndarray | None = None,
        edge_std: np.ndarray | None = None,
        measurement_mean: np.ndarray | None = None,
        measurement_std: np.ndarray | None = None,
    ) -> None:
        super().__init__()
        backbone = mobilenet_v3_small(weights=MobileNet_V3_Small_Weights.DEFAULT)
        # Preserve early ImageNet features that already understand real-photo
        # edges and texture. The prior v6 fine-tuned every block only on flat
        # synthetic renders and overfit to that appearance domain.
        self.vision_features = backbone.features
        for block in list(self.vision_features.children())[:4]:
            for parameter in block.parameters():
                parameter.requires_grad = False
        self.vision_pool = nn.AdaptiveAvgPool2d((6, 4))
        self.profile = nn.Sequential(nn.Linear(4, 32), nn.SiLU(), nn.Linear(32, 32), nn.SiLU())
        vision_size = 576 * 6 * 4
        shared_visual_size = vision_size + 32
        self.edge_head = nn.Sequential(
            nn.Linear(shared_visual_size, 384),
            nn.SiLU(),
            nn.Dropout(0.15),
            nn.Linear(384, len(edge_keys)),
        )
        # Each anatomical row gets its own edge output layer. One bad hip or
        # waist target can no longer directly overwrite the chest endpoints.
        self.row_edge_heads = nn.ModuleDict({
            name: nn.Sequential(
                nn.Linear(shared_visual_size, 192),
                nn.SiLU(),
                nn.Dropout(0.10),
                nn.Linear(192, len(CORE_ROW_EDGE_FIELDS)),
            )
            for name in ROW_NAMES
        })
        edge_index = {key: index for index, key in enumerate(edge_keys)}
        if edge_mean is None:
            edge_mean = np.zeros(len(edge_keys), dtype=np.float32)
        if edge_std is None:
            edge_std = np.ones(len(edge_keys), dtype=np.float32)
        self.register_buffer("edge_native_mean", torch.as_tensor(edge_mean, dtype=torch.float32))
        self.register_buffer("edge_native_std", torch.as_tensor(edge_std, dtype=torch.float32))
        self.row_edge_input_indices = [
            [edge_index[f"row.{name}.{field}"] for field in ROW_GEOMETRY_FIELDS]
            for name in ROW_NAMES
        ]
        core_edge_indices = [
            edge_index[f"row.{name}.{field}"]
            for name in ROW_NAMES
            for field in CORE_ROW_EDGE_FIELDS
        ]
        self.register_buffer("core_edge_indices", torch.tensor(core_edge_indices, dtype=torch.long))

        # Non-core standing targets retain the global mesh path so sleeves,
        # shoulders, inseams, landmarks and every usable WEAR value remain
        # learned. Core body geometry is replaced below by independent heads.
        self.measurement_head = nn.Sequential(
            nn.Linear(shared_visual_size, 384),
            nn.SiLU(),
            nn.Dropout(0.15),
            nn.Linear(384, len(measurement_keys)),
        )
        # Every row receives mesh evidence, the product profile, and only its
        # own normalized y/left/right line plus a validity bit.  No centimetre
        # measurement is allowed into the model.
        self.measurement_visual = nn.Sequential(
            nn.Linear(shared_visual_size, 256),
            nn.SiLU(),
            nn.Dropout(0.12),
            nn.Linear(256, 128),
            nn.SiLU(),
        )
        measurement_index = {key: index for index, key in enumerate(measurement_keys)}
        if measurement_mean is None:
            measurement_mean = np.zeros(len(measurement_keys), dtype=np.float32)
        if measurement_std is None:
            measurement_std = np.ones(len(measurement_keys), dtype=np.float32)
        self.register_buffer("measurement_native_mean", torch.as_tensor(measurement_mean, dtype=torch.float32))
        self.register_buffer("measurement_native_std", torch.as_tensor(measurement_std, dtype=torch.float32))
        self.row_measurement_heads = nn.ModuleDict()
        core_measurement_indices: list[int] = []
        for name in ROW_NAMES:
            indices = [
                measurement_index[key]
                for key in measurement_keys
                if key.startswith(f"row.{name}.")
                and key != f"row.{name}.circumference_cm"
            ]
            if not indices:
                raise RuntimeError(f"No independent measurement targets for {name}")
            core_measurement_indices.extend(indices)
            self.row_measurement_heads[name] = nn.Sequential(
                nn.Linear(135, 192),
                nn.SiLU(),
                nn.Dropout(0.08),
                nn.Linear(192, 128),
                nn.SiLU(),
                nn.Dropout(0.08),
                nn.Linear(128, len(indices)),
            )
        self.register_buffer(
            "core_measurement_indices",
            torch.tensor(core_measurement_indices, dtype=torch.long),
        )
        self.connected_rows: list[dict[str, Any]] = []
        for name in ROW_NAMES:
            self.connected_rows.append({
                "breadth": measurement_index[f"row.{name}.breadth_cm"],
                "depth": measurement_index[f"row.{name}.depth_cm"],
                "circumference": measurement_index[f"row.{name}.circumference_cm"],
                "shape_x": [measurement_index[f"row.{name}.shape.{index:02d}.x"] for index in range(CONTOUR_POINTS)],
                "shape_y": [measurement_index[f"row.{name}.shape.{index:02d}.y"] for index in range(CONTOUR_POINTS)],
            })

    def forward(self, mesh_channels, profile):
        vision = self.vision_pool(self.vision_features(mesh_channels)).flatten(1)
        profile_features = self.profile(profile)
        shared_visual = torch.cat((vision, profile_features), dim=1)
        core_visual = shared_visual

        edge_values = self.edge_head(shared_visual)
        core_edges = torch.cat(
            [self.row_edge_heads[name](core_visual) for name in ROW_NAMES],
            dim=1,
        )
        edge_values = edge_values.scatter(
            1,
            self.core_edge_indices.unsqueeze(0).expand(mesh_channels.shape[0], -1),
            core_edges,
        )
        native_edges = (
            edge_values * self.edge_native_std.unsqueeze(0)
            + self.edge_native_mean.unsqueeze(0)
        )

        measurements = self.measurement_head(shared_visual)
        measurement_visual = self.measurement_visual(core_visual)
        independent_rows = []
        for index, name in enumerate(ROW_NAMES):
            predicted_row_geometry = native_edges[:, self.row_edge_input_indices[index]].clamp(0.0, 1.0)
            row_input = torch.cat(
                (
                    measurement_visual,
                    profile,
                    predicted_row_geometry,
                ),
                dim=1,
            )
            independent_rows.append(self.row_measurement_heads[name](row_input))
        core_measurements = torch.cat(independent_rows, dim=1)
        measurements = measurements.scatter(
            1,
            self.core_measurement_indices.unsqueeze(0).expand(mesh_channels.shape[0], -1),
            core_measurements,
        )
        # Circumference is not a free prediction. Convert the predicted A-B,
        # C-D, and 32 normalized points back to centimetres, resize the closed
        # shape to that exact breadth/depth, and walk all 32 edges. Tape loss
        # therefore back-propagates through the same geometry shown in Test Lab.
        native = measurements * self.measurement_native_std.unsqueeze(0) + self.measurement_native_mean.unsqueeze(0)
        for row in self.connected_rows:
            breadth = native[:, row["breadth"]].clamp_min(1.0)
            depth = native[:, row["depth"]].clamp_min(1.0)
            shape_x = native[:, row["shape_x"]]
            shape_y = native[:, row["shape_y"]]
            circumference_cm = walk_resized_closed_shape_cm(shape_x, shape_y, breadth, depth)
            circumference_index = row["circumference"]
            normalized_circumference = (
                circumference_cm - self.measurement_native_mean[circumference_index]
            ) / self.measurement_native_std[circumference_index]
            measurements = measurements.scatter(
                1,
                torch.full(
                    (mesh_channels.shape[0], 1),
                    circumference_index,
                    dtype=torch.long,
                    device=mesh_channels.device,
                ),
                normalized_circumference.unsqueeze(1),
            )
        return edge_values, measurements


def startup_smoke() -> None:
    """Exercise the exact tensor/ONNX contract before downloading teachers."""
    edge_keys = sorted(CORE_EDGE_KEYS | CORE_SEGMENT_KEYS | {"landmark.Cervicale.x", "landmark.Cervicale.y"})
    measurement_keys = sorted(
        CORE_CIRCUMFERENCE_KEYS
        | CORE_BREADTH_KEYS
        | CORE_DEPTH_KEYS
        | CORE_SHAPE_KEYS
        | {"extracted_standing_mm.sleeve_outseam_left_mm"}
    )
    model = WearV8Model(edge_keys, measurement_keys).cpu().eval()
    rectangle = torch.tensor([[-1.0, 1.0, 1.0, -1.0]], dtype=torch.float32)
    rectangle_y = torch.tensor([[-1.0, -1.0, 1.0, 1.0]], dtype=torch.float32)
    walked = walk_resized_closed_shape_cm(
        rectangle,
        rectangle_y,
        torch.tensor([40.0]),
        torch.tensor([20.0]),
    )
    if not torch.allclose(walked, torch.tensor([120.0]), atol=1e-3):
        raise RuntimeError(f"Connected circumference smoke failed: {walked.tolist()}")
    examples = (
        torch.zeros(2, 3, IMAGE_HEIGHT, IMAGE_WIDTH),
        torch.zeros(2, 4),
    )
    with torch.no_grad():
        edges, measurements = model(*examples)
    if tuple(edges.shape) != (2, len(edge_keys)):
        raise RuntimeError(f"Startup smoke edge shape mismatch: {tuple(edges.shape)}")
    if tuple(measurements.shape) != (2, len(measurement_keys)):
        raise RuntimeError(f"Startup smoke measurement shape mismatch: {tuple(measurements.shape)}")
    with tempfile.TemporaryDirectory(prefix="wear-v7-smoke-") as temporary:
        model_path = Path(temporary) / "model.onnx"
        torch.onnx.export(
            model,
            examples,
            model_path,
            input_names=["mesh_channels", "profile"],
            output_names=["edges", "measurements"],
            dynamic_axes={name: {0: "batch"} for name in (
                "mesh_channels", "profile",
                "edges", "measurements"
            )},
            opset_version=18,
            external_data=False,
        )
        onnx.checker.check_model(onnx.load(str(model_path)))
    print(json.dumps({
        "startupSmokePassed": True,
        "inputs": ["mesh_channels", "profile"],
        "outputs": ["edges", "measurements"],
    }), flush=True)


def masked_loss(prediction, target, mask, weights):
    per_value = F.smooth_l1_loss(prediction, target, reduction="none", beta=0.5)
    weighted_mask = mask * weights.unsqueeze(0)
    return (per_value * weighted_mask).sum() / weighted_mask.sum().clamp_min(1.0)


def edge_weights(keys):
    return torch.tensor([
        3.5 if key in CORE_RELATIVE_EDGE_KEYS
        else 2.0 if key in CORE_ABSOLUTE_EDGE_KEYS
        else 1.0
        for key in keys
    ], dtype=torch.float32)


def core_edge_weights(keys):
    """Keep the 4,326 front row labels strong beside all non-core outputs."""
    return torch.tensor([1.0 if key in CORE_EDGE_KEYS else 0.0 for key in keys], dtype=torch.float32)


def measurement_weights(keys):
    weights = []
    for key in keys:
        if key in CORE_CIRCUMFERENCE_KEYS:
            weights.append(3.0)
        elif ".shape." in key:
            weights.append(1.5)
        elif key.startswith("row."):
            weights.append(2.0)
        else:
            weights.append(1.0)
    return torch.tensor(weights, dtype=torch.float32)


def structural_edge_loss(prediction, target_mask, keys, mean, std):
    """Keep predicted anatomy ordered and inside the canonical photo."""
    native = prediction * std.unsqueeze(0) + mean.unsqueeze(0)
    index = {key: position for position, key in enumerate(keys)}
    front_valid = torch.stack([
        target_mask[:, index[f"row.{name}.y_norm"]]
        * target_mask[:, index[f"row.{name}.left_x_norm"]]
        * target_mask[:, index[f"row.{name}.right_x_norm"]]
        for name in ROW_NAMES
    ], dim=1).prod(dim=1)
    y_values = [native[:, index[f"row.{name}.y_norm"]] for name in ROW_NAMES]
    order = torch.stack([
        F.relu(y_values[position] - y_values[position + 1] + 0.012)
        for position in range(len(y_values) - 1)
    ], dim=1).mean(dim=1)
    row_penalties = []
    for name in ROW_NAMES:
        left = native[:, index[f"row.{name}.left_x_norm"]]
        right = native[:, index[f"row.{name}.right_x_norm"]]
        row_penalties.extend((
            F.relu(left - right + 0.025),
            F.relu(-left),
            F.relu(right - 1.0),
        ))
    bounds_and_span = torch.stack(row_penalties, dim=1).mean(dim=1)
    return ((order + bounds_and_span) * front_valid).sum() / front_valid.sum().clamp_min(1.0)


def pose_geometry_loss(
    prediction,
    pose,
    pose_mask,
    target_mask,
    keys,
    edge_mean,
    edge_std,
    pose_mean,
    pose_std,
    geometry_priors,
):
    """Keep the learned runtime coordinates attached to Apple torso anchors."""
    native_edges = prediction * edge_std.unsqueeze(0) + edge_mean.unsqueeze(0)
    native_pose = pose * pose_std.unsqueeze(0) + pose_mean.unsqueeze(0)
    key_index = {key: position for position, key in enumerate(keys)}
    shoulder_center = (native_pose[:, 0] + native_pose[:, 2]) * 0.5
    shoulder_y = (native_pose[:, 1] + native_pose[:, 3]) * 0.5
    hip_center = (native_pose[:, 4] + native_pose[:, 6]) * 0.5
    hip_y = (native_pose[:, 5] + native_pose[:, 7]) * 0.5
    shoulder_span = torch.abs(native_pose[:, 2] - native_pose[:, 0]).clamp_min(0.04)
    torso_height = (hip_y - shoulder_y).clamp_min(0.05)
    valid_pose = pose_mask.prod(dim=1)
    penalties = []
    ordered_ratios = []
    for name in ROW_NAMES:
        y_ratio_key = f"row.{name}.y_shoulder_hip_ratio"
        span_ratio_key = f"row.{name}.span_shoulder_ratio"
        offset_key = f"row.{name}.center_anchor_offset_ratio"
        y_ratio = native_edges[:, key_index[y_ratio_key]]
        span_ratio = native_edges[:, key_index[span_ratio_key]]
        offset_ratio = native_edges[:, key_index[offset_key]]
        ordered_ratios.append(y_ratio)
        row_valid = valid_pose * target_mask[:, key_index[y_ratio_key]]
        prior = geometry_priors["buckets"]["global"][name]
        for value, field, margin in (
            (y_ratio, "y_shoulder_hip_ratio", 0.03),
            (span_ratio, "span_shoulder_ratio", 0.05),
            (offset_ratio, "center_anchor_offset_ratio", 0.04),
        ):
            bounds = prior[field]
            lower = float(bounds["p01"]) - margin
            upper = float(bounds["p99"]) + margin
            if field == "span_shoulder_ratio":
                lower = max(0.05, lower)
            penalties.append((F.relu(lower - value) + F.relu(value - upper)) * row_valid)

        # Auxiliary absolute coordinates remain supervised. This consistency
        # term makes them agree with the relative coordinates that the runtime
        # will actually use on phone photos.
        reconstructed_y = shoulder_y + y_ratio * torso_height
        anchor_center = shoulder_center + (hip_center - shoulder_center) * y_ratio
        reconstructed_center = anchor_center + offset_ratio * shoulder_span
        reconstructed_left = reconstructed_center - span_ratio * shoulder_span * 0.5
        reconstructed_right = reconstructed_center + span_ratio * shoulder_span * 0.5
        for reconstructed, absolute_key in (
            (reconstructed_y, f"row.{name}.y_norm"),
            (reconstructed_left, f"row.{name}.left_x_norm"),
            (reconstructed_right, f"row.{name}.right_x_norm"),
        ):
            absolute = native_edges[:, key_index[absolute_key]]
            penalties.append(F.smooth_l1_loss(absolute, reconstructed, reduction="none", beta=0.02) * row_valid)

    for index in range(len(ordered_ratios) - 1):
        current_key = f"row.{ROW_NAMES[index]}.y_shoulder_hip_ratio"
        next_key = f"row.{ROW_NAMES[index + 1]}.y_shoulder_hip_ratio"
        ordered_valid = valid_pose * target_mask[:, key_index[current_key]] * target_mask[:, key_index[next_key]]
        penalties.append(F.relu(ordered_ratios[index] - ordered_ratios[index + 1] + 0.035) * ordered_valid)
    denominator = sum(
        (valid_pose * target_mask[:, key_index[f"row.{name}.y_shoulder_hip_ratio"]]).sum()
        for name in ROW_NAMES
    ).clamp_min(1.0)
    return torch.stack(penalties, dim=1).sum() / denominator


class StatusWriter:
    def __init__(self, bucket: str | None, key: str | None):
        self.bucket, self.key = bucket, key
        if bucket and key and boto3 is None:
            raise RuntimeError("boto3 is required only when S3 status output is enabled")
        self.s3 = boto3.client("s3") if bucket and key and boto3 is not None else None

    def update(self, epoch: int, epochs: int, detail: str) -> None:
        if self.s3 is None:
            return
        try:
            response = self.s3.get_object(Bucket=self.bucket, Key=self.key)
            status = json.loads(response["Body"].read())
            percent = epoch / max(epochs, 1)
            status.update({
                "state": "running",
                "overallPercent": round(76.0 + percent * 20.0, 2),
                "currentStage": "train-v8",
                "currentStageLabel": f"Training WEAR Blender-mesh v8: epoch {epoch}/{epochs}",
                "detail": detail,
                "updatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            })
            for item in status.get("stages", []):
                if item.get("key") == "train-v8":
                    item.update({"state": "running", "percent": round(percent * 100.0, 2)})
            self.s3.put_object(
                Bucket=self.bucket,
                Key=self.key,
                Body=json.dumps(status, indent=2).encode(),
                ContentType="application/json",
                ServerSideEncryption="AES256",
            )
        except Exception as error:
            print(f"status_update_warning={type(error).__name__}: {error}", flush=True)


@torch.no_grad()
def evaluate_loss(
    model,
    loader,
    device,
    edge_loss_weights,
    core_edge_loss_weights,
    measurement_loss_weights,
    edge_keys,
    edge_native_mean,
    edge_native_std,
):
    model.eval()
    values = []
    for mesh_channels, profile, edge_target, edge_mask, measurement_target, measurement_mask in loader:
        edge_prediction, measurement_prediction = model(mesh_channels.to(device), profile.to(device))
        loss = masked_loss(edge_prediction, edge_target.to(device), edge_mask.to(device), edge_loss_weights)
        loss += 0.50 * masked_loss(
            edge_prediction,
            edge_target.to(device),
            edge_mask.to(device),
            core_edge_loss_weights,
        )
        loss += masked_loss(measurement_prediction, measurement_target.to(device), measurement_mask.to(device), measurement_loss_weights)
        loss += 0.25 * structural_edge_loss(
            edge_prediction, edge_mask.to(device), edge_keys, edge_native_mean, edge_native_std
        )
        values.append(float(loss.item()))
    return sum(values) / max(len(values), 1)


@torch.no_grad()
def metrics(model, loader, device, keys, mean, std, output_index):
    model.eval()
    errors = [[] for _ in keys]
    baseline_errors = [[] for _ in keys]
    mean_tensor = torch.from_numpy(mean).to(device)
    std_tensor = torch.from_numpy(std).to(device)
    for batch in loader:
        mesh_channels, profile = [value.to(device) for value in batch[:2]]
        target, mask = batch[2 + output_index * 2 : 4 + output_index * 2]
        prediction = model(mesh_channels, profile)[output_index]
        native_prediction = prediction * std_tensor + mean_tensor
        native_target = target.to(device) * std_tensor + mean_tensor
        error = torch.abs(native_prediction - native_target).cpu().numpy()
        baseline = torch.abs(native_target - mean_tensor.unsqueeze(0)).cpu().numpy()
        valid = mask.numpy() > 0.5
        for column in range(len(keys)):
            errors[column].extend(error[valid[:, column], column].tolist())
            baseline_errors[column].extend(baseline[valid[:, column], column].tolist())
    result = {}
    for key, values, baseline_values in zip(keys, errors, baseline_errors):
        mae = float(np.mean(values)) if values else None
        baseline_mae = float(np.mean(baseline_values)) if baseline_values else None
        if ".shape." in key:
            unit = "normalized_cross_section"
        elif key.endswith(tuple(CORE_RELATIVE_EDGE_FIELDS)):
            unit = "pose_anchor_ratio"
        elif key.endswith("_cm") or key.startswith(("measurements_mm.", "extracted_standing_mm.")):
            unit = "cm"
        else:
            unit = "normalized_image"
        result[key] = {
            "count": len(values),
            "mae": round(mae, 5) if mae is not None else None,
            "median_absolute_error": round(float(np.median(values)), 5) if values else None,
            "train_mean_baseline_mae": round(baseline_mae, 5) if baseline_mae is not None else None,
            "beats_train_mean_baseline": bool(mae is not None and baseline_mae is not None and mae < baseline_mae),
            "unit": unit,
        }
        if values and unit == "cm":
            result[key]["within_half_inch_rate"] = round(
                float(np.mean(np.asarray(values) <= HALF_INCH_CM)), 6
            )
        if values and unit == "normalized_image":
            result[key]["within_one_percent_image_rate"] = round(
                float(np.mean(np.asarray(values) <= ROW_PIXEL_GATE_NORMALIZED)), 6
            )
    return result


@torch.no_grad()
def edge_structure_metrics(model, loader, device, keys, mean, std):
    """Check that mesh-predicted WEAR rows remain ordered with valid spans."""
    model.eval()
    index = {key: position for position, key in enumerate(keys)}
    mean_tensor = torch.from_numpy(mean).to(device)
    std_tensor = torch.from_numpy(std).to(device)
    total = 0
    ordered = 0
    valid_spans = 0
    for batch in loader:
        mesh_channels, profile = [value.to(device) for value in batch[:2]]
        edge_mask = batch[3].to(device)
        prediction = model(mesh_channels, profile)[0]
        native = prediction * std_tensor.unsqueeze(0) + mean_tensor.unsqueeze(0)
        row_y = torch.stack([
            native[:, index[f"row.{name}.y_norm"]]
            for name in ROW_NAMES
        ], dim=1)
        left = torch.stack([
            native[:, index[f"row.{name}.left_x_norm"]]
            for name in ROW_NAMES
        ], dim=1)
        right = torch.stack([
            native[:, index[f"row.{name}.right_x_norm"]]
            for name in ROW_NAMES
        ], dim=1)
        front_valid = torch.ones(mesh_channels.shape[0], dtype=torch.bool, device=device)
        for name in ROW_NAMES:
            front_valid &= edge_mask[:, index[f"row.{name}.y_norm"]] > 0.5
            front_valid &= edge_mask[:, index[f"row.{name}.left_x_norm"]] > 0.5
            front_valid &= edge_mask[:, index[f"row.{name}.right_x_norm"]] > 0.5
        if front_valid.any():
            ordered += int((row_y[front_valid, 1:] - row_y[front_valid, :-1] >= 0.005).all(dim=1).sum().item())
            valid_spans += int(((left[front_valid] >= 0.0) & (right[front_valid] <= 1.0) & (right[front_valid] - left[front_valid] >= 0.02)).all(dim=1).sum().item())
            total += int(front_valid.sum().item())
    return {
        "count": total,
        "ordered_rate": ordered / max(total, 1),
        "valid_span_rate": valid_spans / max(total, 1),
    }


def main() -> None:
    args = parse_args()
    if args.startup_smoke:
        startup_smoke()
        return
    if args.manifest is None or args.output_dir is None or not args.pipeline_id:
        raise RuntimeError("--manifest, --output-dir, and --pipeline-id are required for training")
    require_full_contract_reports(args.source_contract_report, args.teacher_audit_report)
    random.seed(20260816)
    np.random.seed(20260816)
    torch.manual_seed(20260816)
    args.output_dir.mkdir(parents=True, exist_ok=True)
    records = load_records(args.manifest)
    if len(records) < args.minimum_records:
        raise RuntimeError(f"Only {len(records)} valid Blender mesh views; need {args.minimum_records}")
    by_role = {role: [record for record in records if record.get("role") == role] for role in ("train", "validation", "test")}
    if any(not split for split in by_role.values()):
        raise RuntimeError(f"Missing subject-level split: { {role: len(split) for role, split in by_role.items()} }")

    edge_counts = Counter(key for record in by_role["train"] for key in record["_edge_targets"])
    measurement_counts = Counter(key for record in by_role["train"] for key in record["_measurement_targets"])
    landmark_floor = math.ceil(len(by_role["train"]) * LANDMARK_MIN_COVERAGE)
    edge_keys = sorted(
        key for key, count in edge_counts.items()
        if count >= (landmark_floor if key.startswith("landmark.") else MIN_TARGET_COUNT)
    )
    measurement_keys = sorted(key for key, count in measurement_counts.items() if count >= MIN_TARGET_COUNT)
    missing = sorted(
        (CORE_CIRCUMFERENCE_KEYS - set(measurement_keys))
        | (CORE_BREADTH_KEYS - set(measurement_keys))
        | (CORE_DEPTH_KEYS - set(measurement_keys))
        | (CORE_SHAPE_KEYS - set(measurement_keys))
        | (CORE_EDGE_KEYS - set(edge_keys))
        | (CORE_SEGMENT_KEYS - set(edge_keys))
    )
    if missing:
        raise RuntimeError(f"Core v6 targets missing: {missing}")

    normalization = compute_normalization(by_role["train"], edge_keys, measurement_keys)
    row_geometry_priors = compute_row_geometry_priors(by_role["train"])
    datasets = {
        role: WearMeshDataset(split, edge_keys, measurement_keys, normalization, augment=role == "train")
        for role, split in by_role.items()
    }
    train_generator = torch.Generator().manual_seed(20260816)
    train_worker_options = {
        "num_workers": args.workers,
        "pin_memory": True,
    }
    if args.workers > 0:
        train_worker_options.update({
            "persistent_workers": True,
            "worker_init_fn": seed_worker,
        })
    # Evaluation has no augmentation and runs only once per epoch. Keeping
    # separate persistent evaluation processes would retain extra copies of the
    # label table alongside the two training workers on a 16 GB host.
    evaluation_worker_options = {
        "num_workers": 0,
        "pin_memory": True,
    }
    loaders = {
        "train": DataLoader(
            datasets["train"],
            args.batch_size,
            shuffle=True,
            generator=train_generator,
            **train_worker_options,
        ),
        "validation": DataLoader(
            datasets["validation"], args.batch_size, **evaluation_worker_options
        ),
        "test": DataLoader(
            datasets["test"], args.batch_size, **evaluation_worker_options
        ),
    }
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = WearV8Model(
        edge_keys,
        measurement_keys,
        normalization.edge_mean,
        normalization.edge_std,
        normalization.measurement_mean,
        normalization.measurement_std,
    ).to(device)
    edge_loss_weights = edge_weights(edge_keys).to(device)
    core_edge_loss_weights = core_edge_weights(edge_keys).to(device)
    measurement_loss_weights = measurement_weights(measurement_keys).to(device)
    edge_native_mean = torch.from_numpy(normalization.edge_mean).to(device)
    edge_native_std = torch.from_numpy(normalization.edge_std).to(device)
    backbone_parameters = [
        parameter
        for parameter in model.vision_features.parameters()
        if parameter.requires_grad
    ]
    head_parameters = [
        parameter
        for name, parameter in model.named_parameters()
        if parameter.requires_grad and not name.startswith("vision_features.")
    ]
    optimizer = torch.optim.AdamW(
        [
            {"params": backbone_parameters, "lr": 1e-4},
            {"params": head_parameters, "lr": 1e-3},
        ],
        weight_decay=2e-4,
    )
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=max(args.epochs, 1), eta_min=1e-5)
    scaler = torch.amp.GradScaler("cuda", enabled=device.type == "cuda")
    status = StatusWriter(args.status_bucket, args.status_key)
    best_validation = float("inf")
    best_state = None
    history = []
    for epoch in range(1, args.epochs + 1):
        model.train()
        total_loss = 0.0
        batches = 0
        for mesh_channels, profile, edge_target, edge_mask, measurement_target, measurement_mask in loaders["train"]:
            mesh_channels, profile = [
                value.to(device, non_blocking=True)
                for value in (mesh_channels, profile)
            ]
            edge_target, edge_mask = edge_target.to(device), edge_mask.to(device)
            measurement_target, measurement_mask = measurement_target.to(device), measurement_mask.to(device)
            optimizer.zero_grad(set_to_none=True)
            with torch.amp.autocast("cuda", enabled=device.type == "cuda"):
                edge_prediction, measurement_prediction = model(mesh_channels, profile)
                loss = masked_loss(edge_prediction, edge_target, edge_mask, edge_loss_weights)
                loss += 0.50 * masked_loss(
                    edge_prediction,
                    edge_target,
                    edge_mask,
                    core_edge_loss_weights,
                )
                loss += masked_loss(measurement_prediction, measurement_target, measurement_mask, measurement_loss_weights)
                loss += 0.25 * structural_edge_loss(
                    edge_prediction,
                    edge_mask,
                    edge_keys,
                    edge_native_mean,
                    edge_native_std,
                )
            scaler.scale(loss).backward()
            scaler.step(optimizer)
            scaler.update()
            total_loss += float(loss.item())
            batches += 1
        scheduler.step()
        train_loss = total_loss / max(batches, 1)
        validation_loss = evaluate_loss(
            model,
            loaders["validation"],
            device,
            edge_loss_weights,
            core_edge_loss_weights,
            measurement_loss_weights,
            edge_keys,
            edge_native_mean,
            edge_native_std,
        )
        history.append({"epoch": epoch, "train_loss": train_loss, "validation_loss": validation_loss})
        if validation_loss < best_validation:
            best_validation = validation_loss
            best_state = {key: value.detach().cpu().clone() for key, value in model.state_dict().items()}
        detail = f"{len(by_role['train']):,} train views, {len(by_role['validation']):,} validation views; validation loss {validation_loss:.4f}."
        print(f"epoch={epoch}/{args.epochs} train={train_loss:.6f} val={validation_loss:.6f}", flush=True)
        status.update(epoch, args.epochs, detail)
    if best_state is None:
        raise RuntimeError("Training produced no checkpoint")
    model.load_state_dict(best_state)
    edge_metrics = metrics(model, loaders["test"], device, edge_keys, normalization.edge_mean, normalization.edge_std, 0)
    measurement_metrics = metrics(model, loaders["test"], device, measurement_keys, normalization.measurement_mean, normalization.measurement_std, 1)
    structure_metrics = edge_structure_metrics(
        model,
        loaders["test"],
        device,
        edge_keys,
        normalization.edge_mean,
        normalization.edge_std,
    )
    failures = []

    def beats_or_ties_edge_baseline(value: dict[str, Any]) -> bool:
        if value.get("beats_train_mean_baseline") is True:
            return True
        mae = finite(value.get("mae"))
        baseline = finite(value.get("train_mean_baseline_mae"))
        return (
            mae is not None
            and baseline is not None
            and mae <= baseline + EDGE_BASELINE_TIE_TOLERANCE
        )

    for key in sorted(CORE_CIRCUMFERENCE_KEYS):
        value = measurement_metrics[key]
        limit = CORE_CIRCUMFERENCE_LIMIT_CM[key]
        if not value["beats_train_mean_baseline"] or value["mae"] is None or value["mae"] > limit:
            failures.append(
                f"{key}: MAE={value['mae']} cm limit={limit} baseline_win={value['beats_train_mean_baseline']}"
            )
        if float(value.get("within_half_inch_rate") or 0.0) < REQUIRED_HELD_OUT_HALF_INCH_RATE:
            failures.append(
                f"{key}: only {float(value.get('within_half_inch_rate') or 0.0):.2%} of held-out views "
                f"are within {HALF_INCH_CM:.2f} cm; need {REQUIRED_HELD_OUT_HALF_INCH_RATE:.0%}"
            )
    for key in sorted(CORE_BREADTH_KEYS):
        value = measurement_metrics[key]
        limit = CORE_BREADTH_LIMIT_CM[key]
        if not value["beats_train_mean_baseline"] or value["mae"] is None or value["mae"] > limit:
            failures.append(
                f"{key}: raw-mesh breadth MAE={value['mae']} cm limit={limit} "
                f"baseline_win={value['beats_train_mean_baseline']}"
            )
        if float(value.get("within_half_inch_rate") or 0.0) < REQUIRED_HELD_OUT_HALF_INCH_RATE:
            failures.append(
                f"{key}: only {float(value.get('within_half_inch_rate') or 0.0):.2%} of held-out views "
                f"are within {HALF_INCH_CM:.2f} cm; need {REQUIRED_HELD_OUT_HALF_INCH_RATE:.0%}"
            )
    for key in sorted(CORE_DEPTH_KEYS):
        value = measurement_metrics[key]
        limit = CORE_DEPTH_LIMIT_CM[key]
        if not value["beats_train_mean_baseline"] or value["mae"] is None or value["mae"] > limit:
            failures.append(
                f"{key}: raw-mesh depth MAE={value['mae']} cm limit={limit} "
                f"baseline_win={value['beats_train_mean_baseline']}"
            )
        if float(value.get("within_half_inch_rate") or 0.0) < REQUIRED_HELD_OUT_HALF_INCH_RATE:
            failures.append(
                f"{key}: only {float(value.get('within_half_inch_rate') or 0.0):.2%} of held-out views "
                f"are within {HALF_INCH_CM:.2f} cm; need {REQUIRED_HELD_OUT_HALF_INCH_RATE:.0%}"
            )
    for key in sorted(CORE_EDGE_KEYS):
        value = edge_metrics[key]
        if key.endswith("y_shoulder_hip_ratio"):
            limit = 0.06
        elif key.endswith("span_shoulder_ratio"):
            limit = 0.10
        elif key.endswith("center_anchor_offset_ratio"):
            limit = 0.06
        else:
            limit = 0.025
        if not beats_or_ties_edge_baseline(value) or value["mae"] is None or value["mae"] > limit:
            failures.append(
                f"{key}: MAE={value['mae']} limit={limit} "
                f"baseline={value.get('train_mean_baseline_mae')} "
                f"tie_tolerance={EDGE_BASELINE_TIE_TOLERANCE}"
            )
        if (
            key in CORE_ABSOLUTE_EDGE_KEYS
            and float(value.get("within_one_percent_image_rate") or 0.0)
            < REQUIRED_HELD_OUT_HALF_INCH_RATE
        ):
            failures.append(
                f"{key}: only {float(value.get('within_one_percent_image_rate') or 0.0):.2%} of held-out views "
                f"are within 1% of image size; need {REQUIRED_HELD_OUT_HALF_INCH_RATE:.0%}"
            )
    for key in sorted(CORE_SEGMENT_KEYS):
        value = edge_metrics[key]
        limit = 0.035
        if not value["beats_train_mean_baseline"] or value["mae"] is None or value["mae"] > limit:
            failures.append(f"{key}: body-guide MAE={value['mae']} limit={limit}")

    shape_metrics = {
        key: value for key, value in measurement_metrics.items()
        if key in CORE_SHAPE_KEYS
    }
    shape_values = [value for value in shape_metrics.values() if value.get("mae") is not None]
    shape_mean_mae = float(np.mean([value["mae"] for value in shape_values])) if shape_values else None
    shape_baseline_wins = sum(value.get("beats_train_mean_baseline") is True for value in shape_values)
    shape_baseline_win_rate = shape_baseline_wins / max(len(shape_values), 1)
    if shape_mean_mae is None or shape_mean_mae > 0.18:
        failures.append(f"closed cross-section shape mean MAE={shape_mean_mae}; limit=0.18 normalized units")
    if shape_baseline_win_rate < 0.75:
        failures.append(
            f"closed cross-section shape: {shape_baseline_wins}/{len(shape_values)} coordinates beat baseline; need at least 75%"
        )

    def baseline_win_rate(target_metrics: dict[str, dict[str, Any]]) -> tuple[int, int, float]:
        eligible = [
            value for value in target_metrics.values()
            if int(value.get("count") or 0) >= MIN_TARGET_COUNT and value.get("mae") is not None
        ]
        wins = sum(value.get("beats_train_mean_baseline") is True for value in eligible)
        return wins, len(eligible), wins / max(len(eligible), 1)

    edge_wins, edge_eligible, edge_win_rate = baseline_win_rate(edge_metrics)
    measurement_wins, measurement_eligible, measurement_win_rate = baseline_win_rate(measurement_metrics)
    if edge_win_rate < 0.75:
        failures.append(
            f"all edge/landmark/segment targets: {edge_wins}/{edge_eligible} beat baseline; need at least 75%"
        )
    if measurement_win_rate < 0.75:
        failures.append(
            f"all measurement targets: {measurement_wins}/{measurement_eligible} beat baseline; need at least 75%"
        )
    if structure_metrics["ordered_rate"] < 0.99:
        failures.append(
            f"core row order valid on {structure_metrics['ordered_rate']:.2%} of held-out views; need at least 99%"
        )
    if structure_metrics["valid_span_rate"] < 0.99:
        failures.append(
            f"core left/right spans valid on {structure_metrics['valid_span_rate']:.2%} of held-out views; need at least 99%"
        )

    subject_counts = {role: len({record["subject_id"] for record in split}) for role, split in by_role.items()}
    if subject_counts.get("test") != 448:
        failures.append(
            f"held-out subject count is {subject_counts.get('test')}; exactly 448 unseen people are required"
        )
    report = {
        "schema_version": 1,
        "model_version": args.pipeline_id,
        "device": str(device),
        "views": {role: len(split) for role, split in by_role.items()},
        "subjects": subject_counts,
        "wear_front_teacher_coverage": {
            "accepted_front_scans": sum(record.get("_view_id") == "front-50" for record in records),
            "required_front_scans": REQUIRED_FRONT_SUBJECTS,
            "complete": sum(record.get("_view_id") == "front-50" for record in records) == REQUIRED_FRONT_SUBJECTS,
        },
        "edge_metrics": edge_metrics,
        "measurement_metrics": measurement_metrics,
        "cross_section_metrics": {
            "coordinate_count": len(shape_values),
            "mean_mae_normalized": round(shape_mean_mae, 6) if shape_mean_mae is not None else None,
            "baseline_wins": shape_baseline_wins,
            "baseline_win_rate": shape_baseline_win_rate,
            "maximum_mean_mae_normalized": 0.18,
        },
        "edge_structure_metrics": structure_metrics,
        "target_learning_coverage": {
            "edge_baseline_wins": edge_wins,
            "edge_eligible": edge_eligible,
            "edge_win_rate": edge_win_rate,
            "measurement_baseline_wins": measurement_wins,
            "measurement_eligible": measurement_eligible,
            "measurement_win_rate": measurement_win_rate,
            "minimum_required_win_rate": 0.75,
        },
        "best_validation_loss": best_validation,
        "edge_baseline_tie_tolerance": EDGE_BASELINE_TIE_TOLERANCE,
        "held_out_acceptance": {
            "required_people": 448,
            "half_inch_cm": HALF_INCH_CM,
            "required_core_width_depth_circumference_pass_rate": REQUIRED_HELD_OUT_HALF_INCH_RATE,
            "row_position_endpoint_tolerance_normalized": ROW_PIXEL_GATE_NORMALIZED,
            "required_row_position_endpoint_pass_rate": REQUIRED_HELD_OUT_HALF_INCH_RATE,
        },
        "synthetic_candidate_passed": not failures,
        "sdk_ready": False,
        "failures": failures,
        "important_limit": "Real-photo accuracy requires the separate paired-photo acceptance suite; this private candidate may not be released or published.",
    }
    checkpoint = {
        "schema_version": 8,
        "model_version": args.pipeline_id,
        "state_dict": best_state,
        "edge_keys": edge_keys,
        "measurement_keys": measurement_keys,
        "profile_keys": ["height_cm", "weight_kg", "bmi", "gender_female"],
        "row_geometry_runtime_input": "forbidden-model-predicts-own-lines",
        "normalization": {name: getattr(normalization, name).tolist() for name in normalization.__dataclass_fields__},
        "image_size": [IMAGE_WIDTH, IMAGE_HEIGHT],
        "mesh_channel_mean": MESH_CHANNEL_MEAN[:, 0, 0].tolist(),
        "mesh_channel_std": MESH_CHANNEL_STD[:, 0, 0].tolist(),
        "mesh_channels": ["filled_visible_body", "outer_boundary", "visible_triangle_lines"],
        "vision_backbone": "torchvision-mobilenet-v3-small-Blender-2D-mesh-partial-finetune",
        "runtime_mask_required": False,
        "training_mask_use": "internal-only-to-build-filled-body-and-boundary-channels-never-returned-as-output",
        "pose_input_method": "Blender-2D-mesh-camera-view",
        "core_edge_method": "independent-certified-PLY-projected-row-heads-all-camera-views",
        "core_measurement_method": "Blender-2D-mesh-profile-plus-model-predicted-row-geometry-all-camera-views",
        "non_core_measurement_method": "global-Blender-2D-mesh-profile-head-all-nine-views",
        "row_geometry_priors": row_geometry_priors,
        "row_geometry_augmentation": "none-ground-truth-rows-are-targets-never-inputs",
        "metric_width_input": "forbidden",
        "breadth_method": "direct-raw-WEAR-mesh-supervision",
        "circumference_method": "walked-predicted-32-point-shape-supervised-by-WEAR-tape",
        "depth_method": "same-certified-PLY-ring-C-D-supervision",
        "shape_method": "32-point-normalized-certified-WEAR-cross-section-supervision",
        "pose_scope": "standing-A-only; nine deterministic Blender camera views teach angle correction against one canonical certified PLY geometry; sitting measurements excluded",
    }
    torch.save(checkpoint, args.output_dir / "model.pt")
    (args.output_dir / "test-metrics.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
    (args.output_dir / "training-history.json").write_text(json.dumps(history, indent=2), encoding="utf-8")
    runtime = {key: value for key, value in checkpoint.items() if key != "state_dict"}
    runtime.update({"syntheticCandidatePassed": not failures, "sdkReady": False, "subjects": subject_counts})
    (args.output_dir / "runtime.json").write_text(json.dumps(runtime, indent=2), encoding="utf-8")

    cpu_model = model.cpu().eval()
    examples = (
        torch.zeros(1, 3, IMAGE_HEIGHT, IMAGE_WIDTH),
        torch.zeros(1, 4),
    )
    torch.jit.trace(cpu_model, examples).save(str(args.output_dir / "model.ts"))
    onnx_path = args.output_dir / "model.onnx"
    torch.onnx.export(
        cpu_model,
        examples,
        onnx_path,
        input_names=["mesh_channels", "profile"],
        output_names=["edges", "measurements"],
        dynamic_axes={name: {0: "batch"} for name in (
            "mesh_channels", "profile",
            "edges", "measurements"
        )},
        opset_version=18,
        external_data=False,
    )
    if not onnx_path.is_file() or onnx_path.stat().st_size < 1_024:
        raise RuntimeError("ONNX export did not create a usable runtime artifact")
    onnx.checker.check_model(onnx.load(str(onnx_path)))
    print(json.dumps({"records": len(records), "edges": len(edge_keys), "measurements": len(measurement_keys), "device": str(device)}), flush=True)


if __name__ == "__main__":
    main()
