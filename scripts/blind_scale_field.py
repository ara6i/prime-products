#!/usr/bin/env python3
"""Freeze and query a tape-blind, height-normalized perspective scale field.

The model never receives tape labels or an expected segment length. Absolute
scale comes from the known head-to-foot height. Apple Vision camera geometry is
provided by the API, while Depth Pro contributes relative depth only.
"""

import argparse
import json
import math
import time
from pathlib import Path

import numpy as np
import torch
from depth_pro import create_model_and_transforms, load_rgb


MODEL_VERSION = "height-depth-pro-dense-field-v8"


def median_depth(depth, x, y, radius=4):
    height, width = depth.shape
    center_x = int(round(x))
    center_y = int(round(y))
    x0 = max(0, center_x - radius)
    x1 = min(width, center_x + radius + 1)
    y0 = max(0, center_y - radius)
    y1 = min(height, center_y + radius + 1)
    values = depth[y0:y1, x0:x1]
    values = values[np.isfinite(values) & (values > 0.05) & (values < 100)]
    if values.size < 9:
        return float("nan")
    return float(np.median(values))


def load_depth(image_path, cache_path):
    if cache_path.is_file():
        cached = np.load(cache_path)
        focal_source = str(cached["focal_source"]) if "focal_source" in cached else "legacy-unknown"
        return cached["depth"].astype(np.float32), float(cached["focal"]), focal_source, True

    device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")
    precision = torch.float16 if device.type == "mps" else torch.float32
    model, transform = create_model_and_transforms(device=device, precision=precision)
    model.eval()
    image, _, metadata_focal_px = load_rgb(str(image_path))
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
    return depth, focal, focal_source, False


def fit_reference_candidate(depth, x, sample_y, y_center, y_scale):
    depths = np.array([median_depth(depth, x, y) for y in sample_y], dtype=np.float64)
    valid = np.isfinite(depths) & (depths > 0.05)
    if int(valid.sum()) < max(40, int(len(sample_y) * 0.8)):
        return None
    normalized_y = (sample_y[valid] - y_center) / y_scale
    inverse_depth = 1.0 / depths[valid]
    slope, intercept = np.polyfit(normalized_y, inverse_depth, 1)
    predicted = slope * normalized_y + intercept
    if np.any(predicted <= 0):
        return None
    rmse = float(np.sqrt(np.mean((inverse_depth - predicted) ** 2)))
    rmse_pct = rmse / float(np.mean(inverse_depth)) * 100
    return {
        "x": float(x),
        "inverseDepthSlope": float(slope),
        "inverseDepthIntercept": float(intercept),
        "fitRmsePct": rmse_pct,
        "sampleCount": int(valid.sum()),
    }


def reference_depth(model, y):
    normalized_y = (y - model["referenceYCenterPx"]) / model["referenceYScalePx"]
    inverse_depth = (
        model["inverseDepthSlope"] * normalized_y
        + model["inverseDepthIntercept"]
    )
    return 1.0 / max(inverse_depth, 1e-6)


def depth_pro_reference_depth(model, y):
    normalized_y = (y - model["referenceYCenterPx"]) / model["referenceYScalePx"]
    inverse_depth = (
        model["depthProReferenceSlope"] * normalized_y
        + model["depthProReferenceIntercept"]
    )
    return 1.0 / max(inverse_depth, 1e-6)


def unproject(model, x, y, depth_m):
    return np.array([
        (x - model["principalPointXPx"]) * depth_m / model["focalXPx"],
        (y - model["principalPointYPx"]) * depth_m / model["focalYPx"],
        depth_m,
    ])


def unproject_dense(model, x, y, depth_m):
    return np.array([
        (x - model["densePrincipalPointXPx"]) * depth_m / model["denseFocalXPx"],
        (y - model["densePrincipalPointYPx"]) * depth_m / model["denseFocalYPx"],
        depth_m,
    ])


def apple_pitch_reference(args, y_center, y_scale):
    """Solve the legacy known-height body-plane cross-check.

    The dense Depth Pro field below is the primary result. This independent
    upright-person plane remains only to detect large method disagreement.
    """
    top_x, top_y = args.top
    bottom_x, bottom_y = args.bottom
    if abs(top_x - bottom_x) > args.image_width * 0.1:
        raise ValueError("The yellow height line is too diagonal for the blind pitch model.")
    height_m = args.height_cm / 100
    pitch = math.radians(args.camera_pitch)
    up_y = -math.cos(pitch)
    up_z = math.sin(pitch)
    top_ray_y = (top_y - args.principal_y) / args.focal_y
    bottom_ray_y = (bottom_y - args.principal_y) / args.focal_y
    denominator = top_ray_y - bottom_ray_y
    if abs(denominator) < 1e-6:
        raise ValueError("The yellow height line cannot solve a pitched camera plane.")
    bottom_depth = height_m * (up_y - (top_ray_y * up_z)) / denominator
    top_depth = bottom_depth + (height_m * up_z)
    if min(top_depth, bottom_depth) <= 0.1 or max(top_depth, bottom_depth) > 20:
        raise ValueError("Apple pitch produced an invalid known-height body plane.")

    inverse_top = 1.0 / top_depth
    inverse_bottom = 1.0 / bottom_depth
    inverse_per_pixel = (inverse_bottom - inverse_top) / (bottom_y - top_y)
    inverse_at_center = inverse_top + (inverse_per_pixel * (y_center - top_y))
    return {
        "inverseDepthSlope": inverse_per_pixel * y_scale,
        "inverseDepthIntercept": inverse_at_center,
        "topDepthM": top_depth,
        "bottomDepthM": bottom_depth,
    }


def build_plane_depth_profile(depth, minimum_y, maximum_y, reference_y):
    """Freeze Depth Pro's metric distance for every image X at body mid-height.

    A broad central band rejects endpoint noise and gives each vertical image
    plane one stable distance offset. Green ruler coordinates are not used.
    """
    height, width = depth.shape
    span_y = maximum_y - minimum_y
    band_radius = max(60, span_y * 0.1)
    y0 = max(0, int(round(reference_y - band_radius)))
    y1 = min(height, int(round(reference_y + band_radius)) + 1)
    sampled = depth[y0:y1:4].astype(np.float64)
    sampled[~np.isfinite(sampled) | (sampled <= 0.05) | (sampled >= 100)] = np.nan
    profile = np.full(width, np.nan, dtype=np.float64)
    spread = np.full(width, np.nan, dtype=np.float64)
    for x in range(width):
        x0 = max(0, x - 4)
        x1 = min(width, x + 5)
        values = sampled[:, x0:x1].reshape(-1)
        values = values[np.isfinite(values)]
        if values.size < 25:
            continue
        median = float(np.median(values))
        p10, p90 = np.percentile(values, [10, 90])
        profile[x] = median
        spread[x] = float((p90 - p10) / median * 100) if median > 0 else float("nan")
    finite = np.flatnonzero(np.isfinite(profile))
    if finite.size < width * 0.8:
        raise ValueError("Depth Pro could not freeze a full-width object-plane distance field.")
    profile = np.interp(np.arange(width), finite, profile[finite])
    finite_spread = np.flatnonzero(np.isfinite(spread))
    spread = np.interp(np.arange(width), finite_spread, spread[finite_spread])
    return profile, spread, y0, y1 - 1


def profile_at_x(values, x):
    low = max(0, min(len(values) - 1, int(math.floor(x))))
    high = max(0, min(len(values) - 1, int(math.ceil(x))))
    if low == high:
        return float(values[low])
    ratio = x - low
    return float(values[low] + ((values[high] - values[low]) * ratio))


def freeze_model(args, depth, depth_pro_focal, depth_pro_focal_source):
    top_x, top_y = args.top
    bottom_x, bottom_y = args.bottom
    minimum_y = min(top_y, bottom_y)
    maximum_y = max(top_y, bottom_y)
    span_y = maximum_y - minimum_y
    if span_y < 100:
        raise ValueError("The yellow height line is too short to freeze a scale field.")

    sample_step = max(2, int(round(span_y / 426)))
    sample_y = np.arange(minimum_y, maximum_y + 0.1, sample_step, dtype=np.float64)
    y_center = args.image_height / 2
    y_scale = 1000.0
    intended_x = (top_x + bottom_x) / 2
    # Search a body-relative image band rather than assuming the yellow centre
    # column itself is a stable depth surface. This rule is image-size based and
    # receives no tape labels, expected interval, or dataset identity.
    search_radius = min(160, max(48, int(round(args.image_width * 0.08))))
    candidates = []
    for candidate_x in np.arange(intended_x - search_radius, intended_x + search_radius + 0.1, 2):
        candidate = fit_reference_candidate(depth, candidate_x, sample_y, y_center, y_scale)
        if candidate is not None:
            candidates.append(candidate)
    if not candidates:
        raise ValueError("Depth Pro could not find a stable vertical reference surface near the yellow height line.")

    best_rmse = min(candidate["fitRmsePct"] for candidate in candidates)
    near_best = [
        candidate for candidate in candidates
        if candidate["fitRmsePct"] <= best_rmse * 1.02
    ]
    selected = min(near_best, key=lambda candidate: abs(candidate["x"] - intended_x))
    pitch_reference = apple_pitch_reference(args, y_center, y_scale)
    plane_profile, plane_spread, plane_y0, plane_y1 = build_plane_depth_profile(
        depth,
        minimum_y,
        maximum_y,
        args.person_reference_y,
    )
    model = {
        "version": MODEL_VERSION,
        "modelKey": args.model_key,
        "imageWidth": args.image_width,
        "imageHeight": args.image_height,
        "heightCm": args.height_cm,
        "heightTop": {"x": top_x, "y": top_y},
        "heightBottom": {"x": bottom_x, "y": bottom_y},
        "referenceXPx": selected["x"],
        "referenceSearchRadiusPx": search_radius,
        "referenceCandidateCount": len(candidates),
        "referenceSampleCount": selected["sampleCount"],
        "referenceFitRmsePct": selected["fitRmsePct"],
        "referenceYCenterPx": y_center,
        "referenceYScalePx": y_scale,
        "inverseDepthSlope": pitch_reference["inverseDepthSlope"],
        "inverseDepthIntercept": pitch_reference["inverseDepthIntercept"],
        "depthProReferenceSlope": selected["inverseDepthSlope"],
        "depthProReferenceIntercept": selected["inverseDepthIntercept"],
        "focalXPx": args.focal_x,
        "focalYPx": args.focal_y,
        "principalPointXPx": args.principal_x,
        "principalPointYPx": args.principal_y,
        "cameraPitchDeg": args.camera_pitch,
        "cameraRollDeg": args.camera_roll,
        "cameraYawDeg": args.camera_yaw,
        "applePersonDistanceM": args.person_distance,
        "appleGeometryQuality": args.geometry_quality,
        "depthProPredictedFocalPx": depth_pro_focal,
        "depthProFocalSource": depth_pro_focal_source,
        "absoluteScaleSource": "known-height-yellow-line",
        "cameraSource": "Apple Vision VNDetectHumanBodyPose3DRequest",
        "relativeDepthSource": "Depth Pro frozen dense metric field with robust local depth line",
        "perspectiveSource": "Depth Pro predicted focal and per-pixel depth, normalized by known height",
        "planeDepthReferenceM": args.person_distance,
        "planeDepthReferenceYPx": args.person_reference_y,
        "planeDepthBandMinY": plane_y0,
        "planeDepthBandMaxY": plane_y1,
        "planeDepthProfileM": [round(float(value), 5) for value in plane_profile],
        "planeDepthSpreadPct": [round(float(value), 4) for value in plane_spread],
    }

    top_depth = reference_depth(model, top_y)
    bottom_depth = reference_depth(model, bottom_y)
    raw_height_m = float(np.linalg.norm(
        unproject(model, top_x, top_y, top_depth)
        - unproject(model, bottom_x, bottom_y, bottom_depth)
    ))
    if raw_height_m <= 0:
        raise ValueError("The frozen height projection is invalid.")
    normalization = (args.height_cm / 100) / raw_height_m
    midpoint_y = (top_y + bottom_y) / 2
    field_distance_m = reference_depth(model, midpoint_y) * normalization
    distance_delta_pct = (
        (field_distance_m / args.person_distance) - 1
    ) * 100 if args.person_distance > 0 else None
    model.update({
        "heightNormalization": normalization,
        "rawReferenceHeightM": raw_height_m,
        "heightClosureCm": args.height_cm,
        "fieldDistanceAtMidpointM": field_distance_m,
        "appleDistanceDeltaPct": distance_delta_pct,
    })

    dense_top_depth = depth_pro_reference_depth(model, top_y)
    dense_bottom_depth = depth_pro_reference_depth(model, bottom_y)
    model.update({
        "denseFocalXPx": depth_pro_focal,
        "denseFocalYPx": depth_pro_focal,
        "densePrincipalPointXPx": args.image_width / 2,
        "densePrincipalPointYPx": args.image_height / 2,
    })
    dense_raw_height_m = float(np.linalg.norm(
        unproject_dense(model, top_x, top_y, dense_top_depth)
        - unproject_dense(model, bottom_x, bottom_y, dense_bottom_depth)
    ))
    if dense_raw_height_m <= 0:
        raise ValueError("The Depth Pro dense height projection is invalid.")
    dense_height_normalization = (args.height_cm / 100) / dense_raw_height_m
    model.update({
        "denseHeightNormalization": dense_height_normalization,
        "rawDenseReferenceHeightM": dense_raw_height_m,
        "denseDistanceAtMidpointM": depth_pro_reference_depth(model, midpoint_y) * dense_height_normalization,
        "primaryFieldSource": "Depth Pro dense metric 3D + known yellow height",
    })
    model["quality"] = model_quality(model)
    return model


def model_quality(model):
    fit_error = model["referenceFitRmsePct"]
    distance_error = abs(model["appleDistanceDeltaPct"] or 0)
    apple_quality = model["appleGeometryQuality"]
    if apple_quality == "reject" or fit_error > 5 or distance_error > 40:
        return "reject"
    if apple_quality == "check" or fit_error > 2.5 or distance_error > 25:
        return "check"
    return "pass"


def legacy_plane_prediction(model, start_x, start_y, end_x, end_y):
    plane_x = (start_x + end_x) / 2
    plane_depth = profile_at_x(model["planeDepthProfileM"], plane_x)
    plane_spread_pct = profile_at_x(model["planeDepthSpreadPct"], plane_x)
    reference_plane_depth = model["planeDepthReferenceM"]
    if not np.isfinite(plane_depth) or not np.isfinite(reference_plane_depth) or reference_plane_depth <= 0:
        raise ValueError("The legacy plane cross-check has no frozen object-plane distance.")
    plane_ratio = float(np.clip(plane_depth / reference_plane_depth, 0.6, 1.6))
    start_ratio = plane_ratio
    end_ratio = plane_ratio
    start_depth = reference_depth(model, start_y) * start_ratio
    end_depth = reference_depth(model, end_y) * end_ratio
    start_3d = unproject(model, start_x, start_y, start_depth)
    end_3d = unproject(model, end_x, end_y, end_depth)
    predicted_cm = float(np.linalg.norm(start_3d - end_3d) * model["heightNormalization"] * 100)
    return predicted_cm, plane_spread_pct


def robust_depth_line(sample_t, sample_depth):
    valid = np.isfinite(sample_depth) & (sample_depth > 0.05) & (sample_depth < 100)
    if int(valid.sum()) < max(12, int(len(sample_t) * 0.8)):
        raise ValueError("Depth Pro could not trace enough valid pixels along the requested segment.")
    t = sample_t[valid]
    values = sample_depth[valid]
    design = np.column_stack([np.ones_like(t), t])
    weights = np.ones_like(t)
    coefficients = np.linalg.lstsq(design, values, rcond=None)[0]
    for _ in range(6):
        residual = values - (design @ coefficients)
        median = float(np.median(residual))
        scale = 1.4826 * float(np.median(np.abs(residual - median))) + 1e-6
        normalized = np.abs(residual - median) / (1.5 * scale)
        weights = np.ones_like(normalized)
        outliers = normalized > 1
        weights[outliers] = 1 / normalized[outliers]
        coefficients = np.linalg.lstsq(design * weights[:, None], values * weights, rcond=None)[0]
    fitted = design @ coefficients
    rmse = float(np.sqrt(np.mean((values - fitted) ** 2)))
    rmse_pct = rmse / max(float(np.mean(values)), 1e-6) * 100
    return coefficients, rmse_pct


def query_segment(model, depth, segment):
    segment_id, start_x, start_y, end_x, end_y = segment
    pixel_span = math.hypot(end_x - start_x, end_y - start_y)
    if pixel_span <= 0:
        raise ValueError(f"Segment {segment_id} has zero pixel length.")

    sample_count = max(24, min(192, int(round(pixel_span / 4)) + 1))
    sample_t = np.linspace(0, 1, sample_count, dtype=np.float64)
    sample_x = start_x + ((end_x - start_x) * sample_t)
    sample_y = start_y + ((end_y - start_y) * sample_t)
    radius = max(1, int(round(min(model["imageWidth"], model["imageHeight"]) * 0.001)))
    sample_depth = np.array([
        median_depth(depth, x, y, radius=radius)
        for x, y in zip(sample_x, sample_y)
    ], dtype=np.float64)
    coefficients, local_fit_rmse_pct = robust_depth_line(sample_t, sample_depth)
    fitted_depth = coefficients[0] + (coefficients[1] * sample_t)
    if np.any(fitted_depth <= 0.05):
        raise ValueError(f"Segment {segment_id} has an invalid local Depth Pro surface.")
    points = np.array([
        unproject_dense(model, x, y, z)
        for x, y, z in zip(sample_x, sample_y, fitted_depth)
    ])
    predicted_cm = float(
        np.linalg.norm(np.diff(points, axis=0), axis=1).sum()
        * model["denseHeightNormalization"]
        * 100
    )
    plane_prediction_cm, plane_spread_pct = legacy_plane_prediction(
        model, start_x, start_y, end_x, end_y,
    )
    disagreement_pct = abs(predicted_cm - plane_prediction_cm) / max(
        (predicted_cm + plane_prediction_cm) / 2,
        1e-6,
    ) * 100
    start_ratio = float(fitted_depth[0] / depth_pro_reference_depth(model, start_y))
    end_ratio = float(fitted_depth[-1] / depth_pro_reference_depth(model, end_y))
    confidence = (
        "high" if local_fit_rmse_pct <= 0.5 and disagreement_pct <= 3
        else "medium" if local_fit_rmse_pct <= 1.5 and disagreement_pct <= 10
        else "low"
    )
    return {
        "id": segment_id,
        "start": {"x": start_x, "y": start_y},
        "end": {"x": end_x, "y": end_y},
        "pixelSpan": pixel_span,
        "predictedCm": predicted_cm,
        "averageCmPerPx": predicted_cm / pixel_span,
        "startRelativeDepth": start_ratio,
        "endRelativeDepth": end_ratio,
        "relativeDepthFitRmsePct": local_fit_rmse_pct,
        "planePredictionCm": plane_prediction_cm,
        "planeDepthSpreadPct": plane_spread_pct,
        "methodDisagreementPct": disagreement_pct,
        "confidence": confidence,
    }


def public_model(model):
    return {
        key: value for key, value in model.items()
        if key not in {
            "inverseDepthSlope", "inverseDepthIntercept", "referenceYCenterPx", "referenceYScalePx",
            "depthProReferenceSlope", "depthProReferenceIntercept", "planeDepthProfileM", "planeDepthSpreadPct",
        }
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("image")
    parser.add_argument("--cache-path", required=True)
    parser.add_argument("--model-path", required=True)
    parser.add_argument("--model-key", required=True)
    parser.add_argument("--image-width", type=int)
    parser.add_argument("--image-height", type=int)
    parser.add_argument("--height-cm", type=float)
    parser.add_argument("--top", nargs=2, type=float)
    parser.add_argument("--bottom", nargs=2, type=float)
    parser.add_argument("--focal-x", type=float)
    parser.add_argument("--focal-y", type=float)
    parser.add_argument("--principal-x", type=float)
    parser.add_argument("--principal-y", type=float)
    parser.add_argument("--camera-pitch", type=float, default=0)
    parser.add_argument("--camera-roll", type=float, default=0)
    parser.add_argument("--camera-yaw", type=float, default=0)
    parser.add_argument("--person-distance", type=float, default=0)
    parser.add_argument("--person-reference-y", type=float)
    parser.add_argument("--geometry-quality", choices=("pass", "check", "reject"), default="check")
    parser.add_argument("--segment", nargs=5, action="append", default=[])
    args = parser.parse_args()

    started = time.perf_counter()
    cache_path = Path(args.cache_path)
    model_path = Path(args.model_path)
    model_cache_hit = model_path.is_file()
    depth, depth_pro_focal, depth_pro_focal_source, depth_cache_hit = load_depth(Path(args.image), cache_path)
    if model_cache_hit:
        model = json.loads(model_path.read_text())
    else:
        required = (
            args.image_width, args.image_height, args.height_cm, args.top, args.bottom,
            args.focal_x, args.focal_y, args.principal_x, args.principal_y,
            args.person_reference_y,
        )
        if any(value is None for value in required):
            raise ValueError("Freezing a blind scale field requires height and Apple camera geometry.")
        if [depth.shape[1], depth.shape[0]] != [args.image_width, args.image_height]:
            raise ValueError("Depth map and source-image dimensions do not match.")
        model = freeze_model(args, depth, depth_pro_focal, depth_pro_focal_source)
        model_path.parent.mkdir(parents=True, exist_ok=True)
        model_path.write_text(json.dumps(model, separators=(",", ":")))

    segments = []
    for raw in args.segment:
        segment_id = raw[0]
        coordinates = [float(value) for value in raw[1:]]
        segments.append(query_segment(model, depth, (segment_id, *coordinates)))

    print(json.dumps({
        "model": public_model(model),
        "segments": segments,
        "modelCacheHit": model_cache_hit,
        "depthCacheHit": depth_cache_hit,
        "elapsedMs": round((time.perf_counter() - started) * 1000),
    }, separators=(",", ":")))


if __name__ == "__main__":
    main()
