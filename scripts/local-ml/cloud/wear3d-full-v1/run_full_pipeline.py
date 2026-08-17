#!/usr/bin/env python3
"""Run the bounded full WEAR pipeline on one encrypted AWS GPU worker."""

from __future__ import annotations

import argparse
import concurrent.futures
import json
import math
import os
import shutil
import subprocess
import sys
import traceback
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import boto3


EXPECTED_SOURCE_BYTES = 33_497_610_937
EXPECTED_SOURCE_OBJECTS = 22_150
EXPECTED_WORKING_BYTES = 12_577_704_490
EXPECTED_WORKING_OBJECTS = 13_170
CORE_ROWS = ("neck", "chest", "waist", "hips")
SEGMENT_POINT_COUNTS = {
    "shoulders": 2,
    "right_sleeve": 3,
    "left_sleeve": 3,
    "right_inseam": 2,
    "left_inseam": 2,
}
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
    parser.add_argument(
        "--processed-source-pipeline-id",
        default=None,
        help="Reuse a previously quality-gated render set while writing a new model version.",
    )
    parser.add_argument("--work-root", type=Path, default=Path("/opt/primestyle/wear3d"))
    parser.add_argument("--workers", type=int, default=3)
    parser.add_argument("--chunk-size", type=int, default=36)
    parser.add_argument("--epochs", type=int, default=24)
    parser.add_argument("--train-python", default=sys.executable)
    parser.add_argument("--instance-id", default=None)
    parser.add_argument("--instance-type", default="g4dn.xlarge")
    parser.add_argument("--max-runtime-hours", type=int, default=10)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument(
        "--stop-after-render",
        action="store_true",
        help="Prepare every mesh on CPU, save outputs to S3, and wait for a separate GPU worker.",
    )
    mode.add_argument(
        "--train-only",
        action="store_true",
        help="Download the already-validated masks and train without downloading or rendering the 33.50 GB raw vault.",
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


def s3_inventory(bucket: str, prefix: str) -> tuple[int, int]:
    count = 0
    size = 0
    paginator = boto3.client("s3").get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=bucket, Prefix=prefix.rstrip("/") + "/"):
        for item in page.get("Contents", []):
            count += 1
            size += int(item["Size"])
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


def render_quality_report(
    source_records: list[dict[str, Any]],
    rendered_records: list[dict[str, Any]],
) -> dict[str, Any]:
    """Audit every generated target before any GPU is allowed to see it."""
    source_ids = [str(record.get("scan_id", "")) for record in source_records]
    rendered_ids = [str(record.get("scan_id", "")) for record in rendered_records]
    successful = [record for record in rendered_records if not record.get("error")]

    source_duplicates = sorted(scan_id for scan_id, count in Counter(source_ids).items() if count > 1)
    rendered_duplicates = sorted(scan_id for scan_id, count in Counter(rendered_ids).items() if count > 1)
    missing_ids = sorted(set(source_ids) - set(rendered_ids))
    unexpected_ids = sorted(set(rendered_ids) - set(source_ids))
    invalid_pose_ids = []
    invalid_mask_ids = []
    invalid_coordinate_ids = []
    missing_segment_ids = []
    core_row_order_violations = []
    underbust_order_violations = []
    row_accepted = {row: 0 for row in (*CORE_ROWS, "underbust")}
    row_eligible = {row: len(successful) for row in CORE_ROWS}
    row_eligible["underbust"] = sum(
        1
        for record in successful
        if record.get("gender") == "female"
        and (record.get("measurements_mm") or {}).get("underbust_circumference_mm") is not None
    )
    segment_valid = {name: 0 for name in SEGMENT_POINT_COUNTS}
    cleanup_removed = []
    mask_fractions = []

    for record in successful:
        scan_id = str(record.get("scan_id", ""))
        if (
            record.get("pose") != "standing_neutral"
            or record.get("training_pose_valid") is not True
            or not scan_id.endswith("-A")
            or record.get("landmark_targets_valid") is not True
        ):
            invalid_pose_ids.append(scan_id)

        cleanup = record.get("mask_cleanup") or {}
        retained = cleanup.get("retained_pixels")
        removed = cleanup.get("removed_pixels")
        render = record.get("render") or {}
        total_pixels = int(render.get("width") or 0) * int(render.get("height") or 0)
        if (
            cleanup.get("method") != "largest-connected-silhouette"
            or not isinstance(retained, int)
            or retained <= 0
            or total_pixels <= 0
        ):
            invalid_mask_ids.append(scan_id)
        else:
            fraction = retained / total_pixels
            mask_fractions.append(fraction)
            cleanup_removed.append(int(removed or 0))
            if not 0.05 <= fraction <= 0.60:
                invalid_mask_ids.append(scan_id)

        rows = record.get("rows") or {}
        row_y: dict[str, float] = {}
        eligible_rows = list(CORE_ROWS)
        if (
            record.get("gender") == "female"
            and (record.get("measurements_mm") or {}).get("underbust_circumference_mm") is not None
        ):
            eligible_rows.append("underbust")
        for row_name in eligible_rows:
            row = rows.get(row_name) or {}
            value = row.get("y_norm")
            if row.get("accepted") is True and isinstance(value, (int, float)) and math.isfinite(value):
                row_accepted[row_name] += 1
                row_y[row_name] = float(value)
                if not 0.0 < float(value) < 1.0:
                    invalid_coordinate_ids.append(f"{scan_id}:{row_name}")

        core_order = [row_y.get(name) for name in CORE_ROWS]
        if all(value is not None for value in core_order) and not all(
            left < right for left, right in zip(core_order, core_order[1:])
        ):
            core_row_order_violations.append(scan_id)
        underbust_y = row_y.get("underbust")
        if underbust_y is not None and not (
            row_y.get("chest", -1.0) < underbust_y < row_y.get("waist", 2.0)
        ):
            underbust_order_violations.append(scan_id)

        segments = record.get("segments") or {}
        for name, expected_points in SEGMENT_POINT_COUNTS.items():
            points = segments.get(name) or []
            valid = len(points) == expected_points and all(
                isinstance(point, dict)
                and point.get("visible") is True
                and all(
                    isinstance(point.get(axis), (int, float))
                    and math.isfinite(point[axis])
                    and 0.0 <= point[axis] <= 1.0
                    for axis in ("x", "y")
                )
                for point in points
            )
            if valid:
                segment_valid[name] += 1
            else:
                # Missing or off-frame landmarks reduce the coverage score;
                # malformed numeric coordinates are a separate hard failure.
                missing_segment_ids.append(f"{scan_id}:{name}")
                for point in points:
                    if point is None or (
                        isinstance(point, dict) and point.get("visible") is False
                    ):
                        continue
                    if not isinstance(point, dict) or any(
                        not isinstance(point.get(axis), (int, float))
                        or not math.isfinite(point[axis])
                        for axis in ("x", "y")
                    ):
                        invalid_coordinate_ids.append(f"{scan_id}:{name}")
                        break

    successful_count = len(successful)
    success_rate = successful_count / max(len(source_records), 1)
    row_coverage = {
        row: row_accepted[row] / max(row_eligible[row], 1)
        for row in row_accepted
    }
    segment_coverage = {
        name: count / max(successful_count, 1)
        for name, count in segment_valid.items()
    }
    gates = {
        "source_ids_unique": not source_duplicates,
        "render_ids_exact": not rendered_duplicates and not missing_ids and not unexpected_ids,
        "render_success_at_least_98_pct": success_rate >= 0.98,
        "standing_a_only": not invalid_pose_ids,
        "clean_body_masks": not invalid_mask_ids,
        "valid_coordinates": not invalid_coordinate_ids,
        "core_row_order_at_least_99_5_pct": len(core_row_order_violations)
        <= max(1, int(successful_count * 0.005)),
        "underbust_row_order_at_least_99_5_pct": len(underbust_order_violations)
        <= max(1, int(row_eligible["underbust"] * 0.005)),
        "core_row_coverage_at_least_98_pct": all(row_coverage[row] >= 0.98 for row in CORE_ROWS),
        "female_underbust_coverage_at_least_95_pct": row_coverage["underbust"] >= 0.95,
        "segment_coverage_at_least_98_pct": all(value >= 0.98 for value in segment_coverage.values()),
    }
    return {
        "schema_version": 1,
        "training_scope": "neutral standing A scans only",
        "source_records": len(source_records),
        "rendered_records": len(rendered_records),
        "successful_records": successful_count,
        "failed_records": len(rendered_records) - successful_count,
        "success_rate": round(success_rate, 6),
        "row_coverage": {key: round(value, 6) for key, value in row_coverage.items()},
        "segment_coverage": {key: round(value, 6) for key, value in segment_coverage.items()},
        "mask_fraction": {
            "minimum": round(min(mask_fractions), 6) if mask_fractions else None,
            "maximum": round(max(mask_fractions), 6) if mask_fractions else None,
            "mean": round(sum(mask_fractions) / len(mask_fractions), 6) if mask_fractions else None,
        },
        "removed_mask_pixels": {
            "minimum": min(cleanup_removed) if cleanup_removed else None,
            "maximum": max(cleanup_removed) if cleanup_removed else None,
        },
        "issues": {
            "source_duplicates": source_duplicates[:20],
            "rendered_duplicates": rendered_duplicates[:20],
            "missing_ids": missing_ids[:20],
            "unexpected_ids": unexpected_ids[:20],
            "invalid_pose_ids": invalid_pose_ids[:20],
            "invalid_mask_ids": invalid_mask_ids[:20],
            "invalid_coordinate_ids": invalid_coordinate_ids[:20],
            "missing_segment_ids": missing_segment_ids[:20],
            "core_row_order_violations": core_row_order_violations[:20],
            "underbust_order_violations": underbust_order_violations[:20],
        },
        "issue_counts": {
            "invalid_pose": len(invalid_pose_ids),
            "invalid_mask": len(invalid_mask_ids),
            "invalid_coordinate": len(invalid_coordinate_ids),
            "missing_segment": len(missing_segment_ids),
            "core_row_order": len(core_row_order_violations),
            "underbust_order": len(underbust_order_violations),
        },
        "gates": gates,
        "passed": all(gates.values()),
    }


def execute_train_only(args: argparse.Namespace, status: StatusWriter) -> None:
    """Train from the reusable, quality-gated CPU output without raw-data work."""
    code_root = Path(__file__).resolve().parent
    processed_source_pipeline_id = args.processed_source_pipeline_id or args.pipeline_id
    processing_root = args.work_root / "processed" / args.pipeline_id
    source_processing_root = args.work_root / "processed" / processed_source_pipeline_id
    render_root = source_processing_root / "rendered"
    merged_manifest = source_processing_root / "render-manifest-all.jsonl"
    quality_path = source_processing_root / "render-quality-report.json"
    model_root = processing_root / "model"
    processing_root.mkdir(parents=True, exist_ok=True)
    source_processing_root.mkdir(parents=True, exist_ok=True)

    status.update(
        overall=70,
        stage="train",
        label="Downloading the validated standing-body labels",
        detail="This GPU downloads only reusable masks and labels; it does not download or reprocess the 33.50 GB raw vault.",
        stage_percent=1,
    )
    render_root.mkdir(parents=True, exist_ok=True)
    run(
        [
            "aws",
            "s3",
            "sync",
            f"s3://{args.bucket}/processed/{processed_source_pipeline_id}/rendered/",
            str(render_root),
            "--only-show-errors",
        ]
    )
    for key, destination in (
        (f"processed/{processed_source_pipeline_id}/render-manifest-all.jsonl", merged_manifest),
        (f"reports/{processed_source_pipeline_id}/render-quality-report.json", quality_path),
    ):
        run(
            [
                "aws",
                "s3",
                "cp",
                f"s3://{args.bucket}/{key}",
                str(destination),
                "--only-show-errors",
            ]
        )

    quality = json.loads(quality_path.read_text(encoding="utf-8"))
    if quality.get("passed") is not True:
        raise RuntimeError("Saved preprocessing did not pass the render quality gate")
    records = [record for record in jsonl_records(merged_manifest) if not record.get("error")]
    if len(records) < 4_000 or len(records) != quality.get("successful_records"):
        raise RuntimeError(
            f"Saved manifest mismatch: {len(records)} successful records versus quality report "
            f"{quality.get('successful_records')}"
        )
    status.status["dataset"].update(
        {
            "subjects": quality.get("source_records", len(records)),
            "targetExamples": quality.get("source_records", len(records)),
            "completedExamples": len(records),
            "failedExamples": quality.get("failed_records", 0),
        }
    )
    missing_masks = [record.get("mask") for record in records if not Path(str(record.get("mask", ""))).exists()]
    if missing_masks:
        raise RuntimeError(f"Saved preprocessing is missing {len(missing_masks)} masks; examples: {missing_masks[:5]}")

    status.update(
        overall=71,
        stage="train",
        label="Starting GPU training from approved labels",
        detail=(
            f"{len(records):,} neutral standing-A examples passed the data audit. "
            "The GPU is now learning body-row positions, landmarks, and non-duplicate measurements."
        ),
        stage_percent=2,
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
        label="Testing only on people excluded from training",
        detail="The best validation checkpoint is being checked against the baseline and strict synthetic-error limits.",
        stage_percent=70,
    )
    upload_tree(model_root, args.bucket, f"models/{args.pipeline_id}")
    run(
        [
            "aws",
            "s3",
            "cp",
            str(processing_root / "train.log"),
            f"s3://{args.bucket}/reports/{args.pipeline_id}/train.log",
            "--sse",
            "AES256",
            "--only-show-errors",
        ]
    )
    test_metrics = json.loads((model_root / "test-metrics.json").read_text(encoding="utf-8"))
    evaluation_gate = test_metrics.get("evaluation_gate") or {}
    if evaluation_gate.get("synthetic_candidate_passed") is not True:
        raise RuntimeError(
            "Unseen-subject evaluation rejected this checkpoint: "
            f"{evaluation_gate.get('failures') or ['missing evaluation gate']}"
        )

    status.finish_stage("evaluate")
    for item in status.status["stages"]:
        if item["key"] == "real_photos":
            item.update({"state": "blocked", "percent": 0})
    status.update(
        state="complete",
        overall=100,
        stage="real_photos",
        label="Synthetic WEAR candidate passed",
        detail=(
            "The checkpoint beat the baseline on unseen WEAR people and is saved. It is not SDK-ready: "
            "paired real customer-photo validation is still required."
        ),
        stage_percent=0,
        stage_state="blocked",
    )


def execute(args: argparse.Namespace, status: StatusWriter) -> None:
    if args.train_only:
        execute_train_only(args, status)
        return
    code_root = Path(__file__).resolve().parent
    raw_root = args.work_root / "raw" / "WEAR3DDATA"
    processing_root = args.work_root / "processed" / args.pipeline_id
    manifest_path = processing_root / "source-manifest-standing-a.jsonl"
    render_root = processing_root / "rendered"
    merged_manifest = processing_root / "render-manifest-all.jsonl"
    model_root = processing_root / "model"
    args.work_root.mkdir(parents=True, exist_ok=True)

    status.update(
        overall=2,
        stage="inventory",
        label="Verifying all 33.50 GB, then loading the standing set",
        detail="AWS verifies every protected S3 object, then downloads only neutral-A meshes plus every landmark and data table.",
        stage_percent=20,
    )
    raw_root.mkdir(parents=True, exist_ok=True)
    object_count, source_bytes = s3_inventory(args.bucket, args.source_prefix)
    if object_count != EXPECTED_SOURCE_OBJECTS or source_bytes != EXPECTED_SOURCE_BYTES:
        raise RuntimeError(
            f"Full S3 source verification failed: {object_count} objects/{source_bytes} bytes, "
            f"expected {EXPECTED_SOURCE_OBJECTS}/{EXPECTED_SOURCE_BYTES}"
        )
    run(
        [
            "aws",
            "s3",
            "sync",
            f"s3://{args.bucket}/{args.source_prefix.rstrip('/')}/",
            str(raw_root),
            "--only-show-errors",
            "--exclude",
            "*",
            "--include",
            "*a.ply.gz",
            "--include",
            "*A.ply.gz",
            "--include",
            "*a.PLY.GZ",
            "--include",
            "*A.PLY.GZ",
            "--include",
            "*.lnd",
            "--include",
            "*.LND",
            "--include",
            "*.xls",
            "--include",
            "*.XLS",
            "--include",
            "*.xlsx",
            "--include",
            "*.XLSX",
            "--include",
            "*.csv",
            "--include",
            "*.CSV",
        ]
    )
    working_count, working_bytes = local_inventory(raw_root)
    if working_count != EXPECTED_WORKING_OBJECTS or working_bytes != EXPECTED_WORKING_BYTES:
        raise RuntimeError(
            f"Standing working-set verification failed: {working_count} objects/{working_bytes} bytes, "
            f"expected {EXPECTED_WORKING_OBJECTS}/{EXPECTED_WORKING_BYTES}"
        )
    status.finish_stage("inventory")
    status.update(
        overall=7,
        stage="manifest",
        label="Pairing each neutral standing-A scan with its answers",
        detail="The full S3 vault passed verification and the 12.58 GB standing working set is complete. Seated B/C scans are excluded before splitting.",
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
        ],
        log_path=processing_root / "prepare-manifest.log",
    )
    source_records = jsonl_records(manifest_path)
    subjects = len({record["subject_id"] for record in source_records})
    if len(source_records) < 4_000:
        raise RuntimeError(f"Only {len(source_records)} usable standing-A scan records; expected at least 4,000")
    invalid_pose_records = [
        record.get("scan_id")
        for record in source_records
        if record.get("pose") != "standing_neutral"
        or record.get("training_pose_valid") is not True
        or not str(record.get("scan_id", "")).endswith("-A")
        or record.get("landmark_targets_valid") is not True
    ]
    if invalid_pose_records:
        raise RuntimeError(
            f"Standing-only gate rejected {len(invalid_pose_records)} records; "
            f"examples: {invalid_pose_records[:5]}"
        )
    roles_by_subject: dict[str, set[str]] = {}
    for record in source_records:
        roles_by_subject.setdefault(record["subject_id"], set()).add(record["role"])
    role_conflicts = [subject for subject, roles in roles_by_subject.items() if len(roles) != 1]
    if role_conflicts:
        raise RuntimeError(f"Subject split leakage detected for: {role_conflicts[:5]}")
    if len(source_records) != len(roles_by_subject):
        raise RuntimeError(
            f"Expected one standing scan per person, got {len(source_records)} records "
            f"for {len(roles_by_subject)} people"
        )
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
        detail=f"Attempting all {len(source_records):,} neutral standing-A meshes with {args.workers} isolated Blender workers.",
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
    quality = render_quality_report(source_records, rendered_records)
    quality_path = processing_root / "render-quality-report.json"
    quality_path.write_text(json.dumps(quality, indent=2) + "\n", encoding="utf-8")
    run(
        [
            "aws",
            "s3",
            "cp",
            str(quality_path),
            f"s3://{args.bucket}/reports/{args.pipeline_id}/render-quality-report.json",
            "--sse",
            "AES256",
            "--only-show-errors",
        ]
    )
    status.update(
        overall=66,
        stage="render",
        label="Saving every generated label before the final audit",
        detail=(
            f"{len(successful_records):,} generated masks, labels, and worker logs are being saved to S3. "
            "They remain inspectable even if the quality gate blocks training."
        ),
        stage_percent=100,
    )
    upload_tree(render_root, args.bucket, f"processed/{args.pipeline_id}/rendered")
    upload_tree(chunk_root, args.bucket, f"reports/{args.pipeline_id}/worker-logs")
    run(
        [
            "aws",
            "s3",
            "cp",
            str(manifest_path),
            f"s3://{args.bucket}/manifests/{args.pipeline_id}/source-manifest-standing-a.jsonl",
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
    if not quality["passed"]:
        failed_gates = [name for name, passed in quality["gates"].items() if not passed]
        raise RuntimeError(f"Render quality gate failed before training: {failed_gates}")
    status.finish_stage("render")
    status.update(
        overall=67,
        stage="train",
        label="The full labeled set passed its audit",
        detail=f"{len(successful_records):,} approved standing-body examples are safely reusable in S3.",
        stage_percent=0,
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
            "Inputs are mask + height + weight + BMI + gender; outputs cover every useful standing WEAR measurement, "
            "all five body-row positions/edges/depth, projected landmarks, shoulders, sleeves, and inseams."
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
    test_metrics = json.loads((model_root / "test-metrics.json").read_text(encoding="utf-8"))
    evaluation_gate = test_metrics.get("evaluation_gate") or {}
    if evaluation_gate.get("synthetic_candidate_passed") is not True:
        raise RuntimeError(
            "Unseen-subject evaluation rejected this checkpoint: "
            f"{evaluation_gate.get('failures') or ['missing evaluation gate']}"
        )
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
