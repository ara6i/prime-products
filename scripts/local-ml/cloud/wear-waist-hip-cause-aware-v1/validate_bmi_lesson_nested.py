#!/usr/bin/env python3
"""Leakage-resistant outer-fold validation for the visible BMI lesson.

For each outer validation fold, the printed BMI formula is fitted only from
inner predictions made without the outer people.  The 448 final-test people
are never loaded.
"""

from __future__ import annotations

import argparse
import json
import statistics
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np

from cross_validate import distribution, fold_result, subgroup_names


ROWS = ("waist", "hips")
SELECTED_NEIGHBORS = {"waist": 15, "hips": 9}
EXPECTED_PEOPLE = 3_878


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--library", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--query-batch-size", type=int, default=64)
    return parser.parse_args()


def fit_formula(traces: list[dict[str, Any]], target: str, bmi_by_person: dict[str, float]) -> dict[str, float]:
    selected = [trace for trace in traces if trace["target"] == target]
    x = np.asarray([bmi_by_person[trace["scanId"]] - 24.0 for trace in selected], dtype=np.float64)
    y = np.asarray([trace["teacherTapeCm"] - trace["predictedTapeCm"] for trace in selected], dtype=np.float64)
    if target == "waist":
        keep = x + 24.0 >= 20.0
        x, y = x[keep], y[keep]
    design = np.column_stack((np.ones(len(x), dtype=np.float64), x))
    intercept, slope = np.linalg.lstsq(design, y, rcond=None)[0]
    return {
        "interceptCm": float(intercept),
        "slopeCmPerBmiPoint": float(slope),
        "fittedExamples": int(len(x)),
        "clipMinimumCm": -3.0,
        "clipMaximumCm": 3.0,
    }


def correction_cm(target: str, bmi: float, formula: dict[str, float]) -> float:
    if target == "waist" and bmi < 20.0:
        return 0.0
    raw = formula["interceptCm"] + formula["slopeCmPerBmiPoint"] * (bmi - 24.0)
    return float(np.clip(raw, formula["clipMinimumCm"], formula["clipMaximumCm"]))


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
                recipe="hip_tape_cases_v5",
                trace_neighbors_by_target=SELECTED_NEIGHBORS,
                neighbor_choices=(9, 15),
                neighbor_by_target_only=SELECTED_NEIGHBORS,
            )
            inner_traces.extend(result["traces"])
        formulas = {
            target: fit_formula(inner_traces, target, bmi_by_person)
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
            recipe="hip_tape_cases_v5",
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
            base_error = float(trace["predictedTapeCm"] - trace["teacherTapeCm"])
            corrected_error = base_error + correction_cm(target, bmi_by_person[scan_id], formulas[target])
            fold_baseline[target]["all"].append(base_error)
            fold_candidate[target]["all"].append(corrected_error)
            for subgroup in subgroups_by_person[scan_id]:
                fold_baseline[target].setdefault(subgroup, []).append(base_error)
                fold_candidate[target].setdefault(subgroup, []).append(corrected_error)
        for target in ROWS:
            baseline_errors[target].append(fold_baseline[target])
            candidate_errors[target].append(fold_candidate[target])
        outer_results.append({
            "outerFold": outer_fold,
            "formulaTrainingPeople": len(inner_people),
            "formulaValidationPeople": len(people_by_fold[outer_fold]),
            "peopleOverlap": 0,
            "heldoutPeopleUsed": 0,
            "formulas": formulas,
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
    deployment_formulas = {
        target: fit_formula(all_cross_fitted_traces, target, bmi_by_person)
        for target in ROWS
    }
    payload = {
        "schemaVersion": "wear-waist-hip-visible-bmi-nested-validation/v1",
        "createdAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "state": "passed" if all(checks) else "rejected",
        "developmentPeople": EXPECTED_PEOPLE,
        "heldoutPeopleUsed": 0,
        "pytorchUsed": False,
        "adamwUsed": False,
        "rule": "fit a printed BMI correction on inner people; validate it on a separate outer fold; waist correction is zero below BMI 20; clip corrections to plus or minus 3 cm",
        "selectedTeacherCount": SELECTED_NEIGHBORS,
        "baseline": baseline,
        "candidate": candidate,
        "outerResults": outer_results,
        "deploymentFormulasFromAllCrossFittedDevelopmentPredictions": deployment_formulas,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n")
    print(json.dumps({
        "state": payload["state"],
        "heldoutPeopleUsed": 0,
        "baseline": {target: {"maeCm": baseline[target]["maeCm"], "meanFoldP95Cm": baseline[target]["meanFoldP95Cm"]} for target in ROWS},
        "candidate": {target: {"maeCm": candidate[target]["maeCm"], "meanFoldP95Cm": candidate[target]["meanFoldP95Cm"]} for target in ROWS},
        "deploymentFormulas": deployment_formulas,
    }, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
