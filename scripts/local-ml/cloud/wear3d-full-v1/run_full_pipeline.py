#!/usr/bin/env python3
"""Run the bounded full WEAR pipeline on one encrypted AWS GPU worker."""

from __future__ import annotations

import argparse
import concurrent.futures
import json
import os
import shutil
import subprocess
import sys
import traceback
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import boto3


EXPECTED_SOURCE_BYTES = 33_497_610_937
EXPECTED_SOURCE_OBJECTS = 22_150
STAGE_DEFINITIONS = [
    ("inventory", "Check the protected data", "Confirm every uploaded file and classify meshes, landmarks, and measurements."),
    ("manifest", "Pair scans with answers", "Join each body scan to its landmarks and known body measurements without mixing people across train and test."),
    ("render", "Make labeled 2D examples", "Turn each usable 3D scan into a body mask with exact chest, waist, hip, neck, sleeve, and inseam targets."),
    ("train", "Train the photo model", "Teach the model to predict body rows and measurements from a front-photo body mask plus height, weight, and gender."),
    ("evaluate", "Test unseen WEAR people", "Measure error only on subjects excluded from training and save the best checkpoint."),
    ("real_photos", "Prove it on real photos", "A separate real-photo set is required before this can be trusted in the SDK."),
]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--bucket", required=True)
    parser.add_argument("--source-prefix", default="raw/WEAR3DDATA/")
    parser.add_argument("--status-key", required=True)
    parser.add_argument("--pipeline-id", required=True)
    parser.add_argument("--work-root", type=Path, default=Path("/opt/primestyle/wear3d"))
    parser.add_argument("--workers", type=int, default=3)
    parser.add_argument("--chunk-size", type=int, default=36)
    parser.add_argument("--epochs", type=int, default=24)
    parser.add_argument("--train-python", default=sys.executable)
    parser.add_argument("--instance-id", default=None)
    parser.add_argument("--instance-type", default="g4dn.xlarge")
    parser.add_argument("--max-runtime-hours", type=int, default=10)
    parser.add_argument(
        "--stop-after-render",
        action="store_true",
        help="Prepare every mesh on CPU, save outputs to S3, and wait for a separate GPU worker.",
    )
    return parser.parse_args()


class StatusWriter:
    def __init__(self, args: argparse.Namespace) -> None:
        self.args = args
        self.s3 = boto3.client("s3")
        self.status = self._load()

    def _load(self) -> dict[str, Any]:
        try:
            response = self.s3.get_object(Bucket=self.args.bucket, Key=self.args.status_key)
            return json.loads(response["Body"].read())
        except Exception:
            return {
                "schemaVersion": 1,
                "pipelineId": self.args.pipeline_id,
                "state": "preparing",
                "overallPercent": 1,
                "currentStage": "inventory",
                "currentStageLabel": "AWS worker is starting",
                "detail": "Preparing the encrypted cloud worker.",
                "startedAt": now_iso(),
                "updatedAt": now_iso(),
                "dataset": {
                    "subjects": 0,
                    "sourceScans": 13_209,
                    "targetExamples": 13_209,
                    "completedExamples": 0,
                    "failedExamples": 0,
                },
                "aws": {},
                "stages": [
                    {"key": key, "label": label, "explanation": explanation, "state": "queued", "percent": 0}
                    for key, label, explanation in STAGE_DEFINITIONS
                ],
            }

    def write(self) -> None:
        self.status["updatedAt"] = now_iso()
        self.status.setdefault("aws", {}).update(
            {
                "instanceId": self.args.instance_id,
                "instanceType": self.args.instance_type,
                "maxRuntimeHours": self.args.max_runtime_hours,
            }
        )
        self.s3.put_object(
            Bucket=self.args.bucket,
            Key=self.args.status_key,
            Body=json.dumps(self.status, indent=2).encode("utf-8"),
            ContentType="application/json",
            ServerSideEncryption="AES256",
        )

    def update(
        self,
        *,
        state: str = "running",
        overall: float,
        stage: str,
        label: str,
        detail: str,
        stage_percent: float,
        stage_state: str = "running",
    ) -> None:
        self.status.update(
            {
                "state": state,
                "overallPercent": round(overall, 2),
                "currentStage": stage,
                "currentStageLabel": label,
                "detail": detail,
            }
        )
        for item in self.status["stages"]:
            if item["key"] == stage:
                item.update({"state": stage_state, "percent": round(stage_percent, 2)})
        self.write()

    def finish_stage(self, key: str) -> None:
        for item in self.status["stages"]:
            if item["key"] == key:
                item.update({"state": "complete", "percent": 100})


def run(command: list[str], *, log_path: Path | None = None, check: bool = True) -> subprocess.CompletedProcess:
    print("run=", " ".join(command), flush=True)
    if log_path is None:
        return subprocess.run(command, check=check, text=True)
    log_path.parent.mkdir(parents=True, exist_ok=True)
    with log_path.open("w", encoding="utf-8") as log:
        return subprocess.run(command, stdout=log, stderr=subprocess.STDOUT, check=check, text=True)


def local_inventory(root: Path) -> tuple[int, int]:
    count = 0
    size = 0
    for path in root.rglob("*"):
        if path.is_file():
            count += 1
            size += path.stat().st_size
    return count, size


def jsonl_records(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def write_jsonl(path: Path, records: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as handle:
        for record in records:
            handle.write(json.dumps(record, separators=(",", ":"), sort_keys=True) + "\n")


def render_chunk(
    blender: str,
    xvfb: str,
    render_script: Path,
    chunk_manifest: Path,
    output_dir: Path,
    log_path: Path,
) -> tuple[int, int, int]:
    expected = len(jsonl_records(chunk_manifest))
    command = [
        xvfb,
        "-a",
        blender,
        "--background",
        "--python",
        str(render_script),
        "--",
        "--manifest",
        str(chunk_manifest),
        "--output-dir",
        str(output_dir),
        "--mask-only",
    ]
    result = run(command, log_path=log_path, check=False)
    records = jsonl_records(output_dir / "render-manifest.jsonl")
    if result.returncode != 0 or len(records) != expected:
        # A fresh Blender process makes a single retry safe and prevents a rare
        # importer crash from losing the rest of a multi-hour job.
        result = run(command, log_path=log_path.with_suffix(".retry.log"), check=False)
        records = jsonl_records(output_dir / "render-manifest.jsonl")
    errors = sum(1 for record in records if record.get("error"))
    missing = max(0, expected - len(records))
    if missing:
        source_records = jsonl_records(chunk_manifest)
        rendered_ids = {record.get("scan_id") or record.get("subject_id") for record in records}
        for source in source_records:
            scan_id = source.get("scan_id") or source.get("subject_id")
            if scan_id in rendered_ids:
                continue
            records.append(
                {
                    "schema_version": 1,
                    "subject_id": source.get("subject_id"),
                    "scan_id": scan_id,
                    "role": source.get("role"),
                    "region": source.get("region"),
                    "error": f"Blender worker exited {result.returncode} before this record",
                }
            )
        write_jsonl(output_dir / "render-manifest.jsonl", records)
        errors += missing
    return expected, expected - errors, errors


def upload_tree(local_path: Path, bucket: str, prefix: str) -> None:
    run(
        [
            "aws",
            "s3",
            "sync",
            str(local_path),
            f"s3://{bucket}/{prefix.rstrip('/')}/",
            "--only-show-errors",
            "--sse",
            "AES256",
        ]
    )


def execute(args: argparse.Namespace, status: StatusWriter) -> None:
    code_root = Path(__file__).resolve().parent
    raw_root = args.work_root / "raw" / "WEAR3DDATA"
    processing_root = args.work_root / "processed" / args.pipeline_id
    manifest_path = processing_root / "source-manifest-all-poses.jsonl"
    render_root = processing_root / "rendered"
    merged_manifest = processing_root / "render-manifest-all.jsonl"
    model_root = processing_root / "model"
    args.work_root.mkdir(parents=True, exist_ok=True)

    status.update(
        overall=2,
        stage="inventory",
        label="Downloading the verified 33.50 GB source vault",
        detail="AWS is copying every protected object from S3 onto the encrypted training disk.",
        stage_percent=20,
    )
    raw_root.mkdir(parents=True, exist_ok=True)
    run(
        [
            "aws",
            "s3",
            "sync",
            f"s3://{args.bucket}/{args.source_prefix.rstrip('/')}/",
            str(raw_root),
            "--only-show-errors",
        ]
    )
    object_count, source_bytes = local_inventory(raw_root)
    if object_count != EXPECTED_SOURCE_OBJECTS or source_bytes != EXPECTED_SOURCE_BYTES:
        raise RuntimeError(
            f"Full source verification failed: {object_count} objects/{source_bytes} bytes, "
            f"expected {EXPECTED_SOURCE_OBJECTS}/{EXPECTED_SOURCE_BYTES}"
        )
    status.finish_stage("inventory")
    status.update(
        overall=7,
        stage="manifest",
        label="Pairing every usable A, B, and C scan with its answers",
        detail="The 33.50 GB source is complete on the encrypted worker. Building subject-safe train, validation, and test records.",
        stage_percent=25,
    )
    run(
        [
            sys.executable,
            str(code_root / "prepare_wear3d_manifest.py"),
            "--usb-root",
            str(raw_root),
            "--output",
            str(manifest_path),
            "--limit",
            "0",
            "--all-poses",
        ],
        log_path=processing_root / "prepare-manifest.log",
    )
    source_records = jsonl_records(manifest_path)
    subjects = len({record["subject_id"] for record in source_records})
    if len(source_records) < 10_000:
        raise RuntimeError(f"Only {len(source_records)} usable A/B/C scan records; expected at least 10,000")
    status.status["dataset"].update(
        {
            "subjects": subjects,
            "sourceScans": 13_209,
            "targetExamples": len(source_records),
            "completedExamples": 0,
            "failedExamples": 0,
        }
    )
    status.finish_stage("manifest")
    status.update(
        overall=10,
        stage="render",
        label="Creating labeled 2D body examples",
        detail=f"Attempting all {len(source_records):,} usable A/B/C mesh records with {args.workers} isolated Blender workers.",
        stage_percent=0,
    )

    chunk_root = processing_root / "chunks"
    chunk_root.mkdir(parents=True, exist_ok=True)
    chunks: list[tuple[Path, Path, Path]] = []
    for start in range(0, len(source_records), args.chunk_size):
        chunk_index = start // args.chunk_size
        chunk_manifest = chunk_root / f"chunk-{chunk_index:04d}.jsonl"
        output_dir = render_root / f"chunk-{chunk_index:04d}"
        log_path = chunk_root / f"chunk-{chunk_index:04d}.log"
        write_jsonl(chunk_manifest, source_records[start : start + args.chunk_size])
        chunks.append((chunk_manifest, output_dir, log_path))

    blender = shutil.which("blender") or "/usr/bin/blender"
    xvfb = shutil.which("xvfb-run") or "/usr/bin/xvfb-run"
    completed = 0
    succeeded = 0
    failed = 0
    with concurrent.futures.ThreadPoolExecutor(max_workers=args.workers) as executor:
        futures = {
            executor.submit(
                render_chunk,
                blender,
                xvfb,
                code_root / "render_wear3d_pilot.py",
                chunk_manifest,
                output_dir,
                log_path,
            ): (chunk_manifest, output_dir)
            for chunk_manifest, output_dir, log_path in chunks
        }
        for future in concurrent.futures.as_completed(futures):
            attempted, ok, errors = future.result()
            completed += attempted
            succeeded += ok
            failed += errors
            status.status["dataset"].update(
                {"completedExamples": completed, "failedExamples": failed}
            )
            fraction = completed / len(source_records)
            status.update(
                overall=10 + fraction * 55,
                stage="render",
                label=f"Creating labeled 2D examples: {completed:,}/{len(source_records):,}",
                detail=(
                    f"{succeeded:,} masks and body-label records are ready; {failed:,} records reported errors. "
                    "Every source record is attempted and errors remain visible."
                ),
                stage_percent=fraction * 100,
            )

    rendered_records: list[dict[str, Any]] = []
    for _, output_dir, _ in chunks:
        rendered_records.extend(jsonl_records(output_dir / "render-manifest.jsonl"))
    write_jsonl(merged_manifest, rendered_records)
    successful_records = [record for record in rendered_records if not record.get("error")]
    if len(successful_records) < int(len(source_records) * 0.90):
        raise RuntimeError(
            f"Only {len(successful_records)}/{len(source_records)} renders succeeded; refusing to train"
        )
    status.finish_stage("render")
    status.update(
        overall=67,
        stage="train",
        label="Saving the full labeled set before GPU training",
        detail=f"{len(successful_records):,} successful examples are being saved to S3 so preprocessing is reusable.",
        stage_percent=0,
    )
    upload_tree(render_root, args.bucket, f"processed/{args.pipeline_id}/rendered")
    run(
        [
            "aws",
            "s3",
            "cp",
            str(manifest_path),
            f"s3://{args.bucket}/manifests/{args.pipeline_id}/source-manifest-all-poses.jsonl",
            "--sse",
            "AES256",
            "--only-show-errors",
        ]
    )
    run(
        [
            "aws",
            "s3",
            "cp",
            str(merged_manifest),
            f"s3://{args.bucket}/processed/{args.pipeline_id}/render-manifest-all.jsonl",
            "--sse",
            "AES256",
            "--only-show-errors",
        ]
    )
    if args.stop_after_render:
        status.update(
            state="waiting",
            overall=70,
            stage="train",
            label="All CPU preprocessing is saved — waiting for a free GPU",
            detail=(
                f"{len(successful_records):,} labeled mask examples are safely stored in S3. "
                "The CPU worker will terminate; GPU training can start later without repeating this work."
            ),
            stage_percent=0,
            stage_state="queued",
        )
        return
    status.update(
        overall=70,
        stage="train",
        label="Starting GPU training",
        detail=(
            f"Training on {len(successful_records):,} synthetic front body masks. "
            "Inputs are mask + height + weight + gender; outputs cover body rows, limbs, and all usable numeric measurements."
        ),
        stage_percent=0,
    )
    run(
        [
            args.train_python,
            str(code_root / "train_mask_measurements.py"),
            "--manifest",
            str(merged_manifest),
            "--output-dir",
            str(model_root),
            "--epochs",
            str(args.epochs),
            "--status-bucket",
            args.bucket,
            "--status-key",
            args.status_key,
            "--pipeline-id",
            args.pipeline_id,
            "--workers",
            "2",
        ],
        log_path=processing_root / "train.log",
    )
    status.status = StatusWriter(args)._load()
    status.finish_stage("train")
    status.update(
        overall=96,
        stage="evaluate",
        label="Saving the unseen-subject test and SDK artifacts",
        detail="The best validation checkpoint is being tested only on people excluded from training.",
        stage_percent=70,
    )
    upload_tree(model_root, args.bucket, f"models/{args.pipeline_id}")
    upload_tree(processing_root / "chunks", args.bucket, f"reports/{args.pipeline_id}/worker-logs")
    for report_name in ("prepare-manifest.log", "train.log"):
        report_path = processing_root / report_name
        if report_path.exists():
            run(
                [
                    "aws",
                    "s3",
                    "cp",
                    str(report_path),
                    f"s3://{args.bucket}/reports/{args.pipeline_id}/{report_name}",
                    "--sse",
                    "AES256",
                    "--only-show-errors",
                ]
            )
    status.finish_stage("evaluate")
    for item in status.status["stages"]:
        if item["key"] == "real_photos":
            item.update({"state": "blocked", "percent": 0})
    status.update(
        state="complete",
        overall=100,
        stage="real_photos",
        label="Synthetic WEAR training complete",
        detail=(
            "The model and unseen-WEAR test report are saved. Next required gate: test paired real customer photos "
            "before putting this model in the SDK."
        ),
        stage_percent=0,
        stage_state="blocked",
    )


def main() -> None:
    args = parse_args()
    status = StatusWriter(args)
    try:
        execute(args, status)
    except Exception as error:
        traceback.print_exc()
        status.status["state"] = "failed"
        status.status["currentStageLabel"] = "AWS training stopped with an error"
        status.status["detail"] = f"{type(error).__name__}: {error}"
        for item in status.status["stages"]:
            if item["key"] == status.status.get("currentStage"):
                item["state"] = "failed"
        status.write()
        # Preserve the exact failing command output before the encrypted worker
        # terminates, so a retry can be fixed without guessing.
        report_prefix = f"reports/{args.pipeline_id}/failure"
        for report_path in (args.work_root / "processed" / args.pipeline_id).glob("*.log"):
            try:
                run(
                    [
                        "aws",
                        "s3",
                        "cp",
                        str(report_path),
                        f"s3://{args.bucket}/{report_prefix}/{report_path.name}",
                        "--sse",
                        "AES256",
                        "--only-show-errors",
                    ],
                    check=False,
                )
            except Exception:
                pass
        raise


if __name__ == "__main__":
    main()
