#!/usr/bin/env python3
"""Launch the bounded Virginia CPU or GPU stage for private WEAR v8.

The v8 learner consumes deterministic Blender mesh cards plus profile data.
Every row target must first pass the certified PLY/LND teacher audit. GPU launch
is impossible until that exact audit and its visual contact sheet are approved.
"""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import subprocess
import tempfile
from typing import Any


BUCKET = "primestyleai-wear3d-921049726279-us-east-1"
REGION = "us-east-1"
PROFILE = "primestyle-wear"
PIPELINE_ID = "wear3d-standing-mesh-v8-20260821"
TEACHER_PIPELINE_ID = "wear3d-standing-mesh-teacher-v8-20260821"
STATUS_KEY = "jobs/wear3d-v8/status.json"
REQUIRED_SUBJECTS = 4_326
REQUIRED_RECORDS = 38_934
CODE_PREFIX = f"code/{PIPELINE_ID}"
SOURCE_MANIFEST_KEY = "manifests/wear3d-standing-a-v3-20260813/source-manifest-standing-a.jsonl"
VISUAL_REVIEW_KEY = f"reports/{TEACHER_PIPELINE_ID}/label-visual-review.json"
BLENDER_ARCHIVE_KEY = "runtime/blender/blender-5.2.0-linux-x64.tar.xz"
INSTANCE_PROFILE_NAME = "PrimeStyleAIWearTrainingEC2Profile"
SECURITY_GROUP_NAME = "primestyle-wear3d-training-egress-only"


def now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def aws(*arguments: str, check: bool = True) -> subprocess.CompletedProcess[str]:
    environment = os.environ.copy()
    environment.update({"AWS_PROFILE": PROFILE, "AWS_REGION": REGION, "AWS_DEFAULT_REGION": REGION, "AWS_PAGER": ""})
    return subprocess.run(["aws", *arguments], check=check, text=True, capture_output=True, env=environment)


def aws_json(*arguments: str) -> Any:
    return json.loads(aws(*arguments, "--output", "json").stdout or "null")


def active_instances() -> list[dict[str, Any]]:
    response = aws_json(
        "ec2", "describe-instances",
        "--filters", "Name=tag:Workload,Values=WEAR3DTraining",
        "Name=instance-state-name,Values=pending,running,stopping",
    )
    return [instance for reservation in response["Reservations"] for instance in reservation["Instances"]]


def infrastructure() -> tuple[str, str]:
    profile = aws("iam", "get-instance-profile", "--instance-profile-name", INSTANCE_PROFILE_NAME, check=False)
    if profile.returncode != 0:
        raise RuntimeError("The existing bounded WEAR EC2 instance profile is missing")
    vpcs = aws_json("ec2", "describe-vpcs", "--filters", "Name=is-default,Values=true")["Vpcs"]
    if not vpcs:
        raise RuntimeError("Virginia default VPC is missing")
    groups = aws_json(
        "ec2", "describe-security-groups", "--filters",
        f"Name=vpc-id,Values={vpcs[0]['VpcId']}", f"Name=group-name,Values={SECURITY_GROUP_NAME}",
    )["SecurityGroups"]
    if not groups:
        raise RuntimeError("The existing egress-only WEAR security group is missing")
    return INSTANCE_PROFILE_NAME, groups[0]["GroupId"]


def ubuntu_ami() -> dict[str, Any]:
    images = aws_json(
        "ec2", "describe-images", "--owners", "099720109477", "--filters",
        "Name=name,Values=ubuntu/images/hvm-ssd*/ubuntu-jammy-22.04-amd64-server-*",
        "Name=architecture,Values=x86_64", "Name=state,Values=available", "Name=root-device-type,Values=ebs",
    )["Images"]
    return max(images, key=lambda image: image["CreationDate"])


def gpu_ami() -> dict[str, Any]:
    images = aws_json(
        "ec2", "describe-images", "--owners", "amazon", "--filters",
        "Name=name,Values=Deep Learning OSS Nvidia Driver AMI GPU PyTorch 2.7 (Ubuntu 22.04)*",
        "Name=architecture,Values=x86_64", "Name=state,Values=available",
    )["Images"]
    if not images:
        raise RuntimeError("AWS PyTorch GPU AMI not found")
    return max(images, key=lambda image: image["CreationDate"])


def upload_code(project_root: Path) -> None:
    files = [
        project_root / ".local-ml/tools/render_wear3d_pilot.py",
        project_root / "scripts/local-ml/audit_wear_teacher_cards.py",
        Path(__file__).with_name("render_wear3d_multiview.py"),
        Path(__file__).with_name("audit_wear3d_labels_cloud.py"),
        Path(__file__).with_name("run_v6_preprocess.py"),
        Path(__file__).with_name("train_wear3d_v6.py"),
        Path(__file__).with_name("run_v6_train.py"),
    ]
    for file_path in files:
        aws("s3", "cp", str(file_path), f"s3://{BUCKET}/{CODE_PREFIX}/{file_path.name}", "--sse", "AES256", "--only-show-errors")


def status_payload(mode: str, instance_type: str, max_hours: int) -> dict[str, Any]:
    started = now()
    stages = [
        ("inventory-v8", "Verify all protected WEAR data", "Count every S3 object and byte before use."),
        ("manifest-v8", "Keep standing people separate", "Use only standing A scans and subject-disjoint train, validation, and test roles."),
        ("render-v8", "Build certified PLY teachers", "Use Blender mesh cards plus exact PLY/LND row position, A-B, C-D and 32-point cross-sections. Bad rows are masked."),
        ("train-v8", "Train one connected geometry model", "Predict row, A-B, C-D and shape from the mesh card; circumference is walked from that same shape and supervised by tape only when the pair is certified."),
        ("evaluate-v8", "Test unseen WEAR people", "Require the connected predictions to pass the 448-person held-out gates."),
        ("real_photos", "Prove real photos privately", "Test Shane, Shahnaz, Negar, confidence, and manual edits without releasing or publishing the candidate."),
    ]
    completed_before = 0 if mode == "preprocess" else 3
    return {
        "schemaVersion": 2,
        "pipelineId": PIPELINE_ID,
        "state": "preparing",
        "overallPercent": 1 if mode == "preprocess" else 75,
        "currentStage": stages[completed_before][0],
        "currentStageLabel": "Preparing the Virginia CPU worker" if mode == "preprocess" else "Preparing the Virginia GPU worker",
        "detail": "No Ohio resources or garment files are touched.",
        "startedAt": started,
        "updatedAt": started,
        "dataset": {"subjects": 4_326, "sourceScans": 13_209, "targetExamples": 38_934, "completedExamples": 0, "failedExamples": 0},
        "aws": {"region": REGION, "instanceId": None, "instanceType": instance_type, "maxRuntimeHours": max_hours, "estimatedHourlyUsd": 1.428 if mode == "preprocess" else 0.526},
        "stages": [
            {"key": key, "label": label, "explanation": explanation, "state": "complete" if index < completed_before else "running" if index == completed_before else "queued", "percent": 100 if index < completed_before else 1 if index == completed_before else 0}
            for index, (key, label, explanation) in enumerate(stages)
        ],
        "model": {"syntheticCandidatePassed": False, "sdkReady": False},
    }


def upload_status(project_root: Path, payload: dict[str, Any]) -> None:
    local = project_root / ".local-ml/model-forge-training-status.json"
    local.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    aws("s3", "cp", str(local), f"s3://{BUCKET}/{STATUS_KEY}", "--sse", "AES256", "--content-type", "application/json", "--only-show-errors")


def user_data(bootstrap: Path, *, recovery: bool = False, max_runtime_minutes: int | None = None) -> str:
    lines = bootstrap.read_text(encoding="utf-8").splitlines()
    exports = [
        f"export WEAR_BUCKET={BUCKET!r}", f"export WEAR_PIPELINE_ID={PIPELINE_ID!r}",
        f"export WEAR_TEACHER_PIPELINE_ID={TEACHER_PIPELINE_ID!r}",
        f"export WEAR_STATUS_KEY={STATUS_KEY!r}", f"export WEAR_CODE_PREFIX={CODE_PREFIX!r}",
        f"export WEAR_SOURCE_MANIFEST_KEY={SOURCE_MANIFEST_KEY!r}",
        f"export WEAR_BLENDER_ARCHIVE_KEY={BLENDER_ARCHIVE_KEY!r}",
        f"export AWS_REGION={REGION!r}", f"export AWS_DEFAULT_REGION={REGION!r}", "export AWS_PAGER=''",
    ]
    if recovery:
        exports.append("export WEAR_RECOVERY='1'")
    if max_runtime_minutes is not None:
        exports.append(f"export WEAR_SHUTDOWN_MINUTES={max_runtime_minutes!r}")
    return "\n".join([lines[0], *exports, *lines[1:]]) + "\n"


def launch(image: dict[str, Any], security_group: str, instance_type: str, volume_gb: int, name: str, data_path: Path) -> dict[str, Any]:
    subnets = aws_json("ec2", "describe-subnets", "--filters", "Name=default-for-az,Values=true", "Name=state,Values=available")["Subnets"]
    subnets.sort(key=lambda subnet: subnet["AvailabilityZone"])
    last_error = ""
    for subnet in subnets:
        mapping = [{"DeviceName": image["RootDeviceName"], "Ebs": {"VolumeSize": volume_gb, "VolumeType": "gp3", "Iops": 3000, "Throughput": 250, "Encrypted": True, "DeleteOnTermination": True}}]
        result = aws(
            "ec2", "run-instances", "--image-id", image["ImageId"], "--instance-type", instance_type,
            "--count", "1", "--subnet-id", subnet["SubnetId"], "--security-group-ids", security_group,
            "--iam-instance-profile", f"Name={INSTANCE_PROFILE_NAME}", "--associate-public-ip-address",
            "--instance-initiated-shutdown-behavior", "terminate",
            "--metadata-options", "HttpTokens=required,HttpEndpoint=enabled,HttpPutResponseHopLimit=1",
            "--block-device-mappings", json.dumps(mapping), "--user-data", f"file://{data_path}",
            "--tag-specifications",
            f"ResourceType=instance,Tags=[{{Key=Name,Value={name}}},{{Key=Project,Value=PrimeStyleAI}},{{Key=Workload,Value=WEAR3DTraining}},{{Key=PipelineId,Value={PIPELINE_ID}}}]",
            f"ResourceType=volume,Tags=[{{Key=Project,Value=PrimeStyleAI}},{{Key=Workload,Value=WEAR3DTraining}},{{Key=PipelineId,Value={PIPELINE_ID}}}]",
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
    parser.add_argument("mode", choices=("preprocess", "recover", "train"))
    parser.add_argument("--project-root", type=Path, default=Path.cwd())
    args = parser.parse_args()
    project_root = args.project_root.resolve()
    active = active_instances()
    if active:
        raise RuntimeError(f"Virginia already has an active WEAR worker: {active[0]['InstanceId']}")
    audit: dict[str, Any] | None = None
    if args.mode == "train":
        with tempfile.NamedTemporaryFile(suffix=".json") as handle:
            result = aws(
                "s3api", "get-object", "--bucket", BUCKET,
                "--key", f"reports/{TEACHER_PIPELINE_ID}/label-audit.json",
                handle.name,
                check=False,
            )
            if result.returncode != 0:
                raise RuntimeError("Validated v8 mesh teachers are not saved yet; refusing GPU launch")
            audit = json.loads(Path(handle.name).read_text(encoding="utf-8"))
        audit_inputs = audit.get("inputs") or {}
        audit_counts = {
            "people": int(audit_inputs.get("people", 0)),
            "renderCards": int(audit_inputs.get("renderCards", 0)),
            "canonicalCards": int(audit_inputs.get("peopleWithCanonicalFrontCard", 0)),
        }
        if (
            audit.get("schemaVersion") != "wear-teacher-card-audit/v2"
            or (audit.get("summary") or {}).get("trainingAllowed") is not True
            or audit_counts != {
                "people": REQUIRED_SUBJECTS,
                "renderCards": REQUIRED_RECORDS,
                "canonicalCards": REQUIRED_SUBJECTS,
            }
        ):
            raise RuntimeError(
                "The saved v8 teacher audit is not the exact passing 4,326-person / 38,934-card set; "
                f"refusing GPU launch: {audit_counts}"
            )
        with tempfile.NamedTemporaryFile(suffix=".json") as handle:
            result = aws(
                "s3api", "get-object", "--bucket", BUCKET,
                "--key", VISUAL_REVIEW_KEY,
                handle.name,
                check=False,
            )
            if result.returncode != 0:
                raise RuntimeError("The diverse v8 teacher sheet has not been visually approved; refusing GPU launch")
            review = json.loads(Path(handle.name).read_text(encoding="utf-8"))
        if (
            review.get("schemaVersion") != 1
            or review.get("pipelineId") != TEACHER_PIPELINE_ID
            or review.get("approved") is not True
            or review.get("contactSheetSha256") != (audit.get("summary") or {}).get("contactSheetSha256")
            or review.get("manifestSha256") != (audit.get("summary") or {}).get("renderManifestSha256")
        ):
            raise RuntimeError("The v8 visual review does not match the current audited teachers; refusing GPU launch")
    upload_code(project_root)
    _, security_group = infrastructure()
    if args.mode in ("preprocess", "recover"):
        # Virginia's current Standard On-Demand quota is 32 vCPUs, so
        # c7i.8xlarge is the largest permitted worker. Use all of it and keep
        # an eight-hour termination cap for the complete protocol-aware set.
        image, instance_type, volume_gb, max_hours = ubuntu_ami(), "c7i.8xlarge", 120, 2 if args.mode == "recover" else 8
        bootstrap = Path(__file__).with_name("ec2_preprocess_bootstrap.sh")
        name = "PrimeStyleAI-WEAR3D-V8-CPU"
    else:
        image, instance_type, volume_gb, max_hours = gpu_ami(), "g4dn.xlarge", 80, 8
        bootstrap = Path(__file__).with_name("ec2_train_bootstrap.sh")
        name = "PrimeStyleAI-WEAR3D-V8-GPU"
    if args.mode == "recover":
        with tempfile.NamedTemporaryFile(suffix=".json") as handle:
            aws("s3api", "get-object", "--bucket", BUCKET, "--key", STATUS_KEY, handle.name)
            status = json.loads(Path(handle.name).read_text(encoding="utf-8"))
        status.update({
            "state": "preparing",
            "overallPercent": max(70.0, float(status.get("overallPercent", 0))),
            "currentStage": "render-v8",
            "currentStageLabel": "Preparing targeted label recovery",
            "detail": "Clean shards stay saved; only failed shards and the few legacy shards that discarded valid mesh geometry will be regenerated.",
            "updatedAt": now(),
        })
        status.setdefault("aws", {}).update({"region": REGION, "instanceId": None, "instanceType": instance_type, "maxRuntimeHours": max_hours, "estimatedHourlyUsd": 1.428})
    else:
        status = status_payload(args.mode, instance_type, max_hours)
    if audit is not None:
        audit_inputs = audit.get("inputs") or {}
        status["dataset"].update({
            "subjects": int(audit_inputs.get("people", status["dataset"]["subjects"])),
            "completedExamples": int(audit_inputs.get("renderCards", 0)),
            "failedExamples": 0,
        })
    upload_status(project_root, status)
    with tempfile.NamedTemporaryFile("w", suffix=".sh", delete=False) as handle:
        handle.write(
            user_data(
                bootstrap,
                recovery=args.mode == "recover",
                max_runtime_minutes=max_hours * 60,
            )
        )
        user_data_path = Path(handle.name)
    try:
        instance = launch(image, security_group, instance_type, volume_gb, name, user_data_path)
    finally:
        user_data_path.unlink(missing_ok=True)
    status["state"] = "running"
    status["aws"].update({"instanceId": instance["InstanceId"], "amiId": image["ImageId"]})
    status["detail"] = f"Virginia {instance_type} launched with encrypted temporary storage and a {max_hours}-hour termination cap."
    status["updatedAt"] = now()
    upload_status(project_root, status)
    print(json.dumps({"pipelineId": PIPELINE_ID, "mode": args.mode, "instanceId": instance["InstanceId"], "instanceType": instance_type, "region": REGION, "maxRuntimeHours": max_hours, "status": f"s3://{BUCKET}/{STATUS_KEY}"}, indent=2))


if __name__ == "__main__":
    main()
