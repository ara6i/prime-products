#!/usr/bin/env python3
"""Launch one isolated 192-vCPU AWS instance for full fresh WEAR training."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shlex
import subprocess
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


BUCKET = "primestyleai-wear3d-921049726279-us-east-1"
REGION = "us-east-1"
PROFILE = "primestyle-wear"
INSTANCE_PROFILE_NAME = "PrimeStyleAIWearTrainingEC2Profile"
SECURITY_GROUP_NAME = "primestyle-wear3d-training-egress-only"
INSTANCE_TYPE = "c7i.48xlarge"
VCPUS = 192
STANDARD_QUOTA_CODE = "L-1216C47A"
SHUTDOWN_MINUTES = 125
VOLUME_GB = 60


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--project-root", type=Path, default=Path.cwd())
    parser.add_argument("--job-id")
    parser.add_argument("--max-total-usd", type=float, default=20.0)
    return parser.parse_args()


def now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def default_job_id() -> str:
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    return f"wear3d-fresh-v1-full-cpu-{stamp}"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(8 * 1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


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


def aws_json(*arguments: str) -> Any:
    return json.loads(aws(*arguments, "--output", "json").stdout or "null")


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n")


def current_price() -> float:
    response = aws_json(
        "pricing", "get-products", "--service-code", "AmazonEC2", "--filters",
        "Type=TERM_MATCH,Field=location,Value=US East (N. Virginia)",
        f"Type=TERM_MATCH,Field=instanceType,Value={INSTANCE_TYPE}",
        "Type=TERM_MATCH,Field=operatingSystem,Value=Linux",
        "Type=TERM_MATCH,Field=tenancy,Value=Shared",
        "Type=TERM_MATCH,Field=preInstalledSw,Value=NA",
        "Type=TERM_MATCH,Field=capacitystatus,Value=Used",
        "--max-results", "100",
    )
    prices: list[float] = []
    for raw in response.get("PriceList", []):
        product = json.loads(raw)
        for term in (product.get("terms") or {}).get("OnDemand", {}).values():
            for dimension in (term.get("priceDimensions") or {}).values():
                if dimension.get("unit") == "Hrs":
                    prices.append(float(dimension["pricePerUnit"]["USD"]))
    if len(set(prices)) != 1:
        raise RuntimeError(f"Ambiguous current {INSTANCE_TYPE} price: {sorted(set(prices))}")
    return prices[0]


def verify_capacity() -> dict[str, Any]:
    quota = float(aws_json(
        "service-quotas", "get-service-quota", "--service-code", "ec2",
        "--quota-code", STANDARD_QUOTA_CODE,
    )["Quota"]["Value"])
    if quota < VCPUS:
        raise RuntimeError(f"Standard On-Demand quota={quota}; {VCPUS} required")
    response = aws_json(
        "ec2", "describe-instances", "--filters",
        "Name=instance-state-name,Values=pending,running,stopping",
    )
    active = [
        instance
        for reservation in response.get("Reservations", [])
        for instance in reservation.get("Instances", [])
    ]
    if active:
        raise RuntimeError("Active AWS instances would make the cost/quota cap ambiguous: " + json.dumps([
            {"id": item["InstanceId"], "type": item["InstanceType"], "state": item["State"]["Name"]}
            for item in active
        ]))
    offerings = aws_json(
        "ec2", "describe-instance-type-offerings", "--location-type", "availability-zone",
        "--filters", f"Name=instance-type,Values={INSTANCE_TYPE}",
    )
    zones = sorted(item["Location"] for item in offerings.get("InstanceTypeOfferings", []))
    if not zones:
        raise RuntimeError(f"{INSTANCE_TYPE} is unavailable in {REGION}")
    return {"quotaVcpus": quota, "activeInstances": 0, "offeredZones": zones}


def infrastructure() -> tuple[dict[str, Any], str, list[dict[str, Any]]]:
    if aws(
        "iam", "get-instance-profile", "--instance-profile-name", INSTANCE_PROFILE_NAME,
        check=False,
    ).returncode != 0:
        raise RuntimeError("Bounded WEAR instance profile is missing")
    vpcs = aws_json("ec2", "describe-vpcs", "--filters", "Name=is-default,Values=true")["Vpcs"]
    if not vpcs:
        raise RuntimeError("Virginia default VPC is missing")
    groups = aws_json(
        "ec2", "describe-security-groups", "--filters",
        f"Name=vpc-id,Values={vpcs[0]['VpcId']}",
        f"Name=group-name,Values={SECURITY_GROUP_NAME}",
    )["SecurityGroups"]
    if not groups:
        raise RuntimeError("Egress-only WEAR security group is missing")
    images = aws_json(
        "ec2", "describe-images", "--owners", "099720109477", "--filters",
        "Name=name,Values=ubuntu/images/hvm-ssd*/ubuntu-jammy-22.04-amd64-server-*",
        "Name=architecture,Values=x86_64", "Name=state,Values=available",
        "Name=root-device-type,Values=ebs",
    )["Images"]
    image = max(images, key=lambda item: item["CreationDate"])
    subnets = aws_json(
        "ec2", "describe-subnets", "--filters",
        "Name=default-for-az,Values=true", "Name=state,Values=available",
    )["Subnets"]
    subnets.sort(key=lambda item: item["AvailabilityZone"])
    return image, groups[0]["GroupId"], subnets


def user_data(bootstrap: Path, values: dict[str, str]) -> str:
    lines = bootstrap.read_text().splitlines()
    exports = [f"export {key}={shlex.quote(value)}" for key, value in values.items()]
    return "\n".join([lines[0], *exports, *lines[1:]]) + "\n"


def main() -> None:
    args = parse_args()
    project_root = args.project_root.resolve()
    job_id = args.job_id or default_job_id()
    if not re.fullmatch(r"wear3d-fresh-v1-full-cpu-[0-9A-Za-z-]+", job_id):
        raise RuntimeError(f"Unsafe fresh full CPU job ID: {job_id}")
    if "v9" in job_id.lower():
        raise RuntimeError("Fresh full CPU job cannot reference V9")
    job_dir = project_root / ".local-ml/wear3d-fresh-v1/jobs" / job_id
    if job_dir.exists():
        raise RuntimeError(f"Fresh job directory already exists: {job_dir}")
    job_dir.mkdir(parents=True)

    input_root = project_root / ".local-ml/wear3d-fresh-v1/training-input"
    index_path = input_root / "fresh-training-index-v1.npz"
    metadata_path = input_root / "fresh-training-index-v1.json"
    metadata = json.loads(metadata_path.read_text())
    if (
        metadata.get("indexSha256") != sha256(index_path)
        or metadata.get("subjects") != {"train": 3451, "validation": 427}
        or metadata.get("sealedTestSubjectsUsed") != 0
        or metadata.get("v9ArtifactUsed") is not False
        or metadata.get("previousWeightsUsed") is not False
    ):
        raise RuntimeError("Fresh training index metadata failed before launch")

    capacity = verify_capacity()
    price = current_price()
    compute_cap = price * SHUTDOWN_MINUTES / 60.0
    storage_allowance = 0.15
    total_cap = compute_cap + storage_allowance
    if total_cap > args.max_total_usd:
        raise RuntimeError(f"AWS cap ${total_cap:.3f} exceeds authorized ${args.max_total_usd:.2f}")
    image, security_group, subnets = infrastructure()

    code_root = project_root / "scripts/local-ml/cloud/wear3d-fresh-v1"
    code_paths = [
        code_root / "teacher_contract.py",
        code_root / "fresh_student_contract.py",
        code_root / "train_fresh_full_cpu.py",
    ]
    for path in code_paths:
        if not path.is_file():
            raise RuntimeError(f"Missing fresh full CPU code: {path}")
    code_prefix = f"code/{job_id}"
    # The bounded EC2 role can read per-job inputs only under jobs/*.
    input_prefix = f"jobs/{job_id}"
    for path in code_paths:
        aws("s3", "cp", str(path), f"s3://{BUCKET}/{code_prefix}/{path.name}",
            "--sse", "AES256", "--only-show-errors")
    index_key = f"{input_prefix}/training-index.npz"
    metadata_key = f"{input_prefix}/training-index.json"
    aws("s3", "cp", str(index_path), f"s3://{BUCKET}/{index_key}",
        "--sse", "AES256", "--only-show-errors")
    aws("s3", "cp", str(metadata_path), f"s3://{BUCKET}/{metadata_key}",
        "--sse", "AES256", "--content-type", "application/json", "--only-show-errors")

    report_prefix = f"reports/{job_id}"
    plan: dict[str, Any] = {
        "schemaVersion": "wear3d-fresh-full-cpu-job/v1",
        "jobId": job_id,
        "state": "prepared",
        "createdAt": now(),
        "region": REGION,
        "instanceType": INSTANCE_TYPE,
        "vcpus": VCPUS,
        "teacherJobId": metadata["teacherJobId"],
        "trainingIndex": {
            "key": index_key,
            "sha256": metadata["indexSha256"],
            "subjects": metadata["subjects"],
            "records": metadata["records"],
            "targets": metadata["targets"],
        },
        "freshInitialization": True,
        "previousWeightsUsed": False,
        "previousPredictionsUsed": False,
        "v9ArtifactUsed": False,
        "sealedTest": {"subjects": 448, "queued": 0, "labelsInspected": False},
        "quota": capacity,
        "cost": {
            "currency": "USD",
            "hourlyCompute": price,
            "shutdownMinutes": SHUTDOWN_MINUTES,
            "maximumCompute": round(compute_cap, 6),
            "storageAllowance": storage_allowance,
            "maximumEstimatedTotal": round(total_cap, 6),
            "authorizedMaximum": args.max_total_usd,
        },
        "reportPrefix": f"s3://{BUCKET}/{report_prefix}/",
    }
    plan_path = job_dir / "job-plan.json"
    write_json(plan_path, plan)
    aws("s3", "cp", str(plan_path), f"s3://{BUCKET}/{report_prefix}/job-plan.json",
        "--sse", "AES256", "--content-type", "application/json", "--only-show-errors")

    bootstrap = code_root / "ec2_fresh_full_cpu_bootstrap.sh"
    values = {
        "WEAR_BUCKET": BUCKET,
        "WEAR_JOB_ID": job_id,
        "WEAR_CODE_PREFIX": code_prefix,
        "WEAR_INDEX_KEY": index_key,
        "WEAR_INDEX_METADATA_KEY": metadata_key,
        "WEAR_REPORT_PREFIX": report_prefix,
        "WEAR_SHUTDOWN_MINUTES": str(SHUTDOWN_MINUTES),
        "AWS_REGION": REGION,
    }
    mapping = [{
        "DeviceName": image["RootDeviceName"],
        "Ebs": {
            "VolumeSize": VOLUME_GB,
            "VolumeType": "gp3",
            "Iops": 3000,
            "Throughput": 250,
            "Encrypted": True,
            "DeleteOnTermination": True,
        },
    }]
    launched: dict[str, Any] | None = None
    last_error = ""
    with tempfile.NamedTemporaryFile("w", suffix=".sh", delete=False) as handle:
        handle.write(user_data(bootstrap, values))
        user_data_path = Path(handle.name)
    try:
        for subnet in subnets:
            if subnet["AvailabilityZone"] not in capacity["offeredZones"]:
                continue
            result = aws(
                "ec2", "run-instances", "--image-id", image["ImageId"],
                "--instance-type", INSTANCE_TYPE, "--count", "1",
                "--subnet-id", subnet["SubnetId"], "--security-group-ids", security_group,
                "--iam-instance-profile", f"Name={INSTANCE_PROFILE_NAME}",
                "--associate-public-ip-address",
                "--instance-initiated-shutdown-behavior", "terminate",
                "--metadata-options", "HttpTokens=required,HttpEndpoint=enabled,HttpPutResponseHopLimit=1",
                "--block-device-mappings", json.dumps(mapping),
                "--user-data", f"file://{user_data_path}",
                "--tag-specifications", json.dumps([
                    {"ResourceType": "instance", "Tags": [
                        {"Key": "Name", "Value": "PrimeStyleAI-WEAR-FRESH-FULL-CPU"},
                        {"Key": "Project", "Value": "PrimeStyleAI"},
                        {"Key": "Workload", "Value": "WEAR3DFreshFullCPU"},
                        {"Key": "PipelineId", "Value": job_id},
                        {"Key": "FreshModel", "Value": "true"},
                    ]},
                    {"ResourceType": "volume", "Tags": [
                        {"Key": "Project", "Value": "PrimeStyleAI"},
                        {"Key": "Workload", "Value": "WEAR3DFreshFullCPU"},
                        {"Key": "PipelineId", "Value": job_id},
                    ]},
                ], separators=(",", ":")),
                check=False,
            )
            if result.returncode == 0:
                launched = json.loads(result.stdout)["Instances"][0]
                break
            last_error = result.stderr.strip()
            if "InsufficientInstanceCapacity" not in last_error:
                break
    finally:
        user_data_path.unlink(missing_ok=True)
    if launched is None:
        raise RuntimeError(f"Could not launch {INSTANCE_TYPE}: {last_error}")

    plan.update({
        "state": "running",
        "launchedAt": now(),
        "instanceId": launched["InstanceId"],
        "availabilityZone": launched["Placement"]["AvailabilityZone"],
        "amiId": image["ImageId"],
    })
    write_json(plan_path, plan)
    aws("s3", "cp", str(plan_path), f"s3://{BUCKET}/{report_prefix}/job-plan.json",
        "--sse", "AES256", "--content-type", "application/json", "--only-show-errors")
    print(json.dumps({
        "jobId": job_id,
        "state": "running",
        "instanceId": launched["InstanceId"],
        "instanceType": INSTANCE_TYPE,
        "vcpus": VCPUS,
        "hourlyComputeUsd": price,
        "maximumEstimatedTotalUsd": total_cap,
        "shutdownMinutes": SHUTDOWN_MINUTES,
        "trainSubjects": 3_451,
        "validationSubjects": 427,
        "sealedTestSubjectsQueued": 0,
        "plan": str(plan_path),
        "progressKey": f"s3://{BUCKET}/{report_prefix}/progress.json",
    }, indent=2))


if __name__ == "__main__":
    main()
