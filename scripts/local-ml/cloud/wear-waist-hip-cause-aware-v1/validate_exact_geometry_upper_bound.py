#!/usr/bin/env python3
"""Measure what the current tape labels allow when exact teacher 3D is available.

This is a diagnostic ceiling, not a customer-time model.  It deliberately gives
the formula the certified PLY width, depth, ring and 32-point shape that a real
single front photo does not contain.
"""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

import numpy as np


ROWS = ("waist", "hips")
HALF_INCH_CM = 1.27


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--library", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    return parser.parse_args()


def metrics(errors: np.ndarray) -> dict[str, float | int]:
    absolute = np.abs(errors)
    return {
        "count": int(len(absolute)),
        "maeCm": round(float(absolute.mean()), 6),
        "p95Cm": round(float(np.quantile(absolute, 0.95)), 6),
        "worstCm": round(float(absolute.max()), 6),
        "withinHalfInchPercent": round(float(np.mean(absolute <= HALF_INCH_CM) * 100.0), 4),
    }


def main() -> int:
    args = parse_args()
    with np.load(args.library, allow_pickle=False) as archive:
        features = archive["features"].astype(np.float64)
        feature_names = archive["feature_schema"].tolist()
        targets = archive["targets"].astype(np.float64)
        target_names = archive["target_schema"].tolist()
        target_masks = archive["target_masks"].astype(np.bool_)
        view_ids = archive["view_ids"]
        fold_ids = archive["fold_ids"]

    canonical = np.flatnonzero(view_ids == "canonical")
    features = features[canonical]
    targets = targets[canonical]
    target_masks = target_masks[canonical]
    fold_ids = fold_ids[canonical]
    feature_schema = {name: index for index, name in enumerate(feature_names)}
    target_schema = {name: index for index, name in enumerate(target_names)}
    profile_columns = [
        feature_schema[name]
        for name in ("height_profile", "weight_profile", "bmi_profile", "female", "male")
    ]

    results: dict[str, object] = {}
    for row in ROWS:
        geometry_columns = [
            target_schema[f"{row}.ring_cm"],
            target_schema[f"{row}.width_cm"],
            target_schema[f"{row}.depth_cm"],
            target_schema[f"{row}.y_norm"],
            *[
                target_schema[f"{row}.shape.{point:02d}.{axis}"]
                for point in range(32)
                for axis in ("x", "depth")
            ],
        ]
        visible = np.column_stack((features[:, profile_columns], targets[:, geometry_columns]))
        tape_column = target_schema[f"{row}.final_tape_cm"]
        ring_column = target_schema[f"{row}.ring_cm"]
        valid = target_masks[:, tape_column]
        tape = targets[:, tape_column]
        prediction = np.full(len(tape), np.nan, dtype=np.float64)

        for fold in range(5):
            train = valid & (fold_ids != fold)
            validate = valid & (fold_ids == fold)
            center = visible[train].mean(axis=0)
            scale = visible[train].std(axis=0)
            scale[scale < 1e-6] = 1.0
            train_scaled = (visible[train] - center) / scale
            validate_scaled = (visible[validate] - center) / scale
            train_design = np.column_stack((np.ones(int(train.sum())), train_scaled))
            validate_design = np.column_stack((np.ones(int(validate.sum())), validate_scaled))
            penalty = np.eye(train_design.shape[1], dtype=np.float64)
            penalty[0, 0] = 0.0
            coefficients = np.linalg.solve(
                train_design.T @ train_design + penalty,
                train_design.T @ tape[train],
            )
            prediction[validate] = validate_design @ coefficients

        results[row] = {
            "rawExactPlyRing": metrics(targets[valid, ring_column] - tape[valid]),
            "exactPlyPlusVisibleLinearCorrection": metrics(prediction[valid] - tape[valid]),
        }

    payload = {
        "schemaVersion": "wear-waist-hip-exact-geometry-upper-bound/v1",
        "createdAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "purpose": "Diagnostic only: test whether exact certified teacher 3D plus a visible linear correction can meet the tape target.",
        "customerModel": False,
        "developmentPeople": int(len(canonical)),
        "folds": 5,
        "heldoutPeopleUsed": 0,
        "targetCm": HALF_INCH_CM,
        "pytorchUsed": False,
        "adamwUsed": False,
        "results": results,
        "interpretation": "If exact 3D still misses the target, improving the front-photo geometry estimator alone cannot solve the remaining tape-label or protocol disagreement.",
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n")
    print(json.dumps(payload, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
