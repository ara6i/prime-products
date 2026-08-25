#!/usr/bin/env python3
"""Checkpoint complete fresh chunks when xvfb returns a false exit code."""

from __future__ import annotations

import argparse
import json
import math
import os
from pathlib import Path
import subprocess
import time
from typing import Any

from run_fresh_geometry import (
    Remote,
    now,
    sha256_file,
    validate_chunk_records,
    write_json,
    write_jsonl,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--bucket", required=True)
    parser.add_argument("--job-id", required=True)
    parser.add_argument("--shard-id", required=True)
    parser.add_argument("--expected-subjects", type=int, required=True)
    parser.add_argument("--output-prefix", required=True)
    parser.add_argument("--report-prefix", required=True)
    parser.add_argument("--root", type=Path, default=Path("/opt/primestyle/fresh-v1"))
    parser.add_argument("--code-root", type=Path, default=Path("/opt/primestyle/code"))
    parser.add_argument("--chunk-size", type=int, default=4)
    parser.add_argument("--interval-seconds", type=float, default=2.0)
    return parser.parse_args()


def load_jsonl(path: Path) -> list[dict[str, Any]]:
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def main() -> None:
    args = parse_args()
    remote = Remote(args.bucket)
    chunks_root = args.root / "chunks" / args.shard_id
    expected_chunks = math.ceil(args.expected_subjects / args.chunk_size)
    salvaged: set[int] = set()
    started = time.monotonic()

    def checkpoint(index: int) -> Path | None:
        label = f"chunk-{index:04d}"
        chunk_dir = chunks_root / label
        marker_path = chunk_dir / "chunk-success.json"
        manifest = chunk_dir / "render" / "render-manifest.jsonl"
        source_path = chunk_dir / "source.jsonl"
        log_path = chunk_dir / "blender.log"
        if marker_path.is_file() and manifest.is_file():
            return manifest
        if not source_path.is_file() or not manifest.is_file():
            return None
        # Give the primary runner time to validate and checkpoint a normal
        # zero-exit chunk. Only intervene after the complete manifest has sat
        # without a marker; this avoids duplicate S3 uploads while still
        # rescuing xvfb's false non-zero exits well before shutdown.
        if time.time() - manifest.stat().st_mtime < 20.0:
            return None
        try:
            source_records = load_jsonl(source_path)
            rendered = load_jsonl(manifest)
            validate_chunk_records(rendered, source_records)
        except Exception:
            return None
        render_dir = chunk_dir / "render"
        chunk_prefix = f"{args.output_prefix.rstrip('/')}/{args.shard_id}/chunks/{label}"
        for record in rendered:
            record["fresh_job_id"] = args.job_id
            record["fresh_shard_id"] = args.shard_id
            record["checkpoint_recovered_after_xvfb_exit"] = True
            if record.get("error"):
                continue
            for field, remote_field in (("mesh_image", "s3_mesh_image"), ("mask", "s3_mask")):
                local = Path(str(record.get(field)))
                relative = local.relative_to(render_dir)
                if not local.is_file():
                    return None
                record[remote_field] = f"s3://{args.bucket}/{chunk_prefix}/{relative.as_posix()}"
        write_jsonl(manifest, rendered)
        upload_paths = [manifest, log_path]
        upload_paths.extend(sorted((render_dir / "mesh-cards").glob("*.png")))
        upload_paths.extend(sorted((render_dir / "masks").glob("*.png")))
        for path in upload_paths:
            if not path.is_file():
                return None
            relative = Path("blender.log") if path == log_path else path.relative_to(render_dir)
            content_type = (
                "image/png"
                if path.suffix == ".png"
                else "application/x-ndjson"
                if path.suffix == ".jsonl"
                else "text/plain"
            )
            remote.upload(path, f"{chunk_prefix}/{relative.as_posix()}", content_type)
        marker = {
            "schemaVersion": "wear3d-fresh-chunk/v1",
            "jobId": args.job_id,
            "shardId": args.shard_id,
            "chunkIndex": index,
            "subjects": len(source_records),
            "records": len(rendered),
            "renderErrors": sum(bool(record.get("error")) for record in rendered),
            "manifestSha256": sha256_file(manifest),
            "state": "complete",
            "checkpointRecoveredAfterXvfbExit": True,
            "completedAt": now(),
            "v9ArtifactUsed": False,
        }
        write_json(marker_path, marker)
        remote.upload(marker_path, f"{chunk_prefix}/chunk-success.json", "application/json")
        salvaged.add(index)
        return manifest

    while True:
        manifests = []
        for index in range(expected_chunks):
            manifest = checkpoint(index)
            if manifest is not None:
                manifests.append(manifest)
        if len(manifests) == expected_chunks:
            break
        time.sleep(args.interval_seconds)

    merged_records = [record for path in manifests for record in load_jsonl(path)]
    report_dir = args.root / "reports" / args.shard_id
    merged_manifest = report_dir / "render-manifest.jsonl"
    audit_path = report_dir / "geometry-audit.json"
    contact_sheet = report_dir / "teacher-contact-sheet.jpg"
    write_jsonl(merged_manifest, merged_records)
    environment = os.environ.copy()
    environment["PYTHONPATH"] = str(args.code_root)
    audit_result = subprocess.run(
        [
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
        ],
        check=False,
        env=environment,
    )
    if not audit_path.is_file():
        raise RuntimeError(f"salvage audit exited {audit_result.returncode} without output")
    audit = json.loads(audit_path.read_text(encoding="utf-8"))
    report_prefix = f"{args.report_prefix.rstrip('/')}/{args.shard_id}"
    for path, key, content_type in (
        (merged_manifest, f"{report_prefix}/render-manifest.jsonl", "application/x-ndjson"),
        (audit_path, f"{report_prefix}/geometry-audit.json", "application/json"),
        (contact_sheet, f"{report_prefix}/teacher-contact-sheet.jpg", "image/jpeg"),
    ):
        remote.upload(path, key, content_type)
    passed = audit_result.returncode == 0 and audit.get("teacherDatasetStructurallyValid") is True
    recovered_total = sum(
        json.loads((chunks_root / f"chunk-{index:04d}" / "chunk-success.json").read_text(encoding="utf-8")).get(
            "checkpointRecoveredAfterXvfbExit"
        ) is True
        for index in range(expected_chunks)
    )
    result = {
        "schemaVersion": "wear3d-fresh-shard-result/v1",
        "jobId": args.job_id,
        "shardId": args.shard_id,
        "state": "passed" if passed else "failed",
        "subjects": args.expected_subjects,
        "records": len(merged_records),
        "renderErrors": sum(bool(record.get("error")) for record in merged_records),
        "manifestSha256": sha256_file(merged_manifest),
        "auditKey": f"{report_prefix}/geometry-audit.json",
        "manifestKey": f"{report_prefix}/render-manifest.jsonl",
        "contactSheetKey": f"{report_prefix}/teacher-contact-sheet.jpg",
        "elapsedSeconds": round(time.monotonic() - started, 3),
        "completedAt": now(),
        "v9ArtifactUsed": False,
        "previousProcessedArtifactRead": False,
        "salvageWatcher": True,
        "chunksRecoveredAfterXvfbExit": recovered_total,
    }
    result_path = report_dir / "result.json"
    write_json(result_path, result)
    remote.upload(result_path, f"{report_prefix}/result.json", "application/json")
    print(json.dumps(result, indent=2), flush=True)
    raise SystemExit(0 if passed else 2)


if __name__ == "__main__":
    main()
