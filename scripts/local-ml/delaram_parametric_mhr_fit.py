#!/usr/bin/env python3
"""CPU-only, fixed-topology parametric MHR fit for Delaram proof photos.

This is deliberately not an RBF warp and it never snaps output vertices to a
mask.  It keeps one shared MHR identity for Delaram and Delaram 2, then adjusts
only MHR identity/scale, articulated pose, and camera parameters.  Internal
BiRefNet outlines and Sapiens2 points provide fitting losses; the final artifact
is still the official 18,439-vertex MHR mesh with the original vertex IDs.

The internal outlines are *not* independent QA truth.  Outputs therefore stay
Candidate until the separate honest evaluator receives held-out annotations.
"""

from __future__ import annotations

import argparse
from collections import Counter
from datetime import datetime, timezone
import hashlib
import importlib.util
import json
import os
from pathlib import Path
from typing import Any

import cv2
import numpy as np
from scipy import ndimage


REPO_ROOT = Path(__file__).resolve().parents[2]
RAW_BUILDER = REPO_ROOT / "scripts/local-ml/build_rgb_mhr_topology.py"
SHAPE_RUNNER = REPO_ROOT / "scripts/local-ml/run_sam3d_shape.py"
MESH_HELPERS = REPO_ROOT / "scripts/local-ml/build_photo_body_mesh_assets.py"
ANATOMICAL_DIR = REPO_ROOT / ".local-ml/wear-mesh-overlay/anatomical"
MASK_DIR = REPO_ROOT / ".local-ml/wear-mesh-overlay/photo-masks"
BASELINE_DIR = REPO_ROOT / ".local-ml/wear-mesh-proof/methods/raw-meta-vith"
DEFAULT_OUTPUT_DIR = REPO_ROOT / ".local-ml/wear-mesh-proof/delaram-specialist"
PHOTO_IDS = ("delaram", "delaram-2")

# The first 15 MHR70/Sapiens points are the stable body skeleton points from
# nose through ankles. Wrists are not part of this released MHR70 ordering;
# detailed hand points remain in the later compatible entries and are used only
# when their Sapiens confidence is high.
CORE_INDICES = tuple(range(15))


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not load {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def load_json(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text())
    if not isinstance(value, dict):
        raise RuntimeError(f"Expected JSON object: {path}")
    return value


def project(points, camera_translation, focal, width: int, height: int):
    """Project camera-oriented MHR points using the official perspective form."""
    camera = points + camera_translation[:, None, :]
    z = camera[..., 2:3].clamp_min(1e-4)
    xy = camera[..., :2] * focal[:, None, None] / z
    center = points.new_tensor([width / 2.0, height / 2.0])
    return xy + center[None, None, :]


def rasterize(vertices_px: np.ndarray, triangles: np.ndarray, width: int, height: int) -> np.ndarray:
    mask = np.zeros((height, width), dtype=np.uint8)
    valid = (
        (triangles >= 0).all(axis=1)
        & (triangles < len(vertices_px)).all(axis=1)
        & np.isfinite(vertices_px[triangles]).all(axis=(1, 2))
    )
    for triangle in triangles[valid]:
        cv2.fillConvexPoly(mask, np.rint(vertices_px[triangle]).astype(np.int32), 1)
    return mask


def external_boundary_vertices(
    vertices_px: np.ndarray,
    triangles: np.ndarray,
    width: int,
    height: int,
    shoulder_y: float,
) -> np.ndarray:
    """Find raw MHR vertices actually touching the rendered external contour.

    The method does not create targets and does not move vertices. It only
    chooses which fixed MHR vertices receive the differentiable contour loss.
    Head/hair is excluded because the internal mask contains hair.
    """
    rendered = rasterize(vertices_px, triangles, width, height)
    eroded = cv2.erode(rendered, np.ones((3, 3), dtype=np.uint8), iterations=1)
    boundary = rendered > eroded
    distance = ndimage.distance_transform_edt(~boundary)

    edge_counts: Counter[tuple[int, int]] = Counter()
    for a, b, c in triangles:
        edge_counts[tuple(sorted((int(a), int(b))))] += 1
        edge_counts[tuple(sorted((int(b), int(c))))] += 1
        edge_counts[tuple(sorted((int(c), int(a))))] += 1
    candidates = sorted({vertex for edge, count in edge_counts.items() if count == 1 for vertex in edge})
    selected: list[int] = []
    for index in candidates:
        x, y = vertices_px[index]
        if not np.isfinite((x, y)).all() or y < shoulder_y - 20:
            continue
        ix = int(np.clip(round(x), 0, width - 1))
        iy = int(np.clip(round(y), 0, height - 1))
        if distance[iy, ix] <= 3.0:
            selected.append(index)
    if len(selected) < 80:
        raise RuntimeError(f"Only {len(selected)} external MHR contour vertices were found")
    return np.asarray(selected, dtype=np.int64)


def unsigned_boundary_distance(mask: np.ndarray) -> np.ndarray:
    binary = mask > 0
    eroded = cv2.erode(binary.astype(np.uint8), np.ones((3, 3), dtype=np.uint8), iterations=1)
    boundary = binary > (eroded > 0)
    return ndimage.distance_transform_edt(~boundary).astype(np.float32)


def sample_distance(distance_map, points_px, width: int, height: int):
    import torch.nn.functional as F

    x = points_px[..., 0] / max(1, width - 1) * 2.0 - 1.0
    y = points_px[..., 1] / max(1, height - 1) * 2.0 - 1.0
    grid = __import__("torch").stack([x, y], dim=-1).view(1, 1, -1, 2)
    sampled = F.grid_sample(
        distance_map,
        grid,
        mode="bilinear",
        padding_mode="border",
        align_corners=True,
    )
    return sampled.view(-1)


def prepare_photo(photo_id: str, estimator, raw_builder, shape_runner) -> dict[str, Any]:
    import torch
    from sam_3d_body.data.utils.prepare_batch import prepare_batch
    from sam_3d_body.utils import recursive_to

    photo = raw_builder.PHOTOS[photo_id]
    photo_path = Path(photo["path"])
    image_bgr = cv2.imread(str(photo_path))
    if image_bgr is None:
        raise FileNotFoundError(photo_path)
    image = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
    height, width = image.shape[:2]
    mask_path = MASK_DIR / f"{photo_id}.png"
    mask = cv2.imread(str(mask_path), cv2.IMREAD_GRAYSCALE)
    if mask is None or mask.shape != (height, width):
        raise RuntimeError(f"Missing or wrong-size internal mask: {mask_path}")
    mask = (mask >= 128).astype(np.uint8)
    sapiens_path = ANATOMICAL_DIR / f"{photo_id}-sapiens2.json"
    sapiens = load_json(sapiens_path)
    target = np.asarray(sapiens["keypoints"], dtype=np.float32)[:70]
    scores = np.asarray(sapiens["scores"], dtype=np.float32)[:70]

    box = np.asarray([raw_builder.load_box(photo_id)], dtype=np.float32)
    batch = prepare_batch(image, estimator.transform, box)
    batch = recursive_to(batch, estimator.device)
    estimator.model._initialize_batch(batch)
    with torch.inference_mode():
        output = estimator.model.run_inference(
            image,
            batch,
            inference_type="body",
            transform_hand=estimator.transform_hand,
            thresh_wrist_angle=estimator.thresh_wrist_angle,
        )["mhr"]

    baseline_path = BASELINE_DIR / f"{photo_id}.json"
    baseline = load_json(baseline_path)
    baseline_vertices = np.asarray(baseline["vertices"], dtype=np.float64).reshape(-1, 2)
    baseline_vertices_px = baseline_vertices * np.asarray([width, height], dtype=np.float64)
    triangles = np.asarray(baseline["triangles"], dtype=np.int64).reshape(-1, 3)
    shoulder_y = float(np.mean(target[[5, 6], 1]))
    contour_indices = external_boundary_vertices(
        baseline_vertices_px,
        triangles,
        width,
        height,
        shoulder_y,
    )
    distance_map = unsigned_boundary_distance(mask)
    distance_tensor = torch.as_tensor(distance_map[None, None], dtype=torch.float32)

    reliable = np.zeros(70, dtype=bool)
    reliable[list(CORE_INDICES)] = True
    reliable &= np.isfinite(target).all(axis=1) & (scores >= 0.55)
    reliable_indices = np.flatnonzero(reliable).astype(np.int64)
    if len(reliable_indices) < 12:
        raise RuntimeError(f"Only {len(reliable_indices)} reliable Sapiens body points")

    return {
        "photoId": photo_id,
        "photoPath": photo_path,
        "maskPath": mask_path,
        "sapiensPath": sapiens_path,
        "width": width,
        "height": height,
        "triangles": triangles,
        "baselinePath": baseline_path,
        "baselineVerticesPx": baseline_vertices_px,
        "baselineSignedAreas": torch.as_tensor(
            0.5
            * (
                (baseline_vertices_px[triangles][:, 1, 0] - baseline_vertices_px[triangles][:, 0, 0])
                * (baseline_vertices_px[triangles][:, 2, 1] - baseline_vertices_px[triangles][:, 0, 1])
                - (baseline_vertices_px[triangles][:, 1, 1] - baseline_vertices_px[triangles][:, 0, 1])
                * (baseline_vertices_px[triangles][:, 2, 0] - baseline_vertices_px[triangles][:, 0, 0])
            ),
            dtype=torch.float32,
        ),
        "contourIndices": contour_indices,
        "distanceTensor": distance_tensor,
        "targetKeypoints": torch.as_tensor(target, dtype=torch.float32),
        "targetScores": torch.as_tensor(np.clip(scores, 0.0, 1.0), dtype=torch.float32),
        "reliableIndices": torch.as_tensor(reliable_indices, dtype=torch.long),
        "initial": {
            key: output[key].detach().clone()
            for key in (
                "global_rot",
                "body_pose",
                "shape",
                "scale",
                "hand",
                "face",
                "pred_cam_t",
                "focal_length",
            )
        },
    }


def decode(estimator, photo: dict[str, Any], parameters: dict[str, Any], shared_shape, shared_scale):
    head = estimator.model.head_pose
    verts, keypoints = head.mhr_forward(
        global_trans=parameters["global_rot"] * 0,
        global_rot=parameters["global_rot"],
        body_pose_params=parameters["body_pose"],
        hand_pose_params=parameters["hand"],
        scale_params=shared_scale,
        shape_params=shared_shape,
        expr_params=parameters["face"],
        return_keypoints=True,
    )
    keypoints = keypoints[:, :70]
    verts = verts.clone()
    keypoints = keypoints.clone()
    verts[..., [1, 2]] *= -1
    keypoints[..., [1, 2]] *= -1
    focal = parameters["focal_length"].reshape(-1)
    vertices_px = project(verts, parameters["pred_cam_t"], focal, photo["width"], photo["height"])
    keypoints_px = project(keypoints, parameters["pred_cam_t"], focal, photo["width"], photo["height"])
    return vertices_px, keypoints_px


def fit(
    steps: int,
    contour_weight: float,
    keypoint_weight: float,
    seed: int,
    mode: str = "full",
    topology_weight: float = 0.0,
) -> dict[str, Any]:
    import torch

    if steps < 1:
        raise ValueError("steps must be positive")
    os.environ["PRIMESTYLE_SAM3D_DEVICE"] = "cpu"
    torch.manual_seed(seed)
    raw_builder = load_module("delaram_raw_builder", RAW_BUILDER)
    shape_runner = load_module("delaram_shape_runner", SHAPE_RUNNER)
    raw_builder.configure_environment()
    os.environ["PRIMESTYLE_SAM3D_DEVICE"] = "cpu"
    estimator = shape_runner.load_estimator()
    if str(estimator.device) != "cpu":
        raise RuntimeError(f"CPU-only specialist unexpectedly got {estimator.device}")

    photos = [prepare_photo(photo_id, estimator, raw_builder, shape_runner) for photo_id in PHOTO_IDS]
    shared_shape = torch.nn.Parameter(torch.mean(torch.cat([p["initial"]["shape"] for p in photos]), dim=0, keepdim=True))
    shared_scale = torch.nn.Parameter(torch.mean(torch.cat([p["initial"]["scale"] for p in photos]), dim=0, keepdim=True))
    shape_initial = shared_shape.detach().clone()
    scale_initial = shared_scale.detach().clone()

    if mode not in {"full", "shared-shape", "shared-shape-safe"}:
        raise ValueError(f"Unsupported mode: {mode}")
    parameters: dict[str, dict[str, Any]] = {}
    groups = [
        {"params": [shared_shape], "lr": 0.008},
        {"params": [shared_scale], "lr": 0.006},
    ]
    for photo in photos:
        initial = photo["initial"]
        fitted = {
            "global_rot": torch.nn.Parameter(initial["global_rot"]) if mode == "full" else initial["global_rot"],
            "body_pose": torch.nn.Parameter(initial["body_pose"]) if mode == "full" else initial["body_pose"],
            "hand": torch.nn.Parameter(initial["hand"]) if mode == "full" else initial["hand"],
            "face": initial["face"],
            "pred_cam_t": torch.nn.Parameter(initial["pred_cam_t"]) if mode == "full" else initial["pred_cam_t"],
            "focal_length": initial["focal_length"],
        }
        parameters[photo["photoId"]] = fitted
        if mode == "full":
            groups.extend(
                [
                    {"params": [fitted["global_rot"]], "lr": 0.001},
                    {"params": [fitted["body_pose"]], "lr": 0.0015},
                    {"params": [fitted["hand"]], "lr": 0.001},
                    {"params": [fitted["pred_cam_t"]], "lr": 0.00035},
                ]
            )
    optimizer = torch.optim.Adam(groups)

    trace: list[dict[str, float]] = []
    for iteration in range(steps):
        optimizer.zero_grad(set_to_none=True)
        total = shared_shape.new_tensor(0.0)
        row: dict[str, float] = {"iteration": iteration + 1}
        for photo in photos:
            fitted = parameters[photo["photoId"]]
            vertices_px, keypoints_px = decode(estimator, photo, fitted, shared_shape, shared_scale)
            indices = photo["reliableIndices"]
            predicted = keypoints_px[0, indices]
            target = photo["targetKeypoints"][indices]
            confidence = photo["targetScores"][indices].sqrt()
            body_height = float(np.ptp(np.where(cv2.imread(str(photo["maskPath"]), cv2.IMREAD_GRAYSCALE) >= 128)[0]))
            keypoint_error = torch.linalg.vector_norm(predicted - target, dim=1) / body_height
            keypoint_loss = (keypoint_error * confidence).sum() / confidence.sum().clamp_min(1e-6)

            contour_indices = torch.as_tensor(photo["contourIndices"], dtype=torch.long)
            contour_points = vertices_px[0, contour_indices]
            distance_map = photo["distanceTensor"]
            contour_loss = sample_distance(
                distance_map,
                contour_points,
                photo["width"],
                photo["height"],
            ).mean() / body_height
            total = total + keypoint_weight * keypoint_loss + contour_weight * contour_loss
            row[f"{photo['photoId']}KeypointPct"] = float(keypoint_loss.detach() * 100.0)
            row[f"{photo['photoId']}ContourPct"] = float(contour_loss.detach() * 100.0)

            if topology_weight > 0:
                triangles = torch.as_tensor(photo["triangles"], dtype=torch.long)
                triangle_points = vertices_px[0, triangles]
                first, second, third = triangle_points[:, 0], triangle_points[:, 1], triangle_points[:, 2]
                candidate_areas = 0.5 * (
                    (second[:, 0] - first[:, 0]) * (third[:, 1] - first[:, 1])
                    - (second[:, 1] - first[:, 1]) * (third[:, 0] - first[:, 0])
                )
                baseline_sign = torch.sign(photo["baselineSignedAreas"])
                comparable = torch.abs(photo["baselineSignedAreas"]) > 1e-6
                signed_area = candidate_areas[comparable] * baseline_sign[comparable]
                # A smooth orientation barrier. A candidate still must pass the
                # evaluator's exact zero-flip count; this loss never overrides it.
                topology_loss = torch.nn.functional.softplus(-signed_area / 0.5).mean()
                total = total + topology_weight * topology_loss
                row[f"{photo['photoId']}TopologyBarrier"] = float(topology_loss.detach())

            initial = photo["initial"]
            if mode == "full":
                total = total + 0.002 * torch.mean((fitted["body_pose"] - initial["body_pose"]) ** 2)
                total = total + 0.002 * torch.mean((fitted["hand"] - initial["hand"]) ** 2)
                total = total + 0.02 * torch.mean((fitted["global_rot"] - initial["global_rot"]) ** 2)
                total = total + 0.2 * torch.mean((fitted["pred_cam_t"] - initial["pred_cam_t"]) ** 2)
        total = total + 0.003 * torch.mean((shared_shape - shape_initial) ** 2)
        total = total + 0.01 * torch.mean((shared_scale - scale_initial) ** 2)
        total.backward()
        torch.nn.utils.clip_grad_norm_([shared_shape, shared_scale], max_norm=2.0)
        optimizer.step()
        row["totalLoss"] = float(total.detach())
        trace.append(row)
        if iteration == 0 or iteration + 1 == steps or (iteration + 1) % 5 == 0:
            print(json.dumps(row), flush=True)

    DEFAULT_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    candidate_records = []
    for photo in photos:
        fitted = parameters[photo["photoId"]]
        with torch.inference_mode():
            vertices_px, keypoints_px = decode(estimator, photo, fitted, shared_shape, shared_scale)
        normalized = vertices_px[0].cpu().numpy() / np.asarray([photo["width"], photo["height"]], dtype=np.float64)
        keypoints = keypoints_px[0].cpu().numpy()
        method_id = {
            "full": "delaram-shared-parametric-mhr",
            "shared-shape": "delaram-shared-shape-mhr",
            "shared-shape-safe": "delaram-shared-shape-topology-safe-mhr",
        }[mode]
        suffix = {"full": "parametric", "shared-shape": "shared-shape", "shared-shape-safe": "shared-shape-safe"}[mode]
        output_path = DEFAULT_OUTPUT_DIR / f"{photo['photoId']}-{suffix}.json"
        payload = {
            "schemaVersion": 1,
            "id": f"{method_id}--{photo['photoId']}",
            "methodId": method_id,
            "photoId": photo["photoId"],
            "sourcePhotoPath": str(photo["photoPath"]),
            "imageWidth": photo["width"],
            "imageHeight": photo["height"],
            "coordinateSpace": "normalized-image-xy",
            "vertexCount": int(len(normalized)),
            "triangleCount": int(len(photo["triangles"])),
            "vertices": np.round(normalized, 7).reshape(-1).tolist(),
            "triangles": photo["triangles"].reshape(-1).tolist(),
            "keypointsMhr70Px": np.round(keypoints, 4).tolist(),
            "fixedTopology": "Meta MHR 18,439 vertex IDs",
            "sharedIdentityAcrossPhotos": True,
            "sharedShapeSha256": hashlib.sha256(shared_shape.detach().cpu().numpy().tobytes()).hexdigest(),
            "sharedScaleSha256": hashlib.sha256(shared_scale.detach().cpu().numpy().tobytes()).hexdigest(),
            "device": "cpu",
            "gpuUsed": False,
            "awsUsed": False,
            "fitMethod": (
                "MHR parameter optimization: shared identity/scale plus per-photo MHR pose/camera"
                if mode == "full"
                else "MHR parameter optimization: shared identity/scale only; raw pose/camera frozen"
            ),
            "internalFittingAids": ["Sapiens2 MHR70 core body points", "BiRefNet visible-outline boundary distance"],
            "outputIsMask": False,
            "outputIsMaskTriangulation": False,
            "rbfUsed": False,
            "vertexSnappingUsed": False,
            "depthUsed": False,
            "measurementsUsed": False,
            "heightWeightUsed": False,
            "fitEvidenceIds": [
                f"rgb:{photo['photoId']}",
                f"sapiens2-mhr70:{photo['photoId']}",
                f"internal-birefnet-outline:{photo['photoId']}",
            ],
            "fitEvidenceSha256": [
                sha256_file(photo["photoPath"]),
                sha256_file(photo["sapiensPath"]),
                sha256_file(photo["maskPath"]),
            ],
            "topologyBaselinePath": str(photo["baselinePath"]),
            "optimization": {
                "steps": steps,
                "keypointWeight": keypoint_weight,
                "contourWeight": contour_weight,
                "contourVertexCount": int(len(photo["contourIndices"])),
                "reliableKeypointIndices": photo["reliableIndices"].tolist(),
                "topologyBarrierWeight": topology_weight,
            },
            "proofStatus": "Candidate",
            "proofBlocker": "Internal fitting outline is not independent held-out QA truth",
        }
        output_path.write_text(json.dumps(payload, separators=(",", ":")))
        candidate_records.append(
            {
                "photoId": photo["photoId"],
                "meshPath": str(output_path),
                "topologyBaselinePath": str(photo["baselinePath"]),
                "coordinateSpace": "normalized-image-xy",
                "fitEvidenceIds": payload["fitEvidenceIds"],
                "fitEvidenceSha256": payload["fitEvidenceSha256"],
                "keypoints": {
                    "names": [str(item["name"]) for item in load_json(photo["sapiensPath"])["mhr70"]],
                    "keypoints": np.round(keypoints, 4).tolist(),
                    "coordinateSpace": "pixels",
                },
                "isTopologyBaseline": False,
            }
        )

    run_report = {
        "schemaVersion": 1,
        "generatedAt": utc_now(),
        "status": "Candidate",
        "methodId": {
            "full": "delaram-shared-parametric-mhr",
            "shared-shape": "delaram-shared-shape-mhr",
            "shared-shape-safe": "delaram-shared-shape-topology-safe-mhr",
        }[mode],
        "device": "cpu",
        "gpuUsed": False,
        "awsUsed": False,
        "published": False,
        "releaseBlocked": True,
        "candidateRecords": candidate_records,
        "trace": trace,
    }
    report_name = {
        "full": "run-report.json",
        "shared-shape": "shared-shape-run-report.json",
        "shared-shape-safe": "shared-shape-safe-run-report.json",
    }[mode]
    report_path = DEFAULT_OUTPUT_DIR / report_name
    report_path.write_text(json.dumps(run_report, indent=2))
    return run_report


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--steps", type=int, default=25)
    parser.add_argument("--contour-weight", type=float, default=2.0)
    parser.add_argument("--keypoint-weight", type=float, default=5.0)
    parser.add_argument("--seed", type=int, default=17)
    parser.add_argument("--mode", choices=("full", "shared-shape", "shared-shape-safe"), default="full")
    parser.add_argument("--topology-weight", type=float, default=0.0)
    args = parser.parse_args()
    report = fit(
        args.steps,
        args.contour_weight,
        args.keypoint_weight,
        args.seed,
        args.mode,
        args.topology_weight,
    )
    report_name = {
        "full": "run-report.json",
        "shared-shape": "shared-shape-run-report.json",
        "shared-shape-safe": "shared-shape-safe-run-report.json",
    }[args.mode]
    print(json.dumps({"status": report["status"], "report": str(DEFAULT_OUTPUT_DIR / report_name)}, indent=2))


if __name__ == "__main__":
    main()
