#!/usr/bin/env python3
"""Convert private Delaram person masks into visible 2D triangle meshes.

The mask is an internal geometric input. The browser receives only normalized
vertices, triangles, and the traced outline. No depth, circumference, Meta MHR
body, tape value, or WEAR answer is used.
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageOps
from scipy.spatial import Delaunay


ROOT = Path(__file__).resolve().parents[2]
MASK_DIR = ROOT / ".local-ml/wear-mesh-overlay/photo-masks"
OUTPUT_DIR = ROOT / ".local-ml/wear-mesh-overlay/mask-mesh"
DEFAULT_PHOTOS = {
    "delaram": ROOT / "public/try-on-test/sizing-lab/delaram-front.jpg",
    "delaram-2": ROOT / "public/try-on-test/sizing-lab/delaram-2-front.jpg",
}
SAFE_PHOTO_ID = re.compile(r"^[a-z0-9][a-z0-9-]{0,63}$")


def largest_component(mask: np.ndarray) -> np.ndarray:
    binary = (mask > 0).astype(np.uint8)
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel, iterations=1)
    count, labels, stats, _ = cv2.connectedComponentsWithStats(binary, 8)
    if count <= 1:
        raise RuntimeError("The visible-person mask is empty.")
    label = int(1 + np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    return (labels == label).astype(np.uint8)


def sample_closed_contour(contour: np.ndarray, step_px: float) -> np.ndarray:
    points = contour.reshape(-1, 2).astype(np.float64)
    closed = np.vstack((points, points[0]))
    segment_lengths = np.linalg.norm(np.diff(closed, axis=0), axis=1)
    cumulative = np.concatenate(([0.0], np.cumsum(segment_lengths)))
    total = float(cumulative[-1])
    sample_count = max(16, int(np.ceil(total / step_px)))
    targets = np.linspace(0.0, total, sample_count, endpoint=False)
    sampled: list[np.ndarray] = []
    for target in targets:
        segment = min(int(np.searchsorted(cumulative, target, side="right") - 1), len(points) - 1)
        length = segment_lengths[segment]
        fraction = 0.0 if length <= 1e-8 else (target - cumulative[segment]) / length
        sampled.append(closed[segment] + (closed[segment + 1] - closed[segment]) * fraction)
    return np.asarray(sampled, dtype=np.float64)


def mask_contains(mask: np.ndarray, samples: np.ndarray) -> np.ndarray:
    height, width = mask.shape
    xs = np.clip(np.rint(samples[..., 0]).astype(np.int64), 0, width - 1)
    ys = np.clip(np.rint(samples[..., 1]).astype(np.int64), 0, height - 1)
    return mask[ys, xs] > 0


def triangle_is_inside(mask: np.ndarray, triangle: np.ndarray) -> bool:
    a, b, c = triangle
    probes = [a, b, c, (a + b + c) / 3.0]
    for left, right in ((a, b), (b, c), (c, a)):
        probes.extend(
            (
                left * 0.75 + right * 0.25,
                left * 0.50 + right * 0.50,
                left * 0.25 + right * 0.75,
            )
        )
    return bool(mask_contains(mask, np.asarray(probes)).all())


def build_mesh(mask: np.ndarray, grid_step: int, boundary_step: int) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    if not contours:
        raise RuntimeError("The mask has no visible outline.")
    contour = max(contours, key=cv2.contourArea)
    outline = sample_closed_contour(contour, float(boundary_step))

    height, width = mask.shape
    interior: list[tuple[float, float]] = []
    offset = grid_step // 2
    for y in range(offset, height, grid_step):
        for x in range(offset, width, grid_step):
            if mask[y, x] > 0:
                interior.append((float(x), float(y)))

    points = np.vstack((outline, np.asarray(interior, dtype=np.float64)))
    rounded = np.rint(points * 4.0).astype(np.int64)
    _, unique_indices = np.unique(rounded, axis=0, return_index=True)
    points = points[np.sort(unique_indices)]
    if len(points) < 50:
        raise RuntimeError("Not enough points to triangulate the visible body.")

    simplices = Delaunay(points).simplices
    accepted: list[np.ndarray] = []
    for simplex in simplices:
        triangle = points[simplex]
        signed_area = float(np.cross(triangle[1] - triangle[0], triangle[2] - triangle[0]))
        if abs(signed_area) < 0.75:
            continue
        if triangle_is_inside(mask, triangle):
            accepted.append(simplex)
    if not accepted:
        raise RuntimeError("No triangles remained inside the visible mask.")
    return points, np.asarray(accepted, dtype=np.int64), outline


def render_review(
    photo_path: Path,
    points: np.ndarray,
    triangles: np.ndarray,
    outline: np.ndarray,
    output: Path,
) -> None:
    image = np.asarray(ImageOps.exif_transpose(Image.open(photo_path)).convert("RGB"))[:, :, ::-1].copy()
    overlay = image.copy()
    for simplex in triangles:
        polygon = np.rint(points[simplex]).astype(np.int32).reshape((-1, 1, 2))
        cv2.polylines(overlay, [polygon], True, (238, 211, 34), 1, cv2.LINE_AA)
    cv2.polylines(
        overlay,
        [np.rint(outline).astype(np.int32).reshape((-1, 1, 2))],
        True,
        (94, 234, 74),
        4,
        cv2.LINE_AA,
    )
    review = cv2.addWeighted(image, 0.48, overlay, 0.52, 0)
    maximum_height = 1400
    if review.shape[0] > maximum_height:
        scale = maximum_height / review.shape[0]
        review = cv2.resize(review, None, fx=scale, fy=scale, interpolation=cv2.INTER_AREA)
    cv2.imwrite(str(output), review, [cv2.IMWRITE_JPEG_QUALITY, 91])


def build(photo_id: str, photo_path: Path, grid_step: int, boundary_step: int) -> dict:
    mask_path = MASK_DIR / f"{photo_id}.png"
    if not mask_path.is_file():
        raise FileNotFoundError(mask_path)
    raw = cv2.imread(str(mask_path), cv2.IMREAD_GRAYSCALE)
    if raw is None:
        raise RuntimeError(f"Could not read {mask_path}")
    mask = largest_component(raw)
    points, triangles, outline = build_mesh(mask, grid_step, boundary_step)
    height, width = mask.shape
    normalized = points / np.asarray((width, height), dtype=np.float64)
    outline_normalized = outline / np.asarray((width, height), dtype=np.float64)

    triangle_centers = points[triangles].mean(axis=1)
    if not bool(mask_contains(mask, triangle_centers).all()):
        raise RuntimeError("A generated triangle center escaped the visible mask.")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    json_path = OUTPUT_DIR / f"{photo_id}.json"
    review_path = OUTPUT_DIR / f"{photo_id}-review.jpg"
    payload = {
        "schemaVersion": "visible-mask-mesh/v1",
        "photoId": photo_id,
        "source": "BiRefNet visible-person mask converted to constrained 2D triangles",
        "imageSize": [width, height],
        "maskUsedInternally": True,
        "maskReturnedToBrowser": False,
        "metaMhrUsed": False,
        "depthUsed": False,
        "measurementsUsed": False,
        "wearAnswerUsed": False,
        "visibleClothingAndHairIncluded": True,
        "vertices": np.round(normalized, 7).reshape(-1).tolist(),
        "triangles": triangles.reshape(-1).tolist(),
        "outline": np.round(outline_normalized, 7).reshape(-1).tolist(),
        "stats": {
            "vertexCount": int(len(points)),
            "triangleCount": int(len(triangles)),
            "outlinePointCount": int(len(outline)),
            "foregroundPixels": int(mask.sum()),
            "gridStepPx": grid_step,
            "boundaryStepPx": boundary_step,
            "triangleCentersOutsideMask": 0,
        },
        "reviewFile": review_path.name,
    }
    json_path.write_text(json.dumps(payload, separators=(",", ":")) + "\n")
    render_review(photo_path, points, triangles, outline, review_path)
    return {
        "photoId": photo_id,
        "json": str(json_path.relative_to(ROOT)),
        "review": str(review_path.relative_to(ROOT)),
        **payload["stats"],
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--photo", choices=["all", *DEFAULT_PHOTOS], default="all")
    parser.add_argument("--photo-id")
    parser.add_argument("--photo-path", type=Path)
    parser.add_argument("--grid-step", type=int, default=24)
    parser.add_argument("--boundary-step", type=int, default=12)
    args = parser.parse_args()
    if bool(args.photo_id) != bool(args.photo_path):
        raise ValueError("--photo-id and --photo-path must be supplied together")
    if args.photo_id:
        if not SAFE_PHOTO_ID.fullmatch(args.photo_id):
            raise ValueError("Unsafe photo id")
        photos = [(args.photo_id, args.photo_path.resolve())]
    else:
        photo_ids = list(DEFAULT_PHOTOS) if args.photo == "all" else [args.photo]
        photos = [(photo_id, DEFAULT_PHOTOS[photo_id]) for photo_id in photo_ids]
    results = [
        build(photo_id, photo_path, args.grid_step, args.boundary_step)
        for photo_id, photo_path in photos
    ]
    print(json.dumps({"meshes": results}, indent=2), flush=True)


if __name__ == "__main__":
    main()
