#!/usr/bin/env python3
"""Evaluate a front-width/profile-only WEAR head before another GPU run.

The full render manifest is streamed on stdin. A small ridge model is learned
from the audited train subjects, selected on validation subjects, and scored on
the untouched test subjects. This is a diagnostic ablation: it proves whether
removing synthetic RGB features from the depth/circumference head is useful.
"""

from __future__ import annotations

import argparse
from collections import defaultdict
import json
import math
from pathlib import Path
import statistics
import sys
from typing import Any


ROWS = ("neck", "chest", "underbust", "waist", "hips")
ROLES = ("train", "validation", "test")
TARGETS = tuple(
    f"{row}.{kind}"
    for row in ROWS
    for kind in ("circumference_cm", "depth_cm")
)
LAMBDAS = (0.01, 0.1, 1.0, 10.0)


def finite(value: object) -> float | None:
    if isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(float(value)):
        return float(value)
    return None


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--real-report", type=Path)
    return parser.parse_args()


def compact_record(record: dict[str, Any]) -> dict[str, Any] | None:
    if record.get("view_id") != "front-50" or record.get("role") not in ROLES:
        return None
    height = finite(record.get("height_cm"))
    weight = finite(record.get("weight_kg"))
    bmi = finite(record.get("bmi"))
    gender = record.get("gender")
    if None in (height, weight, bmi) or gender not in {"female", "male"}:
        return None
    rows = record.get("rows") or {}
    widths: list[float | None] = []
    targets: dict[str, float] = {}
    for row_name in ROWS:
        row = rows.get(row_name)
        if not isinstance(row, dict):
            widths.append(None)
            continue
        width = finite(row.get("apple_corrected_width_cm")) if row.get("accepted") is True else None
        widths.append(width if width is not None and width > 0 else None)
        circumference_mm = finite(row.get("measurement_circumference_mm"))
        depth_mm = finite(row.get("mesh_depth_mm")) if row.get("geometry_target_valid") is True else None
        if circumference_mm is not None and circumference_mm > 0:
            targets[f"{row_name}.circumference_cm"] = circumference_mm / 10.0
        if depth_mm is not None and depth_mm > 0:
            targets[f"{row_name}.depth_cm"] = depth_mm / 10.0
    return {
        "role": record["role"],
        "profile": [height, weight, bmi, 1.0 if gender == "female" else 0.0],
        "widths": widths,
        "targets": targets,
    }


def mean_std(columns: list[list[float]]) -> tuple[list[float], list[float]]:
    means = [statistics.fmean(column) for column in columns]
    stds = []
    for column, mean in zip(columns, means):
        variance = statistics.fmean((value - mean) ** 2 for value in column)
        stds.append(max(math.sqrt(variance), 1e-6))
    return means, stds


def base_vector(record: dict[str, Any], width_means: list[float]) -> list[float]:
    widths = record["widths"]
    masks = [1.0 if value is not None else 0.0 for value in widths]
    filled = [value if value is not None else width_means[index] for index, value in enumerate(widths)]
    return [*record["profile"], *filled, *masks]


def expand(base: list[float], means: list[float], stds: list[float]) -> list[float]:
    normalized = [(value - means[index]) / stds[index] for index, value in enumerate(base)]
    continuous = normalized[:9]
    interactions = [
        continuous[left] * continuous[right]
        for left in range(len(continuous))
        for right in range(left, len(continuous))
    ]
    return [1.0, *normalized, *interactions]


def normal_equations(examples: list[tuple[list[float], float]], ridge: float) -> tuple[list[list[float]], list[float]]:
    size = len(examples[0][0])
    matrix = [[0.0] * size for _ in range(size)]
    vector = [0.0] * size
    for features, target in examples:
        for left, left_value in enumerate(features):
            vector[left] += left_value * target
            row = matrix[left]
            for right in range(left, size):
                row[right] += left_value * features[right]
    for left in range(size):
        for right in range(left):
            matrix[left][right] = matrix[right][left]
        if left:
            matrix[left][left] += ridge
    return matrix, vector


def solve(matrix: list[list[float]], vector: list[float]) -> list[float]:
    size = len(vector)
    augmented = [row[:] + [vector[index]] for index, row in enumerate(matrix)]
    for column in range(size):
        pivot = max(range(column, size), key=lambda row: abs(augmented[row][column]))
        if abs(augmented[pivot][column]) < 1e-10:
            raise RuntimeError("Tabular diagnostic matrix is singular")
        augmented[column], augmented[pivot] = augmented[pivot], augmented[column]
        pivot_value = augmented[column][column]
        augmented[column][column:] = [value / pivot_value for value in augmented[column][column:]]
        for row in range(size):
            if row == column:
                continue
            factor = augmented[row][column]
            if abs(factor) < 1e-14:
                continue
            for item in range(column, size + 1):
                augmented[row][item] -= factor * augmented[column][item]
    return [augmented[index][-1] for index in range(size)]


def predict(coefficients: list[float], features: list[float]) -> float:
    return sum(coefficient * value for coefficient, value in zip(coefficients, features))


def error_summary(coefficients: list[float], examples: list[tuple[list[float], float]]) -> dict[str, float | int]:
    errors = [abs(predict(coefficients, features) - target) for features, target in examples]
    return {
        "count": len(errors),
        "mae": round(statistics.fmean(errors), 5),
        "median_absolute_error": round(statistics.median(errors), 5),
        "p95_absolute_error": round(sorted(errors)[max(0, math.ceil(len(errors) * 0.95) - 1)], 5),
    }


def report_real_predictions(
    report_path: Path | None,
    width_means: list[float],
    base_means: list[float],
    base_stds: list[float],
    coefficients: dict[str, list[float]],
) -> list[dict[str, Any]]:
    if report_path is None:
        return []
    report = json.loads(report_path.read_text(encoding="utf-8"))
    output = []
    for case in report.get("cases", []):
        evidence = case.get("evidence") or {}
        profile = evidence.get("profile") or {}
        accepted = ((evidence.get("calibration") or {}).get("acceptedWidthsCm") or {})
        gender = case.get("gender")
        height = finite(profile.get("heightCm"))
        weight = finite(profile.get("weightKg"))
        bmi = finite(profile.get("bmi"))
        if None in (height, weight, bmi) or gender not in {"female", "male"}:
            continue
        compact = {
            "profile": [height, weight, bmi, 1.0 if gender == "female" else 0.0],
            "widths": [finite(accepted.get(row)) for row in ROWS],
        }
        features = expand(base_vector(compact, width_means), base_means, base_stds)
        output.append({
            "person_id": case.get("person_id"),
            "known_tape_cm": case.get("known_tape_cm"),
            "widths_cm": accepted,
            "predicted": {
                target: round(predict(model, features), 3)
                for target, model in coefficients.items()
            },
        })
    return output


def main() -> None:
    args = parse_args()
    by_role: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for line in sys.stdin:
        if not line.strip():
            continue
        compact = compact_record(json.loads(line))
        if compact is not None:
            by_role[compact["role"]].append(compact)
    if any(not by_role[role] for role in ROLES):
        raise RuntimeError({role: len(by_role[role]) for role in ROLES})

    width_means = [
        statistics.fmean(
            record["widths"][index]
            for record in by_role["train"]
            if record["widths"][index] is not None
        )
        for index in range(len(ROWS))
    ]
    train_bases = [base_vector(record, width_means) for record in by_role["train"]]
    columns = [[base[index] for base in train_bases] for index in range(len(train_bases[0]))]
    base_means, base_stds = mean_std(columns)
    features_by_role = {
        role: [(record, expand(base_vector(record, width_means), base_means, base_stds)) for record in records]
        for role, records in by_role.items()
    }

    selected: dict[str, list[float]] = {}
    metrics: dict[str, Any] = {}
    for target_name in TARGETS:
        examples = {
            role: [
                (features, record["targets"][target_name])
                for record, features in features_by_role[role]
                if target_name in record["targets"]
            ]
            for role in ROLES
        }
        if min(len(values) for values in examples.values()) < 20:
            continue
        candidates = []
        for ridge in LAMBDAS:
            coefficients = solve(*normal_equations(examples["train"], ridge))
            validation = error_summary(coefficients, examples["validation"])
            candidates.append((float(validation["mae"]), ridge, coefficients, validation))
        _, ridge, coefficients, validation = min(candidates, key=lambda item: item[0])
        selected[target_name] = coefficients
        train_mean = statistics.fmean(target for _, target in examples["train"])
        baseline_errors = [abs(target - train_mean) for _, target in examples["test"]]
        metrics[target_name] = {
            "ridge": ridge,
            "validation": validation,
            "test": error_summary(coefficients, examples["test"]),
            "test_train_mean_baseline_mae": round(statistics.fmean(baseline_errors), 5),
        }

    print(json.dumps({
        "records": {role: len(by_role[role]) for role in ROLES},
        "feature_count": len(next(iter(selected.values()))) if selected else 0,
        "width_means_cm": dict(zip(ROWS, [round(value, 5) for value in width_means])),
        "metrics": metrics,
        "real_photo_diagnostic": report_real_predictions(
            args.real_report, width_means, base_means, base_stds, selected
        ),
    }, indent=2))


if __name__ == "__main__":
    main()
