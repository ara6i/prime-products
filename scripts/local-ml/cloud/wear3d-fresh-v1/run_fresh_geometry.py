#!/usr/bin/env python3
"""Render one isolated fresh-v1 WEAR shard and checkpoint it to S3."""

from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import subprocess
import threading
import time
from typing import Any

import boto3
from boto3.s3.transfer import TransferConfig


TEACHER_PIPELINE_ID = "wear3d-fresh-teacher-v1"
VIEW_IDS = (
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
RAW_ROOT = Path("/opt/primestyle/wear3d/raw")
RAW_PREFIX = "raw/"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--bucket", required=True)
    parser.add_argument("--job-id", required=True)
    parser.add_argument("--shard-id", required=True)
    parser.add_argument("--manifest-key", required=True)
    parser.add_argument("--output-prefix", required=True)
    parser.add_argument("--report-prefix", required=True)
    parser.add_argument("--expected-subjects", type=int, required=True)
    parser.add_argument("--workers", type=int, required=True)
    parser.add_argument("--download-workers", type=int, default=32)
    parser.add_argument("--chunk-size", type=int, default=4)
    parser.add_argument("--root", type=Path, default=Path("/opt/primestyle/fresh-v1"))
    parser.add_argument("--code-root", type=Path, default=Path("/opt/primestyle/code"))
    return parser.parse_args()


def now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def write_jsonl(path: Path, records: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        "".join(json.dumps(record, separators=(",", ":"), sort_keys=True) + "\n" for record in records),
        encoding="utf-8",
    )


def sha256_bytes(payload: bytes) -> str:
    return hashlib.sha256(payload).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def safe_source_path(value: Any) -> tuple[str, Path]:
    source = Path(str(value))
    try:
        relative = source.relative_to(RAW_ROOT)
    except ValueError as error:
        raise RuntimeError(f"source path is outside the fresh raw root: {source}") from error
    if ".." in relative.parts or not relative.parts:
        raise RuntimeError(f"unsafe source path: {source}")
    return RAW_PREFIX + relative.as_posix(), RAW_ROOT / relative


class Remote:
    def __init__(self, bucket: str):
        self.bucket = bucket
        self.s3 = boto3.client("s3")
        self.transfer = TransferConfig(use_threads=False)
        self.lock = threading.Lock()

    def download(self, key: str, path: Path) -> None:
        path.parent.mkdir(parents=True, exist_ok=True)
        self.s3.download_file(self.bucket, key, str(path), Config=self.transfer)

    def upload(self, path: Path, key: str, content_type: str | None = None) -> None:
        extra = {"ServerSideEncryption": "AES256"}
        if content_type:
            extra["ContentType"] = content_type
        self.s3.upload_file(
            str(path),
            self.bucket,
            key,
            ExtraArgs=extra,
            Config=self.transfer,
        )

    def put_json(self, key: str, payload: dict[str, Any]) -> None:
        body = (json.dumps(payload, indent=2) + "\n").encode()
        with self.lock:
            self.s3.put_object(
                Bucket=self.bucket,
                Key=key,
                Body=body,
                ContentType="application/json",
                ServerSideEncryption="AES256",
            )


def load_source_manifest(path: Path, expected_subjects: int) -> list[dict[str, Any]]:
    records = [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]
    if len(records) != expected_subjects:
        raise RuntimeError(f"shard subjects={len(records)} expected={expected_subjects}")
    subject_ids = [str(record.get("subject_id")) for record in records]
    if len(set(subject_ids)) != len(subject_ids):
        raise RuntimeError("duplicate subject in fresh shard manifest")
    invalid = [
        str(record.get("scan_id"))
        for record in records
        if record.get("role") not in {"train", "validation"}
        or record.get("training_pose_valid") is not True
        or not str(record.get("scan_id", "")).endswith("-A")
    ]
    if invalid:
        raise RuntimeError(f"sealed-test or invalid-pose record in fresh shard: {invalid[:10]}")
    return records


def download_sources(
    remote: Remote,
    records: list[dict[str, Any]],
    workers: int,
) -> dict[str, Any]:
    sources: dict[str, Path] = {}
    for record in records:
        source = record.get("source") or {}
        for field in ("mesh", "landmarks"):
            key, path = safe_source_path(source.get(field))
            sources[key] = path
    failures = []
    started = time.monotonic()
    with ThreadPoolExecutor(max_workers=workers) as executor:
        futures = {
            executor.submit(remote.download, key, path): (key, path)
            for key, path in sources.items()
        }
        for future in as_completed(futures):
            key, path = futures[future]
            try:
                future.result()
            except Exception as error:
                failures.append(f"{key}: {type(error).__name__}: {error}")
            else:
                if not path.is_file() or path.stat().st_size <= 0:
                    failures.append(f"{key}: empty local source")
    if failures:
        raise RuntimeError(f"{len(failures)} source downloads failed: {failures[:10]}")
    return {
        "objects": len(sources),
        "bytes": sum(path.stat().st_size for path in sources.values()),
        "seconds": round(time.monotonic() - started, 3),
    }


def validate_chunk_records(
    rendered: list[dict[str, Any]],
    source_records: list[dict[str, Any]],
) -> None:
    expected_subjects = {str(record["subject_id"]) for record in source_records}
    expected_samples = {
        f"{record.get('scan_id', record['subject_id'])}-{view_id}"
        for record in source_records
        for view_id in VIEW_IDS
    }
    actual_samples = [str(record.get("sample_id")) for record in rendered]
    if len(rendered) != len(expected_samples) or set(actual_samples) != expected_samples:
        raise RuntimeError(
            f"Blender manifest set mismatch: records={len(rendered)} expected={len(expected_samples)}"
        )
    if len(set(actual_samples)) != len(actual_samples):
        raise RuntimeError("Blender manifest contains duplicate sample ids")
    if any(record.get("pipeline_id") != TEACHER_PIPELINE_ID for record in rendered):
        raise RuntimeError("renderer emitted a non-fresh teacher pipeline id")
    if any(str(record.get("subject_id")) not in expected_subjects for record in rendered):
        raise RuntimeError("renderer emitted a subject outside its fresh shard")
    if any(record.get("role") not in {"train", "validation"} for record in rendered):
        raise RuntimeError("renderer emitted sealed test data")


def main() -> None:
    args = parse_args()
    started_at = now()
    started = time.monotonic()
    remote = Remote(args.bucket)
    args.root.mkdir(parents=True, exist_ok=True)
    manifest_path = args.root / "source" / f"{args.shard_id}.jsonl"
    remote.download(args.manifest_key, manifest_path)
    manifest_sha256 = sha256_file(manifest_path)
    source_records = load_source_manifest(manifest_path, args.expected_subjects)
    if any("v9" in str(value).lower() for record in source_records for value in (record.get("source") or {}).values()):
        raise RuntimeError("v9 source reference detected; fresh job aborted")

    progress_key = f"{args.report_prefix.rstrip('/')}/{args.shard_id}/progress.json"
    remote.put_json(progress_key, {
        "schemaVersion": "wear3d-fresh-shard-progress/v1",
        "jobId": args.job_id,
        "shardId": args.shard_id,
        "state": "downloading_sources",
        "subjects": len(source_records),
        "completedSubjects": 0,
        "startedAt": started_at,
        "updatedAt": now(),
        "v9ArtifactUsed": False,
    })
    source_inventory = download_sources(remote, source_records, args.download_workers)

    chunks: list[tuple[int, list[dict[str, Any]]]] = []
    for start in range(0, len(source_records), args.chunk_size):
        chunks.append((start // args.chunk_size, source_records[start : start + args.chunk_size]))
    chunks_root = args.root / "chunks" / args.shard_id
    chunks_root.mkdir(parents=True, exist_ok=True)
    renderer = args.code_root / "render_fresh_teacher.py"
    environment = os.environ.copy()
    environment.update({
        "LIBGL_ALWAYS_SOFTWARE": "1",
        "LP_NUM_THREADS": "2",
        "OMP_NUM_THREADS": "1",
        "OPENBLAS_NUM_THREADS": "1",
        "MKL_NUM_THREADS": "1",
        "NUMEXPR_NUM_THREADS": "1",
    })

    def render_chunk(item: tuple[int, list[dict[str, Any]]]) -> dict[str, Any]:
        index, chunk_records = item
        label = f"chunk-{index:04d}"
        chunk_dir = chunks_root / label
        input_path = chunk_dir / "source.jsonl"
        render_dir = chunk_dir / "render"
        log_path = chunk_dir / "blender.log"
        write_jsonl(input_path, chunk_records)
        chunk_dir.mkdir(parents=True, exist_ok=True)
        command = [
            "xvfb-run",
            "--auto-servernum",
            "--server-args=-screen 0 1280x1024x24 -nolisten tcp",
            "blender",
            "--background",
            "--factory-startup",
            "--python",
            str(renderer),
            "--",
            "--manifest",
            str(input_path),
            "--output-dir",
            str(render_dir),
            "--views-per-subject",
            str(len(VIEW_IDS)),
            "--mask-only",
        ]
        with log_path.open("w", encoding="utf-8") as log:
            result = subprocess.run(
                command,
                check=False,
                stdout=log,
                stderr=subprocess.STDOUT,
                env=environment,
            )
        manifest = render_dir / "render-manifest.jsonl"
        if not manifest.is_file():
            raise RuntimeError(
                f"{label} Blender exit={result.returncode} manifest={manifest.is_file()}"
            )
        rendered = [json.loads(line) for line in manifest.read_text(encoding="utf-8").splitlines() if line.strip()]
        validate_chunk_records(rendered, chunk_records)
        # xvfb-run occasionally returns 1 after Blender has printed
        # "Blender quit" even though all expected records and PNGs are
        # complete. The manifest/data contract is authoritative; never reject
        # a fully validated chunk only because the X wrapper's cleanup code
        # was non-zero.
        chunk_prefix = f"{args.output_prefix.rstrip('/')}/{args.shard_id}/chunks/{label}"
        for record in rendered:
            record["fresh_job_id"] = args.job_id
            record["fresh_shard_id"] = args.shard_id
            if record.get("error"):
                continue
            for field, remote_field in (("mesh_image", "s3_mesh_image"), ("mask", "s3_mask")):
                local = Path(str(record.get(field)))
                try:
                    relative = local.relative_to(render_dir)
                except ValueError as error:
                    raise RuntimeError(f"unsafe rendered path: {local}") from error
                record[remote_field] = f"s3://{args.bucket}/{chunk_prefix}/{relative.as_posix()}"
        write_jsonl(manifest, rendered)

        upload_paths = [manifest, log_path]
        upload_paths.extend(sorted((render_dir / "mesh-cards").glob("*.png")))
        upload_paths.extend(sorted((render_dir / "masks").glob("*.png")))
        for path in upload_paths:
            if path == log_path:
                relative = Path("blender.log")
            else:
                relative = path.relative_to(render_dir)
            content_type = "image/png" if path.suffix == ".png" else "application/x-ndjson" if path.suffix == ".jsonl" else "text/plain"
            remote.upload(path, f"{chunk_prefix}/{relative.as_posix()}", content_type)
        marker = {
            "schemaVersion": "wear3d-fresh-chunk/v1",
            "jobId": args.job_id,
            "shardId": args.shard_id,
            "chunkIndex": index,
            "subjects": len(chunk_records),
            "records": len(rendered),
            "renderErrors": sum(bool(record.get("error")) for record in rendered),
            "manifestSha256": sha256_file(manifest),
            "state": "complete",
            "completedAt": now(),
            "v9ArtifactUsed": False,
        }
        marker_path = chunk_dir / "chunk-success.json"
        write_json(marker_path, marker)
        remote.upload(marker_path, f"{chunk_prefix}/chunk-success.json", "application/json")
        return {
            "index": index,
            "subjects": len(chunk_records),
            "records": len(rendered),
            "errors": marker["renderErrors"],
            "manifest": manifest,
        }

    completed_subjects = completed_records = render_errors = 0
    results: list[dict[str, Any]] = []
    infrastructure_errors = []
    remote.put_json(progress_key, {
        "schemaVersion": "wear3d-fresh-shard-progress/v1",
        "jobId": args.job_id,
        "shardId": args.shard_id,
        "state": "rendering",
        "subjects": len(source_records),
        "completedSubjects": 0,
        "workers": args.workers,
        "sourceInventory": source_inventory,
        "startedAt": started_at,
        "updatedAt": now(),
        "v9ArtifactUsed": False,
    })
    with ThreadPoolExecutor(max_workers=args.workers) as executor:
        futures = {executor.submit(render_chunk, item): item[0] for item in chunks}
        for future in as_completed(futures):
            try:
                result = future.result()
            except Exception as error:
                infrastructure_errors.append(
                    f"chunk-{futures[future]:04d}: {type(error).__name__}: {error}"
                )
            else:
                results.append(result)
                completed_subjects += int(result["subjects"])
                completed_records += int(result["records"])
                render_errors += int(result["errors"])
            if len(results) % 10 == 0 or completed_subjects == len(source_records):
                remote.put_json(progress_key, {
                    "schemaVersion": "wear3d-fresh-shard-progress/v1",
                    "jobId": args.job_id,
                    "shardId": args.shard_id,
                    "state": "rendering" if completed_subjects < len(source_records) else "auditing",
                    "subjects": len(source_records),
                    "completedSubjects": completed_subjects,
                    "completedRecords": completed_records,
                    "renderErrors": render_errors,
                    "infrastructureErrors": infrastructure_errors[:20],
                    "workers": args.workers,
                    "sourceInventory": source_inventory,
                    "startedAt": started_at,
                    "updatedAt": now(),
                    "v9ArtifactUsed": False,
                })
    if infrastructure_errors:
        raise RuntimeError(
            f"{len(infrastructure_errors)} fresh chunks failed infrastructure checks: {infrastructure_errors[:10]}"
        )

    merged_records: list[dict[str, Any]] = []
    for result in sorted(results, key=lambda item: int(item["index"])):
        merged_records.extend(
            json.loads(line)
            for line in Path(result["manifest"]).read_text(encoding="utf-8").splitlines()
            if line.strip()
        )
    merged_manifest = args.root / "reports" / args.shard_id / "render-manifest.jsonl"
    audit_path = args.root / "reports" / args.shard_id / "geometry-audit.json"
    contact_sheet = args.root / "reports" / args.shard_id / "teacher-contact-sheet.jpg"
    write_jsonl(merged_manifest, merged_records)
    audit_command = [
        "python3",
        str(args.code_root / "audit_rendered_geometry.py"),
        "--manifest",
        str(merged_manifest),
        "--expected-subjects",
        str(args.expected_subjects),
        "--expected-role",
        "train",
        "--expected-role",
        "validation",
        "--output",
        str(audit_path),
        "--contact-sheet",
        str(contact_sheet),
        "--contact-sheet-samples",
        "16",
    ]
    audit_environment = os.environ.copy()
    audit_environment["PYTHONPATH"] = str(args.code_root)
    audit_result = subprocess.run(audit_command, check=False, env=audit_environment)
    if not audit_path.is_file():
        raise RuntimeError(f"fresh audit exited {audit_result.returncode} without an audit report")
    audit = json.loads(audit_path.read_text(encoding="utf-8"))
    report_prefix = f"{args.report_prefix.rstrip('/')}/{args.shard_id}"
    for path, key, content_type in (
        (merged_manifest, f"{report_prefix}/render-manifest.jsonl", "application/x-ndjson"),
        (audit_path, f"{report_prefix}/geometry-audit.json", "application/json"),
        (contact_sheet, f"{report_prefix}/teacher-contact-sheet.jpg", "image/jpeg"),
    ):
        if path.is_file():
            remote.upload(path, key, content_type)

    passed = audit_result.returncode == 0 and audit.get("teacherDatasetStructurallyValid") is True
    result_payload = {
        "schemaVersion": "wear3d-fresh-shard-result/v1",
        "jobId": args.job_id,
        "shardId": args.shard_id,
        "state": "passed" if passed else "failed",
        "subjects": len(source_records),
        "records": len(merged_records),
        "renderErrors": sum(bool(record.get("error")) for record in merged_records),
        "manifestSha256": sha256_file(merged_manifest),
        "sourceManifestSha256": manifest_sha256,
        "sourceInventory": source_inventory,
        "auditKey": f"{report_prefix}/geometry-audit.json",
        "manifestKey": f"{report_prefix}/render-manifest.jsonl",
        "contactSheetKey": f"{report_prefix}/teacher-contact-sheet.jpg",
        "elapsedSeconds": round(time.monotonic() - started, 3),
        "startedAt": started_at,
        "completedAt": now(),
        "v9ArtifactUsed": False,
        "previousProcessedArtifactRead": False,
    }
    result_path = args.root / "reports" / args.shard_id / "result.json"
    write_json(result_path, result_payload)
    remote.upload(result_path, f"{report_prefix}/result.json", "application/json")
    remote.put_json(progress_key, {**result_payload, "updatedAt": now()})
    print(json.dumps(result_payload, indent=2))
    raise SystemExit(0 if passed else 2)


if __name__ == "__main__":
    main()
