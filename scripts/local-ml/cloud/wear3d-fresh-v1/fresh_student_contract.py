"""Stable output and loss-group contract for the fresh WEAR student model."""

from __future__ import annotations

from typing import Any

from teacher_contract import FRONT_RATIO_DEFINITIONS, ROW_NAMES, TAPE_RATIO_DEFINITIONS


IMAGE_WIDTH = 96
IMAGE_HEIGHT = 128
PROFILE_FIELDS = (
    "height_cm",
    "weight_kg",
    "bmi",
    "gender_female",
    "gender_male",
)


def target_schema() -> list[str]:
    keys: list[str] = []
    for row in ROW_NAMES:
        keys.extend(
            f"row.{row}.{field}"
            for field in (
                "y_norm",
                "left_x_norm",
                "right_x_norm",
                "width_cm",
                "depth_cm",
                "depth_width_ratio",
            )
        )
        for point in range(32):
            keys.append(f"row.{row}.shape.{point:02d}.x")
            keys.append(f"row.{row}.shape.{point:02d}.depth")
    keys.extend(f"tape.{row}.circumference_cm" for row in ROW_NAMES)
    keys.extend(FRONT_RATIO_DEFINITIONS)
    keys.extend(TAPE_RATIO_DEFINITIONS)
    keys.extend(
        (
            "camera.correction_yaw_deg",
            "camera.correction_pitch_deg",
            "camera.correction_roll_deg",
            "camera.correction_target_height_ratio",
            "camera.input_lens_ratio_to_50mm",
            "camera.input_distance_scale",
        )
    )
    if len(keys) != 371 or len(keys) != len(set(keys)):
        raise RuntimeError(f"Fresh target schema is invalid: {len(keys)} keys")
    return keys


def target_group(key: str) -> str:
    if ".shape." in key:
        return "shape"
    if key.startswith("row."):
        return "row"
    if key.startswith("tape."):
        return "tape"
    if key.startswith("ratio."):
        return "ratio"
    if key.startswith("camera."):
        return "camera"
    raise KeyError(f"Unknown fresh target key: {key}")


def target_groups(schema: list[str] | None = None) -> dict[str, list[int]]:
    groups = {name: [] for name in ("row", "shape", "tape", "ratio", "camera")}
    for index, key in enumerate(schema or target_schema()):
        groups[target_group(key)].append(index)
    expected = {"row": 30, "shape": 320, "tape": 5, "ratio": 10, "camera": 6}
    actual = {name: len(indices) for name, indices in groups.items()}
    if actual != expected:
        raise RuntimeError(f"Fresh target groups changed: {actual}")
    return groups


def profile_vector(record: dict[str, Any]) -> list[float]:
    height = float(record.get("height_cm") or 170.0)
    weight = float(record.get("weight_kg") or 70.0)
    bmi = float(record.get("bmi") or (weight / ((height / 100.0) ** 2)))
    gender = str(record.get("gender") or "unknown").lower()
    return [
        (height - 170.0) / 20.0,
        (weight - 70.0) / 25.0,
        (bmi - 24.0) / 8.0,
        1.0 if gender == "female" else 0.0,
        1.0 if gender == "male" else 0.0,
    ]
