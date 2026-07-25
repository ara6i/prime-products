#!/usr/bin/env python3
"""Local/test-only SAM 3D Body adapter for PrimeStyleAI shape experiments.

The API passes one JSON file. This adapter reconstructs a mesh from the photo,
cuts it at the three exact red-row image heights, returns each closed 3D slice,
and fits a superellipse shape exponent for comparison. It never reads dataset
circumferences or changes red lines.
"""

from __future__ import annotations

import base64
from contextlib import redirect_stdout
import importlib
import json
import math
import os
from pathlib import Path
import sys
import tempfile

import numpy as np
import trimesh


KINDS = ("waist", "trouserWaist", "hips")


def decode_image(data_url: str, directory: Path) -> Path:
    header, encoded = data_url.split(",", 1)
    extension = "png" if "png" in header.lower() else "jpg"
    image_path = directory / f"input.{extension}"
    image_path.write_bytes(base64.b64decode(encoded))
    return image_path


def decode_mask(data_url: str | None, width: int, height: int) -> np.ndarray | None:
    if not data_url:
        return None
    import cv2

    try:
        _, encoded = data_url.split(",", 1)
        raw = np.frombuffer(base64.b64decode(encoded), dtype=np.uint8)
        mask = cv2.imdecode(raw, cv2.IMREAD_GRAYSCALE)
    except (ValueError, TypeError) as error:
        raise RuntimeError("SAM 3D Body could not decode the supplied person mask.") from error
    if mask is None:
        raise RuntimeError("SAM 3D Body could not decode the supplied person mask.")
    if mask.shape != (height, width):
        mask = cv2.resize(mask, (width, height), interpolation=cv2.INTER_NEAREST)
    binary = (mask >= 128).astype(np.uint8)
    if int(binary.sum()) < max(100, int(width * height * 0.01)):
        raise RuntimeError("The supplied person mask is empty or too small.")
    return binary


def load_estimator():
    root = Path(os.environ["PRIMESTYLE_SAM3D_ROOT"])
    sys.path.insert(0, str(root))
    checkpoint = os.environ["PRIMESTYLE_SAM3D_CHECKPOINT"]
    mhr_path = os.environ["PRIMESTYLE_SAM3D_MHR"]
    device = os.environ.get("PRIMESTYLE_SAM3D_DEVICE", "cuda").strip().lower()
    if device not in {"cuda", "mps", "cpu"}:
        raise RuntimeError(
            "PRIMESTYLE_SAM3D_DEVICE must be cuda, mps, or cpu."
        )
    if device == "mps":
        # Must be set before the official package imports torch.
        os.environ.setdefault("PYTORCH_ENABLE_MPS_FALLBACK", "1")
    try:
        module = importlib.import_module("sam_3d_body")
        load_model = getattr(module, "load_sam_3d_body")
        estimator_type = getattr(module, "SAM3DBodyEstimator")
    except (ImportError, AttributeError) as error:
        raise RuntimeError(
            "The installed SAM 3D Body checkout does not expose the official load_sam_3d_body/SAM3DBodyEstimator API."
        ) from error
    if device == "mps":
        import torch

        if not torch.backends.mps.is_available():
            raise RuntimeError("Apple MPS was requested but is not available.")
    model, model_config = load_model(
        checkpoint_path=checkpoint,
        mhr_path=mhr_path,
        device=device,
    )
    if device == "mps":
        # Meta's TorchScript MHR decoder uses float64 internally. The patched
        # adapter runs just that final mesh-decoding step on CPU while the
        # image backbone and pose model stay on Apple GPU.
        model.head_pose.mhr.to("cpu")
        model.head_pose_hand.mhr.to("cpu")
    return estimator_type(sam_3d_body_model=model, model_cfg=model_config)


def derive_person_box(request: dict, width: int, height: int, mask: np.ndarray | None = None) -> np.ndarray:
    """Build a person crop from the mask, or from red rows as a fallback.

    The box is only an image crop for Meta. It does not change any red line,
    predict circumference, or read a dataset target.
    """
    if mask is not None:
        ys, xs = np.where(mask > 0)
        if len(xs) >= 100:
            padding_x = max(4.0, (float(xs.max()) - float(xs.min())) * 0.035)
            padding_y = max(4.0, (float(ys.max()) - float(ys.min())) * 0.025)
            return np.asarray([[
                max(0.0, float(xs.min()) - padding_x),
                max(0.0, float(ys.min()) - padding_y),
                min(float(width - 1), float(xs.max()) + padding_x),
                min(float(height - 1), float(ys.max()) + padding_y),
            ]], dtype=np.float32)

    rows = request["rows"]
    centers = np.asarray(
        [
            ((float(row["leftXNorm"]) + float(row["rightXNorm"])) / 2.0)
            * width
            for row in rows
        ],
        dtype=np.float64,
    )
    spans = np.asarray(
        [
            (float(row["rightXNorm"]) - float(row["leftXNorm"])) * width
            for row in rows
        ],
        dtype=np.float64,
    )
    center_x = float(np.median(centers))
    # Allow shoulders and arms around the widest torso row. The official
    # square affine crop may expand this further to match its 512x512 input.
    half_width = max(float(spans.max()) * 1.2, width * 0.06)

    height_pairs = [
        (float(row["heightFromFloorCm"]), float(row["yNorm"]) * height)
        for row in rows
        if row.get("heightFromFloorCm") is not None
        and math.isfinite(float(row["heightFromFloorCm"]))
    ]
    known_height_cm = float(request["heightCm"])
    if len(height_pairs) >= 2:
        physical_heights = np.asarray([pair[0] for pair in height_pairs])
        image_ys = np.asarray([pair[1] for pair in height_pairs])
        slope, floor_y = np.polyfit(physical_heights, image_ys, 1)
        pixels_per_cm = -float(slope)
        estimated_height_px = pixels_per_cm * known_height_cm
    else:
        floor_y = float("nan")
        estimated_height_px = float("nan")

    if (
        not math.isfinite(floor_y)
        or not math.isfinite(estimated_height_px)
        or estimated_height_px < height * 0.2
        or estimated_height_px > height * 1.2
    ):
        # This fallback is intentionally conservative. A correct local-ML run
        # normally has three physical row heights and does not use it.
        top_y = 0.0
        bottom_y = float(height - 1)
    else:
        padding_y = estimated_height_px * 0.035
        top_y = floor_y - estimated_height_px - padding_y
        bottom_y = floor_y + padding_y

    x1 = max(0.0, center_x - half_width)
    x2 = min(float(width - 1), center_x + half_width)
    y1 = max(0.0, top_y)
    y2 = min(float(height - 1), bottom_y)
    if x2 - x1 < 16 or y2 - y1 < 32:
        raise RuntimeError("The saved rows could not define a valid person crop.")
    return np.asarray([[x1, y1, x2, y2]], dtype=np.float32)


def neutral_vertices_from_output(estimator, output: dict) -> np.ndarray:
    """Decode Meta's predicted soft-tissue shape with pose set to neutral."""
    import torch

    device = estimator.device

    def tensor(name: str) -> torch.Tensor:
        return torch.as_tensor(output[name], dtype=torch.float32, device=device).reshape(1, -1)

    body_pose = tensor("body_pose_params")
    hand_pose = tensor("hand_pose_params")
    scale_params = tensor("scale_params")
    shape_params = tensor("shape_params")
    expression = tensor("expr_params")
    with torch.inference_mode():
        vertices = estimator.model.head_pose.mhr_forward(
            global_trans=torch.zeros((1, 3), dtype=torch.float32, device=device),
            global_rot=torch.zeros((1, 3), dtype=torch.float32, device=device),
            body_pose_params=torch.zeros_like(body_pose),
            hand_pose_params=torch.zeros_like(hand_pose),
            scale_params=scale_params,
            shape_params=shape_params,
            expr_params=torch.zeros_like(expression),
        )
    if isinstance(vertices, tuple):
        vertices = vertices[0]
    neutral = vertices.detach().cpu().numpy().reshape(-1, 3).astype(np.float64)
    # MHRHead.forward applies this conversion before exposing pred_vertices.
    neutral[:, [1, 2]] *= -1
    if len(neutral) < 100 or not np.isfinite(neutral).all():
        raise RuntimeError("Meta returned an invalid neutral body mesh.")
    return neutral


def run_model(estimator, image_path: Path, request: dict):
    import cv2

    image = cv2.imread(str(image_path))
    if image is None:
        raise RuntimeError("SAM 3D Body could not read the source photo.")
    height, width = image.shape[:2]
    mask = decode_mask(request.get("maskDataUrl"), width, height)
    boxes = derive_person_box(request, width, height, mask)
    camera = request.get("cameraIntrinsics")
    cam_int = None
    if camera:
        import torch

        cam_int = torch.tensor([[
            [float(camera["focalXPx"]), 0.0, float(camera["principalPointXPx"])],
            [0.0, float(camera["focalYPx"]), float(camera["principalPointYPx"])],
            [0.0, 0.0, 1.0],
        ]], dtype=torch.float32)
    outputs = estimator.process_one_image(
        str(image_path),
        bboxes=boxes,
        masks=mask,
        cam_int=cam_int,
        inference_type="body",
    )
    if not outputs:
        raise RuntimeError("SAM 3D Body did not return a person mesh.")
    output = outputs[0]
    vertices = np.asarray(output["pred_vertices"], dtype=np.float64)
    if vertices.ndim == 3:
        vertices = vertices[0]
    neutral_vertices = neutral_vertices_from_output(estimator, output)
    faces = np.asarray(estimator.faces, dtype=np.int64)
    mask_bounds_y = None
    if mask is not None:
        mask_ys = np.where(mask > 0)[0]
        if len(mask_ys):
            mask_bounds_y = (float(mask_ys.min()), float(mask_ys.max()))
    return vertices, neutral_vertices, faces, boxes[0], mask_bounds_y, width, height, mask, cam_int is not None


def depth_point(depth: np.ndarray, focal: float, x: float, y: float, mask: np.ndarray, radius: int = 3) -> np.ndarray | None:
    height, width = depth.shape
    center_x = int(round(x))
    center_y = int(round(y))
    x0, x1 = max(0, center_x - radius), min(width, center_x + radius + 1)
    y0, y1 = max(0, center_y - radius), min(height, center_y + radius + 1)
    values = depth[y0:y1, x0:x1]
    support = mask[y0:y1, x0:x1] > 0
    values = values[support & np.isfinite(values) & (values > 0.05) & (values < 20)]
    if values.size < 3:
        return None
    z = float(np.median(values))
    return np.asarray([(x - width / 2) * z / focal, (y - height / 2) * z / focal, z], dtype=np.float64)


def load_depth_profile_context(
    request: dict,
    mask: np.ndarray | None,
    image_width: int,
    image_height: int,
    known_height_cm: float,
) -> dict | None:
    """Load the already-computed image-only Depth Pro cache.

    This adapter never runs or recalibrates Depth Pro and never reads a tape or
    circumference target. Known height supplies the same absolute scale used by
    the photo-sizing experiment.
    """
    cache_value = request.get("depthProCachePath")
    if not cache_value or mask is None:
        return None
    cache_path = Path(str(cache_value))
    if not cache_path.is_file():
        return None
    try:
        with np.load(cache_path, allow_pickle=False) as cached:
            depth = cached["depth"].astype(np.float64)
            focal = float(cached["focal"])
    except (OSError, KeyError, ValueError):
        return None
    if depth.shape != (image_height, image_width) or not math.isfinite(focal) or focal <= 0:
        return None

    ys, xs = np.where(mask > 0)
    if len(xs) < 100:
        return None
    top_y = int(ys.min())
    bottom_y = int(ys.max())
    band = max(3, min(10, round(image_height * 0.004)))
    top_local = np.where(mask[top_y:min(image_height, top_y + band + 1)] > 0)
    bottom_start = max(0, bottom_y - band)
    bottom_local = np.where(mask[bottom_start:bottom_y + 1] > 0)
    top_support = (top_local[0] + top_y, top_local[1])
    bottom_support = (bottom_local[0] + bottom_start, bottom_local[1])
    if not len(top_support[1]) or not len(bottom_support[1]):
        return None
    top_x = float(np.median(top_support[1]))
    top_sample_y = float(np.median(top_support[0]))
    bottom_x = float(np.median(bottom_support[1]))
    bottom_sample_y = float(np.median(bottom_support[0]))
    top_point = depth_point(depth, focal, top_x, top_sample_y, mask, band)
    bottom_point = depth_point(depth, focal, bottom_x, bottom_sample_y, mask, band)
    if top_point is None or bottom_point is None:
        return None
    raw_height_m = float(np.linalg.norm(top_point - bottom_point))
    if not math.isfinite(raw_height_m) or raw_height_m <= 0:
        return None
    height_scale_factor = known_height_cm / 100.0 / raw_height_m
    if not 0.45 <= height_scale_factor <= 2.2:
        return None
    return {
        "depth": depth,
        "focal": focal,
        "heightScaleFactor": height_scale_factor,
        "rawPredictedHeightM": raw_height_m,
    }


def depth_profile_for_row(
    context: dict | None,
    mask: np.ndarray | None,
    requested: dict,
    image_width: int,
    image_height: int,
) -> dict | None:
    if context is None or mask is None:
        return None
    row_y = float(requested["yNorm"]) * max(1, image_height - 1)
    left_x = float(requested["leftXNorm"]) * max(1, image_width - 1)
    right_x = float(requested["rightXNorm"]) * max(1, image_width - 1)
    span = right_x - left_x
    if span < 20:
        return None
    depth = context["depth"]
    y_radius = max(2, min(5, round(image_height * 0.0015)))
    x_radius = max(1, min(4, round(span / 160)))
    x_norms = np.linspace(-0.94, 0.94, 61)
    depths = []
    for x_norm in x_norms:
        x = (left_x + right_x) / 2.0 + x_norm * span / 2.0
        center_x = int(round(x))
        center_y = int(round(row_y))
        x0, x1 = max(0, center_x - x_radius), min(image_width, center_x + x_radius + 1)
        y0, y1 = max(0, center_y - y_radius), min(image_height, center_y + y_radius + 1)
        values = depth[y0:y1, x0:x1]
        support = mask[y0:y1, x0:x1] > 0
        values = values[support & np.isfinite(values) & (values > 0.05) & (values < 20)]
        depths.append(float(np.median(values)) if values.size >= 3 else float("nan"))
    valid = np.isfinite(depths)
    coverage = float(valid.mean())
    if coverage < 0.78 or int(valid.sum()) < 31:
        return None
    interpolated = np.interp(np.arange(len(depths)), np.where(valid)[0], np.asarray(depths)[valid])
    smoothed = np.asarray([
        np.median(interpolated[max(0, index - 2):min(len(interpolated), index + 3)])
        for index in range(len(interpolated))
    ])
    scaled = smoothed * float(context["heightScaleFactor"])
    return {
        "source": "depth-pro-front-surface",
        "xNorm": np.round(x_norms, 4).tolist(),
        "depthM": np.round(scaled, 6).tolist(),
        "sampleCoverage": round(coverage, 4),
        "heightScaleFactor": round(float(context["heightScaleFactor"]), 6),
        "rawPredictedHeightM": round(float(context["rawPredictedHeightM"]), 6),
        "focalPx": round(float(context["focal"]), 4),
    }


def polyline_length(points: np.ndarray) -> float:
    if len(points) < 2:
        return 0.0
    closed = np.vstack([points, points[0]])
    return float(np.linalg.norm(np.diff(closed, axis=0), axis=1).sum())


def resample_closed_polyline(points: np.ndarray, sample_count: int = 256) -> np.ndarray:
    if len(points) < 3:
        return points
    if np.linalg.norm(points[0] - points[-1]) <= 1e-8:
        points = points[:-1]
    closed = np.vstack([points, points[0]])
    lengths = np.linalg.norm(np.diff(closed, axis=0), axis=1)
    cumulative = np.concatenate([[0.0], np.cumsum(lengths)])
    total = float(cumulative[-1])
    if total <= 1e-8:
        return points
    targets = np.linspace(0.0, total, sample_count, endpoint=False)
    samples = []
    for target in targets:
        segment = min(int(np.searchsorted(cumulative, target, side="right") - 1), len(lengths) - 1)
        segment_length = max(float(lengths[segment]), 1e-8)
        amount = (target - cumulative[segment]) / segment_length
        samples.append(closed[segment] + amount * (closed[segment + 1] - closed[segment]))
    return np.asarray(samples, dtype=np.float64)


def fit_exponent(points_2d: np.ndarray) -> tuple[float, float]:
    sampled = resample_closed_polyline(points_2d)
    # Meta's neutral mesh already has canonical left/right and front/back axes.
    # PCA could rotate an asymmetric abdomen or buttock slice and manufacture a
    # different n, so preserve the anatomical axes here.
    center = (sampled.min(axis=0) + sampled.max(axis=0)) / 2.0
    centered = np.abs(sampled - center)
    radii = np.maximum(centered.max(axis=0), 1e-8)
    normalized = centered / radii
    informative = (
        (normalized[:, 0] >= 0.025)
        & (normalized[:, 1] >= 0.025)
        & (normalized[:, 0] <= 0.995)
        & (normalized[:, 1] <= 0.995)
    )
    if int(informative.sum()) >= 48:
        normalized = normalized[informative]
    best_n = 2.0
    best_error = float("inf")
    for exponent in np.arange(1.2, 4.0001, 0.01):
        residual = np.abs(np.power(normalized[:, 0], exponent) + np.power(normalized[:, 1], exponent) - 1.0)
        # Huber-style loss keeps one mesh defect from owning the fitted shape.
        delta = 0.05
        error = float(np.mean(np.where(residual <= delta, 0.5 * residual * residual / delta, residual - 0.5 * delta)))
        if error < best_error:
            best_error = error
            best_n = float(exponent)
    return round(best_n, 2), best_error


def robust_nearby_shape(mesh: trimesh.Trimesh, vertical_axis: int, level: float) -> dict:
    # Stay close to the exact red row. Four centimetres can cross from a hip
    # slice into upper thigh or from natural waist into abdomen.
    offsets_cm = [-2.0, -1.0, 0.0, 1.0, 2.0]
    observations = []
    for offset_cm in offsets_cm:
        try:
            _, points, _, _, _ = slice_mesh(mesh, vertical_axis, level - offset_cm / 100.0)
            exponent, error = fit_exponent(points)
            observations.append((offset_cm, exponent, error))
        except RuntimeError:
            continue
    if len(observations) < 3:
        raise RuntimeError("Meta's neutral mesh did not provide enough nearby torso slices.")
    exponents = np.asarray([item[1] for item in observations], dtype=np.float64)
    median = float(np.median(exponents))
    mad = float(np.median(np.abs(exponents - median)))
    rejection_limit = max(0.18, 3.0 * 1.4826 * mad)
    accepted = [item for item in observations if abs(item[1] - median) <= rejection_limit]
    if len(accepted) < 3:
        accepted = observations
    accepted_exponents = np.asarray([item[1] for item in accepted], dtype=np.float64)
    accepted_errors = np.asarray([item[2] for item in accepted], dtype=np.float64)
    center_weights = {0.0: 3, -1.0: 2, 1.0: 2, -2.0: 1, 2.0: 1}
    weighted_exponents = np.asarray([
        exponent
        for offset, exponent, _ in accepted
        for _ in range(center_weights.get(offset, 1))
    ], dtype=np.float64)
    robust_exponent = float(np.median(weighted_exponents))
    spread = float(1.4826 * np.median(np.abs(accepted_exponents - robust_exponent)))
    median_error = float(np.median(accepted_errors))
    coverage = len(accepted) / len(offsets_cm)
    stability = coverage * math.exp(-spread / 0.22) * math.exp(-median_error / 0.08)
    return {
        "source": "canonical-neutral-nearby-slices",
        "offsetsCm": [item[0] for item in observations],
        "exponents": [item[1] for item in observations],
        "acceptedExponents": [item[1] for item in accepted],
        "exponent": round(robust_exponent, 2),
        "exponentSpread": round(spread, 4),
        "medianFitError": round(median_error, 5),
        "stability": round(max(0.0, min(1.0, stability)), 4),
    }


def slice_mesh(
    mesh: trimesh.Trimesh,
    vertical_axis: int,
    level: float,
    *,
    require_single_body_loop: bool = False,
):
    normal = np.zeros(3)
    normal[vertical_axis] = 1.0
    origin = np.zeros(3)
    origin[vertical_axis] = level
    section = mesh.section(plane_origin=origin, plane_normal=normal)
    if section is None:
        raise RuntimeError("The reconstructed mesh has no closed body slice at one saved row.")
    loops = [np.asarray(loop, dtype=np.float64) for loop in section.discrete if len(loop) >= 8]
    if not loops:
        raise RuntimeError("The reconstructed mesh slice is too sparse to fit a body shape.")
    loops.sort(key=polyline_length, reverse=True)
    loop = loops[0]
    if require_single_body_loop and len(loops) > 1:
        largest_length = polyline_length(loop)
        second_length = polyline_length(loops[1])
        # Below the crotch, a horizontal plane cuts two similarly sized thigh
        # loops. Treating the larger thigh as the hip contour moves the live
        # formula band onto one leg and produces a convincing but false result.
        if largest_length > 0 and second_length / largest_length >= 0.55:
            raise RuntimeError(
                "The hips red row cuts through two separate thighs, not one connected hip slice. "
                "Move the hips line upward to the widest connected butt/hip level."
            )
    horizontal_axes = [axis for axis in range(3) if axis != vertical_axis]
    points_2d = loop[:, horizontal_axes]
    breadth_m, depth_m = np.ptp(points_2d, axis=0)
    perimeter_m = polyline_length(loop)
    return loop, points_2d, float(max(breadth_m, depth_m)), float(min(breadth_m, depth_m)), perimeter_m


def main() -> None:
    if len(sys.argv) != 2:
        raise RuntimeError("Expected one request JSON path.")
    request = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    known_height_cm = float(request["heightCm"])
    with tempfile.TemporaryDirectory(prefix="primestyle-sam3d-image-") as temp:
        image_path = decode_image(request["imageDataUrl"], Path(temp))
        # The official library writes setup diagnostics to stdout. Keep stdout
        # as one machine-readable JSON object for the Next.js API.
        with redirect_stdout(sys.stderr):
            estimator = load_estimator()
            (
                vertices,
                neutral_vertices,
                faces,
                person_box,
                mask_bounds_y,
                image_width,
                image_height,
                person_mask,
                camera_conditioned,
            ) = run_model(estimator, image_path, request)

    mask_conditioned = person_mask is not None
    depth_profile_context = load_depth_profile_context(
        request,
        person_mask,
        image_width,
        image_height,
        known_height_cm,
    )

    # SAM 3D Body returns camera coordinates: X is image-horizontal, Y grows
    # downward from head to feet, and Z is depth. Do not infer direction from
    # the largest extent; that loses the head/floor sign and slices the legs.
    vertical_axis = 1
    extents = np.ptp(vertices, axis=0)
    mesh_height = float(extents[vertical_axis])
    if not math.isfinite(mesh_height) or mesh_height <= 0:
        raise RuntimeError("SAM 3D Body returned an invalid mesh height.")
    scale = known_height_cm / 100.0 / mesh_height
    vertices = vertices * scale
    mesh = trimesh.Trimesh(vertices=vertices, faces=faces, process=False)
    head = float(vertices[:, vertical_axis].min())
    floor = float(vertices[:, vertical_axis].max())
    center_x = float((vertices[:, 0].min() + vertices[:, 0].max()) / 2.0)
    center_z = float((vertices[:, 2].min() + vertices[:, 2].max()) / 2.0)

    neutral_height = float(np.ptp(neutral_vertices, axis=0)[vertical_axis])
    if not math.isfinite(neutral_height) or neutral_height <= 0:
        raise RuntimeError("Meta returned an invalid neutral body height.")
    neutral_vertices = neutral_vertices * (known_height_cm / 100.0 / neutral_height)
    neutral_mesh = trimesh.Trimesh(vertices=neutral_vertices, faces=faces, process=False)
    neutral_head = float(neutral_vertices[:, vertical_axis].min())
    neutral_floor = float(neutral_vertices[:, vertical_axis].max())

    def display_points(points: np.ndarray) -> np.ndarray:
        """Convert Meta camera coordinates to a centered, Y-up viewer space."""
        displayed = np.asarray(points, dtype=np.float64).copy()
        displayed[:, 0] -= center_x
        displayed[:, 1] = floor - displayed[:, 1]
        displayed[:, 2] -= center_z
        return displayed

    rows = []
    for requested in request["rows"]:
        height_from_floor = requested.get("heightFromFloorCm")
        if mask_bounds_y is not None and mask_bounds_y[1] - mask_bounds_y[0] > 1:
            row_y = float(requested["yNorm"]) * max(1, image_height - 1)
            fraction = max(0.0, min(1.0, (mask_bounds_y[1] - row_y) / (mask_bounds_y[1] - mask_bounds_y[0])))
        elif height_from_floor is not None:
            fraction = max(0.0, min(1.0, float(height_from_floor) / known_height_cm))
        else:
            # Image Y grows downward; this fallback preserves the saved visual row.
            fraction = 1.0 - max(0.0, min(1.0, float(requested["yNorm"])))
        level = floor - fraction * (floor - head)
        loop, points, breadth_m, depth_m, perimeter_m = slice_mesh(
            mesh,
            vertical_axis,
            level,
            require_single_body_loop=requested["kind"] == "hips",
        )
        neutral_level = neutral_floor - fraction * (neutral_floor - neutral_head)
        shape_evidence = robust_nearby_shape(neutral_mesh, vertical_axis, neutral_level)
        depth_profile_evidence = depth_profile_for_row(
            depth_profile_context,
            person_mask,
            requested,
            image_width,
            image_height,
        )
        displayed_loop = display_points(loop)
        rows.append({
            "kind": requested["kind"],
            "superellipseExponent": shape_evidence["exponent"],
            "meshPerimeterCm": perimeter_m * 100.0,
            "meshBreadthCm": breadth_m * 100.0,
            "meshDepthCm": depth_m * 100.0,
            "slicePointCount": int(len(points)),
            "sliceHeightFromFloorCm": fraction * known_height_cm,
            "sliceLoopM": np.round(displayed_loop, 5).tolist(),
            "shapeEvidence": {key: value for key, value in shape_evidence.items() if key != "exponent"},
            **({"depthProfileEvidence": depth_profile_evidence} if depth_profile_evidence is not None else {}),
        })
    if {row["kind"] for row in rows} != set(KINDS):
        raise RuntimeError("All three saved body rows are required.")
    print(json.dumps({
        "rows": rows,
        "meshPreview": {
            "verticesM": np.round(display_points(vertices), 5).reshape(-1).tolist(),
            "triangleIndices": faces.reshape(-1).tolist(),
            "vertexCount": int(len(vertices)),
            "triangleCount": int(len(faces)),
        },
        "personBoxPx": [round(float(value), 2) for value in person_box],
        "maskConditioned": mask_conditioned,
        "cameraIntrinsicsSource": "apple-vision" if camera_conditioned else "meta-default",
        "sliceAlignmentSource": "mask-projected-red-row" if mask_bounds_y is not None else "legacy-row-height",
        "depthProfileConditioned": depth_profile_context is not None,
        "warning": (
            "Experimental mesh slice. Meta used the supplied person mask, Apple camera intrinsics, and the exact red-row image height. "
            if mask_conditioned and camera_conditioned
            else "Experimental mesh slice. Meta did not receive both a person mask and Apple camera intrinsics. "
        ) + "Meta shape parameters were decoded in a neutral pose and fitted across nearby torso slices. The UI separately locks the slice to the selected red breadth and WEAR/manual depth; dataset targets are never model inputs.",
    }))


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(str(error), file=sys.stderr)
        raise
