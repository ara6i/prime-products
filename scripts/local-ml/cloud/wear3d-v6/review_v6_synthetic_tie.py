#!/usr/bin/env python3
"""Hash-lock a private diagnostic review of a single numerical baseline tie.

This never rewrites the original metrics and never claims an official
synthetic pass. It only permits the exact saved candidate to be installed in
Test Lab for the already-planned real-photo diagnosis when every hard accuracy
gate passed and the sole failure is within the documented 0.001 ratio tie.
"""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
import math
from pathlib import Path


PIPELINE_ID = "wear3d-standing-rgb-v6r5-20260816"
TARGET = "row.underbust.y_shoulder_hip_ratio"
ABSOLUTE_LIMIT = 0.06
BASELINE_TIE_TOLERANCE = 0.001


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--metrics", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    return parser.parse_args()


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def number(value: object) -> float:
    result = float(value)
    if not math.isfinite(result):
        raise RuntimeError(f"Non-finite metric: {value!r}")
    return result


def main() -> None:
    args = parse_args()
    metrics = json.loads(args.metrics.read_text(encoding="utf-8"))
    if not isinstance(metrics, dict) or metrics.get("model_version") != PIPELINE_ID:
        raise RuntimeError("Metrics do not belong to the exact v6r5 candidate")
    failures = metrics.get("failures") if isinstance(metrics.get("failures"), list) else []
    expected_prefix = f"{TARGET}:"
    if metrics.get("synthetic_candidate_passed") is not False:
        raise RuntimeError("This review is only for a preserved synthetic-false candidate")
    if len(failures) != 1 or not str(failures[0]).startswith(expected_prefix):
        raise RuntimeError(f"Refusing review because failures are not the one approved tie: {failures}")

    target = ((metrics.get("edge_metrics") or {}).get(TARGET) or {})
    mae = number(target.get("mae"))
    baseline = number(target.get("train_mean_baseline_mae"))
    gap = mae - baseline
    structure = metrics.get("edge_structure_metrics") or {}
    coverage = metrics.get("target_learning_coverage") or {}
    shape = metrics.get("cross_section_metrics") or {}
    hard_checks = {
        "target has held-out people": int(target.get("count") or 0) >= 200,
        "absolute row error passes": mae <= ABSOLUTE_LIMIT,
        "baseline gap is a numerical tie": gap <= BASELINE_TIE_TOLERANCE,
        "all held-out rows are ordered": number(structure.get("ordered_rate")) >= 0.99,
        "all held-out spans are valid": number(structure.get("valid_span_rate")) >= 0.99,
        "edge learning coverage passes": number(coverage.get("edge_win_rate")) >= 0.75,
        "measurement learning coverage passes": number(coverage.get("measurement_win_rate")) >= 0.75,
        "closed-shape error passes": number(shape.get("mean_mae_normalized")) <= number(shape.get("maximum_mean_mae_normalized")),
        "closed-shape learning coverage passes": number(shape.get("baseline_win_rate")) >= 0.75,
    }
    failed_checks = [name for name, passed in hard_checks.items() if not passed]
    if failed_checks:
        raise RuntimeError(f"Private diagnostic review failed: {failed_checks}")

    result = {
        "schemaVersion": 1,
        "pipelineId": PIPELINE_ID,
        "reviewedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "metricsSha256": sha256(args.metrics),
        "officialSyntheticPass": False,
        "acceptedForPrivateDiagnostic": True,
        "target": TARGET,
        "heldOutCount": int(target["count"]),
        "mae": mae,
        "absoluteLimit": ABSOLUTE_LIMIT,
        "trainMeanBaselineMae": baseline,
        "baselineGap": round(gap, 8),
        "baselineTieTolerance": BASELINE_TIE_TOLERANCE,
        "hardChecks": hard_checks,
        "originalFailure": failures[0],
        "reason": "The absolute anatomical limit passed and the sole baseline miss is below the documented 0.001 normalized-ratio tie tolerance. Original metrics remain unchanged.",
        "privateTestLabOnly": True,
        "releaseAuthorized": False,
        "publishAuthorized": False,
        "sdkReady": False,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
