#!/usr/bin/env python3
"""Build the waist/hip-only training tensors from the frozen teacher audit."""

from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np


ROWS = ("waist", "hips")
SHAPE_POINTS = 32
EXPECTED_RECORDS = 34_902
EXPECTED_PEOPLE = 3_878


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-index", required=True, type=Path)
    parser.add_argument("--teacher-decisions", required=True, type=Path)
    parser.add_argument("--frozen-splits", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--metadata-output", required=True, type=Path)
    return parser.parse_args()


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(8 * 1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def target_schema() -> list[str]:
    fields: list[str] = []
    for row in ROWS:
        fields.extend((
            f"{row}.y_norm",
            f"{row}.left_x_norm",
            f"{row}.right_x_norm",
            f"{row}.width_cm",
            f"{row}.depth_cm",
        ))
        for point in range(SHAPE_POINTS):
            fields.extend((f"{row}.shape.{point:02d}.x", f"{row}.shape.{point:02d}.depth"))
        fields.extend((f"{row}.ring_cm", f"{row}.tape_correction_cm", f"{row}.final_tape_cm"))
    if len(fields) != 144:
        raise RuntimeError(f"Target schema changed: {len(fields)}")
    return fields


def ring_cm(width: float, depth: float, shape: np.ndarray) -> float:
    points = shape * np.asarray((width / 2.0, depth / 2.0), dtype=np.float32)
    return float(np.linalg.norm(np.roll(points, -1, axis=0) - points, axis=1).sum())


def main() -> int:
    args = parse_args()
    decisions: dict[tuple[str, str], dict[str, Any]] = {}
    with args.teacher_decisions.open(encoding="utf-8") as handle:
        for line in handle:
            record = json.loads(line)
            key = (str(record["scanId"]), str(record["target"]))
            if key in decisions:
                raise RuntimeError(f"Duplicate teacher decision: {key}")
            decisions[key] = record
    if len(decisions) != EXPECTED_PEOPLE * len(ROWS):
        raise RuntimeError(f"Teacher decision count changed: {len(decisions)}")

    split = json.loads(args.frozen_splits.read_text())
    folds = {str(item["scanId"]): int(item["fold"]) for item in split["developmentPeople"]}
    if len(folds) != EXPECTED_PEOPLE or split.get("overlap") != 0:
        raise RuntimeError("Frozen person split is invalid")

    with np.load(args.source_index, allow_pickle=False) as source:
        sample_ids = source["sample_ids"]
        scan_ids = source["scan_ids"]
        view_ids = source["view_ids"]
        s3_keys = source["s3_keys"]
        profiles = source["profiles"].astype(np.float32)
        old_targets = source["targets"].astype(np.float32)
        old_masks = source["masks"].astype(np.bool_)
        old_schema = source["target_schema"].tolist()
    if len(sample_ids) != EXPECTED_RECORDS or len(set(scan_ids.tolist())) != EXPECTED_PEOPLE:
        raise RuntimeError("Source training index counts changed")
    if set(scan_ids.tolist()) != set(folds):
        raise RuntimeError("Source index subjects differ from the frozen development split")

    old_index = {name: index for index, name in enumerate(old_schema)}
    schema = target_schema()
    targets = np.zeros((EXPECTED_RECORDS, len(schema)), dtype=np.float32)
    masks = np.zeros((EXPECTED_RECORDS, len(schema)), dtype=np.bool_)
    eligibility = np.zeros((EXPECTED_RECORDS, len(ROWS)), dtype=np.float32)
    eligibility_masks = np.ones_like(eligibility, dtype=np.bool_)
    fold_ids = np.asarray([folds[str(scan_id)] for scan_id in scan_ids], dtype=np.uint8)

    output_index = {name: index for index, name in enumerate(schema)}
    for record_index, scan_id_value in enumerate(scan_ids):
        scan_id = str(scan_id_value)
        for row_index, row in enumerate(ROWS):
            decision = decisions[(scan_id, row)]
            training_mask = decision["decision"]["trainingMask"]
            geometry_allowed = bool(training_mask["rowPosition"] and training_mask["edgesAB"] and training_mask["shape32"])
            correction_allowed = bool(training_mask["tapeProtocolCorrection"])
            eligibility[record_index, row_index] = 1.0 if decision["decision"]["status"] == "green" else 0.0
            direct = {
                f"{row}.y_norm": f"row.{row}.y_norm",
                f"{row}.left_x_norm": f"row.{row}.left_x_norm",
                f"{row}.right_x_norm": f"row.{row}.right_x_norm",
                f"{row}.width_cm": f"row.{row}.width_cm",
                f"{row}.depth_cm": f"row.{row}.depth_cm",
            }
            for point in range(SHAPE_POINTS):
                for axis in ("x", "depth"):
                    direct[f"{row}.shape.{point:02d}.{axis}"] = f"row.{row}.shape.{point:02d}.{axis}"
            component_valid = True
            for output_name, source_name in direct.items():
                source_column = old_index[source_name]
                output_column = output_index[output_name]
                targets[record_index, output_column] = old_targets[record_index, source_column]
                valid = geometry_allowed and bool(old_masks[record_index, source_column])
                masks[record_index, output_column] = valid
                component_valid = component_valid and valid

            width = float(targets[record_index, output_index[f"{row}.width_cm"]])
            depth = float(targets[record_index, output_index[f"{row}.depth_cm"]])
            shape = np.asarray([
                (
                    targets[record_index, output_index[f"{row}.shape.{point:02d}.x"]],
                    targets[record_index, output_index[f"{row}.shape.{point:02d}.depth"]],
                )
                for point in range(SHAPE_POINTS)
            ], dtype=np.float32)
            ring = ring_cm(width, depth, shape) if component_valid else 0.0
            tape_source = old_index[f"tape.{row}.circumference_cm"]
            tape_valid = bool(old_masks[record_index, tape_source])
            tape = float(old_targets[record_index, tape_source]) if tape_valid else 0.0
            final_valid = component_valid and correction_allowed and tape_valid
            for name, value, valid in (
                (f"{row}.ring_cm", ring, component_valid),
                (f"{row}.tape_correction_cm", tape - ring if final_valid else 0.0, final_valid),
                (f"{row}.final_tape_cm", tape if final_valid else 0.0, final_valid),
            ):
                targets[record_index, output_index[name]] = value
                masks[record_index, output_index[name]] = valid

    args.output.parent.mkdir(parents=True, exist_ok=True)
    np.savez_compressed(
        args.output,
        sample_ids=sample_ids,
        scan_ids=scan_ids,
        view_ids=view_ids,
        s3_keys=s3_keys,
        profiles=profiles,
        fold_ids=fold_ids,
        targets=targets,
        masks=masks,
        eligibility=eligibility,
        eligibility_masks=eligibility_masks,
        target_schema=np.asarray(schema, dtype="U96"),
    )
    metadata = {
        "schemaVersion": "wear-waist-hip-training-index/v1",
        "createdAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "records": EXPECTED_RECORDS,
        "people": EXPECTED_PEOPLE,
        "viewsPerPerson": 9,
        "foldCountsByPeople": {
            str(fold): len({str(scan_ids[index]) for index in np.flatnonzero(fold_ids == fold)})
            for fold in range(5)
        },
        "targets": len(schema),
        "scope": list(ROWS),
        "customerInputs": ["front silhouette", "height", "weight", "BMI", "female flag", "male flag"],
        "teacherOnlyInputs": ["WEAR PLY", "WEAR LND", "recorded WEAR waist tape", "recorded WEAR hip tape"],
        "strictFinalFormula": "predicted geometry ring + bounded named tape correction",
        "heldoutPeopleUsed": 0,
        "sourceHashes": {
            "sourceIndexSha256": sha256(args.source_index),
            "teacherDecisionsSha256": sha256(args.teacher_decisions),
            "frozenSplitsSha256": sha256(args.frozen_splits),
        },
        "outputSha256": sha256(args.output),
    }
    args.metadata_output.parent.mkdir(parents=True, exist_ok=True)
    args.metadata_output.write_text(json.dumps(metadata, indent=2, sort_keys=True) + "\n")
    print(json.dumps(metadata, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
