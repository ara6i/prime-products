#!/usr/bin/env python3
"""Render one honest full-coverage WEAR geometry canary board.

The board never upgrades a diagnostic candidate into a teacher.  Solid lines
are circumference teachers. Red dashed lines/paths are visible rejections.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageFont


COLORS = {
    "neck": "#c084fc",
    "chest": "#fb923c",
    "underbust": "#facc15",
    "waist": "#22d3ee",
    "hips": "#34d399",
    "chest_scye": "#f97316",
    "ankle": "#60a5fa",
    "head": "#e879f9",
    "thigh": "#2dd4bf",
    "hand": "#a3e635",
    "armscye": "#f472b6",
    "vertical_trunk": "#f59e0b",
}


def font(size: int, bold: bool = False) -> ImageFont.ImageFont:
    paths = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/HelveticaNeue.ttc",
    ]
    for path in paths:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            pass
    return ImageFont.load_default()


def load_json_line(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding="utf-8").splitlines()[0])


def cm(value: Any) -> str:
    try:
        return f"{float(value) / 10.0:.2f} cm"
    except (TypeError, ValueError):
        return "—"


def dashed(draw: ImageDraw.ImageDraw, points: list[tuple[float, float]], color: str, width: int = 7) -> None:
    if len(points) < 2:
        return
    for index in range(len(points) - 1):
        if index % 2 == 0:
            draw.line((points[index], points[index + 1]), fill=color, width=width)


def line_on_mesh(
    draw: ImageDraw.ImageDraw,
    mesh_box: tuple[int, int, int, int],
    line: dict[str, Any],
    label: str,
    color: str,
    accepted: bool,
) -> None:
    x, y, width, height = mesh_box
    x1 = x + float(line["left_x_norm"]) * width
    x2 = x + float(line["right_x_norm"]) * width
    yy = y + float(line["y_norm"]) * height
    if accepted:
        draw.line((x1, yy, x2, yy), fill=color, width=8)
    else:
        dashed(draw, [(x1, yy), ((x1 + x2) / 2.0, yy), (x2, yy)], "#ef4444", 8)
    draw.rounded_rectangle((x2 + 8, yy - 15, x2 + 196, yy + 15), 5, fill="#020617")
    draw.text((x2 + 14, yy - 11), label, fill=color if accepted else "#fca5a5", font=font(14, True))


def path_on_mesh(
    draw: ImageDraw.ImageDraw,
    mesh_box: tuple[int, int, int, int],
    path: list[list[float]],
    color: str,
) -> None:
    x, y, width, height = mesh_box
    points = [(x + float(px) * width, y + float(py) * height) for px, py in path]
    dashed(draw, points, color, 6)


def normalized_shape(points: list[list[float]]) -> list[tuple[float, float]]:
    if len(points) < 3:
        return []
    xs = [float(point[0]) for point in points]
    ys = [float(point[1]) for point in points]
    cx, cy = (min(xs) + max(xs)) / 2.0, (min(ys) + max(ys)) / 2.0
    rx, ry = max((max(xs) - min(xs)) / 2.0, 1e-9), max((max(ys) - min(ys)) / 2.0, 1e-9)
    return [((x - cx) / rx, (y - cy) / ry) for x, y in zip(xs, ys)]


def draw_card(
    draw: ImageDraw.ImageDraw,
    box: tuple[int, int, int, int],
    name: str,
    row: dict[str, Any],
) -> None:
    x, y, width, height = box
    teacher = bool(row.get("circumference_teacher_accepted"))
    geometry = bool(row.get("geometry_certified"))
    status = "TEACHER PASS" if teacher else ("GEOMETRY ONLY" if geometry else "BLOCKED")
    border = "#22c55e" if teacher else ("#f59e0b" if geometry else "#ef4444")
    draw.rounded_rectangle((x, y, x + width, y + height), 18, fill="#0d1a2d", outline=border, width=3)
    draw.text((x + 18, y + 14), name.replace("_", " ").upper(), fill=COLORS[name], font=font(20, True))
    draw.text((x + width - 158, y + 17), status, fill=border, font=font(14, True))
    draw.text((x + 18, y + 53), f"A–B width     {cm(row.get('width_mm'))}", fill="white", font=font(16))
    draw.text((x + 18, y + 82), f"C–D depth     {cm(row.get('depth_mm'))}", fill="white", font=font(16))
    draw.text((x + 18, y + 111), f"Walked path   {cm(row.get('walked_mm'))}", fill="white", font=font(16))
    draw.text((x + 18, y + 140), f"WEAR tape     {cm(row.get('recorded_tape_mm'))}", fill="#fde047", font=font(16))
    delta = row.get("walked_minus_tape_pct")
    if delta is None and row.get("walked_mm") is not None and row.get("recorded_tape_mm"):
        delta = (float(row["walked_mm"]) - float(row["recorded_tape_mm"])) / float(row["recorded_tape_mm"]) * 100.0
    delta_text = "—" if delta is None else f"{float(delta):+.2f}%"
    draw.text((x + 18, y + 169), f"Shape ↔ tape  {delta_text}", fill="#cbd5e1", font=font(15))

    shape = normalized_shape(row.get("points") or [])
    if len(shape) >= 3:
        cx, cy, rx, ry = x + width - 92, y + height - 46, 66, 34
        rendered = [(cx + px * rx, cy - py * ry) for px, py in shape]
        draw.line(rendered + [rendered[0]], fill="#a78bfa", width=3)
        draw.line((cx - rx, cy, cx + rx, cy), fill="#334155", width=1)
        draw.line((cx, cy - ry, cx, cy + ry), fill="#334155", width=1)
    reason = row.get("failure")
    if not teacher:
        if not reason and geometry:
            reason = "Tape mismatch or missing tape"
        if not reason and not geometry:
            reason = "Protocol geometry not certified"
        draw.text((x + 18, y + height - 28), str(reason)[:56], fill="#fca5a5", font=font(13))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--probe", type=Path, required=True)
    parser.add_argument("--source-card", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    probe = json.loads(args.probe.read_text(encoding="utf-8"))
    source = load_json_line(args.source_card)
    mesh_path = Path(source["mesh_image"])
    mesh = Image.open(mesh_path).convert("RGB").resize((768, 1024), Image.Resampling.NEAREST)
    board = Image.new("RGB", (2048, 2220), "#06101f")
    draw = ImageDraw.Draw(board)
    draw.text((64, 42), "FULL WEAR TEACHER CANARY · NO GPU", fill="#67e8f9", font=font(23, True))
    draw.text((64, 82), str(probe["scan_id"]), fill="white", font=font(38, True))
    draw.text((64, 132), "Exact standing PLY + 73 LND · tape never chooses a line/path", fill="#a9b8cc", font=font(19))
    mesh_box = (64, 190, 768, 1024)
    board.paste(mesh, (mesh_box[0], mesh_box[1]))

    rows: dict[str, dict[str, Any]] = {}
    for name, source_row in source.get("rows", {}).items():
        row = {
            "accepted": source_row.get("accepted"),
            "geometry_certified": source_row.get("geometry_target_valid"),
            "circumference_teacher_accepted": source_row.get("tape_target_valid"),
            "width_mm": source_row.get("mesh_width_mm"),
            "depth_mm": source_row.get("mesh_depth_mm"),
            "walked_mm": source_row.get("shape_walk_circumference_mm"),
            "recorded_tape_mm": source_row.get("measurement_circumference_mm"),
            "points": source_row.get("contour_points_normalized"),
        }
        rows[name] = row
        line_on_mesh(
            draw,
            mesh_box,
            source_row,
            name.upper(),
            COLORS[name],
            bool(row["circumference_teacher_accepted"]),
        )

    for name, row in probe.get("new_protocols", {}).items():
        rows[name] = row
        if row.get("projected_line"):
            line_on_mesh(
                draw,
                mesh_box,
                row["projected_line"],
                name.replace("_", " ").upper(),
                COLORS[name],
                bool(row.get("circumference_teacher_accepted")),
            )
        if row.get("projected_path"):
            path_on_mesh(draw, mesh_box, row["projected_path"], "#ef4444")

    panel_x = 900
    draw.text((panel_x, 42), "CONNECTED TEACHER CHECK", fill="#67e8f9", font=font(22, True))
    draw.text((panel_x, 82), "PLY/LND geometry → A–B + C–D + shape/path → walked result → WEAR tape loss", fill="white", font=font(17, True))
    draw.text((panel_x, 116), "Anything red stays out of CPU cards and GPU training.", fill="#fbbf24", font=font(17))

    order = ["neck", "chest", "underbust", "waist", "hips", "chest_scye", "ankle", "head", "thigh", "hand", "armscye", "vertical_trunk"]
    card_w, card_h = 540, 248
    for index, name in enumerate(order):
        row = rows.get(name) or {"geometry_certified": False, "failure": "missing result"}
        col, line = index % 2, index // 2
        draw_card(draw, (panel_x + col * (card_w + 22), 160 + line * (card_h + 22), card_w, card_h), name, row)

    passed = sum(bool((rows.get(name) or {}).get("circumference_teacher_accepted")) for name in order)
    draw.text((64, 1270), f"Teacher-safe now: {passed} / {len(order)} visible circumference protocols", fill="#f8fafc", font=font(28, True))
    draw.text((64, 1318), "This is a canary, not bulk approval. Every blocked protocol must be repaired and rechecked on diverse bodies.", fill="#fbbf24", font=font(18, True))
    draw.text((64, 1360), "Recorded tape is truth for supervision only after the same anatomical geometry is certified.", fill="#cbd5e1", font=font(18))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    board.save(args.output)
    print(args.output)


if __name__ == "__main__":
    main()
