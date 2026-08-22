#!/usr/bin/env python3
"""Build browser-safe side projections and waist-band depths for WEAR scans.

The source is the exact canonical PLY projection already stored in the metric
NPZ. No tape, circumference, Delaram photo, or saved line enters this job.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import cv2
import numpy as np
from scipy.spatial import Delaunay


ROOT = Path(__file__).resolve().parents[2]
METRIC_DIR = ROOT / ".local-ml/wear-mesh-overlay/metric-lines"
OUTPUT_DIR = ROOT / ".local-ml/wear-mesh-overlay/dual-view"
SLICE_OFFSETS = (-0.04, -0.03, -0.02, -0.01, 0.0, 0.01, 0.02, 0.03, 0.04)


def largest_filled_silhouette(projected_yz: np.ndarray, pixels_per_cm: float = 4.0):
    minimum = projected_yz.min(axis=0) - np.array([2.0, 2.0])
    maximum = projected_yz.max(axis=0) + np.array([2.0, 2.0])
    width = int(np.ceil((maximum[0] - minimum[0]) * pixels_per_cm)) + 1
    height = int(np.ceil((maximum[1] - minimum[1]) * pixels_per_cm)) + 1
    mask = np.zeros((height, width), dtype=np.uint8)
    xs = np.rint((projected_yz[:, 0] - minimum[0]) * pixels_per_cm).astype(np.int32)
    ys = np.rint((maximum[1] - projected_yz[:, 1]) * pixels_per_cm).astype(np.int32)
    valid = (xs >= 0) & (xs < width) & (ys >= 0) & (ys < height)
    mask[ys[valid], xs[valid]] = 255
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
    mask = cv2.dilate(mask, kernel, iterations=1)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, kernel, iterations=2)
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    if not contours:
        raise RuntimeError("WEAR side projection has no silhouette")
    contour = max(contours, key=cv2.contourArea)
    filled = np.zeros_like(mask)
    cv2.drawContours(filled, [contour], -1, 255, cv2.FILLED)
    return filled, minimum, maximum, pixels_per_cm


def sample_contour(contour: np.ndarray, target_count: int = 420) -> np.ndarray:
    points = contour.reshape(-1, 2).astype(np.float64)
    closed = np.vstack((points, points[0]))
    lengths = np.linalg.norm(np.diff(closed, axis=0), axis=1)
    cumulative = np.concatenate(([0.0], np.cumsum(lengths)))
    total = float(cumulative[-1])
    targets = np.linspace(0.0, total, min(target_count, max(48, int(total))), endpoint=False)
    output = []
    for target in targets:
        segment = min(int(np.searchsorted(cumulative, target, side="right") - 1), len(points) - 1)
        fraction = 0.0 if lengths[segment] <= 1e-9 else (target - cumulative[segment]) / lengths[segment]
        output.append(closed[segment] + (closed[segment + 1] - closed[segment]) * fraction)
    return np.asarray(output)


def triangulate_mask(mask: np.ndarray, outline: np.ndarray, grid_step: int = 18):
    points = [tuple(point) for point in outline]
    offset = grid_step // 2
    for y in range(offset, mask.shape[0], grid_step):
        for x in range(offset, mask.shape[1], grid_step):
            if mask[y, x]:
                points.append((float(x), float(y)))
    vertices = np.asarray(points, dtype=np.float64)
    unique = np.unique(np.rint(vertices * 2).astype(np.int64), axis=0, return_index=True)[1]
    vertices = vertices[np.sort(unique)]
    simplices = Delaunay(vertices).simplices
    centres = vertices[simplices].mean(axis=1)
    cx = np.clip(np.rint(centres[:, 0]).astype(int), 0, mask.shape[1] - 1)
    cy = np.clip(np.rint(centres[:, 1]).astype(int), 0, mask.shape[0] - 1)
    triangles = simplices[mask[cy, cx] > 0]
    return vertices, triangles


def plane_intersections(vertices: np.ndarray, triangles: np.ndarray, height_cm: float) -> np.ndarray:
    selected = vertices[triangles]
    low = selected[:, :, 2].min(axis=1)
    high = selected[:, :, 2].max(axis=1)
    selected = selected[(low <= height_cm + 1e-7) & (high >= height_cm - 1e-7)]
    intersections = []
    for left, right in ((0, 1), (1, 2), (2, 0)):
        a = selected[:, left]
        b = selected[:, right]
        difference = b[:, 2] - a[:, 2]
        valid = (np.abs(difference) > 1e-8) & (
            ((a[:, 2] <= height_cm) & (b[:, 2] >= height_cm))
            | ((b[:, 2] <= height_cm) & (a[:, 2] >= height_cm))
        )
        progress = (height_cm - a[valid, 2]) / difference[valid]
        points = a[valid, :2] + progress[:, None] * (b[valid, :2] - a[valid, :2])
        intersections.append(points)
    return np.vstack(intersections) if intersections else np.empty((0, 2))


def build_scan(entry: dict, metric_dir: Path = METRIC_DIR) -> dict:
    metric_path = metric_dir / entry["path"]
    metric = json.loads(metric_path.read_text())
    npz_path = metric_dir / metric["frontProjection"]["exactFullProjection"]["path"]
    with np.load(npz_path) as source:
        vertices = source["vertices_cm"].astype(np.float64)
        triangles = source["triangles"].astype(np.int64)

    projected_yz = vertices[:, [1, 2]]
    mask, minimum, maximum, pixels_per_cm = largest_filled_silhouette(projected_yz)
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    outline_px = sample_contour(max(contours, key=cv2.contourArea))
    mesh_px, mesh_triangles = triangulate_mask(mask, outline_px)

    def pixel_to_cm(point: np.ndarray):
        return [
            round(float(point[0] / pixels_per_cm + minimum[0]), 5),
            round(float(maximum[1] - point[1] / pixels_per_cm), 5),
        ]

    waist = metric["rows"]["waist"]
    contour = np.asarray(waist["contour"]["pointsCm"], dtype=np.float64)
    torso_min_x = float(contour[:, 0].min() - 2.0)
    torso_max_x = float(contour[:, 0].max() + 2.0)
    stature = float(metric["profile"]["heightCm"])
    centre_height = float(waist["plane"]["heightCm"])
    slices = []
    for offset in SLICE_OFFSETS:
        height = centre_height + offset * stature
        points = plane_intersections(vertices, triangles, height)
        central = points[(points[:, 0] >= torso_min_x) & (points[:, 0] <= torso_max_x)]
        if len(central) < 12:
            depth = None
        elif abs(offset) < 1e-9:
            depth = float(waist["depthCm"])
        else:
            depth = float(np.quantile(central[:, 1], 0.995) - np.quantile(central[:, 1], 0.005))
        slices.append({
            "offsetBodyHeight": offset,
            "heightCm": round(height, 5),
            "depthCm": None if depth is None else round(depth, 5),
            "depthBodyHeight": None if depth is None else round(depth / stature, 8),
            "source": "exact canonical PLY central-torso horizontal slice",
        })

    return {
        "schemaVersion": "wear-exact-dual-view/v1",
        "scanId": metric["scanId"],
        "profile": metric["profile"],
        "source": {
            "metric": entry["path"],
            "exactCanonicalNpz": npz_path.name,
            "tapeUsed": False,
            "circumferenceUsed": False,
            "delaramUsed": False,
        },
        "sideProjection": {
            "coordinateOrder": ["posterior-to-anterior-y", "floor-to-head-z"],
            "units": "centimetres",
            "boundsCm": {
                "minY": round(float(minimum[0]), 5),
                "maxY": round(float(maximum[0]), 5),
                "minZ": round(float(minimum[1]), 5),
                "maxZ": round(float(maximum[1]), 5),
            },
            "outlinePointsCm": [pixel_to_cm(point) for point in outline_px],
            "mesh": {
                "verticesCm": [pixel_to_cm(point) for point in mesh_px],
                "triangles": mesh_triangles.astype(int).tolist(),
            },
        },
        "waistBand": {
            "centreHeightCm": centre_height,
            "centreHeightFractionFromFeet": round(centre_height / stature, 8),
            "slices": slices,
        },
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--scan-id", action="append")
    parser.add_argument("--metric-dir", type=Path, default=METRIC_DIR)
    parser.add_argument("--output-dir", type=Path, default=OUTPUT_DIR)
    args = parser.parse_args()
    metric_dir = args.metric_dir.resolve()
    output_dir = args.output_dir.resolve()
    index = json.loads((metric_dir / "index.json").read_text())
    entries = [
        entry for entry in index["scans"]
        if not args.scan_id or entry["scanId"] in set(args.scan_id)
    ]
    output_dir.mkdir(parents=True, exist_ok=True)
    built = []
    for entry in entries:
        payload = build_scan(entry, metric_dir)
        name = f"{entry['scanId'].lower()}.json"
        (output_dir / name).write_text(json.dumps(payload, separators=(",", ":")) + "\n")
        built.append({"scanId": entry["scanId"], "path": name})
        print(json.dumps(built[-1]), flush=True)
    (output_dir / "index.json").write_text(json.dumps({
        "schemaVersion": "wear-exact-dual-view-index/v1",
        "scanCount": len(built),
        "scans": built,
        "tapeUsed": False,
        "circumferenceUsed": False,
    }, indent=2) + "\n")


if __name__ == "__main__":
    main()
