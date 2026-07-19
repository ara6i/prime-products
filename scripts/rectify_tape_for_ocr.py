#!/usr/bin/env python3
"""Rectify a coloured vertical measuring tape into a narrow OCR strip.

This is coordinate extraction only. It never reads tape values and never
participates in the blind scale model.
"""

import argparse
import json
from pathlib import Path

import cv2
import numpy as np


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("image")
    parser.add_argument("--hint-x", required=True, type=float)
    parser.add_argument("--output", required=True)
    parser.add_argument("--map-output", required=True)
    parser.add_argument("--straight-center", action="store_true")
    args = parser.parse_args()

    image = cv2.imread(args.image, cv2.IMREAD_COLOR)
    if image is None:
        raise ValueError("Could not read tape image for rectification.")
    height, width = image.shape[:2]
    hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV)
    lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
    legacy_saturation_mask = cv2.inRange(hsv, np.array([30, 45, 35]), np.array([105, 255, 255]))

    # Supported proof tapes are saturated coloured strips. Restrict the search
    # to the user's X hint so unrelated clothing is ignored.
    if args.straight_center:
        # Inch proof tapes in the lab are yellow. The older hue floor of 30
        # retained only greenish highlights, so the fitted centre drifted onto
        # the tape's right edge near the floor. Lab-b keeps the yellow strip
        # separate from the brown floor even where both have a similar hue.
        saturation_mask = (
            (hsv[:, :, 0] >= 8)
            & (hsv[:, :, 0] <= 55)
            & (hsv[:, :, 1] >= 45)
            & (hsv[:, :, 2] >= 35)
            & (lab[:, :, 2] >= 148)
        ).astype(np.uint8) * 255
    else:
        saturation_mask = legacy_saturation_mask
    x0 = max(0, int(round(args.hint_x)) - 150)
    x1 = min(width, int(round(args.hint_x)) + 151)
    restricted = np.zeros_like(saturation_mask)
    restricted[:, x0:x1] = saturation_mask[:, x0:x1]
    restricted = cv2.morphologyEx(
        restricted,
        cv2.MORPH_CLOSE,
        cv2.getStructuringElement(cv2.MORPH_RECT, (3, 9)),
    )

    centers = np.full(height, np.nan, dtype=np.float32)
    run_widths = np.zeros(height, dtype=np.float32)
    for y in range(height):
        xs = np.flatnonzero(restricted[y] > 0)
        if xs.size >= 3:
            # Choose the coloured run closest to the previous row or the hint.
            split_at = np.flatnonzero(np.diff(xs) > 3) + 1
            runs = [run for run in np.split(xs, split_at) if run.size >= 3]
            target = centers[y - 1] if y > 0 and np.isfinite(centers[y - 1]) else args.hint_x
            if runs:
                run = min(runs, key=lambda candidate: abs(float(np.median(candidate)) - target))
                centers[y] = float(np.median(run))
                run_widths[y] = float(run.size)

    valid_y = np.flatnonzero(np.isfinite(centers))
    if valid_y.size < max(80, int(height * 0.15)):
        raise ValueError("Tape colour path was not visible enough to rectify.")
    # Keep the rows where the coloured strip was actually observed.  The
    # interpolated centre path below is useful for rectification, but it must
    # never be mistaken for proof that the tape continues onto the floor or
    # beyond the photographed end of the strip.
    maximum_visible_width = 90 if args.straight_center else 80
    tape_visibility = (
        (run_widths >= 3)
        & (run_widths <= maximum_visible_width)
    ).astype(np.uint8)
    tape_visibility = cv2.morphologyEx(
        tape_visibility.reshape(-1, 1),
        cv2.MORPH_CLOSE,
        cv2.getStructuringElement(cv2.MORPH_RECT, (1, 17)),
    ).reshape(-1)
    observed_centers = centers.copy()
    centers = np.interp(np.arange(height), valid_y, centers[valid_y]).astype(np.float32)
    centers = cv2.GaussianBlur(centers.reshape(-1, 1), (1, 31), 0).reshape(-1)
    if args.straight_center:
        sample_y = np.arange(height, dtype=np.float32)
        keep = (
            np.isfinite(observed_centers)
            & (np.abs(observed_centers - args.hint_x) <= 100)
            & (run_widths <= 90)
        )
        if np.count_nonzero(keep) < 80:
            raise ValueError("Tape centre line did not have enough narrow-strip evidence.")
        for _ in range(5):
            slope, intercept = np.polyfit(sample_y[keep], observed_centers[keep], 1)
            fitted = (slope * sample_y) + intercept
            residual = observed_centers - fitted
            median_residual = float(np.median(residual[keep]))
            mad = float(np.median(np.abs(residual[keep] - median_residual)))
            next_keep = keep & (np.abs(residual - median_residual) <= max(10.0, 3 * 1.4826 * mad))
            if np.array_equal(next_keep, keep) or np.count_nonzero(next_keep) < 80:
                break
            keep = next_keep
        centers = ((slope * sample_y) + intercept).astype(np.float32)

    # Apple Vision reads the tiny Shane labels more reliably when the tape is
    # offset toward the right side of the narrow OCR strip. Preserve that OCR
    # sampling path, but keep the accurate Lab-derived centre above as the
    # coordinate path returned to the ruler.
    ocr_centers = centers
    if args.straight_center:
        legacy_restricted = np.zeros_like(legacy_saturation_mask)
        legacy_restricted[:, x0:x1] = legacy_saturation_mask[:, x0:x1]
        legacy_restricted = cv2.morphologyEx(
            legacy_restricted,
            cv2.MORPH_CLOSE,
            cv2.getStructuringElement(cv2.MORPH_RECT, (3, 9)),
        )
        legacy_centers = np.full(height, np.nan, dtype=np.float32)
        for y in range(height):
            xs = np.flatnonzero(legacy_restricted[y] > 0)
            if xs.size < 3:
                continue
            split_at = np.flatnonzero(np.diff(xs) > 3) + 1
            runs = [run for run in np.split(xs, split_at) if run.size >= 3]
            target = legacy_centers[y - 1] if y > 0 and np.isfinite(legacy_centers[y - 1]) else args.hint_x
            if runs:
                run = min(runs, key=lambda candidate: abs(float(np.median(candidate)) - target))
                legacy_centers[y] = float(np.median(run))
        legacy_valid_y = np.flatnonzero(np.isfinite(legacy_centers))
        if legacy_valid_y.size >= 80:
            legacy_centers = np.interp(
                np.arange(height),
                legacy_valid_y,
                legacy_centers[legacy_valid_y],
            ).astype(np.float32)
            legacy_centers = cv2.GaussianBlur(legacy_centers.reshape(-1, 1), (1, 31), 0).reshape(-1)
            keep = np.abs(legacy_centers - args.hint_x) <= 100
            for _ in range(5):
                ocr_slope, ocr_intercept = np.polyfit(sample_y[keep], legacy_centers[keep], 1)
                fitted = (ocr_slope * sample_y) + ocr_intercept
                residual = legacy_centers - fitted
                median_residual = float(np.median(residual[keep]))
                mad = float(np.median(np.abs(residual[keep] - median_residual)))
                next_keep = keep & (np.abs(residual - median_residual) <= max(10.0, 3 * 1.4826 * mad))
                if np.array_equal(next_keep, keep) or np.count_nonzero(next_keep) < 80:
                    break
                keep = next_keep
            ocr_centers = ((ocr_slope * sample_y) + ocr_intercept).astype(np.float32)

    strip_width = 64
    offsets = np.arange(strip_width, dtype=np.float32) - ((strip_width - 1) / 2)
    map_x = ocr_centers[:, None] + offsets[None, :]
    map_y = np.repeat(np.arange(height, dtype=np.float32)[:, None], strip_width, axis=1)
    strip = cv2.remap(image, map_x, map_y, cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
    strip_hsv = cv2.cvtColor(strip, cv2.COLOR_BGR2HSV)
    band_left = (strip_width // 2) - 10
    band_right = (strip_width // 2) + 10
    line_score = 255 - np.median(strip_hsv[:, band_left:band_right, 2], axis=1)
    line_score = cv2.GaussianBlur(line_score.astype(np.float32).reshape(-1, 1), (1, 3), 0).reshape(-1)

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    if not cv2.imwrite(str(output_path), strip):
        raise ValueError("Could not write rectified tape strip.")
    Path(args.map_output).write_text(json.dumps({
        "sourceImageWidth": width,
        "sourceImageHeight": height,
        "stripWidth": strip_width,
        "centerXByY": [round(float(value), 3) for value in centers],
        "ocrCenterXByY": [round(float(value), 3) for value in ocr_centers],
        "tapeLineScoreByY": [round(float(value), 3) for value in line_score],
        "tapeVisibilityByY": [int(value) for value in tape_visibility],
    }, separators=(",", ":")))


if __name__ == "__main__":
    main()
