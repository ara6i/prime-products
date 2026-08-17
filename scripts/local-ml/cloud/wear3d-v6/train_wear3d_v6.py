#!/usr/bin/env python3
"""Train the mask-free, WEAR-only RGB sizing model.

The customer contract is one front photo plus height, weight, gender, and
optional hand-corrected row lines.  A line is supplied only as normalized
photo coordinates; no Apple/Depth/px-to-cm value is an input.

The model learns three paths directly from standing WEAR teachers:
1. RGB + profile -> anatomical rows, landmarks, and body-guide segments.
2. RGB body shape + profile + one normalized row line -> that row's true mesh
   breadth, raw-mesh depth, normalized 32-point cross-section, and recorded
   tape circumference.
3. RGB + profile -> all other usable WEAR standing measurements.

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

import boto3
import numpy as np
import onnx
from PIL import Image, ImageEnhance, ImageFilter
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
ROW_GEOMETRY_VALUE_KEYS = tuple(
    f"{name}_{field}"
    for name in ROW_NAMES
    for field in ROW_GEOMETRY_FIELDS
)
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
RGB_MEAN = np.asarray((0.485, 0.456, 0.406), dtype=np.float32)[:, None, None]
RGB_STD = np.asarray((0.229, 0.224, 0.225), dtype=np.float32)[:, None, None]
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
    return parser.parse_args()


def finite(value: Any) -> float | None:
    try:
        result = float(value)
    except (TypeError, ValueError):
        return None
    return result if math.isfinite(result) else None


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


def row_geometry_values(record: dict[str, Any]) -> tuple[np.ndarray, np.ndarray]:
    """Return normalized y/left/right coordinates for each anatomical row."""
    compact_values = record.get("_row_geometry_values")
    compact_mask = record.get("_row_geometry_mask")
    if compact_values is not None and compact_mask is not None:
        # Augmentation can hide rows, so never return the stored arrays by
        # reference even if a future compact representation uses numpy arrays.
        return (
            np.asarray(compact_values, dtype=np.float32).copy(),
            np.asarray(compact_mask, dtype=np.float32).copy(),
        )
    values = np.zeros(len(ROW_GEOMETRY_VALUE_KEYS), dtype=np.float32)
    mask = np.zeros(len(ROW_NAMES), dtype=np.float32)
    rows = record.get("rows") or {}
    for index, name in enumerate(ROW_NAMES):
        row = rows.get(name) or {}
        y = finite(row.get("y_norm"))
        left = finite(row.get("wear_edge_left_x_norm"))
        right = finite(row.get("wear_edge_right_x_norm"))
        if (
            row.get("accepted") is True
            and y is not None
            and left is not None
            and right is not None
            and 0.0 <= y <= 1.0
            and 0.0 <= left < right <= 1.0
        ):
            offset = index * len(ROW_GEOMETRY_FIELDS)
            values[offset : offset + len(ROW_GEOMETRY_FIELDS)] = (y, left, right)
            mask[index] = 1.0
    return values, mask


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
        circumference_mm = finite(row.get("measurement_circumference_mm"))
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

    # Tape values are independent WEAR observations. Preserve them even when
    # an exact mesh-plane height is unavailable and that row's edge/depth/shape
    # must be masked rather than guessed.
    source_measurements = {
        **record.get("measurements_mm", {}),
        **record.get("extracted_standing_mm", {}),
    }
    circumference_sources = {
        "neck": "neck_base_circumference_mm",
        "chest": "chest_circumference_mm",
        "underbust": "underbust_circumference_mm",
        "waist": "waist_circumference_mm",
        "hips": "hip_circumference_mm",
    }
    for name, source_key in circumference_sources.items():
        circumference_mm = finite(source_measurements.get(source_key))
        if circumference_mm is not None:
            measurements[f"row.{name}.circumference_cm"] = circumference_mm / 10.0

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
            if namespace == "measurements_mm" and (
                name in EXCLUDED_MEASUREMENTS
                or name in SITTING_MEASUREMENTS
                or "sitting" in name.lower()
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
            image_path = Path(str(record.get("image", "")))
            mask_path = Path(str(record.get("mask", "")))
            if not image_path.exists() or not mask_path.exists():
                missing_images.append(f"line {line_number}: image={image_path} mask={mask_path}")
                continue
            view_id = str(record.get("view_id") or (record.get("camera") or {}).get("view_id") or "")
            edge_targets, measurement_targets = flatten_targets(record)
            profile = profile_values(record)
            row_geometry, row_geometry_mask = row_geometry_values(record)
            # Keep only fields used during training. Raw rows, contours,
            # landmarks, segments and measurement dictionaries have already
            # been flattened into exact supervised targets above.
            records.append({
                "subject_id": str(record["subject_id"]),
                "role": sys.intern(str(record["role"])),
                "_image_path": str(image_path),
                "_mask_path": str(mask_path),
                "_profile_values": tuple(float(value) for value in profile),
                "_row_geometry_values": tuple(float(value) for value in row_geometry),
                "_row_geometry_mask": tuple(float(value) for value in row_geometry_mask),
                "_view_id": sys.intern(view_id),
                "_edge_targets": edge_targets,
                "_measurement_targets": measurement_targets,
            })
    if invalid:
        raise RuntimeError(f"Manifest contains {len(invalid)} invalid successful rows: {invalid[:5]}")
    if missing_images:
        raise RuntimeError(f"Manifest is missing {len(missing_images)} RGB images: {missing_images[:5]}")
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
    row_geometry_mean: np.ndarray
    row_geometry_std: np.ndarray
    edge_mean: np.ndarray
    edge_std: np.ndarray
    measurement_mean: np.ndarray
    measurement_std: np.ndarray


def masked_stats(records: list[dict[str, Any]], keys: list[str], namespace: str) -> tuple[np.ndarray, np.ndarray]:
    values = np.full((len(records), len(keys)), np.nan, dtype=np.float32)
    target_field = "_edge_targets" if namespace == "edge" else "_measurement_targets"
    for row_index, record in enumerate(records):
        for column_index, key in enumerate(keys):
            is_core_edge = namespace == "edge" and key in CORE_EDGE_KEYS
            is_core_measurement = namespace == "measurement" and key.startswith(
                tuple(f"row.{name}." for name in ROW_NAMES)
            )
            if (is_core_edge or is_core_measurement) and record.get("_view_id") != "front-50":
                continue
            value = record[target_field].get(key)
            if value is not None:
                values[row_index, column_index] = value
    mean = np.nan_to_num(np.nanmean(values, axis=0), nan=0.0)
    std = np.maximum(np.nan_to_num(np.nanstd(values, axis=0), nan=1.0), 1e-4)
    return mean, std


def compute_normalization(records: list[dict[str, Any]], edge_keys: list[str], measurement_keys: list[str]) -> Normalization:
    profiles = np.stack([profile_values(record) for record in records])
    geometries = np.stack([row_geometry_values(record)[0] for record in records])
    geometry_masks = np.stack([row_geometry_values(record)[1] for record in records])
    expanded_geometry_masks = np.repeat(geometry_masks, len(ROW_GEOMETRY_FIELDS), axis=1) > 0.5
    masked_geometries = np.where(expanded_geometry_masks, geometries, np.nan)
    row_geometry_mean = np.nan_to_num(np.nanmean(masked_geometries, axis=0), nan=0.5)
    row_geometry_std = np.maximum(
        np.nan_to_num(np.nanstd(masked_geometries, axis=0), nan=1.0),
        1e-4,
    )
    edge_mean, edge_std = masked_stats(records, edge_keys, "edge")
    measurement_mean, measurement_std = masked_stats(records, measurement_keys, "measurement")
    return Normalization(
        profiles.mean(axis=0),
        np.maximum(profiles.std(axis=0), 1e-5),
        row_geometry_mean,
        row_geometry_std,
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
        "anchor": "canonical full-person RGB crop; no Apple or metric width input",
        "cohort_key": "gender:BMI-band",
        "buckets": summarized,
    }


class WearRgbDataset(Dataset):
    def __init__(self, records, edge_keys, measurement_keys, normalization, augment=False):
        self.records = records
        self.edge_keys = edge_keys
        self.measurement_keys = measurement_keys
        self.normalization = normalization
        self.augment = augment

    def __len__(self):
        return len(self.records)

    @staticmethod
    def tight_clothing_appearance(foreground: Image.Image, alpha_image: Image.Image) -> Image.Image:
        """Randomize fitted clothing while preserving the exact WEAR silhouette.

        The teacher mask only constructs an RGB training image. It never enters
        the network and never defines an edge or measurement target; those stay
        projected from the closed 3D torso and recorded WEAR measurements.
        """
        pixels = np.asarray(foreground, dtype=np.float32).copy()
        body = np.asarray(alpha_image, dtype=np.float32) >= 96.0
        y_grid = np.linspace(0.0, 1.0, IMAGE_HEIGHT, dtype=np.float32)[:, None]
        x_grid = np.linspace(0.0, 1.0, IMAGE_WIDTH, dtype=np.float32)[None, :]

        def apply_garment(y_start: float, y_end: float, probability: float) -> None:
            nonlocal pixels
            if random.random() > probability:
                return
            garment = body & (y_grid >= y_start) & (y_grid <= y_end)
            if not garment.any():
                return
            base = np.asarray([random.uniform(18.0, 238.0) for _ in range(3)], dtype=np.float32)
            pattern_mode = random.choice(("plain", "horizontal", "vertical", "soft-noise"))
            if pattern_mode == "horizontal":
                pattern = np.sin(y_grid * random.uniform(35.0, 85.0)) * random.uniform(6.0, 28.0)
            elif pattern_mode == "vertical":
                pattern = np.sin(x_grid * random.uniform(35.0, 85.0)) * random.uniform(6.0, 28.0)
            elif pattern_mode == "soft-noise":
                small = Image.fromarray(np.random.randint(0, 256, size=(16, 12), dtype=np.uint8))
                pattern = (
                    np.asarray(
                        small.resize((IMAGE_WIDTH, IMAGE_HEIGHT), Image.Resampling.BICUBIC),
                        dtype=np.float32,
                    )
                    - 127.5
                ) * random.uniform(0.08, 0.24)
            else:
                pattern = np.zeros((IMAGE_HEIGHT, IMAGE_WIDTH), dtype=np.float32)
            texture = np.clip(base[None, None, :] + pattern[..., None], 0.0, 255.0)
            original_mix = random.uniform(0.12, 0.34)
            recolored = texture * (1.0 - original_mix) + pixels * original_mix
            pixels[garment] = recolored[garment]

        # Fitted top and fitted bottoms change appearance, never geometry.
        apply_garment(random.uniform(0.16, 0.23), random.uniform(0.48, 0.62), 0.92)
        apply_garment(random.uniform(0.47, 0.58), random.uniform(0.82, 0.97), 0.88)
        return Image.fromarray(np.clip(pixels, 0, 255).astype(np.uint8), mode="RGB")

    def __getitem__(self, index):
        record = self.records[index]
        with Image.open(record["_image_path"]) as image:
            image = image.convert("RGB").resize((IMAGE_WIDTH, IMAGE_HEIGHT), Image.Resampling.BILINEAR)
        if self.augment:
            # The mask is a training-only teacher used to vary RGB appearance.
            # It is never an input or label source for the exported network.
            with Image.open(record["_mask_path"]) as source_mask:
                alpha_image = source_mask.convert("L").resize((IMAGE_WIDTH, IMAGE_HEIGHT), Image.Resampling.BILINEAR)
            alpha_image = alpha_image.filter(ImageFilter.GaussianBlur(radius=random.uniform(0.0, 0.8)))
            foreground = ImageEnhance.Color(image).enhance(random.uniform(0.45, 1.55))
            foreground = ImageEnhance.Brightness(foreground).enhance(random.uniform(0.72, 1.28))
            foreground = self.tight_clothing_appearance(foreground, alpha_image)
            top = np.random.randint(0, 256, size=(1, 1, 3), dtype=np.uint8)
            bottom = np.random.randint(0, 256, size=(1, 1, 3), dtype=np.uint8)
            blend = np.linspace(0.0, 1.0, IMAGE_HEIGHT, dtype=np.float32)[:, None, None]
            gradient = top * (1.0 - blend) + bottom * blend
            gradient = np.broadcast_to(gradient, (IMAGE_HEIGHT, IMAGE_WIDTH, 3)).copy()
            noise_small = Image.fromarray(np.random.randint(0, 256, size=(12, 9, 3), dtype=np.uint8))
            noise = np.asarray(noise_small.resize((IMAGE_WIDTH, IMAGE_HEIGHT), Image.Resampling.BICUBIC), dtype=np.float32)
            background = Image.fromarray(np.clip(gradient * 0.72 + noise * 0.28, 0, 255).astype(np.uint8))
            image = Image.composite(foreground, background, alpha_image)
            image = ImageEnhance.Contrast(image).enhance(random.uniform(0.70, 1.35))
        rgb = np.asarray(image, dtype=np.float32).transpose(2, 0, 1) / 255.0
        rgb = (rgb - RGB_MEAN) / RGB_STD
        profile = (profile_values(record) - self.normalization.profile_mean) / self.normalization.profile_std
        row_geometry, row_geometry_mask = row_geometry_values(record)
        if self.augment:
            # Manual lines are photo geometry, never centimetres.  Jitter them
            # like careful hand edits and sometimes hide them so the first RGB
            # pass can still produce useful rows before the user corrects one.
            shared_x = float(np.random.normal(0.0, 0.004))
            shared_y = float(np.random.normal(0.0, 0.004))
            for row_index in range(len(ROW_NAMES)):
                if row_geometry_mask[row_index] <= 0.5:
                    continue
                offset = row_index * len(ROW_GEOMETRY_FIELDS)
                y, left, right = row_geometry[offset : offset + len(ROW_GEOMETRY_FIELDS)]
                y = float(np.clip(y + shared_y + np.random.normal(0.0, 0.004), 0.0, 1.0))
                left = float(np.clip(left + shared_x + np.random.normal(0.0, 0.005), 0.0, 0.97))
                right = float(np.clip(right + shared_x + np.random.normal(0.0, 0.005), 0.03, 1.0))
                if right - left < 0.03:
                    center = (left + right) * 0.5
                    left = max(0.0, center - 0.015)
                    right = min(1.0, center + 0.015)
                row_geometry[offset : offset + len(ROW_GEOMETRY_FIELDS)] = (y, left, right)
            if random.random() < 0.25:
                row_geometry_mask[:] = 0.0
            else:
                for row_index in np.flatnonzero(row_geometry_mask > 0.5):
                    if random.random() < 0.15:
                        row_geometry_mask[int(row_index)] = 0.0
        expanded_geometry_mask = np.repeat(row_geometry_mask, len(ROW_GEOMETRY_FIELDS)) > 0.5
        row_geometry = np.where(
            expanded_geometry_mask,
            row_geometry,
            self.normalization.row_geometry_mean,
        )
        row_geometry = (
            row_geometry - self.normalization.row_geometry_mean
        ) / self.normalization.row_geometry_std

        edge_values = np.zeros(len(self.edge_keys), dtype=np.float32)
        edge_mask = np.zeros(len(self.edge_keys), dtype=np.float32)
        for target_index, key in enumerate(self.edge_keys):
            value = record["_edge_targets"].get(key)
            if value is not None:
                edge_values[target_index] = (value - self.normalization.edge_mean[target_index]) / self.normalization.edge_std[target_index]
                # Customer inference is a front photo. Core anatomical rows
                # are therefore supervised only by the exact front-50 teacher
                # projected from the true WEAR mesh. Angled views still teach every
                # non-core landmark, sleeve, shoulder and inseam target.
                is_core_edge = key in CORE_EDGE_KEYS
                if not is_core_edge or record.get("_view_id") == "front-50":
                    edge_mask[target_index] = 1.0
        measurement_values = np.zeros(len(self.measurement_keys), dtype=np.float32)
        measurement_mask = np.zeros(len(self.measurement_keys), dtype=np.float32)
        for target_index, key in enumerate(self.measurement_keys):
            value = record["_measurement_targets"].get(key)
            if value is not None:
                measurement_values[target_index] = (value - self.normalization.measurement_mean[target_index]) / self.normalization.measurement_std[target_index]
                # The product accepts one front photo. Core row shape/depth/
                # circumference heads therefore learn only from the exact
                # front-50 teacher for each person. All nine views still teach
                # RGB edges, landmarks, segments, and non-core measurements.
                is_core_row_target = key.startswith(tuple(f"row.{name}." for name in ROW_NAMES))
                if not is_core_row_target or record.get("_view_id") == "front-50":
                    measurement_mask[target_index] = 1.0
        return tuple(torch.from_numpy(value.astype(np.float32)) for value in (
            rgb, profile, row_geometry, row_geometry_mask,
            edge_values, edge_mask, measurement_values, measurement_mask
        ))


def seed_worker(_: int) -> None:
    """Give every persistent loader worker an independent reproducible RNG."""
    seed = torch.initial_seed() % (2**32)
    random.seed(seed)
    np.random.seed(seed)


class WearV7Model(nn.Module):
    def __init__(self, edge_keys: list[str], measurement_keys: list[str]) -> None:
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
        core_edge_indices = [
            edge_index[f"row.{name}.{field}"]
            for name in ROW_NAMES
            for field in CORE_ROW_EDGE_FIELDS
        ]
        self.register_buffer("core_edge_indices", torch.tensor(core_edge_indices, dtype=torch.long))

        # Non-core standing targets retain the global RGB path so sleeves,
        # shoulders, inseams, landmarks and every usable WEAR value remain
        # learned. Core body geometry is replaced below by independent heads.
        self.measurement_head = nn.Sequential(
            nn.Linear(shared_visual_size, 384),
            nn.SiLU(),
            nn.Dropout(0.15),
            nn.Linear(384, len(measurement_keys)),
        )
        # Every row receives RGB evidence, the product profile, and only its
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
        self.row_measurement_heads = nn.ModuleDict()
        core_measurement_indices: list[int] = []
        for name in ROW_NAMES:
            indices = [
                measurement_index[key]
                for key in measurement_keys
                if key.startswith(f"row.{name}.")
            ]
            if not indices:
                raise RuntimeError(f"No independent measurement targets for {name}")
            core_measurement_indices.extend(indices)
            self.row_measurement_heads[name] = nn.Sequential(
                nn.Linear(136, 192),
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

    def forward(self, rgb, profile, row_geometry, row_geometry_mask):
        vision = self.vision_pool(self.vision_features(rgb)).flatten(1)
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
            self.core_edge_indices.unsqueeze(0).expand(rgb.shape[0], -1),
            core_edges,
        )

        measurements = self.measurement_head(shared_visual)
        measurement_visual = self.measurement_visual(core_visual)
        independent_rows = []
        for index, name in enumerate(ROW_NAMES):
            geometry_offset = index * len(ROW_GEOMETRY_FIELDS)
            row_input = torch.cat(
                (
                    measurement_visual,
                    profile,
                    row_geometry[:, geometry_offset : geometry_offset + len(ROW_GEOMETRY_FIELDS)],
                    row_geometry_mask[:, index : index + 1],
                ),
                dim=1,
            )
            independent_rows.append(self.row_measurement_heads[name](row_input))
        core_measurements = torch.cat(independent_rows, dim=1)
        measurements = measurements.scatter(
            1,
            self.core_measurement_indices.unsqueeze(0).expand(rgb.shape[0], -1),
            core_measurements,
        )
        return edge_values, measurements


def startup_smoke() -> None:
    """Exercise the exact tensor/ONNX contract before downloading teachers."""
    edge_keys = sorted(CORE_EDGE_KEYS | CORE_SEGMENT_KEYS | {"landmark.Cervicale.x", "landmark.Cervicale.y"})
    measurement_keys = sorted(
        CORE_CIRCUMFERENCE_KEYS
        | CORE_BREADTH_KEYS
        | CORE_DEPTH_KEYS
        | {
            f"row.{name}.shape.00.{axis}"
            for name in ROW_NAMES
            for axis in ("x", "y")
        }
        | {"extracted_standing_mm.sleeve_outseam_left_mm"}
    )
    model = WearV7Model(edge_keys, measurement_keys).cpu().eval()
    examples = (
        torch.zeros(2, 3, IMAGE_HEIGHT, IMAGE_WIDTH),
        torch.zeros(2, 4),
        torch.zeros(2, len(ROW_GEOMETRY_VALUE_KEYS)),
        torch.ones(2, len(ROW_NAMES)),
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
            input_names=["rgb", "profile", "row_geometry", "row_geometry_mask"],
            output_names=["edges", "measurements"],
            dynamic_axes={name: {0: "batch"} for name in (
                "rgb", "profile", "row_geometry", "row_geometry_mask",
                "edges", "measurements"
            )},
            opset_version=18,
            external_data=False,
        )
        onnx.checker.check_model(onnx.load(str(model_path)))
    print(json.dumps({
        "startupSmokePassed": True,
        "inputs": ["rgb", "profile", "row_geometry", "row_geometry_mask"],
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
        self.s3 = boto3.client("s3") if bucket and key else None

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
                "currentStage": "train-v6",
                "currentStageLabel": f"Training WEAR RGB v6: epoch {epoch}/{epochs}",
                "detail": detail,
                "updatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            })
            for item in status.get("stages", []):
                if item.get("key") == "train-v6":
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
    for rgb, profile, row_geometry, row_geometry_mask, edge_target, edge_mask, measurement_target, measurement_mask in loader:
        edge_prediction, measurement_prediction = model(
            rgb.to(device), profile.to(device), row_geometry.to(device), row_geometry_mask.to(device)
        )
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
        rgb, profile, row_geometry, row_geometry_mask = [value.to(device) for value in batch[:4]]
        target, mask = batch[4 + output_index * 2 : 6 + output_index * 2]
        prediction = model(rgb, profile, row_geometry, row_geometry_mask)[output_index]
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
    return result


@torch.no_grad()
def edge_structure_metrics(model, loader, device, keys, mean, std):
    """Check that RGB-only WEAR rows remain ordered with valid photo spans."""
    model.eval()
    index = {key: position for position, key in enumerate(keys)}
    mean_tensor = torch.from_numpy(mean).to(device)
    std_tensor = torch.from_numpy(std).to(device)
    total = 0
    ordered = 0
    valid_spans = 0
    for batch in loader:
        rgb, profile, row_geometry, row_geometry_mask = [value.to(device) for value in batch[:4]]
        edge_mask = batch[5].to(device)
        prediction = model(rgb, profile, row_geometry, row_geometry_mask)[0]
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
        front_valid = torch.ones(rgb.shape[0], dtype=torch.bool, device=device)
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
    random.seed(20260816)
    np.random.seed(20260816)
    torch.manual_seed(20260816)
    args.output_dir.mkdir(parents=True, exist_ok=True)
    records = load_records(args.manifest)
    if len(records) < args.minimum_records:
        raise RuntimeError(f"Only {len(records)} valid RGB views; need {args.minimum_records}")
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
        role: WearRgbDataset(split, edge_keys, measurement_keys, normalization, augment=role == "train")
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
    model = WearV7Model(edge_keys, measurement_keys).to(device)
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
        for rgb, profile, row_geometry, row_geometry_mask, edge_target, edge_mask, measurement_target, measurement_mask in loaders["train"]:
            rgb, profile, row_geometry, row_geometry_mask = [
                value.to(device, non_blocking=True)
                for value in (rgb, profile, row_geometry, row_geometry_mask)
            ]
            edge_target, edge_mask = edge_target.to(device), edge_mask.to(device)
            measurement_target, measurement_mask = measurement_target.to(device), measurement_mask.to(device)
            optimizer.zero_grad(set_to_none=True)
            with torch.amp.autocast("cuda", enabled=device.type == "cuda"):
                edge_prediction, measurement_prediction = model(
                    rgb, profile, row_geometry, row_geometry_mask
                )
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
    for key in sorted(CORE_BREADTH_KEYS):
        value = measurement_metrics[key]
        limit = CORE_BREADTH_LIMIT_CM[key]
        if not value["beats_train_mean_baseline"] or value["mae"] is None or value["mae"] > limit:
            failures.append(
                f"{key}: raw-mesh breadth MAE={value['mae']} cm limit={limit} "
                f"baseline_win={value['beats_train_mean_baseline']}"
            )
    for key in sorted(CORE_DEPTH_KEYS):
        value = measurement_metrics[key]
        limit = CORE_DEPTH_LIMIT_CM[key]
        if not value["beats_train_mean_baseline"] or value["mae"] is None or value["mae"] > limit:
            failures.append(
                f"{key}: raw-mesh depth MAE={value['mae']} cm limit={limit} "
                f"baseline_win={value['beats_train_mean_baseline']}"
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
        "synthetic_candidate_passed": not failures,
        "sdk_ready": False,
        "failures": failures,
        "important_limit": "Real-photo accuracy requires the separate paired-photo acceptance suite; this private candidate may not be released or published.",
    }
    checkpoint = {
        "schema_version": 7,
        "model_version": args.pipeline_id,
        "state_dict": best_state,
        "edge_keys": edge_keys,
        "measurement_keys": measurement_keys,
        "profile_keys": ["height_cm", "weight_kg", "bmi", "gender_female"],
        "row_geometry_keys": list(ROW_GEOMETRY_VALUE_KEYS),
        "row_geometry_mask_keys": list(ROW_NAMES),
        "normalization": {name: getattr(normalization, name).tolist() for name in normalization.__dataclass_fields__},
        "image_size": [IMAGE_WIDTH, IMAGE_HEIGHT],
        "rgb_mean": RGB_MEAN[:, 0, 0].tolist(),
        "rgb_std": RGB_STD[:, 0, 0].tolist(),
        "vision_backbone": "torchvision-mobilenet-v3-small-imagenet-WEAR-only-partial-finetune",
        "runtime_mask_required": False,
        "training_mask_use": "WEAR-RGB-background-and-tight-clothing-appearance-only",
        "pose_input_method": "none-WEAR-RGB-only",
        "core_edge_method": "independent-front-only-WEAR-RGB-row-heads",
        "core_measurement_method": "independent-mask-free-RGB-profile-plus-own-normalized-row-geometry-front-50-only",
        "non_core_measurement_method": "global-RGB-profile-head-all-nine-views",
        "row_geometry_priors": row_geometry_priors,
        "row_geometry_augmentation": "normalized-line-jitter-with-partial-and-all-row-dropout",
        "metric_width_input": "forbidden",
        "breadth_method": "direct-raw-WEAR-mesh-supervision",
        "circumference_method": "direct-learned-WEAR-label",
        "depth_method": "raw-WEAR-mesh-supervision",
        "shape_method": "32-point-normalized-closed-WEAR-cross-section-supervision",
        "pose_scope": "standing-A-only; core edges and measurements supervised on front-50 projected WEAR geometry; angled views teach non-core standing outputs; sitting-protocol measurements excluded",
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
        torch.zeros(1, len(ROW_GEOMETRY_VALUE_KEYS)),
        torch.ones(1, len(ROW_NAMES)),
    )
    torch.jit.trace(cpu_model, examples).save(str(args.output_dir / "model.ts"))
    onnx_path = args.output_dir / "model.onnx"
    torch.onnx.export(
        cpu_model,
        examples,
        onnx_path,
        input_names=["rgb", "profile", "row_geometry", "row_geometry_mask"],
        output_names=["edges", "measurements"],
        dynamic_axes={name: {0: "batch"} for name in (
            "rgb", "profile", "row_geometry", "row_geometry_mask",
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
