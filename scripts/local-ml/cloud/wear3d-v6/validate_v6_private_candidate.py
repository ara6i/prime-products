#!/usr/bin/env python3
"""Fail-closed private validation for a WEAR v6r5 Test Lab candidate.

This script never edits the model, creates an SDK, uploads artifacts, or
publishes anything. It combines the immutable answer-free report with a small
human review file for the three final real-photo contact-sheet panels.
"""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
import math
from pathlib import Path
from typing import Any


PIPELINE_ID = "wear3d-standing-rgb-v6r5-20260816"
REQUIRED_PEOPLE = {"shane-2", "shahnaz-2", "negar-2"}
REQUIRED_EDGES = {"neck", "chest", "waist", "hips"}
FEMALE_EDGES = REQUIRED_EDGES | {"underbust"}
EXPECTED_SUBJECTS = {"train": 3_451, "validation": 427, "test": 448}
MAX_SINGLE_ERROR_CM = 5.0
MAX_MEAN_ERROR_CM = 4.0
MIN_TAPE_COMPARISONS = 8


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--project-root", type=Path, default=Path.cwd())
    parser.add_argument("--report", type=Path, required=True)
    parser.add_argument("--visual-review", type=Path, required=True)
    parser.add_argument("--output", type=Path)
    return parser.parse_args()


def read_object(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise RuntimeError(f"Expected a JSON object in {path}")
    return value


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def finite(value: object) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(float(value))


def validate_candidate(root: Path, failures: list[str]) -> tuple[Path, str]:
    candidate = root / ".local-ml" / "checkpoints" / PIPELINE_ID
    required = ("model.onnx", "runtime.json", "test-metrics.json", "candidate-install-manifest.json")
    missing = [name for name in required if not (candidate / name).is_file()]
    if missing:
        failures.append(f"installed candidate files missing: {missing}")
        return candidate, ""
    runtime = read_object(candidate / "runtime.json")
    metrics = read_object(candidate / "test-metrics.json")
    install = read_object(candidate / "candidate-install-manifest.json")
    model_hash = sha256(candidate / "model.onnx")
    official_synthetic_pass = (
        runtime.get("syntheticCandidatePassed") is True
        and metrics.get("synthetic_candidate_passed") is True
    )
    diagnostic_review_path = candidate / "synthetic-gate-review.json"
    diagnostic_review = read_object(diagnostic_review_path) if diagnostic_review_path.is_file() else {}
    hard_checks = diagnostic_review.get("hardChecks")
    private_diagnostic_hash_lock = (
        not official_synthetic_pass
        and diagnostic_review_path.is_file()
        and install.get("syntheticCandidatePassed") is False
        and install.get("syntheticTieReviewedForPrivateDiagnostic") is True
        and install.get("syntheticGateReviewSha256") == sha256(diagnostic_review_path)
        and install.get("releaseAuthorized") is False
        and install.get("publishAuthorized") is False
        and install.get("deployAuthorized") is False
        and install.get("sdkReady") is False
        and diagnostic_review.get("officialSyntheticPass") is False
        and diagnostic_review.get("acceptedForPrivateDiagnostic") is True
        and diagnostic_review.get("privateTestLabOnly") is True
        and diagnostic_review.get("releaseAuthorized") is False
        and diagnostic_review.get("publishAuthorized") is False
        and diagnostic_review.get("sdkReady") is False
        and diagnostic_review.get("metricsSha256") == sha256(candidate / "test-metrics.json")
        and diagnostic_review.get("target") == "row.underbust.y_shoulder_hip_ratio"
        and finite(diagnostic_review.get("baselineGap"))
        and float(diagnostic_review["baselineGap"]) <= 0.001
        and finite(diagnostic_review.get("mae"))
        and finite(diagnostic_review.get("absoluteLimit"))
        and float(diagnostic_review["mae"]) <= float(diagnostic_review["absoluteLimit"])
        and isinstance(hard_checks, dict)
        and bool(hard_checks)
        and all(value is True for value in hard_checks.values())
    )
    checks = {
        "candidate model version": runtime.get("model_version") == PIPELINE_ID,
        "install model version": install.get("pipelineId") == PIPELINE_ID,
        "runtime schema v6": runtime.get("schema_version") == 6,
        "synthetic held-out pass": official_synthetic_pass,
        "private diagnostic hash lock": official_synthetic_pass or private_diagnostic_hash_lock,
        "private candidate flag": runtime.get("sdkReady") is False and metrics.get("sdk_ready") is False,
        "mask-free runtime": runtime.get("runtime_mask_required") is False,
        "direct WEAR circumference": runtime.get("circumference_method") == "direct-learned-WEAR-label",
        "raw WEAR depth": runtime.get("depth_method") == "raw-WEAR-mesh-supervision",
        "closed WEAR shape": runtime.get("shape_method") == "32-point-normalized-closed-WEAR-cross-section-supervision",
        "Apple pose contract": runtime.get("pose_input_method")
        == "Apple-Vision-shoulder-and-hip-joints-on-training-teachers-and-runtime-no-mask",
        "complete Apple teacher anchors": runtime.get("apple_anchor_training_coverage") == 4_326,
        "separate Apple front pose projection": runtime.get("core_pose_method")
        == "separate-Apple-on-WEAR-front-pose-projection",
        "pose-relative row model": runtime.get("core_edge_method")
        == "independent-front-only-row-heads-with-learned-WEAR-rows-in-true-Apple-anchor-frame",
        "RGB body-shape plus isolated row measurement heads": runtime.get("core_measurement_method")
        == "independent-mask-free-RGB-profile-pose-plus-own-row-width-heads-front-50-only",
        "exact subject split": runtime.get("subjects") == EXPECTED_SUBJECTS
        and metrics.get("subjects") == EXPECTED_SUBJECTS,
        "installed ONNX hash": (((install.get("artifacts") or {}).get("model.onnx") or {}).get("sha256"))
        == model_hash,
    }
    failures.extend(label for label, passed in checks.items() if not passed)
    return candidate, model_hash


def validate_real_photos(
    report: dict[str, Any],
    review: dict[str, Any],
    report_path: Path,
    model_hash: str,
    failures: list[str],
) -> tuple[list[dict[str, Any]], set[str]]:
    if report.get("schema_version") != 1 or report.get("model_version") != PIPELINE_ID:
        failures.append("real-photo report schema/model mismatch")
    if report.get("model_onnx_sha256") != model_hash:
        failures.append("real-photo report used a different ONNX artifact")
    if report.get("saved_answers_sent_to_model") is not False:
        failures.append("saved tape answers were sent to the model")
    if report.get("runtime_mask_used") is not False:
        failures.append("runtime mask was used")
    if report.get("formula_used") is not False:
        failures.append("a circumference formula was used")

    contact = report.get("contact_sheet") or {}
    contact_path = Path(str(contact.get("path") or ""))
    if not contact_path.is_absolute():
        contact_path = report_path.parent / contact_path
    contact_hash = sha256(contact_path) if contact_path.is_file() else ""
    if not contact_hash or contact_hash != contact.get("sha256"):
        failures.append("real-photo contact sheet is missing or changed")
    if review.get("schema_version") != 1 or review.get("model_version") != PIPELINE_ID:
        failures.append("visual review schema/model mismatch")
    if review.get("contact_sheet_sha256") != contact_hash:
        failures.append("visual review does not match the generated contact sheet")
    reviews = review.get("cases") if isinstance(review.get("cases"), dict) else {}

    comparisons: list[dict[str, Any]] = []
    seen_people: set[str] = set()
    cases = report.get("cases") if isinstance(report.get("cases"), list) else []
    if not cases:
        failures.append("real-photo report has no cases")
    for case in cases:
        if not isinstance(case, dict):
            failures.append("real-photo case is not an object")
            continue
        person_id = str(case.get("person_id") or "").strip().lower()
        if not person_id:
            failures.append("real-photo case is missing person_id")
            continue
        seen_people.add(person_id)
        if case.get("full_body_visible") is not True:
            failures.append(f"{person_id}: full head-to-feet visibility failed")
        if case.get("camera_geometry") not in {"pass", "check"}:
            failures.append(f"{person_id}: Apple camera geometry failed")
        if case.get("saved_answers_sent_to_model") is not False or case.get("manual_answer_used") is not False:
            failures.append(f"{person_id}: answer-free inference was not proven")
        evidence = case.get("evidence") if isinstance(case.get("evidence"), dict) else {}
        if evidence.get("person_box_source") != "Apple Vision joints; no silhouette mask":
            failures.append(f"{person_id}: answer-free Apple crop evidence missing")
        if evidence.get("pose_anchor_source") != "Apple Vision shoulder/hip joints; no silhouette mask":
            failures.append(f"{person_id}: Apple shoulder/hip evidence missing")
        preprocessing = evidence.get("preprocessing") if isinstance(evidence.get("preprocessing"), dict) else {}
        geometry_guard = preprocessing.get("poseGeometryGuard")
        expected_edge_count = 5 if case.get("gender") == "female" else 4
        if not isinstance(geometry_guard, list) or len(geometry_guard) < expected_edge_count:
            failures.append(f"{person_id}: v6r5 pose-relative guard evidence missing")
        evidence_rows = evidence.get("rows") if isinstance(evidence.get("rows"), list) else []
        predicted_edges = {
            str(row.get("kind"))
            for row in evidence_rows
            if isinstance(row, dict) and row.get("edgeSource") in {
                "wear-v6r5-apple-teacher-pose-relative",
                "wear-v6r5-apple-teacher-pose-relative-rgb-snap",
            }
        }
        required_edges = FEMALE_EDGES if case.get("gender") == "female" else REQUIRED_EDGES
        missing_edges = sorted(required_edges - predicted_edges)
        if missing_edges:
            failures.append(f"{person_id}: required WEAR RGB edges missing {missing_edges}")
        case_review = reviews.get(person_id) if isinstance(reviews.get(person_id), dict) else {}
        failed_edges = sorted(name for name in required_edges if case_review.get(name) is not True)
        if failed_edges:
            failures.append(f"{person_id}: visual edge review failed {failed_edges}")

        actuals = case.get("known_tape_cm") if isinstance(case.get("known_tape_cm"), dict) else {}
        predictions = case.get("predicted_cm") if isinstance(case.get("predicted_cm"), dict) else {}
        case_count = 0
        for name, actual in actuals.items():
            if not finite(actual) or float(actual) <= 0:
                continue
            predicted = predictions.get(name)
            if not finite(predicted) or not 20 <= float(predicted) <= 250:
                failures.append(f"{person_id}: no valid {name} prediction")
                continue
            error = abs(float(predicted) - float(actual))
            comparisons.append({
                "person_id": person_id,
                "measurement": name,
                "actual_cm": float(actual),
                "predicted_cm": float(predicted),
                "absolute_error_cm": round(error, 4),
            })
            case_count += 1
            if error > MAX_SINGLE_ERROR_CM:
                failures.append(f"{person_id} {name}: {error:.2f} cm exceeds {MAX_SINGLE_ERROR_CM:.1f} cm")
        if case_count < 2:
            failures.append(f"{person_id}: fewer than two tape comparisons")
    return comparisons, seen_people


def main() -> None:
    args = parse_args()
    root = args.project_root.resolve()
    report_path = args.report.resolve()
    review_path = args.visual_review.resolve()
    output = (args.output or root / ".local-ml/reports/wear3d-v6r5-private-validation.json").resolve()
    failures: list[str] = []
    _, model_hash = validate_candidate(root, failures)
    report = read_object(report_path)
    review = read_object(review_path)
    comparisons, seen_people = validate_real_photos(report, review, report_path, model_hash, failures)
    missing_people = sorted(REQUIRED_PEOPLE - seen_people)
    if missing_people:
        failures.append(f"required people missing: {missing_people}")
    if len(comparisons) < MIN_TAPE_COMPARISONS:
        failures.append(f"only {len(comparisons)} tape comparisons; need {MIN_TAPE_COMPARISONS}")
    mean_error = (
        sum(item["absolute_error_cm"] for item in comparisons) / len(comparisons)
        if comparisons else None
    )
    if mean_error is not None and mean_error > MAX_MEAN_ERROR_CM:
        failures.append(f"mean error {mean_error:.2f} cm exceeds {MAX_MEAN_ERROR_CM:.1f} cm")
    result = {
        "schema_version": 1,
        "model_version": PIPELINE_ID,
        "validated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "private_test_lab_only": True,
        "released": False,
        "published": False,
        "deployed": False,
        "sdk_ready": False,
        "passed": not failures,
        "failures": failures,
        "people": sorted(seen_people),
        "comparison_count": len(comparisons),
        "mean_absolute_error_cm": round(mean_error, 4) if mean_error is not None else None,
        "max_absolute_error_cm": max((item["absolute_error_cm"] for item in comparisons), default=None),
        "limits": {
            "maximum_single_error_cm": MAX_SINGLE_ERROR_CM,
            "maximum_mean_error_cm": MAX_MEAN_ERROR_CM,
            "minimum_tape_comparisons": MIN_TAPE_COMPARISONS,
        },
        "comparisons": comparisons,
        "source_report": str(report_path),
        "visual_review": str(review_path),
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps({"output": str(output), **result}, indent=2))
    if failures:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
