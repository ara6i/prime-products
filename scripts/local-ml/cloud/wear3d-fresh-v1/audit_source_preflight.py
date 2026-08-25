#!/usr/bin/env python3
"""CPU-only source and split gate before fresh WEAR 3D rendering or training."""

from __future__ import annotations

import argparse
from collections import Counter
from datetime import datetime, timezone
import json
import math
from pathlib import Path
from typing import Any


EXPECTED_ROLES = {"train": 3451, "validation": 427, "test": 448}
TAPE_FIELDS = {
    "neck": "neck_base_circumference_mm",
    "chest": "chest_circumference_mm",
    "underbust": "underbust_circumference_mm",
    "waist": "waist_circumference_mm",
    "hips": "hip_circumference_mm",
}
TAPE_RATIOS = {
    "chest_underbust": ("chest", "underbust"),
    "chest_waist": ("chest", "waist"),
    "chest_hips": ("chest", "hips"),
    "neck_waist": ("neck", "waist"),
    "waist_hips": ("waist", "hips"),
    "underbust_waist": ("underbust", "waist"),
    "underbust_hips": ("underbust", "hips"),
}


def arguments() -> argparse.Namespace:
    root = Path(__file__).resolve().parents[4]
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--manifest",
        type=Path,
        default=root / ".local-ml/wear3d-v6-audit/source-manifest-standing-a.jsonl",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=root / ".local-ml/reports/wear-fresh-v1-source-preflight.json",
    )
    return parser.parse_args()


def finite(value: Any) -> float | None:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if math.isfinite(number) else None


def percentage(count: int, total: int) -> float:
    return round(count / total * 100.0, 3) if total else 0.0


def main() -> None:
    args = arguments()
    records = [
        json.loads(line)
        for line in args.manifest.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]
    by_role = {
        role: [record for record in records if record.get("role") == role]
        for role in EXPECTED_ROLES
    }
    subjects = {
        role: {str(record.get("subject_id") or "") for record in split}
        for role, split in by_role.items()
    }
    overlaps = {
        f"{left}-{right}": sorted(subjects[left] & subjects[right])
        for left, right in (("train", "validation"), ("train", "test"), ("validation", "test"))
        if subjects[left] & subjects[right]
    }
    source_ready: dict[str, dict[str, int]] = {}
    profile_ready: dict[str, dict[str, int]] = {}
    tape_coverage: dict[str, Any] = {}
    ratio_coverage: dict[str, Any] = {}
    invalid_pose: dict[str, list[str]] = {}

    for role, split in by_role.items():
        source_ready[role] = {
            key: sum(bool((record.get("source") or {}).get(key)) for record in split)
            for key in ("mesh", "landmarks")
        }
        profile_ready[role] = {
            "height": sum(finite(record.get("height_cm")) is not None for record in split),
            "weight": sum(finite(record.get("weight_kg")) is not None for record in split),
            "gender": sum(record.get("gender") in {"female", "male"} for record in split),
        }
        invalid_pose[role] = [
            str(record.get("scan_id"))
            for record in split
            if record.get("pose") != "standing_neutral"
            or record.get("training_pose_valid") is not True
            or not str(record.get("scan_id") or "").endswith("-A")
        ]
        if role == "test":
            tape_coverage[role] = {
                "state": "sealed",
                "labelsInspected": False,
            }
            ratio_coverage[role] = {
                "state": "sealed",
                "labelsInspected": False,
            }
            continue
        tape_counts = Counter()
        applicable_counts = Counter()
        ratio_counts = Counter()
        for record in split:
            measurements = record.get("measurements_mm") or {}
            gender = str(record.get("gender") or "").lower()
            values = {
                row: finite(measurements.get(field))
                for row, field in TAPE_FIELDS.items()
            }
            for row, value in values.items():
                applicable = row != "underbust" or gender == "female" or value is not None
                if applicable:
                    applicable_counts[row] += 1
                    if value is not None and value > 0:
                        tape_counts[row] += 1
            for ratio, (numerator, denominator) in TAPE_RATIOS.items():
                numerator_applicable = numerator != "underbust" or gender == "female" or values[numerator] is not None
                denominator_applicable = denominator != "underbust" or gender == "female" or values[denominator] is not None
                if numerator_applicable and denominator_applicable:
                    applicable_counts[f"ratio.{ratio}"] += 1
                    if (
                        values[numerator] is not None
                        and values[numerator] > 0
                        and values[denominator] is not None
                        and values[denominator] > 0
                    ):
                        ratio_counts[ratio] += 1
        tape_coverage[role] = {
            row: {
                "eligible": tape_counts[row],
                "applicable": applicable_counts[row],
                "coveragePct": percentage(tape_counts[row], applicable_counts[row]),
            }
            for row in TAPE_FIELDS
        }
        ratio_coverage[role] = {
            ratio: {
                "eligible": ratio_counts[ratio],
                "applicable": applicable_counts[f"ratio.{ratio}"],
                "coveragePct": percentage(ratio_counts[ratio], applicable_counts[f"ratio.{ratio}"]),
            }
            for ratio in TAPE_RATIOS
        }

    split_counts = {role: len(subjects[role]) for role in EXPECTED_ROLES}
    gates = {
        "exactSplitCounts": split_counts == EXPECTED_ROLES,
        "noSubjectLeakage": not overlaps,
        "standingNeutralOnly": not any(invalid_pose.values()),
        "allSourcePointersPresent": all(
            source_ready[role][key] == len(by_role[role])
            for role in EXPECTED_ROLES
            for key in ("mesh", "landmarks")
        ),
        "allProfileInputsPresent": all(
            profile_ready[role][key] == len(by_role[role])
            for role in EXPECTED_ROLES
            for key in ("height", "weight", "gender")
        ),
    }
    source_gate_passed = all(gates.values())
    report = {
        "schemaVersion": "wear3d-fresh-source-preflight/v1",
        "generatedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "pipelineId": "wear3d-fresh-v1",
        "v9ArtifactUsed": False,
        "manifest": str(args.manifest.resolve()),
        "records": len(records),
        "splitSubjects": split_counts,
        "expectedSplitSubjects": EXPECTED_ROLES,
        "subjectOverlap": overlaps,
        "sourcePointers": source_ready,
        "profileInputs": profile_ready,
        "invalidPoseCounts": {role: len(values) for role, values in invalid_pose.items()},
        "tapeCoverage": tape_coverage,
        "numericTapeRatioCoverage": ratio_coverage,
        "cameraTeacher": {
            "viewsPerSubject": 9,
            "labels": ["yaw", "pitch", "roll", "lens", "distance", "target-height"],
            "operation": "one global inverse camera transform; no local body-part stretching",
        },
        "sealedTest": {
            "subjects": len(subjects["test"]),
            "labelsUsedForPreflightOrSelection": False,
            "openedForModelEvaluation": False,
        },
        "gates": gates,
        "sourceGatePassed": source_gate_passed,
        "freshGeometry": {
            "state": "required",
            "trainSubjectsQueued": len(subjects["train"]),
            "validationSubjectsQueued": len(subjects["validation"]),
            "testSubjectsQueued": 0,
            "reason": "Fresh PLY row positions, A-B, C-D, shape masks, and camera views must be generated before fitting.",
        },
        "gpuTrainingAllowed": False,
        "nextGate": (
            "Run fresh CPU geometry for train and validation only."
            if source_gate_passed
            else "Fix failed source gates before any geometry batch."
        ),
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, indent=2))
    if not source_gate_passed:
        raise SystemExit(2)


if __name__ == "__main__":
    main()
