#!/usr/bin/env python3
"""Evaluate Depth Pro metric 3D distances against a known tape interval."""

import argparse
import base64
import io
import json
import math
import time
from pathlib import Path

import numpy as np
import torch
from depth_pro import create_model_and_transforms, load_rgb
from PIL import Image


def median_depth(depth, x, y, radius):
    h, w = depth.shape
    x0, x1 = max(0, round(x) - radius), min(w, round(x) + radius + 1)
    y0, y1 = max(0, round(y) - radius), min(h, round(y) + radius + 1)
    return float(np.median(depth[y0:y1, x0:x1]))


def point_3d(depth, focal, x, y, radius):
    h, w = depth.shape
    z = median_depth(depth, x, y, radius)
    return np.array([(x - w / 2) * z / focal, (y - h / 2) * z / focal, z])


def distance_cm(a, b):
    return float(np.linalg.norm(a - b) * 100)


def interior_row_stats(depth, left_x, right_x, y, y_radius=5, trim_fraction=0.2):
    h, w = depth.shape
    span = abs(right_x - left_x)
    x0 = max(0, round(min(left_x, right_x) + span * trim_fraction))
    x1 = min(w, round(max(left_x, right_x) - span * trim_fraction) + 1)
    y0, y1 = max(0, round(y) - y_radius), min(h, round(y) + y_radius + 1)
    values = depth[y0:y1, x0:x1]
    values = values[np.isfinite(values) & (values > 0.05) & (values < 100)]
    if values.size < 25:
        return {"depth": 0.0, "spreadPct": 999.0, "confidence": "low", "valid": False}
    median = float(np.median(values))
    p10, p90 = np.percentile(values, [10, 90])
    spread_pct = float((p90 - p10) / median * 100) if median > 0 else float("inf")
    confidence = "high" if spread_pct <= 8 else "medium" if spread_pct <= 20 else "low"
    return {"depth": median, "spreadPct": spread_pct, "confidence": confidence, "valid": spread_pct <= 25}


def depth_preview(depth, maximum_dimension=720):
    height, width = depth.shape
    step = max(1, math.ceil(max(height, width) / maximum_dimension))
    sampled = depth[::step, ::step]
    finite = sampled[np.isfinite(sampled) & (sampled > 0.05) & (sampled < 20)]
    if finite.size < 100:
        return {"dataUrl": None, "nearM": None, "farM": None}
    near, far = np.percentile(finite, [2, 98])
    span = max(float(far - near), 1e-6)
    normalized = 1.0 - np.clip((sampled - near) / span, 0, 1)
    grayscale = np.uint8(28 + (normalized * 220))
    preview = Image.fromarray(grayscale).convert("L")
    buffer = io.BytesIO()
    preview.save(buffer, format="JPEG", quality=78, optimize=True)
    encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
    return {
        "dataUrl": f"data:image/jpeg;base64,{encoded}",
        "nearM": float(near),
        "farM": float(far),
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("image")
    parser.add_argument("--top", nargs=2, required=True, type=float)
    parser.add_argument("--bottom", nargs=2, required=True, type=float)
    parser.add_argument("--height-cm", required=True, type=float)
    parser.add_argument("--proof-start", nargs=2, required=True, type=float)
    parser.add_argument("--proof-end", nargs=2, required=True, type=float)
    parser.add_argument("--proof-cm", required=True, type=float)
    parser.add_argument("--patch-radius", type=int, default=3)
    parser.add_argument("--cache-path")
    parser.add_argument("--row", nargs=4, action="append", metavar=("NAME", "Y", "LEFT_X", "RIGHT_X"), default=[])
    args = parser.parse_args()

    started = time.perf_counter()
    cache_path = Path(args.cache_path) if args.cache_path else None
    cache_hit = bool(cache_path and cache_path.is_file())
    if cache_hit:
        cached = np.load(cache_path)
        depth = cached["depth"].astype(np.float32)
        focal = float(cached["focal"])
        device_label = "cached-depth-map"
    else:
        device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")
        device_label = str(device)
        precision = torch.float16 if device.type == "mps" else torch.float32
        model, transform = create_model_and_transforms(device=device, precision=precision)
        model.eval()
        image, _, _ = load_rgb(args.image)
        prediction = model.infer(transform(image), f_px=None)
        depth = prediction["depth"].detach().float().cpu().numpy()
        focal = float(prediction["focallength_px"].detach().float().cpu())
        if cache_path:
            cache_path.parent.mkdir(parents=True, exist_ok=True)
            np.savez_compressed(cache_path, depth=depth.astype(np.float16), focal=np.float32(focal))

    top = point_3d(depth, focal, *args.top, args.patch_radius)
    bottom = point_3d(depth, focal, *args.bottom, args.patch_radius)
    start = point_3d(depth, focal, *args.proof_start, args.patch_radius)
    end = point_3d(depth, focal, *args.proof_end, args.patch_radius)
    raw_height = distance_cm(top, bottom)
    raw_proof = distance_cm(start, end)
    normalized_proof = raw_proof * args.height_cm / raw_height

    radius_sweep = []
    for radius in (0, 1, 3, 5, 9, 15):
        sweep_start = point_3d(depth, focal, *args.proof_start, radius)
        sweep_end = point_3d(depth, focal, *args.proof_end, radius)
        sweep_cm = distance_cm(sweep_start, sweep_end)
        radius_sweep.append({
            "radiusPx": radius,
            "proofCm": sweep_cm,
            "errorPct": (sweep_cm / args.proof_cm - 1) * 100,
            "startDepthM": float(sweep_start[2]),
            "endDepthM": float(sweep_end[2]),
        })

    rows = []
    for name, y_value, left_value, right_value in args.row:
        y, left_x, right_x = float(y_value), float(left_value), float(right_value)
        plane_stats = interior_row_stats(depth, left_x, right_x, y)
        plane_depth = plane_stats["depth"]
        plane_width_cm = abs(right_x - left_x) * plane_depth / focal * 100
        row_sweep = []
        for radius in (0, 1, 3, 5, 9, 15):
            left = point_3d(depth, focal, left_x, y, radius)
            right = point_3d(depth, focal, right_x, y, radius)
            row_sweep.append({
                "radiusPx": radius,
                "widthCm": distance_cm(left, right),
                "leftDepthM": float(left[2]),
                "rightDepthM": float(right[2]),
            })
        rows.append({
            "name": name, "y": y, "leftX": left_x, "rightX": right_x,
            "pixelSpan": abs(right_x - left_x),
            "interiorPlaneDepthM": plane_depth,
            "interiorPlaneWidthCm": plane_width_cm,
            "depthSpreadPct": plane_stats["spreadPct"],
            "confidence": plane_stats["confidence"],
            "valid": plane_stats["valid"],
            "sweep": row_sweep,
        })

    preview = depth_preview(depth)

    print(json.dumps({
        "device": device_label,
        "cacheHit": cache_hit,
        "elapsedMs": round((time.perf_counter() - started) * 1000),
        "imageSize": [depth.shape[1], depth.shape[0]],
        "estimatedFocalPx": focal,
        "estimatedVfovDeg": math.degrees(2 * math.atan(depth.shape[0] / (2 * focal))),
        "rawPredictedHeightCm": raw_height,
        "rawProofCm": raw_proof,
        "heightNormalizedProofCm": normalized_proof,
        "expectedProofCm": args.proof_cm,
        "rawErrorPct": (raw_proof / args.proof_cm - 1) * 100,
        "heightNormalizedErrorPct": (normalized_proof / args.proof_cm - 1) * 100,
        "sampleDepthM": {
            "top": float(top[2]), "bottom": float(bottom[2]),
            "proofStart": float(start[2]), "proofEnd": float(end[2]),
        },
        "patchRadiusPx": args.patch_radius,
        "depthPreviewDataUrl": preview["dataUrl"],
        "depthPreviewNearM": preview["nearM"],
        "depthPreviewFarM": preview["farM"],
        "proofRadiusSweep": radius_sweep,
        "rows": rows,
    }, separators=(",", ":")))


if __name__ == "__main__":
    main()
