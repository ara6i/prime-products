#!/usr/bin/env python3
"""Launch the CPU-only geometry waist/hips model in Virginia."""

from __future__ import annotations

from datetime import datetime, timezone
import json
from pathlib import Path
import tempfile

import launch_v6 as base


PIPELINE_ID = "wear3d-waist-hips-geometry-cpu-v3-20260823"
TEACHER_PIPELINE_ID = "wear3d-waist-hips-teacher-v1-20260823"
STATUS_KEY = "jobs/wear3d-v8/status.json"
CODE_PREFIX = f"code/{PIPELINE_ID}"
MAX_RUNTIME_MINUTES = 120


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
        audit = json.loads(Path(handle.name).read_text())
    summary = audit.get("summary") or {}
    inputs = audit.get("inputs") or {}
    if (
        summary.get("trainingAllowed") is not True
        or int(inputs.get("people", 0)) != 4_326
        or int(summary.get("peopleWithAllRequestedGeometryAndTapeTargets", 0)) < 4_250
        or not summary.get("renderManifestSha256")
    ):
        raise RuntimeError("Teacher audit is not the approved 4,326-person set")
    return audit


def verify_geometry_proof(project_root: Path) -> dict:
    path = project_root / ".local-ml/reports/wear3d-waist-hips-geometry-proof10-v2/proof-metrics.json"
    if not path.exists():
        raise RuntimeError("Ten-card geometry proof is missing")
    proof = json.loads(path.read_text(encoding="utf-8"))
    if (
        proof.get("passed") is not True
        or proof.get("geometryOnly") is not True
        or proof.get("recordedTapeUsedByProof") is not False
        or proof.get("walkedPlyCircumferenceUsedByProof") is not False
        or int(proof.get("cards", 0)) != 10
    ):
        raise RuntimeError("Ten-card geometry proof did not pass the clean contract")
    return proof


def upload_code() -> None:
    names = (
        "train_wear_waist_hips_spatial_cpu.py",
        "prove_wear_waist_hips_spatial_10.py",
        "train_wear_waist_hips_cpu.py",
    )
    for name in names:
        path = Path(__file__).with_name(name)
        base.aws(
            "s3", "cp", str(path), f"s3://{base.BUCKET}/{CODE_PREFIX}/{name}",
            "--sse", "AES256", "--only-show-errors",
        )


def status_payload(instance_type: str, threads: int, audit: dict) -> dict:
    timestamp = now()
    return {
        "schemaVersion": 2,
        "pipelineId": PIPELINE_ID,
        "state": "preparing",
        "overallPercent": 78,
        "currentStage": "geometry-train",
        "currentStageLabel": "Preparing waist/hips geometry CPU training",
        "detail": "Rows, endpoints, A-B, C-D and shape only. Tape and PLY circumference are excluded.",
        "startedAt": timestamp,
        "updatedAt": timestamp,
        "dataset": {
            "subjects": 4_326,
            "trainSubjects": 3_451,
            "validationSubjects": 427,
            "testSubjects": 448,
            "auditedGeometryPeople": int((audit.get("summary") or {}).get("allRowsPassForPeople", 0)),
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
            {"key": "proof10", "label": "Ten-card geometry wiring proof", "state": "complete", "percent": 100},
            {"key": "geometry-train", "label": "Train geometry on 3,451", "state": "running", "percent": 1},
            {"key": "geometry-validation", "label": "Validate geometry on 427", "state": "queued", "percent": 0},
            {"key": "geometry-test", "label": "Open 448 once if validation passes", "state": "queued", "percent": 0},
            {"key": "geometry-review", "label": "Private visual review", "state": "queued", "percent": 0},
        ],
        "model": {"validationPassed": False, "sealed448Opened": False, "sdkReady": False},
    }


def main() -> None:
    project_root = Path.cwd().resolve()
    verify_geometry_proof(project_root)
    active = base.active_instances()
    if active:
        raise RuntimeError(f"Virginia already has an active WEAR worker: {active[0]['InstanceId']}")
    audit = verify_teacher_audit()
    upload_code()
    _, security_group = base.infrastructure()
    image = base.ubuntu_ami()
    bootstrap = Path(__file__).with_name("ec2_waist_hips_cpu_train_bootstrap.sh")

    base.PIPELINE_ID = PIPELINE_ID
    base.TEACHER_PIPELINE_ID = TEACHER_PIPELINE_ID
    base.STATUS_KEY = STATUS_KEY
    base.CODE_PREFIX = CODE_PREFIX

    # c7i.48xlarge is the largest instance that fits the approved 256-vCPU
    # standard quota. Ninety-six OpenMP workers map to its physical cores;
    # using all 192 hyperthreads slows this convolution workload.
    options = (("c7i.48xlarge", 96), ("c7i.24xlarge", 48))
    last_error: Exception | None = None
    for instance_type, threads in options:
        status = status_payload(instance_type, threads, audit)
        base.upload_status(project_root, status)
        script = base.user_data(bootstrap, max_runtime_minutes=MAX_RUNTIME_MINUTES)
        lines = script.splitlines()
        lines[1:1] = [
            f"export WEAR_THREADS={threads}",
            "export WEAR_TRAIN_SCRIPT=train_wear_waist_hips_spatial_cpu.py",
            "export WEAR_EPOCHS=45",
            "export WEAR_BATCH_SIZE=128",
        ]
        with tempfile.NamedTemporaryFile("w", suffix=".sh", delete=False) as handle:
            handle.write("\n".join(lines) + "\n")
            user_data_path = Path(handle.name)
        try:
            instance = base.launch(
                image, security_group, instance_type, 100,
                "PrimeStyleAI-WEAR-Waist-Hips-Geometry-CPU", user_data_path,
            )
        except Exception as error:
            last_error = error
            continue
        finally:
            user_data_path.unlink(missing_ok=True)
        status.update({
            "state": "running",
            "detail": f"Virginia {instance_type} started. CPU only; automatic {MAX_RUNTIME_MINUTES}-minute stop cap.",
            "updatedAt": now(),
        })
        status["aws"].update({"instanceId": instance["InstanceId"], "amiId": image["ImageId"]})
        base.upload_status(project_root, status)
        print(json.dumps({
            "pipelineId": PIPELINE_ID,
            "instanceId": instance["InstanceId"],
            "instanceType": instance_type,
            "threads": threads,
            "validationSubjects": 427,
            "sealedTestSubjects": 448,
            "maxRuntimeMinutes": MAX_RUNTIME_MINUTES,
            "gpu": False,
        }, indent=2))
        return
    raise RuntimeError(f"Could not launch spatial waist/hips CPU training: {last_error}")


if __name__ == "__main__":
    main()
