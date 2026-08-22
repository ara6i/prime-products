#!/usr/bin/env python3
"""Automatically preserve and blind-audit the private WEAR v7 GPU result.

The watcher never releases, publishes, deploys, or changes the active Test Lab
model. It only downloads the candidate and runs the 448-person blind audit.
"""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import subprocess
import time


PIPELINE_ID = "wear3d-standing-rgb-v7-20260816"
BUCKET = "primestyleai-wear3d-921049726279-us-east-1"
STATUS_KEY = "jobs/wear3d-v7/status.json"
PROFILE = "primestyle-wear"
REGION = "us-east-1"


def now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def aws_env() -> dict[str, str]:
    value = os.environ.copy()
    value.update({
        "AWS_PROFILE": PROFILE,
        "AWS_REGION": REGION,
        "AWS_DEFAULT_REGION": REGION,
        "AWS_PAGER": "",
    })
    return value


def cloud_status() -> dict:
    result = subprocess.run(
        ["aws", "s3", "cp", f"s3://{BUCKET}/{STATUS_KEY}", "-", "--only-show-errors"],
        check=True,
        capture_output=True,
        text=True,
        env=aws_env(),
        timeout=60,
    )
    return json.loads(result.stdout)


def write_state(path: Path, **values) -> None:
    current = {}
    if path.is_file():
        try:
            current = json.loads(path.read_text())
        except Exception:
            current = {}
    current.update({
        "schemaVersion": "wear-v7-private-watcher/v1",
        "pipelineId": PIPELINE_ID,
        "privateTestLabOnly": True,
        "releaseApproved": False,
        "published": False,
        "deployed": False,
        "activeModelChanged": False,
        "updatedAt": now(),
        **values,
    })
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(current, indent=2) + "\n")
    temporary.replace(path)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--project-root", type=Path, default=Path.cwd())
    parser.add_argument("--poll-seconds", type=int, default=180)
    parser.add_argument("--max-hours", type=float, default=8.5)
    args = parser.parse_args()
    root = args.project_root.resolve()
    state_path = root / ".local-ml/reports/wear-v7-private-watcher.json"
    candidate = root / f".local-ml/checkpoints/.{PIPELINE_ID}-download"
    audit = root / ".local-ml/reports/wear-v7-heldout-448-audit.json"
    started = time.monotonic()
    write_state(state_path, state="watching", startedAt=now())
    final_status = None
    while time.monotonic() - started < args.max_hours * 3600:
        try:
            status = cloud_status()
            state = str(status.get("state") or "unknown")
            write_state(
                state_path,
                state="watching",
                cloudState=state,
                cloudPercent=status.get("overallPercent"),
                cloudStage=status.get("currentStageLabel"),
                cloudDetail=status.get("detail"),
            )
            if state in {"awaiting_real_photo_validation", "failed", "blocked"}:
                final_status = status
                break
        except Exception as error:
            write_state(state_path, state="watching", transientError=f"{type(error).__name__}: {error}")
        time.sleep(args.poll_seconds)
    if final_status is None:
        write_state(state_path, state="timed_out")
        raise SystemExit(2)
    candidate.mkdir(parents=True, exist_ok=True)
    write_state(state_path, state="downloading_candidate", cloudState=final_status.get("state"))
    subprocess.run(
        [
            "aws", "s3", "sync",
            f"s3://{BUCKET}/models/{PIPELINE_ID}/",
            str(candidate),
            "--only-show-errors",
        ],
        check=True,
        env=aws_env(),
        timeout=1800,
    )
    required = ("model.onnx", "runtime.json", "test-metrics.json", "training-history.json")
    missing = [name for name in required if not (candidate / name).is_file() or (candidate / name).stat().st_size == 0]
    if missing:
        write_state(state_path, state="candidate_incomplete", missing=missing)
        raise SystemExit(3)
    write_state(state_path, state="running_448_blind_audit")
    evaluation = subprocess.run(
        [
            "node",
            "scripts/local-ml/evaluate_wear_v7_candidate.cjs",
            "--project-root", str(root),
            "--candidate", str(candidate),
            "--output", str(audit),
        ],
        cwd=root,
        capture_output=True,
        text=True,
        timeout=3600,
    )
    if evaluation.returncode != 0:
        write_state(
            state_path,
            state="blind_audit_failed_to_run",
            error=(evaluation.stderr or evaluation.stdout)[-6000:],
        )
        raise SystemExit(evaluation.returncode)
    report = json.loads(audit.read_text())
    synthetic_pass = report.get("cloudSyntheticCandidatePassed") is True
    strict_pass_rate = (report.get("strictAllRows") or {}).get("passRate")
    write_state(
        state_path,
        state="review_ready" if synthetic_pass else "synthetic_failed_but_audited",
        cloudState=final_status.get("state"),
        syntheticCandidatePassed=synthetic_pass,
        strictAllRowsPassRate=strict_pass_rate,
        report=str(audit),
        candidate=str(candidate),
        note="Candidate was preserved and audited only. It was not installed, released, published, or deployed.",
    )
    print(json.dumps({
        "state": "review_ready" if synthetic_pass else "synthetic_failed_but_audited",
        "report": str(audit),
        "strictAllRowsPassRate": strict_pass_rate,
    }))


if __name__ == "__main__":
    main()
