#!/usr/bin/env python3
"""Prepare a short-lived, least-privilege bootstrap for one RunPod training job."""

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
    parser.add_argument("--job-dir", type=Path, required=True)
    parser.add_argument("--runner", type=Path, required=True)
    parser.add_argument("--expires-seconds", type=int, default=10_800)
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
    runner = args.runner.resolve()
    manifest_path = job_dir / "package-manifest.json"
    archive_path = job_dir / "runpod-input.tar.gz"

    manifest = json.loads(manifest_path.read_text())
    job_id = str(manifest["jobId"])
    expected_sha = str(manifest["archiveSha256"])
    actual_sha = sha256(archive_path)
    if actual_sha != expected_sha:
        raise SystemExit(f"archive checksum mismatch: {actual_sha} != {expected_sha}")

    session = boto3.Session(profile_name=PROFILE, region_name=REGION)
    s3 = session.client("s3", region_name=REGION)
    input_key = f"jobs/{job_id}/runpod-input.tar.gz"
    report_prefix = f"reports/{job_id}"

    input_url = s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": BUCKET, "Key": input_key},
        ExpiresIn=args.expires_seconds,
    )

    upload_specs = {
        "WEAR_PROGRESS_UPLOAD_URL": (f"{report_prefix}/progress.json", "application/json"),
        "WEAR_CHECKPOINT_UPLOAD_URL": (f"{report_prefix}/best-checkpoint.pt", "application/octet-stream"),
        "WEAR_RESULT_UPLOAD_URL": (f"{report_prefix}/final-result.json", "application/json"),
        "WEAR_OVERLAY_UPLOAD_URL": (f"{report_prefix}/validation-overlay.jpg", "image/jpeg"),
        "WEAR_LOG_UPLOAD_URL": (f"{report_prefix}/runpod-training.log", "text/plain"),
    }
    environment = {
        "WEAR_JOB_ID": job_id,
        "WEAR_INPUT_URL": input_url,
        "WEAR_INPUT_SHA256": expected_sha,
    }
    for variable, (key, content_type) in upload_specs.items():
        environment[variable] = s3.generate_presigned_url(
            "put_object",
            Params={"Bucket": BUCKET, "Key": key, "ContentType": content_type},
            ExpiresIn=args.expires_seconds,
        )

    launch_path = job_dir / "runpod-launch.sh"
    launch_lines = ["#!/usr/bin/env bash", "set -Eeuo pipefail"]
    launch_lines.extend(
        f"export {key}={shlex.quote(value)}" for key, value in environment.items()
    )
    runner_text = runner.read_text()
    if runner_text.startswith("#!/usr/bin/env bash\n"):
        runner_text = runner_text.removeprefix("#!/usr/bin/env bash\n")
    launch_path.write_text("\n".join(launch_lines) + "\n" + runner_text)
    launch_path.chmod(0o600)

    launch_key = f"jobs/{job_id}/runpod-launch.sh"
    s3.upload_file(
        str(launch_path),
        BUCKET,
        launch_key,
        ExtraArgs={"ServerSideEncryption": "AES256", "ContentType": "text/x-shellscript"},
    )
    launch_url = s3.generate_presigned_url(
        "get_object",
        Params={"Bucket": BUCKET, "Key": launch_key},
        ExpiresIn=args.expires_seconds,
    )
    launch_url_path = job_dir / "runpod-launch-url.txt"
    launch_url_path.write_text(launch_url + "\n")
    launch_url_path.chmod(0o600)

    public_manifest = {
        "schemaVersion": "wear3d-fresh-runpod-bootstrap/v1",
        "jobId": job_id,
        "archiveSha256": expected_sha,
        "expiresSeconds": args.expires_seconds,
        "launchKey": launch_key,
        "inputKey": input_key,
        "reportPrefix": report_prefix,
        "freshInitialization": True,
        "previousWeightsUsed": False,
        "v9ArtifactUsed": False,
        "sealedTestSubjectsUsed": 0,
    }
    bootstrap_manifest_path = job_dir / "runpod-bootstrap-manifest.json"
    bootstrap_manifest_path.write_text(json.dumps(public_manifest, indent=2, sort_keys=True) + "\n")
    bootstrap_manifest_path.chmod(0o600)
    print(json.dumps(public_manifest, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
