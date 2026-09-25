#!/usr/bin/env python3
"""Create time-limited least-privilege URLs for one waist/hip RunPod job."""

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
    manifest = json.loads((job_dir / "package-manifest.json").read_text())
    archive = job_dir / "runpod-input.tar.gz"
    if manifest.get("schemaVersion") != "wear3d-waist-hips-v2-runpod-package/v1":
        raise RuntimeError("Unexpected waist/hip package manifest")
    if sha256(archive) != manifest["archiveSha256"]:
        raise RuntimeError("Waist/hip archive checksum changed")
    job_id = manifest["jobId"]
    input_key = f"jobs/{job_id}/runpod-input.tar.gz"
    report_prefix = f"reports/{job_id}"
    session = boto3.Session(profile_name=PROFILE, region_name=REGION)
    s3 = session.client("s3", region_name=REGION)
    environment = {
        "WEAR_JOB_ID": job_id,
        "WEAR_INPUT_SHA256": manifest["archiveSha256"],
        "WEAR_INPUT_URL": s3.generate_presigned_url(
            "get_object",
            Params={"Bucket": BUCKET, "Key": input_key},
            ExpiresIn=args.expires_seconds,
        ),
    }
    uploads = {
        "WEAR_PROGRESS_UPLOAD_URL": ("progress.json", "application/json"),
        "WEAR_CHECKPOINT_UPLOAD_URL": ("best-checkpoint.pt", "application/octet-stream"),
        "WEAR_RESULT_UPLOAD_URL": ("final-result.json", "application/json"),
        "WEAR_OVERLAY_UPLOAD_URL": ("validation-overlay.jpg", "image/jpeg"),
        "WEAR_LOG_UPLOAD_URL": ("runpod-training.log", "text/plain"),
        "WEAR_OVERFIT_UPLOAD_URL": ("overfit-result.json", "application/json"),
        "WEAR_ONNX_UPLOAD_URL": ("model.onnx", "application/octet-stream"),
        "WEAR_RUNTIME_UPLOAD_URL": ("runtime.json", "application/json"),
        "WEAR_ARTIFACT_UPLOAD_URL": ("artifact-bundle.tar.gz", "application/gzip"),
    }
    for variable, (name, content_type) in uploads.items():
        environment[variable] = s3.generate_presigned_url(
            "put_object",
            Params={"Bucket": BUCKET, "Key": f"{report_prefix}/{name}", "ContentType": content_type},
            ExpiresIn=args.expires_seconds,
        )
    runner_text = runner.read_text()
    if runner_text.startswith("#!/usr/bin/env bash\n"):
        runner_text = runner_text.removeprefix("#!/usr/bin/env bash\n")
    launch = job_dir / "runpod-launch.sh"
    launch.write_text(
        "#!/usr/bin/env bash\nset -Eeuo pipefail\n"
        + "\n".join(f"export {key}={shlex.quote(value)}" for key, value in environment.items())
        + "\n"
        + runner_text
    )
    launch.chmod(0o600)
    launch_key = f"jobs/{job_id}/runpod-launch.sh"
    s3.upload_file(
        str(launch),
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
    public = {
        "schemaVersion": "wear3d-waist-hips-v2-runpod-bootstrap/v1",
        "jobId": job_id,
        "archiveSha256": manifest["archiveSha256"],
        "expiresSeconds": args.expires_seconds,
        "launchKey": launch_key,
        "inputKey": input_key,
        "reportPrefix": report_prefix,
        "rows": ["waist", "hips"],
        "teacherInputsReadOnly": True,
        "previousWeightsUsed": False,
        "sealed448SubjectsUsedForTraining": 0,
    }
    (job_dir / "runpod-bootstrap-manifest.json").write_text(json.dumps(public, indent=2, sort_keys=True) + "\n")
    print(json.dumps(public, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
