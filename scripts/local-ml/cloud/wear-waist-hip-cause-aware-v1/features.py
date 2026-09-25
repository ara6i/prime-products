#!/usr/bin/env python3
"""Visible, named features for the cause-aware waist/hip case library.

There is no neural network here.  Every feature is a direct measurement of the
front silhouette or a supplied customer profile value.
"""

from __future__ import annotations

import io
from typing import BinaryIO

import numpy as np
from PIL import Image


IMAGE_HEIGHT = 128
IMAGE_WIDTH = 96
PROFILE_NAMES = ("height_profile", "weight_profile", "bmi_profile", "female", "male")
PROFILE_ROWS = 32
BANDS = 8


def _read_image(source: bytes | BinaryIO) -> np.ndarray:
    handle = io.BytesIO(source) if isinstance(source, bytes) else source
    with Image.open(handle) as opened:
        if "A" in opened.getbands() and opened.getchannel("A").getextrema()[0] != opened.getchannel("A").getextrema()[1]:
            gray = opened.getchannel("A")
        else:
            gray = opened.convert("L")
        if gray.size != (IMAGE_WIDTH, IMAGE_HEIGHT):
            gray = gray.resize((IMAGE_WIDTH, IMAGE_HEIGHT), Image.Resampling.NEAREST)
        return np.asarray(gray, dtype=np.uint8) >= 128


def feature_schema() -> list[str]:
    names = [*PROFILE_NAMES]
    names.extend((
        "silhouette.area_fraction",
        "silhouette.bbox_top",
        "silhouette.bbox_bottom",
        "silhouette.bbox_left",
        "silhouette.bbox_right",
        "silhouette.centroid_x",
        "silhouette.centroid_y",
        "silhouette.bbox_fill_fraction",
    ))
    for row in range(PROFILE_ROWS):
        names.extend((
            f"outline.row_{row:02d}.left_x",
            f"outline.row_{row:02d}.right_x",
            f"outline.row_{row:02d}.width",
            f"outline.row_{row:02d}.center_x",
        ))
    names.extend(f"silhouette.band_{band:02d}.area_fraction" for band in range(BANDS))
    return names


def feature_groups() -> dict[str, list[int]]:
    schema = feature_schema()
    return {
        "profile": list(range(0, len(PROFILE_NAMES))),
        "global_silhouette": list(range(len(PROFILE_NAMES), len(PROFILE_NAMES) + 8)),
        "outline_rows": [index for index, name in enumerate(schema) if name.startswith("outline.")],
        "vertical_bands": [index for index, name in enumerate(schema) if name.startswith("silhouette.band_")],
    }


def _central_run(row: np.ndarray, previous: tuple[int, int]) -> tuple[int, int]:
    padded = np.pad(row.astype(np.int8), (1, 1))
    changes = np.diff(padded)
    starts = np.flatnonzero(changes == 1)
    ends = np.flatnonzero(changes == -1) - 1
    if not len(starts):
        return previous
    center = (len(row) - 1) / 2.0
    candidates = []
    for left, right in zip(starts.tolist(), ends.tolist()):
        width = right - left + 1
        contains_center = left <= center <= right
        distance = 0.0 if contains_center else min(abs(left - center), abs(right - center))
        candidates.append(((0.0 if contains_center else 1000.0) + distance - width * 0.01, left, right))
    _, left, right = min(candidates)
    return int(left), int(right)


def extract_named_features(source: bytes | BinaryIO, profile: np.ndarray) -> np.ndarray:
    mask = _read_image(source)
    y_values, x_values = np.nonzero(mask)
    if not len(y_values):
        raise ValueError("Silhouette is empty")
    top, bottom = int(y_values.min()), int(y_values.max())
    left_box, right_box = int(x_values.min()), int(x_values.max())
    bbox_area = max((bottom - top + 1) * (right_box - left_box + 1), 1)
    values = [float(value) for value in np.asarray(profile, dtype=np.float32).tolist()]
    if len(values) != len(PROFILE_NAMES):
        raise ValueError(f"Expected {len(PROFILE_NAMES)} profile values, received {len(values)}")
    values.extend((
        float(mask.mean()),
        top / (IMAGE_HEIGHT - 1),
        bottom / (IMAGE_HEIGHT - 1),
        left_box / (IMAGE_WIDTH - 1),
        right_box / (IMAGE_WIDTH - 1),
        float(x_values.mean()) / (IMAGE_WIDTH - 1),
        float(y_values.mean()) / (IMAGE_HEIGHT - 1),
        float(mask.sum()) / bbox_area,
    ))
    previous = (left_box, right_box)
    for fraction in np.linspace(0.08, 0.92, PROFILE_ROWS):
        y = int(round(top + fraction * (bottom - top)))
        previous = _central_run(mask[y], previous)
        left, right = previous
        values.extend((
            left / (IMAGE_WIDTH - 1),
            right / (IMAGE_WIDTH - 1),
            (right - left) / (IMAGE_WIDTH - 1),
            (left + right) / (2.0 * (IMAGE_WIDTH - 1)),
        ))
    edges = np.linspace(top, bottom + 1, BANDS + 1).astype(int)
    for start, end in zip(edges[:-1], edges[1:]):
        band = mask[start:max(end, start + 1)]
        values.append(float(band.mean()))
    result = np.asarray(values, dtype=np.float32)
    if result.shape != (len(feature_schema()),) or not np.isfinite(result).all():
        raise RuntimeError("Named silhouette feature contract failed")
    return result


__all__ = ["extract_named_features", "feature_groups", "feature_schema"]
