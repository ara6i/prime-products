#!/usr/bin/env python3
"""Refuse RunPod work until every agreed plan gate has evidence."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any


EXPECTED_DECISIONS = 7_756


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--artifacts-root", required=True, type=Path)
    parser.add_argument("--code-root", required=True, type=Path)
    parser.add_argument("--stage", choices=("dry", "full"), default="dry")
    parser.add_argument("--output", required=True, type=Path)
    return parser.parse_args()


def read_json(path: Path) -> dict[str, Any] | None:
    try:
        return json.loads(path.read_text())
    except (FileNotFoundError, json.JSONDecodeError):
        return None


def count_lines(path: Path) -> int:
    if not path.is_file():
        return 0
    with path.open(encoding="utf-8") as handle:
        return sum(1 for line in handle if line.strip())


def gate(name: str, passed: bool, evidence: str, reason: str) -> dict[str, Any]:
    return {"name": name, "passed": bool(passed), "evidence": evidence, "reason": reason if not passed else None}


def main() -> int:
    args = parse_args()
    artifacts = args.artifacts_root.resolve()
    code = args.code_root.resolve()
    teacher = read_json(artifacts / "teacher-audit/teacher-audit-summary.json") or {}
    separation = teacher.get("separation") or {}
    repair = read_json(artifacts / "teacher-audit/teacher-repair-summary.json") or {}
    evidence = read_json(artifacts / "teacher-audit/teacher-evidence-index.json") or {}
    model_test = read_json(artifacts / "model-contract-result.json") or {}
    dry_result = read_json(artifacts / "runpod-dry-result.json") or {}
    runpod = read_json(artifacts / "approved-runpod-job.json") or {}
    training_contract = read_json(code / "training-contract.json") or {}
    investigator = read_json(code / "investigator-contract.json") or {}
    decisions = count_lines(artifacts / "teacher-audit/teacher-decisions.jsonl")
    gates = [
        gate(
            "Frozen person lists",
            separation.get("developmentPeople") == 3_878 and separation.get("heldoutPeople") == 448 and separation.get("overlap") == 0,
            "teacher-audit/teacher-audit-summary.json",
            "Need 3,878 development people, 448 excluded people and zero overlap.",
        ),
        gate(
            "Every waist and hip teacher has a decision",
            teacher.get("state") == "passed" and decisions == EXPECTED_DECISIONS,
            "teacher-audit/teacher-decisions.jsonl",
            f"Need exactly {EXPECTED_DECISIONS} audited target decisions.",
        ),
        gate(
            "Yellow and red teachers received detailed repair review",
            repair.get("state") == "completed" and repair.get("targetsReviewed") == sum(
                sum((teacher.get("statusCounts") or {}).get(row, {}).get(status, 0) for status in ("yellow", "red"))
                for row in ("waist", "hips")
            ),
            "teacher-audit/teacher-repair-summary.json",
            "The full yellow/red source and neighbouring-plane repair review is incomplete.",
        ),
        gate(
            "Every teacher has a visual evidence record",
            evidence.get("state") == "completed" and evidence.get("targets") == EXPECTED_DECISIONS,
            "teacher-audit/teacher-evidence-index.json",
            "Need one line/ring/source evidence record for every waist and hip target.",
        ),
        gate(
            "Production input is fixed",
            training_contract.get("customerInputs") == ["front silhouette", "height", "weight", "BMI", "gender"],
            "training-contract.json",
            "Customer input contract does not match the agreed plan.",
        ),
        gate(
            "Strict named geometry path passed code tests",
            model_test.get("state") == "passed" and model_test.get("directHiddenTapeHead") is False,
            "model-contract-result.json",
            "The RunPod PyTorch contract test has not passed yet.",
        ),
        gate(
            "Success rules frozen before the 448 test",
            bool((training_contract.get("successGates") or {}).get("allFiveFoldsRequired")) and training_contract.get("heldoutUse") is not None,
            "training-contract.json",
            "Validation and final-test success rules are incomplete.",
        ),
        gate(
            "OpenAI investigator contract locked",
            (investigator.get("hardRules") or {}).get("mayDirectlyChangeWeights") is False
            and (investigator.get("checkpointCadence") or {}).get("trainingPausesForReview") is True,
            "investigator-contract.json",
            "The required evidence, output schema and authority limits are incomplete.",
        ),
        gate(
            "Exact RunPod job reviewed",
            runpod.get("state") == "approved" and runpod.get("heldoutPeopleUsed") == 0,
            "approved-runpod-job.json",
            "GPU, command, duration, storage and maximum charge are not frozen.",
        ),
    ]
    if args.stage == "full":
        gates.append(gate(
            "Small GPU dry run passed",
            dry_result.get("state") == "passed" and dry_result.get("heldoutPeopleUsed") == 0,
            "runpod-dry-result.json",
            "The paid full run is forbidden until the small GPU proof succeeds.",
        ))
    payload = {
        "schemaVersion": "wear-waist-hip-start-gates/v1",
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
