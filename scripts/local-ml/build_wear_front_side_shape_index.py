#!/usr/bin/env python3
"""Build a compact, tape-blind cross-section search index from WEAR labels.

The source render manifest was produced from the real standing PLY meshes.  We
keep one canonical front record per person because each row already contains
the mesh-derived lateral breadth, front-to-back depth and normalized 32-point
cross-section.  Recorded tape values are kept in a separate reveal-only object
and must never enter ranking.
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
DEFAULT_SOURCE = ROOT / ".local-ml/v6r5-apple-pose/render-manifest-all.jsonl"
DEFAULT_OUTPUT = ROOT / ".local-ml/wear-mesh-overlay/all-wear-shape-index.json"
DEFAULT_HELDOUT = ROOT / ".local-ml/wear-sdk-heldout/index.json"
RENDER_ROWS = ("neck", "chest", "waist", "hips")
ALL_ROWS = ("neck", "chest", "underbust", "waist", "hips")
LANDMARK_SEGMENTS = {
    "shoulders": ("Lt. Acromion", "Rt. Acromion"),
    "left_upper_arm": ("Lt. Acromion", "Lt. Olecranon"),
    "right_upper_arm": ("Rt. Acromion", "Rt. Olecranon"),
    "left_forearm": ("Lt. Olecranon", "Lt. Radial Styloid"),
    "right_forearm": ("Rt. Olecranon", "Rt. Radial Styloid"),
    "left_thigh": ("Lt. Trochanterion", "Lt. Knee Crease"),
    "right_thigh": ("Rt. Trochanterion", "Rt. Knee Crease"),
    "left_lower_leg": ("Lt. Knee Crease", "Lt. Lateral Malleolus"),
    "right_lower_leg": ("Rt. Knee Crease", "Rt. Lateral Malleolus"),
    "left_foot": ("Lt. Calcaneous, Post.", "Lt. Digit II"),
    "right_foot": ("Rt. Calcaneous, Post.", "Rt. Digit II"),
}
MAX_GEOMETRY_TAPE_DELTA_PERCENT = 2.0


def finite(value: Any) -> float | None:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if math.isfinite(number) else None


def compact_row(row: dict[str, Any]) -> dict[str, Any] | None:
    breadth_mm = finite(row.get("mesh_width_mm"))
    depth_mm = finite(row.get("mesh_depth_mm"))
    points = row.get("contour_points_normalized")
    if not row.get("accepted") or breadth_mm is None or depth_mm is None:
        return None
    if breadth_mm <= 0 or depth_mm <= 0 or not isinstance(points, list) or len(points) < 16:
        return None
    contour: list[list[float]] = []
    for point in points:
        if not isinstance(point, list) or len(point) != 2:
            return None
        x = finite(point[0])
        y = finite(point[1])
        if x is None or y is None:
            return None
        contour.append([round(x, 6), round(y, 6)])
    tape_mm = finite(row.get("measurement_circumference_mm"))
    perimeter_delta_percent = finite(row.get("perimeter_delta_to_measurement_pct"))
    raw_slice_closed = row.get("raw_slice_closed") is True
    perimeter_consistent = row.get("perimeter_consistent_with_tape") is True
    quality_eligible = (
        raw_slice_closed
        and perimeter_consistent
        and perimeter_delta_percent is not None
        and abs(perimeter_delta_percent) <= MAX_GEOMETRY_TAPE_DELTA_PERCENT
    )
    return {
        "breadthCm": round(breadth_mm / 10.0, 4),
        "depthCm": round(depth_mm / 10.0, 4),
        "breadthBodyHeight": None,
        "depthBodyHeight": None,
        "heightFractionFromFeet": None,
        "contour32Normalized": contour,
        "quality": {
            "eligibleForCircumferenceShapeMatch": quality_eligible,
            "rawSliceClosed": raw_slice_closed,
            "perimeterConsistentWithTape": perimeter_consistent,
            "perimeterDeltaPercent": None if perimeter_delta_percent is None else round(perimeter_delta_percent, 4),
            "maximumAllowedDeltaPercent": MAX_GEOMETRY_TAPE_DELTA_PERCENT,
            "tapeRole": "quality gate only; never used for ranking or scoring",
        },
        "revealedAfterRank": {
            "recordedTapeCm": None if tape_mm is None else round(tape_mm / 10.0, 3),
        },
    }


def compact_heldout_underbust(person: dict[str, Any]) -> dict[str, Any] | None:
    source = (person.get("rows") or {}).get("underbust") or {}
    breadth_cm = finite(source.get("frontWidthCm"))
    depth_cm = finite(source.get("depthCm"))
    points = source.get("contour32Normalized")
    height_cm = finite(person.get("heightCm"))
    if not source.get("geometryValid") or breadth_cm is None or depth_cm is None or height_cm is None:
        return None
    if not isinstance(points, list) or len(points) < 16:
        return None
    contour: list[list[float]] = []
    for point in points:
        if not isinstance(point, list) or len(point) != 2:
            return None
        x, y = finite(point[0]), finite(point[1])
        if x is None or y is None:
            return None
        contour.append([round(x, 6), round(y, 6)])
    height_value = finite(source.get("heightFractionFromFeet"))
    height_fraction = None
    if height_value is not None:
        height_fraction = height_value if height_value <= 1 else height_value / (height_cm * 10.0)
    reveal = person.get("revealOnly") or {}
    row_reveal = (reveal.get("rowTapeAndCircumferenceCm") or {}).get("underbust") or {}
    tape_cm = finite(row_reveal.get("tape"))
    quality = source.get("quality") or {}
    return {
        "breadthCm": round(breadth_cm, 4),
        "depthCm": round(depth_cm, 4),
        "breadthBodyHeight": round(breadth_cm / height_cm, 8),
        "depthBodyHeight": round(depth_cm / height_cm, 8),
        "heightFractionFromFeet": None if height_fraction is None else round(height_fraction, 8),
        "contour32Normalized": contour,
        "quality": {
            "eligibleForCircumferenceShapeMatch": bool(
                quality.get("rawSliceClosed") and quality.get("perimeterConsistentWithTape")
            ),
            "rawSliceClosed": quality.get("rawSliceClosed") is True,
            "perimeterConsistentWithTape": quality.get("perimeterConsistentWithTape") is True,
            "perimeterDeltaPercent": None,
            "maximumAllowedDeltaPercent": MAX_GEOMETRY_TAPE_DELTA_PERCENT,
            "tapeRole": "reveal only; never used for ranking or scoring",
            "source": "held-out WEAR under-bust geometry",
        },
        "revealedAfterRank": {"recordedTapeCm": None if tape_cm is None else round(tape_cm, 3)},
    }


def load_heldout_underbust(path: Path) -> dict[str, dict[str, Any]]:
    if not path.exists():
        return {}
    payload = json.loads(path.read_text())
    result: dict[str, dict[str, Any]] = {}
    for person in payload.get("people") or []:
        scan_id = str(person.get("scanId") or "")
        row = compact_heldout_underbust(person)
        if scan_id and row is not None:
            result[scan_id] = row
    return result


def point_2d(value: Any) -> tuple[float, float] | None:
    if not isinstance(value, dict) or value.get("visible") is False:
        return None
    x, y = finite(value.get("x")), finite(value.get("y"))
    return None if x is None or y is None else (x, y)


def landmark_segment_index(record: dict[str, Any]) -> dict[str, dict[str, Any]]:
    """Visible 2D landmark lengths.  These are not circumference slices."""
    landmarks = record.get("landmarks_2d") or {}
    points = [point_2d(value) for value in landmarks.values()]
    visible = [point for point in points if point is not None]
    if len(visible) < 2:
        return {}
    body_height = max(point[1] for point in visible) - min(point[1] for point in visible)
    if body_height <= 0:
        return {}
    result: dict[str, dict[str, Any]] = {}
    for name, (start_name, end_name) in LANDMARK_SEGMENTS.items():
        start, end = point_2d(landmarks.get(start_name)), point_2d(landmarks.get(end_name))
        if start is None or end is None:
            continue
        ratio = math.hypot(end[0] - start[0], end[1] - start[1]) / body_height
        if ratio > 0:
            result[name] = {
                "lengthBodyHeight": round(ratio, 8),
                "source": f"WEAR 2D landmarks: {start_name} to {end_name}",
            }
    # The source manifest gives these paths directly. Keep the sum of their
    # 2D pieces, still normalized by visible body height. These are visible
    # landmark paths, not body-surface or tape lengths.
    for segment_name, source_name in (
        ("left_sleeve", "left_sleeve"),
        ("right_sleeve", "right_sleeve"),
        ("left_inseam", "left_inseam"),
        ("right_inseam", "right_inseam"),
        ("shoulder_path", "shoulders"),
    ):
        path = (record.get("segments") or {}).get(source_name) or []
        path_points = [point_2d(point) for point in path]
        if len(path_points) >= 2 and all(point is not None for point in path_points):
            length = sum(math.dist(path_points[index - 1], path_points[index]) for index in range(1, len(path_points)))
            if length > 0:
                result[segment_name] = {
                    "lengthBodyHeight": round(length / body_height, 8),
                    "source": {
                        "left_sleeve": "WEAR 2D landmarks: left Acromion to wrist via elbow",
                        "right_sleeve": "WEAR 2D landmarks: right Acromion to wrist via elbow",
                        "left_inseam": "WEAR 2D landmarks: Crotch to left ankle",
                        "right_inseam": "WEAR 2D landmarks: Crotch to right ankle",
                        "shoulder_path": "WEAR 2D landmarks: Acromion to Acromion",
                    }[segment_name],
                }
    return result


def build(source: Path, heldout: Path = DEFAULT_HELDOUT) -> dict[str, Any]:
    people: list[dict[str, Any]] = []
    rejected = 0
    seen: set[str] = set()
    underbust_by_scan = load_heldout_underbust(heldout)
    with source.open() as handle:
        for line in handle:
            record = json.loads(line)
            if record.get("view_id") != "front-50":
                continue
            scan_id = str(record.get("scan_id") or "")
            if not scan_id or scan_id in seen:
                rejected += 1
                continue
            seen.add(scan_id)
            height_cm = finite(record.get("height_cm"))
            weight_kg = finite(record.get("weight_kg"))
            gender = str(record.get("gender") or "").lower()
            rows = record.get("rows") or {}
            compact = {name: compact_row(rows.get(name) or {}) for name in RENDER_ROWS}
            if scan_id in underbust_by_scan:
                compact["underbust"] = underbust_by_scan[scan_id]
            if (
                height_cm is None
                or weight_kg is None
                or height_cm <= 0
                or weight_kg <= 0
                or gender not in {"female", "male"}
                or any(compact[name] is None for name in ("waist", "hips"))
            ):
                rejected += 1
                continue
            compact = {name: row for name, row in compact.items() if row is not None}
            for name, row in compact.items():
                row["breadthBodyHeight"] = round(row["breadthCm"] / height_cm, 8)
                row["depthBodyHeight"] = round(row["depthCm"] / height_cm, 8)
                if name in rows:
                    source_row = rows[name]
                    slice_height_mm = finite(source_row.get("slice_height_mm"))
                    row["heightFractionFromFeet"] = None if slice_height_mm is None else round(
                        slice_height_mm / (height_cm * 10.0), 8
                    )
            people.append({
                "scanId": scan_id,
                "subjectId": str(record.get("subject_id") or scan_id.removesuffix("-A")),
                "gender": gender,
                "heightCm": round(height_cm, 3),
                "weightKg": round(weight_kg, 3),
                "rows": compact,
                "landmarkSegments": landmark_segment_index(record),
            })
    people.sort(key=lambda item: item["scanId"])
    try:
        source_label = str(source.relative_to(ROOT))
    except ValueError:
        source_label = str(source)
    return {
        "schemaVersion": "wear-front-side-cross-section-search/v4",
        "source": source_label,
        "canonicalView": "front-50",
        "personCount": len(people),
        "rejectedCount": rejected,
        "rankingInputs": [
            "gender",
            "selected anatomical row breadth/body-height",
            "selected anatomical row depth/body-height",
        ],
        "optionalGateInputs": ["height", "weight"],
        "forbiddenRankingInputs": ["recorded tape", "circumference", "saved Delaram result"],
        "qualityGate": {
            "requiresRawClosedLoop": True,
            "requiresPerimeterConsistency": True,
            "maximumMeshVsTapeDeltaPercent": MAX_GEOMETRY_TAPE_DELTA_PERCENT,
            "recordedTapeRole": "exclude unreliable geometry only; never rank a person",
        },
        "parts": {
            name: {
                "candidateCount": sum(name in person["rows"] for person in people),
                "mode": "front + side cross-section",
            }
            for name in ALL_ROWS
        },
        "landmarkParts": {
            name: {
                "candidateCount": sum(name in person["landmarkSegments"] for person in people),
                "mode": "visible front 2D landmark length; not a circumference row",
            }
            for name in tuple(LANDMARK_SEGMENTS) + (
                "left_sleeve", "right_sleeve", "left_inseam", "right_inseam", "shoulder_path",
            )
        },
        "people": people,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--heldout", type=Path, default=DEFAULT_HELDOUT)
    args = parser.parse_args()
    payload = build(args.source, args.heldout)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, separators=(",", ":")) + "\n")
    print(json.dumps({
        "output": str(args.output),
        "personCount": payload["personCount"],
        "rejectedCount": payload["rejectedCount"],
    }))


if __name__ == "__main__":
    main()
