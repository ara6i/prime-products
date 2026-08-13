#!/usr/bin/env python3
"""Create the bounded EC2 worker and launch the full WEAR training run."""

from __future__ import annotations

import argparse
import json
import os
import subprocess
import tempfile
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


BUCKET = "primestyleai-wear3d-921049726279-us-east-1"
REGION = "us-east-1"
PROFILE = "primestyle-wear"
PIPELINE_ID = "wear3d-full-v1-20260813"
STATUS_KEY = "jobs/wear3d-full-v1/status.json"
CODE_PREFIX = "code/wear3d-full-v1"
ROLE_NAME = "PrimeStyleAIWearTrainingEC2Role"
INSTANCE_PROFILE_NAME = "PrimeStyleAIWearTrainingEC2Profile"
SECURITY_GROUP_NAME = "primestyle-wear3d-training-egress-only"
INSTANCE_TYPE = "g4dn.xlarge"
VOLUME_GB = 160
MAX_RUNTIME_HOURS = 10


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def aws(*arguments: str, check: bool = True) -> subprocess.CompletedProcess[str]:
    environment = os.environ.copy()
    environment.update(
        {
            "AWS_PROFILE": PROFILE,
            "AWS_REGION": REGION,
            "AWS_DEFAULT_REGION": REGION,
            "AWS_PAGER": "",
        }
    )
    return subprocess.run(
        ["aws", *arguments],
        check=check,
        text=True,
        capture_output=True,
        env=environment,
    )


def aws_json(*arguments: str) -> Any:
    result = aws(*arguments, "--output", "json")
    return json.loads(result.stdout or "null")


def ensure_role() -> None:
    trust = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Effect": "Allow",
                "Principal": {"Service": "ec2.amazonaws.com"},
                "Action": "sts:AssumeRole",
            }
        ],
    }
    if aws("iam", "get-role", "--role-name", ROLE_NAME, check=False).returncode != 0:
        aws(
            "iam",
            "create-role",
            "--role-name",
            ROLE_NAME,
            "--description",
            "Bounded EC2 worker for the full PrimeStyleAI WEAR 3D pipeline.",
            "--assume-role-policy-document",
            json.dumps(trust),
            "--tags",
            "Key=Project,Value=PrimeStyleAI",
            "Key=Workload,Value=WEAR3DTraining",
        )
    policy = {
        "Version": "2012-10-17",
        "Statement": [
            {
                "Sid": "ListTrainingBucket",
                "Effect": "Allow",
                "Action": ["s3:GetBucketLocation", "s3:ListBucket"],
                "Resource": f"arn:aws:s3:::{BUCKET}",
            },
            {
                "Sid": "ReadTrainingInputs",
                "Effect": "Allow",
                "Action": ["s3:GetObject", "s3:GetObjectVersion"],
                "Resource": [
                    f"arn:aws:s3:::{BUCKET}/raw/*",
                    f"arn:aws:s3:::{BUCKET}/code/*",
                    f"arn:aws:s3:::{BUCKET}/manifests/*",
                    f"arn:aws:s3:::{BUCKET}/processed/*",
                    f"arn:aws:s3:::{BUCKET}/jobs/*",
                ],
            },
            {
                "Sid": "WriteTrainingOutputs",
                "Effect": "Allow",
                "Action": ["s3:GetObject", "s3:PutObject", "s3:AbortMultipartUpload", "s3:DeleteObject"],
                "Resource": [
                    f"arn:aws:s3:::{BUCKET}/processed/*",
                    f"arn:aws:s3:::{BUCKET}/models/*",
                    f"arn:aws:s3:::{BUCKET}/reports/*",
                    f"arn:aws:s3:::{BUCKET}/jobs/*",
                    f"arn:aws:s3:::{BUCKET}/manifests/*",
                ],
            },
        ],
    }
    aws(
        "iam",
        "put-role-policy",
        "--role-name",
        ROLE_NAME,
        "--policy-name",
        "WearTrainingDataOnly",
        "--policy-document",
        json.dumps(policy),
    )
    if aws("iam", "get-instance-profile", "--instance-profile-name", INSTANCE_PROFILE_NAME, check=False).returncode != 0:
        aws("iam", "create-instance-profile", "--instance-profile-name", INSTANCE_PROFILE_NAME)
    profile = aws_json("iam", "get-instance-profile", "--instance-profile-name", INSTANCE_PROFILE_NAME)
    role_names = {
        role["RoleName"]
        for role in profile["InstanceProfile"].get("Roles", [])
    }
    if ROLE_NAME not in role_names:
        aws(
            "iam",
            "add-role-to-instance-profile",
            "--instance-profile-name",
            INSTANCE_PROFILE_NAME,
            "--role-name",
            ROLE_NAME,
        )
        time.sleep(10)


def ensure_security_group() -> str:
    vpcs = aws_json("ec2", "describe-vpcs", "--filters", "Name=is-default,Values=true")["Vpcs"]
    if not vpcs:
        raise RuntimeError("No default VPC is available in us-east-1")
    vpc_id = vpcs[0]["VpcId"]
    groups = aws_json(
        "ec2",
        "describe-security-groups",
        "--filters",
        f"Name=vpc-id,Values={vpc_id}",
        f"Name=group-name,Values={SECURITY_GROUP_NAME}",
    )["SecurityGroups"]
    if groups:
        return groups[0]["GroupId"]
    created = aws_json(
        "ec2",
        "create-security-group",
        "--group-name",
        SECURITY_GROUP_NAME,
        "--description",
        "No inbound access; outbound-only WEAR 3D training worker.",
        "--vpc-id",
        vpc_id,
        "--tag-specifications",
        "ResourceType=security-group,Tags=[{Key=Project,Value=PrimeStyleAI},{Key=Workload,Value=WEAR3DTraining}]",
    )
    return created["GroupId"]


def latest_dlami() -> dict[str, Any]:
    images = aws_json(
        "ec2",
        "describe-images",
        "--owners",
        "amazon",
        "--filters",
        "Name=name,Values=Deep Learning OSS Nvidia Driver AMI GPU PyTorch 2.7 (Ubuntu 22.04)*",
        "Name=architecture,Values=x86_64",
        "Name=state,Values=available",
    )["Images"]
    if not images:
        raise RuntimeError("AWS Deep Learning PyTorch AMI was not found")
    return max(images, key=lambda image: image["CreationDate"])


def latest_ubuntu_ami() -> dict[str, Any]:
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
    if not images:
        raise RuntimeError("Canonical Ubuntu 22.04 AMI was not found")
    return max(images, key=lambda image: image["CreationDate"])


def upload_code(project_root: Path) -> None:
    files = [
        project_root / ".local-ml/tools/prepare_wear3d_manifest.py",
        project_root / ".local-ml/tools/render_wear3d_pilot.py",
        Path(__file__).with_name("run_full_pipeline.py"),
        Path(__file__).with_name("train_mask_measurements.py"),
        Path(__file__).with_name("report_failure.py"),
    ]
    for file_path in files:
        aws(
            "s3",
            "cp",
            str(file_path),
            f"s3://{BUCKET}/{CODE_PREFIX}/{file_path.name}",
            "--sse",
            "AES256",
            "--only-show-errors",
        )


def initial_status(
    project_root: Path,
    *,
    instance_type: str,
    max_runtime_hours: int,
    stage_label: str,
    detail: str,
) -> dict[str, Any]:
    status_path = project_root / ".local-ml/model-forge-training-status.json"
    status = json.loads(status_path.read_text(encoding="utf-8"))
    started_at = now_iso()
    status.update(
        {
            "pipelineId": PIPELINE_ID,
            "state": "preparing",
            "overallPercent": 1,
            "currentStage": "inventory",
            "currentStageLabel": stage_label,
            "detail": detail,
            "startedAt": started_at,
            "updatedAt": started_at,
        }
    )
    status["dataset"].update(
        {
            "subjects": 4_323,
            "sourceScans": 13_209,
            "targetExamples": 13_209,
            "completedExamples": 0,
            "failedExamples": 0,
        }
    )
    status["aws"].update(
        {
            "instanceId": None,
            "instanceType": instance_type,
            "maxRuntimeHours": max_runtime_hours,
            "processingJobName": None,
            "trainingJobName": None,
        }
    )
    for index, stage in enumerate(status["stages"]):
        stage["state"] = "running" if index == 0 else "queued"
        stage["percent"] = 5 if index == 0 else 0
    status_path.write_text(json.dumps(status, indent=2) + "\n", encoding="utf-8")
    return status


def upload_status(project_root: Path, status: dict[str, Any]) -> None:
    path = project_root / ".local-ml/model-forge-training-status.json"
    path.write_text(json.dumps(status, indent=2) + "\n", encoding="utf-8")
    aws(
        "s3",
        "cp",
        str(path),
        f"s3://{BUCKET}/{STATUS_KEY}",
        "--sse",
        "AES256",
        "--content-type",
        "application/json",
        "--only-show-errors",
    )


def active_pipeline_instances() -> list[dict[str, Any]]:
    response = aws_json(
        "ec2",
        "describe-instances",
        "--filters",
        f"Name=tag:PipelineId,Values={PIPELINE_ID}",
        "Name=instance-state-name,Values=pending,running,stopping,stopped",
    )
    return [instance for reservation in response["Reservations"] for instance in reservation["Instances"]]


def make_user_data(bootstrap_name: str) -> str:
    bootstrap = Path(__file__).with_name(bootstrap_name).read_text(encoding="utf-8")
    lines = bootstrap.splitlines()
    exports = [
        f"export WEAR_BUCKET={BUCKET!r}",
        f"export WEAR_PIPELINE_ID={PIPELINE_ID!r}",
        f"export WEAR_STATUS_KEY={STATUS_KEY!r}",
        f"export WEAR_CODE_PREFIX={CODE_PREFIX!r}",
        "export AWS_REGION='us-east-1'",
        "export AWS_DEFAULT_REGION='us-east-1'",
        "export AWS_PAGER=''",
    ]
    return "\n".join([lines[0], *exports, *lines[1:]]) + "\n"


def launch_instance(
    image: dict[str, Any],
    security_group_id: str,
    user_data_path: Path,
    *,
    instance_type: str,
    volume_gb: int,
    instance_name: str,
) -> dict[str, Any]:
    subnets = aws_json(
        "ec2",
        "describe-subnets",
        "--filters",
        "Name=default-for-az,Values=true",
        "Name=state,Values=available",
    )["Subnets"]
    subnets.sort(key=lambda subnet: subnet["AvailabilityZone"])
    last_error = ""
    for subnet in subnets:
        block_devices = [
            {
                "DeviceName": image["RootDeviceName"],
                "Ebs": {
                    "VolumeSize": volume_gb,
                    "VolumeType": "gp3",
                    "Iops": 3000,
                    "Throughput": 250,
                    "Encrypted": True,
                    "DeleteOnTermination": True,
                },
            }
        ]
        result = aws(
            "ec2",
            "run-instances",
            "--image-id",
            image["ImageId"],
            "--instance-type",
            instance_type,
            "--count",
            "1",
            "--subnet-id",
            subnet["SubnetId"],
            "--security-group-ids",
            security_group_id,
            "--iam-instance-profile",
            f"Name={INSTANCE_PROFILE_NAME}",
            "--associate-public-ip-address",
            "--instance-initiated-shutdown-behavior",
            "terminate",
            "--metadata-options",
            "HttpTokens=required,HttpEndpoint=enabled,HttpPutResponseHopLimit=1",
            "--block-device-mappings",
            json.dumps(block_devices),
            "--user-data",
            f"file://{user_data_path}",
            "--tag-specifications",
            (
                "ResourceType=instance,Tags=["
                f"{{Key=Name,Value={instance_name}}},"
                "{Key=Project,Value=PrimeStyleAI},"
                "{Key=Workload,Value=WEAR3DTraining},"
                f"{{Key=PipelineId,Value={PIPELINE_ID}}}]"
            ),
            (
                "ResourceType=volume,Tags=["
                "{Key=Project,Value=PrimeStyleAI},"
                "{Key=Workload,Value=WEAR3DTraining},"
                f"{{Key=PipelineId,Value={PIPELINE_ID}}}]"
            ),
            check=False,
        )
        if result.returncode == 0:
            return json.loads(result.stdout)["Instances"][0]
        last_error = result.stderr.strip()
        if "InsufficientInstanceCapacity" not in last_error:
            break
    raise RuntimeError(f"Could not launch {instance_type}: {last_error}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--project-root", type=Path, default=Path.cwd())
    parser.add_argument(
        "--preprocess-only",
        action="store_true",
        help="Use a separate CPU worker and stop after all 3D meshes are converted and saved.",
    )
    args = parser.parse_args()
    project_root = args.project_root.resolve()
    active = active_pipeline_instances()
    if active:
        raise RuntimeError(f"Pipeline already has an active instance: {active[0]['InstanceId']}")

    ensure_role()
    security_group_id = ensure_security_group()
    if args.preprocess_only:
        instance_type = "c7i.8xlarge"
        max_runtime_hours = 6
        volume_gb = 120
        bootstrap_name = "ec2_preprocess_bootstrap.sh"
        instance_name = "PrimeStyleAI-WEAR3D-CPU-Preprocessing"
        hourly_usd = 1.428
        image = latest_ubuntu_ami()
        stage_label = "Faster AWS CPU worker is being created"
        detail = "The 32-vCPU worker will convert all 3D meshes without using or touching the shared GPU quota."
    else:
        instance_type = INSTANCE_TYPE
        max_runtime_hours = MAX_RUNTIME_HOURS
        volume_gb = VOLUME_GB
        bootstrap_name = "ec2_bootstrap.sh"
        instance_name = "PrimeStyleAI-WEAR3D-Full-Training"
        hourly_usd = 0.526
        image = latest_dlami()
        stage_label = "AWS GPU worker is being created"
        detail = "The full 33.50 GB source is safe in S3. AWS is starting an encrypted, capped worker."
    upload_code(project_root)
    status = initial_status(
        project_root,
        instance_type=instance_type,
        max_runtime_hours=max_runtime_hours,
        stage_label=stage_label,
        detail=detail,
    )
    upload_status(project_root, status)

    with tempfile.NamedTemporaryFile("w", prefix="wear3d-user-data-", suffix=".sh", delete=False) as handle:
        handle.write(make_user_data(bootstrap_name))
        user_data_path = Path(handle.name)
    try:
        instance = launch_instance(
            image,
            security_group_id,
            user_data_path,
            instance_type=instance_type,
            volume_gb=volume_gb,
            instance_name=instance_name,
        )
    finally:
        user_data_path.unlink(missing_ok=True)

    status["state"] = "running"
    status["overallPercent"] = 1.5
    status["currentStageLabel"] = f"AWS {instance_type} worker is booting"
    status["detail"] = (
        "The separate encrypted CPU worker launched. It does not use the shared GPU quota."
        if args.preprocess_only
        else "The encrypted GPU worker launched. It will download and verify all 33.50 GB before rendering begins."
    )
    status["updatedAt"] = now_iso()
    status["aws"].update(
        {
            "instanceId": instance["InstanceId"],
            "instanceType": instance_type,
            "amiId": image["ImageId"],
            "maxRuntimeHours": max_runtime_hours,
        }
    )
    upload_status(project_root, status)
    print(
        json.dumps(
            {
                "instanceId": instance["InstanceId"],
                "instanceType": instance_type,
                "amiId": image["ImageId"],
                "statusS3Uri": f"s3://{BUCKET}/{STATUS_KEY}",
                "maxRuntimeHours": max_runtime_hours,
                "maxComputeUsd": round(hourly_usd * max_runtime_hours, 2),
                "mode": "preprocess-only" if args.preprocess_only else "full",
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
