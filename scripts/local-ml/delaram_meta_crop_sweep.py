#!/usr/bin/env python3
"""CPU-only crop-conditioning sweep for official SAM 3D Body ViT-H.

Every candidate is a fresh official MHR inference with RGB plus a person crop.
No prompt, RBF, mask triangulation, vertex deformation, depth, or measurement is
used. The internal outline is used only to derive and compare crop margins, so
the sweep is diagnostic and cannot be independent proof.
"""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import importlib.util
import json
import os
from pathlib import Path
from typing import Any

import cv2
import numpy as np


REPO_ROOT = Path(__file__).resolve().parents[2]
RAW_BUILDER = REPO_ROOT / "scripts/local-ml/build_rgb_mhr_topology.py"
SHAPE_RUNNER = REPO_ROOT / "scripts/local-ml/run_sam3d_shape.py"
MESH_HELPERS = REPO_ROOT / "scripts/local-ml/build_photo_body_mesh_assets.py"
MASK_DIR = REPO_ROOT / ".local-ml/wear-mesh-overlay/photo-masks"
BASELINE_DIR = REPO_ROOT / ".local-ml/wear-mesh-proof/methods/raw-meta-vith"
OUTPUT_DIR = REPO_ROOT / ".local-ml/wear-mesh-proof/delaram-specialist/crop-sweep"
PHOTO_IDS = ("delaram", "delaram-2")


def load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def mask_box(mask: np.ndarray, margin: float) -> list[float]:
    ys, xs = np.where(mask > 0)
    x0, x1 = float(xs.min()), float(xs.max())
    y0, y1 = float(ys.min()), float(ys.max())
    width = x1 - x0
    height = y1 - y0
    return [
        max(0.0, x0 - width * margin),
        max(0.0, y0 - height * margin),
        min(float(mask.shape[1] - 1), x1 + width * margin),
        min(float(mask.shape[0] - 1), y1 + height * margin),
    ]


def run(margins: list[float]) -> dict[str, Any]:
    raw_builder = load_module("delaram_crop_raw", RAW_BUILDER)
    shape_runner = load_module("delaram_crop_runner", SHAPE_RUNNER)
    helpers = load_module("delaram_crop_helpers", MESH_HELPERS)
    raw_builder.configure_environment()
    os.environ["PRIMESTYLE_SAM3D_DEVICE"] = "cpu"
    estimator = shape_runner.load_estimator()
    if str(estimator.device) != "cpu":
        raise RuntimeError(f"CPU-only sweep unexpectedly got {estimator.device}")
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    records = []
    for photo_id in PHOTO_IDS:
        photo = raw_builder.PHOTOS[photo_id]
        photo_path = Path(photo["path"])
        image = cv2.imread(str(photo_path))
        if image is None:
            raise FileNotFoundError(photo_path)
        height, width = image.shape[:2]
        mask_path = MASK_DIR / f"{photo_id}.png"
        mask = cv2.imread(str(mask_path), cv2.IMREAD_GRAYSCALE)
        if mask is None or mask.shape != (height, width):
            raise RuntimeError(mask_path)
        mask = mask >= 128
        canonical = json.loads((BASELINE_DIR / f"{photo_id}.json").read_text())
        canonical_triangles = np.asarray(canonical["triangles"], dtype=np.int64).reshape(-1, 3)
        for margin in margins:
            requested_box = mask_box(mask, margin)
            diagnostics: dict[str, np.ndarray] = {}
            result = shape_runner.run_model(
                estimator,
                photo_path,
                {"heightCm": photo["heightCm"], "personBoxPx": requested_box},
                capture=diagnostics,
            )
            (
                posed_vertices,
                _neutral,
                _faces,
                returned_box,
                _mask_bounds,
                image_width,
                image_height,
                returned_mask,
                _camera_conditioned,
                camera_translation,
                camera_projection,
            ) = result
            if returned_mask is not None:
                raise RuntimeError("Crop-only Meta sweep unexpectedly used a mask prompt")
            projected = helpers.projected_browser_vertices(
                posed_vertices,
                camera_translation,
                camera_projection,
                image_width,
                image_height,
            )
            normalized = helpers.image_normalized_vertices(projected, image_width, image_height)
            keypoints = np.asarray(diagnostics["pred_keypoints_2d"], dtype=np.float64)
            variant = f"m{margin:.3f}".replace(".", "p")
            output_path = OUTPUT_DIR / f"{photo_id}-{variant}.json"
            payload = {
                "schemaVersion": 1,
                "id": f"delaram-meta-crop-{variant}--{photo_id}",
                "methodId": f"delaram-meta-crop-{variant}",
                "photoId": photo_id,
                "sourcePhotoPath": str(photo_path),
                "imageWidth": image_width,
                "imageHeight": image_height,
                "coordinateSpace": "normalized-image-xy",
                "vertexCount": int(len(normalized)),
                "triangleCount": int(len(canonical_triangles)),
                "vertices": np.round(normalized, 7).reshape(-1).tolist(),
                "triangles": canonical_triangles.reshape(-1).tolist(),
                "keypointsMhr70Px": np.round(keypoints, 4).tolist(),
                "fixedTopology": "Meta MHR 18,439 vertex IDs with canonical visible triangle list",
                "device": "cpu",
                "gpuUsed": False,
                "awsUsed": False,
                "officialMetaInference": True,
                "requestedCropXYXY": np.round(requested_box, 3).tolist(),
                "returnedCropXYXY": np.round(returned_box, 3).tolist(),
                "cropMarginFraction": margin,
                "internalMaskUsedOnlyToDeriveCrop": True,
                "maskPromptUsed": False,
                "rbfUsed": False,
                "vertexSnappingUsed": False,
                "depthUsed": False,
                "measurementsUsed": False,
                "fitEvidenceIds": [f"rgb:{photo_id}", f"internal-mask-crop:{photo_id}"],
                "fitEvidenceSha256": [sha256_file(photo_path), sha256_file(mask_path)],
                "proofStatus": "Candidate",
                "proofBlocker": "The internal outline derived the crop and is not held-out QA truth",
            }
            output_path.write_text(json.dumps(payload, separators=(",", ":")))
            records.append(
                {
                    "methodId": payload["methodId"],
                    "photoId": photo_id,
                    "meshPath": str(output_path),
                    "coordinateSpace": payload["coordinateSpace"],
                    "fitEvidenceIds": payload["fitEvidenceIds"],
                    "fitEvidenceSha256": payload["fitEvidenceSha256"],
                    "isTopologyBaseline": True,
                }
            )
            print(json.dumps({"photoId": photo_id, "margin": margin, "output": str(output_path)}), flush=True)
    report = {
        "schemaVersion": 1,
        "generatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "device": "cpu",
        "gpuUsed": False,
        "awsUsed": False,
        "published": False,
        "releaseBlocked": True,
        "margins": margins,
        "candidateRecords": records,
    }
    report_path = OUTPUT_DIR / "run-report.json"
    report_path.write_text(json.dumps(report, indent=2))
    return report


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--margins", default="0.00,0.03,0.06,0.10,0.15")
    args = parser.parse_args()
    margins = [float(value) for value in args.margins.split(",")]
    run(margins)


if __name__ == "__main__":
    main()
