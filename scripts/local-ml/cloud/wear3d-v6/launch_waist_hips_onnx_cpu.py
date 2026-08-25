#!/usr/bin/env python3
"""Launch the approved CPU-only waist/hips ONNX training and held-out test."""

from __future__ import annotations

from datetime import datetime, timezone
import json
from pathlib import Path
import tempfile

import launch_v6 as base


PIPELINE_ID = "wear3d-waist-hips-onnx-cpu-v1-20260823"
TEACHER_PIPELINE_ID = "wear3d-waist-hips-teacher-v1-20260823"
STATUS_KEY = "jobs/wear3d-v8/status.json"
CODE_PREFIX = f"code/{PIPELINE_ID}"
MAX_RUNTIME_MINUTES = 90


def now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def verify_teacher_audit() -> dict:
    with tempfile.NamedTemporaryFile(suffix=".json") as handle:
        result = base.aws(
            "s3api", "get-object", "--bucket", base.BUCKET,
            "--key", f"reports/{TEACHER_PIPELINE_ID}/label-audit.json",
            handle.name, check=False,
        )
        if result.returncode != 0:
            raise RuntimeError("Approved waist/hips teacher audit is missing")
        audit = json.loads(Path(handle.name).read_text(encoding="utf-8"))
    summary = audit.get("summary") or {}
    inputs = audit.get("inputs") or {}
    if (
        summary.get("trainingAllowed") is not True
        or int(inputs.get("people", 0)) != 4_326
        or int(summary.get("peopleWithAllRequestedGeometryAndTapeTargets", 0)) < 4_250
        or not summary.get("renderManifestSha256")
    ):
        raise RuntimeError("Waist/hips teacher audit is not the approved 4,326-person set")
    return audit


def upload_code(project_root: Path) -> None:
    files = (
        Path(__file__).with_name("train_wear_waist_hips_cpu.py"),
    )
    for path in files:
        base.aws("s3", "cp", str(path), f"s3://{base.BUCKET}/{CODE_PREFIX}/{path.name}", "--sse", "AES256", "--only-show-errors")


def status_payload(instance_type: str, threads: int, audit: dict) -> dict:
    timestamp = now()
    return {
        "schemaVersion": 2,
        "pipelineId": PIPELINE_ID,
        "state": "preparing",
        "overallPercent": 76,
        "currentStage": "train-waist-hips-cpu",
        "currentStageLabel": "Preparing waist/hips CPU ONNX training",
        "detail": "448 test people are sealed. The model uses only Blender 2D mesh channels plus height, weight, BMI and gender.",
        "startedAt": timestamp,
        "updatedAt": timestamp,
        "dataset": {
            "subjects": 4_326,
            "trainSubjects": 3_451,
            "validationSubjects": 427,
            "testSubjects": 448,
            "fullyConnectedGeometryAndTape": int((audit.get("summary") or {}).get("peopleWithAllRequestedGeometryAndTapeTargets", 0)),
        },
        "aws": {
            "region": base.REGION,
            "instanceId": None,
            "instanceType": instance_type,
            "workers": threads,
            "maxRuntimeMinutes": MAX_RUNTIME_MINUTES,
            "gpu": False,
        },
        "stages": [
            {"key": "teachers", "label": "Audited waist/hips teachers", "state": "complete", "percent": 100},
            {"key": "train-waist-hips-cpu", "label": "Train connected CPU model", "state": "running", "percent": 1},
            {"key": "evaluate-waist-hips-cpu", "label": "Test 448 unseen people", "state": "queued", "percent": 0},
            {"key": "review-waist-hips-cpu", "label": "Private visual review", "state": "queued", "percent": 0},
        ],
        "model": {"syntheticCandidatePassed": False, "sdkReady": False},
    }


def main() -> None:
    project_root = Path.cwd().resolve()
    active = base.active_instances()
    if active:
        raise RuntimeError(f"Virginia already has an active WEAR worker: {active[0]['InstanceId']}")
    audit = verify_teacher_audit()
    upload_code(project_root)
    _, security_group = base.infrastructure()
    image = base.ubuntu_ami()
    bootstrap = Path(__file__).with_name("ec2_waist_hips_cpu_train_bootstrap.sh")

    base.PIPELINE_ID = PIPELINE_ID
    base.TEACHER_PIPELINE_ID = TEACHER_PIPELINE_ID
    base.STATUS_KEY = STATUS_KEY
    base.CODE_PREFIX = CODE_PREFIX

    options = (("c7i.48xlarge", 64), ("c7i.24xlarge", 48))
    last_error: Exception | None = None
    for instance_type, threads in options:
        status = status_payload(instance_type, threads, audit)
        base.upload_status(project_root, status)
        script = base.user_data(bootstrap, max_runtime_minutes=MAX_RUNTIME_MINUTES)
        lines = script.splitlines()
        lines[1:1] = [f"export WEAR_THREADS={threads}"]
        with tempfile.NamedTemporaryFile("w", suffix=".sh", delete=False) as handle:
            handle.write("\n".join(lines) + "\n")
            user_data_path = Path(handle.name)
        try:
            instance = base.launch(
                image, security_group, instance_type, 100,
                "PrimeStyleAI-WEAR-Waist-Hips-ONNX-CPU", user_data_path,
            )
        except Exception as error:
            last_error = error
            continue
        finally:
            user_data_path.unlink(missing_ok=True)

        status.update({
            "state": "running",
            "detail": f"Virginia {instance_type} started. CPU only; 90-minute automatic termination cap.",
            "updatedAt": now(),
        })
        status["aws"].update({"instanceId": instance["InstanceId"], "amiId": image["ImageId"]})
        base.upload_status(project_root, status)
        print(json.dumps({
            "pipelineId": PIPELINE_ID,
            "teacherPipelineId": TEACHER_PIPELINE_ID,
            "instanceId": instance["InstanceId"],
            "instanceType": instance_type,
            "threads": threads,
            "testSubjects": 448,
            "maxRuntimeMinutes": MAX_RUNTIME_MINUTES,
            "gpu": False,
            "status": f"s3://{base.BUCKET}/{STATUS_KEY}",
        }, indent=2))
        return
    raise RuntimeError(f"Could not launch waist/hips CPU training: {last_error}")


if __name__ == "__main__":
    main()
