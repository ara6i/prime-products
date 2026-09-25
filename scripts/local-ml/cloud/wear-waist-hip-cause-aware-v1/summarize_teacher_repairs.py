#!/usr/bin/env python3
"""Summarize detailed PLY sweeps without using tape to choose a geometry teacher."""

from __future__ import annotations

import argparse
import hashlib
import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path


def slug(value: str) -> str:
    return value.lower()


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(8 * 1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--worklist", required=True, type=Path)
    parser.add_argument("--sweep-root", required=True, type=Path)
    parser.add_argument("--status", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--details-output", required=True, type=Path)
    args = parser.parse_args()

    work = []
    with args.worklist.open(encoding="utf-8") as handle:
        for line in handle:
            if not line.strip():
                continue
            person = json.loads(line)
            for target in person.get("targets") or []:
                work.append({"scanId": person["scanId"], **target})
    expected = len(work)

    status = {}
    if args.status.exists():
        with args.status.open(encoding="utf-8") as handle:
            for line in handle:
                parts = line.strip().split("\t")
                if len(parts) == 3:
                    status[(parts[1], parts[2])] = parts[0]

    counts = Counter()
    details = []
    for item in work:
        scan_id = str(item["scanId"])
        target = str(item["target"])
        path = args.sweep_root / f"{slug(scan_id)}-{target}.json"
        log_path = args.sweep_root / "logs" / f"{slug(scan_id)}-{target}.log"
        sweep = json.loads(path.read_text()) if path.exists() else None
        reported_status = status.get((scan_id, target), "missing")
        effective_status = reported_status if sweep is not None else "failed-no-sweep-output"
        failure_reason = None
        if sweep is None and log_path.exists():
            for line in log_path.read_text(errors="replace").splitlines():
                if line.startswith("RuntimeError:"):
                    failure_reason = line.removeprefix("RuntimeError:").strip()
        action = str(item.get("currentAction") or "")
        if sweep is None:
            classification = "source-remeasurement-required"
            final_action = "quarantine this target; no replacement teacher is created"
        elif "tape-is-unavailable" in action:
            classification = "certified-geometry-preserved-tape-missing"
            final_action = "keep certified PLY geometry; do not create tape correction"
        elif "mask-unresolved-tape-correction" in action or "quarantine-conflicting-tape-correction" in action:
            classification = "certified-geometry-preserved-tape-conflict"
            final_action = "keep certified PLY geometry; quarantine tape correction"
        elif not bool((sweep.get("current_source_plane") or {}).get("certified")):
            candidate = sweep.get("tape_blind_candidate") or {}
            if candidate.get("certified"):
                classification = "tape-blind-geometry-candidate-needs-validation"
                final_action = "candidate is recorded but cannot replace the teacher until the independent body-line rule passes person-level validation"
            else:
                classification = "source-remeasurement-required"
                final_action = "quarantine this target; no replacement teacher is created"
        else:
            classification = "certified-geometry-preserved"
            final_action = "keep the existing independently certified PLY geometry"
        counts[classification] += 1
        current = (sweep or {}).get("current_source_plane") or {}
        candidate = (sweep or {}).get("tape_blind_candidate") or {}
        oracle = (sweep or {}).get("tape_oracle_diagnostic_only") or {}
        details.append({
            "scanId": scan_id,
            "target": target,
            "originalStatus": item.get("status"),
            "originalReasons": item.get("reasons"),
            "sweepStatusReported": reported_status,
            "sweepStatus": effective_status,
            "failureReason": failure_reason,
            "classification": classification,
            "finalAction": final_action,
            "tapeNeverSelectedGeometry": True,
            "currentPlane": {
                "offsetMm": current.get("offset_mm"),
                "ringCm": current.get("walked_perimeter_mm") / 10.0 if current.get("walked_perimeter_mm") is not None else None,
                "certified": current.get("certified"),
            },
            "tapeBlindCandidate": {
                "rule": (sweep or {}).get("tape_blind_candidate_rule"),
                "offsetMm": candidate.get("offset_mm"),
                "ringCm": candidate.get("walked_perimeter_mm") / 10.0 if candidate.get("walked_perimeter_mm") is not None else None,
                "certified": candidate.get("certified"),
            },
            "tapeOracleDiagnosticOnly": {
                "offsetMm": oracle.get("offset_mm"),
                "remainingDifferenceCm": abs(oracle.get("tape_difference_mm")) / 10.0 if oracle.get("tape_difference_mm") is not None else None,
                "forbiddenAsTeacher": True,
            },
            "sweepEvidence": str(path.resolve()) if path.exists() else None,
            "sweepLog": str(log_path.resolve()) if log_path.exists() else None,
        })

    completed = len(details) == expected and all(
        item["sweepStatus"] == "passed" or item["sweepStatus"].startswith("failed")
        for item in details
    )
    args.details_output.parent.mkdir(parents=True, exist_ok=True)
    with args.details_output.open("w", encoding="utf-8") as handle:
        for item in details:
            handle.write(json.dumps(item, sort_keys=True) + "\n")
    summary = {
        "schemaVersion": "wear-waist-hip-teacher-repair-summary/v1",
        "createdAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "state": "completed" if completed else "in-progress",
        "targetsExpected": expected,
        "targetsReviewed": len(details) if completed else sum(
            item["sweepStatus"] == "passed" or item["sweepStatus"].startswith("failed")
            for item in details
        ),
        "sweepResults": {
            "passedWithJson": sum(item["sweepStatus"] == "passed" for item in details),
            "failedWithNoJson": sum(item["sweepStatus"] == "failed-no-sweep-output" for item in details),
        },
        "classificationCounts": dict(sorted(counts.items())),
        "geometrySelectionRule": "Tape is revealed only after tape-blind geometry candidates are calculated and never selects a teacher plane.",
        "automaticTapeFabricationAllowed": False,
        "details": str(args.details_output.resolve()),
        "detailsSha256": sha256(args.details_output),
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(summary, indent=2, sort_keys=True) + "\n")
    print(json.dumps(summary, indent=2, sort_keys=True))
    return 0 if completed else 2


if __name__ == "__main__":
    raise SystemExit(main())
