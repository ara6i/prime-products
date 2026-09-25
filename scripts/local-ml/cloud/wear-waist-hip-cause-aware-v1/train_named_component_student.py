#!/usr/bin/env python3
"""Train and validate the cause-taught waist/hip student.

This is deliberately not a neural network.  The student predicts named body
parts, measures which part caused each training mistake, and stores a visible
lesson for that part.  A final number is always rebuilt from width, depth,
shape and tape correction.
"""

from __future__ import annotations

import argparse
import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np

from case_model import ring_perimeter_cm
from fit_named_hip_formula import build_named_inputs


ROWS = ("waist", "hips")
HALF_INCH_CM = 1.27
GEOMETRY_NAMES = ("y_norm", "left_x_norm", "right_x_norm", "width_cm", "depth_cm")
CAUSE_SLICES = {
    "a_to_b_width": slice(3, 4),
    "front_to_back_depth": slice(4, 5),
    "cross_section_shape": slice(5, 69),
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--library", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--neighbors", type=int, default=15)
    parser.add_argument("--lesson-neighbors", type=int, default=15)
    parser.add_argument("--minimum-lesson-agreement", type=float, default=0.70)
    parser.add_argument("--trace-limit", type=int, default=40)
    parser.add_argument("--max-people", type=int, default=0)
    return parser.parse_args()


def distances(query: np.ndarray, reference: np.ndarray) -> np.ndarray:
    q2 = np.sum(query * query, axis=1)
    r2 = np.sum(reference * reference, axis=1)
    return np.sqrt(np.maximum(q2[:, None] + r2[None, :] - 2.0 * query @ reference.T, 0.0))


def predict_nearby(
    distance: np.ndarray,
    values: np.ndarray,
    valid: np.ndarray,
    neighbors: int,
    *,
    exclude_same_position: bool = False,
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    usable = np.where(valid[None, :], distance, np.inf).copy()
    if exclude_same_position and usable.shape[0] == usable.shape[1]:
        np.fill_diagonal(usable, np.inf)
    count = min(neighbors, int(valid.sum()) - (1 if exclude_same_position else 0))
    if count < 3:
        raise RuntimeError("Fewer than three usable teachers")
    chosen = np.argpartition(usable, count - 1, axis=1)[:, :count]
    chosen_distance = np.take_along_axis(usable, chosen, axis=1)
    order = np.argsort(chosen_distance, axis=1, kind="stable")
    chosen = np.take_along_axis(chosen, order, axis=1)
    chosen_distance = np.take_along_axis(chosen_distance, order, axis=1)
    weight = 1.0 / np.maximum(chosen_distance, 0.03)
    weight /= weight.sum(axis=1, keepdims=True)
    selected_values = values[chosen]
    prediction = np.sum(selected_values * weight[..., None], axis=1)
    return prediction, chosen, chosen_distance


def row_arrays(
    row: str,
    targets: np.ndarray,
    masks: np.ndarray,
    schema: dict[str, int],
) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    columns = [schema[f"{row}.{name}"] for name in GEOMETRY_NAMES]
    columns += [
        schema[f"{row}.shape.{point:02d}.{axis}"]
        for point in range(32)
        for axis in ("x", "depth")
    ]
    correction_column = schema[f"{row}.tape_correction_cm"]
    tape_column = schema[f"{row}.final_tape_cm"]
    geometry_valid = masks[:, schema[f"{row}.ring_cm"]]
    tape_valid = masks[:, tape_column] & masks[:, correction_column]
    return targets[:, columns], targets[:, correction_column], targets[:, tape_column], geometry_valid & np.all(masks[:, columns], axis=1), tape_valid


def rebuild(geometry: np.ndarray, correction: np.ndarray) -> np.ndarray:
    answers = np.empty(len(geometry), dtype=np.float64)
    for index, item in enumerate(geometry):
        answers[index] = ring_perimeter_cm(item[3], item[4], item[5:].reshape(32, 2)) + correction[index]
    return answers


def main_causes(
    geometry: np.ndarray,
    correction: np.ndarray,
    teacher_geometry: np.ndarray,
    teacher_correction: np.ndarray,
    teacher_tape: np.ndarray,
) -> tuple[np.ndarray, list[dict[str, float]]]:
    initial = rebuild(geometry, correction)
    labels: list[str] = []
    evidence: list[dict[str, float]] = []
    for index in range(len(initial)):
        original = abs(initial[index] - teacher_tape[index])
        candidate = {}
        for cause, component_slice in CAUSE_SLICES.items():
            changed = geometry[index].copy()
            changed[component_slice] = teacher_geometry[index, component_slice]
            candidate[cause] = abs(rebuild(changed[None, :], correction[index:index + 1])[0] - teacher_tape[index])
        candidate["tape_protocol_correction"] = abs(
            rebuild(geometry[index:index + 1], teacher_correction[index:index + 1])[0] - teacher_tape[index]
        )
        removed = {name: max(0.0, original - error) for name, error in candidate.items()}
        label = max(removed, key=removed.get)
        labels.append(label)
        evidence.append({name: round(value, 6) for name, value in removed.items()})
    return np.asarray(labels), evidence


def metrics(error: np.ndarray) -> dict[str, float | int]:
    absolute = np.abs(error)
    return {
        "count": int(len(error)),
        "maeCm": round(float(absolute.mean()), 6),
        "medianCm": round(float(np.quantile(absolute, 0.5)), 6),
        "p95Cm": round(float(np.quantile(absolute, 0.95)), 6),
        "worstCm": round(float(absolute.max()), 6),
        "signedBiasCm": round(float(error.mean()), 6),
        "withinHalfInchPercent": round(float(np.mean(absolute <= HALF_INCH_CM) * 100.0), 4),
    }


def teach_component(
    distance: np.ndarray,
    residual: np.ndarray,
    labels: np.ndarray,
    cause: str,
    neighbors: int,
    minimum_agreement: float,
    maximum_change: float,
) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    eligible = labels == cause
    if int(eligible.sum()) < 3:
        return (
            np.zeros((len(distance), residual.shape[1])),
            np.empty((len(distance), 0), dtype=np.int64),
            np.zeros((len(distance), residual.shape[1])),
        )
    correction, chosen, _ = predict_nearby(distance, residual, eligible, neighbors)
    selected = residual[chosen]
    expected_sign = np.sign(correction)[:, None, :]
    agreement = np.mean(np.sign(selected) == expected_sign, axis=1)
    accepted = agreement >= minimum_agreement
    correction = np.where(accepted, np.clip(correction, -maximum_change, maximum_change), 0.0)
    return correction, chosen, agreement


def subgroup_masks(features: np.ndarray, names: list[str]) -> dict[str, np.ndarray]:
    index = {name: position for position, name in enumerate(names)}
    bmi = features[:, index["bmi_profile"]] * 8.0 + 24.0
    female = features[:, index["female"]] > 0.5
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
    with np.load(args.library, allow_pickle=False) as archive:
        features = archive["features"].astype(np.float64)
        feature_names = archive["feature_schema"].tolist()
        targets = archive["targets"].astype(np.float64)
        target_names = archive["target_schema"].tolist()
        masks = archive["target_masks"].astype(np.bool_)
        view_ids = archive["view_ids"]
        fold_ids = archive["fold_ids"]
        scan_ids = archive["scan_ids"]

    canonical = np.flatnonzero(view_ids == "canonical")
    if args.max_people:
        canonical = canonical[: args.max_people]
    features = features[canonical]
    targets = targets[canonical]
    masks = masks[canonical]
    fold_ids = fold_ids[canonical]
    scan_ids = scan_ids[canonical]
    named_inputs, input_names = build_named_inputs(features, feature_names)
    target_schema = {name: index for index, name in enumerate(target_names)}
    groups = subgroup_masks(features, feature_names)
    fold_reports: list[dict[str, Any]] = []
    all_errors = {row: {"initial": [], "taught": []} for row in ROWS}
    all_group_errors = {row: {name: [] for name in groups} for row in ROWS}
    traces: list[dict[str, Any]] = []

    for fold in range(5):
        train = fold_ids != fold
        validate = fold_ids == fold
        center = np.median(named_inputs[train], axis=0)
        scale = np.median(np.abs(named_inputs[train] - center), axis=0) * 1.4826
        scale = np.where(scale > 1e-6, scale, 1.0)
        train_x = ((named_inputs[train] - center) / scale).astype(np.float32)
        validate_x = ((named_inputs[validate] - center) / scale).astype(np.float32)
        train_distance = distances(train_x, train_x)
        validate_distance = distances(validate_x, train_x)
        train_ids = scan_ids[train]
        validate_ids = scan_ids[validate]
        fold_rows: dict[str, Any] = {}

        for row in ROWS:
            geometry, tape_correction, tape, geometry_valid, tape_valid = row_arrays(row, targets, masks, target_schema)
            train_geometry = geometry[train]
            train_correction = tape_correction[train]
            train_tape = tape[train]
            train_geometry_valid = geometry_valid[train]
            train_tape_valid = tape_valid[train]
            validation_geometry = geometry[validate]
            validation_correction = tape_correction[validate]
            validation_tape = tape[validate]
            validation_tape_valid = tape_valid[validate]

            loo_geometry, _, _ = predict_nearby(
                train_distance, train_geometry, train_geometry_valid, args.neighbors, exclude_same_position=True
            )
            loo_correction_2d, _, _ = predict_nearby(
                train_distance, train_correction[:, None], train_tape_valid, args.neighbors, exclude_same_position=True
            )
            loo_correction = loo_correction_2d[:, 0]
            lesson_valid = train_geometry_valid & train_tape_valid
            lesson_labels = np.full(len(train_ids), "unusable_teacher", dtype=object)
            lesson_evidence: list[dict[str, float] | None] = [None] * len(train_ids)
            valid_position = np.flatnonzero(lesson_valid)
            labels, evidence = main_causes(
                loo_geometry[lesson_valid], loo_correction[lesson_valid], train_geometry[lesson_valid],
                train_correction[lesson_valid], train_tape[lesson_valid]
            )
            lesson_labels[lesson_valid] = labels
            for position, item in zip(valid_position.tolist(), evidence):
                lesson_evidence[position] = item

            initial_geometry, initial_teachers, initial_teacher_distance = predict_nearby(
                validate_distance, train_geometry, train_geometry_valid, args.neighbors
            )
            initial_correction_2d, correction_teachers, _ = predict_nearby(
                validate_distance, train_correction[:, None], train_tape_valid, args.neighbors
            )
            initial_correction = initial_correction_2d[:, 0]
            taught_geometry = initial_geometry.copy()
            geometry_residual = train_geometry - loo_geometry
            lesson_sources: dict[str, np.ndarray] = {}
            lesson_agreement: dict[str, np.ndarray] = {}
            for cause, component_slice in CAUSE_SLICES.items():
                maximum_change = 3.0 if cause in ("a_to_b_width", "front_to_back_depth") else 0.20
                adjustment, sources, agreement = teach_component(
                    validate_distance, geometry_residual[:, component_slice], lesson_labels, cause,
                    args.lesson_neighbors, args.minimum_lesson_agreement, maximum_change,
                )
                taught_geometry[:, component_slice] += adjustment
                lesson_sources[cause] = sources
                lesson_agreement[cause] = agreement
            correction_residual = (train_correction - loo_correction)[:, None]
            correction_adjustment, correction_sources, correction_agreement = teach_component(
                validate_distance, correction_residual, lesson_labels, "tape_protocol_correction",
                args.lesson_neighbors, args.minimum_lesson_agreement, 2.0,
            )
            taught_correction = np.clip(initial_correction + correction_adjustment[:, 0], -7.0, 7.0)
            taught_geometry[:, 3:5] = np.maximum(taught_geometry[:, 3:5], 1.0)
            taught_geometry[:, 5:] = np.clip(taught_geometry[:, 5:], -1.5, 1.5)
            initial_answer = rebuild(initial_geometry, initial_correction)
            taught_answer = rebuild(taught_geometry, taught_correction)
            valid_error_initial = initial_answer[validation_tape_valid] - validation_tape[validation_tape_valid]
            valid_error_taught = taught_answer[validation_tape_valid] - validation_tape[validation_tape_valid]
            all_errors[row]["initial"].extend(valid_error_initial.tolist())
            all_errors[row]["taught"].extend(valid_error_taught.tolist())
            for name, mask in groups.items():
                selected = validation_tape_valid & mask[validate]
                all_group_errors[row][name].extend((taught_answer[selected] - validation_tape[selected]).tolist())

            fold_rows[row] = {
                "initial": metrics(valid_error_initial),
                "afterNamedCauseLessons": metrics(valid_error_taught),
                "trainingLessonCauseCounts": dict(Counter(lesson_labels[lesson_valid].tolist())),
            }
            candidates = np.flatnonzero(validation_tape_valid)
            worst = candidates[np.argsort(np.abs(taught_answer[candidates] - validation_tape[candidates]))[::-1][:5]]
            for local in worst.tolist():
                if len(traces) >= args.trace_limit:
                    break
                source_summary = {}
                for cause, sources in lesson_sources.items():
                    source_summary[cause] = [str(train_ids[index]) for index in sources[local, :3]] if sources.shape[1] else []
                source_summary["tape_protocol_correction"] = [
                    str(train_ids[index]) for index in correction_sources[local, :3]
                ] if correction_sources.shape[1] else []
                traces.append({
                    "scanId": str(validate_ids[local]),
                    "fold": fold,
                    "target": row,
                    "teacherTapeCm": round(float(validation_tape[local]), 6),
                    "initialAnswerCm": round(float(initial_answer[local]), 6),
                    "afterLessonsCm": round(float(taught_answer[local]), 6),
                    "initialComponents": {
                        "bodyLineY": round(float(initial_geometry[local, 0]), 6),
                        "leftA": round(float(initial_geometry[local, 1]), 6),
                        "rightB": round(float(initial_geometry[local, 2]), 6),
                        "widthCm": round(float(initial_geometry[local, 3]), 6),
                        "depthCm": round(float(initial_geometry[local, 4]), 6),
                        "tapeCorrectionCm": round(float(initial_correction[local]), 6),
                    },
                    "taughtComponents": {
                        "widthCm": round(float(taught_geometry[local, 3]), 6),
                        "depthCm": round(float(taught_geometry[local, 4]), 6),
                        "tapeCorrectionCm": round(float(taught_correction[local]), 6),
                    },
                    "namedLessonSources": source_summary,
                    "namedLessonAgreement": {
                        **{
                            cause: round(float(np.mean(value[local])), 4)
                            for cause, value in lesson_agreement.items()
                        },
                        "tape_protocol_correction": round(float(correction_agreement[local, 0]), 4),
                    },
                    "initialTeacherIds": [str(train_ids[index]) for index in initial_teachers[local, :5]],
                    "initialTeacherDistances": [round(float(value), 6) for value in initial_teacher_distance[local, :5]],
                })
        fold_reports.append({"fold": fold, "trainingPeople": int(train.sum()), "validationPeople": int(validate.sum()), "rows": fold_rows})

    results = {}
    for row in ROWS:
        results[row] = {
            "initial": metrics(np.asarray(all_errors[row]["initial"])),
            "afterNamedCauseLessons": metrics(np.asarray(all_errors[row]["taught"])),
            "subgroupsAfterLessons": {
                name: metrics(np.asarray(errors))
                for name, errors in all_group_errors[row].items()
                if errors
            },
        }
    payload = {
        "schemaVersion": "wear-named-component-cause-student/v1",
        "createdAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "state": "completed",
        "student": "separate named body-line, A-B, width, depth, 32-point shape and tape-correction predictions",
        "trainer": "OpenAI-authored cause loop; exact code measures the cause and applies only matching named component lessons",
        "lessonRule": "A training person teaches only the component that removes the most final tape error when replaced with teacher truth.",
        "visibleInputs": input_names,
        "neighbors": args.neighbors,
        "lessonNeighbors": args.lesson_neighbors,
        "minimumLessonDirectionAgreement": args.minimum_lesson_agreement,
        "maximumNamedChanges": {
            "widthCm": 3.0,
            "depthCm": 3.0,
            "shapeCoordinate": 0.20,
            "tapeCorrectionCm": 2.0,
        },
        "developmentPeople": int(len(features)),
        "folds": 5,
        "peopleOverlap": 0,
        "heldoutPeopleUsed": 0,
        "pytorchUsed": False,
        "adamwUsed": False,
        "gradientTrainingUsed": False,
        "hiddenWeightsUsed": False,
        "targetCm": HALF_INCH_CM,
        "results": results,
        "foldReports": fold_reports,
        "traces": traces,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n")
    print(json.dumps({"results": results, "heldoutPeopleUsed": 0}, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
