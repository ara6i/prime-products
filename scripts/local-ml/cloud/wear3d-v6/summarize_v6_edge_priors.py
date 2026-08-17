#!/usr/bin/env python3
"""Summarize front-view WEAR row spans relative to named body landmarks.

Reads the full render JSONL from stdin so the 841 MB manifest does not need to
be copied onto the Mac. The output is diagnostic evidence for torso-only edge
constraints; it is not a circumference formula or a runtime model.
"""

from __future__ import annotations

from collections import defaultdict
import json
import math
import statistics
import sys
from typing import Any


ROW_ANCHORS = {
    "neck": ("Lt. Acromion", "Rt. Acromion"),
    "chest": ("Lt. Acromion", "Rt. Acromion"),
    "underbust": ("Lt. Acromion", "Rt. Acromion"),
    "waist": ("Lt. Trochanterion", "Rt. Trochanterion"),
    "hips": ("Lt. Trochanterion", "Rt. Trochanterion"),
}


def finite(value: object) -> float | None:
    if isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(float(value)):
        return float(value)
    return None


def projected_x(landmarks: dict[str, Any], name: str) -> float | None:
    point = landmarks.get(name)
    if not isinstance(point, dict) or point.get("visible") is not True:
        return None
    return finite(point.get("x"))


def percentile(values: list[float], fraction: float) -> float:
    ordered = sorted(values)
    if not ordered:
        return float("nan")
    position = fraction * (len(ordered) - 1)
    lower = int(math.floor(position))
    upper = int(math.ceil(position))
    if lower == upper:
        return ordered[lower]
    weight = position - lower
    return ordered[lower] * (1.0 - weight) + ordered[upper] * weight


def bmi_bin(value: float) -> str:
    if value < 18.5:
        return "under-18.5"
    if value < 25.0:
        return "18.5-24.9"
    if value < 30.0:
        return "25.0-29.9"
    if value < 35.0:
        return "30.0-34.9"
    return "35-plus"


def main() -> None:
    ratios: dict[tuple[str, str, str], list[float]] = defaultdict(list)
    spans: dict[tuple[str, str, str], list[float]] = defaultdict(list)
    records = 0
    for line in sys.stdin:
        if not line.strip():
            continue
        record = json.loads(line)
        if record.get("view_id") != "front-50":
            continue
        gender = str(record.get("gender") or "unknown")
        bmi = finite(record.get("bmi"))
        if bmi is None:
            continue
        landmarks = record.get("landmarks_2d") or {}
        rows = record.get("rows") or {}
        records += 1
        for row_name, (left_name, right_name) in ROW_ANCHORS.items():
            row = rows.get(row_name)
            if not isinstance(row, dict) or row.get("accepted") is not True:
                continue
            left = finite(row.get("wear_edge_left_x_norm"))
            right = finite(row.get("wear_edge_right_x_norm"))
            anchor_left = projected_x(landmarks, left_name)
            anchor_right = projected_x(landmarks, right_name)
            if None in (left, right, anchor_left, anchor_right):
                continue
            row_span = abs(right - left)
            anchor_span = abs(anchor_right - anchor_left)
            if row_span <= 0.01 or anchor_span <= 0.01:
                continue
            key = (gender, bmi_bin(bmi), row_name)
            ratios[key].append(row_span / anchor_span)
            spans[key].append(row_span)

    groups = []
    for key in sorted(ratios):
        values = ratios[key]
        row_spans = spans[key]
        groups.append({
            "gender": key[0],
            "bmi_bin": key[1],
            "row": key[2],
            "count": len(values),
            "ratio": {
                "p01": round(percentile(values, 0.01), 5),
                "p05": round(percentile(values, 0.05), 5),
                "median": round(statistics.median(values), 5),
                "p95": round(percentile(values, 0.95), 5),
                "p99": round(percentile(values, 0.99), 5),
            },
            "row_span_norm": {
                "p05": round(percentile(row_spans, 0.05), 5),
                "median": round(statistics.median(row_spans), 5),
                "p95": round(percentile(row_spans, 0.95), 5),
            },
        })
    print(json.dumps({"front_view_records": records, "groups": groups}, indent=2))


if __name__ == "__main__":
    main()
