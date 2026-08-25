#!/usr/bin/env python3
"""Create a compact immutable train/validation index from fresh teacher records."""

from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np

from fresh_student_contract import PROFILE_FIELDS, profile_vector, target_groups, target_schema
from teacher_contract import extract_targets


BUCKET = "primestyleai-wear3d-921049726279-us-east-1"
TEACHER_JOB_ID = "wear3d-fresh-v1-cpu-geometry-20260824T155631Z"
EXPECTED_RECORDS = {"train": 31_059, "validation": 3_843}
EXPECTED_SUBJECTS = {"train": 3_451, "validation": 427}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--teacher-root", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--metadata-output", required=True, type=Path)
    return parser.parse_args()


def now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(8 * 1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def s3_key(uri: str) -> str:
    prefix = f"s3://{BUCKET}/processed/{TEACHER_JOB_ID}/"
    if not uri.startswith(prefix) or not uri.endswith(".png"):
        raise RuntimeError(f"Unexpected fresh mask URI: {uri}")
    return uri[len(f"s3://{BUCKET}/"):]


def main() -> None:
    args = parse_args()
    teacher_root = args.teacher_root.resolve()
    output = args.output.resolve()
    metadata_output = args.metadata_output.resolve()
    if teacher_root == output.parent or teacher_root in output.parents:
        raise RuntimeError("Training index must not be written into teacher input")

    final_result_path = teacher_root / "final-result.json"
    final_result = json.loads(final_result_path.read_text())
    if (
        final_result.get("state") != "passed"
        or final_result.get("sealedTestSubjectsUsed") != 0
        or final_result.get("v9ArtifactUsed") is not False
        or final_result.get("previousWeightsUsed") is not False
    ):
        raise RuntimeError("Fresh teacher provenance is not safe for model fitting")

    manifests = sorted(teacher_root.glob("cpu-32-*/render-manifest.jsonl"))
    if len(manifests) != 8:
        raise RuntimeError(f"Expected eight fresh manifests, found {len(manifests)}")
    record_count = sum(sum(1 for _ in path.open("rb")) for path in manifests)
    if record_count != sum(EXPECTED_RECORDS.values()):
        raise RuntimeError(f"Fresh record count changed: {record_count}")

    schema = target_schema()
    schema_index = {key: index for index, key in enumerate(schema)}
    sample_ids = np.empty(record_count, dtype="U64")
    scan_ids = np.empty(record_count, dtype="U32")
    view_ids = np.empty(record_count, dtype="U32")
    roles = np.empty(record_count, dtype=np.uint8)
    s3_keys = np.empty(record_count, dtype="U320")
    profiles = np.empty((record_count, len(PROFILE_FIELDS)), dtype=np.float32)
    targets = np.zeros((record_count, len(schema)), dtype=np.float32)
    masks = np.zeros((record_count, len(schema)), dtype=np.bool_)

    position = 0
    subjects: dict[str, set[str]] = {"train": set(), "validation": set()}
    role_records = {"train": 0, "validation": 0}
    for manifest in manifests:
        with manifest.open("r", encoding="utf-8") as handle:
            for line in handle:
                record = json.loads(line)
                role = str(record.get("role") or "")
                if role not in role_records:
                    raise RuntimeError(f"Sealed/unknown role reached training index: {role!r}")
                compact_targets = extract_targets(record)
                unknown = set(compact_targets) - set(schema)
                if unknown:
                    raise RuntimeError(f"Unknown fresh target keys: {sorted(unknown)[:5]}")
                sample_ids[position] = str(record["sample_id"])
                scan_ids[position] = str(record["scan_id"])
                view_ids[position] = str(record["view_id"])
                roles[position] = 0 if role == "train" else 1
                s3_keys[position] = s3_key(str(record["s3_mask"]))
                profiles[position] = np.asarray(profile_vector(record), dtype=np.float32)
                for key, value in compact_targets.items():
                    index = schema_index[key]
                    targets[position, index] = float(value)
                    masks[position, index] = True
                subjects[role].add(str(record["scan_id"]))
                role_records[role] += 1
                position += 1

    if role_records != EXPECTED_RECORDS:
        raise RuntimeError(f"Fresh record split changed: {role_records}")
    subject_counts = {role: len(values) for role, values in subjects.items()}
    if subject_counts != EXPECTED_SUBJECTS or subjects["train"] & subjects["validation"]:
        raise RuntimeError(f"Fresh subject split invalid: {subject_counts}")
    if len(set(sample_ids.tolist())) != record_count:
        raise RuntimeError("Fresh sample IDs are not unique")

    train_rows = roles == 0
    train_masks = masks[train_rows]
    train_targets = targets[train_rows]
    counts = train_masks.sum(axis=0, dtype=np.int64)
    sums = (train_targets * train_masks).sum(axis=0, dtype=np.float64)
    means = np.divide(sums, counts, out=np.zeros_like(sums), where=counts > 0)
    centered = np.where(train_masks, train_targets - means, 0.0)
    variances = np.divide(
        (centered * centered).sum(axis=0, dtype=np.float64),
        counts,
        out=np.ones_like(sums),
        where=counts > 0,
    )
    standard_deviations = np.sqrt(np.maximum(variances, 1e-8))
    if np.any(counts <= 0) or not np.isfinite(standard_deviations).all():
        raise RuntimeError("At least one fresh target has no valid training labels")

    output.parent.mkdir(parents=True, exist_ok=True)
    np.savez_compressed(
        output,
        sample_ids=sample_ids,
        scan_ids=scan_ids,
        view_ids=view_ids,
        roles=roles,
        s3_keys=s3_keys,
        profiles=profiles,
        targets=targets,
        masks=masks,
        target_schema=np.asarray(schema, dtype="U96"),
        target_means=means.astype(np.float32),
        target_standard_deviations=standard_deviations.astype(np.float32),
        target_training_counts=counts,
    )
    metadata: dict[str, Any] = {
        "schemaVersion": "wear3d-fresh-training-index/v1",
        "createdAt": now(),
        "teacherJobId": TEACHER_JOB_ID,
        "teacherRoot": str(teacher_root),
        "teacherIntegrity": {
            "finalResultSha256": sha256(final_result_path),
            "manifestSha256": {path.parent.name: sha256(path) for path in manifests},
        },
        "records": role_records,
        "subjects": subject_counts,
        "subjectOverlap": 0,
        "targets": {
            "schemaSize": len(schema),
            "groups": {name: len(indices) for name, indices in target_groups(schema).items()},
            "allTargetsHaveTrainingLabels": True,
        },
        "allowedInputs": ["fresh synthetic silhouette mask", *PROFILE_FIELDS],
        "previousWeightsUsed": False,
        "previousPredictionsUsed": False,
        "v9ArtifactUsed": False,
        "sealedTestSubjectsUsed": 0,
        "sealedTestLabelsInspected": False,
        "indexPath": str(output),
        "indexSha256": sha256(output),
    }
    metadata_output.parent.mkdir(parents=True, exist_ok=True)
    metadata_output.write_text(json.dumps(metadata, indent=2, sort_keys=True) + "\n")
    print(json.dumps(metadata, indent=2))


if __name__ == "__main__":
    main()
