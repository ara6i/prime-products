"""Fail-closed target selection shared by the WEAR trainer and its tests."""

from __future__ import annotations

from typing import Any


GEOMETRY_COUPLED_TAPE_ROWS = {
    "neck_base_circumference_mm": "neck",
    "chest_circumference_mm": "chest",
    "underbust_circumference_mm": "underbust",
    "waist_circumference_mm": "waist",
    "hip_circumference_mm": "hips",
}


def include_measurement_target(
    namespace: str,
    measurement_name: str,
    rows: dict[str, Any],
) -> bool:
    """Keep every recorded measurement; geometry has its own target masks."""
    del measurement_name, rows
    return namespace in {"measurements_mm", "extracted_standing_mm"}


def _finite(value: Any) -> float | None:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if number == number and abs(number) != float("inf") else None


def _edge_valid_width_cm(rows: dict[str, Any], row_name: str) -> float | None:
    """Return an observed front width even when the hidden 360 shape is masked."""
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
    if not edge_valid:
        return None
    millimetres = _finite(row.get("visible_width_mm"))
    if millimetres is None:
        millimetres = _finite(row.get("mesh_width_mm"))
    return millimetres / 10.0 if millimetres is not None and millimetres > 0 else None


def build_ratio_targets(record: dict[str, Any]) -> dict[str, float]:
    """Build auxiliary ratios only from independently accepted front widths."""
    rows = record.get("rows") or {}
    measurements = record.get("measurements_mm") or {}
    shoulder_mm = _finite(measurements.get("shoulder_breadth_mm"))
    values = {
        "shoulder": shoulder_mm / 10.0 if shoulder_mm is not None and shoulder_mm > 0 else None,
        "neck": _edge_valid_width_cm(rows, "neck"),
        "chest": _edge_valid_width_cm(rows, "chest"),
        "underbust": _edge_valid_width_cm(rows, "underbust"),
        "waist": _edge_valid_width_cm(rows, "waist"),
        "hips": _edge_valid_width_cm(rows, "hips"),
    }
    definitions = {
        "ratio.shoulder_waist": ("shoulder", "waist"),
        "ratio.shoulder_hips": ("shoulder", "hips"),
        "ratio.chest_waist": ("chest", "waist"),
        "ratio.chest_hips": ("chest", "hips"),
        "ratio.neck_shoulder": ("neck", "shoulder"),
        "ratio.neck_waist": ("neck", "waist"),
        "ratio.waist_hips": ("waist", "hips"),
        "ratio.underbust_waist": ("underbust", "waist"),
        "ratio.underbust_hips": ("underbust", "hips"),
    }
    targets: dict[str, float] = {}
    for key, (numerator_name, denominator_name) in definitions.items():
        numerator = values[numerator_name]
        denominator = values[denominator_name]
        if numerator is None or denominator is None or denominator <= 0:
            continue
        targets[key] = numerator / denominator
    return targets
