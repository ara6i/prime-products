#!/usr/bin/env python3
"""Audit Apple Vision anchors extracted from the WEAR front RGB teachers.

The numerical gate covers every anchor record.  A bounded contact sheet can
also compare Apple joints (cyan) with the exact WEAR landmarks (red) and WEAR
body rows (yellow) without checking thousands of images one by one.
"""

from __future__ import annotations

import argparse
from collections import Counter
from datetime import datetime, timezone
import hashlib
import json
import math
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageFont


ANCHORS = ("left_shoulder", "right_shoulder", "left_hip", "right_hip")
WEAR_LANDMARKS = {
    "left_shoulder": "Lt. Acromion",
    "right_shoulder": "Rt. Acromion",
    "left_hip": "Lt. Trochanterion",
    "right_hip": "Rt. Trochanterion",
}
ROW_NAMES = ("neck", "chest", "underbust", "waist", "hips")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--anchors", type=Path, required=True)
    parser.add_argument("--manifest", type=Path, action="append", default=[])
    parser.add_argument("--image-root", type=Path)
    parser.add_argument("--report", type=Path, required=True)
    parser.add_argument("--contact-sheet", type=Path)
    parser.add_argument("--expected", type=int, default=4_326)
    parser.add_argument("--sample-count", type=int, default=36)
    return parser.parse_args()


def finite(value: Any) -> float | None:
    try:
        result = float(value)
    except (TypeError, ValueError):
        return None
    return result if math.isfinite(result) else None


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def quantiles(values: list[float]) -> dict[str, float | int | None]:
    if not values:
        return {"count": 0, "min": None, "p05": None, "p50": None, "p95": None, "max": None}
    ordered = sorted(values)

    def at(fraction: float) -> float:
        return ordered[round((len(ordered) - 1) * fraction)]

    return {
        "count": len(ordered),
        "min": round(ordered[0], 7),
        "p05": round(at(0.05), 7),
        "p50": round(at(0.50), 7),
        "p95": round(at(0.95), 7),
        "max": round(ordered[-1], 7),
    }


def load_anchors(path: Path) -> tuple[dict[str, dict[str, Any]], list[str], Counter[str]]:
    records: dict[str, dict[str, Any]] = {}
    malformed: list[str] = []
    duplicates: Counter[str] = Counter()
    with path.open("r", encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, start=1):
            if not line.strip():
                continue
            try:
                record = json.loads(line)
            except json.JSONDecodeError as error:
                malformed.append(f"line {line_number}: {error}")
                continue
            scan_id = str(record.get("scan_id") or "")
            if not scan_id:
                malformed.append(f"line {line_number}: missing scan_id")
                continue
            if scan_id in records:
                duplicates[scan_id] += 1
            records[scan_id] = record
    return records, malformed, duplicates


def load_teachers(paths: list[Path]) -> dict[str, dict[str, Any]]:
    teachers: dict[str, dict[str, Any]] = {}
    for path in paths:
        with path.open("r", encoding="utf-8") as handle:
            for line in handle:
                if not line.strip():
                    continue
                record = json.loads(line)
                view_id = str(record.get("view_id") or (record.get("camera") or {}).get("view_id") or "")
                scan_id = str(record.get("scan_id") or "")
                if view_id == "front-50" and scan_id and not record.get("error"):
                    teachers[scan_id] = record
    return teachers


def choose_samples(
    records: list[dict[str, Any]],
    teachers: dict[str, dict[str, Any]],
    count: int,
) -> list[dict[str, Any]]:
    if len(records) <= count:
        return records
    by_id = {str(record["scan_id"]): record for record in records}
    # Always show every record that needed the explicit geometry-aware retry
    # path, including the rare Apple 2D fallback, before filling the sheet with
    # ordinary gender/split/body-shape examples.
    chosen: dict[str, dict[str, Any]] = {
        str(record["scan_id"]): record
        for record in records
        if record.get("pose_method")
    }

    def select_quantiles(group: list[dict[str, Any]], key, quantity: int) -> None:
        ordered = sorted(group, key=lambda record: (key(record), str(record["scan_id"])))
        if not ordered:
            return
        for index in range(quantity):
            position = round(index * (len(ordered) - 1) / max(quantity - 1, 1))
            chosen.setdefault(str(ordered[position]["scan_id"]), ordered[position])

    # Six gender/split cells guarantee held-out and body-diverse evidence.
    # BMI and Apple hip span then cover both profile and visible-shape ranges.
    for gender in ("female", "male"):
        for role in ("train", "validation", "test"):
            group = [
                record
                for record in records
                if (teachers.get(str(record["scan_id"])) or {}).get("gender") == gender
                and (teachers.get(str(record["scan_id"])) or {}).get("role") == role
            ]
            select_quantiles(group, lambda record: finite((teachers[str(record["scan_id"])].get("bmi"))) or 0.0, 3)
            select_quantiles(
                group,
                lambda record: abs(
                    float(record["anchors"]["right_hip"]["x_norm"])
                    - float(record["anchors"]["left_hip"]["x_norm"])
                ),
                3,
            )

    # Quantile collisions are expected. Fill any remaining slots across scan
    # IDs so the sheet also spans the original source ordering/chunks.
    remaining = [record for scan_id, record in sorted(by_id.items()) if scan_id not in chosen]
    if remaining and len(chosen) < count:
        needed = count - len(chosen)
        select_quantiles(remaining, lambda record: str(record["scan_id"]), needed)
    return list(chosen.values())[:count]


def image_path(record: dict[str, Any], image_root: Path) -> Path:
    relative = str(record.get("image") or "")
    direct = image_root / relative
    if direct.exists():
        return direct
    matches = list(image_root.rglob(Path(relative).name))
    if len(matches) != 1:
        raise FileNotFoundError(f"Cannot resolve {relative!r} below {image_root}")
    return matches[0]


def draw_contact_sheet(
    selected: list[dict[str, Any]],
    teachers: dict[str, dict[str, Any]],
    image_root: Path,
    output: Path,
) -> None:
    cell_width, cell_height = 280, 420
    columns = 6
    rows = math.ceil(len(selected) / columns)
    sheet = Image.new("RGB", (columns * cell_width, rows * cell_height), (18, 24, 35))
    font = ImageFont.load_default()
    for index, record in enumerate(selected):
        source = Image.open(image_path(record, image_root)).convert("RGB")
        scale = min((cell_width - 12) / source.width, (cell_height - 34) / source.height)
        width, height = round(source.width * scale), round(source.height * scale)
        source = source.resize((width, height), Image.Resampling.LANCZOS)
        canvas = Image.new("RGB", (cell_width, cell_height), (18, 24, 35))
        left = (cell_width - width) // 2
        top = 22
        canvas.paste(source, (left, top))
        draw = ImageDraw.Draw(canvas)
        draw.text((6, 5), str(record["scan_id"]), fill=(240, 245, 255), font=font)

        def point(x: float, y: float) -> tuple[float, float]:
            return left + x * width, top + y * height

        anchors = record["anchors"]
        for side in ("left", "right"):
            shoulder = anchors[f"{side}_shoulder"]
            hip = anchors[f"{side}_hip"]
            draw.line((*point(shoulder["x_norm"], shoulder["y_norm"]), *point(hip["x_norm"], hip["y_norm"])), fill=(38, 215, 255), width=2)
        for anchor_name in ANCHORS:
            anchor = anchors[anchor_name]
            x, y = point(anchor["x_norm"], anchor["y_norm"])
            draw.ellipse((x - 4, y - 4, x + 4, y + 4), fill=(38, 215, 255), outline=(255, 255, 255), width=1)

        teacher = teachers.get(str(record["scan_id"]))
        if teacher:
            for landmark_name in WEAR_LANDMARKS.values():
                landmark = (teacher.get("landmarks_2d") or {}).get(landmark_name) or {}
                x, y = finite(landmark.get("x")), finite(landmark.get("y"))
                if landmark.get("visible") is True and x is not None and y is not None:
                    px, py = point(x, y)
                    draw.rectangle((px - 3, py - 3, px + 3, py + 3), fill=(255, 55, 72))
            for row_name in ROW_NAMES:
                row = (teacher.get("rows") or {}).get(row_name) or {}
                y = finite(row.get("y_norm"))
                left_x = finite(row.get("wear_edge_left_x_norm"))
                right_x = finite(row.get("wear_edge_right_x_norm"))
                if y is not None and left_x is not None and right_x is not None and right_x > left_x:
                    draw.line((*point(left_x, y), *point(right_x, y)), fill=(255, 212, 45), width=2)
        sheet.paste(canvas, ((index % columns) * cell_width, (index // columns) * cell_height))
    output.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output, optimize=True)


def main() -> None:
    args = parse_args()
    anchors, malformed, duplicates = load_anchors(args.anchors)
    teachers = load_teachers(args.manifest)
    accepted: list[dict[str, Any]] = []
    rejected: list[str] = []
    invalid: list[dict[str, Any]] = []
    distributions: dict[str, list[float]] = {
        "shoulder_span": [],
        "hip_span": [],
        "torso_height": [],
        "shoulder_slope": [],
        "hip_slope": [],
        "vision_input_scale": [],
    }
    deltas: dict[str, list[float]] = {
        f"{anchor_name}_{axis}": []
        for anchor_name in ANCHORS
        for axis in ("x", "y")
    }

    for scan_id, record in anchors.items():
        reasons: list[str] = []
        if record.get("accepted") is not True:
            rejected.append(scan_id)
            continue
        points: dict[str, tuple[float, float]] = {}
        for anchor_name in ANCHORS:
            anchor = (record.get("anchors") or {}).get(anchor_name) or {}
            x, y = finite(anchor.get("x_norm")), finite(anchor.get("y_norm"))
            if x is None or y is None or not 0.0 <= x <= 1.0 or not 0.0 <= y <= 1.0:
                reasons.append(f"{anchor_name}: invalid coordinate")
            else:
                points[anchor_name] = (x, y)
        if len(points) == 4:
            input_scale = finite(record.get("vision_input_scale"))
            if input_scale is not None:
                distributions["vision_input_scale"].append(input_scale)
            shoulder_direction = points["right_shoulder"][0] - points["left_shoulder"][0]
            hip_direction = points["right_hip"][0] - points["left_hip"][0]
            shoulder_span = abs(shoulder_direction)
            hip_span = abs(hip_direction)
            shoulder_y = (points["left_shoulder"][1] + points["right_shoulder"][1]) * 0.5
            hip_y = (points["left_hip"][1] + points["right_hip"][1]) * 0.5
            shoulder_center = (points["left_shoulder"][0] + points["right_shoulder"][0]) * 0.5
            hip_center = (points["left_hip"][0] + points["right_hip"][0]) * 0.5
            torso_height = hip_y - shoulder_y
            shoulder_slope = points["right_shoulder"][1] - points["left_shoulder"][1]
            hip_slope = points["right_hip"][1] - points["left_hip"][1]
            if not 0.04 <= shoulder_span <= 0.75:
                reasons.append(f"shoulder span {shoulder_span:.4f} outside broad body bounds")
            if not 0.04 <= hip_span <= 0.75:
                reasons.append(f"hip span {hip_span:.4f} outside broad body bounds")
            if not 0.08 <= torso_height <= 0.70:
                reasons.append(f"torso height {torso_height:.4f} outside broad body bounds")
            if shoulder_direction * hip_direction <= 0:
                reasons.append("Apple shoulder and hip left/right directions cross")
            if abs(shoulder_slope) > 0.12 or abs(hip_slope) > 0.12:
                reasons.append("Apple shoulder/hip slope is implausibly large")
            if abs(hip_center - shoulder_center) > 0.20:
                reasons.append("Apple shoulder and hip centres are implausibly displaced")
            for key, value in (
                ("shoulder_span", shoulder_span),
                ("hip_span", hip_span),
                ("torso_height", torso_height),
                ("shoulder_slope", shoulder_slope),
                ("hip_slope", hip_slope),
            ):
                distributions[key].append(value)
        if reasons:
            invalid.append({"scan_id": scan_id, "reasons": reasons})
            continue
        accepted.append(record)

        teacher = teachers.get(scan_id)
        if teacher:
            landmarks = teacher.get("landmarks_2d") or {}
            for anchor_name, landmark_name in WEAR_LANDMARKS.items():
                apple = record["anchors"][anchor_name]
                wear = landmarks.get(landmark_name) or {}
                x, y = finite(wear.get("x")), finite(wear.get("y"))
                if wear.get("visible") is True and x is not None and y is not None:
                    deltas[f"{anchor_name}_x"].append(float(apple["x_norm"]) - x)
                    deltas[f"{anchor_name}_y"].append(float(apple["y_norm"]) - y)

    missing_teacher_anchors = sorted(set(teachers) - set(anchors))
    selected = choose_samples(
        [record for record in accepted if record["scan_id"] in teachers],
        teachers,
        args.sample_count,
    )
    if args.contact_sheet:
        if not args.image_root:
            raise RuntimeError("--image-root is required with --contact-sheet")
        if not selected:
            raise RuntimeError("No accepted Apple/WEAR pairs are available for the contact sheet")
        draw_contact_sheet(selected, teachers, args.image_root, args.contact_sheet)

    failures: list[str] = []
    if malformed:
        failures.append(f"{len(malformed)} malformed JSONL records")
    if len(anchors) != args.expected:
        failures.append(f"unique scan count {len(anchors)} != required {args.expected}")
    if rejected:
        failures.append(f"{len(rejected)} Apple Vision detections rejected")
    if invalid:
        failures.append(f"{len(invalid)} accepted detections fail geometry bounds")
    if missing_teacher_anchors:
        failures.append(f"{len(missing_teacher_anchors)} supplied teacher scans have no Apple anchor")

    report = {
        "schema_version": 1,
        "created_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "anchors_sha256": sha256(args.anchors),
        "teacher_manifest_sha256": sha256(args.manifest[0]) if len(args.manifest) == 1 else None,
        "expected_scans": args.expected,
        "unique_scans": len(anchors),
        "accepted_scans": len(accepted),
        "rejected_scans": len(rejected),
        "invalid_geometry_scans": len(invalid),
        "malformed_records": len(malformed),
        "duplicate_history": {key: value for key, value in duplicates.items()},
        "teacher_comparison_scans": len(set(teachers) & set(anchors)),
        "contact_sheet_samples": [record["scan_id"] for record in selected],
        "contact_sheet_sha256": sha256(args.contact_sheet) if args.contact_sheet else None,
        "geometry_distributions": {key: quantiles(values) for key, values in distributions.items()},
        "apple_minus_wear_landmark_deltas": {key: quantiles(values) for key, values in deltas.items()},
        "examples": {
            "rejected": rejected[:20],
            "invalid": invalid[:20],
            "malformed": malformed[:20],
            "missing_teacher_anchors": missing_teacher_anchors[:20],
        },
        "passed": not failures,
        "failures": failures,
        "meaning": "Apple Vision shoulder/hip joints are measured on WEAR front RGB teachers; no guessed WEAR-to-Apple correction formula is used.",
    }
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "passed": report["passed"],
        "unique_scans": report["unique_scans"],
        "accepted_scans": report["accepted_scans"],
        "teacher_comparison_scans": report["teacher_comparison_scans"],
        "failures": failures,
    }))
    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
