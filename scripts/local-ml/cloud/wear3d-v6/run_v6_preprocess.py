#!/usr/bin/env python3
"""Render and audit the complete standing WEAR v6 set on a CPU worker."""

from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
import hashlib
import json
import math
import os
from pathlib import Path
import shutil
import statistics
import subprocess
import time
from typing import Any

import boto3

from audit_wear3d_labels_cloud import diverse_visual_records, record_errors


EXPECTED_RAW_OBJECTS = 22_150
EXPECTED_RAW_BYTES = 33_497_610_937
VIEW_IDS = (
    "front-50",
    "left-35",
    "right-35",
    "left-50",
    "right-50",
    "high-wide",
    "low-wide",
    "left-tele",
    "right-tele",
)
LEGACY_RENDERER_REVISION = "protocol-aware-closed-torso-xvfb-v6-192x256-16x4"
RENDERER_REVISION = "protocol-aware-closed-torso-xvfb-v6-source-height-sparse-landmarks-r5"
MIN_UNDERBUST_CHEST_SEPARATION_MM = 10.0
SOURCE_ROW_HEIGHT_EPSILON_MM = 0.01
VERTICAL_ALIGNMENT_ANCHORS = (
    ("Lt. Acromion", "acromial_height_standing_left_mm"),
    ("Rt. Acromion", "acromial_height_standing_right_mm"),
    ("Lt. Axilla, Ant", "axilla_height_left_mm"),
    ("Rt. Axilla, Ant", "axilla_height_right_mm"),
    ("Cervicale", "cervicale_height_mm"),
    ("Lt. Infraorbitale", "infraorbitale_height_standing_left_mm"),
    ("Rt. Infraorbitale", "infraorbitale_height_standing_right_mm"),
    ("Suprasternale", "suprasternale_height_mm"),
    ("Lt. Trochanterion", "trochanterion_height_left_mm"),
    ("Rt. Trochanterion", "trochanterion_height_right_mm"),
)
MESH_GEOMETRY_TAPE_KEYS = (
    "neck_base_circumference_mm",
    "chest_circumference_mm",
    "waist_circumference_mm",
    "hip_circumference_mm",
)
MESH_GEOMETRY_HEIGHT_KEYS = (
    "waist_height_mm",
    "hip_max_height_mm",
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--bucket", required=True)
    parser.add_argument("--pipeline-id", required=True)
    parser.add_argument("--status-key", required=True)
    parser.add_argument("--source-manifest-key", required=True)
    parser.add_argument("--root", type=Path, default=Path("/opt/primestyle/v6"))
    parser.add_argument("--code-root", type=Path, default=Path("/opt/primestyle/code"))
    parser.add_argument("--workers", type=int, default=8)
    parser.add_argument("--chunk-size", type=int, default=12)
    parser.add_argument("--views-per-subject", type=int, default=9)
    parser.add_argument("--render-retries", type=int, default=1)
    parser.add_argument(
        "--recovery",
        action="store_true",
        help="Resume from clean S3 shards and rerender only failed or missing-source-geometry shards.",
    )
    return parser.parse_args()


def now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


class Status:
    def __init__(self, bucket: str, key: str):
        self.bucket, self.key = bucket, key
        self.s3 = boto3.client("s3")

    def update(self, *, overall: float, stage: str, label: str, detail: str, stage_index: int, stage_percent: float, dataset: dict[str, Any] | None = None, state: str = "running"):
        response = self.s3.get_object(Bucket=self.bucket, Key=self.key)
        payload = json.loads(response["Body"].read())
        payload.update({"state": state, "overallPercent": round(overall, 2), "currentStage": stage, "currentStageLabel": label, "detail": detail, "updatedAt": now()})
        if dataset:
            payload.setdefault("dataset", {}).update(dataset)
        for index, item in enumerate(payload.get("stages", [])):
            if index < stage_index:
                item.update({"state": "complete", "percent": 100})
            elif index == stage_index:
                item.update({"state": "running", "percent": round(stage_percent, 2)})
        self.s3.put_object(Bucket=self.bucket, Key=self.key, Body=(json.dumps(payload, indent=2) + "\n").encode(), ContentType="application/json", ServerSideEncryption="AES256")


def run(*arguments: str) -> None:
    subprocess.run(list(arguments), check=True)


def run_with_retries(*arguments: str, attempts: int = 3) -> None:
    last_error: subprocess.CalledProcessError | None = None
    for attempt in range(1, attempts + 1):
        try:
            run(*arguments)
            return
        except subprocess.CalledProcessError as error:
            last_error = error
            if attempt < attempts:
                time.sleep(float(attempt * 2))
    if last_error is not None:
        raise last_error


def chunk_digest(records: list[dict[str, Any]], views_per_subject: int, renderer_revision: str = RENDERER_REVISION) -> str:
    payload = {
        "records": [record.get("scan_id", record.get("subject_id")) for record in records],
        "views_per_subject": views_per_subject,
        "renderer_revision": renderer_revision,
    }
    return hashlib.sha256(json.dumps(payload, sort_keys=True).encode()).hexdigest()


def finite(value: Any) -> float | None:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if math.isfinite(number) else None


def landmark_z_m(record: dict[str, Any], name: str) -> float | None:
    source = record.get("landmarks_3d_mm") or {}
    lowered = {key.lower().rstrip("#").strip(): value for key, value in source.items()}
    coordinates = lowered.get(name.lower())
    if not isinstance(coordinates, (list, tuple)) or len(coordinates) < 3:
        return None
    z_mm = finite(coordinates[2])
    return z_mm / 1000.0 if z_mm is not None else None


def source_vertical_offset_m(record: dict[str, Any]) -> float | None:
    sources = {**record.get("measurements_mm", {}), **record.get("extracted_standing_mm", {})}
    offsets = []
    for landmark_name, height_key in VERTICAL_ALIGNMENT_ANCHORS:
        landmark_z = landmark_z_m(record, landmark_name)
        height_mm = finite(sources.get(height_key))
        if landmark_z is not None and height_mm is not None:
            offsets.append(height_mm / 1000.0 - landmark_z)
    if len(offsets) < 2:
        return None
    median = float(statistics.median(offsets))
    stable = [offset for offset in offsets if abs(offset - median) <= 0.025]
    return float(statistics.median(stable)) if len(stable) >= 2 else None


def source_underbust_requires_mask(record: dict[str, Any]) -> bool:
    sources = {**record.get("measurements_mm", {}), **record.get("extracted_standing_mm", {})}
    if finite(sources.get("underbust_circumference_mm")) is None:
        return False
    substernale_z = landmark_z_m(record, "Substernale")
    vertical_offset = source_vertical_offset_m(record)
    chest_height_mm = finite(sources.get("chest_height_standing_mm"))
    if substernale_z is None or vertical_offset is None or chest_height_mm is None:
        return False
    underbust_height_mm = (substernale_z + vertical_offset) * 1000.0
    return (
        underbust_height_mm + SOURCE_ROW_HEIGHT_EPSILON_MM
        >= chest_height_mm - MIN_UNDERBUST_CHEST_SEPARATION_MM
    )


def expected_source_row_mask_subjects(records: list[dict[str, Any]]) -> dict[str, int]:
    underbust = {
        str(record.get("subject_id"))
        for record in records
        if source_underbust_requires_mask(record)
    }
    waist = set()
    for record in records:
        sources = {**record.get("measurements_mm", {}), **record.get("extracted_standing_mm", {})}
        waist_height = finite(sources.get("waist_height_mm"))
        hip_height = finite(sources.get("hip_max_height_mm"))
        waist_tape = finite(sources.get("waist_circumference_mm"))
        if (
            waist_tape is not None
            and waist_height is not None
            and hip_height is not None
            and waist_height <= hip_height + SOURCE_ROW_HEIGHT_EPSILON_MM
        ):
            waist.add(str(record.get("subject_id")))
    return {"underbust": len(underbust), "waist": len(waist)}


def requires_legacy_geometry_recovery(records: list[dict[str, Any]]) -> bool:
    """Return true when a legacy shard discarded usable raw-mesh geometry."""
    for record in records:
        sources = {**record.get("measurements_mm", {}), **record.get("extracted_standing_mm", {})}
        if any(sources.get(key) is None for key in (*MESH_GEOMETRY_TAPE_KEYS, *MESH_GEOMETRY_HEIGHT_KEYS)):
            return True
        # Legacy shards aligned some NL rows to mesh minimum instead of the
        # exact WEAR landmark-height anchors. Those rows can look valid inside
        # the saved manifest while contradicting the untouched source record.
        if source_underbust_requires_mask(record):
            return True
    return False


def manifest_requires_label_recovery(path: Path) -> bool:
    """Revisit a completed legacy shard only when its saved labels fail v6.

    This makes recovery content-addressed and targeted: clean RGB/mask shards
    remain immutable, while pipeline errors and anatomically inverted rows are
    rerendered with the current source-grounded renderer.
    """
    try:
        records = [
            json.loads(line)
            for line in path.read_text(encoding="utf-8").splitlines()
            if line.strip()
        ]
    except (OSError, json.JSONDecodeError):
        return True
    if not records:
        return True
    for record in records:
        if record_errors(record):
            return True
        rows = record.get("rows") or {}
        chest_height = (rows.get("chest") or {}).get("slice_height_mm")
        underbust_height = (rows.get("underbust") or {}).get("slice_height_mm")
        waist_height = (rows.get("waist") or {}).get("slice_height_mm")
        hip_height = (rows.get("hips") or {}).get("slice_height_mm")
        try:
            if (
                chest_height is not None
                and underbust_height is not None
                and float(underbust_height) + SOURCE_ROW_HEIGHT_EPSILON_MM
                >= float(chest_height) - MIN_UNDERBUST_CHEST_SEPARATION_MM
            ):
                return True
            if waist_height is not None and hip_height is not None and float(waist_height) <= float(hip_height):
                return True
        except (TypeError, ValueError):
            return True
    return False


def failure_records(record: dict[str, Any], views_per_subject: int, detail: str) -> list[dict[str, Any]]:
    scan_id = record.get("scan_id", record.get("subject_id"))
    view_ids = VIEW_IDS[:views_per_subject]
    if len(view_ids) < views_per_subject:
        view_ids = (*view_ids, *(f"extra-{index:02d}" for index in range(len(view_ids), views_per_subject)))
    return [
        {
            "schema_version": 2,
            "pipeline_id": "wear3d-standing-multiview-v6",
            "sample_id": f"{scan_id}-{view_id}",
            "subject_id": record.get("subject_id"),
            "scan_id": scan_id,
            "view_id": view_id,
            "role": record.get("role"),
            "region": record.get("region"),
            "error": detail,
        }
        for view_id in view_ids
    ]


def inventory(s3, bucket: str) -> tuple[int, int]:
    count = 0
    size = 0
    paginator = s3.get_paginator("list_objects_v2")
    for page in paginator.paginate(Bucket=bucket, Prefix="raw/"):
        for item in page.get("Contents", []):
            count += 1
            size += int(item["Size"])
    return count, size


def write_jsonl(path: Path, records: list[dict[str, Any]]) -> None:
    path.write_text("".join(json.dumps(record, separators=(",", ":"), sort_keys=True) + "\n" for record in records), encoding="utf-8")


def main() -> None:
    args = parse_args()
    args.root.mkdir(parents=True, exist_ok=True)
    s3 = boto3.client("s3")
    status = Status(args.bucket, args.status_key)
    progress = {
        "inventory_start": 70.0 if args.recovery else 2.0,
        "inventory_done": 70.5 if args.recovery else 6.0,
        "manifest_start": 70.7 if args.recovery else 8.0,
        "manifest_done": 71.0 if args.recovery else 18.0,
        "render_start": 71.0 if args.recovery else 20.0,
        "render_span": 2.0 if args.recovery else 48.0,
        "audit_start": 73.0 if args.recovery else 69.0,
    }
    status.update(
        overall=progress["inventory_start"],
        stage="render-v6" if args.recovery else "inventory-v6",
        label="Checking saved shards before label recovery" if args.recovery else "Checking all 33.5 GB in S3",
        detail="Only failed shards and the few legacy shards that discarded valid mesh geometry will be regenerated." if args.recovery else "Counting every protected WEAR object before rendering.",
        stage_index=2 if args.recovery else 0,
        stage_percent=96 if args.recovery else 10,
    )
    object_count, byte_count = inventory(s3, args.bucket)
    if object_count != EXPECTED_RAW_OBJECTS or byte_count != EXPECTED_RAW_BYTES:
        raise RuntimeError(f"Protected vault mismatch: objects={object_count} bytes={byte_count}")
    status.update(overall=progress["inventory_done"], stage="render-v6" if args.recovery else "inventory-v6", label="Protected WEAR vault verified", detail=f"Verified {object_count:,} objects and {byte_count / 1e9:.2f} GB.", stage_index=2 if args.recovery else 0, stage_percent=97 if args.recovery else 100)

    raw_root = args.root.parent / "wear3d" / "raw"
    raw_root.mkdir(parents=True, exist_ok=True)
    status.update(overall=progress["manifest_start"], stage="render-v6" if args.recovery else "manifest-v6", label="Downloading standing meshes for recovery" if args.recovery else "Downloading standing meshes", detail="Copying the protected vault to encrypted temporary storage on this Virginia worker.", stage_index=2 if args.recovery else 1, stage_percent=97 if args.recovery else 10)
    run("aws", "s3", "sync", f"s3://{args.bucket}/raw/", str(raw_root), "--only-show-errors")
    source_manifest = args.root / "source-manifest-standing-a.jsonl"
    run("aws", "s3", "cp", f"s3://{args.bucket}/{args.source_manifest_key}", str(source_manifest), "--only-show-errors")
    source_records = [json.loads(line) for line in source_manifest.read_text(encoding="utf-8").splitlines() if line.strip()]
    invalid = [record.get("scan_id") for record in source_records if record.get("training_pose_valid") is not True or not str(record.get("scan_id", "")).endswith("-A")]
    if len(source_records) != 4_326 or invalid:
        raise RuntimeError(f"Standing manifest invalid: records={len(source_records)} invalid={invalid[:10]}")
    roles = {role: len({record["subject_id"] for record in source_records if record["role"] == role}) for role in ("train", "validation", "test")}
    manifest_dataset = {
        "subjects": len(source_records),
        "sourceScans": 13_209,
        "targetExamples": len(source_records) * args.views_per_subject,
    }
    if not args.recovery:
        manifest_dataset.update({"completedExamples": 0, "failedExamples": 0})
    status.update(overall=progress["manifest_done"], stage="render-v6" if args.recovery else "manifest-v6", label="4,326 standing people paired", detail=f"Subject-disjoint roles: {roles}.", stage_index=2 if args.recovery else 1, stage_percent=98 if args.recovery else 100, dataset=manifest_dataset)

    chunks_root = args.root / "chunks"
    rendered_root = args.root / "rendered"
    chunks_root.mkdir(parents=True, exist_ok=True)
    rendered_root.mkdir(parents=True, exist_ok=True)
    processed_prefix = f"processed/{args.pipeline_id}"
    checkpoint_prefix = f"{processed_prefix}/rendered"
    if args.recovery:
        # Select the exact recovery set from the tiny manifests first. Do not
        # download ~100k already-valid PNGs: repaired images are created
        # locally, and the bounded visual-audit sample is fetched below only
        # when a selected clean image is absent. This keeps retries fast while
        # preserving the same combined manifest and contact-sheet evidence.
        run_with_retries(
            "aws", "s3", "sync", f"s3://{args.bucket}/{checkpoint_prefix}/", str(rendered_root),
            "--exclude", "*", "--include", "*/chunk-manifest.jsonl",
            "--include", "*/chunk-success.json", "--include", "*/logs/*",
            "--only-show-errors",
        )
    else:
        # On the original worker completed RGB/mask images are already local.
        # Download only tiny checkpoint files when resuming that full render.
        run_with_retries(
            "aws", "s3", "sync", f"s3://{args.bucket}/{checkpoint_prefix}/", str(rendered_root),
            "--exclude", "*", "--include", "*/chunk-manifest.jsonl",
            "--include", "*/chunk-success.json", "--include", "*/logs/*",
            "--only-show-errors",
        )
    chunks = []
    for start in range(0, len(source_records), args.chunk_size):
        index = start // args.chunk_size
        chunk_records = source_records[start : start + args.chunk_size]
        chunk_path = chunks_root / f"chunk-{index:04d}.jsonl"
        output_dir = rendered_root / f"chunk-{index:04d}"
        write_jsonl(chunk_path, chunk_records)
        chunks.append((
            index,
            chunk_records,
            chunk_path,
            output_dir,
            chunk_digest(chunk_records, args.views_per_subject),
            chunk_digest(chunk_records, args.views_per_subject, LEGACY_RENDERER_REVISION),
        ))

    renderer = args.code_root / "render_wear3d_multiview.py"
    status.update(
        overall=progress["render_start"],
        stage="render-v6",
        label="Recovering failed WEAR labels" if args.recovery else "Rendering camera-aware RGB teachers",
        detail=("Clean S3 shards are reused; only failed or missing-source-geometry shards are rendered again." if args.recovery else f"Using {args.workers} isolated Blender workers. Every finished shard is checkpointed to S3."),
        stage_index=2,
        stage_percent=98 if args.recovery else 1,
    )

    def render_records(records: list[dict[str, Any]], output_dir: Path, label: str) -> list[dict[str, Any]]:
        input_dir = output_dir / "inputs"
        logs_dir = output_dir / "logs"
        attempts_dir = output_dir / "attempts"
        input_dir.mkdir(parents=True, exist_ok=True)
        logs_dir.mkdir(parents=True, exist_ok=True)
        attempts_dir.mkdir(parents=True, exist_ok=True)
        input_path = input_dir / f"{label}.jsonl"
        write_jsonl(input_path, records)
        last_return_code = -1
        for attempt in range(args.render_retries + 1):
            attempt_label = f"{label}-try-{attempt + 1}"
            attempt_dir = attempts_dir / attempt_label
            if attempt_dir.exists():
                shutil.rmtree(attempt_dir)
            attempt_dir.mkdir(parents=True, exist_ok=True)
            log_path = logs_dir / f"{attempt_label}.log"
            environment = os.environ.copy()
            environment.update({
                "LIBGL_ALWAYS_SOFTWARE": "1",
                "OMP_NUM_THREADS": "1",
                "OPENBLAS_NUM_THREADS": "1",
                "MKL_NUM_THREADS": "1",
                "NUMEXPR_NUM_THREADS": "1",
            })
            with log_path.open("w", encoding="utf-8") as log:
                result = subprocess.run(
                    [
                        "xvfb-run", "--auto-servernum",
                        "--server-args=-screen 0 1280x1024x24 -nolisten tcp",
                        "blender", "--background", "--factory-startup", "--python", str(renderer), "--",
                        "--manifest", str(input_path), "--output-dir", str(attempt_dir),
                        "--views-per-subject", str(args.views_per_subject),
                    ],
                    check=False,
                    stdout=log,
                    stderr=subprocess.STDOUT,
                    env=environment,
                )
            last_return_code = int(result.returncode)
            manifest = attempt_dir / "render-manifest.jsonl"
            if result.returncode == 0 and manifest.exists():
                return [json.loads(line) for line in manifest.read_text(encoding="utf-8").splitlines() if line.strip()]
            shutil.rmtree(attempt_dir, ignore_errors=True)

        if len(records) > 1:
            midpoint = len(records) // 2
            return (
                render_records(records[:midpoint], output_dir, f"{label}a")
                + render_records(records[midpoint:], output_dir, f"{label}b")
            )
        detail = (
            f"Blender process exited {last_return_code} after {args.render_retries + 1} attempts; "
            "this scan is explicitly excluded from training"
        )
        return failure_records(records[0], args.views_per_subject, detail)

    def summarize(records: list[dict[str, Any]]) -> dict[str, int]:
        successful = [record for record in records if not record.get("error")]
        failed = [record for record in records if record.get("error")]
        return {
            "successfulExamples": len(successful),
            "failedExamples": len(failed),
            "successfulSubjects": len({str(record.get("subject_id")) for record in successful}),
            "failedSubjects": len({str(record.get("subject_id")) for record in failed}),
        }

    def render_chunk(item):
        index, chunk_records, _, output_dir, digest, _ = item
        output_dir.mkdir(parents=True, exist_ok=True)
        marker_path = output_dir / "chunk-success.json"
        marker_path.unlink(missing_ok=True)
        records = render_records(chunk_records, output_dir, "root")
        manifest_path = output_dir / "chunk-manifest.jsonl"
        write_jsonl(manifest_path, records)
        counts = summarize(records)
        remote = f"s3://{args.bucket}/{checkpoint_prefix}/chunk-{index:04d}/"
        run_with_retries(
            "aws", "s3", "sync", str(output_dir), remote,
            "--sse", "AES256", "--only-show-errors",
        )
        marker = {
            "schemaVersion": 1,
            "chunkIndex": index,
            "digest": digest,
            "subjects": len(chunk_records),
            "viewsPerSubject": args.views_per_subject,
            "rendererRevision": RENDERER_REVISION,
            "state": "complete" if counts["successfulExamples"] > 0 else "failed",
            **counts,
            "completedAt": now(),
        }
        marker_path.write_text(json.dumps(marker, indent=2) + "\n", encoding="utf-8")
        run_with_retries(
            "aws", "s3", "cp", str(marker_path), f"{remote}chunk-success.json",
            "--sse", "AES256", "--content-type", "application/json", "--only-show-errors",
        )
        return {"index": index, "processedSubjects": len(chunk_records), **counts}

    completed_subjects = 0
    completed_examples = 0
    failed_examples = 0
    pending_chunks = []
    for item in chunks:
        index, chunk_records, _, output_dir, digest, legacy_digest = item
        marker_path = output_dir / "chunk-success.json"
        manifest_path = output_dir / "chunk-manifest.jsonl"
        marker = None
        if marker_path.exists() and manifest_path.exists():
            try:
                marker = json.loads(marker_path.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError):
                marker = None
        if (
            marker
            and marker.get("digest") in {digest, legacy_digest}
            and int(marker.get("subjects", 0)) == len(chunk_records)
            and int(marker.get("successfulExamples", 0)) > 0
            # A follow-up recovery worker must revisit only shards that contain
            # an explicitly failed person.  Fully successful shards remain
            # immutable S3 checkpoints and are never rendered twice.
            and int(marker.get("failedExamples", 0)) == 0
            # A marker proves the Blender process completed, not that every
            # anatomical label passed.  Revisit only saved shards whose exact
            # manifest still contains a strict v6 label error or a source row
            # too close to/inverted against its anatomical neighbour.
            and not manifest_requires_label_recovery(manifest_path)
            # The first full render skipped a whole row when its tape value was
            # absent, even though the 3D mesh still provided a true edge, depth,
            # and shape. Rerender only those few affected legacy shards; all
            # unrelated clean shards remain immutable.
            and (
                marker.get("rendererRevision") == RENDERER_REVISION
                or not requires_legacy_geometry_recovery(chunk_records)
            )
        ):
            completed_subjects += len(chunk_records)
            completed_examples += int(marker.get("successfulExamples", 0))
            failed_examples += int(marker.get("failedExamples", 0))
        else:
            pending_chunks.append(item)

    worker_errors = []
    with ThreadPoolExecutor(max_workers=args.workers) as executor:
        futures = {executor.submit(render_chunk, item): item for item in pending_chunks}
        for future in as_completed(futures):
            try:
                result = future.result()
            except Exception as error:
                item = futures[future]
                worker_errors.append(f"chunk-{item[0]:04d}: {type(error).__name__}: {error}")
                continue
            completed_subjects += result["processedSubjects"]
            completed_examples += result["successfulExamples"]
            failed_examples += result["failedExamples"]
            fraction = completed_subjects / len(source_records)
            status.update(
                overall=progress["render_start"] + fraction * progress["render_span"],
                stage="render-v6",
                label=f"Processed {completed_subjects:,} / {len(source_records):,} people",
                detail=(
                    "Finished shards are safe in S3. Failed Blender scans are retried, isolated, "
                    "and counted instead of silently stopping the job."
                ),
                stage_index=2,
                stage_percent=fraction * 100,
                dataset={"completedExamples": completed_examples, "failedExamples": failed_examples},
            )
    if worker_errors:
        raise RuntimeError(f"{len(worker_errors)} shards could not be checkpointed: {worker_errors[:5]}")

    merged = []
    for index, _, _, output_dir, _, _ in chunks:
        manifest = output_dir / "chunk-manifest.jsonl"
        if not manifest.exists():
            raise RuntimeError(f"Missing shard manifest: {manifest}")
        merged.extend(json.loads(line) for line in manifest.read_text(encoding="utf-8").splitlines() if line.strip())
    merged_manifest = args.root / "render-manifest-all.jsonl"
    write_jsonl(merged_manifest, merged)
    failures = [record for record in merged if record.get("error")]
    failed_subjects = len({str(record.get("subject_id")) for record in failures})
    status.update(
        overall=progress["audit_start"],
        stage="render-v6",
        label="Auditing every generated label",
        detail=(
            f"Rendered {len(merged) - len(failures):,} views; "
            f"{len(failures):,} failed views from {failed_subjects} people are being checked."
        ),
        stage_index=2,
        stage_percent=100,
        dataset={"completedExamples": len(merged) - len(failures), "failedExamples": len(failures)},
    )

    # The numerical audit reads only manifest data. Download a bounded visual
    # sample when its completed shard was resumed from S3 on this worker.
    visual_records = diverse_visual_records(merged, 24)
    for record in visual_records:
        image_path = Path(str(record["image"]))
        if image_path.exists():
            continue
        relative = image_path.relative_to(rendered_root)
        image_path.parent.mkdir(parents=True, exist_ok=True)
        run_with_retries(
            "aws", "s3", "cp",
            f"s3://{args.bucket}/{checkpoint_prefix}/{relative.as_posix()}",
            str(image_path), "--only-show-errors",
        )

    audit_dir = args.root / "audit"
    expected_source_masks = expected_source_row_mask_subjects(source_records)
    audit_result = subprocess.run(
        [
            "python3",
            str(args.code_root / "audit_wear3d_labels_cloud.py"),
            "--manifest",
            str(merged_manifest),
            "--output-dir",
            str(audit_dir),
            "--expected-underbust-mask-subjects",
            str(expected_source_masks["underbust"]),
            "--expected-waist-mask-subjects",
            str(expected_source_masks["waist"]),
            "--strict",
        ],
        check=False,
    )
    audit_summary = audit_dir / "audit-summary.json"
    contact_sheet = audit_dir / "label-contact-sheet.jpg"
    if not audit_summary.is_file() or not contact_sheet.is_file():
        raise RuntimeError(f"Full v6 label audit exited {audit_result.returncode} without preserving its evidence")
    audit = json.loads(audit_summary.read_text(encoding="utf-8"))
    # Save both success and failure evidence before the ephemeral CPU worker
    # exits. A failed audit must remain diagnosable without rerendering 33.5 GB.
    for local_path, key in (
        (source_manifest, f"manifests/{args.pipeline_id}/source-manifest-standing-a.jsonl"),
        (merged_manifest, f"{processed_prefix}/render-manifest-all.jsonl"),
        (audit_summary, f"reports/{args.pipeline_id}/label-audit.json"),
        (contact_sheet, f"reports/{args.pipeline_id}/label-contact-sheet.jpg"),
    ):
        run_with_retries(
            "aws", "s3", "cp", str(local_path), f"s3://{args.bucket}/{key}",
            "--sse", "AES256", "--only-show-errors",
        )
    if audit_result.returncode != 0 or audit.get("passed") is not True:
        failed_gates = [name for name, passed in (audit.get("gates") or {}).items() if passed is not True]
        raise RuntimeError(f"Full v6 label audit failed: {failed_gates}")
    status.update(overall=72, stage="render-v6", label="Automated v6 label audit passed", detail=f"{audit['subjects']:,} standing people passed mandatory-row, optional-row coverage, torso-edge, cross-section, raw-depth, camera, and split gates.", stage_index=2, stage_percent=100)

    status.update(overall=74, stage="render-v6", label="Awaiting diverse contact-sheet review", detail="CPU preprocessing is complete and evidence is safe in S3. GPU launch stays blocked until the generated lines are visually approved.", stage_index=2, stage_percent=100, state="waiting")
    print(json.dumps({"subjects": audit["subjects"], "records": audit["records"], "failures": len(failures), "passed": True}))


if __name__ == "__main__":
    main()
