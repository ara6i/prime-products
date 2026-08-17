#!/usr/bin/env python3
"""Render honest side-by-side review sheets for specialist Delaram candidates."""

from __future__ import annotations

import json
from pathlib import Path

import cv2
import numpy as np


REPO_ROOT = Path(__file__).resolve().parents[2]
OUT = REPO_ROOT / ".local-ml/wear-mesh-proof/delaram-specialist"

METHODS = (
    ("Raw Meta", REPO_ROOT / ".local-ml/wear-mesh-proof/methods/raw-meta-vith/{photo}.json"),
    ("Best crop-only Meta", OUT / "crop-sweep/{photo}-m0p000.json"),
    ("Shared shape (rejected flips)", OUT / "{photo}-shared-shape.json"),
    ("Zero-flip ARAP (tiny gain)", OUT / "{photo}-arap-residual.json"),
)


def load_mesh(path: Path) -> tuple[np.ndarray, np.ndarray, int, int]:
    payload = json.loads(path.read_text())
    width = int(payload["imageWidth"])
    height = int(payload["imageHeight"])
    vertices = np.asarray(payload["vertices"], dtype=np.float64).reshape(-1, 2)
    vertices *= [width, height]
    triangles = np.asarray(payload["triangles"], dtype=np.int64).reshape(-1, 3)
    return vertices, triangles, width, height


def draw_wireframe(image: np.ndarray, vertices: np.ndarray, triangles: np.ndarray) -> np.ndarray:
    overlay = image.copy()
    # Drawing every edge is unreadable. A deterministic sample preserves the
    # full-body spatial evidence while the JSON keeps every triangle.
    sample = triangles[::5]
    for triangle in sample:
        points = np.rint(vertices[triangle]).astype(np.int32)
        cv2.polylines(overlay, [points], True, (255, 210, 30), 1, cv2.LINE_AA)
    return cv2.addWeighted(image, 0.58, overlay, 0.42, 0)


def body_crop(image: np.ndarray, mask: np.ndarray, margin: int = 45) -> np.ndarray:
    ys, xs = np.where(mask > 0)
    x0 = max(0, int(xs.min()) - margin)
    x1 = min(image.shape[1], int(xs.max()) + margin + 1)
    y0 = max(0, int(ys.min()) - margin)
    y1 = min(image.shape[0], int(ys.max()) + margin + 1)
    return image[y0:y1, x0:x1]


def render(photo: str) -> Path:
    photo_path = REPO_ROOT / f"public/try-on-test/sizing-lab/{photo}-front.jpg"
    image = cv2.imread(str(photo_path))
    mask = cv2.imread(str(REPO_ROOT / f".local-ml/wear-mesh-overlay/photo-masks/{photo}.png"), cv2.IMREAD_GRAYSCALE)
    if image is None or mask is None:
        raise FileNotFoundError(photo)
    panels = []
    for label, template in METHODS:
        path = Path(str(template).format(photo=photo))
        vertices, triangles, width, height = load_mesh(path)
        if (width, height) != (image.shape[1], image.shape[0]):
            raise RuntimeError(f"Image size mismatch: {path}")
        panel = draw_wireframe(image, vertices, triangles)
        panel = body_crop(panel, mask)
        target_height = 780
        scale = target_height / panel.shape[0]
        panel = cv2.resize(panel, (round(panel.shape[1] * scale), target_height), interpolation=cv2.INTER_AREA)
        cv2.rectangle(panel, (0, 0), (panel.shape[1], 46), (7, 12, 28), -1)
        cv2.putText(panel, label, (12, 31), cv2.FONT_HERSHEY_SIMPLEX, 0.62, (255, 255, 255), 2, cv2.LINE_AA)
        panels.append(panel)
    gap = np.full((780, 10, 3), (14, 19, 36), dtype=np.uint8)
    sheet = panels[0]
    for panel in panels[1:]:
        sheet = np.concatenate([sheet, gap, panel], axis=1)
    output = OUT / f"{photo}-specialist-review.jpg"
    cv2.imwrite(str(output), sheet, [cv2.IMWRITE_JPEG_QUALITY, 94])
    return output


def main() -> None:
    for photo in ("delaram", "delaram-2"):
        print(render(photo))


if __name__ == "__main__":
    main()
