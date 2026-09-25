#!/usr/bin/env python3
"""Evaluate the half-inch gate on validation only; never opens the 448 test."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import joblib
import numpy as np

from observable_student import FEATURE_FIELDS, ROWS
from train_observable_student_v3 import (
    EXPECTED_TRAIN_SUBJECTS,
    EXPECTED_VALIDATION_SUBJECTS,
    feature_arrays,
    geometry_quality,
    summarize,
    write_json,
)


HALF_INCH_CM = 1.27


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--index", type=Path, required=True)
    parser.add_argument("--masks-dir", type=Path, required=True)
    parser.add_argument("--teacher-audit", type=Path, required=True)
    parser.add_argument("--scalar-dir", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--workers", type=int, default=10)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    packed = np.load(args.index, allow_pickle=False)
    source_index = {name: position for position, name in enumerate(packed["target_schema"].tolist())}
    canonical = packed["view_ids"] == "canonical"
    train_rows = np.flatnonzero((packed["roles"] == 0) & canonical)
    validation_rows = np.flatnonzero((packed["roles"] == 1) & canonical)
    if len(train_rows) != EXPECTED_TRAIN_SUBJECTS or len(validation_rows) != EXPECTED_VALIDATION_SUBJECTS:
        raise RuntimeError("Validation split changed")
    audit = json.loads(args.teacher_audit.read_text())
    failures = audit["failuresByPerson"]
    selected_rows = np.concatenate((train_rows, validation_rows))
    quality = {
        row: geometry_quality(packed["scan_ids"][selected_rows], failures, row)
        for row in ("neck", "chest", "underbust", "waist", "hips")
    }
    observable_quality = {
        row: np.ones(len(selected_rows), dtype=np.bool_)
        for row in quality
    }
    raw, validity = feature_arrays(
        packed,
        selected_rows,
        args.masks_dir,
        source_index,
        observable_quality,
        args.workers,
    )
    scalar_result = json.loads((args.scalar_dir / "result.json").read_text())
    preprocessor = scalar_result["preprocessor"]
    if preprocessor["featureFields"] != list(FEATURE_FIELDS):
        raise RuntimeError("Scalar feature contract changed")
    means = np.asarray(preprocessor["featureMeans"], dtype=np.float32)
    stds = np.asarray(preprocessor["featureStds"], dtype=np.float32)
    prepared = np.concatenate(
        ((np.where(validity, raw, means) - means) / stds, validity.astype(np.float32)),
        axis=1,
    ).astype(np.float32)
    validation_x = prepared[len(train_rows):]
    validation_quality = {row: quality[row][len(train_rows):] for row in ROWS}

    rows_result: dict[str, object] = {}
    all_pass = True
    for row in ROWS:
        row_result: dict[str, object] = {}
        for kind, source_name in (
            ("depth", f"row.{row}.depth_cm"),
            ("tape", f"tape.{row}.circumference_cm"),
        ):
            model = joblib.load(args.scalar_dir / f"{row}_{kind}.joblib")
            source = source_index[source_name]
            valid = packed["masks"][validation_rows, source].copy()
            if kind == "depth":
                valid &= validation_quality[row]
            prediction = np.asarray(model.predict(validation_x[valid]), dtype=np.float64)
            truth = packed["targets"][validation_rows[valid], source].astype(np.float64)
            errors = np.abs(prediction - truth)
            valid_rows = validation_rows[valid]
            worst_positions = np.argsort(errors)[-10:][::-1]
            within = errors <= HALF_INCH_CM
            gate = bool(within.all())
            all_pass &= gate
            row_result[kind] = {
                **summarize(errors),
                "withinHalfInchCount": int(within.sum()),
                "withinHalfInchPercent": float(within.mean() * 100.0),
                "allUnderHalfInch": gate,
                "worstCases": [
                    {
                        "scanId": str(packed["scan_ids"][valid_rows[position]]),
                        "truthCm": float(truth[position]),
                        "predictionCm": float(prediction[position]),
                        "absoluteErrorCm": float(errors[position]),
                        "teacherRowFailures": failures.get(str(packed["scan_ids"][valid_rows[position]]), {}).get(row, []),
                    }
                    for position in worst_positions
                ],
            }
        rows_result[row] = row_result

    result = {
        "schemaVersion": "wear3d-waist-hips-v3-half-inch-gate/v1",
        "test448Opened": False,
        "validationSubjects": len(validation_rows),
        "thresholdCm": HALF_INCH_CM,
        "inputCondition": "teacher-corrected front silhouette and exact A-to-B observables",
        "rows": rows_result,
        "releaseGate": {
            "allValidationTargetsUnderHalfInch": all_pass,
            "passed": all_pass,
            "reason": "At least one validation error exceeds 1.27 cm" if not all_pass else None,
        },
    }
    write_json(args.output, result)
    print(json.dumps(result, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
