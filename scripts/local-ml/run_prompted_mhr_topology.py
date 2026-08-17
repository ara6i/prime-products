#!/usr/bin/env python3
"""Run the official CPU-only SAM 3D Body prompt path for one proof photo.

The installed ViT-H checkpoint supports an internal mask prompt and MHR70
keypoint prompts, but its configuration declares ``MAX_NUM_CLICKS: 2``.  This
adapter therefore uses the internal BiRefNet mask plus at most two reliable
Sapiens key-body clicks.  It never applies RBF or any other post-hoc vertex
warp, never uses depth/tape/circumference, and never initializes a GPU.
"""

from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path

import numpy as np


REPO_ROOT = Path(__file__).resolve().parents[2]
RAW_BUILDER = REPO_ROOT / "scripts/local-ml/build_rgb_mhr_topology.py"
SHAPE_RUNNER = REPO_ROOT / "scripts/local-ml/run_sam3d_shape.py"
MESH_HELPERS = REPO_ROOT / "scripts/local-ml/build_photo_body_mesh_assets.py"
ANATOMICAL_DIR = REPO_ROOT / ".local-ml/wear-mesh-overlay/anatomical"
MASK_DIR = REPO_ROOT / ".local-ml/wear-mesh-overlay/photo-masks"
DEFAULT_OUTPUT_DIR = REPO_ROOT / ".local-ml/wear-mesh-proof/methods/prompted-meta-vith"

KEY_BODY_INDICES = (5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 41, 62)


def _load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not load {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _tensor_numpy(value) -> np.ndarray:
    if hasattr(value, "detach"):
        value = value.detach().cpu().numpy()
    return np.asarray(value)


def _official_prompt_support(estimator) -> tuple[bool, int, str]:
    config = estimator.cfg.MODEL.PROMPT_ENCODER
    enabled = bool(config.ENABLE)
    mask_type = config.get("MASK_EMBED_TYPE", None)
    max_clicks = int(config.MAX_NUM_CLICKS)
    callable_prompt = callable(getattr(estimator.model, "run_keypoint_prompt", None))
    if not enabled:
        return False, max_clicks, "PROMPT_ENCODER.ENABLE is false"
    if not mask_type:
        return False, max_clicks, "MASK_EMBED_TYPE is not configured"
    if not callable_prompt:
        return False, max_clicks, "official run_keypoint_prompt is unavailable"
    if max_clicks < 1:
        return False, max_clicks, "MAX_NUM_CLICKS forbids keypoint prompts"
    return True, max_clicks, "official mask and MHR70 keypoint prompt paths available"


def _load_mask(photo_id: str, width: int, height: int) -> tuple[np.ndarray, Path]:
    import cv2

    path = MASK_DIR / f"{photo_id}.png"
    mask = cv2.imread(str(path), cv2.IMREAD_GRAYSCALE)
    if mask is None:
        raise FileNotFoundError(f"Missing internal fitting mask: {path}")
    if mask.shape != (height, width):
        raise RuntimeError(
            f"Internal fitting mask size {mask.shape[::-1]} does not match photo {(width, height)}."
        )
    binary = (mask >= 128).astype(np.uint8)
    if int(binary.sum()) < max(100, round(width * height * 0.01)):
        raise RuntimeError("Internal fitting mask is empty or too small.")
    return binary, path


def _load_sapiens(photo_id: str) -> tuple[dict, Path]:
    path = ANATOMICAL_DIR / f"{photo_id}-sapiens2.json"
    if not path.is_file():
        raise FileNotFoundError(
            f"Missing Sapiens2 evidence: {path}. Run run_sapiens2_anatomy.py first."
        )
    payload = json.loads(path.read_text())
    keypoints = np.asarray(payload.get("keypoints", []), dtype=np.float32)
    scores = np.asarray(payload.get("scores", []), dtype=np.float32)
    if keypoints.shape != (308, 2) or scores.shape != (308,):
        raise RuntimeError(
            f"Unexpected Sapiens2 evidence: {keypoints.shape}, {scores.shape}"
        )
    return payload, path


def _select_prompt(
    model,
    batch,
    pose_output: dict,
    target_full_px,
    scores: np.ndarray,
    already_selected: set[int],
):
    import torch

    # Meta's camera head explicitly returns ``pred_keypoints_2d`` in original
    # full-image pixels.  Keep selection/error reporting in that same space;
    # convert only the point sent to the official prompt API into crop [0, 1].
    predicted_full_px = pose_output["mhr"]["pred_keypoints_2d"].detach()
    target_crop_01 = model._full_to_crop(
        batch,
        target_full_px,
        model.body_batch_idx,
    ) + 0.5
    target_crop_numpy = target_crop_01.detach().cpu().numpy()[0]
    errors_full_px = np.linalg.norm(
        predicted_full_px.detach().cpu().numpy()[0]
        - target_full_px.detach().cpu().numpy()[0],
        axis=1,
    )
    eligible = []
    for index in KEY_BODY_INDICES:
        if index in already_selected or scores[index] < 0.45:
            continue
        x, y = target_crop_numpy[index]
        if np.isfinite((x, y)).all() and 0.0 <= x <= 1.0 and 0.0 <= y <= 1.0:
            eligible.append(index)
    if not eligible:
        return None
    selected = max(eligible, key=lambda index: float(errors_full_px[index]))
    point = torch.cat(
        [
            target_crop_01[:, [selected], :],
            torch.full(
                (1, 1, 1),
                float(selected),
                dtype=target_crop_01.dtype,
                device=target_crop_01.device,
            ),
        ],
        dim=-1,
    )
    return (
        selected,
        point,
        float(errors_full_px[selected]),
        target_crop_numpy[selected],
    )


def run(photo_id: str, output_path: Path | None = None) -> dict:
    import cv2
    import torch

    raw_builder = _load_module("primestyle_raw_mhr", RAW_BUILDER)
    shape_runner = _load_module("primestyle_sam3d_shape_prompted", SHAPE_RUNNER)
    mesh_helpers = _load_module("primestyle_photo_mesh_helpers_prompted", MESH_HELPERS)

    raw_builder.configure_environment()
    # Fail closed even if the parent shell was configured for CUDA or MPS.
    os.environ["PRIMESTYLE_SAM3D_DEVICE"] = "cpu"
    photo = raw_builder.PHOTOS[photo_id]
    photo_path = Path(photo["path"])
    image_bgr = cv2.imread(str(photo_path))
    if image_bgr is None:
        raise FileNotFoundError(f"Could not read source photo: {photo_path}")
    image = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
    height, width = image.shape[:2]
    mask, mask_path = _load_mask(photo_id, width, height)
    sapiens, sapiens_path = _load_sapiens(photo_id)
    target_keypoints = np.asarray(sapiens["keypoints"], dtype=np.float32)[:70]
    scores = np.asarray(sapiens["scores"], dtype=np.float32)[:70]

    estimator = shape_runner.load_estimator()
    supported, configured_max_clicks, support_detail = _official_prompt_support(estimator)
    if not supported:
        raise RuntimeError(f"Installed checkpoint cannot run official prompts: {support_detail}")
    prompt_limit = min(2, configured_max_clicks)

    from sam_3d_body.data.utils.prepare_batch import prepare_batch
    from sam_3d_body.utils import recursive_to

    request = {
        "heightCm": float(photo["heightCm"]),
        "personBoxPx": raw_builder.load_box(photo_id),
    }
    boxes = shape_runner.derive_person_box(request, width, height, mask)
    batch = prepare_batch(
        image,
        estimator.transform,
        boxes,
        masks=mask[None, ...],
        masks_score=np.ones(1, dtype=np.float32),
    )
    batch = recursive_to(batch, estimator.device)
    estimator.model._initialize_batch(batch)

    target_full_px = torch.as_tensor(
        target_keypoints[None, ...],
        dtype=torch.float32,
        device=estimator.device,
    )
    selected_prompts: list[dict] = []
    accumulated = []
    selected_indices: set[int] = set()
    with torch.inference_mode():
        pose_output = estimator.model.run_inference(
            image,
            batch,
            inference_type="body",
            transform_hand=estimator.transform_hand,
            thresh_wrist_angle=estimator.thresh_wrist_angle,
        )
        for iteration in range(prompt_limit):
            selection = _select_prompt(
                estimator.model,
                batch,
                pose_output,
                target_full_px,
                scores,
                selected_indices,
            )
            if selection is None:
                break
            index, prompt, before_error, crop_xy = selection
            selected_indices.add(index)
            accumulated.append(prompt)
            all_prompts = torch.cat(accumulated, dim=1)
            pose_output, _ = estimator.model.run_keypoint_prompt(
                batch,
                pose_output,
                all_prompts,
            )
            after_full_px = (
                pose_output["mhr"]["pred_keypoints_2d"].detach().cpu().numpy()[0]
            )
            target_full_numpy = target_full_px.detach().cpu().numpy()[0]
            after_error_full_px = float(
                np.linalg.norm(after_full_px[index] - target_full_numpy[index])
            )
            selected_prompts.append(
                {
                    "iteration": iteration + 1,
                    "mhr70Index": int(index),
                    "name": sapiens["mhr70"][index]["name"],
                    "sapiensScore": round(float(scores[index]), 6),
                    "targetFullImagePx": np.round(target_keypoints[index], 4).tolist(),
                    "targetCrop01": np.round(crop_xy, 7).tolist(),
                    "errorCoordinateSpace": "full-image-pixels",
                    "errorBeforePx": round(before_error, 4),
                    "errorAfterPx": round(after_error_full_px, 4),
                }
            )

    out = pose_output["mhr"]
    vertices = _tensor_numpy(out["pred_vertices"]).reshape(-1, 3).astype(np.float64)
    keypoints = _tensor_numpy(out["pred_keypoints_2d"]).reshape(-1, 2).astype(np.float64)
    camera_translation = _tensor_numpy(out["pred_cam_t"]).reshape(-1)[:3].astype(np.float64)
    focal_values = _tensor_numpy(out["focal_length"]).reshape(-1)
    focal = float(focal_values[0]) if len(focal_values) else float("nan")
    if not np.isfinite(focal) or focal <= 0:
        raise RuntimeError("Prompted Meta output has no valid focal length.")
    camera_projection = {"fx": focal, "fy": focal, "cx": width / 2.0, "cy": height / 2.0}
    projected = mesh_helpers.projected_browser_vertices(
        vertices,
        camera_translation,
        camera_projection,
        width,
        height,
    )
    normalized_xy = mesh_helpers.image_normalized_vertices(projected, width, height)
    faces = np.asarray(estimator.faces, dtype=np.int64)
    display_faces = mesh_helpers.front_display_faces(
        projected,
        projected,
        faces,
        width,
        height,
    )

    output = output_path or DEFAULT_OUTPUT_DIR / f"{photo_id}.json"
    output.parent.mkdir(parents=True, exist_ok=True)
    fit_ids = [
        f"rgb:{photo_id}",
        f"person-crop:{photo_id}",
        f"internal-mask-birefnet:{photo_id}",
        f"sapiens2-mhr70:{photo_id}",
    ]
    fit_hashes = [
        _sha256(photo_path),
        _sha256(raw_builder.PHOTO_INDEX),
        _sha256(mask_path),
        _sha256(sapiens_path),
    ]
    payload = {
        "schemaVersion": 1,
        "id": f"prompted-meta-vith--{photo_id}",
        "methodId": "prompted-meta-vith",
        "label": f"Prompted Meta ViT-H · {photo_id}",
        "photoId": photo_id,
        "imageWidth": int(width),
        "imageHeight": int(height),
        "coordinateSpace": "normalized-image-xy",
        "vertexCount": int(len(normalized_xy)),
        "triangleCount": int(len(display_faces)),
        "vertices": np.round(normalized_xy, 7).reshape(-1).tolist(),
        "triangles": display_faces.reshape(-1).tolist(),
        "keypointsMhr70Px": np.round(keypoints, 4).tolist(),
        "fixedTopology": "Meta MHR 18,439 vertex IDs",
        "device": "cpu",
        "officialPromptPath": True,
        "maskPrompt": {
            "used": True,
            "source": "BiRefNet HR matting internal fitting mask",
            "path": str(mask_path),
            "sha256": fit_hashes[2],
            "hairExclusionGuaranteed": False,
            "outputIsMaskTriangulation": False,
        },
        "keypointPrompt": {
            "source": "Meta Sapiens2 MHR70",
            "configuredMaximumClicks": configured_max_clicks,
            "usedClicks": len(selected_prompts),
            "selection": "reliable key-body point with largest current full-image error",
            "prompts": selected_prompts,
        },
        "postprocesses": [],
        "rbfUsed": False,
        "depthUsed": False,
        "measurementsUsed": False,
        "heightCmNotUsedForTopology": float(photo["heightCm"]),
        "weightKgNotUsed": float(photo["weightKg"]),
        "personBoxXYXY": np.round(boxes[0], 3).tolist(),
        "fitEvidenceIds": fit_ids,
        "fitEvidenceSha256": fit_hashes,
        "sourcePhotoPath": str(photo_path),
        "sapiensEvidencePath": str(sapiens_path),
    }
    output.write_text(json.dumps(payload, separators=(",", ":")))
    return {
        "id": payload["id"],
        "photoId": photo_id,
        "meshPath": str(output),
        "vertexCount": payload["vertexCount"],
        "triangleCount": payload["triangleCount"],
        "officialPromptPath": True,
        "maskPromptUsed": True,
        "keypointPromptsUsed": len(selected_prompts),
        "rbfUsed": False,
        "fitEvidenceIds": fit_ids,
        "fitEvidenceSha256": fit_hashes,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--photo", choices=("delaram", "delaram-2"), required=True)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    print(json.dumps(run(args.photo, args.output), indent=2), flush=True)


if __name__ == "__main__":
    main()
