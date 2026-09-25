"""Batch the existing Aiad reference segmenter without reloading it per photo.

The input manifest is a JSON array of objects with absolute ``input`` and
``output`` paths.  Only cleaned binary PNG masks are written.  The source
photos are never modified and no body measurements are read by this process.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageOps
from rembg import new_session, remove
from scipy import ndimage


def segment(source: Path, destination: Path, session: object) -> dict[str, object]:
    image = ImageOps.exif_transpose(Image.open(source)).convert("RGB")
    if image.width * image.height > 25_000_000:
        raise ValueError(f"Image exceeds the 25 megapixel test limit: {source}")

    alpha = np.asarray(remove(image, session=session, only_mask=True))
    if alpha.ndim == 3:
        alpha = alpha[..., 0]
    mask = (alpha > 127).astype(np.uint8)
    component_count, labels = cv2.connectedComponents(mask)
    if component_count > 1:
        sizes = np.bincount(labels.ravel())[1:]
        mask = (labels == 1 + int(np.argmax(sizes))).astype(np.uint8)
    mask = ndimage.binary_fill_holes(mask).astype(np.uint8)
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))

    mask_image = Image.fromarray(mask * 255)
    maximum_side = 1024
    if max(mask_image.size) > maximum_side:
        scale = maximum_side / max(mask_image.size)
        mask_image = mask_image.resize(
            (max(1, round(mask_image.width * scale)), max(1, round(mask_image.height * scale))),
            Image.Resampling.NEAREST,
        )
    destination.parent.mkdir(parents=True, exist_ok=True)
    mask_image.save(destination, format="PNG")
    return {
        "input": str(source),
        "output": str(destination),
        "width": image.width,
        "height": image.height,
        "maskWidth": mask_image.width,
        "maskHeight": mask_image.height,
        "foregroundPixels": int(np.asarray(mask_image).sum() // 255),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("manifest", type=Path)
    args = parser.parse_args()
    rows = json.loads(args.manifest.read_text())
    if not isinstance(rows, list) or not rows:
        raise ValueError("The batch manifest must contain at least one photo.")

    session = new_session("u2net_human_seg", providers=["CPUExecutionProvider"])
    for index, row in enumerate(rows, start=1):
        result = segment(Path(row["input"]), Path(row["output"]), session)
        print(json.dumps({"index": index, "total": len(rows), **result}), flush=True)


if __name__ == "__main__":
    main()
