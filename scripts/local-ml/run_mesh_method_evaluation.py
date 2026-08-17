#!/usr/bin/env python3
"""Build an honest, CPU-safe method-run manifest for 2D MHR validation.

This is an execution and provenance runner, not the quality judge.  Successful
execution produces ``Candidate`` records.  Only ``honest_mesh_validation.py``
may promote or reject them after held-out outline evaluation.  Unavailable
methods remain explicit ``Blocked`` records and the legacy RBF method remains
``Rejected``.
"""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import subprocess
import time

import numpy as np

from mesh_method_registry import MethodSpec, build_registry


REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_OUTPUT = REPO_ROOT / ".local-ml/wear-mesh-proof/method-run-report.json"
PROOF_DIR = REPO_ROOT / ".local-ml/wear-mesh-proof"
VALIDATION_MANIFEST = PROOF_DIR / "evaluation-manifest.json"
PYTHON = REPO_ROOT / ".local-ml/venvs/sam-3d-body/bin/python"
RAW_SCRIPT = REPO_ROOT / "scripts/local-ml/build_rgb_mhr_topology.py"
SAPIENS_SCRIPT = REPO_ROOT / "scripts/local-ml/run_sapiens2_anatomy.py"
PROMPTED_SCRIPT = REPO_ROOT / "scripts/local-ml/run_prompted_mhr_topology.py"
RAW_SOURCE_DIR = REPO_ROOT / ".local-ml/wear-mesh-overlay/anatomical"
PHOTO_INDEX = REPO_ROOT / ".local-ml/wear-mesh-overlay/photo-models/index.json"
PHOTOS = {
    "delaram": {
        "path": REPO_ROOT / "public/try-on-test/sizing-lab/delaram-front.jpg",
        "heightCm": 168.0,
        "weightKg": 70.8,
    },
    "delaram-2": {
        "path": REPO_ROOT / "public/try-on-test/sizing-lab/delaram-2-front.jpg",
        "heightCm": 168.0,
        "weightKg": 70.8,
    },
}
EXECUTABLE_METHODS = {"raw-meta-vith", "prompted-meta-vith"}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _relative_or_absolute(path: Path) -> str:
    try:
        return str(path.resolve().relative_to(REPO_ROOT))
    except ValueError:
        return str(path.resolve())


def _parse_json_stdout(output: str) -> dict:
    stripped = output.strip()
    start = stripped.rfind("\n{")
    json_text = stripped[start + 1 :] if start >= 0 else stripped
    return json.loads(json_text)


def run_command(command: list[str]) -> tuple[dict, float]:
    environment = os.environ.copy()
    environment["PRIMESTYLE_SAM3D_DEVICE"] = "cpu"
    started = time.monotonic()
    completed = subprocess.run(
        command,
        cwd=REPO_ROOT,
        env=environment,
        check=False,
        capture_output=True,
        text=True,
    )
    elapsed = time.monotonic() - started
    if completed.returncode != 0:
        message = completed.stderr.strip() or completed.stdout.strip()
        raise RuntimeError(
            f"Command failed ({completed.returncode}): {' '.join(command)}\n{message[-4000:]}"
        )
    return _parse_json_stdout(completed.stdout), elapsed


def _load_crop(photo_id: str) -> list[float]:
    payload = json.loads(PHOTO_INDEX.read_text())
    for record in payload.get("models", []):
        if record.get("id") == photo_id:
            box = record.get("personBoxPx")
            if isinstance(box, list) and len(box) == 4:
                return [round(float(item), 4) for item in box]
    raise RuntimeError(f"No person crop exists for {photo_id}.")


def _normalize_raw_candidate(photo_id: str) -> dict:
    source_path = RAW_SOURCE_DIR / f"{photo_id}-mhr-rgb.json"
    if not source_path.is_file():
        raise FileNotFoundError(f"Raw Meta output was not created: {source_path}")
    source = json.loads(source_path.read_text())
    image_width, image_height = [int(item) for item in source["imageSize"]]
    vertices = np.asarray(source["vertices"], dtype=np.float64).reshape(-1, 2)
    triangles = np.asarray(source["triangles"], dtype=np.int64).reshape(-1, 3)
    if source.get("maskUsed") is not False:
        raise RuntimeError("Raw Meta baseline unexpectedly used a mask.")
    if source.get("vertexCount") != len(vertices):
        raise RuntimeError("Raw Meta vertex count is inconsistent.")
    photo_path = Path(PHOTOS[photo_id]["path"])
    fit_ids = [f"rgb:{photo_id}", f"person-crop:{photo_id}"]
    fit_hashes = [sha256(photo_path), sha256(PHOTO_INDEX)]
    output_path = PROOF_DIR / "methods/raw-meta-vith" / f"{photo_id}.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "schemaVersion": 1,
        "id": f"raw-meta-vith--{photo_id}",
        "methodId": "raw-meta-vith",
        "label": f"Current raw Meta ViT-H baseline · {photo_id}",
        "photoId": photo_id,
        "imageWidth": image_width,
        "imageHeight": image_height,
        "coordinateSpace": "normalized-image-xy",
        "vertexCount": int(len(vertices)),
        "triangleCount": int(len(triangles)),
        "vertices": np.round(vertices, 7).reshape(-1).tolist(),
        "triangles": triangles.reshape(-1).tolist(),
        "keypointsMhr70Px": source.get("mhr70", []),
        "fixedTopology": "Meta MHR 18,439 vertex IDs",
        "device": "cpu",
        "officialPromptPath": False,
        "maskPrompt": {"used": False},
        "keypointPrompt": {"usedClicks": 0},
        "postprocesses": [],
        "rbfUsed": False,
        "depthUsed": False,
        "measurementsUsed": False,
        "fitEvidenceIds": fit_ids,
        "fitEvidenceSha256": fit_hashes,
        "sourcePhotoPath": str(photo_path),
        "personBoxXYXY": source.get("personBoxXYXY", _load_crop(photo_id)),
    }
    output_path.write_text(json.dumps(payload, separators=(",", ":")))
    return {
        "id": payload["id"],
        "methodId": payload["methodId"],
        "label": payload["label"],
        "photoId": photo_id,
        "status": "Candidate",
        "meshPath": str(output_path.resolve()),
        "fitEvidenceIds": fit_ids,
        "fitEvidenceSha256": fit_hashes,
        "isTopologyBaseline": True,
        "topologyBaselinePath": str(output_path.resolve()),
        "exactInputs": {
            "rgbPath": str(photo_path),
            "rgbSha256": fit_hashes[0],
            "personCropXYXY": payload["personBoxXYXY"],
            "personCropIndexSha256": fit_hashes[1],
            "mask": None,
            "keypointPrompts": [],
            "heightCmNotUsedForTopology": PHOTOS[photo_id]["heightCm"],
            "weightKgNotUsed": PHOTOS[photo_id]["weightKg"],
            "device": "cpu",
        },
        "artifacts": [_relative_or_absolute(output_path), _relative_or_absolute(source_path)],
        "reasons": ["Executed successfully; quality has not yet been judged."],
    }


def execute_raw(photo_id: str) -> tuple[dict, float]:
    _, elapsed = run_command([str(PYTHON), str(RAW_SCRIPT), "--photo", photo_id])
    return _normalize_raw_candidate(photo_id), elapsed


def _sapiens_is_fresh(photo_id: str) -> bool:
    evidence = RAW_SOURCE_DIR / f"{photo_id}-sapiens2.json"
    photo = Path(PHOTOS[photo_id]["path"])
    return evidence.is_file() and evidence.stat().st_mtime_ns >= photo.stat().st_mtime_ns


def execute_prompted(photo_id: str, refresh_evidence: bool) -> tuple[dict, float]:
    total_elapsed = 0.0
    if refresh_evidence or not _sapiens_is_fresh(photo_id):
        _, elapsed = run_command([str(PYTHON), str(SAPIENS_SCRIPT), "--photo", photo_id])
        total_elapsed += elapsed
    result, elapsed = run_command(
        [str(PYTHON), str(PROMPTED_SCRIPT), "--photo", photo_id]
    )
    total_elapsed += elapsed
    mesh_path = Path(result["meshPath"])
    payload = json.loads(mesh_path.read_text())
    candidate = {
        "id": payload["id"],
        "methodId": payload["methodId"],
        "label": payload["label"],
        "photoId": photo_id,
        "status": "Candidate",
        "meshPath": str(mesh_path.resolve()),
        "keypointsPath": str(Path(payload["sapiensEvidencePath"]).resolve()),
        "fitEvidenceIds": payload["fitEvidenceIds"],
        "fitEvidenceSha256": payload["fitEvidenceSha256"],
        "isTopologyBaseline": False,
        "topologyBaselinePath": str(
            (PROOF_DIR / "methods/raw-meta-vith" / f"{photo_id}.json").resolve()
        ),
        "exactInputs": {
            "rgbPath": payload["sourcePhotoPath"],
            "rgbSha256": payload["fitEvidenceSha256"][0],
            "personCropXYXY": payload["personBoxXYXY"],
            "internalMask": payload["maskPrompt"],
            "sapiensEvidencePath": payload["sapiensEvidencePath"],
            "keypointPrompt": payload["keypointPrompt"],
            "depth": None,
            "measurements": None,
            "device": "cpu",
            "postprocesses": [],
        },
        "artifacts": [_relative_or_absolute(mesh_path)],
        "reasons": [
            "Executed through the installed official mask and keypoint prompt paths.",
            "Quality has not yet been judged.",
        ],
    }
    return candidate, total_elapsed


def _method_record(spec: MethodSpec) -> dict:
    registry = spec.to_dict()
    if spec.status == "rejected":
        status = "Rejected"
        execution_status = "excluded"
    elif spec.status == "blocked":
        status = "Blocked"
        execution_status = "blocked"
    else:
        status = "Ready"
        execution_status = "ready-not-run"
    return {
        **registry,
        "status": status,
        "registryStatus": registry["status"],
        "executionStatus": execution_status,
        "candidates": [],
        "runtimeSeconds": 0.0,
        "reasons": list(spec.blocker_reasons),
    }


def build_report(
    method_ids: list[str],
    photo_ids: list[str],
    execute: bool,
    refresh_evidence: bool,
) -> dict:
    registry = build_registry(REPO_ROOT, PYTHON)
    by_id = {method.id: method for method in registry}
    unknown = sorted(set(method_ids) - set(by_id))
    if unknown:
        raise ValueError(f"Unknown methods: {', '.join(unknown)}")
    candidates: list[dict] = []
    methods = []
    for method_id in method_ids:
        spec = by_id[method_id]
        record = _method_record(spec)
        if execute and method_id in EXECUTABLE_METHODS and spec.executable:
            try:
                for photo_id in photo_ids:
                    if method_id == "raw-meta-vith":
                        candidate, elapsed = execute_raw(photo_id)
                    else:
                        # The topology baseline must exist for the validator.
                        baseline = PROOF_DIR / "methods/raw-meta-vith" / f"{photo_id}.json"
                        if not baseline.is_file():
                            baseline_candidate, baseline_elapsed = execute_raw(photo_id)
                            candidates.append(baseline_candidate)
                            elapsed_prefix = baseline_elapsed
                        else:
                            elapsed_prefix = 0.0
                        candidate, elapsed = execute_prompted(photo_id, refresh_evidence)
                        elapsed += elapsed_prefix
                    record["candidates"].append(candidate)
                    candidates.append(candidate)
                    record["runtimeSeconds"] += elapsed
                record["runtimeSeconds"] = round(record["runtimeSeconds"], 3)
                record["executionStatus"] = "completed"
                record["status"] = "Candidate"
                record["reasons"] = [
                    "Execution completed. Honest held-out validation is still required."
                ]
            except Exception as error:  # keep the audit report even on a model failure
                record["status"] = "Blocked"
                record["executionStatus"] = "failed"
                record["reasons"] = [str(error)]
        elif execute and method_id in EXECUTABLE_METHODS and not spec.executable:
            record["status"] = "Blocked"
        elif execute and method_id not in EXECUTABLE_METHODS and spec.status == "ready":
            record["status"] = "Blocked"
            record["executionStatus"] = "no-safe-executor"
            record["reasons"] = [
                "Dependencies appear present, but this CPU-safe runner has no verified executor."
            ]
        methods.append(record)

    report = {
        "schemaVersion": 1,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "purpose": "Private CPU-only 2D fixed-topology MHR method proof",
        "releaseStatus": "blocked",
        "safety": {
            "gpuUsed": False,
            "awsUsed": False,
            "downloadsPerformed": False,
            "published": False,
            "devicePolicy": "CPU only; global GPU stop remains active",
            "rbfCandidateAllowed": False,
        },
        "photos": [
            {
                "id": photo_id,
                "path": str(Path(PHOTOS[photo_id]["path"]).resolve()),
                "sha256": sha256(Path(PHOTOS[photo_id]["path"])),
                "heightCm": PHOTOS[photo_id]["heightCm"],
                "weightKg": PHOTOS[photo_id]["weightKg"],
            }
            for photo_id in photo_ids
        ],
        "methods": methods,
        "candidates": candidates,
        "validation": {
            "judge": "scripts/local-ml/honest_mesh_validation.py",
            "output": ".local-ml/wear-mesh-proof/evaluation-report.json",
            "command": (
                f"{PYTHON} scripts/local-ml/honest_mesh_validation.py "
                f"--manifest {VALIDATION_MANIFEST} "
                "--output .local-ml/wear-mesh-proof/evaluation-report.json"
            ),
            "runnerMayDeclarePassed": False,
        },
    }
    return report


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--method",
        action="append",
        dest="methods",
        help="Method id; repeat for more than one. Defaults to every registered method.",
    )
    parser.add_argument(
        "--photo",
        choices=("delaram", "delaram-2", "both"),
        default="both",
    )
    parser.add_argument(
        "--execute",
        action="store_true",
        help="Run only locally available CPU methods. Without this flag, audit dependencies only.",
    )
    parser.add_argument(
        "--refresh-evidence",
        action="store_true",
        help="Re-run Sapiens2 on CPU even when its local evidence is newer than the photo.",
    )
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()

    all_methods = [method.id for method in build_registry(REPO_ROOT, PYTHON)]
    method_ids = args.methods or all_methods
    photo_ids = ["delaram", "delaram-2"] if args.photo == "both" else [args.photo]
    report = build_report(method_ids, photo_ids, args.execute, args.refresh_evidence)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2) + "\n")
    print(
        json.dumps(
            {
                "output": str(args.output),
                "executed": args.execute,
                "methods": [
                    {
                        "id": record["id"],
                        "status": record["status"],
                        "executionStatus": record["executionStatus"],
                        "candidates": len(record["candidates"]),
                        "runtimeSeconds": record["runtimeSeconds"],
                    }
                    for record in report["methods"]
                ],
                "candidateCount": len(report["candidates"]),
                "gpuUsed": False,
            },
            indent=2,
        ),
        flush=True,
    )


if __name__ == "__main__":
    main()
