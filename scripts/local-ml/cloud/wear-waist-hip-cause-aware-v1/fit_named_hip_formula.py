#!/usr/bin/env python3
"""Fit and validate the visible 29-input hip formula without neural training."""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np


HALF_INCH_CM = 1.27
HUBER_LIMIT_CM = 2.0
HUBER_ROUNDS = 12
RIDGE_PENALTY = 1.0
ROW_INDICES = (8, 10, 12, 14, 16, 18, 20)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--library", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    return parser.parse_args()


def build_named_inputs(features: np.ndarray, feature_names: list[str]) -> tuple[np.ndarray, list[str]]:
    schema = {name: index for index, name in enumerate(feature_names)}
    height_cm = features[:, schema["height_profile"]] * 20.0 + 170.0
    weight_kg = features[:, schema["weight_profile"]] * 25.0 + 70.0
    bmi = features[:, schema["bmi_profile"]] * 8.0 + 24.0
    female = features[:, schema["female"]]
    area = features[:, schema["silhouette.area_fraction"]]
    fill = features[:, schema["silhouette.bbox_fill_fraction"]]
    widths = np.column_stack([
        features[:, schema[f"outline.row_{row:02d}.width"]]
        for row in range(32)
    ])
    bands = np.column_stack([
        features[:, schema[f"silhouette.band_{band:02d}.area_fraction"]]
        for band in range(8)
    ])
    shoulder = widths[:, 4:10].max(axis=1)
    chest = widths[:, 7:13].max(axis=1)
    waist = widths[:, 9:16].min(axis=1)
    hip = widths[:, 13:20].max(axis=1)
    height_m = height_cm / 100.0
    mass_depth = weight_kg / np.maximum(area * height_m * height_m, 1e-6)

    values = [
        (height_cm - 170.0) / 10.0,
        (weight_kg - 75.0) / 20.0,
        female - 0.5,
        (bmi - 24.0) / 5.0,
        (area - 0.195) / 0.02,
        (fill - 0.5) / 0.1,
        (shoulder * height_cm - 42.0) / 4.0,
        (chest * height_cm - 40.0) / 4.0,
        (waist * height_cm - 33.0) / 4.0,
        (hip * height_cm - 44.0) / 4.0,
        (mass_depth - 130.0) / 20.0,
        (waist / np.maximum(shoulder, 1e-6) - 0.57) / 0.1,
        (hip / np.maximum(shoulder, 1e-6) - 0.74) / 0.1,
        (hip / np.maximum(waist, 1e-6) - 1.31) / 0.1,
        *[(widths[:, row] * height_cm - 38.0) / 5.0 for row in ROW_INDICES],
        *[bands[:, band] for band in range(8)],
    ]
    names = [
        "height",
        "weight",
        "female indicator",
        "BMI",
        "front silhouette area",
        "body-box fill",
        "shoulder A-to-B width",
        "chest A-to-B width",
        "waist A-to-B width",
        "hip A-to-B width",
        "mass-to-front-area depth clue",
        "waist-to-shoulder ratio",
        "hip-to-shoulder ratio",
        "hip-to-waist ratio",
        *[f"outline row {row} A-to-B width" for row in ROW_INDICES],
        *[f"front-area band {band}" for band in range(8)],
    ]
    return np.column_stack(values), names


def fit_formula(inputs: np.ndarray, tape_cm: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    center = inputs.mean(axis=0)
    scale = inputs.std(axis=0)
    scale[scale < 1e-6] = 1.0
    design = np.column_stack((np.ones(len(inputs)), (inputs - center) / scale))
    penalty = np.eye(design.shape[1], dtype=np.float64) * RIDGE_PENALTY
    penalty[0, 0] = 0.0
    coefficients = np.linalg.solve(design.T @ design + penalty, design.T @ tape_cm)
    for _ in range(HUBER_ROUNDS):
        residual = tape_cm - design @ coefficients
        importance = np.minimum(1.0, HUBER_LIMIT_CM / np.maximum(np.abs(residual), 1e-8))
        coefficients = np.linalg.solve(
            design.T @ (design * importance[:, None]) + penalty,
            design.T @ (tape_cm * importance),
        )
    return center, scale, coefficients


def summarize(errors: np.ndarray) -> dict[str, float | int]:
    absolute = np.abs(errors)
    return {
        "count": int(len(absolute)),
        "maeCm": round(float(absolute.mean()), 6),
        "p95Cm": round(float(np.quantile(absolute, 0.95)), 6),
        "worstCm": round(float(absolute.max()), 6),
        "signedBiasCm": round(float(errors.mean()), 6),
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
        scan_ids = archive["scan_ids"]

    canonical = np.flatnonzero(view_ids == "canonical")
    features = features[canonical]
    targets = targets[canonical]
    target_masks = target_masks[canonical]
    fold_ids = fold_ids[canonical]
    scan_ids = scan_ids[canonical]
    inputs, input_names = build_named_inputs(features, feature_names)
    target_schema = {name: index for index, name in enumerate(target_names)}
    tape_column = target_schema["hips.final_tape_cm"]
    valid = target_masks[:, tape_column]
    tape_cm = targets[:, tape_column]
    prediction = np.full(len(tape_cm), np.nan, dtype=np.float64)
    bmi = features[:, feature_names.index("bmi_profile")] * 8.0 + 24.0

    for fold in range(5):
        train = valid & (fold_ids != fold)
        validate = valid & (fold_ids == fold)
        center, scale, coefficients = fit_formula(inputs[train], tape_cm[train])
        validate_design = np.column_stack((np.ones(int(validate.sum())), (inputs[validate] - center) / scale))
        prediction[validate] = validate_design @ coefficients
        high_train = train & (bmi >= 30.0)
        high_validate = validate & (bmi >= 30.0)
        high_center, high_scale, high_coefficients = fit_formula(inputs[high_train], tape_cm[high_train])
        high_validate_design = np.column_stack((
            np.ones(int(high_validate.sum())),
            (inputs[high_validate] - high_center) / high_scale,
        ))
        prediction[high_validate] = high_validate_design @ high_coefficients

    female = features[:, feature_names.index("female")] > 0.5
    subgroups = {
        "gender:female": female,
        "gender:male": ~female,
        "bmi:below_20": bmi < 20.0,
        "bmi:20_to_24_99": (bmi >= 20.0) & (bmi < 25.0),
        "bmi:25_to_29_99": (bmi >= 25.0) & (bmi < 30.0),
        "bmi:30_or_above": bmi >= 30.0,
    }
    final_center, final_scale, final_coefficients = fit_formula(inputs[valid], tape_cm[valid])
    final_high = valid & (bmi >= 30.0)
    high_center, high_scale, high_coefficients = fit_formula(inputs[final_high], tape_cm[final_high])
    def formula_payload(center: np.ndarray, scale: np.ndarray, coefficients: np.ndarray) -> dict[str, Any]:
        return {
            "interceptCm": round(float(coefficients[0]), 10),
            "terms": [
                {
                    "name": name,
                    "center": round(float(item_center), 10),
                    "scale": round(float(item_scale), 10),
                    "coefficientCm": round(float(coefficient), 10),
                }
                for name, item_center, item_scale, coefficient in zip(
                    input_names,
                    center,
                    scale,
                    coefficients[1:],
                )
            ],
        }
    payload: dict[str, Any] = {
        "schemaVersion": "wear-waist-hip-named-hip-formula/v1",
        "createdAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "state": "completed",
        "developmentPeople": int(len(canonical)),
        "validHipTapeAnswers": int(valid.sum()),
        "folds": 5,
        "peopleOverlap": 0,
        "heldoutPeopleUsed": 0,
        "targetCm": HALF_INCH_CM,
        "pytorchUsed": False,
        "adamwUsed": False,
        "neuralWeightsUsed": False,
        "formulaType": "one printed intercept plus 29 named visible contributions; a separately printed formula is used at BMI 30 or above",
        "robustRule": "A training example more than 2 cm from the current formula has limited influence; repeat 12 times.",
        "crossValidation": summarize(prediction[valid] - tape_cm[valid]),
        "subgroups": {
            name: summarize(prediction[valid & mask] - tape_cm[valid & mask])
            for name, mask in subgroups.items()
        },
        "worstCases": [
            {
                "scanId": str(scan_ids[index]),
                "fold": int(fold_ids[index]),
                "bmi": round(float(bmi[index]), 4),
                "teacherTapeCm": round(float(tape_cm[index]), 6),
                "predictedTapeCm": round(float(prediction[index]), 6),
                "signedErrorCm": round(float(prediction[index] - tape_cm[index]), 6),
                "absoluteErrorCm": round(float(abs(prediction[index] - tape_cm[index])), 6),
            }
            for index in np.flatnonzero(valid)[
                np.argsort(np.abs(prediction[valid] - tape_cm[valid]))[-10:][::-1]
            ]
        ],
        "deploymentFormula": {
            "selectionRule": "Use bmi30OrAbove when BMI is 30 or above; otherwise use allOtherPeople.",
            "allOtherPeople": formula_payload(final_center, final_scale, final_coefficients),
            "bmi30OrAbove": formula_payload(high_center, high_scale, high_coefficients),
        },
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n")
    print(json.dumps({
        "crossValidation": payload["crossValidation"],
        "subgroups": payload["subgroups"],
        "heldoutPeopleUsed": 0,
    }, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
