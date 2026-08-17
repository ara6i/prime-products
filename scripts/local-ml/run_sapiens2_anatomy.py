#!/usr/bin/env python3
"""Run Meta Sapiens2 pose locally for the private WEAR mesh pilot.

The output is anatomical image-space evidence only: 308 keypoints and a
review image. No silhouette, tape, circumference, depth, or WEAR target enters
the model. The first 70 points share Meta's MHR70 ordering, so they can correct
the X/Y pose of the fixed SAM 3D Body topology without changing vertex IDs.

This command is deliberately CPU-only while the project GPU stop is active.
"""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageOps
import torch
from transformers import Sapiens2ForPoseEstimation, Sapiens2ImageProcessor


REPO_ROOT = Path(__file__).resolve().parents[2]
CHECKPOINT = REPO_ROOT / ".local-ml/checkpoints/sapiens2-pose-0.4b"
PHOTO_INDEX = REPO_ROOT / ".local-ml/wear-mesh-overlay/photo-models/index.json"
OUTPUT_DIR = REPO_ROOT / ".local-ml/wear-mesh-overlay/anatomical"

PHOTOS = {
    "delaram": REPO_ROOT / "public/try-on-test/sizing-lab/delaram-front.jpg",
    "delaram-2": REPO_ROOT / "public/try-on-test/sizing-lab/delaram-2-front.jpg",
}

MHR70_NAMES = [
    "nose", "left-eye", "right-eye", "left-ear", "right-ear",
    "left-shoulder", "right-shoulder", "left-elbow", "right-elbow",
    "left-hip", "right-hip", "left-knee", "right-knee", "left-ankle",
    "right-ankle", "left-big-toe-tip", "left-small-toe-tip", "left-heel",
    "right-big-toe-tip", "right-small-toe-tip", "right-heel",
    "right-thumb-tip", "right-thumb-first-joint", "right-thumb-second-joint",
    "right-thumb-third-joint", "right-index-tip", "right-index-first-joint",
    "right-index-second-joint", "right-index-third-joint", "right-middle-tip",
    "right-middle-first-joint", "right-middle-second-joint",
    "right-middle-third-joint", "right-ring-tip", "right-ring-first-joint",
    "right-ring-second-joint", "right-ring-third-joint", "right-pinky-tip",
    "right-pinky-first-joint", "right-pinky-second-joint",
    "right-pinky-third-joint", "right-wrist", "left-thumb-tip",
    "left-thumb-first-joint", "left-thumb-second-joint",
    "left-thumb-third-joint", "left-index-tip", "left-index-first-joint",
    "left-index-second-joint", "left-index-third-joint", "left-middle-tip",
    "left-middle-first-joint", "left-middle-second-joint",
    "left-middle-third-joint", "left-ring-tip", "left-ring-first-joint",
    "left-ring-second-joint", "left-ring-third-joint", "left-pinky-tip",
    "left-pinky-first-joint", "left-pinky-second-joint",
    "left-pinky-third-joint", "left-wrist", "left-olecranon",
    "right-olecranon", "left-cubital-fossa", "right-cubital-fossa",
    "left-acromion", "right-acromion", "neck",
]


def load_crop(photo_id: str, image: Image.Image) -> list[float]:
    """Load a crop rectangle only; it is never used as body geometry."""
    if PHOTO_INDEX.is_file():
        payload = json.loads(PHOTO_INDEX.read_text())
        for record in payload.get("models", []):
            if record.get("id") != photo_id:
                continue
            box = record.get("personBoxPx")
            if isinstance(box, list) and len(box) == 4:
                x1, y1, x2, y2 = [float(value) for value in box]
                if x2 > x1 and y2 > y1:
                    return [x1, y1, x2 - x1, y2 - y1]
    return [0.0, 0.0, float(image.width), float(image.height)]


def draw_review(
    image: Image.Image,
    crop_xywh: list[float],
    keypoints: np.ndarray,
    scores: np.ndarray,
    path: Path,
) -> None:
    review = image.copy().convert("RGB")
    draw = ImageDraw.Draw(review, "RGBA")
    x, y, width, height = crop_xywh
    draw.rectangle((x, y, x + width, y + height), outline=(34, 211, 238, 210), width=5)
    radius = max(3, round(min(image.size) * 0.003))
    for index, ((point_x, point_y), score) in enumerate(zip(keypoints, scores)):
        if index >= 70 or score < 0.18:
            continue
        color = (250, 204, 21, 235) if score >= 0.45 else (251, 146, 60, 215)
        draw.ellipse(
            (point_x - radius, point_y - radius, point_x + radius, point_y + radius),
            fill=color,
            outline=(15, 23, 42, 240),
            width=max(1, radius // 2),
        )
    review.thumbnail((960, 1280), Image.Resampling.LANCZOS)
    review.save(path, quality=92)


def run(photo_id: str) -> dict:
    if not CHECKPOINT.joinpath("model.safetensors").is_file():
        raise FileNotFoundError(f"Sapiens2 checkpoint is incomplete: {CHECKPOINT}")
    photo_path = PHOTOS[photo_id]
    image = ImageOps.exif_transpose(Image.open(photo_path)).convert("RGB")
    crop_xywh = load_crop(photo_id, image)

    torch.set_num_threads(max(1, min(8, os.cpu_count() or 1)))
    processor = Sapiens2ImageProcessor.from_pretrained(CHECKPOINT, local_files_only=True)
    model = Sapiens2ForPoseEstimation.from_pretrained(
        CHECKPOINT,
        local_files_only=True,
        torch_dtype=torch.float32,
    ).to("cpu")
    model.eval()
    boxes = [[crop_xywh]]
    inputs = processor(images=[image], boxes=boxes, return_tensors="pt")
    with torch.inference_mode():
        outputs = model(**inputs)
    processed = processor.post_process_pose_estimation(outputs, boxes=boxes)
    if not processed or not processed[0]:
        raise RuntimeError("Sapiens2 returned no person keypoints.")
    person = processed[0][0]
    keypoints = person["keypoints"].detach().cpu().numpy().astype(np.float64)
    scores = person["scores"].detach().cpu().numpy().astype(np.float64)
    labels = person["labels"].detach().cpu().numpy().astype(np.int64)
    if keypoints.shape != (308, 2) or scores.shape != (308,):
        raise RuntimeError(f"Unexpected Sapiens2 output: {keypoints.shape}, {scores.shape}")

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    output_path = OUTPUT_DIR / f"{photo_id}-sapiens2.json"
    review_path = OUTPUT_DIR / f"{photo_id}-sapiens2-review.jpg"
    payload = {
        "photoId": photo_id,
        "source": "Meta Sapiens2 pose 0.4B from RGB + crop only",
        "checkpoint": "facebook/sapiens2-pose-0.4b",
        "device": "cpu",
        "imageSize": [image.width, image.height],
        "cropBoxXYWH": [round(value, 3) for value in crop_xywh],
        "maskUsed": False,
        "depthUsed": False,
        "measurementsUsed": False,
        "keypointCount": 308,
        "mhr70": [
            {
                "index": index,
                "name": MHR70_NAMES[index],
                "xPx": round(float(keypoints[index, 0]), 4),
                "yPx": round(float(keypoints[index, 1]), 4),
                "score": round(float(scores[index]), 6),
            }
            for index in range(70)
        ],
        "keypoints": np.round(keypoints, 4).tolist(),
        "scores": np.round(scores, 6).tolist(),
        "labels": labels.tolist(),
        "reviewFile": review_path.name,
    }
    output_path.write_text(json.dumps(payload, indent=2) + "\n")
    draw_review(image, crop_xywh, keypoints, scores, review_path)
    return {
        "photoId": photo_id,
        "output": str(output_path.relative_to(REPO_ROOT)),
        "review": str(review_path.relative_to(REPO_ROOT)),
        "mhr70Above018": int((scores[:70] >= 0.18).sum()),
        "mhr70Above045": int((scores[:70] >= 0.45).sum()),
        "medianMhr70Score": round(float(np.median(scores[:70])), 4),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--photo", choices=sorted(PHOTOS), default="delaram")
    args = parser.parse_args()
    print(json.dumps(run(args.photo), indent=2), flush=True)


if __name__ == "__main__":
    main()
