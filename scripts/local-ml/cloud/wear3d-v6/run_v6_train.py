#!/usr/bin/env python3
"""Download validated v8 mesh teachers, train privately, and preserve artifacts."""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import subprocess

import boto3


REQUIRED_ARTIFACTS = (
    "model.pt",
    "model.ts",
    "model.onnx",
    "runtime.json",
    "test-metrics.json",
    "training-history.json",
)
REQUIRED_SUBJECTS = 4_326
REQUIRED_RECORDS = 38_934


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--bucket", required=True)
    parser.add_argument("--pipeline-id", required=True)
    parser.add_argument("--teacher-pipeline-id", required=True)
    parser.add_argument("--status-key", required=True)
    parser.add_argument("--train-python", required=True)
    parser.add_argument("--root", type=Path, default=Path("/opt/primestyle/v6"))
    parser.add_argument("--code-root", type=Path, default=Path("/opt/primestyle/code"))
    parser.add_argument("--epochs", type=int, default=30)
    parser.add_argument("--batch-size", type=int, default=64)
    parser.add_argument("--workers", type=int, default=2)
    return parser.parse_args()


def now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def run(*arguments: str) -> None:
    subprocess.run(list(arguments), check=True)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def update_status(s3, bucket: str, key: str, **updates) -> None:
    payload = json.loads(s3.get_object(Bucket=bucket, Key=key)["Body"].read())
    payload.update(updates)
    payload["updatedAt"] = now()
    s3.put_object(Bucket=bucket, Key=key, Body=(json.dumps(payload, indent=2) + "\n").encode(), ContentType="application/json", ServerSideEncryption="AES256")


def main() -> None:
    args = parse_args()
    args.root.mkdir(parents=True, exist_ok=True)
    s3 = boto3.client("s3")
    update_status(
        s3, args.bucket, args.status_key,
        state="running", overallPercent=76, currentStage="train-v8",
        currentStageLabel="Verifying the approved WEAR teacher set",
        detail="The GPU independently checks the exact audit, manifest hash, and visual-review hash before downloading training images.",
    )
    processed = f"processed/{args.teacher_pipeline_id}"
    manifest = args.root / "render-manifest-all.jsonl"
    run("aws", "s3", "cp", f"s3://{args.bucket}/{processed}/render-manifest-all.jsonl", str(manifest), "--only-show-errors")
    audit_path = args.root / "label-audit.json"
    run("aws", "s3", "cp", f"s3://{args.bucket}/reports/{args.teacher_pipeline_id}/label-audit.json", str(audit_path), "--only-show-errors")
    review_path = args.root / "label-visual-review.json"
    run("aws", "s3", "cp", f"s3://{args.bucket}/reports/{args.teacher_pipeline_id}/label-visual-review.json", str(review_path), "--only-show-errors")
    audit = json.loads(audit_path.read_text(encoding="utf-8"))
    review = json.loads(review_path.read_text(encoding="utf-8"))
    manifest_hash = sha256(manifest)
    audit_inputs = audit.get("inputs") or {}
    audit_counts = {
        "subjects": int(audit_inputs.get("people", 0)),
        "records": int(audit_inputs.get("renderCards", 0)),
        "canonical": int(audit_inputs.get("peopleWithCanonicalFrontCard", 0)),
    }
    if (
        audit.get("schemaVersion") != "wear-teacher-card-audit/v2"
        or (audit.get("summary") or {}).get("trainingAllowed") is not True
        or audit_counts != {
            "subjects": REQUIRED_SUBJECTS,
            "records": REQUIRED_RECORDS,
            "canonical": REQUIRED_SUBJECTS,
        }
        or (audit.get("summary") or {}).get("renderManifestSha256") != manifest_hash
    ):
        raise RuntimeError(
            "Refusing GPU training because the exact full label audit does not match "
            f"the downloaded manifest: counts={audit_counts} hash_match={(audit.get('summary') or {}).get('renderManifestSha256') == manifest_hash}"
        )
    if (
        review.get("schemaVersion") != 1
        or review.get("pipelineId") != args.teacher_pipeline_id
        or review.get("approved") is not True
        or review.get("manifestSha256") != manifest_hash
        or review.get("contactSheetSha256") != (audit.get("summary") or {}).get("contactSheetSha256")
    ):
        raise RuntimeError("Refusing GPU training because the visual review does not match the exact audited teacher set")
    update_status(
        s3, args.bucket, args.status_key,
        state="running", overallPercent=76, currentStage="train-v8",
        currentStageLabel="Downloading validated Blender mesh teachers to the GPU",
        detail="All 38,934 audited mesh cards and their certified PLY/LND labels match the approved hash. No RGB photo, Apple value, or tape pixel is used as model input.",
    )
    rendered_root = args.root / "rendered"
    run("aws", "s3", "sync", f"s3://{args.bucket}/{processed}/rendered/", str(rendered_root), "--only-show-errors")
    output_dir = args.root / "model"
    output_dir.mkdir(parents=True, exist_ok=True)
    run(
        args.train_python,
        str(args.code_root / "train_wear3d_v6.py"),
        "--manifest", str(manifest),
        "--output-dir", str(output_dir),
        "--pipeline-id", args.pipeline_id,
        "--epochs", str(args.epochs),
        "--batch-size", str(args.batch_size),
        "--workers", str(args.workers),
        "--status-bucket", args.bucket,
        "--status-key", args.status_key,
    )
    missing_artifacts = [
        name for name in REQUIRED_ARTIFACTS
        if not (output_dir / name).is_file() or (output_dir / name).stat().st_size == 0
    ]
    if missing_artifacts:
        raise RuntimeError(f"Training did not produce required artifacts: {missing_artifacts}")
    metrics = json.loads((output_dir / "test-metrics.json").read_text(encoding="utf-8"))
    run("aws", "s3", "cp", str(output_dir), f"s3://{args.bucket}/models/{args.pipeline_id}/", "--recursive", "--sse", "AES256", "--only-show-errors")
    run("aws", "s3", "cp", str(output_dir / "test-metrics.json"), f"s3://{args.bucket}/reports/{args.pipeline_id}/test-metrics.json", "--sse", "AES256", "--only-show-errors")
    payload = json.loads(s3.get_object(Bucket=args.bucket, Key=args.status_key)["Body"].read())
    synthetic_passed = metrics.get("synthetic_candidate_passed") is True
    if not synthetic_passed:
        payload.update({
            "state": "failed",
            "overallPercent": 96,
            "currentStage": "evaluate-v8",
            "currentStageLabel": "Synthetic candidate failed; correction required",
            "detail": "Artifacts and metrics were preserved for diagnosis. Private real-photo testing is blocked until every core synthetic gate passes.",
            "updatedAt": now(),
        })
        for index, stage in enumerate(payload.get("stages", [])):
            if index <= 3:
                stage.update({"state": "complete", "percent": 100})
            elif index == 4:
                stage.update({"state": "failed", "percent": 100})
            elif index == 5:
                stage.update({"state": "pending", "percent": 0})
        payload["model"] = {
            "syntheticCandidatePassed": False,
            "sdkReady": False,
            "subjectSplit": metrics.get("subjects"),
            "artifactPrefix": f"s3://{args.bucket}/models/{args.pipeline_id}/",
            "failures": metrics.get("failures", []),
        }
        s3.put_object(Bucket=args.bucket, Key=args.status_key, Body=(json.dumps(payload, indent=2) + "\n").encode(), ContentType="application/json", ServerSideEncryption="AES256")
        raise RuntimeError(f"Synthetic candidate failed required gates: {metrics.get('failures', [])}")
    payload.update({
        "state": "awaiting_real_photo_validation",
        "overallPercent": 96,
        "currentStage": "real_photos",
        "currentStageLabel": "Synthetic training complete; testing real photos privately",
        "detail": "GPU artifacts are saved. The private candidate remains unreleased even if Shane, Shahnaz, Negar, and the paired real-photo suite pass.",
        "updatedAt": now(),
    })
    for index, stage in enumerate(payload.get("stages", [])):
        if index <= 4:
            stage.update({"state": "complete", "percent": 100})
        elif index == 5:
            stage.update({"state": "running", "percent": 0})
    payload["model"] = {
        "syntheticCandidatePassed": True,
        "sdkReady": False,
        "subjectSplit": metrics.get("subjects"),
        "artifactPrefix": f"s3://{args.bucket}/models/{args.pipeline_id}/",
    }
    s3.put_object(Bucket=args.bucket, Key=args.status_key, Body=(json.dumps(payload, indent=2) + "\n").encode(), ContentType="application/json", ServerSideEncryption="AES256")
    print(json.dumps({"syntheticCandidatePassed": True, "subjects": metrics.get("subjects"), "saved": True}))


if __name__ == "__main__":
    main()
