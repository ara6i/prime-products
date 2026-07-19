#!/usr/bin/env python3
"""Run local GeoCalib inference and emit a compact JSON result."""

import argparse
import json
import math
import sys
import time

import torch
from geocalib import GeoCalib


def values(tensor):
    return tensor.detach().cpu().reshape(-1).tolist()


def scalar(tensor):
    return float(values(tensor)[0])


def perspective_height_model(camera, gravity, top, bottom, height_cm):
    """Fit a 1-D vertical projective map using feet, head, and vertical VP."""
    K = camera.K.detach().cpu().reshape(3, 3)
    g = gravity.vec3d.detach().cpu().reshape(3)
    vanishing_h = K @ g
    if abs(float(vanishing_h[2])) < 1e-8:
        raise ValueError("Vertical vanishing point is at infinity")
    vanishing = [float(vanishing_h[0] / vanishing_h[2]), float(vanishing_h[1] / vanishing_h[2])]
    dx = vanishing[0] - bottom[0]
    dy = vanishing[1] - bottom[1]
    length_sq = dx * dx + dy * dy

    def line_u(point):
        return ((point[0] - bottom[0]) * dx + (point[1] - bottom[1]) * dy) / length_sq

    top_u = line_u(top)
    coefficient = top_u / (height_cm * (1.0 - top_u))

    def height_at(point):
        u = line_u(point)
        return u / (coefficient * (1.0 - u))

    return vanishing, height_at


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("image")
    parser.add_argument("--device", choices=("auto", "cpu", "mps"), default="auto")
    parser.add_argument("--height-cm", type=float)
    parser.add_argument("--top", nargs=2, type=float, metavar=("X", "Y"))
    parser.add_argument("--bottom", nargs=2, type=float, metavar=("X", "Y"))
    parser.add_argument("--proof-start", nargs=2, type=float, metavar=("X", "Y"))
    parser.add_argument("--proof-end", nargs=2, type=float, metavar=("X", "Y"))
    parser.add_argument("--proof-cm", type=float)
    args = parser.parse_args()

    if args.device == "auto":
        device = "mps" if torch.backends.mps.is_available() else "cpu"
    else:
        device = args.device

    started = time.perf_counter()
    model = GeoCalib().to(device)
    image = model.load_image(args.image).to(device)
    result = model.calibrate(image)
    camera = result["camera"]
    gravity = result["gravity"]

    output = {
        "device": device,
        "elapsedMs": round((time.perf_counter() - started) * 1000),
        "imageSize": values(camera.size),
        "focalPx": values(camera.f),
        "principalPointPx": values(camera.c),
        "vfovDeg": math.degrees(scalar(camera.vfov)),
        "hfovDeg": math.degrees(scalar(camera.hfov)),
        "rollDeg": math.degrees(scalar(gravity.roll)),
        "pitchDeg": math.degrees(scalar(gravity.pitch)),
        "gravityCamera": values(gravity.vec3d),
        "intrinsicMatrix": camera.K.detach().cpu().reshape(3, 3).tolist(),
        "uncertainty": {
            key: values(value)
            for key, value in result.items()
            if "uncertainty" in key
        },
    }
    geometry_args = (args.height_cm, args.top, args.bottom)
    if any(value is not None for value in geometry_args) and not all(value is not None for value in geometry_args):
        parser.error("--height-cm, --top, and --bottom must be provided together")
    if all(value is not None for value in geometry_args):
        vanishing, height_at = perspective_height_model(camera, gravity, args.top, args.bottom, args.height_cm)
        output["verticalVanishingPointPx"] = vanishing
        if args.proof_start and args.proof_end:
            corrected_cm = abs(height_at(args.proof_start) - height_at(args.proof_end))
            output["proof"] = {
                "perspectiveCorrectedCm": corrected_cm,
                "expectedCm": args.proof_cm,
                "errorCm": corrected_cm - args.proof_cm if args.proof_cm else None,
                "errorPct": (corrected_cm / args.proof_cm - 1.0) * 100 if args.proof_cm else None,
            }
    print(json.dumps(output, separators=(",", ":")))


if __name__ == "__main__":
    try:
        main()
    except Exception as exc:
        print(f"GeoCalib failed: {exc}", file=sys.stderr)
        raise
