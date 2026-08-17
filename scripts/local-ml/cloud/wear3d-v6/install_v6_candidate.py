#!/usr/bin/env python3
"""Download and atomically install a validated WEAR v6 candidate.

This installs either a synthetic-pass candidate or an explicitly hash-locked
synthetic-tie diagnostic for private Test Lab review only. It always keeps
sdkReady=false; publishing and SDK promotion are outside this run.
"""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import time

PIPELINE_ID = "wear3d-standing-rgb-v6r5-20260816"
BUCKET = "primestyleai-wear3d-921049726279-us-east-1"
PROFILE = "primestyle-wear"
REGION = "us-east-1"
REQUIRED = (
    "model.pt",
    "model.ts",
    "model.onnx",
    "runtime.json",
    "test-metrics.json",
    "training-history.json",
)
EXPECTED_SUBJECTS = {"train": 3_451, "validation": 427, "test": 448}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--project-root", type=Path, default=Path.cwd())
    parser.add_argument("--bucket", default=BUCKET)
    parser.add_argument("--profile", default=PROFILE)
    parser.add_argument("--region", default=REGION)
    return parser.parse_args()


def run_aws(args: argparse.Namespace, *arguments: str) -> None:
    environment = os.environ.copy()
    environment.update({
        "AWS_PROFILE": args.profile,
        "AWS_REGION": args.region,
        "AWS_DEFAULT_REGION": args.region,
        "AWS_PAGER": "",
    })
    subprocess.run(["aws", *arguments], check=True, env=environment)


def read_json(path: Path) -> dict:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise RuntimeError(f"Expected a JSON object in {path.name}")
    return value


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def validate_onnx_runtime(model_path: Path, project_root: Path) -> None:
    """Load the artifact with the exact Node runtime used by Test Lab."""
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


def validate(candidate: Path, project_root: Path) -> dict:
    missing = [name for name in REQUIRED if not (candidate / name).is_file() or (candidate / name).stat().st_size == 0]
    if missing:
        raise RuntimeError(f"Candidate is missing required artifacts: {missing}")
    runtime = read_json(candidate / "runtime.json")
    metrics = read_json(candidate / "test-metrics.json")
    if runtime.get("model_version") != PIPELINE_ID:
        raise RuntimeError("Candidate model version does not match WEAR v6")
    if runtime.get("schema_version") != 6:
        raise RuntimeError("Candidate does not use the Apple-teacher-anchor v6r5 runtime schema")
    synthetic_passed = (
        runtime.get("syntheticCandidatePassed") is True
        and metrics.get("synthetic_candidate_passed") is True
    )
    synthetic_tie_reviewed = False
    synthetic_review_hash = None
    if not synthetic_passed:
        if (
            runtime.get("syntheticCandidatePassed") is not False
            or metrics.get("synthetic_candidate_passed") is not False
        ):
            raise RuntimeError("Synthetic runtime and metrics results are inconsistent")
        review_path = candidate / "synthetic-gate-review.json"
        if not review_path.is_file():
            raise RuntimeError(f"Synthetic validation did not pass: {metrics.get('failures', [])}")
        review = read_json(review_path)
        expected_target = "row.underbust.y_shoulder_hip_ratio"
        if (
            review.get("schemaVersion") != 1
            or review.get("pipelineId") != PIPELINE_ID
            or review.get("officialSyntheticPass") is not False
            or review.get("acceptedForPrivateDiagnostic") is not True
            or review.get("privateTestLabOnly") is not True
            or review.get("releaseAuthorized") is not False
            or review.get("publishAuthorized") is not False
            or review.get("sdkReady") is not False
            or review.get("metricsSha256") != sha256(candidate / "test-metrics.json")
            or review.get("target") != expected_target
            or float(review.get("baselineGap", float("inf"))) > 0.001
            or float(review.get("mae", float("inf"))) > float(review.get("absoluteLimit", 0.0))
            or not all((review.get("hardChecks") or {}).values())
        ):
            raise RuntimeError("Synthetic-tie diagnostic review is missing, unsafe, or hash-mismatched")
        synthetic_tie_reviewed = True
        synthetic_review_hash = sha256(review_path)
    if runtime.get("sdkReady") is not False or metrics.get("sdk_ready") is not False:
        raise RuntimeError("A private Test Lab candidate may never claim SDK readiness")
    if runtime.get("runtime_mask_required") is not False:
        raise RuntimeError("Candidate unexpectedly requires a runtime mask")
    if runtime.get("circumference_method") != "direct-learned-WEAR-label":
        raise RuntimeError("Candidate does not use direct learned WEAR circumference targets")
    if runtime.get("depth_method") != "raw-WEAR-mesh-supervision":
        raise RuntimeError("Candidate does not use raw WEAR mesh depth supervision")
    if runtime.get("shape_method") != "32-point-normalized-closed-WEAR-cross-section-supervision":
        raise RuntimeError("Candidate does not use the 32-point raw WEAR cross-section targets")
    if runtime.get("pose_input_method") != "Apple-Vision-shoulder-and-hip-joints-on-training-teachers-and-runtime-no-mask":
        raise RuntimeError("Candidate did not use Apple Vision anchors on both WEAR teachers and runtime photos")
    if runtime.get("apple_anchor_training_coverage") != 4_326:
        raise RuntimeError("Candidate does not contain all 4,326 Apple-on-WEAR training anchors")
    if runtime.get("core_pose_method") != "separate-Apple-on-WEAR-front-pose-projection":
        raise RuntimeError("Candidate mixes front Apple anchors with angled-view WEAR pose features")
    if runtime.get("core_edge_method") != "independent-front-only-row-heads-with-learned-WEAR-rows-in-true-Apple-anchor-frame":
        raise RuntimeError("Candidate does not use front-only WEAR row heads in the true Apple anchor frame")
    if runtime.get("core_measurement_method") != "independent-mask-free-RGB-profile-pose-plus-own-row-width-heads-front-50-only":
        raise RuntimeError("Candidate does not combine mask-free RGB body shape with isolated per-row width inputs")
    geometry_priors = runtime.get("row_geometry_priors") or {}
    global_priors = ((geometry_priors.get("buckets") or {}).get("global") or {})
    if set(global_priors) != {"neck", "chest", "underbust", "waist", "hips"}:
        raise RuntimeError("Candidate is missing the audited WEAR row-geometry guard")
    required_geometry = {
        "y_shoulder_hip_ratio",
        "span_shoulder_ratio",
        "center_anchor_offset_ratio",
    }
    if any(set((global_priors.get(row_name) or {})) != required_geometry for row_name in global_priors):
        raise RuntimeError("Candidate has incomplete WEAR shoulder/hip-relative row priors")
    subjects = {
        role: int((runtime.get("subjects") or {}).get(role, 0))
        for role in ("train", "validation", "test")
    }
    metric_subjects = {
        role: int((metrics.get("subjects") or {}).get(role, 0))
        for role in ("train", "validation", "test")
    }
    if subjects != EXPECTED_SUBJECTS or metric_subjects != EXPECTED_SUBJECTS:
        raise RuntimeError(
            "Candidate does not contain the exact audited subject split: "
            f"runtime={subjects} metrics={metric_subjects} expected={EXPECTED_SUBJECTS}"
        )
    validate_onnx_runtime(candidate / "model.onnx", project_root)
    external_files = [path.name for path in candidate.iterdir() if path.name.startswith("model.onnx.")]
    if external_files:
        raise RuntimeError(f"Test Lab candidate unexpectedly depends on external ONNX data: {external_files}")
    return {
        "pipelineId": PIPELINE_ID,
        "syntheticCandidatePassed": synthetic_passed,
        "syntheticTieReviewedForPrivateDiagnostic": synthetic_tie_reviewed,
        "syntheticGateReviewSha256": synthetic_review_hash,
        "releaseAuthorized": False,
        "publishAuthorized": False,
        "deployAuthorized": False,
        "sdkReady": False,
        "subjects": subjects,
        "artifacts": {
            name: {"bytes": (candidate / name).stat().st_size, "sha256": sha256(candidate / name)}
            for name in REQUIRED
        },
        "installedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "importantLimit": "Installed for private Test Lab review only; it may not be released or published.",
    }


def main() -> None:
    args = parse_args()
    project_root = args.project_root.resolve()
    checkpoints = project_root / ".local-ml" / "checkpoints"
    checkpoints.mkdir(parents=True, exist_ok=True)
    target = checkpoints / PIPELINE_ID
    # Keep this cache across connection failures. A rerun then skips every
    # complete artifact instead of throwing away hundreds of downloaded MB.
    downloaded = checkpoints / f".{PIPELINE_ID}-download"
    downloaded.mkdir(parents=True, exist_ok=True)
    for attempt in range(1, 6):
        try:
            run_aws(
                args,
                "s3",
                "sync",
                f"s3://{args.bucket}/models/{PIPELINE_ID}/",
                str(downloaded),
                "--only-show-errors",
            )
            break
        except subprocess.CalledProcessError:
            if attempt == 5:
                raise
            print(f"S3 transfer interrupted; preserving completed files and retrying ({attempt}/5).")
            time.sleep(min(2**attempt, 10))
    install_manifest = validate(downloaded, project_root)
    (downloaded / "candidate-install-manifest.json").write_text(
        json.dumps(install_manifest, indent=2) + "\n",
        encoding="utf-8",
    )
    staging = checkpoints / f".{PIPELINE_ID}-ready"
    if staging.exists():
        shutil.rmtree(staging)
    shutil.copytree(downloaded, staging)
    if target.exists():
        timestamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
        backup = checkpoints / f".{PIPELINE_ID}-backup-{timestamp}"
        target.rename(backup)
    staging.rename(target)
    shutil.rmtree(downloaded)
    print(json.dumps({"installed": str(target), **install_manifest}, indent=2))


if __name__ == "__main__":
    main()
