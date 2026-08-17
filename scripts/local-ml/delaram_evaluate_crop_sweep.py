#!/usr/bin/env python3
"""Build and run the honest diagnostic manifest for the Meta crop sweep."""

from __future__ import annotations

import importlib.util
import json
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
SWEEP_DIR = REPO_ROOT / ".local-ml/wear-mesh-proof/delaram-specialist/crop-sweep"
MASK_DIR = REPO_ROOT / ".local-ml/wear-mesh-overlay/photo-masks"
EVALUATOR = REPO_ROOT / "scripts/local-ml/honest_mesh_validation.py"


def load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def main() -> None:
    run_report = json.loads((SWEEP_DIR / "run-report.json").read_text())
    references = []
    for photo_id in ("delaram", "delaram-2"):
        references.append(
            {
                "photoId": photo_id,
                "maskPath": str(MASK_DIR / f"{photo_id}.png"),
                "evidenceId": f"birefnet-mask:{photo_id}",
                "provenance": {
                    "heldOut": False,
                    "createdWithoutCandidate": False,
                    "hairExcluded": False,
                    "backgroundExcluded": True,
                    "visibleTightClothingTruth": True,
                    "annotationMethod": "BiRefNet diagnostic outline also used to derive crop",
                },
            }
        )
    methods = []
    for margin in run_report["margins"]:
        variant = f"m{margin:.3f}".replace(".", "p")
        candidates = []
        for record in run_report["candidateRecords"]:
            if record["methodId"] != f"delaram-meta-crop-{variant}":
                continue
            record = dict(record)
            reference_id = f"birefnet-mask:{record['photoId']}"
            reference_hash = record["fitEvidenceSha256"][1]
            record["fitEvidenceIds"] = [*record["fitEvidenceIds"], reference_id]
            record["fitEvidenceSha256"] = [*record["fitEvidenceSha256"], reference_hash]
            candidates.append(record)
        methods.append(
            {
                "id": f"delaram-meta-crop-{variant}",
                "label": f"Official Meta crop margin {margin:.3f}",
                "provenance": {"device": "cpu", "purpose": "mask-derived crop diagnostic"},
                "candidates": candidates,
            }
        )
    manifest = {
        "schemaVersion": 1,
        "suiteId": "delaram-official-meta-crop-sweep-20260817",
        "references": references,
        "methods": methods,
    }
    manifest_path = SWEEP_DIR / "evaluation-manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2))
    evaluator = load_module("delaram_honest_evaluator", EVALUATOR)
    report = evaluator.build_report(evaluator.read_json(manifest_path), manifest_path)
    (SWEEP_DIR / "evaluation-report.json").write_text(json.dumps(report, indent=2) + "\n")
    print(
        json.dumps(
            [
                {
                    "id": method["id"],
                    "status": method["status"],
                    "photos": [
                        {
                            "photoId": photo["photoId"],
                            "iou": photo["metrics"]["silhouetteIou"],
                            "flips": photo["topology"]["flippedTriangleCount"],
                        }
                        for photo in method["photos"]
                    ],
                }
                for method in report["methods"]
            ],
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
