#!/usr/bin/env python3
"""Fail closed unless V6 can memorize ten complete WEAR teachers."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


LIMITS = {
    "yPixels": 0.40,
    "edgePixels": 0.30,
    "widthCm": 0.30,
    "depthCm": 0.30,
    "shapeCoordinate": 0.012,
    "tapeCm": 0.35,
}


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--result", required=True, type=Path)
    args = parser.parse_args()
    result = json.loads(args.result.read_text())
    failures: list[str] = []
    if result.get("model") != "WaistHipStudentV6":
        failures.append(f"wrong model: {result.get('model')}")
    if result.get("overfitProof") is not True:
        failures.append("result is not marked as an overfit proof")
    if result.get("validation", {}).get("subjects") != 10:
        failures.append("proof does not contain exactly ten subjects")
    if result.get("sealed448SubjectsUsedForTraining") != 0:
        failures.append("sealed 448 was opened")
    auxiliary = result.get("auxiliaryTeacher", {})
    if auxiliary.get("recordedWearTapeIsSoleCircumferenceTarget") is not True:
        failures.append("recorded WEAR tape is not marked as the sole circumference target")
    if auxiliary.get("threeDimensionalGeometryIsSeparateFromTape") is not True:
        failures.append("3D geometry is not marked as separate from tape")
    for row in ("waist", "hips"):
        metrics = result["metrics"]["rows"][row]
        for name, limit in LIMITS.items():
            key = "maximum" if name != "shapeCoordinate" else "mae"
            value = metrics[name][key]
            if value is None or value > limit:
                failures.append(f"{row}.{name}={value} exceeds {limit}")
    report = {
        "schemaVersion": "wear3d-waist-hips-v6-overfit-gate/v1",
        "passed": not failures,
        "limits": LIMITS,
        "failures": failures,
        "sealed448SubjectsUsedForTraining": 0,
    }
    print(json.dumps(report, indent=2, sort_keys=True))
    return 0 if not failures else 2


if __name__ == "__main__":
    raise SystemExit(main())

