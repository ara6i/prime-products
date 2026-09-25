#!/usr/bin/env python3
"""Build one reviewable visual/numeric evidence record for every waist/hip teacher."""

from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path


ROWS = ("waist", "hips")
EXPECTED_TARGETS = 7_756


def json_lines(path: Path):
    with path.open(encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, 1):
            if line.strip():
                yield line_number, json.loads(line)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(8 * 1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--decisions", required=True, type=Path)
    parser.add_argument("--render-root", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--index-output", required=True, type=Path)
    args = parser.parse_args()

    decisions = {}
    for _, record in json_lines(args.decisions):
        key = (str(record["scanId"]), str(record["target"]))
        if key in decisions:
            raise RuntimeError(f"Duplicate decision: {key}")
        decisions[key] = record
    if len(decisions) != EXPECTED_TARGETS:
        raise RuntimeError(f"Expected {EXPECTED_TARGETS} decisions, found {len(decisions)}")

    render_paths = sorted(args.render_root.glob("cpu-32-*/render-manifest.jsonl"))
    if len(render_paths) != 8:
        raise RuntimeError(f"Expected eight render manifests, found {len(render_paths)}")
    written = 0
    seen = set()
    status_counts = {row: {"green": 0, "yellow": 0, "red": 0} for row in ROWS}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", encoding="utf-8") as output:
        for manifest in render_paths:
            for line_number, render in json_lines(manifest):
                if render.get("view_id") != "canonical":
                    continue
                scan_id = str(render["scan_id"])
                for row_name in ROWS:
                    key = (scan_id, row_name)
                    if key in seen or key not in decisions:
                        raise RuntimeError(f"Missing or duplicate evidence key: {key}")
                    seen.add(key)
                    decision = decisions[key]
                    row = (render.get("rows") or {}).get(row_name) or {}
                    shape = row.get("contour_points_normalized")
                    if not isinstance(shape, list) or len(shape) != 32:
                        shape = None
                    status = str((decision.get("decision") or {}).get("status"))
                    if status not in status_counts[row_name]:
                        raise RuntimeError(f"Unknown decision status for {key}: {status}")
                    status_counts[row_name][status] += 1
                    evidence = {
                        "schemaVersion": "wear-waist-hip-teacher-evidence/v1",
                        "scanId": scan_id,
                        "target": row_name,
                        "fold": decision.get("fold"),
                        "teacherStatus": status,
                        "trainingMask": (decision.get("decision") or {}).get("trainingMask"),
                        "decisionReasons": (decision.get("decision") or {}).get("reasons"),
                        "visualEvidence": {
                            "silhouetteMask": render.get("s3_mask"),
                            "realMeshCard": render.get("s3_mesh_image"),
                            "renderManifest": str(manifest),
                            "renderManifestLine": line_number,
                        },
                        "bodyLine": {
                            "heightMethod": row.get("height_method"),
                            "sliceHeightMm": row.get("slice_height_mm"),
                            "yNorm": row.get("y_norm"),
                            "leftANorm": row.get("left_x_norm"),
                            "rightBNorm": row.get("right_x_norm"),
                        },
                        "geometry": {
                            "widthCm": (decision.get("geometry") or {}).get("widthCm"),
                            "depthCm": (decision.get("geometry") or {}).get("depthCm"),
                            "ringCm": (decision.get("geometry") or {}).get("ringCircumferenceCm"),
                            "shape32": shape,
                            "sliceMethod": row.get("slice_method"),
                            "surfaceAttachment": row.get("surface_attachment"),
                        },
                        "tape": decision.get("tape"),
                        "tapeMinusRingCm": (decision.get("conflict") or {}).get("tapeMinusRingCm"),
                        "relevantLandmarks2D": {
                            name: value
                            for name, value in (render.get("landmarks_2d") or {}).items()
                            if name in {
                                "Waist, Preferred, Post.", "Lt. 10th Rib", "Rt. 10th Rib",
                                "Lt. Iliocristale", "Rt. Iliocristale", "Lt. ASIS", "Rt. ASIS",
                                "Lt. Trochanterion", "Rt. Trochanterion", "Crotch",
                            }
                        },
                        "sourceProof": decision.get("sourceProof"),
                    }
                    output.write(json.dumps(evidence, sort_keys=True) + "\n")
                    written += 1

    if written != EXPECTED_TARGETS or seen != set(decisions):
        raise RuntimeError(f"Evidence coverage failed: written={written}, seen={len(seen)}")
    index = {
        "schemaVersion": "wear-waist-hip-teacher-evidence-index/v1",
        "createdAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "state": "completed",
        "targets": written,
        "people": len({scan_id for scan_id, _ in seen}),
        "scope": list(ROWS),
        "statusCounts": status_counts,
        "records": str(args.output.resolve()),
        "recordsSha256": sha256(args.output),
        "renderManifestSha256": {str(path): sha256(path) for path in render_paths},
        "containsRealMeshCards": True,
        "containsShape32": True,
    }
    args.index_output.parent.mkdir(parents=True, exist_ok=True)
    args.index_output.write_text(json.dumps(index, indent=2, sort_keys=True) + "\n")
    print(json.dumps(index, indent=2, sort_keys=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
