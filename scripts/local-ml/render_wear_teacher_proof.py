#!/usr/bin/env python3
"""Render a human-reviewable proof board for one certified WEAR mesh teacher."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROWS = ("neck", "chest", "underbust", "waist", "hips")
COLORS = {
    "neck": "#c084fc",
    "chest": "#fb923c",
    "underbust": "#facc15",
    "waist": "#22d3ee",
    "hips": "#34d399",
}


def font(size: int, bold: bool = False) -> ImageFont.ImageFont:
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/HelveticaNeue.ttc",
    ]
    for candidate in candidates:
        try:
            return ImageFont.truetype(candidate, size)
        except OSError:
            continue
    return ImageFont.load_default()


def dashed_line(draw: ImageDraw.ImageDraw, xy: tuple[float, float, float, float], fill: str, width: int) -> None:
    x1, y1, x2, y2 = xy
    length = max(1.0, x2 - x1)
    dash = max(8.0, length / 18.0)
    cursor = x1
    while cursor < x2:
        draw.line((cursor, y1, min(cursor + dash, x2), y2), fill=fill, width=width)
        cursor += dash * 1.7


def fmt_cm(value: object) -> str:
    try:
        return f"{float(value) / 10.0:.2f} cm"
    except (TypeError, ValueError):
        return "not available"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--sample-id", required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    record = None
    for raw in args.manifest.read_text(encoding="utf-8").splitlines():
        candidate = json.loads(raw)
        if candidate.get("sample_id") == args.sample_id:
            record = candidate
            break
    if record is None:
        raise SystemExit(f"sample not found: {args.sample_id}")

    mesh_path = Path(record["mesh_image"])
    if not mesh_path.is_absolute():
        mesh_path = Path.cwd() / mesh_path
    mesh = Image.open(mesh_path).convert("RGB").resize((576, 768), Image.Resampling.NEAREST)
    board = Image.new("RGB", (1680, 1080), "#06101f")
    board.paste(mesh, (56, 184))
    draw = ImageDraw.Draw(board)
    draw.text((56, 42), "CERTIFIED WEAR TEACHER CHECK", fill="#67e8f9", font=font(22, True))
    draw.text((56, 82), str(record["scan_id"]), fill="white", font=font(36, True))
    draw.text((56, 132), "Blender 2D mesh card · exact PLY/LND rows · no RGB", fill="#a9b8cc", font=font(20))

    rows = record.get("rows") or {}
    for row_name in ROWS:
        row = rows.get(row_name)
        if not row:
            continue
        y = 184 + float(row["y_norm"]) * 768
        x1 = 56 + float(row["left_x_norm"]) * 576
        x2 = 56 + float(row["right_x_norm"]) * 576
        color = COLORS[row_name]
        if row.get("accepted") is True:
            draw.line((x1, y, x2, y), fill=color, width=8)
        else:
            dashed_line(draw, (x1, y, x2, y), "#ef4444", 8)
        draw.text((x2 + 10, y - 12), row_name.upper(), fill=color, font=font(16, True))

    panel_x = 700
    draw.text((panel_x, 42), "ONE CONNECTED TARGET", fill="#67e8f9", font=font(20, True))
    draw.text((panel_x, 78), "row → A–B + C–D + 32-point shape → walked circumference → tape loss", fill="white", font=font(21, True))
    draw.text((panel_x, 116), "Rejected geometry never enters GPU training.", fill="#fbbf24", font=font(19))

    card_w, card_h = 450, 265
    for index, row_name in enumerate(ROWS):
        row = rows.get(row_name) or {}
        col = index % 2
        line = index // 2
        x = panel_x + col * (card_w + 20)
        y = 168 + line * (card_h + 18)
        accepted = row.get("accepted") is True
        tape_ok = row.get("tape_target_valid") is True
        border = "#22c55e" if accepted else "#ef4444"
        draw.rounded_rectangle((x, y, x + card_w, y + card_h), radius=18, fill="#0d1a2d", outline=border, width=3)
        draw.text((x + 18, y + 14), row_name.upper(), fill=COLORS[row_name], font=font(20, True))
        geometry_label = "GEOMETRY PASS" if accepted else "GEOMETRY REJECTED"
        draw.text((x + 190, y + 16), geometry_label, fill=border, font=font(15, True))
        draw.text((x + 18, y + 52), f"A–B width  {fmt_cm(row.get('mesh_width_mm'))}", fill="white", font=font(17))
        draw.text((x + 18, y + 82), f"C–D depth  {fmt_cm(row.get('mesh_depth_mm'))}", fill="white", font=font(17))
        draw.text((x + 18, y + 112), f"Walked shape  {fmt_cm(row.get('shape_walk_circumference_mm'))}", fill="white", font=font(17))
        draw.text((x + 18, y + 142), f"Recorded tape  {fmt_cm(row.get('measurement_circumference_mm'))}", fill="#facc15", font=font(17))
        perimeter = row.get("mesh_section_perimeter_mm")
        tape = row.get("measurement_circumference_mm")
        delta = None
        if perimeter is not None and tape not in (None, 0):
            delta = abs(float(perimeter) - float(tape)) / float(tape) * 100.0
        tape_label = "TAPE LOSS CONNECTED" if tape_ok else "TAPE LOSS BLOCKED"
        tape_color = "#22c55e" if tape_ok else "#f59e0b"
        draw.text((x + 18, y + 176), tape_label, fill=tape_color, font=font(15, True))
        if delta is not None:
            draw.text((x + 230, y + 176), f"mesh/tape Δ {delta:.2f}%", fill="#cbd5e1", font=font(15))

        shape = row.get("contour_points_normalized") or []
        if len(shape) == 32:
            cx, cy, rx, ry = x + 350, y + 225, 70, 35
            points = [(cx + float(px) * rx, cy - float(py) * ry) for px, py in shape]
            draw.line(points + [points[0]], fill="#a78bfa", width=3)
            draw.line((cx - rx, cy, cx + rx, cy), fill="#334155", width=1)
            draw.line((cx, cy - ry, cx, cy + ry), fill="#334155", width=1)
        reasons = row.get("teacher_rejection_reasons") or []
        if reasons:
            draw.text((x + 18, y + 212), str(reasons[0]).replace("-", " ")[:42], fill="#fca5a5", font=font(13))

    draw.text((56, 982), "Solid row = certified exact PLY section. Red dashed row = diagnostic only, never a teacher.", fill="#cbd5e1", font=font(18))
    draw.text((56, 1018), "Tape is separate recorded truth, but it can train only the circumference walked from the same certified shape.", fill="#facc15", font=font(18, True))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    board.save(args.output)
    print(args.output)


if __name__ == "__main__":
    main()
