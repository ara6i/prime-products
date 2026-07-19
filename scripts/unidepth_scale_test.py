#!/usr/bin/env python3
"""Evaluate UniDepthV2 point-cloud distances against a known tape interval."""

import argparse
import json
import time

import numpy as np
import torch
from PIL import Image
from unidepth.models import UniDepthV2


def median_point(points, x, y, radius):
    _, h, w = points.shape
    x0, x1 = max(0, round(x) - radius), min(w, round(x) + radius + 1)
    y0, y1 = max(0, round(y) - radius), min(h, round(y) + radius + 1)
    patch = points[:, y0:y1, x0:x1].reshape(3, -1)
    return np.median(patch, axis=1)


def distance_cm(a, b):
    return float(np.linalg.norm(a - b) * 100)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("image")
    parser.add_argument("--proof-start", nargs=2, required=True, type=float)
    parser.add_argument("--proof-end", nargs=2, required=True, type=float)
    parser.add_argument("--proof-cm", required=True, type=float)
    parser.add_argument("--model", default="lpiccinelli/unidepth-v2-vits14")
    args = parser.parse_args()

    device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")
    started = time.perf_counter()
    model = UniDepthV2.from_pretrained(args.model).to(device).eval()
    rgb = torch.from_numpy(np.asarray(Image.open(args.image).convert("RGB")).copy()).permute(2, 0, 1).to(device)
    predictions = model.infer(rgb)
    points = predictions["points"].detach().float().cpu().squeeze().numpy()
    if points.shape[0] != 3:
        points = np.moveaxis(points, -1, 0)

    sweep = []
    for radius in (0, 1, 3, 5, 9, 15):
        start = median_point(points, *args.proof_start, radius)
        end = median_point(points, *args.proof_end, radius)
        proof = distance_cm(start, end)
        sweep.append({"radiusPx": radius, "proofCm": proof, "errorPct": (proof / args.proof_cm - 1) * 100})

    intrinsics = predictions.get("intrinsics")
    print(json.dumps({
        "device": str(device),
        "model": args.model,
        "elapsedMs": round((time.perf_counter() - started) * 1000),
        "pointsShape": list(points.shape),
        "intrinsics": intrinsics.detach().float().cpu().squeeze().tolist() if intrinsics is not None else None,
        "expectedProofCm": args.proof_cm,
        "proofRadiusSweep": sweep,
    }, separators=(",", ":")))


if __name__ == "__main__":
    main()
