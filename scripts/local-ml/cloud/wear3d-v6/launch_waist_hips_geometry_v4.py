#!/usr/bin/env python3
"""Resume the reusable, CPU-only WEAR waist/hip v8 worker in Virginia.

The first launch is deliberately a small train/validation canary.  It uses the
same c8a.48xlarge and persistent encrypted EBS volume as the later full run,
so the rendered teacher cache and Python environment are reused instead of
downloaded again.
"""

from __future__ import annotations

from datetime import datetime, timezone
import argparse
from collections import Counter
import json
from pathlib import Path
import tempfile
import time
from typing import Any

import launch_v6 as base


BASE_PIPELINE_ID = "wear3d-waist-hips-geometry-cpu-v8-20260824"
TEACHER_PIPELINE_ID = "wear3d-waist-hips-teacher-v1-20260823"
LOCAL_CANARY_MANIFEST = ".local-ml/wear3d-spatial-canary-v2/render-manifest.jsonl"
SPATIAL_CONTRACT = ".local-ml/reports/wear3d-waist-hips-spatial-contract-v1/spatial-contract-audit.json"
CANARY_PIPELINE_ID = f"{BASE_PIPELINE_ID}-canary"
CANARY_MANIFEST_KEY = f"processed/{CANARY_PIPELINE_ID}/canary-manifest.jsonl"
CANARY_METRICS_KEY = f"reports/{CANARY_PIPELINE_ID}/validation-metrics.json"
INSTANCE_TYPE = "c8a.48xlarge"
THREADS = 192
MAX_RUNTIME_MINUTES = 180
REUSABLE_INSTANCE_ID = "i-0a7709f7b40bc9a1f"


def now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--mode", choices=("canary", "full"), default="canary")
    return parser.parse_args()


def verify_spatial_contract(project_root: Path) -> dict[str, Any]:
    path = project_root / SPATIAL_CONTRACT
    if not path.exists():
        raise RuntimeError("The tape-blind spatial contract audit is missing")
    audit = json.loads(path.read_text(encoding="utf-8"))
    metrics = audit.get("metrics") or {}
    if (
        audit.get("schemaVersion") != "wear-waist-hips-spatial-contract/v1"
        or audit.get("cards") != 10
        or audit.get("rows") != 20
        or audit.get("tapeUsed") is not False
        or audit.get("walkedPlyCircumferenceUsed") is not False
        or audit.get("shapeContractFailures") != []
        or float((metrics.get("leftPx") or {}).get("mae", 99)) > 1.0
        or float((metrics.get("rightPx") or {}).get("mae", 99)) > 1.0
        or float((metrics.get("spanPx") or {}).get("p95", 99)) > 2.0
    ):
        raise RuntimeError("The deterministic teacher spatial contract has not passed")
    return audit


def verify_local_canary(project_root: Path) -> tuple[Path, dict[str, Any]]:
    path = project_root / LOCAL_CANARY_MANIFEST
    if not path.exists():
        raise RuntimeError("The subject-disjoint local canary manifest is missing")
    records = [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]
    roles = Counter(str(record.get("role") or "") for record in records)
    subject_roles: dict[str, str] = {}
    for record in records:
        scan_id = str(record.get("scan_id") or "")
        role = str(record.get("role") or "")
        previous = subject_roles.setdefault(scan_id, role)
        if previous != role:
            raise RuntimeError(f"Canary subject leakage: {scan_id} is in {previous} and {role}")
        if role == "test" or record.get("view_id") != "front-50":
            raise RuntimeError("The canary may contain only train/validation front-50 records")
        if len(record.get("landmarks_2d") or {}) != 73:
            raise RuntimeError(f"{scan_id} does not have all 73 projected WEAR landmarks")
        for row_name in ("waist", "hips"):
            row = (record.get("rows") or {}).get(row_name) or {}
            if not all(row.get(flag) is True for flag in ("accepted", "edge_target_valid", "depth_target_valid", "shape_target_valid")):
                raise RuntimeError(f"{scan_id}.{row_name} is not a certified geometry row")
            if len(row.get("contour_points_normalized") or []) != 32:
                raise RuntimeError(f"{scan_id}.{row_name} does not have a 32-point teacher shape")
    if roles != Counter({"train": 256, "validation": 64}) or len(subject_roles) != 320:
        raise RuntimeError(f"Unexpected canary split: {dict(roles)}, {len(subject_roles)} subjects")
    return path, {"subjects": len(subject_roles), "roles": dict(roles), "sealed448Opened": False}


def verify_cloud_canary() -> dict[str, Any]:
    with tempfile.NamedTemporaryFile(suffix=".json") as handle:
        result = base.aws(
            "s3api", "get-object", "--bucket", base.BUCKET,
            "--key", CANARY_METRICS_KEY, handle.name, check=False,
        )
        if result.returncode != 0:
            raise RuntimeError("The v8 cloud canary metrics are missing; refusing the full run")
        metrics = json.loads(Path(handle.name).read_text(encoding="utf-8"))
    if metrics.get("passed") is not True or metrics.get("sealed448Opened") is not False:
        raise RuntimeError(f"The v8 cloud canary has not passed: {metrics.get('failures')}")
    if metrics.get("recordedTapeUsed") is not False or metrics.get("walkedPlyCircumferenceUsed") is not False:
        raise RuntimeError("The v8 cloud canary violated the geometry-only contract")
    return metrics


def verify_teacher() -> None:
    result = base.aws(
        "s3api", "head-object", "--bucket", base.BUCKET,
        "--key", f"processed/{TEACHER_PIPELINE_ID}/render-manifest-all.jsonl",
        check=False,
    )
    if result.returncode != 0:
        raise RuntimeError("The 4,326-person teacher manifest is missing")


def upload_code(code_prefix: str) -> None:
    for name in ("train_wear_waist_hips_geometry_v4.py", "ec2_waist_hips_geometry_v4_bootstrap.sh"):
        path = Path(__file__).with_name(name)
        base.aws(
            "s3", "cp", str(path), f"s3://{base.BUCKET}/{code_prefix}/{path.name}",
            "--sse", "AES256", "--only-show-errors",
        )


def upload_canary_manifest(path: Path) -> None:
    base.aws(
        "s3", "cp", str(path), f"s3://{base.BUCKET}/{CANARY_MANIFEST_KEY}",
        "--sse", "AES256", "--only-show-errors",
    )


def wait_for_ssm(instance_id: str, timeout_seconds: int = 600) -> None:
    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        response = base.aws_json(
            "ssm", "describe-instance-information",
            "--filters", f"Key=InstanceIds,Values={instance_id}",
        )
        items = response.get("InstanceInformationList") or []
        if items and items[0].get("PingStatus") == "Online":
            return
        time.sleep(10)
    raise RuntimeError(f"{instance_id} did not become SSM Online")


def resume_persistent(pipeline_id: str, code_prefix: str, mode: str) -> dict[str, Any]:
    response = base.aws_json("ec2", "describe-instances", "--instance-ids", REUSABLE_INSTANCE_ID)
    instance = response["Reservations"][0]["Instances"][0]
    if instance.get("InstanceType") != INSTANCE_TYPE:
        raise RuntimeError(f"Reusable worker is not {INSTANCE_TYPE}: {instance.get('InstanceType')}")
    state = (instance.get("State") or {}).get("Name")
    if state == "stopped":
        base.aws("ec2", "start-instances", "--instance-ids", REUSABLE_INSTANCE_ID)
        base.aws("ec2", "wait", "instance-running", "--instance-ids", REUSABLE_INSTANCE_ID)
    elif state != "running":
        raise RuntimeError(f"Reusable worker is not startable: {state}")
    base.aws("ec2", "wait", "instance-status-ok", "--instance-ids", REUSABLE_INSTANCE_ID)
    wait_for_ssm(REUSABLE_INSTANCE_ID)

    manifest_key = (
        f"processed/{TEACHER_PIPELINE_ID}/render-manifest-all.jsonl"
        if mode == "full" else CANARY_MANIFEST_KEY
    )
    batch_size = 64 if mode == "full" else 32
    spatial_steps = 2200 if mode == "full" else 900
    geometry_steps = 2600 if mode == "full" else 1100
    adapt_steps = 1000 if mode == "full" else 500
    eval_every = 100 if mode == "full" else 50
    remote_bootstrap = "/opt/primestyle/code/ec2_waist_hips_geometry_v4_bootstrap.sh"
    commands = [
        "set -Eeuo pipefail",
        "shutdown -c >/dev/null 2>&1 || true",
        f"aws s3 cp s3://{base.BUCKET}/{code_prefix}/train_wear_waist_hips_geometry_v4.py /opt/primestyle/code/train_wear_waist_hips_geometry_v4.py --only-show-errors",
        f"aws s3 cp s3://{base.BUCKET}/{code_prefix}/ec2_waist_hips_geometry_v4_bootstrap.sh {remote_bootstrap} --only-show-errors",
        f"chmod +x {remote_bootstrap}",
        (
            f"env WEAR_BUCKET={base.BUCKET} WEAR_PIPELINE_ID={pipeline_id} "
            f"WEAR_TEACHER_PIPELINE_ID={TEACHER_PIPELINE_ID} WEAR_CODE_PREFIX={code_prefix} "
            f"WEAR_THREADS={THREADS} WEAR_RUN_KIND={mode} WEAR_MANIFEST_KEY={manifest_key} "
            f"WEAR_BATCH_SIZE={batch_size} WEAR_SPATIAL_STEPS={spatial_steps} "
            f"WEAR_GEOMETRY_STEPS={geometry_steps} WEAR_ADAPT_STEPS={adapt_steps} "
            f"WEAR_EVAL_EVERY={eval_every} WEAR_SHUTDOWN_MINUTES={MAX_RUNTIME_MINUTES} "
            f"AWS_REGION={base.REGION} AWS_DEFAULT_REGION={base.REGION} AWS_PAGER='' "
            f"bash {remote_bootstrap}"
        ),
    ]
    result = base.aws_json(
        "ssm", "send-command",
        "--instance-ids", REUSABLE_INSTANCE_ID,
        "--document-name", "AWS-RunShellScript",
        "--timeout-seconds", str(MAX_RUNTIME_MINUTES * 60),
        "--parameters", json.dumps({"commands": commands, "executionTimeout": [str(MAX_RUNTIME_MINUTES * 60)]}),
        "--comment", f"Private CPU-only {pipeline_id}",
    )
    return {
        "instanceId": REUSABLE_INSTANCE_ID,
        "commandId": result["Command"]["CommandId"],
        "stateBeforeStart": state,
    }


def launch_persistent(image: dict[str, Any], security_group: str, user_data: Path) -> dict[str, Any]:
    offering_response = base.aws_json(
        "ec2", "describe-instance-type-offerings", "--location-type", "availability-zone",
        "--filters", f"Name=instance-type,Values={INSTANCE_TYPE}",
    )
    offerings = {item["Location"] for item in offering_response["InstanceTypeOfferings"]}
    subnets = base.aws_json(
        "ec2", "describe-subnets",
        "--filters", "Name=default-for-az,Values=true", "Name=state,Values=available",
    )["Subnets"]
    subnets = [subnet for subnet in subnets if subnet["AvailabilityZone"] in offerings]
    subnets.sort(key=lambda item: item["AvailabilityZone"])
    mapping = [{
        "DeviceName": image["RootDeviceName"],
        "Ebs": {
            "VolumeSize": 150,
            "VolumeType": "gp3",
            "Iops": 3000,
            "Throughput": 250,
            "Encrypted": True,
            "DeleteOnTermination": False,
        },
    }]
    last_error = ""
    for subnet in subnets:
        result = base.aws(
            "ec2", "run-instances", "--image-id", image["ImageId"],
            "--instance-type", INSTANCE_TYPE, "--count", "1",
            "--subnet-id", subnet["SubnetId"], "--security-group-ids", security_group,
            "--iam-instance-profile", f"Name={base.INSTANCE_PROFILE_NAME}",
            "--associate-public-ip-address", "--instance-initiated-shutdown-behavior", "stop",
            "--metadata-options", "HttpTokens=required,HttpEndpoint=enabled,HttpPutResponseHopLimit=1",
            "--block-device-mappings", json.dumps(mapping), "--user-data", f"file://{user_data}",
            "--tag-specifications",
            (
                "ResourceType=instance,Tags=["
                "{Key=Name,Value=PrimeStyleAI-WEAR-Waist-Hips-V7-Reusable},"
                "{Key=Project,Value=PrimeStyleAI},{Key=Workload,Value=WEAR3DTraining},"
                f"{{Key=PipelineId,Value={PIPELINE_ID}}},{{Key=Reuse,Value=true}}]"
            ),
            (
                "ResourceType=volume,Tags=["
                "{Key=Project,Value=PrimeStyleAI},{Key=Workload,Value=WEAR3DTraining},"
                f"{{Key=PipelineId,Value={PIPELINE_ID}}},{{Key=Reuse,Value=true}}]"
            ),
            check=False,
        )
        if result.returncode == 0:
            return json.loads(result.stdout)["Instances"][0]
        last_error = result.stderr.strip()
        if "InsufficientInstanceCapacity" not in last_error:
            break
    raise RuntimeError(f"Could not launch {INSTANCE_TYPE}: {last_error}")


def main() -> None:
    args = parse_args()
    project_root = Path.cwd().resolve()
    spatial_contract = verify_spatial_contract(project_root)
    canary_path, canary = verify_local_canary(project_root)
    pipeline_id = f"{BASE_PIPELINE_ID}-{args.mode}"
    code_prefix = f"code/{pipeline_id}"
    if args.mode == "full":
        verify_cloud_canary()
    verify_teacher()
    if base.active_instances():
        raise RuntimeError("Another Virginia WEAR worker is already active")
    upload_code(code_prefix)
    if args.mode == "canary":
        upload_canary_manifest(canary_path)
    base.infrastructure()
    base.PIPELINE_ID = pipeline_id
    base.TEACHER_PIPELINE_ID = TEACHER_PIPELINE_ID
    base.CODE_PREFIX = code_prefix
    worker = resume_persistent(pipeline_id, code_prefix, args.mode)
    print(json.dumps({
        "pipelineId": pipeline_id,
        "runKind": args.mode,
        "instanceId": worker["instanceId"],
        "ssmCommandId": worker["commandId"],
        "stateBeforeStart": worker["stateBeforeStart"],
        "instanceType": INSTANCE_TYPE,
        "realCpuCores": THREADS,
        "canarySubjects": canary.get("subjects"),
        "canaryRoles": canary.get("roles"),
        "spatialContractRows": spatial_contract.get("rows"),
        "sealed448Opened": False,
        "instanceShutdownBehavior": "stop",
        "rootVolumeDeleteOnTermination": False,
        "estimatedHourlyUsd": 10.34592,
        "launchedAt": now(),
    }, indent=2))


if __name__ == "__main__":
    main()
