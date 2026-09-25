#!/usr/bin/env python3
"""Upload one package and create short-lived RunPod launch URLs."""

from __future__ import annotations

import argparse
import hashlib
import json
import shlex
from pathlib import Path

import boto3


BUCKET = "primestyleai-wear3d-921049726279-us-east-1"
REGION = "us-east-1"
PROFILE = "primestyle-wear"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--job-dir", required=True, type=Path)
    parser.add_argument("--runner", required=True, type=Path)
    parser.add_argument("--mode", choices=("dry", "fold", "cv"), default="dry")
    parser.add_argument("--epochs", type=int, default=2)
    parser.add_argument("--warmup-epochs", type=int, default=1)
    parser.add_argument("--batch-size", type=int, default=512)
    parser.add_argument("--max-subjects", type=int, default=64)
    parser.add_argument("--expires-seconds", type=int, default=14_400)
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
    package_manifest = json.loads((job_dir / "package-manifest.json").read_text())
    archive = job_dir / "runpod-input.tar.gz"
    actual_sha = sha256(archive)
    if actual_sha != package_manifest["archiveSha256"]:
        raise RuntimeError("RunPod archive hash changed")
    job_id = str(package_manifest["jobId"])
    session = boto3.Session(profile_name=PROFILE, region_name=REGION)
    s3 = session.client("s3")
    input_key = f"jobs/{job_id}/runpod-input.tar.gz"
    s3.upload_file(str(archive), BUCKET, input_key, ExtraArgs={"ServerSideEncryption": "AES256"})
    reports = f"reports/{job_id}"
    environment = {
        "WEAR_JOB_ID": job_id,
        "WEAR_INPUT_SHA256": actual_sha,
        "WEAR_MODE": args.mode,
        "WEAR_EPOCHS": str(args.epochs),
        "WEAR_WARMUP_EPOCHS": str(args.warmup_epochs),
        "WEAR_BATCH_SIZE": str(args.batch_size),
        "WEAR_MAX_SUBJECTS": str(args.max_subjects),
        "WEAR_INPUT_URL": s3.generate_presigned_url(
            "get_object", Params={"Bucket": BUCKET, "Key": input_key}, ExpiresIn=args.expires_seconds
        ),
        "WEAR_RESULT_UPLOAD_URL": s3.generate_presigned_url(
            "put_object", Params={"Bucket": BUCKET, "Key": f"{reports}/result.json", "ContentType": "application/json"}, ExpiresIn=args.expires_seconds
        ),
        "WEAR_BUNDLE_UPLOAD_URL": s3.generate_presigned_url(
            "put_object", Params={"Bucket": BUCKET, "Key": f"{reports}/artifact-bundle.tar.gz", "ContentType": "application/gzip"}, ExpiresIn=args.expires_seconds
        ),
        "WEAR_LOG_UPLOAD_URL": s3.generate_presigned_url(
            "put_object", Params={"Bucket": BUCKET, "Key": f"{reports}/runpod-training.log", "ContentType": "text/plain"}, ExpiresIn=args.expires_seconds
        ),
    }
    launch = job_dir / "runpod-launch.sh"
    lines = ["#!/usr/bin/env bash", "set -Eeuo pipefail"]
    lines.extend(f"export {key}={shlex.quote(value)}" for key, value in environment.items())
    runner = args.runner.read_text()
    if runner.startswith("#!/usr/bin/env bash\n"):
        runner = runner.removeprefix("#!/usr/bin/env bash\n")
    launch.write_text("\n".join(lines) + "\n" + runner)
    launch.chmod(0o600)
    launch_key = f"jobs/{job_id}/runpod-launch.sh"
    s3.upload_file(str(launch), BUCKET, launch_key, ExtraArgs={"ServerSideEncryption": "AES256", "ContentType": "text/x-shellscript"})
    launch_url = s3.generate_presigned_url(
        "get_object", Params={"Bucket": BUCKET, "Key": launch_key}, ExpiresIn=args.expires_seconds
    )
    (job_dir / "runpod-launch-url.txt").write_text(launch_url + "\n")
    public = {
        "schemaVersion": "wear-waist-hip-runpod-launch/v1",
        "jobId": job_id,
        "mode": args.mode,
        "epochs": args.epochs,
        "warmupEpochs": args.warmup_epochs,
        "batchSize": args.batch_size,
        "maxSubjects": args.max_subjects,
        "expiresSeconds": args.expires_seconds,
        "inputKey": input_key,
        "reportPrefix": reports,
        "archiveSha256": actual_sha,
        "heldoutPeopleUsed": 0,
        "freshInitialization": True,
    }
    (job_dir / "runpod-launch-manifest.json").write_text(json.dumps(public, indent=2, sort_keys=True) + "\n")
    print(json.dumps(public, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
