#!/usr/bin/env python3
"""Create a visual, tape-free proof of front-only WEAR ambiguity.

The script searches train and validation subjects only. It first finds bodies
with the same sex and nearly identical height/weight whose rendered front
silhouettes overlap strongly. It then measures the exact full-resolution front
mask agreement and reports how much their hidden PLY depth, anatomical row, and
32-point cross-section still differ.

The sealed test split, tape, and walked PLY circumference are never opened.
"""

from __future__ import annotations

import argparse
from dataclasses import dataclass
import json
import math
import os
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image, ImageDraw, ImageFont


HEIGHT = 256
WIDTH = 192
LOW_HEIGHT = 64
LOW_WIDTH = 48
ROWS = ("waist", "hips")
COLORS = ("#22d3ee", "#34d399")


@dataclass(frozen=True)
class Source:
    scan_id: str
    role: str
    gender: str
    height_cm: float
    weight_kg: float
    mask_path: Path
    mesh_path: Path
    rows_px: np.ndarray
    breadths_cm: np.ndarray
    depths_cm: np.ndarray
    shapes: np.ndarray


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--output-json", type=Path, required=True)
    parser.add_argument("--output-sheet", type=Path, required=True)
    parser.add_argument("--candidate-pairs", type=int, default=600)
    parser.add_argument("--show-pairs", type=int, default=16)
    parser.add_argument("--height-window-cm", type=float, default=1.0)
    parser.add_argument("--weight-window-kg", type=float, default=1.0)
    return parser.parse_args()


def finite(value: Any) -> float | None:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if math.isfinite(number) else None


def resolve_artifact(raw: str, manifest: Path) -> Path:
    path = Path(raw)
    rendered_candidate = None
    if "rendered" in path.parts:
        index = max(i for i, part in enumerate(path.parts) if part == "rendered")
        rendered_candidate = manifest.parent / "rendered" / Path(*path.parts[index + 1 :])
    for candidate in (path, Path.cwd() / path, rendered_candidate, manifest.parent / path.name):
        if candidate is not None and candidate.exists():
            return candidate.resolve()
    raise FileNotFoundError(raw)


def read_sources(manifest: Path) -> tuple[list[Source], dict[str, int]]:
    result: list[Source] = []
    roles: dict[str, int] = {}
    for raw_line in manifest.read_text(encoding="utf-8").splitlines():
        if not raw_line.strip():
            continue
        record = json.loads(raw_line)
        role = str(record.get("role") or "missing")
        roles[role] = roles.get(role, 0) + 1
        if role not in {"train", "validation"}:
            continue
        if record.get("view_id") != "front-50" or record.get("error"):
            continue
        gender = str(record.get("gender") or "").lower()
        height = finite(record.get("height_cm"))
        weight = finite(record.get("weight_kg"))
        if gender not in {"female", "male"} or height is None or weight is None:
            continue
        rows_px = np.zeros(2, np.float32)
        breadths = np.zeros(2, np.float32)
        depths = np.zeros(2, np.float32)
        shapes = np.zeros((2, 32, 2), np.float32)
        valid = True
        for index, name in enumerate(ROWS):
            row = (record.get("rows") or {}).get(name) or {}
            contour = np.asarray(row.get("contour_points_normalized") or [], np.float32)
            y = finite(row.get("y_norm"))
            breadth = finite(row.get("mesh_width_mm"))
            depth = finite(row.get("mesh_depth_mm"))
            if (
                not all(row.get(flag) is True for flag in ("accepted", "depth_target_valid", "shape_target_valid"))
                or y is None
                or breadth is None
                or depth is None
                or contour.shape != (32, 2)
            ):
                valid = False
                break
            rows_px[index] = y * (HEIGHT - 1)
            breadths[index] = breadth / 10.0
            depths[index] = depth / 10.0
            shapes[index] = contour
        if not valid:
            continue
        result.append(
            Source(
                scan_id=str(record.get("scan_id")),
                role=role,
                gender=gender,
                height_cm=height,
                weight_kg=weight,
                mask_path=resolve_artifact(str(record.get("mask") or record.get("image")), manifest),
                mesh_path=resolve_artifact(str(record.get("mesh_image")), manifest),
                rows_px=rows_px,
                breadths_cm=breadths,
                depths_cm=depths,
                shapes=shapes,
            )
        )
    return result, roles


def binary_mask(path: Path, size: tuple[int, int]) -> np.ndarray:
    resampling = getattr(Image, "Resampling", Image)
    with Image.open(path) as image:
        rgba = np.asarray(image.convert("RGBA").resize(size, resampling.NEAREST), np.uint8)
    return ((rgba[..., 3] > 127) & (rgba[..., :3].max(2) > 127)).astype(np.float32)


def central_edges(mask: np.ndarray) -> np.ndarray:
    edges = np.full((mask.shape[0], 2), np.nan, np.float32)
    center = (mask.shape[1] - 1) * 0.5
    for y, row in enumerate(mask > 0.5):
        padded = np.pad(row.astype(np.int8), (1, 1))
        changes = np.diff(padded)
        runs = list(zip(np.flatnonzero(changes == 1), np.flatnonzero(changes == -1) - 1))
        if not runs:
            continue
        runs.sort(key=lambda pair: (0 if pair[0] <= center <= pair[1] else 1,
                                    min(abs(center - pair[0]), abs(center - pair[1])),
                                    -(pair[1] - pair[0])))
        edges[y] = runs[0]
    return edges


def approximate_pairs(sources: list[Source], args: argparse.Namespace) -> list[tuple[int, int, float]]:
    low = np.stack([binary_mask(source.mask_path, (LOW_WIDTH, LOW_HEIGHT)).reshape(-1) for source in sources])
    area = low.sum(1)
    candidates: list[tuple[int, int, float]] = []
    for gender in ("female", "male"):
        indexes = np.asarray([i for i, source in enumerate(sources) if source.gender == gender], np.int64)
        matrix = low[indexes]
        intersection = matrix @ matrix.T
        union = area[indexes, None] + area[indexes][None, :] - intersection
        iou = intersection / np.maximum(union, 1.0)
        height = np.asarray([sources[i].height_cm for i in indexes])
        weight = np.asarray([sources[i].weight_kg for i in indexes])
        allowed = (
            (np.abs(height[:, None] - height[None, :]) <= args.height_window_cm)
            & (np.abs(weight[:, None] - weight[None, :]) <= args.weight_window_kg)
        )
        allowed &= np.triu(np.ones_like(allowed, dtype=bool), 1)
        rows, cols = np.where(allowed)
        scores = iou[rows, cols]
        keep = np.argsort(scores)[-args.candidate_pairs :]
        candidates.extend((int(indexes[rows[k]]), int(indexes[cols[k]]), float(scores[k])) for k in keep)
    candidates.sort(key=lambda item: item[2], reverse=True)
    return candidates[: args.candidate_pairs]


def exact_pair(source_a: Source, source_b: Source, approximate_iou: float) -> dict[str, Any]:
    a = binary_mask(source_a.mask_path, (WIDTH, HEIGHT))
    b = binary_mask(source_b.mask_path, (WIDTH, HEIGHT))
    intersection = float((a * b).sum())
    union = float(((a + b) > 0).sum())
    exact_iou = intersection / max(union, 1.0)
    edges_a, edges_b = central_edges(a), central_edges(b)
    valid = np.isfinite(edges_a).all(1) & np.isfinite(edges_b).all(1)
    outline_mae = float(np.abs(edges_a[valid] - edges_b[valid]).mean()) if valid.any() else float("inf")
    shape_mae = np.abs(source_a.shapes - source_b.shapes).mean(axis=(1, 2))
    return {
        "scanA": source_a.scan_id,
        "scanB": source_b.scan_id,
        "roleA": source_a.role,
        "roleB": source_b.role,
        "gender": source_a.gender,
        "heightDifferenceCm": round(abs(source_a.height_cm - source_b.height_cm), 4),
        "weightDifferenceKg": round(abs(source_a.weight_kg - source_b.weight_kg), 4),
        "approximateIou": round(approximate_iou, 6),
        "exactSilhouetteIou": round(exact_iou, 6),
        "centralOutlineMaePx": round(outline_mae, 6),
        "waist": {
            "rowDifferencePx": round(float(abs(source_a.rows_px[0] - source_b.rows_px[0])), 6),
            "depthDifferenceCm": round(float(abs(source_a.depths_cm[0] - source_b.depths_cm[0])), 6),
            "shape32Mae": round(float(shape_mae[0]), 6),
        },
        "hips": {
            "rowDifferencePx": round(float(abs(source_a.rows_px[1] - source_b.rows_px[1])), 6),
            "depthDifferenceCm": round(float(abs(source_a.depths_cm[1] - source_b.depths_cm[1])), 6),
            "shape32Mae": round(float(shape_mae[1]), 6),
        },
    }


def contradiction_score(pair: dict[str, Any]) -> float:
    hidden = (
        pair["waist"]["depthDifferenceCm"]
        + pair["hips"]["depthDifferenceCm"]
        + 0.25 * pair["waist"]["rowDifferencePx"]
        + 0.25 * pair["hips"]["rowDifferencePx"]
    )
    visible_penalty = max(1.0 - pair["exactSilhouetteIou"], 0.0001) * 100.0 + pair["centralOutlineMaePx"]
    return hidden / visible_penalty


def regional_descriptor(source: Source, row_index: int) -> tuple[np.ndarray, np.ndarray]:
    mask = binary_mask(source.mask_path, (WIDTH, HEIGHT))
    edges = central_edges(mask)
    center_row = int(np.clip(round(float(source.rows_px[row_index])), 16, HEIGHT - 17))
    selected = edges[center_row - 16 : center_row + 17].copy()
    valid = np.isfinite(selected).all(1)
    if not valid.all():
        valid_indexes = np.flatnonzero(valid)
        if not len(valid_indexes):
            selected[:] = ((WIDTH - 1) * 0.5, (WIDTH - 1) * 0.5)
        else:
            for column in range(2):
                selected[:, column] = np.interp(
                    np.arange(len(selected)), valid_indexes, selected[valid_indexes, column]
                )
    span = selected[:, 1] - selected[:, 0]
    center = (selected[:, 1] + selected[:, 0]) * 0.5
    middle_span = max(float(span[16]), 1.0)
    descriptor = np.concatenate(
        (
            np.asarray((source.breadths_cm[row_index] / 40.0,), np.float32),
            span / middle_span,
            (center - center[16]) / middle_span,
        )
    ).astype(np.float32)
    return descriptor, span.astype(np.float32)


def regional_pairs(sources: list[Source], row_index: int, limit: int = 1000) -> list[dict[str, Any]]:
    descriptor_pairs = [regional_descriptor(source, row_index) for source in sources]
    descriptors = np.stack([item[0] for item in descriptor_pairs])
    spans = np.stack([item[1] for item in descriptor_pairs])
    pairs: list[tuple[float, int, int]] = []
    for gender in ("female", "male"):
        indexes = np.asarray([i for i, source in enumerate(sources) if source.gender == gender], np.int64)
        matrix = descriptors[indexes]
        norms = (matrix * matrix).sum(1)
        distance = norms[:, None] + norms[None, :] - 2.0 * (matrix @ matrix.T)
        height = np.asarray([sources[i].height_cm for i in indexes])
        weight = np.asarray([sources[i].weight_kg for i in indexes])
        breadth = np.asarray([sources[i].breadths_cm[row_index] for i in indexes])
        allowed = (
            (np.abs(height[:, None] - height[None, :]) <= 1.0)
            & (np.abs(weight[:, None] - weight[None, :]) <= 1.0)
            & (np.abs(breadth[:, None] - breadth[None, :]) <= 0.25)
            & np.triu(np.ones_like(distance, dtype=bool), 1)
        )
        rows, columns = np.where(allowed)
        values = distance[rows, columns]
        keep = np.argsort(values)[:limit]
        pairs.extend((float(max(values[k], 0.0)), int(indexes[rows[k]]), int(indexes[columns[k]])) for k in keep)
    pairs.sort(key=lambda item: item[0])
    output = []
    for distance, a, b in pairs[:limit]:
        source_a, source_b = sources[a], sources[b]
        output.append({
            "scanA": source_a.scan_id,
            "scanB": source_b.scan_id,
            "gender": source_a.gender,
            "heightDifferenceCm": round(abs(source_a.height_cm - source_b.height_cm), 6),
            "weightDifferenceKg": round(abs(source_a.weight_kg - source_b.weight_kg), 6),
            "frontBreadthDifferenceCm": round(float(abs(source_a.breadths_cm[row_index] - source_b.breadths_cm[row_index])), 6),
            "frontBandDescriptorDistance": round(math.sqrt(distance), 6),
            "frontBandSpanMaePx": round(float(np.abs(spans[a] - spans[b]).mean()), 6),
            "rowDifferencePx": round(float(abs(source_a.rows_px[row_index] - source_b.rows_px[row_index])), 6),
            "hiddenDepthDifferenceCm": round(float(abs(source_a.depths_cm[row_index] - source_b.depths_cm[row_index])), 6),
            "hiddenShape32Mae": round(float(np.abs(source_a.shapes[row_index] - source_b.shapes[row_index]).mean()), 6),
        })
    return output


def draw_sheet(sources: list[Source], pairs: list[dict[str, Any]], output: Path, count: int) -> None:
    source_map = {source.scan_id: source for source in sources}
    pairs = pairs[:count]
    card_w, card_h, columns = 720, 360, 2
    rows = math.ceil(len(pairs) / columns)
    sheet = Image.new("RGB", (card_w * columns, card_h * rows), "#050b18")
    font = ImageFont.load_default()
    resampling = getattr(Image, "Resampling", Image)
    for position, pair in enumerate(pairs):
        card = Image.new("RGB", (card_w, card_h), "#0c1729")
        draw = ImageDraw.Draw(card)
        for side, key in enumerate(("scanA", "scanB")):
            source = source_map[pair[key]]
            with Image.open(source.mesh_path) as image:
                body = image.convert("RGB")
            body.thumbnail((250, 285), resampling.LANCZOS)
            x, y = 12 + side * 270, 54
            card.paste(body, (x, y))
            draw.text((x, 32), f"{source.scan_id} · {source.height_cm:.1f} cm · {source.weight_kg:.1f} kg", fill="white", font=font)
            for row_index, color in enumerate(COLORS):
                row_y = y + source.rows_px[row_index] / (HEIGHT - 1) * body.height
                draw.line((x, row_y, x + body.width, row_y), fill=color, width=3)
        draw.text((548, 45), f"IoU {pair['exactSilhouetteIou']:.4f}", fill="#f8fafc", font=font)
        draw.text((548, 68), f"outline {pair['centralOutlineMaePx']:.2f} px", fill="#cbd5e1", font=font)
        draw.text((548, 106), "WAIST", fill=COLORS[0], font=font)
        draw.text((548, 125), f"row {pair['waist']['rowDifferencePx']:.2f} px", fill="white", font=font)
        draw.text((548, 144), f"depth {pair['waist']['depthDifferenceCm']:.2f} cm", fill="white", font=font)
        draw.text((548, 184), "HIPS", fill=COLORS[1], font=font)
        draw.text((548, 203), f"row {pair['hips']['rowDifferencePx']:.2f} px", fill="white", font=font)
        draw.text((548, 222), f"depth {pair['hips']['depthDifferenceCm']:.2f} cm", fill="white", font=font)
        draw.text((548, 278), "same gender", fill="#94a3b8", font=font)
        draw.text((548, 297), "height/weight <= 1", fill="#94a3b8", font=font)
        sheet.paste(card, ((position % columns) * card_w, (position // columns) * card_h))
    output.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output, quality=94)


def main() -> int:
    args = parse_args()
    manifest = args.manifest.resolve()
    sources, role_counts = read_sources(manifest)
    candidates = approximate_pairs(sources, args)
    pairs = [exact_pair(sources[a], sources[b], iou) for a, b, iou in candidates]
    for pair in pairs:
        pair["contradictionScore"] = round(contradiction_score(pair), 6)
    pairs.sort(key=contradiction_score, reverse=True)
    regional = {name: regional_pairs(sources, index) for index, name in enumerate(ROWS)}
    payload = {
        "schemaVersion": "wear-front-ambiguity-proof/v1",
        "manifest": str(manifest),
        "subjectsCompared": len(sources),
        "sourceRoleCounts": role_counts,
        "gates": {
            "sameGender": True,
            "heightWindowCm": args.height_window_cm,
            "weightWindowKg": args.weight_window_kg,
        },
        "sealedTestFeaturesOpened": False,
        "sealedTestTargetsOpened": False,
        "recordedTapeUsed": False,
        "walkedPlyCircumferenceUsed": False,
        "interpretation": (
            "Near-identical front silhouettes can retain different anatomical rows, hidden depths, "
            "and 32-point sections. No deterministic front-only model can output both truths exactly."
        ),
        "regionalOracleRowProof": regional,
        "pairs": pairs,
    }
    args.output_json.parent.mkdir(parents=True, exist_ok=True)
    args.output_json.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    draw_sheet(sources, pairs, args.output_sheet, args.show_pairs)
    print(json.dumps({
        "subjects": len(sources),
        "pairsChecked": len(pairs),
        "bestProof": pairs[0] if pairs else None,
        "json": str(args.output_json),
        "sheet": str(args.output_sheet),
    }, indent=2), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
