#!/usr/bin/env python3
"""Train and validate a transparent, named-component waist lesson.

The customer side uses only profile values and measurements taken from the
front silhouette boundary.  The boundary can be triangulated for the 2D
Blender display, but triangle topology is not treated as extra body evidence.
The WEAR PLY supplies teacher-only body line, breadth, depth and ring values.

There is no neural network, random initialization, gradient training, PyTorch
or AdamW.  Every prediction is rebuilt from printed component formulas:

  ellipse(A-B width, depth) + shape correction + tape-protocol correction
"""

from __future__ import annotations

import argparse
import json
import math
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np


HALF_INCH_CM = 1.27
HUBER_LIMIT_CM = 1.5
HUBER_ROUNDS = 12
RIDGE_PENALTY = 10.0
OUTLINE_FRACTIONS = np.linspace(0.08, 0.92, 32)
COMPONENTS = ("widthCm", "depthCm", "shapeCorrectionCm", "tapeProtocolCorrectionCm")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--library", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--width-huber-cm", type=float, default=HUBER_LIMIT_CM)
    parser.add_argument("--named-depth-clues", action="store_true")
    parser.add_argument("--depth-ridge", type=float, default=RIDGE_PENALTY)
    parser.add_argument("--waist-line-snap-window", type=float, default=0.0)
    parser.add_argument("--tape-teacher-max-conflict-cm", type=float, default=7.0)
    parser.add_argument("--tape-uses-predicted-geometry", action="store_true")
    parser.add_argument("--tape-targets-final-residual", action="store_true")
    parser.add_argument("--train-all-camera-views", action="store_true")
    return parser.parse_args()


def ellipse_perimeter(width_cm: np.ndarray, depth_cm: np.ndarray) -> np.ndarray:
    """Ramanujan's visible ellipse approximation, applied element by element."""
    width = np.maximum(np.asarray(width_cm, dtype=np.float64), 1e-6)
    depth = np.maximum(np.asarray(depth_cm, dtype=np.float64), 1e-6)
    a = width / 2.0
    b = depth / 2.0
    h = ((a - b) / np.maximum(a + b, 1e-6)) ** 2
    return math.pi * (a + b) * (1.0 + 3.0 * h / (10.0 + np.sqrt(np.maximum(4.0 - 3.0 * h, 1e-6))))


def base_visible_inputs(features: np.ndarray, names: list[str]) -> tuple[np.ndarray, list[str]]:
    schema = {name: index for index, name in enumerate(names)}
    height_cm = features[:, schema["height_profile"]] * 20.0 + 170.0
    weight_kg = features[:, schema["weight_profile"]] * 25.0 + 70.0
    bmi = features[:, schema["bmi_profile"]] * 8.0 + 24.0
    values = [
        height_cm,
        weight_kg,
        bmi,
        features[:, schema["female"]],
        features[:, schema["male"]],
    ]
    input_names = ["height cm", "weight kg", "BMI", "female indicator", "male indicator"]
    for name in (
        "silhouette.area_fraction",
        "silhouette.bbox_top",
        "silhouette.bbox_bottom",
        "silhouette.bbox_left",
        "silhouette.bbox_right",
        "silhouette.centroid_x",
        "silhouette.centroid_y",
        "silhouette.bbox_fill_fraction",
    ):
        values.append(features[:, schema[name]])
        input_names.append(name)
    for row in range(32):
        values.append(features[:, schema[f"outline.row_{row:02d}.width"]])
        input_names.append(f"2D boundary row {row:02d} A-to-B width divided by image width")
    for band in range(8):
        values.append(features[:, schema[f"silhouette.band_{band:02d}.area_fraction"]])
        input_names.append(f"2D boundary band {band:02d} filled area")
    return np.column_stack(values), input_names


def fit_formula(
    inputs: np.ndarray,
    answers: np.ndarray,
    *,
    huber_limit: float = HUBER_LIMIT_CM,
    ridge_penalty: float = RIDGE_PENALTY,
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    center = inputs.mean(axis=0)
    scale = inputs.std(axis=0)
    scale[scale < 1e-6] = 1.0
    design = np.column_stack((np.ones(len(inputs)), (inputs - center) / scale))
    penalty = np.eye(design.shape[1], dtype=np.float64) * ridge_penalty
    penalty[0, 0] = 0.0
    coefficients = np.linalg.solve(design.T @ design + penalty, design.T @ answers)
    for _ in range(HUBER_ROUNDS):
        residual = answers - design @ coefficients
        importance = np.minimum(1.0, huber_limit / np.maximum(np.abs(residual), 1e-8))
        coefficients = np.linalg.solve(
            design.T @ (design * importance[:, None]) + penalty,
            design.T @ (answers * importance),
        )
    return center, scale, coefficients


def apply_formula(inputs: np.ndarray, formula: tuple[np.ndarray, np.ndarray, np.ndarray]) -> np.ndarray:
    center, scale, coefficients = formula
    design = np.column_stack((np.ones(len(inputs)), (inputs - center) / scale))
    return design @ coefficients


def snap_waist_line_to_visible_narrow_row(
    predicted_y_norm: np.ndarray,
    features: np.ndarray,
    names: list[str],
    window: float,
) -> np.ndarray:
    """Move the predicted waist line to the narrowest visible row in a named local window."""
    if window <= 0:
        return predicted_y_norm
    schema = {name: index for index, name in enumerate(names)}
    top = features[:, schema["silhouette.bbox_top"]]
    bottom = features[:, schema["silhouette.bbox_bottom"]]
    predicted_fraction = np.clip(
        (predicted_y_norm - top) / np.maximum(bottom - top, 1e-6),
        OUTLINE_FRACTIONS[0],
        OUTLINE_FRACTIONS[-1],
    )
    widths = np.column_stack([
        features[:, schema[f"outline.row_{row:02d}.width"]]
        for row in range(32)
    ])
    snapped_fraction = np.empty(len(features), dtype=np.float64)
    for index, expected in enumerate(predicted_fraction):
        candidates = np.flatnonzero(np.abs(OUTLINE_FRACTIONS - expected) <= window)
        if not len(candidates):
            candidates = np.asarray([int(np.argmin(np.abs(OUTLINE_FRACTIONS - expected)))])
        snapped_fraction[index] = OUTLINE_FRACTIONS[candidates[np.argmin(widths[index, candidates])]]
    return top + snapped_fraction * (bottom - top)


def semantic_inputs(
    base: np.ndarray,
    predicted_y_norm: np.ndarray,
    features: np.ndarray,
    names: list[str],
    *,
    include_named_depth_clues: bool = False,
) -> tuple[np.ndarray, list[str]]:
    schema = {name: index for index, name in enumerate(names)}
    height_cm = features[:, schema["height_profile"]] * 20.0 + 170.0
    top = features[:, schema["silhouette.bbox_top"]]
    bottom = features[:, schema["silhouette.bbox_bottom"]]
    body_fraction = np.clip(
        (predicted_y_norm - top) / np.maximum(bottom - top, 1e-6),
        OUTLINE_FRACTIONS[0],
        OUTLINE_FRACTIONS[-1],
    )
    widths = np.column_stack([
        features[:, schema[f"outline.row_{row:02d}.width"]]
        for row in range(32)
    ])
    visible_width_cm = np.asarray([
        np.interp(fraction, OUTLINE_FRACTIONS, widths[index]) * height_cm[index]
        for index, fraction in enumerate(body_fraction)
    ])
    visible_slope_cm = np.asarray([
        (
            np.interp(min(OUTLINE_FRACTIONS[-1], fraction + 0.027), OUTLINE_FRACTIONS, widths[index])
            - np.interp(max(OUTLINE_FRACTIONS[0], fraction - 0.027), OUTLINE_FRACTIONS, widths[index])
        ) * height_cm[index]
        for index, fraction in enumerate(body_fraction)
    ])
    values = [base, predicted_y_norm, body_fraction, visible_width_cm, visible_slope_cm]
    semantic_names = [
            "predicted waist line y in image",
            "predicted waist line as visible body fraction",
            "2D mesh A-to-B width at predicted waist line cm",
            "2D mesh A-to-B width change around predicted waist line cm",
    ]
    if include_named_depth_clues:
        weight_kg = features[:, schema["weight_profile"]] * 25.0 + 70.0
        area = features[:, schema["silhouette.area_fraction"]]
        height_m = height_cm / 100.0
        shoulder_width_cm = widths[:, 4:10].max(axis=1) * height_cm
        chest_width_cm = widths[:, 7:13].max(axis=1) * height_cm
        waist_width_cm = widths[:, 9:16].min(axis=1) * height_cm
        hip_width_cm = widths[:, 13:20].max(axis=1) * height_cm
        values.extend([
            weight_kg / np.maximum(area * height_m * height_m, 1e-6),
            shoulder_width_cm,
            chest_width_cm,
            waist_width_cm,
            hip_width_cm,
            visible_width_cm / np.maximum(shoulder_width_cm, 1e-6),
            visible_width_cm / np.maximum(hip_width_cm, 1e-6),
            waist_width_cm / np.maximum(shoulder_width_cm, 1e-6),
            hip_width_cm / np.maximum(shoulder_width_cm, 1e-6),
            hip_width_cm / np.maximum(waist_width_cm, 1e-6),
        ])
        semantic_names.extend([
            "mass divided by front silhouette area and height squared (depth clue)",
            "visible shoulder A-to-B width cm",
            "visible chest A-to-B width cm",
            "visible narrow waist A-to-B width cm",
            "visible hip A-to-B width cm",
            "predicted waist-line width divided by shoulder width",
            "predicted waist-line width divided by hip width",
            "visible waist-to-shoulder width ratio",
            "visible hip-to-shoulder width ratio",
            "visible hip-to-waist width ratio",
        ])
    return np.column_stack(values), semantic_names


def tape_geometry_inputs(
    semantic: np.ndarray,
    semantic_names: list[str],
    width_cm: np.ndarray,
    depth_cm: np.ndarray,
    shape_correction_cm: np.ndarray,
) -> tuple[np.ndarray, list[str]]:
    """Add the student's own named geometry to the tape-protocol lesson."""
    ring_cm = ellipse_perimeter(width_cm, depth_cm) + shape_correction_cm
    return (
        np.column_stack((
            semantic,
            width_cm,
            depth_cm,
            shape_correction_cm,
            ring_cm,
            depth_cm / np.maximum(width_cm, 1e-6),
        )),
        [
            *semantic_names,
            "student predicted waist A-to-B width cm",
            "student predicted waist front-to-back depth cm",
            "student predicted non-ellipse shape correction cm",
            "student reconstructed waist ring cm",
            "student predicted depth divided by A-to-B width",
        ],
    )


def metrics(errors: np.ndarray) -> dict[str, float | int]:
    signed = np.asarray(errors, dtype=np.float64)
    absolute = np.abs(signed)
    return {
        "count": int(len(absolute)),
        "maeCm": round(float(absolute.mean()), 6),
        "medianCm": round(float(np.quantile(absolute, 0.5)), 6),
        "p95Cm": round(float(np.quantile(absolute, 0.95)), 6),
        "worstCm": round(float(absolute.max()), 6),
        "signedBiasCm": round(float(signed.mean()), 6),
        "withinHalfInchPercent": round(float(np.mean(absolute <= HALF_INCH_CM) * 100.0), 4),
    }


def pixel_metrics(errors: np.ndarray) -> dict[str, float | int]:
    signed = np.asarray(errors, dtype=np.float64)
    absolute = np.abs(signed)
    return {
        "count": int(len(absolute)),
        "maePixels": round(float(absolute.mean()), 6),
        "medianPixels": round(float(np.quantile(absolute, 0.5)), 6),
        "p95Pixels": round(float(np.quantile(absolute, 0.95)), 6),
        "worstPixels": round(float(absolute.max()), 6),
        "signedBiasPixels": round(float(signed.mean()), 6),
        "withinOnePixelPercent": round(float(np.mean(absolute <= 1.0) * 100.0), 4),
    }


def fold_error_metrics(
    predicted: np.ndarray,
    truth: np.ndarray,
    applicable: np.ndarray,
    fold_ids: np.ndarray,
) -> dict[str, Any]:
    per_fold = {
        str(fold): metrics(predicted[applicable & (fold_ids == fold)] - truth[applicable & (fold_ids == fold)])
        for fold in range(5)
    }
    return {
        "allPeopleTogether": metrics(predicted[applicable] - truth[applicable]),
        "meanFoldP95Cm": round(float(np.mean([item["p95Cm"] for item in per_fold.values()])), 6),
        "perFold": per_fold,
    }


def formula_payload(
    formula: tuple[np.ndarray, np.ndarray, np.ndarray],
    input_names: list[str],
) -> dict[str, Any]:
    center, scale, coefficients = formula
    return {
        "intercept": round(float(coefficients[0]), 10),
        "calculation": "intercept + sum(((input - center) / scale) * coefficient)",
        "terms": [
            {
                "input": name,
                "center": round(float(item_center), 10),
                "scale": round(float(item_scale), 10),
                "coefficient": round(float(coefficient), 10),
            }
            for name, item_center, item_scale, coefficient in zip(
                input_names,
                center,
                scale,
                coefficients[1:],
            )
        ],
    }


def subgroup_masks(features: np.ndarray, names: list[str]) -> dict[str, np.ndarray]:
    schema = {name: index for index, name in enumerate(names)}
    bmi = features[:, schema["bmi_profile"]] * 8.0 + 24.0
    female = features[:, schema["female"]] > 0.5
    return {
        "gender:female": female,
        "gender:male": ~female,
        "bmi:below_20": bmi < 20.0,
        "bmi:20_to_24_99": (bmi >= 20.0) & (bmi < 25.0),
        "bmi:25_to_29_99": (bmi >= 25.0) & (bmi < 30.0),
        "bmi:30_or_above": bmi >= 30.0,
    }


def main() -> int:
    args = parse_args()
    if args.tape_targets_final_residual and not args.tape_uses_predicted_geometry:
        raise ValueError("--tape-targets-final-residual requires --tape-uses-predicted-geometry")
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
    if len(canonical) != 3_878 or len(set(scan_ids[canonical].tolist())) != 3_878:
        raise RuntimeError("Expected exactly 3,878 separate development people")
    selected = np.arange(len(view_ids)) if args.train_all_camera_views else canonical
    features = features[selected]
    targets = targets[selected]
    target_masks = target_masks[selected]
    view_ids = view_ids[selected]
    fold_ids = fold_ids[selected]
    scan_ids = scan_ids[selected]
    evaluation_rows = view_ids == "canonical"

    feature_schema = {name: index for index, name in enumerate(feature_names)}
    target_schema = {name: index for index, name in enumerate(target_names)}
    base, base_names = base_visible_inputs(features, feature_names)
    female = features[:, feature_schema["female"]] > 0.5
    bmi = features[:, feature_schema["bmi_profile"]] * 8.0 + 24.0
    # The first gender-only lesson improved average error but made the low-BMI
    # tail worse.  The visible guard below shares one low-BMI rule across both
    # genders, then uses separate male/female rules at BMI 20 or above.
    formula_group = np.where(bmi < 20.0, 0, np.where(female, 2, 1)).astype(np.uint8)
    group_labels = {0: "bmi_below_20", 1: "male_bmi_20_or_above", 2: "female_bmi_20_or_above"}

    y_true = targets[:, target_schema["waist.y_norm"]]
    width_true = targets[:, target_schema["waist.width_cm"]]
    depth_true = targets[:, target_schema["waist.depth_cm"]]
    ring_true = targets[:, target_schema["waist.ring_cm"]]
    tape_true = targets[:, target_schema["waist.final_tape_cm"]]
    geometry_valid = target_masks[:, target_schema["waist.ring_cm"]]
    tape_valid = target_masks[:, target_schema["waist.final_tape_cm"]]
    shape_correction_true = ring_true - ellipse_perimeter(width_true, depth_true)
    tape_correction_true = tape_true - ring_true
    consistent_tape_teacher = tape_valid & (np.abs(tape_correction_true) <= args.tape_teacher_max_conflict_cm)
    component_truth = {
        "widthCm": width_true,
        "depthCm": depth_true,
        "shapeCorrectionCm": shape_correction_true,
        "tapeProtocolCorrectionCm": tape_correction_true,
    }

    predictions = {name: np.full(len(features), np.nan) for name in ("bodyLineY", *COMPONENTS)}
    fold_reports: list[dict[str, Any]] = []
    for outer_fold in range(5):
        fold_report: dict[str, Any] = {
            "fold": outer_fold,
            "trainingPeople": len(set(scan_ids[fold_ids != outer_fold].tolist())),
            "trainingViews": int(np.sum(fold_ids != outer_fold)),
            "validationPeople": int(np.sum(fold_ids == outer_fold)),
            "peopleOverlap": 0,
            "groups": {},
        }
        for group, label in group_labels.items():
            outer_train = (fold_ids != outer_fold) & (formula_group == group)
            validation = (fold_ids == outer_fold) & (formula_group == group) & evaluation_rows
            geometry_train = outer_train & geometry_valid
            tape_train = outer_train & consistent_tape_teacher

            # The outer training people receive cross-fitted body-line answers.
            # This stops a component rule from seeing a teacher line as an input.
            y_for_semantic_input = np.full(len(features), np.nan)
            for inner_fold in range(5):
                if inner_fold == outer_fold:
                    continue
                inner_train = geometry_train & (fold_ids != inner_fold)
                inner_apply = outer_train & (fold_ids == inner_fold)
                y_formula = fit_formula(base[inner_train], y_true[inner_train])
                y_for_semantic_input[inner_apply] = apply_formula(base[inner_apply], y_formula)
            y_formula = fit_formula(base[geometry_train], y_true[geometry_train])
            y_for_semantic_input[validation] = apply_formula(base[validation], y_formula)
            y_for_semantic_input[outer_train | validation] = snap_waist_line_to_visible_narrow_row(
                y_for_semantic_input[outer_train | validation],
                features[outer_train | validation],
                feature_names,
                args.waist_line_snap_window,
            )
            predictions["bodyLineY"][validation] = y_for_semantic_input[validation]
            semantic, semantic_names = semantic_inputs(
                base,
                y_for_semantic_input,
                features,
                feature_names,
            )
            depth_semantic, depth_semantic_names = semantic_inputs(
                base,
                y_for_semantic_input,
                features,
                feature_names,
                include_named_depth_clues=args.named_depth_clues,
            )

            for component in COMPONENTS:
                if component == "tapeProtocolCorrectionCm" and args.tape_uses_predicted_geometry:
                    continue
                component_train = tape_train if component == "tapeProtocolCorrectionCm" else geometry_train
                component_inputs = depth_semantic if component == "depthCm" else semantic
                formula = fit_formula(
                    component_inputs[component_train],
                    component_truth[component][component_train],
                    huber_limit=args.width_huber_cm if component == "widthCm" else HUBER_LIMIT_CM,
                    ridge_penalty=args.depth_ridge if component == "depthCm" else RIDGE_PENALTY,
                )
                predictions[component][validation] = apply_formula(component_inputs[validation], formula)
            if args.tape_uses_predicted_geometry:
                cross_fitted = {
                    component: np.full(len(features), np.nan)
                    for component in ("widthCm", "depthCm", "shapeCorrectionCm")
                }
                for inner_fold in range(5):
                    if inner_fold == outer_fold:
                        continue
                    inner_train = geometry_train & (fold_ids != inner_fold)
                    inner_apply = outer_train & (fold_ids == inner_fold)
                    for component in cross_fitted:
                        component_inputs = depth_semantic if component == "depthCm" else semantic
                        formula = fit_formula(
                            component_inputs[inner_train],
                            component_truth[component][inner_train],
                            huber_limit=args.width_huber_cm if component == "widthCm" else HUBER_LIMIT_CM,
                            ridge_penalty=args.depth_ridge if component == "depthCm" else RIDGE_PENALTY,
                        )
                        cross_fitted[component][inner_apply] = apply_formula(component_inputs[inner_apply], formula)
                tape_train_inputs, tape_input_names = tape_geometry_inputs(
                    semantic[tape_train],
                    [*base_names, *semantic_names],
                    cross_fitted["widthCm"][tape_train],
                    cross_fitted["depthCm"][tape_train],
                    cross_fitted["shapeCorrectionCm"][tape_train],
                )
                tape_validation_inputs, _ = tape_geometry_inputs(
                    semantic[validation],
                    [*base_names, *semantic_names],
                    predictions["widthCm"][validation],
                    predictions["depthCm"][validation],
                    predictions["shapeCorrectionCm"][validation],
                )
                cross_fitted_ring = ellipse_perimeter(
                    cross_fitted["widthCm"][tape_train],
                    cross_fitted["depthCm"][tape_train],
                ) + cross_fitted["shapeCorrectionCm"][tape_train]
                tape_lesson_target = (
                    tape_true[tape_train] - cross_fitted_ring
                    if args.tape_targets_final_residual
                    else tape_correction_true[tape_train]
                )
                tape_formula = fit_formula(tape_train_inputs, tape_lesson_target)
                predictions["tapeProtocolCorrectionCm"][validation] = apply_formula(
                    tape_validation_inputs,
                    tape_formula,
                )
            fold_report["groups"][label] = {
                "trainingGeometryTeachers": int(geometry_train.sum()),
                "trainingTapeTeachers": int(tape_train.sum()),
                "validationPeople": int(validation.sum()),
            }
        fold_reports.append(fold_report)

    predicted_ring = ellipse_perimeter(predictions["widthCm"], predictions["depthCm"]) + predictions["shapeCorrectionCm"]
    predicted_tape = predicted_ring + predictions["tapeProtocolCorrectionCm"]
    geometry_evaluation = geometry_valid & evaluation_rows
    tape_evaluation = tape_valid & evaluation_rows
    final_errors = predicted_tape[tape_evaluation] - tape_true[tape_evaluation]
    subgroup = subgroup_masks(features, feature_names)

    cause_counts: Counter[str] = Counter()
    error_removed = {name: [] for name in COMPONENTS}
    validation_cases: list[dict[str, Any]] = []
    valid_indices = np.flatnonzero(tape_evaluation)
    for index in valid_indices:
        original = abs(predicted_tape[index] - tape_true[index])
        replacements = {
            "widthCm": ellipse_perimeter(np.asarray([width_true[index]]), np.asarray([predictions["depthCm"][index]]))[0]
            + predictions["shapeCorrectionCm"][index] + predictions["tapeProtocolCorrectionCm"][index],
            "depthCm": ellipse_perimeter(np.asarray([predictions["widthCm"][index]]), np.asarray([depth_true[index]]))[0]
            + predictions["shapeCorrectionCm"][index] + predictions["tapeProtocolCorrectionCm"][index],
            "shapeCorrectionCm": ellipse_perimeter(
                np.asarray([predictions["widthCm"][index]]), np.asarray([predictions["depthCm"][index]])
            )[0] + shape_correction_true[index] + predictions["tapeProtocolCorrectionCm"][index],
            "tapeProtocolCorrectionCm": predicted_ring[index] + tape_correction_true[index],
        }
        removed = {
            name: original - abs(replacement - tape_true[index])
            for name, replacement in replacements.items()
        }
        for name, value in removed.items():
            error_removed[name].append(value)
        best_name = max(removed, key=removed.get)
        main_cause = best_name if removed[best_name] > 0 else "combined_or_unexplained"
        cause_counts[main_cause] += 1
        validation_cases.append({
            "scanId": str(scan_ids[index]),
            "fold": int(fold_ids[index]),
            "formulaGroup": group_labels[int(formula_group[index])],
            "teacherTapeCm": round(float(tape_true[index]), 6),
            "predictedTapeCm": round(float(predicted_tape[index]), 6),
            "signedTapeErrorCm": round(float(predicted_tape[index] - tape_true[index]), 6),
            "mainCause": main_cause,
            "errorRemovedByTeacherSubstitutionCm": {
                name: round(float(value), 6) for name, value in removed.items()
            },
            "namedComponents": {
                "bodyLine": {
                    "predictedYNorm": round(float(predictions["bodyLineY"][index]), 8),
                    "teacherYNorm": round(float(y_true[index]), 8),
                    "signedErrorPixels": round(float((predictions["bodyLineY"][index] - y_true[index]) * 128.0), 6),
                },
                "aToBWidthCm": {
                    "predicted": round(float(predictions["widthCm"][index]), 6),
                    "teacher": round(float(width_true[index]), 6),
                },
                "frontToBackDepthCm": {
                    "predicted": round(float(predictions["depthCm"][index]), 6),
                    "teacher": round(float(depth_true[index]), 6),
                },
                "shapeCorrectionCm": {
                    "predicted": round(float(predictions["shapeCorrectionCm"][index]), 6),
                    "teacher": round(float(shape_correction_true[index]), 6),
                },
                "tapeProtocolCorrectionCm": {
                    "predicted": round(float(predictions["tapeProtocolCorrectionCm"][index]), 6),
                    "teacher": round(float(tape_correction_true[index]), 6),
                },
                "reconstructedRingCm": {
                    "predicted": round(float(predicted_ring[index]), 6),
                    "teacher": round(float(ring_true[index]), 6),
                },
            },
        })

    component_metrics = {
        "bodyLinePixels": pixel_metrics(
            (predictions["bodyLineY"][geometry_evaluation] - y_true[geometry_evaluation]) * 128.0
        ),
        "aToBWidthCm": metrics(predictions["widthCm"][geometry_evaluation] - width_true[geometry_evaluation]),
        "frontToBackDepthCm": metrics(predictions["depthCm"][geometry_evaluation] - depth_true[geometry_evaluation]),
        "shapeCorrectionCm": metrics(
            predictions["shapeCorrectionCm"][geometry_evaluation] - shape_correction_true[geometry_evaluation]
        ),
        "tapeProtocolCorrectionCm": metrics(
            predictions["tapeProtocolCorrectionCm"][tape_evaluation] - tape_correction_true[tape_evaluation]
        ),
        "reconstructedRingCm": metrics(predicted_ring[geometry_evaluation] - ring_true[geometry_evaluation]),
    }

    deployment_formulas: dict[str, Any] = {}
    for group, label in group_labels.items():
        group_mask = formula_group == group
        geometry_group = group_mask & geometry_valid
        tape_group = group_mask & consistent_tape_teacher
        y_formula = fit_formula(base[geometry_group], y_true[geometry_group])
        y_prediction = apply_formula(base, y_formula)
        y_prediction = snap_waist_line_to_visible_narrow_row(
            y_prediction,
            features,
            feature_names,
            args.waist_line_snap_window,
        )
        semantic, semantic_names = semantic_inputs(
            base,
            y_prediction,
            features,
            feature_names,
        )
        depth_semantic, depth_semantic_names = semantic_inputs(
            base,
            y_prediction,
            features,
            feature_names,
            include_named_depth_clues=args.named_depth_clues,
        )
        component_payloads: dict[str, Any] = {}
        component_deployment_predictions: dict[str, np.ndarray] = {}
        for component in ("widthCm", "depthCm", "shapeCorrectionCm"):
            component_inputs = depth_semantic if component == "depthCm" else semantic
            component_formula = fit_formula(
                component_inputs[geometry_group],
                component_truth[component][geometry_group],
                huber_limit=args.width_huber_cm if component == "widthCm" else HUBER_LIMIT_CM,
                ridge_penalty=args.depth_ridge if component == "depthCm" else RIDGE_PENALTY,
            )
            component_payloads[component] = formula_payload(
                component_formula,
                [*base_names, *(depth_semantic_names if component == "depthCm" else semantic_names)],
            )
            component_deployment_predictions[component] = apply_formula(component_inputs, component_formula)
        if args.tape_uses_predicted_geometry:
            tape_inputs, tape_names = tape_geometry_inputs(
                semantic,
                [*base_names, *semantic_names],
                component_deployment_predictions["widthCm"],
                component_deployment_predictions["depthCm"],
                component_deployment_predictions["shapeCorrectionCm"],
            )
            deployment_ring = ellipse_perimeter(
                component_deployment_predictions["widthCm"],
                component_deployment_predictions["depthCm"],
            ) + component_deployment_predictions["shapeCorrectionCm"]
            tape_target = tape_true - deployment_ring if args.tape_targets_final_residual else tape_correction_true
            tape_formula = fit_formula(tape_inputs[tape_group], tape_target[tape_group])
            component_payloads["tapeProtocolCorrectionCm"] = formula_payload(tape_formula, tape_names)
        else:
            tape_formula = fit_formula(semantic[tape_group], tape_correction_true[tape_group])
            component_payloads["tapeProtocolCorrectionCm"] = formula_payload(
                tape_formula,
                [*base_names, *semantic_names],
            )
        deployment_formulas[label] = {
            "bodyLineY": formula_payload(y_formula, base_names),
            "components": component_payloads,
        }

    worst_order = valid_indices[
        np.argsort(np.abs(predicted_tape[tape_evaluation] - tape_true[tape_evaluation]))[-12:][::-1]
    ]
    payload = {
        "schemaVersion": "wear-named-waist-mesh-components/v1",
        "createdAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "state": "completed",
        "lesson": 20,
        "trainer": "Codex/OpenAI selected the named cause lesson; deterministic code calculated and validated it",
        "developmentPeople": 3_878,
        "trainingViews": int(len(features)),
        "developmentGeometryTeachers": int(geometry_evaluation.sum()),
        "developmentTapeTeachers": int((consistent_tape_teacher & evaluation_rows).sum()),
        "validationTapeAnswers": int(tape_evaluation.sum()),
        "folds": 5,
        "peopleOverlap": 0,
        "heldoutPeopleUsed": 0,
        "targetCm": HALF_INCH_CM,
        "pytorchUsed": False,
        "adamwUsed": False,
        "gradientTrainingUsed": False,
        "neuralWeightsUsed": False,
        "randomFirstAnswerUsed": False,
        "customerInputs": [
            "front silhouette",
            "silhouette-derived 2D boundary mesh measurements",
            "height",
            "weight",
            "BMI",
            "gender",
        ],
        "teacherOnlyInputs": [
            "real WEAR PLY waist body line",
            "real WEAR PLY A-to-B breadth",
            "real WEAR PLY front-to-back depth",
            "real WEAR PLY closed ring",
            "audited WEAR waist tape",
        ],
        "twoDimensionalMeshTruth": (
            "The current customer descriptor measures the boundary of the same silhouette that the Blender 2D display triangulates. "
            "The triangles make the boundary visible but add no depth or circumference evidence. Full customer RGB-to-body topology is not present in this training archive."
        ),
        "answerPath": "predict waist line -> read 2D A-to-B around that line -> predict named breadth and depth -> ellipse ring -> add shape correction -> add audited tape-protocol correction",
        "formulaRule": {
            "selection": "below BMI 20 use the shared low-BMI formula; otherwise use the separately printed female or male formula",
            "robustTeacherLimitCm": HUBER_LIMIT_CM,
            "aToBWidthTeacherLimitCm": args.width_huber_cm,
            "namedDepthCluesUsed": args.named_depth_clues,
            "depthRidgePenalty": args.depth_ridge,
            "waistLineSnapWindowBodyFraction": args.waist_line_snap_window,
            "maximumAbsoluteTapeMinusRingForTrainingCm": args.tape_teacher_max_conflict_cm,
            "tapeCorrectionUsesPredictedNamedGeometry": args.tape_uses_predicted_geometry,
            "tapeLessonTargetsFinalResidual": args.tape_targets_final_residual,
            "allNineCameraViewsUsedForTraining": args.train_all_camera_views,
            "robustRounds": HUBER_ROUNDS,
            "ridgePenalty": RIDGE_PENALTY,
            "explanation": "Large teacher disagreements have limited influence. Coefficients are printed below and are never hidden.",
        },
        "fiveFoldValidation": {
            "finalWaistTapeError": fold_error_metrics(predicted_tape, tape_true, tape_evaluation, fold_ids),
            "componentErrors": component_metrics,
            "subgroups": {
                name: fold_error_metrics(predicted_tape, tape_true, tape_evaluation & mask, fold_ids)
                for name, mask in subgroup.items()
            },
            "mainCauseCounts": dict(sorted(cause_counts.items())),
            "meanErrorRemovedWhenTeacherComponentIsSubstitutedCm": {
                name: round(float(np.mean(values)), 6)
                for name, values in error_removed.items()
            },
        },
        "previousAcceptedWaist": {
            "maeCm": 3.195429,
            "meanFoldP95Cm": 8.169701,
            "withinHalfInchPercent": 26.5134,
        },
        "unchangedAcceptedHip": {
            "maeCm": 1.654088,
            "p95Cm": 4.22197,
            "withinHalfInchPercent": 48.9904,
        },
        "foldReports": fold_reports,
        "validationCases": validation_cases,
        "worstCases": [
            {
                "scanId": str(scan_ids[index]),
                "fold": int(fold_ids[index]),
                "teacherTapeCm": round(float(tape_true[index]), 6),
                "predictedTapeCm": round(float(predicted_tape[index]), 6),
                "signedErrorCm": round(float(predicted_tape[index] - tape_true[index]), 6),
                "absoluteErrorCm": round(float(abs(predicted_tape[index] - tape_true[index])), 6),
            }
            for index in worst_order
        ],
        "deploymentFormulas": deployment_formulas,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n")
    print(json.dumps({
        "state": payload["state"],
        "developmentPeople": payload["developmentPeople"],
        "heldoutPeopleUsed": 0,
        "finalWaistTapeError": payload["fiveFoldValidation"]["finalWaistTapeError"],
        "componentErrors": component_metrics,
        "mainCauseCounts": payload["fiveFoldValidation"]["mainCauseCounts"],
    }, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
