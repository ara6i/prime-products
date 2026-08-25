#!/usr/bin/env python3
"""Collect, combine, and validate both fresh CPU geometry shards."""

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


BUCKET = "primestyleai-wear3d-921049726279-us-east-1"
REGION = "us-east-1"
PROFILE = "primestyle-wear"
def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("job_id")
    parser.add_argument("--project-root", type=Path, default=Path.cwd())
    parser.add_argument("--visual-approved", action="store_true")
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


def get_json(key: str) -> dict[str, Any] | None:
    result = aws(
        "s3",
        "cp",
        f"s3://{BUCKET}/{key}",
        "-",
        "--only-show-errors",
        check=False,
    )
    if result.returncode != 0:
        return None
    return json.loads(result.stdout)


def download(key: str, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    aws("s3", "cp", f"s3://{BUCKET}/{key}", str(path), "--only-show-errors")


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


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def instance_states(instance_ids: list[str]) -> dict[str, str]:
    if not instance_ids:
        return {}
    response = json.loads(
        aws(
            "ec2",
            "describe-instances",
            "--instance-ids",
            *instance_ids,
            "--output",
            "json",
        ).stdout
    )
    return {
        instance["InstanceId"]: instance["State"]["Name"]
        for reservation in response.get("Reservations", [])
        for instance in reservation.get("Instances", [])
    }


def main() -> None:
    args = parse_args()
    project_root = args.project_root.resolve()
    job_dir = project_root / ".local-ml/wear3d-fresh-v1/jobs" / args.job_id
    plan_path = job_dir / "job-plan.json"
    if not plan_path.is_file():
        raise RuntimeError(f"local fresh job plan not found: {plan_path}")
    plan = json.loads(plan_path.read_text(encoding="utf-8"))
    if plan.get("jobId") != args.job_id or plan.get("v9ArtifactUsed") is not False:
        raise RuntimeError("fresh job plan provenance mismatch")
    instances = plan.get("instances") or []
    shard_ids = tuple(str(item["shardId"]) for item in instances)
    if not shard_ids:
        raise RuntimeError("fresh job plan has no CPU shards")
    states = instance_states([str(item.get("instanceId")) for item in instances if item.get("instanceId")])

    with ThreadPoolExecutor(max_workers=len(shard_ids)) as executor:
        result_futures = {
            shard_id: executor.submit(
                get_json,
                f"reports/{args.job_id}/{shard_id}/result.json",
            )
            for shard_id in shard_ids
        }
        results = {
            shard_id: future.result()
            for shard_id, future in result_futures.items()
        }
    missing_results = [shard_id for shard_id, result in results.items() if result is None]
    with ThreadPoolExecutor(max_workers=max(1, len(missing_results))) as executor:
        progress_futures = {
            shard_id: executor.submit(
                get_json,
                f"reports/{args.job_id}/{shard_id}/progress.json",
            )
            for shard_id in missing_results
        }
        progress = {
            shard_id: future.result()
            for shard_id, future in progress_futures.items()
        }
    if any(result is None for result in results.values()):
        print(json.dumps({
            "jobId": args.job_id,
            "state": "running",
            "instanceStates": states,
            "progress": progress,
            "resultsAvailable": {key: value is not None for key, value in results.items()},
        }, indent=2))
        raise SystemExit(3)

    failed = {key: value for key, value in results.items() if value.get("state") != "passed"}
    if failed:
        for shard_id in failed:
            for filename in ("geometry-audit.json", "bootstrap.log", "bootstrap-failure.json"):
                key = f"reports/{args.job_id}/{shard_id}/{filename}"
                try:
                    download(key, job_dir / "collected" / shard_id / filename)
                except subprocess.CalledProcessError:
                    pass
        plan.update({
            "state": "failed_validation",
            "updatedAt": now(),
            "instanceStates": states,
            "shardResults": results,
        })
        write_json(plan_path, plan)
        upload(plan_path, f"reports/{args.job_id}/job-plan.json", "application/json")
        print(json.dumps({"jobId": args.job_id, "state": "failed_validation", "failed": failed}, indent=2))
        raise SystemExit(2)

    collected = job_dir / "collected"
    manifest_paths = []
    contact_sheets = []
    for shard_id, result in results.items():
        manifest_path = collected / shard_id / "render-manifest.jsonl"
        audit_path = collected / shard_id / "geometry-audit.json"
        contact_path = collected / shard_id / "teacher-contact-sheet.jpg"
        if (
            not manifest_path.is_file()
            or sha256_file(manifest_path) != str(result["manifestSha256"])
        ):
            download(str(result["manifestKey"]), manifest_path)
        download(str(result["auditKey"]), audit_path)
        download(str(result["contactSheetKey"]), contact_path)
        manifest_paths.append(manifest_path)
        contact_sheets.append(contact_path)

    expected_subjects = {
        str(record["subject_id"])
        for shard_id in shard_ids
        for line in (job_dir / "manifests" / f"{shard_id}.jsonl").read_text(encoding="utf-8").splitlines()
        if line.strip()
        for record in (json.loads(line),)
    }
    rendered_subjects = {
        str(record["subject_id"])
        for path in manifest_paths
        for line in path.read_text(encoding="utf-8").splitlines()
        if line.strip()
        for record in (json.loads(line),)
        if record.get("view_id") == "canonical"
    }
    if rendered_subjects != expected_subjects:
        raise RuntimeError(
            f"combined fresh subject identity mismatch: expected={len(expected_subjects)} actual={len(rendered_subjects)}"
        )
    if len(expected_subjects) != 3878:
        raise RuntimeError(f"fresh expected subject union={len(expected_subjects)} expected=3878")

    combined_audit = collected / "combined-geometry-audit.json"
    command = [
        "python3",
        str(project_root / "scripts/local-ml/cloud/wear3d-fresh-v1/audit_rendered_geometry.py"),
    ]
    for path in manifest_paths:
        command.extend(("--manifest", str(path)))
    command.extend((
        "--expected-subjects",
        "3878",
        "--expected-role",
        "train",
        "--expected-role",
        "validation",
        "--output",
        str(combined_audit),
    ))
    environment = os.environ.copy()
    environment["PYTHONPATH"] = str(project_root / "scripts/local-ml/cloud/wear3d-fresh-v1")
    audit_result = subprocess.run(command, check=False, env=environment)
    if not combined_audit.is_file():
        raise RuntimeError(f"combined fresh audit exited {audit_result.returncode} without output")
    audit = json.loads(combined_audit.read_text(encoding="utf-8"))
    structurally_valid = audit_result.returncode == 0 and audit.get("teacherDatasetStructurallyValid") is True
    state = "passed" if structurally_valid and args.visual_approved else "awaiting_visual_review" if structurally_valid else "failed_validation"
    final_report = {
        "schemaVersion": "wear3d-fresh-cpu-final/v1",
        "jobId": args.job_id,
        "state": state,
        "completedAt": now(),
        "v9ArtifactUsed": False,
        "previousWeightsUsed": False,
        "previousProcessedArtifactRead": False,
        "sealedTestSubjectsUsed": 0,
        "subjects": len(expected_subjects),
        "records": sum(int(result["records"]) for result in results.values()),
        "structuralAuditPassed": structurally_valid,
        "visualAuditPassed": bool(args.visual_approved and structurally_valid),
        "contactSheets": [str(path) for path in contact_sheets],
        "combinedAudit": str(combined_audit),
        "instanceStates": states,
        "shardResults": results,
        "freshGeometryReadyForModelFitting": bool(structurally_valid and args.visual_approved),
        "gpuTrainingStarted": False,
    }
    final_path = collected / "final-result.json"
    write_json(final_path, final_report)
    plan.update({
        "state": state,
        "updatedAt": now(),
        "cpuFinalResult": final_report,
    })
    write_json(plan_path, plan)
    upload(combined_audit, f"reports/{args.job_id}/combined-geometry-audit.json", "application/json")
    upload(final_path, f"reports/{args.job_id}/final-result.json", "application/json")
    upload(plan_path, f"reports/{args.job_id}/job-plan.json", "application/json")
    print(json.dumps(final_report, indent=2))
    raise SystemExit(0 if state == "passed" else 4 if state == "awaiting_visual_review" else 2)


if __name__ == "__main__":
    main()
