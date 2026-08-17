#!/usr/bin/env python3
"""Correct a fixed MHR 2D projection with Sapiens2 anatomical points.

The output keeps all 18,439 MHR vertex IDs and all selected MHR faces. Only X
and Y move. Sapiens2 joint residuals are smoothly propagated over the existing
topology; no silhouette is triangulated and no Z/depth is used for matching.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageOps
from scipy.interpolate import RBFInterpolator


REPO_ROOT = Path(__file__).resolve().parents[2]
INPUT_DIR = REPO_ROOT / ".local-ml/wear-mesh-overlay/anatomical"
OUTPUT_DIR = REPO_ROOT / ".local-ml/wear-mesh-overlay/anatomical"
PHOTOS = {
    "delaram": REPO_ROOT / "public/try-on-test/sizing-lab/delaram-front.jpg",
    "delaram-2": REPO_ROOT / "public/try-on-test/sizing-lab/delaram-2-front.jpg",
}


def draw_mesh(
    draw: ImageDraw.ImageDraw,
    vertices: np.ndarray,
    triangles: np.ndarray,
    color: tuple[int, int, int, int],
    width: int,
) -> None:
    for a, b, c in triangles:
        draw.line(
            [tuple(vertices[a]), tuple(vertices[b]), tuple(vertices[c]), tuple(vertices[a])],
            fill=color,
            width=width,
        )


def build(photo_id: str) -> dict:
    mhr_path = INPUT_DIR / f"{photo_id}-mhr-rgb.json"
    sapiens_path = INPUT_DIR / f"{photo_id}-sapiens2.json"
    if not mhr_path.is_file() or not sapiens_path.is_file():
        raise FileNotFoundError("Run the RGB MHR and Sapiens2 steps first.")
    mhr = json.loads(mhr_path.read_text())
    sapiens = json.loads(sapiens_path.read_text())
    image_width, image_height = [int(value) for value in mhr["imageSize"]]
    normalized = np.asarray(mhr["vertices"], dtype=np.float64).reshape(-1, 2)
    vertices = normalized * np.asarray([image_width, image_height], dtype=np.float64)
    triangles = np.asarray(mhr["triangles"], dtype=np.int64).reshape(-1, 3)
    source = np.asarray(mhr["mhr70"], dtype=np.float64)
    target = np.asarray(sapiens["keypoints"], dtype=np.float64)[:70]
    scores = np.asarray(sapiens["scores"], dtype=np.float64)[:70]
    names = [record["name"] for record in sapiens["mhr70"]]

    accepted = np.flatnonzero(scores >= 0.45)
    if len(accepted) < 20:
        raise RuntimeError("Too few reliable Sapiens2 anatomical points.")
    source_accepted = source[accepted]
    residuals = target[accepted] - source_accepted

    x1, y1, x2, y2 = [float(value) for value in mhr["personBoxXYXY"]]
    boundary = np.asarray(
        [
            [x1, y1], [x2, y1], [x2, y2], [x1, y2],
            [(x1 + x2) / 2, y1], [(x1 + x2) / 2, y2],
            [x1, (y1 + y2) / 2], [x2, (y1 + y2) / 2],
        ],
        dtype=np.float64,
    )
    control_points = np.vstack([source_accepted, boundary])
    control_residuals = np.vstack([residuals, np.zeros((len(boundary), 2))])
    correction = RBFInterpolator(
        control_points,
        control_residuals,
        kernel="linear",
        smoothing=10.0,
        neighbors=min(24, len(control_points)),
    )
    corrected = vertices + correction(vertices)
    corrected_anchors = source + correction(source)
    before_error = np.linalg.norm(source - target, axis=1)
    after_error = np.linalg.norm(corrected_anchors - target, axis=1)

    corrected_normalized = corrected / np.asarray([image_width, image_height])
    anchors = [
        {
            "index": index,
            "name": names[index],
            "score": round(float(scores[index]), 6),
            "beforeErrorPx": round(float(before_error[index]), 3),
            "afterErrorPx": round(float(after_error[index]), 3),
            "mhr": np.round(source[index] / [image_width, image_height], 7).tolist(),
            "sapiens": np.round(target[index] / [image_width, image_height], 7).tolist(),
        }
        for index in range(70)
    ]
    payload = {
        "photoId": photo_id,
        "source": "Fixed Meta MHR topology corrected by Meta Sapiens2 MHR70 points",
        "imageWidth": image_width,
        "imageHeight": image_height,
        "vertexCount": int(len(corrected)),
        "triangleCount": int(len(triangles)),
        "fixedTopology": "Meta MHR 18,439 vertex IDs",
        "maskUsed": False,
        "depthUsed": False,
        "measurementsUsed": False,
        "matchingAxes": "image X/Y only",
        "correction": "local linear RBF over Sapiens2 anatomical residuals",
        "acceptedAnchorCount": int(len(accepted)),
        "medianAnchorErrorBeforePx": round(float(np.median(before_error)), 3),
        "medianAnchorErrorAfterPx": round(float(np.median(after_error)), 3),
        "p90AnchorErrorBeforePx": round(float(np.quantile(before_error, 0.9)), 3),
        "p90AnchorErrorAfterPx": round(float(np.quantile(after_error, 0.9)), 3),
        "vertices": np.round(corrected_normalized, 7).reshape(-1).tolist(),
        "rawVertices": np.round(normalized, 7).reshape(-1).tolist(),
        "triangles": triangles.reshape(-1).tolist(),
        "anchors": anchors,
    }
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    output_path = OUTPUT_DIR / f"{photo_id}-anatomical.json"
    output_path.write_text(json.dumps(payload, separators=(",", ":")))

    image = ImageOps.exif_transpose(Image.open(PHOTOS[photo_id])).convert("RGB")
    review = image.copy()
    draw = ImageDraw.Draw(review, "RGBA")
    draw_mesh(draw, vertices, triangles[::2], (34, 211, 238, 55), 1)
    draw_mesh(draw, corrected, triangles[::2], (248, 250, 252, 100), 1)
    for index in accepted:
        x, y = target[index]
        radius = 5
        draw.ellipse((x - radius, y - radius, x + radius, y + radius), fill=(250, 204, 21, 225))
    review.thumbnail((960, 1280), Image.Resampling.LANCZOS)
    review_path = OUTPUT_DIR / f"{photo_id}-anatomical-review.jpg"
    review.save(review_path, quality=92)
    return {
        "photoId": photo_id,
        "output": str(output_path.relative_to(REPO_ROOT)),
        "review": str(review_path.relative_to(REPO_ROOT)),
        "fixedVertexCount": payload["vertexCount"],
        "anchors": payload["acceptedAnchorCount"],
        "medianErrorBeforePx": payload["medianAnchorErrorBeforePx"],
        "medianErrorAfterPx": payload["medianAnchorErrorAfterPx"],
        "p90ErrorBeforePx": payload["p90AnchorErrorBeforePx"],
        "p90ErrorAfterPx": payload["p90AnchorErrorAfterPx"],
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--photo", choices=sorted(PHOTOS), default="delaram")
    args = parser.parse_args()
    print(json.dumps(build(args.photo), indent=2), flush=True)


if __name__ == "__main__":
    main()
