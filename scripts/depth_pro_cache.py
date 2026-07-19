#!/usr/bin/env python3
"""Create a Depth Pro depth/focal cache without tape labels or known lengths."""

import argparse
import json
import time
from pathlib import Path

import numpy as np
import torch
from depth_pro import create_model_and_transforms, load_rgb


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("image")
    parser.add_argument("--cache-path", required=True)
    args = parser.parse_args()

    started = time.perf_counter()
    cache_path = Path(args.cache_path)
    if cache_path.is_file():
        cached = np.load(cache_path)
        depth = cached["depth"]
        focal = float(cached["focal"])
        cache_hit = True
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
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        np.savez_compressed(cache_path, depth=depth.astype(np.float16), focal=np.float32(focal))
        cache_hit = False

    print(json.dumps({
        "cacheHit": cache_hit,
        "device": device_label,
        "imageWidth": int(depth.shape[1]),
        "imageHeight": int(depth.shape[0]),
        "focalPx": focal,
        "elapsedMs": round((time.perf_counter() - started) * 1000),
        "inputs": "image-only-no-height-no-tape-no-expected-length",
    }, separators=(",", ":")))


if __name__ == "__main__":
    main()
