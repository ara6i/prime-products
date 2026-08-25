#!/usr/bin/env python3
"""Launch the approved waist/hips-only WEAR CPU teacher job.

This job renders one front-50 Blender card per standing subject. PLY/LND is
used only for row position, A-B, C-D, and the normalized 32-point shape.
Recorded WEAR tape is the only circumference target. No GPU is launched.
"""

from __future__ import annotations

from datetime import datetime, timezone
import json
from pathlib import Path
import tempfile

import launch_v6 as base


PIPELINE_ID = "wear3d-waist-hips-front50-v1-20260823"
TEACHER_PIPELINE_ID = "wear3d-waist-hips-teacher-v1-20260823"
STATUS_KEY = "jobs/wear3d-v8/status.json"
MAX_RUNTIME_MINUTES = 90


def now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def status_payload(instance_type: str, workers: int) -> dict:
    timestamp = now()
    return {
        "schemaVersion": 2,
        "pipelineId": PIPELINE_ID,
        "state": "preparing",
        "overallPercent": 1,
        "currentStage": "inventory-v8",
        "currentStageLabel": "Preparing waist/hips CPU worker",
        "detail": "One front-50 Blender card per person. No GPU and no PLY circumference.",
        "startedAt": timestamp,
        "updatedAt": timestamp,
        "dataset": {
            "subjects": 4_326,
            "sourceScans": 13_209,
            "targetExamples": 4_326,
            "completedExamples": 0,
            "failedExamples": 0,
        },
        "aws": {
            "region": base.REGION,
            "instanceId": None,
            "instanceType": instance_type,
            "maxRuntimeHours": MAX_RUNTIME_MINUTES / 60,
            "workers": workers,
        },
        "stages": [
            {"key": "inventory-v8", "label": "Verify protected WEAR vault", "explanation": "Read-only object and byte inventory.", "state": "running", "percent": 1},
            {"key": "manifest-v8", "label": "Pair 4,326 standing people", "explanation": "Standing A scans only; existing subject split is preserved.", "state": "queued", "percent": 0},
            {"key": "render-v8", "label": "Build waist/hips teachers", "explanation": "Front-50 PLY/LND row, A-B, C-D, and 32-point shape; tape target only.", "state": "queued", "percent": 0},
        ],
        "model": {"syntheticCandidatePassed": False, "sdkReady": False},
    }


def main() -> None:
    project_root = Path.cwd().resolve()
    if base.active_instances():
        raise RuntimeError("Virginia already has an active WEAR CPU/GPU worker")

    base.PIPELINE_ID = PIPELINE_ID
    base.TEACHER_PIPELINE_ID = TEACHER_PIPELINE_ID
    base.STATUS_KEY = STATUS_KEY
    base.CODE_PREFIX = f"code/{PIPELINE_ID}"

    base.upload_code(project_root)
    _, security_group = base.infrastructure()
    image = base.ubuntu_ami()
    bootstrap = Path(__file__).with_name("ec2_preprocess_bootstrap.sh")

    launch_options = (
        ("c7i.48xlarge", 120),
        ("c7i.24xlarge", 56),
    )
    last_error: Exception | None = None
    for instance_type, workers in launch_options:
        status = status_payload(instance_type, workers)
        base.upload_status(project_root, status)
        script = base.user_data(
            bootstrap,
            recovery=False,
            max_runtime_minutes=MAX_RUNTIME_MINUTES,
        )
        lines = script.splitlines()
        lines[1:1] = [
            f"export WEAR_WORKERS={workers}",
            "export WEAR_CHUNK_SIZE=2",
            "export WEAR_VIEWS_PER_SUBJECT=1",
            "export WEAR_TARGET_ROWS='waist hips'",
        ]
        with tempfile.NamedTemporaryFile("w", suffix=".sh", delete=False) as handle:
            handle.write("\n".join(lines) + "\n")
            user_data_path = Path(handle.name)
        try:
            instance = base.launch(
                image,
                security_group,
                instance_type,
                120,
                "PrimeStyleAI-WEAR-Waist-Hips-CPU",
                user_data_path,
            )
        except Exception as error:
            last_error = error
            continue
        finally:
            user_data_path.unlink(missing_ok=True)

        status.update({
            "state": "running",
            "detail": f"Virginia {instance_type} launched with {workers} isolated Blender workers. GPU remains off.",
            "updatedAt": now(),
        })
        status["aws"].update({"instanceId": instance["InstanceId"], "amiId": image["ImageId"]})
        base.upload_status(project_root, status)
        print(json.dumps({
            "pipelineId": PIPELINE_ID,
            "teacherPipelineId": TEACHER_PIPELINE_ID,
            "instanceId": instance["InstanceId"],
            "instanceType": instance_type,
            "workers": workers,
            "region": base.REGION,
            "maxRuntimeMinutes": MAX_RUNTIME_MINUTES,
            "status": f"s3://{base.BUCKET}/{STATUS_KEY}",
            "gpu": False,
        }, indent=2))
        return

    raise RuntimeError(f"Could not launch the approved CPU worker: {last_error}")


if __name__ == "__main__":
    main()
