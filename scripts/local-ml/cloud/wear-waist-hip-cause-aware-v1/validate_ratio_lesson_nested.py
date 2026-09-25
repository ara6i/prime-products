#!/usr/bin/env python3
"""Nested validation for a named silhouette-ratio correction lesson."""

from __future__ import annotations

import argparse
import json
import statistics
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np

from cross_validate import distribution, fold_result, subgroup_names
from validate_bmi_lesson_nested import correction_cm as bmi_correction_cm
from validate_bmi_lesson_nested import fit_formula as fit_bmi_formula


ROWS = ("waist", "hips")
SELECTED_NEIGHBORS = {"waist": 15, "hips": 9}
EXPECTED_PEOPLE = 3_878
RATIO_FEATURES = {
    "waist": ("waist_to_shoulder", "hip_to_waist", "height_10cm"),
    "hips": ("hip_to_shoulder", "hip_to_waist", "height_10cm"),
}
FEATURE_CENTERS = {
    "waist_to_shoulder": 0.57,
    "hip_to_shoulder": 0.74,
    "hip_to_waist": 1.31,
    "height_10cm": 0.08,
}
FEATURE_SCALES = {
    "waist_to_shoulder": 0.10,
    "hip_to_shoulder": 0.10,
    "hip_to_waist": 0.10,
    "height_10cm": 1.0,
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--library", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--query-batch-size", type=int, default=64)
    parser.add_argument("--base-recipe", default="hip_tape_cases_v5")
    return parser.parse_args()


def visible_values(feature: np.ndarray, schema: dict[str, int]) -> dict[str, float]:
    def width(row: int) -> float:
        return float(feature[schema[f"outline.row_{row:02d}.width"]])

    shoulder = max(width(row) for row in range(4, 9))
    waist = min(width(row) for row in range(10, 15))
    hip = max(width(row) for row in range(14, 19))
    height_cm = float(feature[schema["height_profile"]]) * 20.0 + 170.0
    return {
        "waist_to_shoulder": waist / max(shoulder, 1e-6),
        "hip_to_shoulder": hip / max(shoulder, 1e-6),
        "hip_to_waist": hip / max(waist, 1e-6),
        "height_10cm": (height_cm - 170.0) / 10.0,
    }


def design_row(target: str, values: dict[str, float]) -> list[float]:
    return [
        1.0,
        *[
            (values[name] - FEATURE_CENTERS[name]) / FEATURE_SCALES[name]
            for name in RATIO_FEATURES[target]
        ],
    ]


def fit_ratio_formula(
    traces: list[dict[str, Any]],
    target: str,
    bmi_by_person: dict[str, float],
    visible_by_person: dict[str, dict[str, float]],
    bmi_formula: dict[str, float],
) -> dict[str, Any]:
    selected = [trace for trace in traces if trace["target"] == target]
    design = np.asarray([
        design_row(target, visible_by_person[trace["scanId"]])
        for trace in selected
    ], dtype=np.float64)
    required_correction = np.asarray([
        trace["teacherTapeCm"]
        - trace["predictedTapeCm"]
        - bmi_correction_cm(target, bmi_by_person[trace["scanId"]], bmi_formula)
        for trace in selected
    ], dtype=np.float64)
    coefficients = np.linalg.lstsq(design, required_correction, rcond=None)[0]
    return {
        "interceptCm": float(coefficients[0]),
        "features": [
            {
                "name": name,
                "center": FEATURE_CENTERS[name],
                "scale": FEATURE_SCALES[name],
                "coefficientCm": float(coefficient),
            }
            for name, coefficient in zip(RATIO_FEATURES[target], coefficients[1:])
        ],
        "fittedExamples": len(selected),
        "clipMinimumCm": -3.0,
        "clipMaximumCm": 3.0,
    }


def ratio_correction_cm(values: dict[str, float], formula: dict[str, Any]) -> float:
    correction = float(formula["interceptCm"])
    for feature in formula["features"]:
        correction += feature["coefficientCm"] * (
            (values[feature["name"]] - feature["center"]) / feature["scale"]
        )
    return float(np.clip(correction, formula["clipMinimumCm"], formula["clipMaximumCm"]))


def aggregate_fold_errors(folds: list[dict[str, list[float]]]) -> dict[str, Any]:
    all_errors = [error for fold in folds for error in fold["all"]]
    fold_summaries = [distribution(fold["all"]) for fold in folds]
    subgroups = sorted({name for fold in folds for name in fold if name != "all"})
    return {
        **distribution(all_errors),
        "meanFoldP95Cm": round(statistics.fmean(item["p95Cm"] for item in fold_summaries), 6),
        "subgroups": {
            subgroup: {
                **distribution([error for fold in folds for error in fold.get(subgroup, [])]),
                "meanFoldP95Cm": round(statistics.fmean(
                    distribution(fold[subgroup])["p95Cm"]
                    for fold in folds if fold.get(subgroup)
                ), 6),
            }
            for subgroup in subgroups
        },
    }


def main() -> int:
    args = parse_args()
    with np.load(args.library, allow_pickle=False) as archive:
        features = archive["features"].astype(np.float32)
        feature_schema = archive["feature_schema"].tolist()
        scan_ids = archive["scan_ids"]
        view_ids = archive["view_ids"]
        fold_ids = archive["fold_ids"]
        targets = archive["targets"].astype(np.float32)
        target_masks = archive["target_masks"].astype(np.bool_)
        target_schema = archive["target_schema"].tolist()
    people = sorted(set(map(str, scan_ids)))
    if len(people) != EXPECTED_PEOPLE:
        raise RuntimeError(f"Expected {EXPECTED_PEOPLE} development people, found {len(people)}")
    feature_index = {name: index for index, name in enumerate(feature_schema)}
    canonical_index = {
        str(scan_ids[index]): int(index)
        for index in np.flatnonzero(view_ids == "canonical")
    }
    bmi_by_person = {
        scan_id: float(features[index, feature_index["bmi_profile"]]) * 8.0 + 24.0
        for scan_id, index in canonical_index.items()
    }
    visible_by_person = {
        scan_id: visible_values(features[index], feature_index)
        for scan_id, index in canonical_index.items()
    }
    subgroups_by_person = {
        scan_id: subgroup_names(features[index], feature_index)
        for scan_id, index in canonical_index.items()
    }
    people_by_fold = {
        fold: {
            str(scan_ids[index])
            for index in np.flatnonzero((fold_ids == fold) & (view_ids == "canonical"))
        }
        for fold in range(5)
    }
    outer_results = []
    baseline_errors = {target: [] for target in ROWS}
    candidate_errors = {target: [] for target in ROWS}
    all_cross_fitted_traces: list[dict[str, Any]] = []
    for outer_fold in range(5):
        inner_people = set(people) - people_by_fold[outer_fold]
        inner_traces: list[dict[str, Any]] = []
        for inner_fold in range(5):
            if inner_fold == outer_fold:
                continue
            result = fold_result(
                fold=inner_fold,
                features=features,
                feature_schema=feature_schema,
                scan_ids=scan_ids,
                view_ids=view_ids,
                fold_ids=fold_ids,
                targets=targets,
                target_masks=target_masks,
                target_schema=target_schema,
                allowed_people=inner_people,
                query_batch_size=args.query_batch_size,
                trace_limit=10_000,
                recipe=args.base_recipe,
                trace_neighbors_by_target=SELECTED_NEIGHBORS,
                neighbor_choices=(9, 15),
                neighbor_by_target_only=SELECTED_NEIGHBORS,
            )
            inner_traces.extend(result["traces"])
        bmi_formulas = {target: fit_bmi_formula(inner_traces, target, bmi_by_person) for target in ROWS}
        ratio_formulas = {
            target: fit_ratio_formula(inner_traces, target, bmi_by_person, visible_by_person, bmi_formulas[target])
            for target in ROWS
        }
        outer = fold_result(
            fold=outer_fold,
            features=features,
            feature_schema=feature_schema,
            scan_ids=scan_ids,
            view_ids=view_ids,
            fold_ids=fold_ids,
            targets=targets,
            target_masks=target_masks,
            target_schema=target_schema,
            allowed_people=set(people),
            query_batch_size=args.query_batch_size,
            trace_limit=10_000,
            recipe=args.base_recipe,
            trace_neighbors_by_target=SELECTED_NEIGHBORS,
            neighbor_choices=(9, 15),
            neighbor_by_target_only=SELECTED_NEIGHBORS,
        )
        all_cross_fitted_traces.extend(outer["traces"])
        fold_baseline = {target: {"all": []} for target in ROWS}
        fold_candidate = {target: {"all": []} for target in ROWS}
        for trace in outer["traces"]:
            target = trace["target"]
            scan_id = trace["scanId"]
            raw_error = float(trace["predictedTapeCm"] - trace["teacherTapeCm"])
            after_bmi = raw_error + bmi_correction_cm(target, bmi_by_person[scan_id], bmi_formulas[target])
            after_ratio = after_bmi + ratio_correction_cm(visible_by_person[scan_id], ratio_formulas[target])
            fold_baseline[target]["all"].append(after_bmi)
            fold_candidate[target]["all"].append(after_ratio)
            for subgroup in subgroups_by_person[scan_id]:
                fold_baseline[target].setdefault(subgroup, []).append(after_bmi)
                fold_candidate[target].setdefault(subgroup, []).append(after_ratio)
        for target in ROWS:
            baseline_errors[target].append(fold_baseline[target])
            candidate_errors[target].append(fold_candidate[target])
        outer_results.append({
            "outerFold": outer_fold,
            "formulaTrainingPeople": len(inner_people),
            "formulaValidationPeople": len(people_by_fold[outer_fold]),
            "peopleOverlap": 0,
            "heldoutPeopleUsed": 0,
            "bmiFormulas": bmi_formulas,
            "ratioFormulas": ratio_formulas,
            "baseline": {target: distribution(fold_baseline[target]["all"]) for target in ROWS},
            "candidate": {target: distribution(fold_candidate[target]["all"]) for target in ROWS},
        })
    baseline = {target: aggregate_fold_errors(baseline_errors[target]) for target in ROWS}
    candidate = {target: aggregate_fold_errors(candidate_errors[target]) for target in ROWS}
    checks = []
    for target in ROWS:
        checks.extend([
            candidate[target]["maeCm"] <= baseline[target]["maeCm"],
            candidate[target]["meanFoldP95Cm"] <= baseline[target]["meanFoldP95Cm"],
        ])
        for subgroup in baseline[target]["subgroups"]:
            checks.extend([
                candidate[target]["subgroups"][subgroup]["maeCm"] <= baseline[target]["subgroups"][subgroup]["maeCm"],
                candidate[target]["subgroups"][subgroup]["meanFoldP95Cm"] <= baseline[target]["subgroups"][subgroup]["meanFoldP95Cm"],
            ])
    deployment_bmi = {target: fit_bmi_formula(all_cross_fitted_traces, target, bmi_by_person) for target in ROWS}
    deployment_ratio = {
        target: fit_ratio_formula(all_cross_fitted_traces, target, bmi_by_person, visible_by_person, deployment_bmi[target])
        for target in ROWS
    }
    payload = {
        "schemaVersion": "wear-waist-hip-visible-ratio-nested-validation/v1",
        "createdAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "state": "passed" if all(checks) else "rejected",
        "developmentPeople": EXPECTED_PEOPLE,
        "heldoutPeopleUsed": 0,
        "pytorchUsed": False,
        "adamwUsed": False,
        "rule": "after the visible BMI correction, apply one printed correction from named silhouette width ratios and height; clip it to plus or minus 3 cm",
        "baseRecipe": args.base_recipe,
        "selectedTeacherCount": SELECTED_NEIGHBORS,
        "baseline": baseline,
        "candidate": candidate,
        "outerResults": outer_results,
        "deploymentBmiFormulas": deployment_bmi,
        "deploymentRatioFormulas": deployment_ratio,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n")
    print(json.dumps({
        "state": payload["state"],
        "heldoutPeopleUsed": 0,
        "baseline": {target: {"maeCm": baseline[target]["maeCm"], "p95Cm": baseline[target]["meanFoldP95Cm"], "withinHalfInch": baseline[target]["withinHalfInch"]} for target in ROWS},
        "candidate": {target: {"maeCm": candidate[target]["maeCm"], "p95Cm": candidate[target]["meanFoldP95Cm"], "withinHalfInch": candidate[target]["withinHalfInch"]} for target in ROWS},
        "deploymentRatioFormulas": deployment_ratio,
    }, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
