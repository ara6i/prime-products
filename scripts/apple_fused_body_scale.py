#!/usr/bin/env python3
"""Measure visible body-row widths with Apple Vision 3D and Depth Pro.

This is the body-object analogue of ``apple_fused_tape_scale.py``. Apple
Vision supplies a known-height torso reference, Depth Pro supplies the local
body-surface depth, and the caller supplies the visible red-row endpoints plus
MediaPipe person-mask support for those rows.
Tape pixels, OCR labels, expected ruler lengths, and target circumferences are
deliberately absent from this process.
"""

import argparse
import json
import math
import time
from pathlib import Path

import numpy as np

from apple_fused_tape_scale import torso_scale, unproject


MODEL_VERSION = "apple-vision-depth-pro-person-surface-v3"

MIN_EDGE_SAMPLES = 25
MIN_MASK_COVERAGE_PCT = 40.0
MAX_EDGE_SPREAD_PCT = 15.0
MAX_EDGE_ASYMMETRY_PCT = 12.0


def supported_depth_values(depth, support, x0, x1, y0, y1):
    """Read depth only where the browser-provided person mask is positive."""
    height, width = depth.shape
    x0 = max(0, min(width, int(x0)))
    x1 = max(x0, min(width, int(x1)))
    y0 = max(0, min(height, int(y0)))
    y1 = max(y0, min(height, int(y1)))
    candidate_count = max(0, (x1 - x0) * (y1 - y0))
    chunks = []
    supported_count = 0
    for scanline in support.get("scanlines", []):
        scan_y = int(round(float(scanline.get("y", -1))))
        if scan_y < y0 or scan_y >= y1:
            continue
        for run in scanline.get("runs", []):
            run_start = max(x0, int(math.floor(float(run.get("startX", 0)))))
            run_end = min(x1, int(math.ceil(float(run.get("endX", 0)))))
            if run_end <= run_start:
                continue
            chunks.append(depth[scan_y, run_start:run_end])
            supported_count += run_end - run_start
    if not chunks:
        return np.asarray([], dtype=np.float32), 0.0, candidate_count
    values = np.concatenate(chunks).astype(np.float64, copy=False)
    values = values[np.isfinite(values) & (values > 0.05) & (values < 100)]
    coverage_pct = supported_count / candidate_count * 100 if candidate_count else 0.0
    return values, coverage_pct, candidate_count


def robust_depth_stats(values, coverage_pct, candidate_count):
    if values.size < MIN_EDGE_SAMPLES:
        return {
            "depthM": 0.0,
            "spreadPct": 999.0,
            "sampleCount": int(values.size),
            "candidateCount": int(candidate_count),
            "coveragePct": float(coverage_pct),
            "valid": False,
        }

    raw_median = float(np.median(values))
    absolute_deviation = np.abs(values - raw_median)
    mad = float(np.median(absolute_deviation))
    # Fixed robust rule. It does not inspect any tape interval or body target.
    tolerance = max(3 * 1.4826 * mad, raw_median * 0.02)
    inliers = values[absolute_deviation <= tolerance]
    if inliers.size < MIN_EDGE_SAMPLES:
        inliers = values
    median = float(np.median(inliers))
    p10, p90 = np.percentile(inliers, [10, 90])
    spread_pct = float((p90 - p10) / median * 100) if median > 0 else float("inf")
    return {
        "depthM": median,
        "spreadPct": spread_pct,
        "sampleCount": int(values.size),
        "candidateCount": int(candidate_count),
        "coveragePct": float(coverage_pct),
        "valid": bool(
            math.isfinite(median)
            and median > 0
            and coverage_pct >= MIN_MASK_COVERAGE_PCT
            and spread_pct <= MAX_EDGE_SPREAD_PCT
        ),
    }


def body_surface_stats(depth, left_x, right_x, y, support):
    """Estimate the two visible silhouette surface depths for one body row."""
    height, width = depth.shape
    left = min(left_x, right_x)
    right = max(left_x, right_x)
    span = right - left
    y_radius = max(3, min(9, int(round(height * 0.0015))))
    y0 = int(round(y)) - y_radius
    y1 = int(round(y)) + y_radius + 1
    edge_band = max(8, min(64, int(round(span * 0.12))))
    edge_inset = max(1, min(8, int(round(span * 0.02))))

    left_x0 = int(round(left)) + edge_inset
    left_x1 = min(int(round(right)), left_x0 + edge_band)
    right_x1 = int(round(right)) - edge_inset + 1
    right_x0 = max(int(round(left)), right_x1 - edge_band)
    left_values, left_coverage, left_candidates = supported_depth_values(
        depth, support, left_x0, left_x1, y0, y1
    )
    right_values, right_coverage, right_candidates = supported_depth_values(
        depth, support, right_x0, right_x1, y0, y1
    )
    left_stats = robust_depth_stats(left_values, left_coverage, left_candidates)
    right_stats = robust_depth_stats(right_values, right_coverage, right_candidates)
    mean_depth = (left_stats["depthM"] + right_stats["depthM"]) / 2
    asymmetry_pct = (
        abs(left_stats["depthM"] - right_stats["depthM"]) / mean_depth * 100
        if mean_depth > 0 else 999.0
    )
    max_spread_pct = max(left_stats["spreadPct"], right_stats["spreadPct"])
    minimum_coverage_pct = min(left_stats["coveragePct"], right_stats["coveragePct"])
    valid = bool(
        left_stats["valid"]
        and right_stats["valid"]
        and asymmetry_pct <= MAX_EDGE_ASYMMETRY_PCT
    )
    confidence = (
        "high" if valid and max_spread_pct <= 8 and asymmetry_pct <= 5 and minimum_coverage_pct >= 70
        else "medium" if valid
        else "low"
    )
    return {
        "left": left_stats,
        "right": right_stats,
        "edgeBandPx": edge_band,
        "edgeInsetPx": edge_inset,
        "edgeDepthAsymmetryPct": asymmetry_pct,
        "depthSpreadPct": max_spread_pct,
        "bodyMaskCoveragePct": minimum_coverage_pct,
        "sampleCount": left_stats["sampleCount"] + right_stats["sampleCount"],
        "confidence": confidence,
        "valid": valid,
    }


def measure_row(depth, focal_px, scale_factor, raw, support):
    name, y, left_x, right_x = raw
    height, width = depth.shape
    pixel_span = abs(right_x - left_x)
    if not all(math.isfinite(value) for value in (y, left_x, right_x)):
        raise ValueError(f"Body row {name} has invalid coordinates.")
    if y < 0 or y >= height or min(left_x, right_x) < 0 or max(left_x, right_x) >= width:
        raise ValueError(f"Body row {name} is outside the Depth Pro image.")
    if pixel_span < 20:
        raise ValueError(f"Body row {name} is too narrow to measure.")

    surface = body_surface_stats(depth, left_x, right_x, y, support)
    left_depth_m = float(surface["left"]["depthM"])
    right_depth_m = float(surface["right"]["depthM"])
    average_depth_m = (left_depth_m + right_depth_m) / 2
    if not surface["valid"]:
        return {
            "name": name,
            "y": y,
            "leftX": left_x,
            "rightX": right_x,
            "pixelSpan": pixel_span,
            "rawPlaneDepthM": average_depth_m,
            "correctedPlaneDepthM": average_depth_m * scale_factor,
            "leftEdgeDepthM": left_depth_m,
            "rightEdgeDepthM": right_depth_m,
            "correctedLeftEdgeDepthM": left_depth_m * scale_factor,
            "correctedRightEdgeDepthM": right_depth_m * scale_factor,
            "rawWidthCm": 0.0,
            "predictedWidthCm": 0.0,
            "cmPerPx": 0.0,
            "depthSpreadPct": surface["depthSpreadPct"],
            "edgeDepthAsymmetryPct": surface["edgeDepthAsymmetryPct"],
            "bodyMaskCoveragePct": surface["bodyMaskCoveragePct"],
            "sampleCount": surface["sampleCount"],
            "edgeBandPx": surface["edgeBandPx"],
            "confidence": surface["confidence"],
            "valid": False,
        }

    # The cache focal is the iPhone photo's EXIF focal when available; Depth
    # Pro predicts it only when the file has no camera metadata. The matching
    # depth/focal pair must stay together for metric 3D reconstruction.
    left_point = unproject(left_x, y, left_depth_m, focal_px, width, height)
    right_point = unproject(right_x, y, right_depth_m, focal_px, width, height)
    raw_width_cm = float(np.linalg.norm(right_point - left_point) * 100)
    predicted_width_cm = raw_width_cm * scale_factor
    return {
        "name": name,
        "y": y,
        "leftX": left_x,
        "rightX": right_x,
        "pixelSpan": pixel_span,
        "rawPlaneDepthM": average_depth_m,
        "correctedPlaneDepthM": average_depth_m * scale_factor,
        "leftEdgeDepthM": left_depth_m,
        "rightEdgeDepthM": right_depth_m,
        "correctedLeftEdgeDepthM": left_depth_m * scale_factor,
        "correctedRightEdgeDepthM": right_depth_m * scale_factor,
        "rawWidthCm": raw_width_cm,
        "predictedWidthCm": predicted_width_cm,
        "cmPerPx": predicted_width_cm / pixel_span,
        "depthSpreadPct": surface["depthSpreadPct"],
        "edgeDepthAsymmetryPct": surface["edgeDepthAsymmetryPct"],
        "bodyMaskCoveragePct": surface["bodyMaskCoveragePct"],
        "sampleCount": surface["sampleCount"],
        "edgeBandPx": surface["edgeBandPx"],
        "confidence": surface["confidence"],
        "valid": True,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--depth-cache", required=True)
    parser.add_argument("--pose-cache", required=True)
    parser.add_argument("--height-cm", required=True, type=float)
    parser.add_argument("--body-support-json", required=True)
    parser.add_argument("--row", nargs=4, action="append", default=[])
    args = parser.parse_args()

    started = time.perf_counter()
    cached = np.load(Path(args.depth_cache))
    depth = cached["depth"].astype(np.float32)
    focal_px = float(cached["focal"])
    focal_source = str(cached["focal_source"]) if "focal_source" in cached else "legacy-unknown"
    vision = json.loads(Path(args.pose_cache).read_text())
    support_rows = json.loads(args.body_support_json)
    support_by_name = {
        item.get("name"): item for item in support_rows
        if isinstance(item, dict) and isinstance(item.get("name"), str)
    }
    image_height, image_width = depth.shape
    scale_factor, dense_torso_m, apple_torso_m = torso_scale(
        vision, depth, focal_px, args.height_cm
    )
    rows = []
    for raw in args.row:
        support = support_by_name.get(raw[0])
        if not support:
            raise ValueError(f"Person-mask support is missing for body row {raw[0]}.")
        rows.append(measure_row(
            depth,
            focal_px,
            scale_factor,
            (raw[0], float(raw[1]), float(raw[2]), float(raw[3])),
            support,
        ))
    if not rows:
        raise ValueError("At least one body row is required.")

    print(json.dumps({
        "model": {
            "version": MODEL_VERSION,
            "imageWidth": image_width,
            "imageHeight": image_height,
            "depthProFocalPx": focal_px,
            "depthProFocalSource": focal_source,
            "knownHeightCm": args.height_cm,
            "absoluteScaleSource": "Apple Vision shoulder-to-spine torso rescaled by known height",
            "relativeDepthSource": "Apple Depth Pro person-mask-only left/right body surface for each red row",
            "measurementCameraSource": "iPhone photo focal metadata with Depth Pro endpoint distance",
            "bodySupportSource": "Google MediaPipe person segmentation mask",
            "endpointSource": "manual red-row visible body endpoints",
            "qualityRules": {
                "minimumEdgeSamples": MIN_EDGE_SAMPLES,
                "minimumMaskCoveragePct": MIN_MASK_COVERAGE_PCT,
                "maximumEdgeSpreadPct": MAX_EDGE_SPREAD_PCT,
                "maximumEdgeDepthAsymmetryPct": MAX_EDGE_ASYMMETRY_PCT,
            },
            "excludedInputs": [
                "tape pixels and tape path",
                "OCR labels",
                "expected ruler intervals",
                "target circumferences",
            ],
            "depthProTorsoDistanceM": dense_torso_m,
            "appleTorsoDistanceM": apple_torso_m,
            "depthProScaleFactor": scale_factor,
        },
        "rows": rows,
        "elapsedMs": round((time.perf_counter() - started) * 1000),
    }, separators=(",", ":")))


if __name__ == "__main__":
    main()
