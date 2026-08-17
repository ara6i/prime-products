#!/usr/bin/env python3
"""Build a mask-free fixed MHR topology from one RGB photo.

This is the fixed-topology half of the private WEAR matching pilot. It runs
Meta SAM 3D Body with only the RGB photo and a person crop, then saves the
camera-projected MHR vertices, front-facing faces, and MHR70 image keypoints.
It does not use a silhouette, depth, tape, circumference, or body-part line.
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import os
from pathlib import Path

import numpy as np


REPO_ROOT = Path(__file__).resolve().parents[2]
OUTPUT_DIR = REPO_ROOT / ".local-ml/wear-mesh-overlay/anatomical"
PHOTO_INDEX = REPO_ROOT / ".local-ml/wear-mesh-overlay/photo-models/index.json"
SHAPE_RUNNER = REPO_ROOT / "scripts/local-ml/run_sam3d_shape.py"
MESH_HELPERS = REPO_ROOT / "scripts/local-ml/build_photo_body_mesh_assets.py"

PHOTOS = {
    "delaram": {
        "path": REPO_ROOT / "public/try-on-test/sizing-lab/delaram-front.jpg",
        "heightCm": 168.0,
        "weightKg": 70.8,
    },
    "delaram-2": {
        "path": REPO_ROOT / "public/try-on-test/sizing-lab/delaram-2-front.jpg",
        "heightCm": 168.0,
        "weightKg": 70.8,
    },
}


def load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not load {path}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def configure_environment() -> None:
    os.environ.setdefault(
        "PRIMESTYLE_SAM3D_ROOT",
        str(REPO_ROOT / ".local-ml/external/sam-3d-body"),
    )
    os.environ.setdefault(
        "PRIMESTYLE_SAM3D_CHECKPOINT",
        str(REPO_ROOT / ".local-ml/checkpoints/sam-3d-body-vith/model.ckpt"),
    )
    os.environ.setdefault(
        "PRIMESTYLE_SAM3D_MHR",
        str(REPO_ROOT / ".local-ml/checkpoints/sam-3d-body-vith/assets/mhr_model.pt"),
    )
    # The active project-wide stop forbids GPU use. Fail closed here.
    os.environ["PRIMESTYLE_SAM3D_DEVICE"] = "cpu"


def load_box(photo_id: str) -> list[float]:
    payload = json.loads(PHOTO_INDEX.read_text())
    for record in payload.get("models", []):
        if record.get("id") == photo_id:
            box = record.get("personBoxPx")
            if isinstance(box, list) and len(box) == 4:
                return [float(value) for value in box]
    raise RuntimeError(f"No automatic person crop is available for {photo_id}.")


def run(photo_id: str) -> dict:
    configure_environment()
    runner = load_module("primestyle_sam3d_shape", SHAPE_RUNNER)
    helpers = load_module("primestyle_photo_mesh_helpers", MESH_HELPERS)
    photo = PHOTOS[photo_id]
    diagnostics: dict[str, np.ndarray] = {}
    estimator = runner.load_estimator()
    request = {
        "heightCm": photo["heightCm"],
        "personBoxPx": load_box(photo_id),
    }
    (
        posed_vertices,
        _neutral_vertices,
        faces,
        returned_box,
        _mask_bounds_y,
        image_width,
        image_height,
        mask,
        _camera_conditioned,
        camera_translation,
        camera_projection,
    ) = runner.run_model(
        estimator,
        photo["path"],
        request,
        capture=diagnostics,
    )
    if mask is not None:
        raise RuntimeError("Mask-free MHR inference unexpectedly received a mask.")
    projected = helpers.projected_browser_vertices(
        posed_vertices,
        camera_translation,
        camera_projection,
        image_width,
        image_height,
    )
    normalized_xy = helpers.image_normalized_vertices(
        projected,
        image_width,
        image_height,
    )
    display_faces = helpers.front_display_faces(
        projected,
        projected,
        faces,
        image_width,
        image_height,
    )
    keypoints = np.asarray(diagnostics.get("pred_keypoints_2d", []), dtype=np.float64)
    if keypoints.shape != (70, 2):
        raise RuntimeError(f"Unexpected Meta MHR70 keypoints: {keypoints.shape}")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    output_path = OUTPUT_DIR / f"{photo_id}-mhr-rgb.json"
    payload = {
        "photoId": photo_id,
        "source": "Meta SAM 3D Body fixed MHR topology from RGB + crop only",
        "device": "cpu",
        "imageSize": [image_width, image_height],
        "personBoxXYXY": [round(float(value), 3) for value in returned_box],
        "maskUsed": False,
        "depthUsed": False,
        "measurementsUsed": False,
        "heightCmUsedForTopology": photo["heightCm"],
        "weightKgNotUsed": photo["weightKg"],
        "vertexCount": int(len(normalized_xy)),
        "triangleCount": int(len(display_faces)),
        "vertices": np.round(normalized_xy, 7).reshape(-1).tolist(),
        "triangles": np.asarray(display_faces, dtype=np.int64).reshape(-1).tolist(),
        "mhr70": np.round(keypoints, 4).tolist(),
        "cameraProjection": {
            key: round(float(value), 5) for key, value in camera_projection.items()
        },
        "cameraTranslation": np.round(camera_translation, 6).tolist(),
    }
    output_path.write_text(json.dumps(payload, separators=(",", ":")))
    return {
        "photoId": photo_id,
        "output": str(output_path.relative_to(REPO_ROOT)),
        "vertexCount": payload["vertexCount"],
        "triangleCount": payload["triangleCount"],
        "mhr70Count": len(keypoints),
        "maskUsed": False,
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--photo", choices=sorted(PHOTOS), default="delaram")
    args = parser.parse_args()
    print(json.dumps(run(args.photo), indent=2), flush=True)


if __name__ == "__main__":
    main()
