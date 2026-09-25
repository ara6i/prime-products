#!/usr/bin/env python3
"""Certify waist/hip geometry from the immutable fresh-teacher index.

The fresh index already carries an independent validity mask for every target.
This audit proves those masks came from the expected 3,878 non-sealed subjects,
checks that physical 3D/tape targets are invariant across camera augmentations,
and records coverage without reapplying the stale V6 teacher-card failures.
"""

from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np


ROWS = ("waist", "hips")
EXPECTED_SUBJECTS = {"train": 3_451, "validation": 427}
EXPECTED_RECORDS = {"train": 31_059, "validation": 3_843}
EXPECTED_VIEWS = (
    "canonical",
    "yaw-left-12",
    "yaw-right-12",
    "pitch-up-6",
    "pitch-down-6",
    "roll-left-3",
    "roll-right-3",
    "wide-35",
    "tele-70",
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--index", required=True, type=Path)
    parser.add_argument("--index-metadata", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    return parser.parse_args()


def now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(8 * 1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def row_groups(row: str) -> dict[str, tuple[str, ...]]:
    return {
        "edgeAB": (
            f"row.{row}.y_norm",
            f"row.{row}.left_x_norm",
            f"row.{row}.right_x_norm",
            f"row.{row}.width_cm",
        ),
        "depthCD": (
            f"row.{row}.depth_cm",
            f"row.{row}.depth_width_ratio",
        ),
        "closedShape32": tuple(
            key
            for point in range(32)
            for key in (
                f"row.{row}.shape.{point:02d}.x",
                f"row.{row}.shape.{point:02d}.depth",
            )
        ),
        "recordedTape": (f"tape.{row}.circumference_cm",),
    }


def _coverage(
    valid: np.ndarray,
    roles: np.ndarray,
    canonical: np.ndarray,
    scan_ids: np.ndarray,
) -> dict[str, Any]:
    selected = valid & canonical
    train = selected & (roles == 0)
    validation = selected & (roles == 1)
    missing = scan_ids[canonical & ~valid].tolist()
    return {
        "trainSubjectsEligible": int(train.sum()),
        "validationSubjectsEligible": int(validation.sum()),
        "subjectsEligible": int(selected.sum()),
        "subjectsTotal": int(canonical.sum()),
        "coveragePct": round(float(selected.sum() * 100.0 / max(1, canonical.sum())), 3),
        "missingExamples": [str(value) for value in missing[:20]],
    }


def build_audit(
    index_path: Path,
    metadata_path: Path,
    *,
    expected_subjects: dict[str, int] = EXPECTED_SUBJECTS,
    expected_records: dict[str, int] = EXPECTED_RECORDS,
    expected_views: tuple[str, ...] = EXPECTED_VIEWS,
) -> dict[str, Any]:
    index_path = index_path.resolve()
    metadata_path = metadata_path.resolve()
    metadata = json.loads(metadata_path.read_text())
    actual_index_sha256 = sha256(index_path)
    if metadata.get("schemaVersion") != "wear3d-fresh-training-index/v1":
        raise RuntimeError("Fresh teacher index metadata schema changed")
    if metadata.get("indexSha256") != actual_index_sha256:
        raise RuntimeError("Fresh teacher index hash does not match its metadata")
    if metadata.get("subjects") != expected_subjects or metadata.get("records") != expected_records:
        raise RuntimeError("Fresh teacher train/validation split changed")
    if (
        metadata.get("sealedTestSubjectsUsed") != 0
        or metadata.get("sealedTestLabelsInspected") is not False
        or metadata.get("previousWeightsUsed") is not False
        or metadata.get("previousPredictionsUsed") is not False
    ):
        raise RuntimeError("Fresh teacher index provenance is not sealed/fresh")

    with np.load(index_path, allow_pickle=False) as packed:
        required = {
            "masks",
            "profiles",
            "roles",
            "sample_ids",
            "scan_ids",
            "target_schema",
            "targets",
            "view_ids",
        }
        if not required.issubset(packed.files):
            raise RuntimeError(f"Fresh index is missing arrays: {sorted(required - set(packed.files))}")
        masks = packed["masks"].astype(np.bool_, copy=False)
        targets = packed["targets"].astype(np.float32, copy=False)
        profiles = packed["profiles"].astype(np.float32, copy=False)
        roles = packed["roles"]
        scan_ids = packed["scan_ids"].astype(str)
        view_ids = packed["view_ids"].astype(str)
        schema = packed["target_schema"].astype(str).tolist()

    records_expected = sum(expected_records.values())
    if len(scan_ids) != records_expected or len(set(packed_id for packed_id in scan_ids)) != sum(expected_subjects.values()):
        raise RuntimeError("Fresh teacher record/subject count changed")
    if int((roles == 0).sum()) != expected_records["train"] or int((roles == 1).sum()) != expected_records["validation"]:
        raise RuntimeError("Fresh teacher role counts changed")
    canonical = view_ids == "canonical"
    if int(canonical.sum()) != sum(expected_subjects.values()):
        raise RuntimeError("Each fresh teacher subject must have one canonical record")

    schema_index = {key: index for index, key in enumerate(schema)}
    all_required_keys = {
        key
        for row in ROWS
        for keys in row_groups(row).values()
        for key in keys
    }
    missing_keys = all_required_keys - set(schema_index)
    if missing_keys:
        raise RuntimeError(f"Fresh index is missing waist/hip targets: {sorted(missing_keys)[:5]}")

    order = np.argsort(scan_ids, kind="stable")
    ordered_scan_ids = scan_ids[order]
    unique_scan_ids, starts, counts = np.unique(
        ordered_scan_ids,
        return_index=True,
        return_counts=True,
    )
    if not np.all(counts == len(expected_views)):
        raise RuntimeError("Every fresh teacher subject must have exactly nine camera views")
    expected_view_set = set(expected_views)
    view_failures: list[str] = []
    role_failures: list[str] = []
    profile_failures: list[str] = []
    for subject, start, count in zip(unique_scan_ids, starts, counts, strict=True):
        indices = order[start : start + count]
        if set(view_ids[indices].tolist()) != expected_view_set:
            view_failures.append(str(subject))
        if len(set(roles[indices].tolist())) != 1:
            role_failures.append(str(subject))
        if float(np.ptp(profiles[indices], axis=0).max(initial=0.0)) > 1e-6:
            profile_failures.append(str(subject))
    if view_failures or role_failures or profile_failures:
        raise RuntimeError(
            "Fresh subject-view integrity failed: "
            f"views={view_failures[:3]} roles={role_failures[:3]} profiles={profile_failures[:3]}"
        )

    physical_keys = tuple(
        key
        for row in ROWS
        for group, keys in row_groups(row).items()
        if group != "edgeAB"
        for key in keys
    ) + tuple(f"row.{row}.width_cm" for row in ROWS)
    physical_indices = np.asarray([schema_index[key] for key in physical_keys], dtype=np.int64)
    ordered_masks = masks[order][:, physical_indices].reshape(
        len(unique_scan_ids), len(expected_views), len(physical_indices)
    )
    ordered_targets = targets[order][:, physical_indices].reshape(
        len(unique_scan_ids), len(expected_views), len(physical_indices)
    )
    mask_disagreements = np.any(
        ordered_masks != ordered_masks[:, :1, :],
        axis=(1, 2),
    )
    value_disagreements = np.zeros(len(unique_scan_ids), dtype=np.bool_)
    for target_number in range(len(physical_indices)):
        valid_subjects = ordered_masks[:, :, target_number].all(axis=1)
        if not valid_subjects.any():
            continue
        spans = np.ptp(ordered_targets[valid_subjects, :, target_number], axis=1)
        value_disagreements[np.flatnonzero(valid_subjects)[spans > 1e-5]] = True
    if mask_disagreements.any() or value_disagreements.any():
        raise RuntimeError(
            "Physical teacher targets changed across camera views: "
            f"mask={unique_scan_ids[mask_disagreements][:5].tolist()} "
            f"value={unique_scan_ids[value_disagreements][:5].tolist()}"
        )

    rows: dict[str, Any] = {}
    counts_summary: dict[str, Any] = {}
    for row in ROWS:
        groups: dict[str, Any] = {}
        geometry_group_valid: list[np.ndarray] = []
        for group, keys in row_groups(row).items():
            indices = np.asarray([schema_index[key] for key in keys], dtype=np.int64)
            valid = masks[:, indices].all(axis=1)
            groups[group] = _coverage(valid, roles, canonical, scan_ids)
            if group != "recordedTape":
                geometry_group_valid.append(valid)
        fully_supervised = np.logical_and.reduce(geometry_group_valid)
        full_coverage = _coverage(fully_supervised, roles, canonical, scan_ids)
        rows[row] = {
            "groups": groups,
            "fullySupervisedGeometry": full_coverage,
        }
        counts_summary[row] = {
            "trainSubjectsAccepted": full_coverage["trainSubjectsEligible"],
            "validationSubjectsAccepted": full_coverage["validationSubjectsEligible"],
            "trainSubjectsTotal": expected_subjects["train"],
            "validationSubjectsTotal": expected_subjects["validation"],
        }

    # Compatibility only: V8 ignores row-wide failures and consumes the
    # immutable target masks above. Keeping this allowlisted map prevents an
    # older package builder from importing any sealed or unrelated identity.
    failures_by_person = {
        str(subject): {row: [] for row in ROWS}
        for subject in unique_scan_ids.tolist()
    }
    return {
        "schemaVersion": "wear3d-fresh-geometry-audit/v1",
        "generatedAt": now(),
        "teacherJobId": metadata.get("teacherJobId"),
        "geometryQualityMode": "source-target-masks",
        "sourceTargetMasksAuthoritative": True,
        "sourceIndexSha256": actual_index_sha256,
        "sourceIndexMetadataSha256": sha256(metadata_path),
        "teacherIntegrity": metadata.get("teacherIntegrity"),
        "scope": {
            "trainingSubjects": expected_subjects["train"],
            "validationSubjects": expected_subjects["validation"],
            "sealedTestSubjectsIncluded": 0,
        },
        "viewIntegrity": {
            "viewsPerSubject": len(expected_views),
            "expectedViews": list(expected_views),
            "maskDisagreements": 0,
            "physicalValueDisagreements": 0,
            "profileDisagreements": 0,
        },
        "rows": rows,
        "counts": counts_summary,
        "failuresByPerson": failures_by_person,
        "recordedTapeMasksChanged": False,
        "officialWearTapeValuesChanged": False,
        "previousWeightsUsed": False,
        "sealed448SubjectsUsedForTraining": 0,
    }


def main() -> int:
    args = parse_args()
    audit = build_audit(args.index, args.index_metadata)
    output = args.output.resolve()
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(audit, indent=2, sort_keys=True) + "\n")
    print(json.dumps({
        "output": str(output),
        "sha256": sha256(output),
        "rows": audit["rows"],
        "viewIntegrity": audit["viewIntegrity"],
        "sealed448SubjectsUsedForTraining": 0,
    }, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
