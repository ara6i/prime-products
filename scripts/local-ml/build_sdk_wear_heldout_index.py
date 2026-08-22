#!/usr/bin/env python3
"""Build the private front-only SDK/WEAR held-out index.

The test split is kept separate from training/validation.  Ranking fields are
only visible front geometry and profile fields; tape/circumference values are
stored under revealOnly so a matcher cannot accidentally use them.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
DEFAULT_MANIFEST = ROOT / ".local-ml/v6r5-apple-pose/render-manifest-all.jsonl"
DEFAULT_OUTPUT = ROOT / ".local-ml/wear-sdk-heldout/index.json"
PARTS = ("neck", "chest", "underbust", "waist", "hips")
PROFILE_FIELDS = ("height_cm", "weight_kg", "gender")


def number(value: Any) -> float | None:
    try:
        result = float(value)
    except (TypeError, ValueError):
        return None
    return result if result == result and abs(result) != float("inf") else None


def compact_row(row: dict[str, Any], height_cm: float) -> dict[str, Any] | None:
    if not row.get("accepted"):
        return None
    breadth = number(row.get("mesh_width_mm"))
    depth = number(row.get("mesh_depth_mm"))
    y_norm = number(row.get("y_norm"))
    left_x_norm = number(row.get("wear_edge_left_x_norm"))
    right_x_norm = number(row.get("wear_edge_right_x_norm"))
    slice_height_mm = number(row.get("slice_height_mm"))
    contour = row.get("contour_points_normalized")
    if (
        breadth is None
        or depth is None
        or y_norm is None
        or left_x_norm is None
        or right_x_norm is None
        or slice_height_mm is None
        or not isinstance(contour, list)
    ):
        return None
    points: list[list[float]] = []
    for point in contour:
        if not isinstance(point, list) or len(point) != 2:
            continue
        x, y = number(point[0]), number(point[1])
        if x is not None and y is not None:
            points.append([round(x, 6), round(y, 6)])
    if len(points) < 8:
        return None
    return {
        "frontWidthCm": round(breadth / 10.0, 4),
        "depthCm": round(depth / 10.0, 4),
        "heightFromFloorCm": round(slice_height_mm / 10.0, 4),
        "heightFractionFromFeet": round((slice_height_mm / 10.0) / height_cm, 6),
        "yNorm": round(y_norm, 6),
        "leftXNorm": round(left_x_norm, 6),
        "rightXNorm": round(right_x_norm, 6),
        "contour32Normalized": points,
        "geometryValid": bool(row.get("geometry_target_valid")),
        "quality": {
            "rawSliceClosed": row.get("raw_slice_closed") is True,
            "perimeterConsistentWithTape": row.get("perimeter_consistent_with_tape") is True,
        },
    }


def image_for(scan_id: str) -> str | None:
    root = ROOT / ".local-ml/v6r5-apple-pose/rendered"
    matches = list(root.glob(f"**/images/{scan_id}-front-50.png"))
    if not matches:
        return None
    return str(matches[0].relative_to(ROOT))


def build(manifest: Path) -> dict[str, Any]:
    people: list[dict[str, Any]] = []
    seen: set[str] = set()
    with manifest.open(encoding="utf-8") as handle:
        for line in handle:
            if not line.strip():
                continue
            record = json.loads(line)
            if record.get("role") != "test" or record.get("view_id") != "front-50":
                continue
            scan_id = str(record.get("scan_id") or "")
            if not scan_id or scan_id in seen:
                continue
            height, weight = number(record.get("height_cm")), number(record.get("weight_kg"))
            gender = str(record.get("gender") or "").lower()
            if height is None or weight is None or gender not in {"female", "male"}:
                continue
            rows = {part: compact_row((record.get("rows") or {}).get(part) or {}, height) for part in PARTS}
            if not any(rows.values()):
                continue
            measurements = record.get("measurements_mm") or {}
            extracted = record.get("extracted_standing_mm") or {}
            reveal = {
                "measurementsCm": {
                    key: round(float(value) / 10.0, 3)
                    for key, value in measurements.items()
                    if number(value) is not None
                },
                "extractedStandingCm": {
                    key: round(float(value) / 10.0, 3)
                    for key, value in extracted.items()
                    if number(value) is not None
                },
                "rowTapeAndCircumferenceCm": {
                    part: {
                        "tape": None if number((record.get("rows") or {}).get(part, {}).get("measurement_circumference_mm")) is None else round(float((record.get("rows") or {}).get(part, {}).get("measurement_circumference_mm")) / 10.0, 3),
                        "geometryPerimeter": None if number((record.get("rows") or {}).get(part, {}).get("mesh_section_perimeter_mm")) is None else round(float((record.get("rows") or {}).get(part, {}).get("mesh_section_perimeter_mm")) / 10.0, 3),
                    }
                    for part in PARTS
                    if (record.get("rows") or {}).get(part)
                },
            }
            people.append({
                "scanId": scan_id,
                "subjectId": str(record.get("subject_id") or scan_id.removesuffix("-A")),
                "role": "test",
                "viewId": "front-50",
                "gender": gender,
                "heightCm": round(height, 3),
                "weightKg": round(weight, 3),
                "imagePath": image_for(scan_id),
                "renderSize": (record.get("render") or {}).get("width", 192),
                "rows": rows,
                "landmarks2d": record.get("landmarks_2d") or {},
                "segments": record.get("segments") or {},
                "revealOnly": reveal,
            })
            seen.add(scan_id)
    people.sort(key=lambda item: item["scanId"])
    return {
        "schemaVersion": "sdk-wear-front-heldout/v1",
        "status": "private-test-lab-only",
        "releaseApproved": False,
        "canonicalView": "front-50",
        "personCount": len(people),
        "expectedPersonCount": 448,
        "split": "test-only; no train or validation subjects",
        "ranking": {
            "profile": {"gender": "exact", "heightCm": 1.0, "weightKg": 1.0},
            "frontWidthMaxDifferenceCm": 1.27,
            "forbidden": ["tape", "circumference", "revealOnly", "saved user measurements"],
        },
        "parts": list(PARTS),
        "people": people,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    payload = build(args.manifest)
    if payload["personCount"] != 448:
        raise SystemExit(f"held-out index integrity failed: {payload['personCount']} people, expected 448")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, separators=(",", ":")) + "\n", encoding="utf-8")
    print(json.dumps({"output": str(args.output), "personCount": payload["personCount"]}))


if __name__ == "__main__":
    main()
