#!/usr/bin/env python3
"""Finish the private WEAR v6r5 candidate automatically after GPU training.

This watcher is intentionally fail-closed. It may download/install a synthetic
pass candidate or the one hash-locked under-bust baseline-tie diagnostic, run
the answer-free local real-photo suite, and create review artifacts. It never
releases, publishes, deploys, or creates an SDK.
"""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import subprocess
import time
from urllib.request import Request, urlopen


PIPELINE_ID = "wear3d-standing-rgb-v6r5-20260816"
BUCKET = "primestyleai-wear3d-921049726279-us-east-1"
STATUS_KEY = "jobs/wear3d-v6r5/status.json"
PROFILE = "primestyle-wear"
REGION = "us-east-1"


def now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--project-root", type=Path, default=Path.cwd())
    parser.add_argument("--poll-seconds", type=int, default=180)
    parser.add_argument("--max-hours", type=float, default=5.0)
    parser.add_argument(
        "--finalize-review",
        action="store_true",
        help="Re-run the fail-closed gate after the combined contact-sheet review is complete.",
    )
    return parser.parse_args()


def aws_environment() -> dict[str, str]:
    environment = os.environ.copy()
    environment.update({
        "AWS_PROFILE": PROFILE,
        "AWS_REGION": REGION,
        "AWS_DEFAULT_REGION": REGION,
        "AWS_PAGER": "",
    })
    return environment


def read_cloud_status() -> dict:
    result = subprocess.run(
        ["aws", "s3", "cp", f"s3://{BUCKET}/{STATUS_KEY}", "-", "--only-show-errors"],
        check=True,
        capture_output=True,
        text=True,
        env=aws_environment(),
        timeout=45,
    )
    value = json.loads(result.stdout)
    if not isinstance(value, dict):
        raise RuntimeError("WEAR v6r5 cloud status is not an object")
    return value


def write_state(path: Path, **updates) -> None:
    current: dict = {}
    if path.is_file():
        try:
            value = json.loads(path.read_text(encoding="utf-8"))
            if isinstance(value, dict):
                current = value
        except Exception:
            current = {}
    current.update({
        "schema_version": 1,
        "pipeline_id": PIPELINE_ID,
        "private_test_lab_only": True,
        "released": False,
        "published": False,
        "deployed": False,
        "sdk_ready": False,
        "updated_at": now(),
        **updates,
    })
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(current, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def run(root: Path, *arguments: str, check: bool = True) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        list(arguments),
        cwd=root,
        check=check,
        capture_output=True,
        text=True,
        timeout=900,
    )


def api_model_version() -> str | None:
    request = Request(
        "http://127.0.0.1:3001/api/try-on-test/wear-photo-test/v6",
        headers={"Cache-Control": "no-store"},
    )
    try:
        with urlopen(request, timeout=20) as response:
            value = json.loads(response.read())
        return str(value.get("modelVersion") or "") if value.get("ok") is True else None
    except Exception:
        return None


def main() -> None:
    args = parse_args()
    root = args.project_root.resolve()
    python = root / ".local-ml/venv-wear-v6/bin/python"
    watcher_path = root / ".local-ml/reports/wear3d-v6r5-private-watcher.json"
    report_path = root / ".local-ml/reports/wear3d-v6r5-real-photo-pending-20260816.json"
    contact_path = root / ".local-ml/reports/wear3d-v6r5-real-photo-contact-sheet-20260816.jpg"
    review_path = root / ".local-ml/reports/wear3d-v6r5-visual-review-pending-20260816.json"
    validation_path = root / ".local-ml/reports/wear3d-v6r5-private-validation-20260816.json"
    if not python.is_file():
        raise RuntimeError(f"Private validation Python is missing: {python}")

    if args.finalize_review:
        if not report_path.is_file() or not review_path.is_file():
            raise RuntimeError("The real-photo report and combined visual review must exist before finalizing.")
        review_result = json.loads(review_path.read_text(encoding="utf-8"))
        if not review_result.get("reviewed_at"):
            raise RuntimeError("The combined visual review is still pending.")
        validation = run(
            root,
            str(python),
            "scripts/local-ml/cloud/wear3d-v6/validate_v6_private_candidate.py",
            "--project-root",
            str(root),
            "--report",
            str(report_path),
            "--visual-review",
            str(review_path),
            "--output",
            str(validation_path),
            check=False,
        )
        validation_result = json.loads(validation_path.read_text(encoding="utf-8"))
        private_gate_passed = validation_result.get("passed") is True
        write_state(
            watcher_path,
            state="private_gate_passed" if private_gate_passed else "private_gate_failed",
            validator_exit_code=validation.returncode,
            quantitative_mean_absolute_error_cm=validation_result.get("mean_absolute_error_cm"),
            quantitative_max_absolute_error_cm=validation_result.get("max_absolute_error_cm"),
            private_gate_passed=private_gate_passed,
            remaining_failures=validation_result.get("failures") or [],
            visual_review_complete=True,
            visual_review_completed_at=review_result.get("reviewed_at"),
            report=str(report_path),
            contact_sheet=str(contact_path),
            visual_review=str(review_path),
            validation=str(validation_path),
        )
        raise SystemExit(0 if private_gate_passed else 1)

    started = time.monotonic()
    write_state(watcher_path, state="watching_gpu", started_at=now())
    last_state = None
    while time.monotonic() - started < args.max_hours * 3600:
        try:
            status = read_cloud_status()
        except Exception as error:
            write_state(watcher_path, state="watching_gpu", transient_error=f"{type(error).__name__}: {error}")
            time.sleep(args.poll_seconds)
            continue
        state = str(status.get("state") or "unknown")
        if state != last_state:
            write_state(
                watcher_path,
                state="watching_gpu",
                cloud_state=state,
                cloud_percent=status.get("overallPercent"),
                cloud_stage=status.get("currentStageLabel"),
            )
            last_state = state
        cloud_failures = ((status.get("model") or {}).get("failures") or [])
        exact_reviewable_tie = (
            state == "failed"
            and len(cloud_failures) == 1
            and str(cloud_failures[0]).startswith(
                "row.underbust.y_shoulder_hip_ratio: MAE="
            )
        )
        if state in {"failed", "blocked"} and not exact_reviewable_tie:
            write_state(
                watcher_path,
                state="synthetic_failed",
                cloud_state=state,
                failures=cloud_failures,
            )
            raise SystemExit(1)
        if exact_reviewable_tie:
            write_state(
                watcher_path,
                state="installing_private_candidate",
                official_synthetic_pass=False,
                private_diagnostic_only=True,
                failures=cloud_failures,
                note="The installer must independently verify the uploaded hash-locked tie review.",
            )
            break
        if state == "awaiting_real_photo_validation":
            break
        time.sleep(args.poll_seconds)
    else:
        write_state(watcher_path, state="timed_out_waiting_for_gpu")
        raise SystemExit(2)

    write_state(watcher_path, state="installing_private_candidate")
    install = run(
        root,
        str(python),
        "scripts/local-ml/cloud/wear3d-v6/install_v6_candidate.py",
        "--project-root",
        str(root),
    )
    write_state(watcher_path, state="waiting_for_local_api", install_output=install.stdout[-4_000:])
    for _ in range(30):
        if api_model_version() == PIPELINE_ID:
            break
        time.sleep(4)
    else:
        write_state(watcher_path, state="awaiting_local_api", required_model=PIPELINE_ID)
        raise SystemExit(3)

    write_state(watcher_path, state="running_answer_free_real_photos")
    suite = run(
        root,
        str(python),
        "scripts/local-ml/cloud/wear3d-v6/run_v6_real_photo_suite.py",
        "--project-root",
        str(root),
        "--output",
        str(report_path),
        "--contact-sheet",
        str(contact_path),
    )
    report = json.loads(report_path.read_text(encoding="utf-8"))
    review = {
        "schema_version": 1,
        "model_version": PIPELINE_ID,
        "reviewed_at": None,
        "automatic_review": False,
        "contact_sheet_sha256": (report.get("contact_sheet") or {}).get("sha256"),
        "cases": {
            person_id: {
                edge: False
                for edge in (("neck", "chest", "underbust", "waist", "hips") if person_id != "shane-2" else ("neck", "chest", "waist", "hips"))
            }
            for person_id in ("shahnaz-2", "negar-2", "shane-2")
        },
        "note": "Deliberately pending human visual review. No edge is auto-approved.",
    }
    review_path.write_text(json.dumps(review, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    validation = run(
        root,
        str(python),
        "scripts/local-ml/cloud/wear3d-v6/validate_v6_private_candidate.py",
        "--project-root",
        str(root),
        "--report",
        str(report_path),
        "--visual-review",
        str(review_path),
        "--output",
        str(validation_path),
        check=False,
    )
    validation_result = json.loads(validation_path.read_text(encoding="utf-8"))
    write_state(
        watcher_path,
        state="ready_for_human_review",
        suite_output=suite.stdout[-4_000:],
        validator_exit_code=validation.returncode,
        quantitative_mean_absolute_error_cm=validation_result.get("mean_absolute_error_cm"),
        quantitative_max_absolute_error_cm=validation_result.get("max_absolute_error_cm"),
        private_gate_passed=validation_result.get("passed") is True,
        report=str(report_path),
        contact_sheet=str(contact_path),
        visual_review=str(review_path),
        validation=str(validation_path),
    )


if __name__ == "__main__":
    main()
