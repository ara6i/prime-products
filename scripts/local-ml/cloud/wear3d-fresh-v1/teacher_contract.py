"""Fresh WEAR 3D teacher targets with independent, fail-closed masks.

This module defines labels only. It does not fit a model and never uses a
teacher label as a photo-only inference input.
"""

from __future__ import annotations

import math
from typing import Any


ROW_NAMES = ("neck", "chest", "underbust", "waist", "hips")
TAPE_FIELDS = {
    "neck": "neck_base_circumference_mm",
    "chest": "chest_circumference_mm",
    "underbust": "underbust_circumference_mm",
    "waist": "waist_circumference_mm",
    "hips": "hip_circumference_mm",
}
FRONT_RATIO_DEFINITIONS = {
    "ratio.front.shoulder_waist": ("shoulder", "waist"),
    "ratio.front.shoulder_hips": ("shoulder", "hips"),
    "ratio.front.neck_shoulder": ("neck", "shoulder"),
}
TAPE_RATIO_DEFINITIONS = {
    "ratio.tape.chest_underbust": ("chest", "underbust"),
    "ratio.tape.chest_waist": ("chest", "waist"),
    "ratio.tape.chest_hips": ("chest", "hips"),
    "ratio.tape.neck_waist": ("neck", "waist"),
    "ratio.tape.waist_hips": ("waist", "hips"),
    "ratio.tape.underbust_waist": ("underbust", "waist"),
    "ratio.tape.underbust_hips": ("underbust", "hips"),
}


def finite(value: Any) -> float | None:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if math.isfinite(number) else None


def _accepted(row: dict[str, Any], target: str) -> bool:
    accepted = row.get("accepted") is True
    explicit = row.get(f"{target}_teacher_accepted")
    valid = row.get(f"{target}_target_valid") is not False
    return bool(valid and (explicit is True or (explicit is None and accepted)))


def _positive_cm(value: Any) -> float | None:
    millimetres = finite(value)
    return millimetres / 10.0 if millimetres is not None and millimetres > 0 else None


def tape_values_cm(record: dict[str, Any]) -> dict[str, float | None]:
    measurements = record.get("measurements_mm") or {}
    rows = record.get("rows") or {}
    masked = record.get("masked_rows") or {}
    values: dict[str, float | None] = {}
    for name, field in TAPE_FIELDS.items():
        row = rows.get(name) or {}
        masked_row = masked.get(name) or {}
        value = (
            _positive_cm(row.get("measurement_circumference_mm"))
            or _positive_cm(masked_row.get("measurement_circumference_mm"))
            or _positive_cm(measurements.get(field))
        )
        values[name] = value
    return values


def _ratios(
    definitions: dict[str, tuple[str, str]],
    values: dict[str, float | None],
) -> dict[str, float]:
    targets: dict[str, float] = {}
    for key, (numerator_name, denominator_name) in definitions.items():
        numerator = values.get(numerator_name)
        denominator = values.get(denominator_name)
        if numerator is None or denominator is None or denominator <= 0:
            continue
        targets[key] = numerator / denominator
    return targets


def extract_targets(record: dict[str, Any]) -> dict[str, float]:
    """Extract every eligible target without filling missing labels."""
    targets: dict[str, float] = {}
    rows = record.get("rows") or {}
    front_values: dict[str, float | None] = {}

    for row_name in ROW_NAMES:
        row = rows.get(row_name) or {}
        edge_valid = _accepted(row, "edge")
        depth_valid = _accepted(row, "depth")
        shape_valid = _accepted(row, "shape")

        if edge_valid:
            for field in ("y_norm", "left_x_norm", "right_x_norm"):
                value = finite(row.get(field))
                if value is not None:
                    targets[f"row.{row_name}.{field}"] = value
            width_cm = _positive_cm(row.get("mesh_width_mm"))
            front_values[row_name] = width_cm
            if width_cm is not None:
                targets[f"row.{row_name}.width_cm"] = width_cm
        else:
            front_values[row_name] = None

        if depth_valid:
            depth_cm = _positive_cm(row.get("mesh_depth_mm"))
            if depth_cm is not None:
                targets[f"row.{row_name}.depth_cm"] = depth_cm
            ratio = finite(row.get("mesh_depth_ratio"))
            if ratio is None and depth_cm is not None and front_values[row_name]:
                ratio = depth_cm / float(front_values[row_name])
            if ratio is not None and ratio > 0:
                targets[f"row.{row_name}.depth_width_ratio"] = ratio

        contour = row.get("contour_points_normalized") or []
        if shape_valid and len(contour) == 32:
            valid_shape = True
            for point_index, point in enumerate(contour):
                if not isinstance(point, (list, tuple)) or len(point) < 2:
                    valid_shape = False
                    break
                x = finite(point[0])
                depth = finite(point[1])
                if x is None or depth is None:
                    valid_shape = False
                    break
                targets[f"row.{row_name}.shape.{point_index:02d}.x"] = x
                targets[f"row.{row_name}.shape.{point_index:02d}.depth"] = depth
            if not valid_shape:
                targets = {
                    key: value
                    for key, value in targets.items()
                    if not key.startswith(f"row.{row_name}.shape.")
                }

    measurements = record.get("measurements_mm") or {}
    shoulder_cm = _positive_cm(measurements.get("shoulder_breadth_mm"))
    front_values["shoulder"] = shoulder_cm
    tape = tape_values_cm(record)
    for row_name, value in tape.items():
        if value is not None:
            targets[f"tape.{row_name}.circumference_cm"] = value

    targets.update(_ratios(FRONT_RATIO_DEFINITIONS, front_values))
    targets.update(_ratios(TAPE_RATIO_DEFINITIONS, tape))

    camera = record.get("camera") or {}
    for source_key, target_key, sign in (
        ("yaw_deg", "camera.correction_yaw_deg", -1.0),
        ("pitch_deg", "camera.correction_pitch_deg", -1.0),
        ("roll_deg", "camera.correction_roll_deg", -1.0),
        ("target_height_offset_ratio", "camera.correction_target_height_ratio", -1.0),
    ):
        value = finite(camera.get(source_key))
        if value is not None:
            targets[target_key] = sign * value
    lens = finite(camera.get("lens_mm"))
    if lens is not None and lens > 0:
        targets["camera.input_lens_ratio_to_50mm"] = lens / 50.0
    distance_scale = finite(camera.get("distance_scale"))
    if distance_scale is not None and distance_scale > 0:
        targets["camera.input_distance_scale"] = distance_scale
    return targets


def target_groups(targets: dict[str, float]) -> dict[str, int]:
    prefixes = {
        "camera": "camera.",
        "row": "row.",
        "shape": ".shape.",
        "tape": "tape.",
        "front_ratio": "ratio.front.",
        "tape_ratio": "ratio.tape.",
    }
    return {
        name: sum(
            marker in key if name == "shape" else key.startswith(marker)
            for key in targets
        )
        for name, marker in prefixes.items()
    }
