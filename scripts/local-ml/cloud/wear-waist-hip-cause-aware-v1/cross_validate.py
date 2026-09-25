#!/usr/bin/env python3
"""Person-level validation for the transparent waist/hip case model.

The model learns by keeping audited examples and matching a new silhouette to
similar people.  It has no neural weights, gradient calculation, or AdamW.
"""

from __future__ import annotations

import argparse
import json
import math
import statistics
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np

from case_model import (
    GROUP_IMPORTANCE,
    RECIPES,
    ROWS,
    predict_from_ranked_people,
    ring_perimeter_cm,
    robust_scale,
)
from features import feature_groups


NEIGHBOR_CHOICES = (5, 9, 15, 25, 40)
EXPECTED_PEOPLE = 3_878
TARGET_LOCAL_RECIPE = "target_local_cases_v1"
TARGET_LOCAL_BY_RECIPE = {
    "target_local_cases_v1": ("waist", "hips"),
    "waist_local_hip_ratio_v3": ("waist",),
    "waist_local_hip_physical_v4": ("waist",),
    "waist_local_hip_physical_guard_v5": ("waist",),
    "waist_local_hip_banded_physical_v6": ("waist",),
    "waist_local_hip_named_shape_v7": ("waist",),
    "waist_local_tape_v1": ("waist",),
    "waist_local_tape_median_v2": ("waist",),
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--library", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--max-people", type=int, default=0)
    parser.add_argument("--fold", type=int, choices=range(5))
    parser.add_argument("--query-batch-size", type=int, default=64)
    parser.add_argument("--trace-limit", type=int, default=30)
    parser.add_argument("--recipe", choices=RECIPES, default="teacher_average_v0")
    parser.add_argument("--waist-neighbors", type=int, choices=NEIGHBOR_CHOICES)
    parser.add_argument("--hip-neighbors", type=int, choices=NEIGHBOR_CHOICES)
    return parser.parse_args()


def distribution(errors: list[float]) -> dict[str, Any]:
    absolute = np.abs(np.asarray(errors, dtype=np.float64))
    if not len(absolute):
        return {"count": 0, "maeCm": None, "medianCm": None, "p95Cm": None, "maximumCm": None, "signedBiasCm": None}
    signed = np.asarray(errors, dtype=np.float64)
    return {
        "count": len(errors),
        "maeCm": round(float(absolute.mean()), 6),
        "medianCm": round(float(np.quantile(absolute, 0.5)), 6),
        "p95Cm": round(float(np.quantile(absolute, 0.95)), 6),
        "maximumCm": round(float(absolute.max()), 6),
        "signedBiasCm": round(float(signed.mean()), 6),
        "within1Cm": round(float(np.mean(absolute <= 1.0)), 6),
        "withinHalfInch": round(float(np.mean(absolute <= 1.27)), 6),
        "within2Cm": round(float(np.mean(absolute <= 2.0)), 6),
        "within3Cm": round(float(np.mean(absolute <= 3.0)), 6),
        "within5Cm": round(float(np.mean(absolute <= 5.0)), 6),
    }


def transformed_features(features: np.ndarray, center: np.ndarray, scale: np.ndarray) -> np.ndarray:
    transformed = (features - center) / scale
    for group, columns in feature_groups().items():
        transformed[:, columns] *= math.sqrt(GROUP_IMPORTANCE[group] / len(columns))
    return transformed.astype(np.float32)


def transformed_target_features(
    features: np.ndarray,
    center: np.ndarray,
    scale: np.ndarray,
    feature_schema: list[str],
    target: str,
) -> np.ndarray:
    """Build a visible matching vector from profile and target-local body rows."""
    index = {name: position for position, name in enumerate(feature_schema)}
    local_rows = range(9, 16) if target == "waist" else range(13, 20)
    groups = {
        "profile": [index[name] for name in ("height_profile", "weight_profile", "bmi_profile", "female", "male")],
        "body_scale": [index[name] for name in ("silhouette.area_fraction", "silhouette.bbox_fill_fraction")],
        "shoulder_widths": [index[f"outline.row_{row:02d}.width"] for row in range(4, 10)],
        "target_widths": [index[f"outline.row_{row:02d}.width"] for row in local_rows],
    }
    importance = {
        "profile": 0.45,
        "body_scale": 0.10,
        "shoulder_widths": 0.15,
        "target_widths": 0.30,
    }
    parts = []
    for name, columns in groups.items():
        part = (features[:, columns] - center[columns]) / scale[columns]
        parts.append(part * math.sqrt(importance[name] / len(columns)))
    return np.concatenate(parts, axis=1).astype(np.float32)


def selected_people(scan_ids: np.ndarray, fold_ids: np.ndarray, maximum: int) -> set[str]:
    ids = sorted(set(map(str, scan_ids)))
    if maximum <= 0 or maximum >= len(ids):
        return set(ids)
    by_fold = {
        fold: [scan_id for scan_id in ids if int(fold_ids[np.flatnonzero(scan_ids == scan_id)[0]]) == fold]
        for fold in range(5)
    }
    chosen: list[str] = []
    for position in range(max(len(value) for value in by_fold.values())):
        for fold in range(5):
            if position < len(by_fold[fold]):
                chosen.append(by_fold[fold][position])
                if len(chosen) == maximum:
                    return set(chosen)
    return set(chosen)


def bmi_band_from_profile(value: np.ndarray) -> np.ndarray:
    bmi = value * 8.0 + 24.0
    return np.where(bmi < 20.0, 0, np.where(bmi < 25.0, 1, np.where(bmi < 30.0, 2, 3)))


def subgroup_names(query_feature: np.ndarray, schema: dict[str, int]) -> tuple[str, str]:
    gender = "female" if query_feature[schema["female"]] >= query_feature[schema["male"]] else "male"
    bmi = float(query_feature[schema["bmi_profile"]]) * 8.0 + 24.0
    if bmi < 20.0:
        bmi_band = "below_20"
    elif bmi < 25.0:
        bmi_band = "20_to_24_99"
    elif bmi < 30.0:
        bmi_band = "25_to_29_99"
    else:
        bmi_band = "30_or_above"
    return f"gender:{gender}", f"bmi:{bmi_band}"


def truth_for(row: str, target: np.ndarray, schema: dict[str, int]) -> dict[str, Any]:
    shape = np.asarray([
        (target[schema[f"{row}.shape.{point:02d}.x"]], target[schema[f"{row}.shape.{point:02d}.depth"]])
        for point in range(32)
    ], dtype=np.float64)
    return {
        "y_norm": float(target[schema[f"{row}.y_norm"]]),
        "left_x_norm": float(target[schema[f"{row}.left_x_norm"]]),
        "right_x_norm": float(target[schema[f"{row}.right_x_norm"]]),
        "width_cm": float(target[schema[f"{row}.width_cm"]]),
        "depth_cm": float(target[schema[f"{row}.depth_cm"]]),
        "shape": shape,
        "ring_cm": float(target[schema[f"{row}.ring_cm"]]),
        "tape_correction_cm": float(target[schema[f"{row}.tape_correction_cm"]]),
        "final_tape_cm": float(target[schema[f"{row}.final_tape_cm"]]),
    }


def cause_test(predicted: dict[str, Any], truth: dict[str, Any]) -> dict[str, Any]:
    original_error = abs(predicted["final_tape_cm"] - truth["final_tape_cm"])
    replacements = {
        "a_to_b_width": ring_perimeter_cm(truth["width_cm"], predicted["depth_cm"], predicted["shape"]) + predicted["tape_correction_cm"],
        "front_to_back_depth": ring_perimeter_cm(predicted["width_cm"], truth["depth_cm"], predicted["shape"]) + predicted["tape_correction_cm"],
        "cross_section_shape": ring_perimeter_cm(predicted["width_cm"], predicted["depth_cm"], truth["shape"]) + predicted["tape_correction_cm"],
        "tape_protocol_correction": predicted["ring_cm"] + truth["tape_correction_cm"],
    }
    removed = {
        name: max(0.0, original_error - abs(value - truth["final_tape_cm"]))
        for name, value in replacements.items()
    }
    main = max(removed, key=removed.get)
    return {
        "mainCause": main,
        "originalAbsoluteErrorCm": round(original_error, 6),
        "errorRemovedCm": {name: round(value, 6) for name, value in removed.items()},
        "rowPositionErrorPixels": round(abs(predicted["y_norm"] - truth["y_norm"]) * 128.0, 6),
        "leftEdgeErrorPixels": round(abs(predicted["left_x_norm"] - truth["left_x_norm"]) * 96.0, 6),
        "rightEdgeErrorPixels": round(abs(predicted["right_x_norm"] - truth["right_x_norm"]) * 96.0, 6),
    }


def fold_result(
    *,
    fold: int,
    features: np.ndarray,
    feature_schema: list[str],
    scan_ids: np.ndarray,
    view_ids: np.ndarray,
    fold_ids: np.ndarray,
    targets: np.ndarray,
    target_masks: np.ndarray,
    target_schema: list[str],
    allowed_people: set[str],
    query_batch_size: int,
    trace_limit: int,
    recipe: str,
    trace_neighbors_by_target: dict[str, int] | None = None,
    neighbor_choices: tuple[int, ...] = NEIGHBOR_CHOICES,
    neighbor_by_target_only: dict[str, int] | None = None,
) -> dict[str, Any]:
    allowed = np.asarray([str(scan_id) in allowed_people for scan_id in scan_ids])
    reference_indices = np.flatnonzero(allowed & (fold_ids != fold))
    query_indices = np.flatnonzero(allowed & (fold_ids == fold) & (view_ids == "canonical"))
    reference_people = sorted(set(map(str, scan_ids[reference_indices])))
    query_people = set(map(str, scan_ids[query_indices]))
    if not reference_people or not query_people or query_people & set(reference_people):
        raise RuntimeError("Person-level separation failed")
    by_person = []
    for scan_id in reference_people:
        indices = reference_indices[scan_ids[reference_indices] == scan_id]
        if len(indices) != 9:
            raise RuntimeError(f"{scan_id} has {len(indices)} reference views; expected 9")
        by_person.append(indices)
    grouped_reference_indices = np.stack(by_person)
    flat_reference_indices = grouped_reference_indices.reshape(-1)
    center, scale = robust_scale(features[flat_reference_indices])
    reference_features = transformed_features(features[flat_reference_indices], center, scale)
    reference_norm = np.sum(reference_features * reference_features, axis=1)
    target_reference_features: dict[str, np.ndarray] = {}
    target_reference_norm: dict[str, np.ndarray] = {}
    local_targets = TARGET_LOCAL_BY_RECIPE.get(recipe, ())
    if local_targets:
        for row in local_targets:
            target_reference_features[row] = transformed_target_features(
                features[flat_reference_indices], center, scale, feature_schema, row
            )
            target_reference_norm[row] = np.sum(target_reference_features[row] * target_reference_features[row], axis=1)
    schema = {name: index for index, name in enumerate(target_schema)}
    visible_schema = {name: index for index, name in enumerate(feature_schema)}
    reference_gender = features[
        grouped_reference_indices[:, 0],
    ][:, [visible_schema["female"], visible_schema["male"]]]
    reference_bmi_band = bmi_band_from_profile(
        features[grouped_reference_indices[:, 0], visible_schema["bmi_profile"]]
    )
    errors = {neighbors: {row: [] for row in ROWS} for neighbors in neighbor_choices}
    subgroup_errors = {neighbors: {row: {} for row in ROWS} for neighbors in neighbor_choices}
    causes = {neighbors: {row: [] for row in ROWS} for neighbors in neighbor_choices}
    traces: list[dict[str, Any]] = []
    for start in range(0, len(query_indices), query_batch_size):
        batch = query_indices[start:start + query_batch_size]
        query_features = transformed_features(features[batch], center, scale)
        query_norm = np.sum(query_features * query_features, axis=1)
        squared = query_norm[:, None] + reference_norm[None, :] - 2.0 * (query_features @ reference_features.T)
        squared = np.maximum(squared, 0.0).reshape(len(batch), len(reference_people), 9)
        best_view_position = np.argmin(squared, axis=2)
        best_distance = np.sqrt(np.take_along_axis(squared, best_view_position[..., None], axis=2)[..., 0])
        target_best_view_position: dict[str, np.ndarray] = {}
        target_best_distance: dict[str, np.ndarray] = {}
        if local_targets:
            for row in local_targets:
                query_target_features = transformed_target_features(features[batch], center, scale, feature_schema, row)
                query_target_norm = np.sum(query_target_features * query_target_features, axis=1)
                target_squared = (
                    query_target_norm[:, None]
                    + target_reference_norm[row][None, :]
                    - 2.0 * (query_target_features @ target_reference_features[row].T)
                )
                target_squared = np.maximum(target_squared, 0.0).reshape(len(batch), len(reference_people), 9)
                target_best_view_position[row] = np.argmin(target_squared, axis=2)
                target_best_distance[row] = np.sqrt(np.take_along_axis(
                    target_squared,
                    target_best_view_position[row][..., None],
                    axis=2,
                )[..., 0])
        if recipe == "hip_tape_same_gender_v6":
            query_gender = features[batch][:, [visible_schema["female"], visible_schema["male"]]]
            gender_match = np.all(reference_gender[None, :, :] == query_gender[:, None, :], axis=2)
            best_distance = np.where(gender_match, best_distance, np.inf)
        if recipe == "hip_tape_same_bmi_band_v7":
            query_bmi_band = bmi_band_from_profile(features[batch, visible_schema["bmi_profile"]])
            bmi_match = reference_bmi_band[None, :] == query_bmi_band[:, None]
            best_distance = np.where(bmi_match, best_distance, np.inf)
        for local, query_index in enumerate(batch.tolist()):
            query_subgroups = subgroup_names(features[query_index], visible_schema)
            ranked_by_target: dict[str, tuple[np.ndarray, np.ndarray]] = {}
            for row in ROWS:
                row_distance = target_best_distance[row][local] if row in local_targets else best_distance[local]
                row_view_position = target_best_view_position[row][local] if row in local_targets else best_view_position[local]
                person_order = np.argsort(row_distance, kind="stable")
                ranked_by_target[row] = (
                    grouped_reference_indices[person_order, row_view_position[person_order]],
                    row_distance[person_order],
                )
            for neighbors in neighbor_choices:
                active_rows = tuple(
                    row for row in ROWS
                    if neighbor_by_target_only is None or neighbor_by_target_only[row] == neighbors
                )
                if local_targets:
                    predicted = {}
                    for row in active_rows:
                        ranked_indices, ranked_distances = ranked_by_target[row]
                        predicted[row] = predict_from_ranked_people(
                            ranked_view_indices=ranked_indices,
                            ranked_distances=ranked_distances,
                            scan_ids=scan_ids,
                            targets=targets,
                            target_masks=target_masks,
                            target_schema=target_schema,
                            neighbors=neighbors,
                            features=features,
                            query_features=features[query_index],
                            feature_names=feature_schema,
                            recipe=recipe,
                        )[row]
                else:
                    ranked_indices, ranked_distances = ranked_by_target["waist"]
                    predicted = predict_from_ranked_people(
                        ranked_view_indices=ranked_indices,
                        ranked_distances=ranked_distances,
                        scan_ids=scan_ids,
                        targets=targets,
                        target_masks=target_masks,
                        target_schema=target_schema,
                        neighbors=neighbors,
                        features=features,
                        query_features=features[query_index],
                        feature_names=feature_schema,
                        recipe=recipe,
                    )
                for row in active_rows:
                    final_column = schema[f"{row}.final_tape_cm"]
                    if not bool(target_masks[query_index, final_column]):
                        continue
                    truth = truth_for(row, targets[query_index], schema)
                    signed_error = predicted[row]["final_tape_cm"] - truth["final_tape_cm"]
                    errors[neighbors][row].append(float(signed_error))
                    for subgroup in query_subgroups:
                        subgroup_errors[neighbors][row].setdefault(subgroup, []).append(float(signed_error))
                    cause = cause_test(predicted[row], truth)
                    causes[neighbors][row].append(cause)
                    trace_neighbors = (trace_neighbors_by_target or {}).get(row, 15)
                    if len(traces) < trace_limit and neighbors == trace_neighbors:
                        traces.append({
                            "scanId": str(scan_ids[query_index]),
                            "fold": fold,
                            "target": row,
                            "neighborCount": neighbors,
                            "teacherTapeCm": round(truth["final_tape_cm"], 6),
                            "predictedTapeCm": round(predicted[row]["final_tape_cm"], 6),
                            "namedPrediction": {
                                key: round(float(value), 6)
                                for key, value in predicted[row].items()
                                if key not in ("shape", "teachers", "correctionTeachers", "firstAnswerTrace")
                            },
                            "firstAnswerTrace": predicted[row]["firstAnswerTrace"],
                            "causeTest": cause,
                            "nearestTeachers": predicted[row]["teachers"][:5],
                            "correctionTeachers": predicted[row]["correctionTeachers"][:5],
                        })
    metrics: dict[str, Any] = {}
    for neighbors in neighbor_choices:
        metrics[str(neighbors)] = {}
        for row in ROWS:
            row_causes = causes[neighbors][row]
            main_counts: dict[str, int] = {}
            for item in row_causes:
                main_counts[item["mainCause"]] = main_counts.get(item["mainCause"], 0) + 1
            metrics[str(neighbors)][row] = {
                "tapeError": distribution(errors[neighbors][row]),
                "subgroupTapeError": {
                    subgroup: distribution(values)
                    for subgroup, values in sorted(subgroup_errors[neighbors][row].items())
                },
                "mainCauseCounts": main_counts,
            }
    return {
        "fold": fold,
        "trainingPeople": len(reference_people),
        "trainingViews": len(flat_reference_indices),
        "validationPeople": len(query_people),
        "validationViews": len(query_indices),
        "peopleOverlap": 0,
        "heldoutPeopleUsed": 0,
        "visibleRecipe": recipe,
        "metricsByNeighborCount": metrics,
        "traces": traces,
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
    if args.max_people <= 0 and len(set(scan_ids.tolist())) != EXPECTED_PEOPLE:
        raise RuntimeError("Complete cross-validation requires all 3,878 development people")
    allowed_people = selected_people(scan_ids, fold_ids, args.max_people)
    folds = [args.fold] if args.fold is not None else list(range(5))
    results = [
        fold_result(
            fold=fold,
            features=features,
            feature_schema=feature_schema,
            scan_ids=scan_ids,
            view_ids=view_ids,
            fold_ids=fold_ids,
            targets=targets,
            target_masks=target_masks,
            target_schema=target_schema,
            allowed_people=allowed_people,
            query_batch_size=args.query_batch_size,
            trace_limit=args.trace_limit,
            recipe=args.recipe,
            trace_neighbors_by_target={
                "waist": args.waist_neighbors or 15,
                "hips": args.hip_neighbors or 15,
            },
        )
        for fold in folds
    ]
    choices: dict[str, Any] = {}
    for neighbors in NEIGHBOR_CHOICES:
        row_metrics: dict[str, Any] = {}
        score = 0.0
        for row in ROWS:
            all_errors = []
            cause_counts: dict[str, int] = {}
            subgroup_fold_metrics: dict[str, list[dict[str, Any]]] = {}
            for result in results:
                metric = result["metricsByNeighborCount"][str(neighbors)][row]
                # Aggregate fold summaries using count-weighted MAE and bias. P95 is the mean fold P95.
                count = int(metric["tapeError"]["count"])
                if count:
                    all_errors.append(metric["tapeError"])
                for name, value in metric["mainCauseCounts"].items():
                    cause_counts[name] = cause_counts.get(name, 0) + int(value)
                for subgroup, subgroup_metric in metric["subgroupTapeError"].items():
                    subgroup_fold_metrics.setdefault(subgroup, []).append(subgroup_metric)
            count = sum(item["count"] for item in all_errors)
            mae = sum(item["maeCm"] * item["count"] for item in all_errors) / count if count else None
            p95 = statistics.fmean(item["p95Cm"] for item in all_errors) if all_errors else None
            row_metrics[row] = {
                "count": count,
                "maeCm": round(mae, 6) if mae is not None else None,
                "meanFoldP95Cm": round(p95, 6) if p95 is not None else None,
                "subgroups": {
                    subgroup: {
                        "count": sum(item["count"] for item in fold_metrics),
                        "maeCm": round(
                            sum(item["maeCm"] * item["count"] for item in fold_metrics)
                            / sum(item["count"] for item in fold_metrics),
                            6,
                        ),
                        "meanFoldP95Cm": round(statistics.fmean(item["p95Cm"] for item in fold_metrics), 6),
                    }
                    for subgroup, fold_metrics in sorted(subgroup_fold_metrics.items())
                    if sum(item["count"] for item in fold_metrics)
                },
                "mainCauseCounts": cause_counts,
            }
            score += (mae or 100.0) + 0.1 * (p95 or 100.0)
        choices[str(neighbors)] = {"selectionScore": round(score, 6), "rows": row_metrics}
    best_neighbors_by_target = {
        row: min(
            NEIGHBOR_CHOICES,
            key=lambda value: (
                choices[str(value)]["rows"][row]["maeCm"]
                + 0.1 * choices[str(value)]["rows"][row]["meanFoldP95Cm"]
            ),
        )
        for row in ROWS
    }
    requested_neighbors = {
        "waist": args.waist_neighbors,
        "hips": args.hip_neighbors,
    }
    selected_neighbors_by_target = {
        row: requested_neighbors[row] or best_neighbors_by_target[row]
        for row in ROWS
    }
    selected_metrics_by_target = {
        row: choices[str(selected_neighbors_by_target[row])]["rows"][row]
        for row in ROWS
    }
    payload = {
        "schemaVersion": "wear-waist-hip-cause-aware-cross-validation/v1",
        "createdAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "state": "completed",
        "learningMethod": "case matching plus a named physical reconstruction rule",
        "visibleRecipe": args.recipe,
        "pytorchUsed": False,
        "adamwUsed": False,
        "gradientTrainingUsed": False,
        "neuralWeightsUsed": False,
        "developmentPeopleAvailable": EXPECTED_PEOPLE,
        "developmentPeopleUsed": len(allowed_people),
        "heldoutPeopleUsed": 0,
        "foldsCompleted": folds,
        "fixedFeatureGroupImportance": GROUP_IMPORTANCE,
        "choices": choices,
        "automaticNeighborCountByTarget": best_neighbors_by_target,
        "selectedNeighborCountByTarget": selected_neighbors_by_target,
        "neighborSelectionReason": (
            "explicit visible rule supplied for one or both targets"
            if any(value is not None for value in requested_neighbors.values())
            else "lowest validation MAE plus 0.1 times mean fold P95"
        ),
        "selectedMetricsByTarget": selected_metrics_by_target,
        "foldResults": results,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n")
    print(json.dumps({
        "state": payload["state"],
        "developmentPeopleUsed": payload["developmentPeopleUsed"],
        "heldoutPeopleUsed": 0,
        "pytorchUsed": False,
        "adamwUsed": False,
        "selectedNeighborCountByTarget": selected_neighbors_by_target,
        "selectedMetricsByTarget": selected_metrics_by_target,
    }, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
