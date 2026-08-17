#!/usr/bin/env python3
"""Build private CPU-only person silhouettes for the WEAR mesh-fit lab.

The mask is an internal fitting constraint. It is never shown as the product
output and it is never used as a circumference label.
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageOps
import torch
from torchvision import transforms
from transformers import AutoModelForImageSegmentation


REPO_ROOT = Path(__file__).resolve().parents[2]
MODEL_DIR = Path("/Users/arashsn/.cache/primestyleai/models/BiRefNet_HR-matting")
OUTPUT_DIR = REPO_ROOT / ".local-ml/wear-mesh-overlay/photo-masks"
DEFAULT_PHOTOS = (
    ("delaram", REPO_ROOT / "public/try-on-test/sizing-lab/delaram-front.jpg"),
    ("delaram-2", REPO_ROOT / "public/try-on-test/sizing-lab/delaram-2-front.jpg"),
)

SAFE_PHOTO_ID = re.compile(r"^[a-z0-9][a-z0-9-]{0,63}$")


def keep_person_component(mask: np.ndarray) -> np.ndarray:
    binary = (mask >= 0.42).astype(np.uint8)
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
    binary = cv2.morphologyEx(binary, cv2.MORPH_CLOSE, kernel, iterations=2)
    count, labels, stats, _ = cv2.connectedComponentsWithStats(binary, connectivity=8)
    if count <= 1:
        raise RuntimeError("The person silhouette is empty.")

    height, width = binary.shape
    center_x = width / 2.0
    center_y = height / 2.0
    candidates: list[tuple[float, int]] = []
    for label in range(1, count):
        x, y, component_width, component_height, area = stats[label]
        if component_height < height * 0.35 or area < height * width * 0.02:
            continue
        component_center_x = x + component_width / 2.0
        component_center_y = y + component_height / 2.0
        center_penalty = (
            abs(component_center_x - center_x) / width
            + abs(component_center_y - center_y) / height
        )
        candidates.append((float(area) * (1.0 - min(center_penalty, 0.7)), label))
    if not candidates:
        label = int(1 + np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    else:
        label = max(candidates)[1]
    person = (labels == label).astype(np.uint8)
    person = cv2.morphologyEx(person, cv2.MORPH_CLOSE, kernel, iterations=1)
    return person


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--photo-id")
    parser.add_argument("--photo-path", type=Path)
    parser.add_argument("--inference-size", type=int, default=512)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if bool(args.photo_id) != bool(args.photo_path):
        raise ValueError("--photo-id and --photo-path must be supplied together")
    if args.photo_id and not SAFE_PHOTO_ID.fullmatch(args.photo_id):
        raise ValueError("Unsafe photo id")
    if args.inference_size not in {384, 512, 640, 768, 1024}:
        raise ValueError("--inference-size must be one of 384, 512, 640, 768, 1024")
    photos = (
        ((args.photo_id, args.photo_path.resolve()),)
        if args.photo_id and args.photo_path
        else DEFAULT_PHOTOS
    )
    if not MODEL_DIR.is_dir():
        raise FileNotFoundError(f"Missing local BiRefNet model: {MODEL_DIR}")
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    torch.set_num_threads(max(1, min(8, torch.get_num_threads())))
    model = AutoModelForImageSegmentation.from_pretrained(
        str(MODEL_DIR),
        trust_remote_code=True,
        local_files_only=True,
    ).to("cpu").float().eval()
    preprocess = transforms.Compose(
        [
            transforms.Resize((args.inference_size, args.inference_size)),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
        ]
    )

    records = []
    for photo_id, source in photos:
        if not source.is_file():
            raise FileNotFoundError(source)
        image = ImageOps.exif_transpose(Image.open(source)).convert("RGB")
        tensor = preprocess(image).unsqueeze(0).to("cpu", dtype=torch.float32)
        with torch.inference_mode():
            prediction = model(tensor)[-1].sigmoid().cpu()[0, 0].numpy()
        prediction = cv2.resize(
            prediction,
            image.size,
            interpolation=cv2.INTER_LINEAR,
        )
        person = keep_person_component(prediction)
        ys, xs = np.where(person > 0)
        if len(xs) < 100:
            raise RuntimeError(f"No valid person silhouette for {photo_id}.")
        output = OUTPUT_DIR / f"{photo_id}.png"
        Image.fromarray(person * 255, mode="L").save(output)
        record = {
            "id": photo_id,
            "file": output.name,
            "imageSize": [image.width, image.height],
            "boundsPx": [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())],
            "foregroundPixels": int(person.sum()),
            "source": "BiRefNet HR matting, CPU, largest full-height person component",
            "inferenceSize": [args.inference_size, args.inference_size],
        }
        records.append(record)
        print(json.dumps(record), flush=True)
    index_path = OUTPUT_DIR / "index.json"
    existing: dict[str, object] = {"masks": []}
    if index_path.is_file():
        try:
            existing = json.loads(index_path.read_text())
        except json.JSONDecodeError:
            existing = {"masks": []}
    merged = {
        str(record.get("id")): record
        for record in existing.get("masks", [])
        if isinstance(record, dict) and record.get("id")
    }
    merged.update({str(record["id"]): record for record in records})
    index_path.write_text(json.dumps({"masks": list(merged.values())}, indent=2) + "\n")


if __name__ == "__main__":
    main()
