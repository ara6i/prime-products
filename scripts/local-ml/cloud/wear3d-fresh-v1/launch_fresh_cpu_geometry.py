#!/usr/bin/env python3
"""Launch an isolated 256-vCPU AWS job for fresh WEAR teacher geometry."""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import shlex
import subprocess
import tempfile
from typing import Any


BUCKET = "primestyleai-wear3d-921049726279-us-east-1"
REGION = "us-east-1"
PROFILE = "primestyle-wear"
INSTANCE_PROFILE_NAME = "PrimeStyleAIWearTrainingEC2Profile"
SECURITY_GROUP_NAME = "primestyle-wear3d-training-egress-only"
BLENDER_ARCHIVE_KEY = "runtime/blender/blender-5.2.0-linux-x64.tar.xz"
SOURCE_MANIFEST = Path(".local-ml/wear3d-v6-audit/source-manifest-standing-a.jsonl")
SOURCE_PREFLIGHT = Path(".local-ml/reports/wear-fresh-v1-source-preflight.json")
STANDARD_QUOTA_CODE = "L-1216C47A"
SHUTDOWN_MINUTES = 87
VOLUME_GB = 100
INSTANCE_CONFIGS = tuple(
    {
        "shardId": f"cpu-32-{index:02d}",
        "instanceType": "c7i.8xlarge",
        "vcpus": 32,
        "workers": 21,
        "downloadWorkers": 16,
        "allocationSlots": (index,),
    }
    for index in range(8)
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--project-root", type=Path, default=Path.cwd())
    parser.add_argument("--job-id")
    parser.add_argument("--max-total-usd", type=float, default=20.0)
    parser.add_argument("--prior-spend-usd", type=float, default=0.0)
    return parser.parse_args()


def now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def default_job_id() -> str:
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    return f"wear3d-fresh-v1-cpu-geometry-{stamp}"


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
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
    path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")


def write_jsonl(path: Path, records: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        "".join(json.dumps(record, separators=(",", ":"), sort_keys=True) + "\n" for record in records),
        encoding="utf-8",
    )


def source_key(path: str) -> str:
    marker = "/opt/primestyle/wear3d/raw/"
    if not path.startswith(marker):
        raise RuntimeError(f"source path is outside fresh raw root: {path}")
    relative = path[len(marker):]
    if not relative or ".." in Path(relative).parts:
        raise RuntimeError(f"unsafe source path: {path}")
    return "raw/" + relative


def load_and_split(project_root: Path, job_dir: Path) -> tuple[list[dict[str, Any]], dict[str, Path]]:
    preflight_path = project_root / SOURCE_PREFLIGHT
    preflight = json.loads(preflight_path.read_text(encoding="utf-8"))
    if (
        preflight.get("schemaVersion") != "wear3d-fresh-source-preflight/v1"
        or preflight.get("sourceGatePassed") is not True
        or preflight.get("v9ArtifactUsed") is not False
        or (preflight.get("sealedTest") or {}).get("labelsUsedForPreflightOrSelection") is not False
    ):
        raise RuntimeError("fresh source preflight is missing or failed")
    manifest_path = project_root / SOURCE_MANIFEST
    records = [json.loads(line) for line in manifest_path.read_text(encoding="utf-8").splitlines() if line.strip()]
    split_counts = {
        role: len({str(record.get("subject_id")) for record in records if record.get("role") == role})
        for role in ("train", "validation", "test")
    }
    if split_counts != {"train": 3451, "validation": 427, "test": 448}:
        raise RuntimeError(f"source split changed: {split_counts}")
    selected = sorted(
        (record for record in records if record.get("role") in {"train", "validation"}),
        key=lambda record: (
            str(record.get("role")),
            str(record.get("region")),
            str(record.get("gender")),
            str(record.get("scan_id")),
        ),
    )
    if len(selected) != 3878:
        raise RuntimeError(f"fresh train+validation subjects={len(selected)} expected=3878")
    invalid = [
        str(record.get("scan_id"))
        for record in selected
        if record.get("training_pose_valid") is not True
        or not str(record.get("scan_id", "")).endswith("-A")
        or record.get("role") == "test"
    ]
    if invalid:
        raise RuntimeError(f"invalid source records in fresh job: {invalid[:10]}")
    shards = {config["shardId"]: [] for config in INSTANCE_CONFIGS}
    allocation_count = max(
        slot
        for config in INSTANCE_CONFIGS
        for slot in config["allocationSlots"]
    ) + 1
    for index, record in enumerate(selected):
        slot = index % allocation_count
        config = next(item for item in INSTANCE_CONFIGS if slot in item["allocationSlots"])
        shards[str(config["shardId"])].append(record)
    shard_paths = {}
    combined_subjects = set()
    for config in INSTANCE_CONFIGS:
        shard_id = str(config["shardId"])
        path = job_dir / "manifests" / f"{shard_id}.jsonl"
        shard_records = shards[shard_id]
        write_jsonl(path, shard_records)
        shard_paths[shard_id] = path
        subjects = {str(record["subject_id"]) for record in shard_records}
        if combined_subjects & subjects:
            raise RuntimeError("subject overlap between fresh CPU shards")
        combined_subjects.update(subjects)
    if len(combined_subjects) != 3878:
        raise RuntimeError("fresh shard union does not contain exactly 3,878 people")
    return records, shard_paths


def verify_s3_sources(records: list[dict[str, Any]]) -> dict[str, Any]:
    selected = [record for record in records if record.get("role") in {"train", "validation"}]
    response = aws_json(
        "s3api",
        "list-objects-v2",
        "--bucket",
        BUCKET,
        "--prefix",
        "raw/WEAR3DDATA/",
    )
    objects = {item["Key"]: int(item["Size"]) for item in response.get("Contents", [])}
    keys = {
        source_key(str((record.get("source") or {})[field]))
        for record in selected
        for field in ("mesh", "landmarks")
    }
    missing = sorted(key for key in keys if key not in objects)
    if missing:
        raise RuntimeError(f"{len(missing)} fresh source objects are missing from S3: {missing[:10]}")
    return {
        "subjects": len(selected),
        "objects": len(keys),
        "bytes": sum(objects[key] for key in keys),
        "GiB": round(sum(objects[key] for key in keys) / 1024**3, 3),
        "missingObjects": 0,
        "verifiedAt": now(),
    }


def current_price(instance_type: str) -> float:
    response = aws_json(
        "pricing",
        "get-products",
        "--service-code",
        "AmazonEC2",
        "--filters",
        "Type=TERM_MATCH,Field=location,Value=US East (N. Virginia)",
        f"Type=TERM_MATCH,Field=instanceType,Value={instance_type}",
        "Type=TERM_MATCH,Field=operatingSystem,Value=Linux",
        "Type=TERM_MATCH,Field=tenancy,Value=Shared",
        "Type=TERM_MATCH,Field=preInstalledSw,Value=NA",
        "Type=TERM_MATCH,Field=capacitystatus,Value=Used",
        "--max-results",
        "100",
    )
    prices = []
    for raw in response.get("PriceList", []):
        product = json.loads(raw)
        for term in (product.get("terms") or {}).get("OnDemand", {}).values():
            for dimension in (term.get("priceDimensions") or {}).values():
                if dimension.get("unit") == "Hrs":
                    prices.append(float(dimension["pricePerUnit"]["USD"]))
    if len(set(prices)) != 1:
        raise RuntimeError(f"ambiguous current price for {instance_type}: {sorted(set(prices))}")
    return prices[0]


def verify_capacity() -> dict[str, Any]:
    quota = float(
        aws_json(
            "service-quotas",
            "get-service-quota",
            "--service-code",
            "ec2",
            "--quota-code",
            STANDARD_QUOTA_CODE,
        )["Quota"]["Value"]
    )
    if quota < 256:
        raise RuntimeError(f"Standard On-Demand quota={quota} vCPUs; 256 required")
    active_response = aws_json(
        "ec2",
        "describe-instances",
        "--filters",
        "Name=instance-state-name,Values=pending,running",
    )
    active = [
        instance
        for reservation in active_response.get("Reservations", [])
        for instance in reservation.get("Instances", [])
    ]
    if active:
        raise RuntimeError(
            "AWS already has active EC2 instances; refusing to claim the full quota: "
            + json.dumps([{"id": item["InstanceId"], "type": item["InstanceType"]} for item in active])
        )
    offerings = {}
    for instance_type in sorted({str(config["instanceType"]) for config in INSTANCE_CONFIGS}):
        response = aws_json(
            "ec2",
            "describe-instance-type-offerings",
            "--location-type",
            "availability-zone",
            "--filters",
            f"Name=instance-type,Values={instance_type}",
        )
        zones = sorted(item["Location"] for item in response.get("InstanceTypeOfferings", []))
        if not zones:
            raise RuntimeError(f"{instance_type} is not offered in us-east-1")
        offerings[instance_type] = zones
    return {"standardOnDemandQuotaVcpus": quota, "activeInstances": 0, "offerings": offerings}


def infrastructure() -> tuple[dict[str, Any], str, list[dict[str, Any]]]:
    profile = aws(
        "iam",
        "get-instance-profile",
        "--instance-profile-name",
        INSTANCE_PROFILE_NAME,
        check=False,
    )
    if profile.returncode != 0:
        raise RuntimeError("bounded WEAR EC2 instance profile is missing")
    vpcs = aws_json("ec2", "describe-vpcs", "--filters", "Name=is-default,Values=true")["Vpcs"]
    if not vpcs:
        raise RuntimeError("Virginia default VPC is missing")
    groups = aws_json(
        "ec2",
        "describe-security-groups",
        "--filters",
        f"Name=vpc-id,Values={vpcs[0]['VpcId']}",
        f"Name=group-name,Values={SECURITY_GROUP_NAME}",
    )["SecurityGroups"]
    if not groups:
        raise RuntimeError("egress-only WEAR security group is missing")
    images = aws_json(
        "ec2",
        "describe-images",
        "--owners",
        "099720109477",
        "--filters",
        "Name=name,Values=ubuntu/images/hvm-ssd*/ubuntu-jammy-22.04-amd64-server-*",
        "Name=architecture,Values=x86_64",
        "Name=state,Values=available",
        "Name=root-device-type,Values=ebs",
    )["Images"]
    image = max(images, key=lambda item: item["CreationDate"])
    subnets = aws_json(
        "ec2",
        "describe-subnets",
        "--filters",
        "Name=default-for-az,Values=true",
        "Name=state,Values=available",
    )["Subnets"]
    subnets.sort(key=lambda item: item["AvailabilityZone"])
    return image, groups[0]["GroupId"], subnets


def upload_inputs(
    project_root: Path,
    job_id: str,
    shard_paths: dict[str, Path],
    job_plan_path: Path,
) -> tuple[str, dict[str, str]]:
    code_prefix = f"code/{job_id}"
    fresh_root = project_root / "scripts/local-ml/cloud/wear3d-fresh-v1"
    files = (
        project_root / ".local-ml/tools/render_wear3d_pilot.py",
        project_root / "scripts/local-ml/wear_full_contract.py",
        project_root / "scripts/local-ml/cloud/wear3d-v6/render_wear3d_multiview.py",
        fresh_root / "render_fresh_teacher.py",
        fresh_root / "teacher_contract.py",
        fresh_root / "audit_rendered_geometry.py",
        fresh_root / "run_fresh_geometry.py",
    )
    for path in files:
        if not path.is_file():
            raise RuntimeError(f"required fresh code is missing: {path}")
        aws(
            "s3",
            "cp",
            str(path),
            f"s3://{BUCKET}/{code_prefix}/{path.name}",
            "--sse",
            "AES256",
            "--only-show-errors",
        )
    manifest_keys = {}
    for shard_id, path in shard_paths.items():
        key = f"manifests/{job_id}/{shard_id}.jsonl"
        aws("s3", "cp", str(path), f"s3://{BUCKET}/{key}", "--sse", "AES256", "--only-show-errors")
        manifest_keys[shard_id] = key
    aws(
        "s3",
        "cp",
        str(job_plan_path),
        f"s3://{BUCKET}/reports/{job_id}/job-plan.json",
        "--sse",
        "AES256",
        "--content-type",
        "application/json",
        "--only-show-errors",
    )
    return code_prefix, manifest_keys


def user_data(
    bootstrap: Path,
    *,
    job_id: str,
    shard_id: str,
    manifest_key: str,
    code_prefix: str,
    expected_subjects: int,
    workers: int,
    download_workers: int,
) -> str:
    lines = bootstrap.read_text(encoding="utf-8").splitlines()
    values = {
        "WEAR_BUCKET": BUCKET,
        "WEAR_JOB_ID": job_id,
        "WEAR_SHARD_ID": shard_id,
        "WEAR_MANIFEST_KEY": manifest_key,
        "WEAR_OUTPUT_PREFIX": f"processed/{job_id}",
        "WEAR_REPORT_PREFIX": f"reports/{job_id}",
        "WEAR_CODE_PREFIX": code_prefix,
        "WEAR_BLENDER_ARCHIVE_KEY": BLENDER_ARCHIVE_KEY,
        "WEAR_EXPECTED_SUBJECTS": str(expected_subjects),
        "WEAR_WORKERS": str(workers),
        "WEAR_DOWNLOAD_WORKERS": str(download_workers),
        "WEAR_CHUNK_SIZE": "4",
        "WEAR_SHUTDOWN_MINUTES": str(SHUTDOWN_MINUTES),
        "AWS_REGION": REGION,
    }
    exports = [f"export {key}={shlex.quote(value)}" for key, value in values.items()]
    return "\n".join([lines[0], *exports, *lines[1:]]) + "\n"


def launch_instance(
    image: dict[str, Any],
    security_group: str,
    subnets: list[dict[str, Any]],
    config: dict[str, Any],
    job_id: str,
    user_data_path: Path,
    offered_zones: list[str],
) -> dict[str, Any]:
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
    last_error = ""
    for subnet in subnets:
        if subnet["AvailabilityZone"] not in offered_zones:
            continue
        result = aws(
            "ec2",
            "run-instances",
            "--image-id",
            image["ImageId"],
            "--instance-type",
            str(config["instanceType"]),
            "--count",
            "1",
            "--subnet-id",
            subnet["SubnetId"],
            "--security-group-ids",
            security_group,
            "--iam-instance-profile",
            f"Name={INSTANCE_PROFILE_NAME}",
            "--associate-public-ip-address",
            "--instance-initiated-shutdown-behavior",
            "terminate",
            "--metadata-options",
            "HttpTokens=required,HttpEndpoint=enabled,HttpPutResponseHopLimit=1",
            "--block-device-mappings",
            json.dumps(mapping),
            "--user-data",
            f"file://{user_data_path}",
            "--tag-specifications",
            json.dumps([
                {
                    "ResourceType": "instance",
                    "Tags": [
                        {"Key": "Name", "Value": f"PrimeStyleAI-WEAR-FRESH-{config['shardId']}"},
                        {"Key": "Project", "Value": "PrimeStyleAI"},
                        {"Key": "Workload", "Value": "WEAR3DFreshCPU"},
                        {"Key": "PipelineId", "Value": job_id},
                        {"Key": "FreshModel", "Value": "true"},
                        {"Key": "ShardId", "Value": str(config["shardId"])},
                    ],
                },
                {
                    "ResourceType": "volume",
                    "Tags": [
                        {"Key": "Project", "Value": "PrimeStyleAI"},
                        {"Key": "Workload", "Value": "WEAR3DFreshCPU"},
                        {"Key": "PipelineId", "Value": job_id},
                        {"Key": "FreshModel", "Value": "true"},
                    ],
                },
            ], separators=(",", ":")),
            check=False,
        )
        if result.returncode == 0:
            return json.loads(result.stdout)["Instances"][0]
        last_error = result.stderr.strip()
        if "InsufficientInstanceCapacity" not in last_error:
            break
    raise RuntimeError(f"could not launch {config['instanceType']}: {last_error}")


def main() -> None:
    args = parse_args()
    project_root = args.project_root.resolve()
    job_id = args.job_id or default_job_id()
    if not re.fullmatch(r"wear3d-fresh-v1-cpu-geometry-[0-9A-Za-z-]+", job_id):
        raise RuntimeError(f"unsafe fresh job id: {job_id}")
    if "v9" in job_id.lower():
        raise RuntimeError("fresh job id must not reference v9")
    job_dir = project_root / ".local-ml/wear3d-fresh-v1/jobs" / job_id
    if job_dir.exists():
        raise RuntimeError(f"fresh local job directory already exists: {job_dir}")
    job_dir.mkdir(parents=True)

    records, shard_paths = load_and_split(project_root, job_dir)
    source_inventory = verify_s3_sources(records)
    capacity = verify_capacity()
    prices = {
        instance_type: current_price(instance_type)
        for instance_type in sorted({str(config["instanceType"]) for config in INSTANCE_CONFIGS})
    }
    hourly_compute = sum(prices[str(config["instanceType"])] for config in INSTANCE_CONFIGS)
    compute_cap = hourly_compute * SHUTDOWN_MINUTES / 60.0
    conservative_storage_cap = 0.20
    total_cap = args.prior_spend_usd + compute_cap + conservative_storage_cap
    if total_cap > args.max_total_usd:
        raise RuntimeError(
            f"fresh CPU cap ${total_cap:.3f} exceeds authorized ${args.max_total_usd:.2f}"
        )
    image, security_group, subnets = infrastructure()
    preflight_path = project_root / SOURCE_PREFLIGHT
    plan = {
        "schemaVersion": "wear3d-fresh-cpu-job/v1",
        "jobId": job_id,
        "state": "prepared",
        "createdAt": now(),
        "region": REGION,
        "teacherPipelineId": "wear3d-fresh-teacher-v1",
        "v9ArtifactUsed": False,
        "previousWeightsUsed": False,
        "previousPredictionsUsed": False,
        "previousProcessedArtifactRead": False,
        "allowedInputs": ["raw WEAR standing-A PLY", "raw WEAR standing-A LND", "source measurements embedded in fresh manifest"],
        "sealedTest": {"subjects": 448, "queued": 0, "labelsInspected": False},
        "trainingRoles": {"train": 3451, "validation": 427},
        "sourceInventory": source_inventory,
        "sourcePreflight": {"path": str(preflight_path), "sha256": sha256(preflight_path)},
        "sourceManifest": {"path": str(project_root / SOURCE_MANIFEST), "sha256": sha256(project_root / SOURCE_MANIFEST)},
        "instances": [],
        "quota": capacity,
        "cost": {
            "currency": "USD",
            "hourlyCompute": round(hourly_compute, 6),
            "shutdownMinutes": SHUTDOWN_MINUTES,
            "maximumCompute": round(compute_cap, 6),
            "conservativeStorageAllowance": conservative_storage_cap,
            "priorSupersededWorkerSpend": args.prior_spend_usd,
            "maximumEstimatedTotal": round(total_cap, 6),
            "authorizedMaximum": args.max_total_usd,
            "prices": prices,
        },
        "outputPrefix": f"s3://{BUCKET}/processed/{job_id}/",
        "reportPrefix": f"s3://{BUCKET}/reports/{job_id}/",
    }
    for config in INSTANCE_CONFIGS:
        path = shard_paths[str(config["shardId"])]
        shard_records = [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]
        plan["instances"].append({
            "shardId": config["shardId"],
            "instanceType": config["instanceType"],
            "vcpus": config["vcpus"],
            "workers": config["workers"],
            "downloadWorkers": config["downloadWorkers"],
            "subjects": len(shard_records),
            "roles": {
                role: sum(record.get("role") == role for record in shard_records)
                for role in ("train", "validation")
            },
            "manifestSha256": sha256(path),
        })
    plan_path = job_dir / "job-plan.json"
    write_json(plan_path, plan)
    code_prefix, manifest_keys = upload_inputs(project_root, job_id, shard_paths, plan_path)
    bootstrap = project_root / "scripts/local-ml/cloud/wear3d-fresh-v1/ec2_fresh_geometry_bootstrap.sh"

    launched = []
    try:
        for config in INSTANCE_CONFIGS:
            shard_id = str(config["shardId"])
            shard_plan = next(item for item in plan["instances"] if item["shardId"] == shard_id)
            with tempfile.NamedTemporaryFile("w", suffix=".sh", delete=False) as handle:
                handle.write(user_data(
                    bootstrap,
                    job_id=job_id,
                    shard_id=shard_id,
                    manifest_key=manifest_keys[shard_id],
                    code_prefix=code_prefix,
                    expected_subjects=int(shard_plan["subjects"]),
                    workers=int(config["workers"]),
                    download_workers=int(config["downloadWorkers"]),
                ))
                user_data_path = Path(handle.name)
            try:
                instance = launch_instance(
                    image,
                    security_group,
                    subnets,
                    config,
                    job_id,
                    user_data_path,
                    capacity["offerings"][str(config["instanceType"])],
                )
            finally:
                user_data_path.unlink(missing_ok=True)
            launched.append(instance)
            shard_plan.update({
                "instanceId": instance["InstanceId"],
                "availabilityZone": instance["Placement"]["AvailabilityZone"],
                "manifestKey": manifest_keys[shard_id],
            })
    except Exception:
        if launched:
            aws("ec2", "terminate-instances", "--instance-ids", *(item["InstanceId"] for item in launched), check=False)
        raise

    plan["state"] = "running"
    plan["launchedAt"] = now()
    plan["amiId"] = image["ImageId"]
    write_json(plan_path, plan)
    aws(
        "s3",
        "cp",
        str(plan_path),
        f"s3://{BUCKET}/reports/{job_id}/job-plan.json",
        "--sse",
        "AES256",
        "--content-type",
        "application/json",
        "--only-show-errors",
    )
    print(json.dumps({
        "jobId": job_id,
        "state": "running",
        "totalVcpus": sum(int(config["vcpus"]) for config in INSTANCE_CONFIGS),
        "hourlyComputeUsd": hourly_compute,
        "maximumEstimatedTotalUsd": total_cap,
        "shutdownMinutes": SHUTDOWN_MINUTES,
        "sourceSubjects": source_inventory["subjects"],
        "sourceGiB": source_inventory["GiB"],
        "sealedTestSubjectsQueued": 0,
        "instances": [
            {
                "instanceId": item["instanceId"],
                "instanceType": item["instanceType"],
                "shardId": item["shardId"],
                "subjects": item["subjects"],
            }
            for item in plan["instances"]
        ],
        "plan": str(plan_path),
        "reportPrefix": plan["reportPrefix"],
    }, indent=2))


if __name__ == "__main__":
    main()
