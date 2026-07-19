#!/usr/bin/env python3
"""Evaluate Depth Anything V2 metric depth against a known tape interval."""

import argparse
import json
import time

import numpy as np
import torch
from PIL import Image
from transformers import AutoImageProcessor, AutoModelForDepthEstimation


def median_depth(depth, x, y, radius):
    h, w = depth.shape
    x0, x1 = max(0, round(x) - radius), min(w, round(x) + radius + 1)
    y0, y1 = max(0, round(y) - radius), min(h, round(y) + radius + 1)
    return float(np.median(depth[y0:y1, x0:x1]))


def point_3d(depth, focal, x, y, radius):
    h, w = depth.shape
    z = median_depth(depth, x, y, radius)
    return np.array([(x - w / 2) * z / focal, (y - h / 2) * z / focal, z])


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("image")
    parser.add_argument("--proof-start", nargs=2, required=True, type=float)
    parser.add_argument("--proof-end", nargs=2, required=True, type=float)
    parser.add_argument("--proof-cm", required=True, type=float)
    parser.add_argument("--focal-px", required=True, type=float)
    parser.add_argument("--model", default="depth-anything/Depth-Anything-V2-Metric-Indoor-Small-hf")
    args = parser.parse_args()

    device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")
    started = time.perf_counter()
    image = Image.open(args.image).convert("RGB")
    processor = AutoImageProcessor.from_pretrained(args.model)
    model = AutoModelForDepthEstimation.from_pretrained(args.model).to(device).eval()
    inputs = processor(images=image, return_tensors="pt").to(device)
    with torch.no_grad():
        outputs = model(**inputs)
    result = processor.post_process_depth_estimation(outputs, target_sizes=[(image.height, image.width)])[0]
    depth = result["predicted_depth"].detach().float().cpu().numpy()

    sweep = []
    for radius in (0, 1, 3, 5, 9, 15):
        start = point_3d(depth, args.focal_px, *args.proof_start, radius)
        end = point_3d(depth, args.focal_px, *args.proof_end, radius)
        proof = float(np.linalg.norm(start - end) * 100)
        sweep.append({"radiusPx": radius, "proofCm": proof, "errorPct": (proof / args.proof_cm - 1) * 100})

    print(json.dumps({
        "device": str(device), "model": args.model,
        "elapsedMs": round((time.perf_counter() - started) * 1000),
        "focalPxSource": args.focal_px, "expectedProofCm": args.proof_cm,
        "proofRadiusSweep": sweep,
    }, separators=(",", ":")))


if __name__ == "__main__":
    main()
