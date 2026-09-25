#!/usr/bin/env python3
"""Hard start gate for the transparent OpenAI-trained measurement system."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


def read(path: Path) -> dict:
    try:
        return json.loads(path.read_text())
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--artifacts-root", required=True, type=Path)
    parser.add_argument("--code-root", required=True, type=Path)
    parser.add_argument("--stage", choices=("dry", "full"), default="dry")
    parser.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    artifacts = args.artifacts_root.resolve()
    teacher = read(artifacts / "teacher-audit/teacher-audit-summary.json")
    repair = read(artifacts / "teacher-audit/teacher-repair-summary.json")
    evidence = read(artifacts / "teacher-audit/teacher-evidence-index.json")
    system_test = read(artifacts / "transparent-system-contract-result.json")
    execution = read(artifacts / "approved-execution-job.json")
    dry = read(artifacts / "runpod-dry-result.json")
    contract = read(args.code_root / "training-contract.json")
    trainer = read(args.code_root / "openai-trainer-contract.json")
    separation = teacher.get("separation") or {}
    questionable = sum(
        sum((teacher.get("statusCounts") or {}).get(row, {}).get(status, 0) for status in ("yellow", "red"))
        for row in ("waist", "hips")
    )
    checks = [
        ("3,878 development and 448 final-test people are separated", separation.get("developmentPeople") == 3878 and separation.get("heldoutPeople") == 448 and separation.get("overlap") == 0),
        ("all 7,756 waist/hip teachers have decisions", teacher.get("state") == "passed" and teacher.get("decisionsWritten") == 7756),
        ("all questionable teachers received detailed repair review", repair.get("state") == "completed" and repair.get("targetsReviewed") == questionable),
        ("all teachers have visual evidence records", evidence.get("state") == "completed" and evidence.get("targets") == 7756),
        ("production input is fixed", contract.get("customerInputs") == ["front silhouette", "height", "weight", "BMI", "gender"]),
        ("PyTorch, AdamW, gradients and hidden weights are forbidden", all(contract.get(key) is False for key in ("pytorchAllowed", "adamwAllowed", "gradientsAllowed", "hiddenWeightsOrBiasesAllowed"))),
        ("first answer has a complete visible source trace", len(contract.get("requiredFirstAnswerTrace") or []) >= 13),
        ("transparent system contract tests passed", system_test.get("state") == "passed" and system_test.get("pytorchUsed") is False and system_test.get("adamwUsed") is False),
        ("OpenAI attached trainer lesson contract is locked", (trainer.get("authority") or {}).get("mayCreateHiddenNumbers") is False and (trainer.get("authority") or {}).get("mayKeepLessonWithoutPersonLevelValidation") is False),
        ("success rules are frozen before the 448 test", (contract.get("successGates") or {}).get("allFiveFoldsRequired") is True),
        ("exact execution job is frozen and reviewed", execution.get("state") == "approved" and execution.get("heldoutPeopleUsed") == 0 and execution.get("pytorchUsed") is False and execution.get("adamwUsed") is False),
    ]
    if args.stage == "full":
        checks.append(("small RunPod dry run passed", dry.get("state") == "passed" and dry.get("heldoutPeopleUsed") == 0))
    gates = [{"name": name, "passed": passed} for name, passed in checks]
    payload = {
        "schemaVersion": "wear-waist-hip-transparent-start-gates/v1",
        "stage": args.stage,
        "state": "passed" if all(item["passed"] for item in gates) else "blocked",
        "passed": sum(item["passed"] for item in gates),
        "required": len(gates),
        "gates": gates,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, indent=2) + "\n")
    print(json.dumps(payload, indent=2))
    return 0 if payload["state"] == "passed" else 2


if __name__ == "__main__":
    raise SystemExit(main())
