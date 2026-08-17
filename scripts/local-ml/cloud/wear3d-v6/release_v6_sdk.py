#!/usr/bin/env python3
"""Promote a WEAR v6 Test Lab candidate to an SDK-ready bundle.

The promotion is intentionally separate from cloud training. It accepts only a
real-photo report created after inference, checks that saved tape answers were
never model inputs, verifies the three named people and their visible body
edges, enforces real-photo error limits, then creates an immutable SDK bundle.
"""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
import math
from pathlib import Path
import shutil
import subprocess
import tempfile


PIPELINE_ID = "wear3d-standing-rgb-v6r2-20260816"
REQUIRED_PEOPLE = {"shane-2", "shahnaz-2", "negar-2"}
REQUIRED_EDGES = {"neck", "chest", "waist", "hips"}
FEMALE_EDGES = REQUIRED_EDGES | {"underbust"}
MAX_SINGLE_ERROR_CM = 5.0
MAX_MEAN_ERROR_CM = 4.0
MIN_TAPE_COMPARISONS = 8
REQUIRED_CANDIDATE_FILES = (
    "model.onnx",
    "model.ts",
    "runtime.json",
    "test-metrics.json",
    "candidate-install-manifest.json",
)
EXPECTED_SUBJECTS = {"train": 3_451, "validation": 427, "test": 448}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--project-root", type=Path, default=Path.cwd())
    parser.add_argument("--report", type=Path, required=True)
    parser.add_argument("--output", type=Path)
    return parser.parse_args()


def read_object(path: Path) -> dict:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise RuntimeError(f"Expected a JSON object in {path}")
    return value


def write_object(path: Path, value: dict) -> None:
    path.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def finite_number(value: object) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(float(value))


def validate_onnx_runtime(model_path: Path, project_root: Path) -> None:
    script = """
const ort = require('onnxruntime-node');
ort.InferenceSession.create(process.argv[1], {
  executionProviders: ['cpu'],
  graphOptimizationLevel: 'all',
}).then((session) => {
  const inputs = [...session.inputNames].sort();
  const outputs = [...session.outputNames].sort();
  const expectedInputs = ['pose', 'pose_mask', 'profile', 'rgb', 'row_width_mask', 'row_widths'];
  const expectedOutputs = ['edges', 'measurements'];
  if (JSON.stringify(inputs) !== JSON.stringify(expectedInputs)
      || JSON.stringify(outputs) !== JSON.stringify(expectedOutputs)) {
    throw new Error(`unexpected ONNX contract inputs=${inputs} outputs=${outputs}`);
  }
}).catch((error) => { console.error(error); process.exitCode = 1; });
"""
    subprocess.run(
        ["node", "-e", script, str(model_path)],
        cwd=project_root,
        check=True,
        capture_output=True,
        text=True,
        timeout=90,
    )


def validate_candidate(candidate: Path, project_root: Path) -> tuple[dict, dict, dict]:
    missing = [name for name in REQUIRED_CANDIDATE_FILES if not (candidate / name).is_file()]
    if missing:
        raise RuntimeError(f"Installed v6 candidate is incomplete: {missing}")
    runtime = read_object(candidate / "runtime.json")
    metrics = read_object(candidate / "test-metrics.json")
    install = read_object(candidate / "candidate-install-manifest.json")
    if runtime.get("model_version") != PIPELINE_ID or install.get("pipelineId") != PIPELINE_ID:
        raise RuntimeError("Installed candidate is not the expected WEAR v6 model")
    if runtime.get("syntheticCandidatePassed") is not True or metrics.get("synthetic_candidate_passed") is not True:
        raise RuntimeError("Synthetic held-out WEAR validation did not pass")
    if runtime.get("sdkReady") is not False or metrics.get("sdk_ready") is not False:
        raise RuntimeError("Candidate is already marked SDK-ready; refusing an ambiguous promotion")
    if runtime.get("runtime_mask_required") is not False:
        raise RuntimeError("SDK promotion requires mask-free runtime inference")
    if runtime.get("schema_version") != 3:
        raise RuntimeError("SDK promotion requires the pose-aware v6r2 runtime schema")
    if runtime.get("circumference_method") != "direct-learned-WEAR-label":
        raise RuntimeError("SDK promotion requires direct learned WEAR circumference outputs")
    if runtime.get("depth_method") != "raw-WEAR-mesh-supervision":
        raise RuntimeError("SDK promotion requires raw WEAR mesh depth supervision")
    if runtime.get("shape_method") != "32-point-normalized-closed-WEAR-cross-section-supervision":
        raise RuntimeError("SDK promotion requires the 32-point raw WEAR cross-section targets")
    if runtime.get("pose_input_method") != "Apple-Vision-shoulder-and-hip-joints-no-runtime-mask":
        raise RuntimeError("SDK promotion requires Apple shoulder/hip anchor inputs")
    if runtime.get("core_edge_method") != "independent-row-heads-with-WEAR-pose-span-guard":
        raise RuntimeError("SDK promotion requires independent core edge heads")
    if runtime.get("core_measurement_method") != "independent-profile-plus-own-row-width-heads-front-50-only":
        raise RuntimeError("SDK promotion requires independent per-row measurement heads")
    runtime_subjects = {
        role: int((runtime.get("subjects") or {}).get(role, 0))
        for role in ("train", "validation", "test")
    }
    metric_subjects = {
        role: int((metrics.get("subjects") or {}).get(role, 0))
        for role in ("train", "validation", "test")
    }
    if runtime_subjects != EXPECTED_SUBJECTS or metric_subjects != EXPECTED_SUBJECTS:
        raise RuntimeError(
            "SDK promotion requires the exact audited subject split: "
            f"runtime={runtime_subjects} metrics={metric_subjects} expected={EXPECTED_SUBJECTS}"
        )
    model_hash = sha256(candidate / "model.onnx")
    installed_hash = (((install.get("artifacts") or {}).get("model.onnx") or {}).get("sha256"))
    if installed_hash != model_hash:
        raise RuntimeError("Installed ONNX hash differs from the validated candidate hash")
    validate_onnx_runtime(candidate / "model.onnx", project_root)
    return runtime, metrics, install


def validate_report(report: dict, model_hash: str, report_path: Path) -> dict:
    if report.get("schema_version") != 1 or report.get("model_version") != PIPELINE_ID:
        raise RuntimeError("Real-photo report schema or model version is incompatible")
    if report.get("model_onnx_sha256") != model_hash:
        raise RuntimeError("Real-photo report was produced by a different ONNX artifact")
    if report.get("saved_answers_sent_to_model") is not False:
        raise RuntimeError("Saved tape answers must never be sent to the model")
    if report.get("runtime_mask_used") is not False:
        raise RuntimeError("The release suite must use the mask-free WEAR RGB path")
    if report.get("formula_used") is not False:
        raise RuntimeError("The release suite must use direct learned circumference outputs")
    if report.get("visual_review_complete") is not True:
        raise RuntimeError("The generated real-photo contact sheet has not been visually reviewed")
    contact_sheet = report.get("contact_sheet")
    if not isinstance(contact_sheet, dict):
        raise RuntimeError("Real-photo report is missing its visual contact-sheet evidence")
    raw_contact_path = Path(str(contact_sheet.get("path") or ""))
    contact_path = raw_contact_path if raw_contact_path.is_absolute() else report_path.parent / raw_contact_path
    if not contact_path.is_file() or sha256(contact_path) != contact_sheet.get("sha256"):
        raise RuntimeError("Real-photo contact sheet is missing or its hash changed after review")
    cases = report.get("cases")
    if not isinstance(cases, list) or not cases:
        raise RuntimeError("Real-photo report contains no cases")

    seen_people: set[str] = set()
    errors: list[dict] = []
    for case in cases:
        if not isinstance(case, dict):
            raise RuntimeError("Each real-photo case must be an object")
        person_id = str(case.get("person_id") or "").strip().lower()
        if not person_id:
            raise RuntimeError("A real-photo case is missing person_id")
        seen_people.add(person_id)
        if case.get("full_body_visible") is not True:
            raise RuntimeError(f"{person_id}: full head-to-feet photo visibility did not pass")
        if case.get("camera_geometry") not in {"pass", "check"}:
            raise RuntimeError(f"{person_id}: Apple camera geometry was rejected or missing")
        if case.get("saved_answers_sent_to_model") is not False:
            raise RuntimeError(f"{person_id}: report does not prove answer-free inference")
        if case.get("manual_answer_used") is not False:
            raise RuntimeError(f"{person_id}: a saved answer was used to alter a prediction")
        image_hash = str(case.get("image_sha256") or "")
        if len(image_hash) != 64 or any(character not in "0123456789abcdef" for character in image_hash):
            raise RuntimeError(f"{person_id}: source-image hash evidence is missing")
        evidence = case.get("evidence")
        if not isinstance(evidence, dict) or evidence.get("person_box_source") != "Apple Vision joints; no silhouette mask":
            raise RuntimeError(f"{person_id}: answer-free crop evidence is missing")
        if evidence.get("pose_anchor_source") != "Apple Vision shoulder/hip joints; no silhouette mask":
            raise RuntimeError(f"{person_id}: answer-free Apple shoulder/hip anchor evidence is missing")
        anchors = evidence.get("pose_anchors")
        if not isinstance(anchors, dict) or set(anchors) != {"leftShoulder", "rightShoulder", "leftHip", "rightHip"}:
            raise RuntimeError(f"{person_id}: the complete pose-aware runtime input is not proven")
        evidence_rows = evidence.get("rows")
        if not isinstance(evidence_rows, list):
            raise RuntimeError(f"{person_id}: predicted WEAR row evidence is missing")
        predicted_edge_names = {
            str(row.get("kind"))
            for row in evidence_rows
            if isinstance(row, dict) and row.get("edgeSource") == "wear-v6r2-pose-aware"
        }
        edge_review = case.get("edge_review")
        if not isinstance(edge_review, dict):
            raise RuntimeError(f"{person_id}: edge review is missing")
        required_edges = FEMALE_EDGES if case.get("gender") == "female" else REQUIRED_EDGES
        missing_predicted_edges = sorted(required_edges - predicted_edge_names)
        if missing_predicted_edges:
            raise RuntimeError(f"{person_id}: WEAR RGB did not predict required edges {missing_predicted_edges}")
        failed_edges = sorted(name for name in required_edges if edge_review.get(name) is not True)
        if failed_edges:
            raise RuntimeError(f"{person_id}: visible WEAR edge review failed for {failed_edges}")

        actuals = case.get("known_tape_cm")
        predictions = case.get("predicted_cm")
        if not isinstance(actuals, dict) or not isinstance(predictions, dict):
            raise RuntimeError(f"{person_id}: tape comparisons are missing")
        case_comparisons = 0
        for name, actual in actuals.items():
            if not finite_number(actual) or float(actual) <= 0:
                continue
            predicted = predictions.get(name)
            if not finite_number(predicted) or not 20 <= float(predicted) <= 250:
                raise RuntimeError(f"{person_id}: no valid prediction for known {name} tape")
            absolute_error = abs(float(predicted) - float(actual))
            errors.append({
                "person_id": person_id,
                "measurement": name,
                "actual_cm": float(actual),
                "predicted_cm": float(predicted),
                "absolute_error_cm": absolute_error,
            })
            case_comparisons += 1
            if absolute_error > MAX_SINGLE_ERROR_CM:
                raise RuntimeError(
                    f"{person_id} {name}: {absolute_error:.2f} cm error exceeds {MAX_SINGLE_ERROR_CM:.1f} cm"
                )
        if case_comparisons < 2:
            raise RuntimeError(f"{person_id}: fewer than two independent tape comparisons")

    missing_people = sorted(REQUIRED_PEOPLE - seen_people)
    if missing_people:
        raise RuntimeError(f"Real-photo report is missing required people: {missing_people}")
    if len(errors) < MIN_TAPE_COMPARISONS:
        raise RuntimeError(
            f"Real-photo report has {len(errors)} tape comparisons; need at least {MIN_TAPE_COMPARISONS}"
        )
    mean_error = sum(item["absolute_error_cm"] for item in errors) / len(errors)
    if mean_error > MAX_MEAN_ERROR_CM:
        raise RuntimeError(
            f"Real-photo mean absolute error {mean_error:.2f} cm exceeds {MAX_MEAN_ERROR_CM:.1f} cm"
        )
    return {
        "passed": True,
        "people": sorted(seen_people),
        "comparisonCount": len(errors),
        "meanAbsoluteErrorCm": round(mean_error, 4),
        "maxAbsoluteErrorCm": round(max(item["absolute_error_cm"] for item in errors), 4),
        "limits": {
            "maximumSingleErrorCm": MAX_SINGLE_ERROR_CM,
            "maximumMeanErrorCm": MAX_MEAN_ERROR_CM,
            "minimumTapeComparisons": MIN_TAPE_COMPARISONS,
        },
        "comparisons": errors,
    }


def main() -> None:
    args = parse_args()
    project_root = args.project_root.resolve()
    candidate = project_root / ".local-ml" / "checkpoints" / PIPELINE_ID
    output = (args.output or (project_root / ".local-ml" / "sdk" / PIPELINE_ID)).resolve()
    runtime, metrics, install = validate_candidate(candidate, project_root)
    model_hash = sha256(candidate / "model.onnx")
    report = read_object(args.report.resolve())
    acceptance = validate_report(report, model_hash, args.report.resolve())
    released_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

    release_runtime = {**runtime, "sdkReady": True, "realPhotoValidatedAt": released_at}
    release_metrics = {
        **metrics,
        "sdk_ready": True,
        "real_photo_candidate_passed": True,
        "real_photo_acceptance": acceptance,
        "important_limit": "Validated on the recorded real-photo suite; monitor broader production drift.",
    }
    release_manifest = {
        "schemaVersion": 1,
        "pipelineId": PIPELINE_ID,
        "releasedAt": released_at,
        "sdkReady": True,
        "syntheticCandidatePassed": True,
        "realPhotoCandidatePassed": True,
        "realPhotoAcceptance": acceptance,
        "sourceCandidateInstall": install,
        "artifacts": {},
    }

    output.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="wear-v6-sdk-", dir=output.parent) as temporary:
        staging = Path(temporary) / PIPELINE_ID
        staging.mkdir()
        shutil.copy2(candidate / "model.onnx", staging / "model.onnx")
        shutil.copy2(candidate / "model.ts", staging / "model.ts")
        write_object(staging / "runtime.json", release_runtime)
        write_object(staging / "test-metrics.json", release_metrics)
        write_object(staging / "real-photo-acceptance.json", report)
        for path in staging.iterdir():
            if path.is_file():
                release_manifest["artifacts"][path.name] = {
                    "bytes": path.stat().st_size,
                    "sha256": sha256(path),
                }
        write_object(staging / "sdk-release-manifest.json", release_manifest)
        if output.exists():
            raise RuntimeError(f"SDK release already exists; refusing to overwrite {output}")
        staging.rename(output)

    print(json.dumps({"released": str(output), **release_manifest}, indent=2))


if __name__ == "__main__":
    main()
