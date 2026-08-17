#!/usr/bin/env python3
"""Measure a visible tape without using its printed values as scale.

Apple Vision and the known person height provide an independent pose/camera
check. Depth Pro provides metric depth. A coordinate-only tape locator provides
the image path. Printed tape labels and expected interval lengths are never
passed to this process; they may judge the returned distances only afterwards.

Two geometries are supported:

* a rigid 3D line for a straight, tensioned tape when the thin-object depth map
  is not locally trustworthy;
* a smoothed piecewise 3D curve when Depth Pro consistently follows a flexible
  tape bending toward and away from the camera.
"""

import argparse
import json
import math
import time
from pathlib import Path

import numpy as np


MODEL_VERSION = "apple-vision-depth-pro-tape-curve-v2"
TORSO_JOINTS = ("human_center_shoulder_3D", "human_spine_3D")


def median_depth(depth, x, y, radius):
    height, width = depth.shape
    center_x = int(round(x))
    center_y = int(round(y))
    x0 = max(0, center_x - radius)
    x1 = min(width, center_x + radius + 1)
    y0 = max(0, center_y - radius)
    y1 = min(height, center_y + radius + 1)
    values = depth[y0:y1, x0:x1]
    values = values[np.isfinite(values) & (values > 0.05) & (values < 100)]
    if values.size < 3:
        return float("nan")
    return float(np.median(values))


def unproject(x, y, depth_m, focal_px, width, height):
    return np.array([
        (x - width / 2) * depth_m / focal_px,
        (y - height / 2) * depth_m / focal_px,
        depth_m,
    ], dtype=np.float64)


def apple_joint(vision, name):
    return next((joint for joint in vision["joints"] if joint.get("name") == name), None)


def joint_points(vision, depth, focal_px, height_scale, name):
    height, width = depth.shape
    joint = apple_joint(vision, name)
    if not joint:
        raise ValueError(f"Apple Vision did not return {name}.")
    image_point = joint.get("imagePoint") or {}
    x = float(image_point.get("x", float("nan"))) * width
    y = (1 - float(image_point.get("y", float("nan")))) * height
    depth_m = median_depth(depth, x, y, radius=4)
    translation = (joint.get("cameraRelativePosition") or [[], [], [], []])[3]
    if not np.isfinite([x, y, depth_m]).all() or len(translation) < 3:
        raise ValueError(f"Apple/Depth Pro joint {name} is invalid.")
    dense_point = unproject(x, y, depth_m, focal_px, width, height)
    apple_point = np.array(translation[:3], dtype=np.float64) * height_scale
    if not np.isfinite(apple_point).all():
        raise ValueError(f"Apple Vision joint {name} is invalid.")
    return dense_point, apple_point


def torso_scale(vision, depth, focal_px, known_height_cm):
    """Return a diagnostic Apple-skeleton/Depth-Pro agreement factor.

    It remains the applied absolute scale for the rigid-line fallback because
    that is the already validated Shane control. It is deliberately *not*
    applied to a local surface curve: an internal skeleton segment and the
    visible clothing/tape surface are not the same physical segment.
    """
    reference_height_m = float(vision.get("bodyHeightM", 0))
    if not math.isfinite(reference_height_m) or reference_height_m <= 0:
        raise ValueError("Apple Vision returned no usable reference height.")
    height_scale = (known_height_cm / 100) / reference_height_m
    dense_start, apple_start = joint_points(
        vision, depth, focal_px, height_scale, TORSO_JOINTS[0]
    )
    dense_end, apple_end = joint_points(
        vision, depth, focal_px, height_scale, TORSO_JOINTS[1]
    )
    dense_distance = float(np.linalg.norm(dense_end - dense_start))
    apple_distance = float(np.linalg.norm(apple_end - apple_start))
    if dense_distance <= 0 or apple_distance <= 0:
        raise ValueError("Apple/Depth Pro torso scale is degenerate.")
    factor = apple_distance / dense_distance
    if factor < 0.75 or factor > 1.25:
        raise ValueError(
            f"Apple and Depth Pro torso scales disagree too much ({factor:.3f}x)."
        )
    return factor, dense_distance, apple_distance


def aggregate_anchor(depth, focal_px, center_x_by_y, rows):
    height, width = depth.shape
    samples = []
    for raw_y in rows:
        y = int(raw_y)
        x = float(center_x_by_y[y])
        depth_m = median_depth(depth, x, y, radius=2)
        if math.isfinite(depth_m):
            samples.append((x, float(y), depth_m))
    if len(samples) < 12:
        raise ValueError("Depth Pro could not read a stable tape support anchor.")
    x, y, depth_m = np.median(np.asarray(samples, dtype=np.float64), axis=0)
    return unproject(x, y, depth_m, focal_px, width, height), {
        "xPx": float(x),
        "yPx": float(y),
        "depthM": float(depth_m),
        "sampleCount": len(samples),
    }


def visual_straightness(center_x_by_y, visible_rows):
    y = visible_rows.astype(np.float64)
    x = np.asarray(center_x_by_y, dtype=np.float64)[visible_rows]
    design = np.column_stack([y, np.ones_like(y)])
    slope, intercept = np.linalg.lstsq(design, x, rcond=None)[0]
    residual = x - (slope * y + intercept)
    return float(np.sqrt(np.mean(residual ** 2))), float(np.max(np.abs(residual)))


def odd_window(value, minimum, maximum):
    window = max(minimum, min(maximum, int(round(value))))
    return window if window % 2 == 1 else window + 1


def moving_median(values, window):
    radius = window // 2
    padded = np.pad(values, (radius, radius), mode="edge")
    windows = np.lib.stride_tricks.sliding_window_view(padded, window)
    return np.median(windows, axis=1)


def moving_average(values, window):
    radius = window // 2
    padded = np.pad(values, (radius, radius), mode="edge")
    return np.convolve(padded, np.ones(window, dtype=np.float64) / window, mode="valid")


def build_depth_curve(depth, focal_px, center_x_by_y, visible_rows):
    height, width = depth.shape
    # The visual cache trims a small outer percentage to stop one false OCR box
    # inventing a long tape. Keep a fixed, label-free depth margin so a genuine
    # first/last mark just outside that robust support can still be queried.
    support_margin = max(80, min(300, int(round(height * 0.05))))
    first_row = max(0, int(visible_rows[0]) - support_margin)
    last_row = min(height - 1, int(visible_rows[-1]) + support_margin)
    rows = np.arange(first_row, last_row + 1, dtype=np.int32)
    center_x = np.asarray(center_x_by_y, dtype=np.float64)[rows]
    radius = max(2, min(6, int(round(min(width, height) / 1200))))
    raw_depth = np.asarray([
        median_depth(depth, x, int(y), radius=radius)
        for x, y in zip(center_x, rows)
    ], dtype=np.float64)
    valid = np.isfinite(raw_depth)
    if int(np.count_nonzero(valid)) < max(100, int(rows.size * 0.9)):
        raise ValueError("Depth Pro could not follow enough of the visible tape path.")
    if not valid.all():
        raw_depth[~valid] = np.interp(rows[~valid], rows[valid], raw_depth[valid])

    # The narrow tape can alternate between tape, clothing, and digit pixels.
    # Remove single-pixel switches, then smooth only along the tape direction.
    # Window sizes are fixed image rules and never depend on tape labels/results.
    denoised = moving_median(raw_depth, 9)
    smoothing_window = odd_window(height * 0.015, 31, 121)
    coarse_window = odd_window((smoothing_window * 2) + 1, 63, 241)
    smooth_depth = moving_average(denoised, smoothing_window)
    coarse_depth = moving_average(denoised, coarse_window)
    points = np.asarray([
        unproject(x, float(y), z, focal_px, width, height)
        for x, y, z in zip(center_x, rows, smooth_depth)
    ])
    centered = points - np.mean(points, axis=0)
    _, _, axes = np.linalg.svd(centered, full_matrices=False)
    best_direction = axes[0]
    residuals = np.linalg.norm(
        centered - np.outer(centered @ best_direction, best_direction), axis=1
    )
    segment_lengths = np.linalg.norm(np.diff(points, axis=0), axis=1)
    chord_m = float(np.linalg.norm(points[-1] - points[0]))
    curve_m = float(np.sum(segment_lengths))
    rms_m = float(np.sqrt(np.mean(residuals ** 2)))
    maximum_m = float(np.max(residuals))
    depth_noise_m = float(np.sqrt(np.mean((raw_depth - smooth_depth) ** 2)))
    coarse_delta_m = float(np.sqrt(np.mean((smooth_depth - coarse_depth) ** 2)))

    # A moderate, smooth departure from one line is evidence of a flexible tape
    # bending through depth. A very large departure on a visually straight tape
    # means the monocular map switched to body/background, as in the Shane
    # control, so the validated rigid-line geometry is safer.
    use_piecewise_curve = (
        0.004 <= rms_m <= 0.032
        and maximum_m <= 0.065
        and depth_noise_m <= 0.012
        and coarse_delta_m <= 0.008
        and chord_m > 0
        and curve_m / chord_m <= 1.08
    )
    return {
        "rows": rows.astype(np.float64),
        "centerX": center_x,
        "depth": smooth_depth,
        "coarseDepth": coarse_depth,
        "sampleRadiusPx": radius,
        "smoothingWindowPx": smoothing_window,
        "coarseSmoothingWindowPx": coarse_window,
        "sampleCount": int(rows.size),
        "supportMarginPx": support_margin,
        "rmsDeviationM": rms_m,
        "maximumDeviationM": maximum_m,
        "depthNoiseRmsM": depth_noise_m,
        "coarseDepthDeltaRmsM": coarse_delta_m,
        "lengthToChordRatio": curve_m / chord_m if chord_m > 0 else float("inf"),
        "usePiecewiseCurve": use_piecewise_curve,
    }


def build_tape_geometry(depth, focal_px, visual):
    height, width = depth.shape
    center_x_by_y = visual.get("centerXByY")
    visibility_by_y = visual.get("tapeVisibilityByY")
    if not isinstance(center_x_by_y, list) or not isinstance(visibility_by_y, list):
        raise ValueError("The coordinate-only tape path is unavailable.")
    if len(center_x_by_y) != height or len(visibility_by_y) != height:
        raise ValueError("The tape path and Depth Pro map sizes do not match.")
    if not np.isfinite(center_x_by_y).all():
        raise ValueError("The coordinate-only tape path is corrupt.")
    visible_rows = np.flatnonzero(np.asarray(visibility_by_y, dtype=np.float64) >= 0.5)
    if visible_rows.size < max(100, int(height * 0.25)):
        raise ValueError("The visible tape span is too short for 3D correction.")
    visual_span = int(visible_rows[-1] - visible_rows[0])
    if visual_span < height * 0.25:
        raise ValueError("The visible tape span is too short for perspective correction.")

    anchor_window = max(20, min(160, int(round(visible_rows.size * 0.05))))
    top_point, top_anchor = aggregate_anchor(
        depth, focal_px, center_x_by_y, visible_rows[:anchor_window]
    )
    bottom_point, bottom_anchor = aggregate_anchor(
        depth, focal_px, center_x_by_y, visible_rows[-anchor_window:]
    )
    direction = bottom_point - top_point
    direction_length = float(np.linalg.norm(direction))
    if direction_length <= 0:
        raise ValueError("Depth Pro produced a degenerate tape direction.")
    direction /= direction_length
    if direction[1] < 0:
        direction *= -1
    if abs(direction[1]) < 0.7:
        raise ValueError("The detected object is not a usable near-vertical tape path.")

    rms_px, maximum_px = visual_straightness(center_x_by_y, visible_rows)
    visual_quality = "pass" if rms_px <= 2.5 and maximum_px <= 12 else "check"
    curve = build_depth_curve(depth, focal_px, center_x_by_y, visible_rows)
    geometry_mode = (
        "piecewise-depth-curve" if curve["usePiecewiseCurve"]
        else "rigid-line-fallback"
    )
    return {
        "origin": top_point,
        "direction": direction,
        "curveRows": curve["rows"],
        "curveCenterX": curve["centerX"],
        "curveDepth": curve["depth"],
        "curveCoarseDepth": curve["coarseDepth"],
        "geometryMode": geometry_mode,
        "visibleTopYPx": int(visible_rows[0]),
        "visibleBottomYPx": int(visible_rows[-1]),
        "visibleSpanPx": visual_span,
        "visibleRowCount": int(visible_rows.size),
        "anchorWindowRows": anchor_window,
        "topAnchor": top_anchor,
        "bottomAnchor": bottom_anchor,
        "pathStraightnessRmsPx": rms_px,
        "pathMaximumDeviationPx": maximum_px,
        "curveSampleRadiusPx": curve["sampleRadiusPx"],
        "curveSmoothingWindowPx": curve["smoothingWindowPx"],
        "curveCoarseSmoothingWindowPx": curve["coarseSmoothingWindowPx"],
        "curveSampleCount": curve["sampleCount"],
        "curveSupportMarginPx": curve["supportMarginPx"],
        "curveRmsDeviationCm": curve["rmsDeviationM"] * 100,
        "curveMaximumDeviationCm": curve["maximumDeviationM"] * 100,
        "curveDepthNoiseRmsCm": curve["depthNoiseRmsM"] * 100,
        "curveCoarseDeltaRmsCm": curve["coarseDepthDeltaRmsM"] * 100,
        "curveLengthToChordRatio": curve["lengthToChordRatio"],
        "quality": visual_quality,
    }


def line_parameter_for_pixel(origin, direction, x, y, focal_px, width, height):
    ray = np.array([
        (x - width / 2) / focal_px,
        (y - height / 2) / focal_px,
        1,
    ], dtype=np.float64)
    system = np.column_stack([direction, -ray])
    parameter, ray_depth = np.linalg.lstsq(system, -origin, rcond=None)[0]
    line_point = origin + parameter * direction
    ray_point = ray_depth * ray
    residual_m = float(np.linalg.norm(line_point - ray_point))
    return float(parameter), residual_m


def query_rigid_segment(segment, geometry, focal_px, width, height, scale_factor):
    segment_id, start_x, start_y, end_x, end_y = segment
    start_parameter, start_residual = line_parameter_for_pixel(
        geometry["origin"], geometry["direction"], start_x, start_y,
        focal_px, width, height
    )
    end_parameter, end_residual = line_parameter_for_pixel(
        geometry["origin"], geometry["direction"], end_x, end_y,
        focal_px, width, height
    )
    predicted_cm = abs(end_parameter - start_parameter) * scale_factor * 100
    pixel_span = math.hypot(end_x - start_x, end_y - start_y)
    residual_cm = max(start_residual, end_residual) * scale_factor * 100
    confidence = (
        "high" if geometry["quality"] == "pass" and residual_cm <= 0.5
        else "medium" if residual_cm <= 1.5
        else "low"
    )
    return {
        "id": segment_id,
        "start": {"x": start_x, "y": start_y},
        "end": {"x": end_x, "y": end_y},
        "pixelSpan": pixel_span,
        "predictedCm": predicted_cm,
        "averageCmPerPx": predicted_cm / pixel_span,
        "rayFitResidualCm": residual_cm,
        "curveStabilityPct": 0,
        "geometryMode": "rigid-line-fallback",
        "appliedScaleFactor": scale_factor,
        "confidence": confidence,
    }


def curve_segment_distance(
    start_x, start_y, end_x, end_y, geometry, focal_px, width, height, depth_key
):
    minimum_y = float(geometry["curveRows"][0])
    maximum_y = float(geometry["curveRows"][-1])
    low_y = min(start_y, end_y)
    high_y = max(start_y, end_y)
    if low_y < minimum_y - 2 or high_y > maximum_y + 2:
        raise ValueError("The selected ruler extends outside the detected tape depth path.")
    if abs(end_y - start_y) < 8:
        raise ValueError("The curved tape ruler needs a vertical interval.")

    count = max(3, int(math.ceil(abs(end_y - start_y))) + 1)
    ys = np.linspace(start_y, end_y, count)
    tape_xs = np.interp(ys, geometry["curveRows"], geometry["curveCenterX"])
    start_tape_x = float(np.interp(start_y, geometry["curveRows"], geometry["curveCenterX"]))
    end_tape_x = float(np.interp(end_y, geometry["curveRows"], geometry["curveCenterX"]))
    on_tape_tolerance = max(24, width * 0.012)
    follows_tape = (
        abs(start_x - start_tape_x) <= on_tape_tolerance
        and abs(end_x - end_tape_x) <= on_tape_tolerance
    )
    xs = tape_xs if follows_tape else np.linspace(start_x, end_x, count)
    depths = np.interp(ys, geometry["curveRows"], geometry[depth_key])
    points = np.asarray([
        unproject(x, y, z, focal_px, width, height)
        for x, y, z in zip(xs, ys, depths)
    ])
    return float(np.sum(np.linalg.norm(np.diff(points, axis=0), axis=1))), follows_tape


def query_curve_segment(segment, geometry, focal_px, width, height, torso_factor):
    segment_id, start_x, start_y, end_x, end_y = segment
    distance_m, follows_tape = curve_segment_distance(
        start_x, start_y, end_x, end_y, geometry, focal_px, width, height, "curveDepth"
    )
    coarse_m, _ = curve_segment_distance(
        start_x, start_y, end_x, end_y, geometry, focal_px, width, height,
        "curveCoarseDepth"
    )
    predicted_cm = distance_m * 100
    pixel_span = math.hypot(end_x - start_x, end_y - start_y)
    stability_pct = abs(distance_m - coarse_m) / max(distance_m, 1e-9) * 100
    residual_cm = max(geometry["curveDepthNoiseRmsCm"], abs(distance_m - coarse_m) * 100)
    apple_disagreement_pct = abs(torso_factor - 1) * 100
    confidence = (
        "high" if stability_pct <= 1 and residual_cm <= 0.5 and apple_disagreement_pct <= 5
        else "medium" if stability_pct <= 2.5 and residual_cm <= 1.25
        else "low"
    )
    return {
        "id": segment_id,
        "start": {"x": start_x, "y": start_y},
        "end": {"x": end_x, "y": end_y},
        "pixelSpan": pixel_span,
        "predictedCm": predicted_cm,
        "averageCmPerPx": predicted_cm / pixel_span,
        "rayFitResidualCm": residual_cm,
        "curveStabilityPct": stability_pct,
        "geometryMode": "piecewise-depth-curve",
        "appliedScaleFactor": 1,
        "followsDetectedTapePath": follows_tape,
        "confidence": confidence,
    }


def query_segment(segment, geometry, focal_px, width, height, scale_factor):
    if geometry["geometryMode"] == "piecewise-depth-curve":
        return query_curve_segment(
            segment, geometry, focal_px, width, height, scale_factor
        )
    return query_rigid_segment(
        segment, geometry, focal_px, width, height, scale_factor
    )


def project_target_segment(raw, geometry, focal_px, width, height, scale_factor):
    """Find the image endpoint that represents a caller-supplied physical length.

    The target is a frozen body-width result. Tape numbers, OCR values, and
    expected tape intervals are not available here. The detected tape support
    supplies only the camera/depth path on which the blind line is drawn.
    """
    target_id, anchor_x, anchor_y, target_cm, direction = raw
    if not all(math.isfinite(value) for value in (anchor_x, anchor_y, target_cm, direction)):
        raise ValueError(f"Blind target {target_id} has invalid values.")
    if target_cm <= 0:
        raise ValueError(f"Blind target {target_id} must be positive.")
    direction = 1 if direction >= 0 else -1
    minimum_y = float(geometry["visibleTopYPx"])
    maximum_y = float(geometry["visibleBottomYPx"])
    if anchor_y < minimum_y - 2 or anchor_y > maximum_y + 2:
        raise ValueError(f"Blind target {target_id} starts outside the visible tape path.")

    boundary_y = maximum_y if direction > 0 else minimum_y
    maximum_span = abs(boundary_y - anchor_y)
    if maximum_span < 8:
        raise ValueError(f"Blind target {target_id} has no visible room in that direction.")

    def result_for_span(span):
        end_y = anchor_y + (direction * span)
        return query_segment(
            (target_id, anchor_x, anchor_y, anchor_x, end_y),
            geometry,
            focal_px,
            width,
            height,
            scale_factor,
        )

    maximum_result = result_for_span(maximum_span)
    if maximum_result["predictedCm"] + 1e-6 < target_cm:
        raise ValueError(
            f"Blind target {target_id} needs {target_cm:.2f} cm but only "
            f"{maximum_result['predictedCm']:.2f} cm is visible in that direction."
        )

    low_span = 0.0
    high_span = maximum_span
    for _ in range(60):
        middle_span = (low_span + high_span) / 2
        if middle_span < 8:
            low_span = middle_span
            continue
        middle_result = result_for_span(middle_span)
        if middle_result["predictedCm"] < target_cm:
            low_span = middle_span
        else:
            high_span = middle_span

    result = result_for_span((low_span + high_span) / 2)
    return {
        **result,
        "targetCm": target_cm,
        "projectionErrorCm": result["predictedCm"] - target_cm,
        "direction": direction,
        "inputPolicy": "frozen body width plus camera/depth geometry; printed tape values excluded",
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--depth-cache", required=True)
    parser.add_argument("--pose-cache", required=True)
    parser.add_argument("--visual-path", required=True)
    parser.add_argument("--height-cm", required=True, type=float)
    parser.add_argument("--segment", nargs=5, action="append", default=[])
    parser.add_argument("--target", nargs=5, action="append", default=[])
    args = parser.parse_args()

    started = time.perf_counter()
    cached = np.load(Path(args.depth_cache))
    depth = cached["depth"].astype(np.float32)
    focal_px = float(cached["focal"])
    vision = json.loads(Path(args.pose_cache).read_text())
    visual = json.loads(Path(args.visual_path).read_text())
    height, width = depth.shape

    scale_factor, dense_torso_m, apple_torso_m = torso_scale(
        vision, depth, focal_px, args.height_cm
    )
    geometry = build_tape_geometry(depth, focal_px, visual)
    segments = []
    segment_errors = []
    for raw in args.segment:
        segment_id = raw[0]
        coordinates = [float(value) for value in raw[1:]]
        try:
            segments.append(query_segment(
                (segment_id, *coordinates), geometry, focal_px, width, height, scale_factor
            ))
        except ValueError as error:
            # Each ruler is an independent diagnostic. A free ruler can extend
            # beyond the detected tape path without preventing a valid active,
            # red-copy, or hidden interval from being calculated.
            segment_errors.append({
                "id": segment_id,
                "error": str(error),
            })

    target_projections = []
    target_errors = []
    for raw in args.target:
        target_id = raw[0]
        values = [float(value) for value in raw[1:]]
        try:
            target_projections.append(project_target_segment(
                (target_id, *values), geometry, focal_px, width, height, scale_factor
            ))
        except ValueError as error:
            target_errors.append({
                "id": target_id,
                "error": str(error),
            })

    private_keys = {
        "origin", "direction", "curveRows", "curveCenterX", "curveDepth",
        "curveCoarseDepth",
    }
    public_geometry = {
        key: value for key, value in geometry.items() if key not in private_keys
    }
    public_geometry["direction"] = [float(value) for value in geometry["direction"]]
    curve_mode = geometry["geometryMode"] == "piecewise-depth-curve"
    print(json.dumps({
        "model": {
            "version": MODEL_VERSION,
            "imageWidth": width,
            "imageHeight": height,
            "depthProFocalPx": focal_px,
            "knownHeightCm": args.height_cm,
            "absoluteScaleSource": (
                "Depth Pro zero-shot metric curve; Apple Vision and known height are independent checks"
                if curve_mode
                else "Apple Vision known-height scale on a rigid Depth Pro tape line"
            ),
            "relativeDepthSource": (
                "Apple Depth Pro smoothed local tape curve; printed values excluded"
                if curve_mode
                else "Apple Depth Pro rigid tape support line; printed values excluded"
            ),
            "torsoJointNames": list(TORSO_JOINTS),
            "depthProTorsoDistanceM": dense_torso_m,
            "appleTorsoDistanceM": apple_torso_m,
            "depthProScaleFactor": scale_factor,
            "appliedScaleFactor": 1 if curve_mode else scale_factor,
            "tapePlane": public_geometry,
        },
        "segments": segments,
        "segmentErrors": segment_errors,
        "targetProjections": target_projections,
        "targetErrors": target_errors,
        "elapsedMs": round((time.perf_counter() - started) * 1000),
    }, separators=(",", ":")))


if __name__ == "__main__":
    main()
