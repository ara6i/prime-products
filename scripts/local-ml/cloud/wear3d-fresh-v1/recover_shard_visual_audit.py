#!/usr/bin/env python3
"""Recover a completed shard whose cloud contact-sheet audit was incompatible.

The rendered manifest is not edited. This tool reruns the structural audit
locally, downloads only the deterministic 16 visual samples, then preserves
and replaces the failed cloud audit/result with a passing compatibility record.
"""

from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import subprocess
from typing import Any

import audit_rendered_geometry as audit_module


BUCKET = "primestyleai-wear3d-921049726279-us-east-1"
PROFILE = "primestyle-wear"
REGION = "us-east-1"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("job_id")
    parser.add_argument("shard_id")
    parser.add_argument("--expected-subjects", type=int, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    return parser.parse_args()


def now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def aws(*arguments: str, check: bool = True) -> subprocess.CompletedProcess[str]:
    environment = os.environ.copy()
    environment.update({
        "AWS_PROFILE": PROFILE,
        "AWS_REGION": REGION,
        "AWS_DEFAULT_REGION": REGION,
        "AWS_PAGER": "",
    })
    return subprocess.run(
        ["aws", *arguments],
        check=check,
        text=True,
        capture_output=True,
        env=environment,
    )


def download(key: str, path: Path, *, required: bool = True) -> bool:
    path.parent.mkdir(parents=True, exist_ok=True)
    result = aws(
        "s3",
        "cp",
        f"s3://{BUCKET}/{key}",
        str(path),
        "--only-show-errors",
        check=False,
    )
    if result.returncode and required:
        raise RuntimeError(f"could not download {key}: {result.stderr.strip()}")
    return result.returncode == 0


def upload(path: Path, key: str, content_type: str) -> None:
    aws(
        "s3",
        "cp",
        str(path),
        f"s3://{BUCKET}/{key}",
        "--sse",
        "AES256",
        "--content-type",
        content_type,
        "--only-show-errors",
    )


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def load_jsonl(path: Path) -> list[dict[str, Any]]:
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def s3_key(uri: str) -> str:
    prefix = f"s3://{BUCKET}/"
    if not uri.startswith(prefix):
        raise RuntimeError(f"unexpected artifact URI: {uri}")
    return uri[len(prefix):]


def main() -> None:
    args = parse_args()
    output = args.output_dir.resolve()
    output.mkdir(parents=True, exist_ok=True)
    prefix = f"reports/{args.job_id}/{args.shard_id}"
    manifest_key = f"{prefix}/render-manifest.jsonl"
    manifest = output / "render-manifest.jsonl"
    original_audit = output / "geometry-audit-cloud-original.json"
    original_result = output / "result-cloud-original.json"
    if not manifest.is_file() or manifest.stat().st_size == 0:
        download(manifest_key, manifest)
    if not original_audit.is_file() or original_audit.stat().st_size == 0:
        download(f"{prefix}/geometry-audit.json", original_audit)
    had_result = original_result.is_file() and original_result.stat().st_size > 0
    if not had_result:
        had_result = download(f"{prefix}/result.json", original_result, required=False)

    cloud_audit = json.loads(original_audit.read_text(encoding="utf-8"))
    failures = list(cloud_audit.get("failures") or [])
    if cloud_audit.get("actual", {}).get("subjects") != args.expected_subjects:
        raise RuntimeError("cloud audit subject count does not match the shard plan")
    if cloud_audit.get("actual", {}).get("errorRecords") != 0:
        raise RuntimeError("cloud audit contains render errors")
    if not failures or any("Image' has no attribute 'Resampling'" not in failure for failure in failures):
        raise RuntimeError(f"refusing non-compatibility audit recovery: {failures}")

    corrected_audit = output / "geometry-audit.json"
    command = [
        "python3",
        str(Path(__file__).with_name("audit_rendered_geometry.py")),
        "--manifest",
        str(manifest),
        "--expected-subjects",
        str(args.expected_subjects),
        "--expected-role",
        "train",
        "--expected-role",
        "validation",
        "--output",
        str(corrected_audit),
    ]
    environment = os.environ.copy()
    environment["PYTHONPATH"] = str(Path(__file__).parent)
    completed = subprocess.run(command, check=False, env=environment)
    corrected = json.loads(corrected_audit.read_text(encoding="utf-8"))
    if completed.returncode or corrected.get("teacherDatasetStructurallyValid") is not True:
        raise RuntimeError(f"corrected structural audit failed: {corrected.get('failures')}")

    records = load_jsonl(manifest)
    canonical = [record for record in records if record.get("view_id") == "canonical" and not record.get("error")]
    selected = audit_module.select_evenly(canonical, 16)
    image_root = output / "contact-images"

    def fetch(record: dict[str, Any]) -> dict[str, Any]:
        sample_id = str(record["sample_id"])
        destination = image_root / f"{sample_id}.png"
        if not destination.is_file() or destination.stat().st_size == 0:
            download(s3_key(str(record["s3_mesh_image"])), destination)
        return {**record, "mesh_image": str(destination)}

    with ThreadPoolExecutor(max_workers=8) as executor:
        local_selected = list(executor.map(fetch, selected))
    contact_sheet = output / "teacher-contact-sheet.jpg"
    contact_metadata = audit_module.build_contact_sheet(local_selected, contact_sheet, 16)
    contact_metadata.update({
        "recoveredLocally": True,
        "recoveryReason": "cloud-pillow-resampling-enum-unavailable",
    })
    corrected.update({
        "contactSheet": contact_metadata,
        "compatibilityRecovery": {
            "performed": True,
            "reason": "cloud-pillow-resampling-enum-unavailable",
            "originalAuditSha256": sha256(original_audit),
            "originalResultPreserved": had_result,
        },
        "failures": [],
        "teacherDatasetStructurallyValid": True,
        "freshGeometryReadyForModelFitting": True,
    })
    corrected_audit.write_text(json.dumps(corrected, indent=2) + "\n", encoding="utf-8")

    result = {
        "schemaVersion": "wear3d-fresh-shard-result/v1",
        "jobId": args.job_id,
        "shardId": args.shard_id,
        "state": "passed",
        "subjects": args.expected_subjects,
        "records": len(records),
        "renderErrors": 0,
        "manifestSha256": sha256(manifest),
        "auditKey": f"{prefix}/geometry-audit.json",
        "manifestKey": manifest_key,
        "contactSheetKey": f"{prefix}/teacher-contact-sheet.jpg",
        "completedAt": now(),
        "v9ArtifactUsed": False,
        "previousProcessedArtifactRead": False,
        "compatibilityRecovery": True,
        "compatibilityRecoveryReason": "cloud-pillow-resampling-enum-unavailable",
    }
    result_path = output / "result.json"
    result_path.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")

    upload(original_audit, f"{prefix}/geometry-audit-cloud-pillow-failure.json", "application/json")
    if had_result:
        upload(original_result, f"{prefix}/result-cloud-pillow-failure.json", "application/json")
    upload(corrected_audit, f"{prefix}/geometry-audit.json", "application/json")
    upload(contact_sheet, f"{prefix}/teacher-contact-sheet.jpg", "image/jpeg")
    upload(result_path, f"{prefix}/result.json", "application/json")
    print(json.dumps(result))


if __name__ == "__main__":
    main()
