#!/usr/bin/env python3
"""Evaluate independent WEAR heads for each body row.

Each row sees height, weight, BMI, gender, and only its own Apple-corrected
front width. This matches the Test Lab contract: editing hips must not silently
change waist, and a failed chest edge must not poison the other measurements.
"""

from __future__ import annotations

import argparse
from collections import defaultdict
import importlib.util
import json
import math
from pathlib import Path
import statistics
import sys
from typing import Any


HERE = Path(__file__).resolve().parent
SPEC = importlib.util.spec_from_file_location("wear_tabular_base", HERE / "evaluate_v6_tabular_head.py")
if SPEC is None or SPEC.loader is None:
    raise RuntimeError("Could not load the WEAR tabular diagnostic helpers")
BASE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(BASE)

ROWS = BASE.ROWS
ROLES = BASE.ROLES
TARGETS = BASE.TARGETS
LAMBDAS = BASE.LAMBDAS


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--real-report", type=Path)
    return parser.parse_args()


def row_base(record: dict[str, Any], row_index: int, width_mean: float) -> list[float]:
    width = record["widths"][row_index]
    return [
        *record["profile"],
        width if width is not None else width_mean,
        1.0 if width is not None else 0.0,
    ]


def expand(values: list[float], means: list[float], stds: list[float]) -> list[float]:
    normalized = [(value - means[index]) / stds[index] for index, value in enumerate(values)]
    continuous = normalized[:5]
    interactions = [
        continuous[left] * continuous[right]
        for left in range(len(continuous))
        for right in range(left, len(continuous))
    ]
    return [1.0, *normalized, *interactions]


def real_predictions(
    report_path: Path | None,
    models: dict[str, dict[str, Any]],
    width_means: list[float],
) -> list[dict[str, Any]]:
    if report_path is None:
        return []
    report = json.loads(report_path.read_text(encoding="utf-8"))
    output = []
    for case in report.get("cases", []):
        evidence = case.get("evidence") or {}
        profile = evidence.get("profile") or {}
        widths = ((evidence.get("calibration") or {}).get("acceptedWidthsCm") or {})
        height = BASE.finite(profile.get("heightCm"))
        weight = BASE.finite(profile.get("weightKg"))
        bmi = BASE.finite(profile.get("bmi"))
        gender = case.get("gender")
        if None in (height, weight, bmi) or gender not in {"female", "male"}:
            continue
        compact = {
            "profile": [height, weight, bmi, 1.0 if gender == "female" else 0.0],
            "widths": [BASE.finite(widths.get(row)) for row in ROWS],
        }
        predictions = {}
        for target, bundle in models.items():
            row_index = ROWS.index(target.split(".", 1)[0])
            features = expand(
                row_base(compact, row_index, width_means[row_index]),
                bundle["means"],
                bundle["stds"],
            )
            predictions[target] = round(BASE.predict(bundle["coefficients"], features), 3)
        output.append({
            "person_id": case.get("person_id"),
            "known_tape_cm": case.get("known_tape_cm"),
            "widths_cm": widths,
            "predicted": predictions,
        })
    return output


def main() -> None:
    args = parse_args()
    by_role: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for line in sys.stdin:
        if not line.strip():
            continue
        record = BASE.compact_record(json.loads(line))
        if record is not None:
            by_role[record["role"]].append(record)
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
    models: dict[str, dict[str, Any]] = {}
    metrics: dict[str, Any] = {}
    for target_name in TARGETS:
        row_index = ROWS.index(target_name.split(".", 1)[0])
        train_bases = [row_base(record, row_index, width_means[row_index]) for record in by_role["train"]]
        columns = [[values[index] for values in train_bases] for index in range(len(train_bases[0]))]
        means, stds = BASE.mean_std(columns)
        examples = {
            role: [
                (
                    expand(row_base(record, row_index, width_means[row_index]), means, stds),
                    record["targets"][target_name],
                )
                for record in by_role[role]
                if target_name in record["targets"]
            ]
            for role in ROLES
        }
        if min(len(values) for values in examples.values()) < 20:
            continue
        candidates = []
        for ridge in LAMBDAS:
            coefficients = BASE.solve(*BASE.normal_equations(examples["train"], ridge))
            validation = BASE.error_summary(coefficients, examples["validation"])
            candidates.append((float(validation["mae"]), ridge, coefficients, validation))
        _, ridge, coefficients, validation = min(candidates, key=lambda item: item[0])
        train_mean = statistics.fmean(target for _, target in examples["train"])
        baseline_errors = [abs(target - train_mean) for _, target in examples["test"]]
        models[target_name] = {
            "coefficients": coefficients,
            "means": means,
            "stds": stds,
        }
        metrics[target_name] = {
            "ridge": ridge,
            "validation": validation,
            "test": BASE.error_summary(coefficients, examples["test"]),
            "test_train_mean_baseline_mae": round(statistics.fmean(baseline_errors), 5),
        }

    print(json.dumps({
        "records": {role: len(by_role[role]) for role in ROLES},
        "feature_count_per_row": len(next(iter(models.values()))["coefficients"]) if models else 0,
        "width_means_cm": dict(zip(ROWS, [round(value, 5) for value in width_means])),
        "metrics": metrics,
        "real_photo_diagnostic": real_predictions(args.real_report, models, width_means),
    }, indent=2))


if __name__ == "__main__":
    main()
