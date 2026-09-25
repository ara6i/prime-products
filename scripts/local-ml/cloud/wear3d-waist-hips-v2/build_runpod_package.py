#!/usr/bin/env python3
"""Build a fresh RunPod package while reusing immutable teacher inputs."""

from __future__ import annotations

import argparse
import hashlib
import io
import json
import tarfile
import time
from datetime import datetime, timezone
from pathlib import Path, PurePosixPath

import numpy as np


CODE_FILES = (
    "waist_hip_student.py",
    "waist_hip_student_test.py",
    "waist_hip_student_v4.py",
    "waist_hip_student_v4_test.py",
    "waist_hip_student_v5.py",
    "waist_hip_student_v5_test.py",
    "waist_hip_student_v6.py",
    "waist_hip_student_v6_test.py",
    "waist_hip_student_v7.py",
    "waist_hip_student_v7_test.py",
    "waist_hip_student_v7_1.py",
    "waist_hip_student_v7_1_test.py",
    "waist_hip_student_v7_2.py",
    "waist_hip_student_v7_2_test.py",
    "waist_hip_student_v8.py",
    "waist_hip_student_v8_test.py",
    "train_waist_hip_v2.py",
    "train_waist_hip_v4.py",
    "train_waist_hip_v5.py",
    "train_waist_hip_v6.py",
    "train_waist_hip_v7.py",
    "train_waist_hip_v7_1.py",
    "train_waist_hip_v7_2.py",
    "train_waist_hip_v8.py",
    "export_waist_hip_v2_onnx.py",
    "export_waist_hip_v4_onnx.py",
    "export_waist_hip_v5_onnx.py",
    "export_waist_hip_v6_onnx.py",
    "export_waist_hip_v7_onnx.py",
    "export_waist_hip_v7_1_onnx.py",
    "export_waist_hip_v7_2_onnx.py",
    "export_waist_hip_v8_onnx.py",
    "verify_overfit_v4.py",
    "verify_overfit_v5.py",
    "verify_overfit_v6.py",
    "verify_overfit_v7.py",
    "verify_overfit_v7_1.py",
    "verify_overfit_v7_2.py",
    "verify_overfit_v8.py",
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base-archive", required=True, type=Path)
    parser.add_argument("--code-dir", required=True, type=Path)
    parser.add_argument("--job-dir", required=True, type=Path)
    parser.add_argument("--job-id", required=True)
    parser.add_argument("--teacher-audit", type=Path)
    return parser.parse_args()


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(8 * 1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def main() -> int:
    args = parse_args()
    started = time.monotonic()
    base_archive = args.base_archive.resolve()
    code_dir = args.code_dir.resolve()
    job_dir = args.job_dir.resolve()
    job_dir.mkdir(parents=True, exist_ok=False)
    archive = job_dir / "runpod-input.tar.gz"
    copied_files = 0
    mask_files = 0
    teacher_audit_body: bytes | None = None
    teacher_audit_sha256: str | None = None
    source_teacher_audit_sha256: str | None = None
    teacher_audit_subjects = 0
    teacher_audit_schema: str | None = None
    teacher_audit_mode: str | None = None
    replaced_base_teacher_audit = False
    if args.teacher_audit is not None:
        teacher_audit = args.teacher_audit.resolve()
        if not teacher_audit.is_file():
            raise RuntimeError(f"Missing teacher audit: {teacher_audit}")
        source_teacher_audit_sha256 = sha256(teacher_audit)
        source_audit = json.loads(teacher_audit.read_text())
        teacher_audit_schema = source_audit.get("schemaVersion")
        teacher_audit_mode = source_audit.get("geometryQualityMode")
        failures_by_person = source_audit.get("failuresByPerson")
        if not isinstance(failures_by_person, dict):
            raise RuntimeError("The teacher audit is missing failuresByPerson")
        with tarfile.open(base_archive, "r:gz") as source:
            index_member = source.getmember("input/training-index.npz")
            index_file = source.extractfile(index_member)
            if index_file is None:
                raise RuntimeError("The base archive is missing its training index")
            index_body = index_file.read()
            index_sha256 = hashlib.sha256(index_body).hexdigest()
            with np.load(io.BytesIO(index_body), allow_pickle=False) as packed:
                allowed_subjects = {str(value) for value in np.unique(packed["scan_ids"])}
        if len(allowed_subjects) != 3_451 + 427:
            raise RuntimeError(f"Teacher audit allowlist changed: {len(allowed_subjects)} subjects")
        filtered_failures = {
            subject: failures_by_person.get(subject, {})
            for subject in sorted(allowed_subjects)
        }
        teacher_audit_subjects = len(filtered_failures)
        audit_payload: dict[str, object] = {
            "schemaVersion": teacher_audit_schema,
            "sourceAuditSha256": source_teacher_audit_sha256,
            "scope": {
                "trainingSubjects": 3_451,
                "validationSubjects": 427,
                "sealedTestSubjectsIncluded": 0,
            },
            "failuresByPerson": filtered_failures,
        }
        if teacher_audit_mode == "source-target-masks":
            scope = source_audit.get("scope") or {}
            if (
                teacher_audit_schema != "wear3d-fresh-geometry-audit/v1"
                or source_audit.get("sourceTargetMasksAuthoritative") is not True
                or source_audit.get("sourceIndexSha256") != index_sha256
                or scope.get("trainingSubjects") != 3_451
                or scope.get("validationSubjects") != 427
                or scope.get("sealedTestSubjectsIncluded") != 0
                or source_audit.get("sealed448SubjectsUsedForTraining") != 0
                or source_audit.get("previousWeightsUsed") is not False
                or source_audit.get("recordedTapeMasksChanged") is not False
                or source_audit.get("officialWearTapeValuesChanged") is not False
                or any(
                    filtered_failures[subject].get(row)
                    for subject in filtered_failures
                    for row in ("waist", "hips")
                )
            ):
                raise RuntimeError("Fresh source-mask teacher audit provenance failed")
            audit_payload.update(
                {
                    "teacherJobId": source_audit.get("teacherJobId"),
                    "geometryQualityMode": "source-target-masks",
                    "sourceTargetMasksAuthoritative": True,
                    "sourceIndexSha256": index_sha256,
                    "counts": source_audit.get("counts"),
                    "rows": source_audit.get("rows"),
                    "viewIntegrity": source_audit.get("viewIntegrity"),
                    "recordedTapeMasksChanged": False,
                    "officialWearTapeValuesChanged": False,
                    "previousWeightsUsed": False,
                    "sealed448SubjectsUsedForTraining": 0,
                }
            )
        teacher_audit_body = (
            json.dumps(
                audit_payload,
                indent=2,
                sort_keys=True,
            )
            + "\n"
        ).encode("utf-8")
        teacher_audit_sha256 = hashlib.sha256(teacher_audit_body).hexdigest()
    with tarfile.open(base_archive, "r:gz") as source, tarfile.open(archive, "w:gz", compresslevel=6) as target:
        for member in source:
            pure = PurePosixPath(member.name)
            if pure.is_absolute() or ".." in pure.parts:
                raise RuntimeError(f"Unsafe member in base archive: {member.name}")
            if not pure.parts or pure.parts[0] not in {"input", "masks"}:
                continue
            if teacher_audit_body is not None and pure == PurePosixPath("input/teacher-audit.json"):
                replaced_base_teacher_audit = True
                continue
            body = source.extractfile(member) if member.isfile() else None
            target.addfile(member, body)
            if member.isfile():
                copied_files += 1
                if pure.parts[0] == "masks" and pure.suffix == ".png":
                    mask_files += 1
        for name in CODE_FILES:
            path = code_dir / name
            if not path.is_file():
                raise RuntimeError(f"Missing v2 code file: {path}")
            target.add(path, arcname=f"code/{name}", recursive=False)
            copied_files += 1
        if teacher_audit_body is not None:
            audit_member = tarfile.TarInfo("input/teacher-audit.json")
            audit_member.size = len(teacher_audit_body)
            audit_member.mode = 0o640
            audit_member.mtime = 0
            target.addfile(audit_member, io.BytesIO(teacher_audit_body))
            copied_files += 1
    if mask_files != 34_902:
        raise RuntimeError(f"Teacher mask count changed while packaging: {mask_files}")
    manifest = {
        "schemaVersion": "wear3d-waist-hips-v2-runpod-package/v1",
        "createdAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "jobId": args.job_id,
        "archivePath": str(archive),
        "archiveBytes": archive.stat().st_size,
        "archiveSha256": sha256(archive),
        "sourceTeacherPackageSha256": sha256(base_archive),
        "teacherMasks": mask_files,
        "teacherAuditSha256": teacher_audit_sha256,
        "sourceTeacherAuditSha256": source_teacher_audit_sha256,
        "teacherAuditSchema": teacher_audit_schema,
        "teacherAuditMode": teacher_audit_mode,
        "teacherAuditSubjects": teacher_audit_subjects,
        "replacedBaseTeacherAudit": replaced_base_teacher_audit,
        "sealedTeacherAuditSubjectsIncluded": 0,
        "copiedFiles": copied_files,
        "trainSubjects": 3_451,
        "validationSubjects": 427,
        "rows": ["waist", "hips"],
        "teacherInputsReadOnly": True,
        "previousWeightsUsed": False,
        "sealed448SubjectsUsedForTraining": 0,
        "buildSeconds": time.monotonic() - started,
    }
    (job_dir / "package-manifest.json").write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n")
    print(json.dumps(manifest, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
