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
        image, _, metadata_focal_px = load_rgb(args.image)
        # Depth Pro's official path uses EXIF focal length when it exists.
        # Discarding it made the model guess a different camera and corrupted
        # every later pixel-to-centimetre measurement.
        prediction = model.infer(transform(image), f_px=metadata_focal_px)
        depth = prediction["depth"].detach().float().cpu().numpy()
        focal_value = prediction["focallength_px"]
        focal = float(focal_value.detach().float().cpu()) if hasattr(focal_value, "detach") else float(focal_value)
        focal_source = "photo-metadata" if metadata_focal_px is not None else "depth-pro-estimate"
        cache_path.parent.mkdir(parents=True, exist_ok=True)
        np.savez_compressed(
            cache_path,
            depth=depth.astype(np.float16),
            focal=np.float32(focal),
            focal_source=np.asarray(focal_source),
        )
        cache_hit = False

    if cache_hit:
        focal_source = str(cached["focal_source"]) if "focal_source" in cached else "legacy-unknown"

    print(json.dumps({
        "cacheHit": cache_hit,
        "device": device_label,
        "imageWidth": int(depth.shape[1]),
        "imageHeight": int(depth.shape[0]),
        "focalPx": focal,
        "focalSource": focal_source,
        "elapsedMs": round((time.perf_counter() - started) * 1000),
        "inputs": "image-only-no-height-no-tape-no-expected-length",
    }, separators=(",", ":")))


if __name__ == "__main__":
    main()
