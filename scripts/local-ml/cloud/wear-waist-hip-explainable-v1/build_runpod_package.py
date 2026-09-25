#!/usr/bin/env python3
"""Create the immutable RunPod package for the explainable model."""

from __future__ import annotations

import argparse
import hashlib
import json
import tarfile
from datetime import datetime, timezone
from pathlib import Path


EXPECTED_MASKS = 34_902


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-mask-archive", required=True, type=Path)
    parser.add_argument("--training-index", required=True, type=Path)
    parser.add_argument("--training-index-metadata", required=True, type=Path)
    parser.add_argument("--teacher-summary", required=True, type=Path)
    parser.add_argument("--frozen-splits", required=True, type=Path)
    parser.add_argument("--code-dir", required=True, type=Path)
    parser.add_argument("--job-dir", required=True, type=Path)
    parser.add_argument("--job-id", required=True)
    return parser.parse_args()


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(8 * 1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def main() -> int:
    args = parse_args()
    job_dir = args.job_dir.resolve()
    job_dir.mkdir(parents=True, exist_ok=True)
    archive_path = job_dir / "runpod-input.tar.gz"
    code_paths = sorted(path for path in args.code_dir.glob("*.py") if "__pycache__" not in path.parts)
    required_code = {"model.py", "train.py", "test_model_contract.py"}
    if not required_code <= {path.name for path in code_paths}:
        raise RuntimeError("RunPod code directory is incomplete")

    mask_count = 0
    with tarfile.open(args.source_mask_archive, "r:gz") as source, tarfile.open(archive_path, "w:gz", compresslevel=4) as output:
        for member in source:
            if not member.isfile() or not member.name.startswith("masks/") or not member.name.endswith(".png"):
                continue
            extracted = source.extractfile(member)
            if extracted is None:
                raise RuntimeError(f"Could not read {member.name}")
            member.uid = member.gid = 0
            member.uname = member.gname = "root"
            output.addfile(member, extracted)
            mask_count += 1
        for source_path, archive_name in (
            (args.training_index, "input/training-index.npz"),
            (args.training_index_metadata, "input/training-index.json"),
            (args.teacher_summary, "input/teacher-audit-summary.json"),
            (args.frozen_splits, "input/frozen-splits.json"),
        ):
            output.add(source_path, arcname=archive_name, recursive=False)
        for path in code_paths:
            output.add(path, arcname=f"code/{path.name}", recursive=False)
    if mask_count != EXPECTED_MASKS:
        raise RuntimeError(f"Mask count changed: {mask_count}")

    manifest = {
        "schemaVersion": "wear-waist-hip-runpod-package/v1",
        "createdAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "jobId": args.job_id,
        "records": EXPECTED_MASKS,
        "developmentPeople": 3_878,
        "heldoutPeopleUsed": 0,
        "folds": 5,
        "scope": ["waist", "hips"],
        "freshInitialization": True,
        "previousWeightsUsed": False,
        "strictNamedGeometryPath": True,
        "archiveSha256": sha256(archive_path),
        "trainingIndexSha256": sha256(args.training_index),
        "teacherSummarySha256": sha256(args.teacher_summary),
        "frozenSplitsSha256": sha256(args.frozen_splits),
        "codeSha256": {path.name: sha256(path) for path in code_paths},
    }
    manifest_path = job_dir / "package-manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n")
    print(json.dumps(manifest, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
