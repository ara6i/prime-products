#!/usr/bin/env python3
"""Audit what the waist/hip network should learn versus calculate exactly.

This audit is intentionally tape-blind.  It proves three contracts on approved
canonical WEAR cards:

1. the 32 PLY points have one stable start and winding convention;
2. after the anatomical row is known, the visible central torso endpoints can
   be read directly from the rendered mesh mask instead of predicted;
3. the metric scale implied by the exact PLY row is physically compatible with
   the recorded Blender camera.

It writes a small visual sheet so a bulk CPU run cannot start from a hidden
geometry assumption.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image, ImageDraw, ImageFont


ROWS = ("waist", "hips")
ROW_COLORS = {"waist": "#22d3ee", "hips": "#34d399"}
TRUTH_COLOR = "#fb923c"
CALCULATED_COLOR = "#f8fafc"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--manifest",
        type=Path,
        default=Path(".local-ml/wear3d-v8-teacher-canary/ten-final-v2/render-manifest.jsonl"),
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path(".local-ml/reports/wear3d-waist-hips-spatial-contract-v1"),
    )
    return parser.parse_args()


def resolve_artifact(raw: str, manifest: Path) -> Path:
    path = Path(raw)
    for candidate in (path, Path.cwd() / path, manifest.parent / path.name):
        if candidate.exists():
            return candidate.resolve()
    raise FileNotFoundError(raw)


def polygon_area(points: np.ndarray) -> float:
    return float(
        0.5
        * np.sum(
            points[:, 0] * np.roll(points[:, 1], -1)
            - np.roll(points[:, 0], -1) * points[:, 1]
        )
    )


def runs(row: np.ndarray) -> list[tuple[int, int]]:
    padded = np.pad(row.astype(np.int8), (1, 1))
    changes = np.diff(padded)
    starts = np.flatnonzero(changes == 1)
    ends = np.flatnonzero(changes == -1) - 1
    return [(int(left), int(right)) for left, right in zip(starts, ends, strict=True)]


def central_run(mask: np.ndarray, y_px: float) -> tuple[float, float, int]:
    """Return the central torso run at a row, robust to one-pixel raster gaps."""
    height, width = mask.shape
    y0 = int(np.clip(round(y_px), 0, height - 1))
    center = (width - 1) * 0.5
    candidates: list[tuple[float, float, int, float]] = []
    for offset in (0, -1, 1, -2, 2):
        y = int(np.clip(y0 + offset, 0, height - 1))
        for left, right in runs(mask[y]):
            span = right - left + 1
            if span < width * 0.05:
                continue
            contains_center = left <= center <= right
            distance = 0.0 if contains_center else min(abs(center - left), abs(center - right))
            # Prefer the body run containing the canonical camera center, then
            # the closest row and widest run.  Arms are separate lateral runs.
            score = (0.0 if contains_center else 1_000.0) + distance + abs(offset) * 4.0 - span * 0.01
            candidates.append((float(left), float(right), y, score))
    if not candidates:
        raise RuntimeError(f"No central body run near y={y_px:.2f}")
    left, right, y, _ = min(candidates, key=lambda value: value[3])
    return left, right, y


def load_mask(path: Path) -> np.ndarray:
    with Image.open(path) as image:
        rgba = np.asarray(image.convert("RGBA"), dtype=np.uint8)
    return (rgba[..., 3] > 127) & (rgba[..., :3].max(axis=2) > 127)


def summarize(values: list[float]) -> dict[str, float | int | None]:
    if not values:
        return {"count": 0, "mae": None, "p95": None, "max": None}
    array = np.asarray(values, dtype=np.float64)
    return {
        "count": int(len(array)),
        "mae": round(float(np.mean(np.abs(array))), 6),
        "p95": round(float(np.quantile(np.abs(array), 0.95)), 6),
        "max": round(float(np.max(np.abs(array))), 6),
    }


def audit_card(source: dict[str, Any], manifest: Path) -> dict[str, Any]:
    mask_path = resolve_artifact(str(source["mask"]), manifest)
    mesh_path = resolve_artifact(str(source["mesh_image"]), manifest)
    mask = load_mask(mask_path)
    height, width = mask.shape
    camera = source.get("camera") or {}
    fx = float(camera.get("focal_x_px") or 0.0)
    camera_distance = float(camera.get("distance_m") or 0.0)
    occupied_y = np.flatnonzero(mask.any(axis=1))
    visible_body_height_px = float(occupied_y[-1] - occupied_y[0]) if len(occupied_y) else 0.0
    known_height_cm = float(source.get("height_cm") or 0.0)
    rows_out: dict[str, Any] = {}
    for row_name in ROWS:
        row = (source.get("rows") or {}).get(row_name) or {}
        y_norm = float(row["y_norm"])
        truth_left = float(row["wear_edge_left_x_norm"]) * (width - 1)
        truth_right = float(row["wear_edge_right_x_norm"]) * (width - 1)
        calculated_left, calculated_right, sampled_y = central_run(mask, y_norm * (height - 1))
        truth_span = truth_right - truth_left
        calculated_span = calculated_right - calculated_left
        breadth_cm = float(row["mesh_width_mm"]) / 10.0
        implied_distance = breadth_cm / max(truth_span, 1e-6) * fx / 100.0 if fx > 0 else None
        height_scale_breadth = (
            calculated_span * known_height_cm / visible_body_height_px
            if visible_body_height_px > 0.0 and known_height_cm > 0.0
            else None
        )
        flat_camera_breadth = (
            calculated_span * camera_distance / fx * 100.0
            if fx > 0.0 and camera_distance > 0.0
            else None
        )
        contour = np.asarray(row["contour_points_normalized"], dtype=np.float64)
        area = polygon_area(contour)
        start_is_left = int(np.argmin(contour[:, 0])) == 0
        right_is_halfway = abs(int(np.argmax(contour[:, 0])) - len(contour) // 2) <= 1
        lower_quarter = int(np.argmin(contour[:, 1]))
        upper_quarter = int(np.argmax(contour[:, 1]))
        positive_edges = np.linalg.norm(np.roll(contour, -1, axis=0) - contour, axis=1)
        shape_contract = (
            contour.shape == (32, 2)
            and np.isfinite(contour).all()
            and area > 0.0
            and start_is_left
            and 13 <= int(np.argmax(contour[:, 0])) <= 18
            and float(positive_edges.min()) > 1e-5
        )
        rows_out[row_name] = {
            "teacherYpx": round(y_norm * (height - 1), 4),
            "sampledMaskYpx": sampled_y,
            "teacherLeftPx": round(truth_left, 4),
            "teacherRightPx": round(truth_right, 4),
            "calculatedLeftPx": round(calculated_left, 4),
            "calculatedRightPx": round(calculated_right, 4),
            "leftErrorPx": round(calculated_left - truth_left, 4),
            "rightErrorPx": round(calculated_right - truth_right, 4),
            "spanErrorPx": round(calculated_span - truth_span, 4),
            "breadthCm": round(breadth_cm, 4),
            "heightScaleBreadthCm": round(float(height_scale_breadth), 4) if height_scale_breadth is not None else None,
            "heightScaleBreadthErrorCm": round(float(height_scale_breadth - breadth_cm), 4) if height_scale_breadth is not None else None,
            "flatCameraBreadthCm": round(float(flat_camera_breadth), 4) if flat_camera_breadth is not None else None,
            "flatCameraBreadthErrorCm": round(float(flat_camera_breadth - breadth_cm), 4) if flat_camera_breadth is not None else None,
            "cameraDistanceM": round(camera_distance, 5),
            "impliedRowDistanceM": round(float(implied_distance), 5) if implied_distance is not None else None,
            "impliedDistanceErrorM": (
                round(float(implied_distance - camera_distance), 5)
                if implied_distance is not None
                else None
            ),
            "shapeContractPassed": bool(shape_contract),
            "shapeSignedArea": round(area, 6),
            "shapeStartIndex": int(np.argmin(contour[:, 0])),
            "shapeRightIndex": int(np.argmax(contour[:, 0])),
            "shapeLowerIndex": lower_quarter,
            "shapeUpperIndex": upper_quarter,
        }
    return {
        "scanId": source["scan_id"],
        "meshPath": str(mesh_path),
        "maskPath": str(mask_path),
        "width": width,
        "height": height,
        "visibleBodyHeightPx": visible_body_height_px,
        "rows": rows_out,
    }


def make_sheet(cards: list[dict[str, Any]], output: Path) -> None:
    font = ImageFont.load_default()
    card_w, card_h, columns = 590, 350, 2
    rows_count = (len(cards) + columns - 1) // columns
    sheet = Image.new("RGB", (card_w * columns, card_h * rows_count), "#050b18")
    for index, card in enumerate(cards):
        canvas = Image.new("RGB", (card_w, card_h), "#0c1729")
        draw = ImageDraw.Draw(canvas)
        with Image.open(card["meshPath"]) as image:
            body = image.convert("RGB")
        body.thumbnail((250, 310), getattr(Image, "Resampling", Image).LANCZOS)
        bx, by = 10, 30
        canvas.paste(body, (bx, by))
        x_scale = body.width / card["width"]
        y_scale = body.height / card["height"]
        for row_name in ROWS:
            row = card["rows"][row_name]
            y_truth = by + row["teacherYpx"] * y_scale
            y_calc = by + row["sampledMaskYpx"] * y_scale
            draw.line(
                (
                    bx + row["teacherLeftPx"] * x_scale,
                    y_truth,
                    bx + row["teacherRightPx"] * x_scale,
                    y_truth,
                ),
                fill=TRUTH_COLOR,
                width=4,
            )
            draw.line(
                (
                    bx + row["calculatedLeftPx"] * x_scale,
                    y_calc,
                    bx + row["calculatedRightPx"] * x_scale,
                    y_calc,
                ),
                fill=CALCULATED_COLOR,
                width=2,
            )
        draw.text((10, 8), f"{card['scanId']} · orange teacher · white calculated boundary", fill="white", font=font)
        tx = 275
        for row_index, row_name in enumerate(ROWS):
            row = card["rows"][row_name]
            top = 50 + row_index * 125
            draw.text((tx, top), row_name.upper(), fill=ROW_COLORS[row_name], font=font)
            draw.text((tx, top + 18), f"left error {row['leftErrorPx']:+.2f} px", fill="white", font=font)
            draw.text((tx, top + 34), f"right error {row['rightErrorPx']:+.2f} px", fill="white", font=font)
            draw.text((tx, top + 50), f"span error {row['spanErrorPx']:+.2f} px", fill="white", font=font)
            draw.text((tx, top + 66), f"shape order {'PASS' if row['shapeContractPassed'] else 'FAIL'}", fill="white", font=font)
            draw.text((tx, top + 82), f"height-scale width error {row['heightScaleBreadthErrorCm']:+.2f} cm", fill="white", font=font)
            draw.text((tx, top + 98), f"camera-flat width error {row['flatCameraBreadthErrorCm']:+.2f} cm", fill="white", font=font)
        sheet.paste(canvas, ((index % columns) * card_w, (index // columns) * card_h))
    output.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output, quality=94)


def main() -> None:
    args = parse_args()
    sources = [json.loads(line) for line in args.manifest.read_text(encoding="utf-8").splitlines() if line.strip()]
    cards = [audit_card(source, args.manifest) for source in sources]
    errors: dict[str, list[float]] = {
        "leftPx": [],
        "rightPx": [],
        "spanPx": [],
        "cameraDistanceM": [],
        "heightScaleBreadthCm": [],
        "flatCameraBreadthCm": [],
    }
    shape_failures = []
    for card in cards:
        for row_name in ROWS:
            row = card["rows"][row_name]
            errors["leftPx"].append(float(row["leftErrorPx"]))
            errors["rightPx"].append(float(row["rightErrorPx"]))
            errors["spanPx"].append(float(row["spanErrorPx"]))
            errors["cameraDistanceM"].append(float(row["impliedDistanceErrorM"]))
            errors["heightScaleBreadthCm"].append(float(row["heightScaleBreadthErrorCm"]))
            errors["flatCameraBreadthCm"].append(float(row["flatCameraBreadthErrorCm"]))
            if not row["shapeContractPassed"]:
                shape_failures.append(f"{card['scanId']}:{row_name}")
    report = {
        "schemaVersion": "wear-waist-hips-spatial-contract/v1",
        "cards": len(cards),
        "rows": len(cards) * len(ROWS),
        "tapeUsed": False,
        "walkedPlyCircumferenceUsed": False,
        "endpointMethod": "central visible mask run after anatomical row is known",
        "metrics": {key: summarize(value) for key, value in errors.items()},
        "shapeContractFailures": shape_failures,
        "cardsDetail": cards,
    }
    args.output_dir.mkdir(parents=True, exist_ok=True)
    report_path = args.output_dir / "spatial-contract-audit.json"
    sheet_path = args.output_dir / "spatial-contract-contact-sheet.jpg"
    report_path.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    make_sheet(cards, sheet_path)
    print(json.dumps({
        "report": str(report_path.resolve()),
        "contactSheet": str(sheet_path.resolve()),
        "cards": len(cards),
        "metrics": report["metrics"],
        "shapeContractFailures": shape_failures,
    }, indent=2))


if __name__ == "__main__":
    main()
