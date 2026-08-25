#!/usr/bin/env python3
"""Audit nearby PLY body planes without using tape to create geometry.

Run with Blender, for example:

  blender --background --python scripts/local-ml/diagnose_wear_ply_plane_sweep.py -- \
    --scan-id IT-4028-A --row waist

Every candidate section is created from the anatomically oriented source PLY
and WEAR LND bounds first.  The recorded tape is revealed only after the sweep
has finished.  The tape-closest candidate is diagnostic evidence and is never
selected as a teacher by this script.
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import math
import sys
from pathlib import Path
from typing import Any

import bpy
import numpy as np


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_MANIFEST = PROJECT_ROOT / ".local-ml/wear3d-v6-audit/source-manifest-standing-a.jsonl"
DEFAULT_SOURCE_ROOT = PROJECT_ROOT / ".local-ml/wear-mesh-overlay/dynamic-sources"
DEFAULT_OUTPUT_ROOT = PROJECT_ROOT / ".local-ml/reports/wear-plane-sweeps"


def parse_args() -> argparse.Namespace:
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--scan-id", default="IT-4028-A")
    parser.add_argument("--row", choices=("chest", "underbust", "waist", "hips"), default="waist")
    parser.add_argument("--radius-mm", type=int, default=80)
    parser.add_argument("--step-mm", type=int, default=2)
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--source-root", type=Path, default=DEFAULT_SOURCE_ROOT)
    parser.add_argument("--output-root", type=Path, default=DEFAULT_OUTPUT_ROOT)
    return parser.parse_args(argv)


def load_renderer():
    source = PROJECT_ROOT / "scripts/local-ml/cloud/wear3d-v6/render_wear3d_multiview.py"
    spec = importlib.util.spec_from_file_location("wear_plane_sweep_renderer", source)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not import WEAR renderer from {source}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def load_record(manifest: Path, scan_id: str) -> dict[str, Any]:
    for line in manifest.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        record = json.loads(line)
        if str(record.get("scan_id", "")).upper() == scan_id.upper():
            return record
    raise RuntimeError(f"{scan_id} is not present in {manifest}")


def local_mesh_path(record: dict[str, Any], source_root: Path) -> Path:
    scan_slug = str(record["scan_id"]).lower()
    source_name = Path(str(record.get("source", {}).get("mesh", ""))).name
    direct = source_root / scan_slug / source_name
    if direct.is_file():
        return direct
    matches = list(source_root.rglob(source_name)) if source_name else []
    if len(matches) == 1:
        return matches[0]
    raise FileNotFoundError(f"Local PLY for {record['scan_id']} is missing or ambiguous: {matches}")


def finite(value: Any) -> float | None:
    try:
        result = float(value)
    except (TypeError, ValueError):
        return None
    return result if math.isfinite(result) else None


def walked_perimeter_mm(points: np.ndarray) -> float:
    closed = np.vstack((points, points[0]))
    return float(np.linalg.norm(np.diff(closed, axis=0), axis=1).sum() * 1000.0)


def normalized_points(points: np.ndarray) -> list[list[float]]:
    return [[round(float(x), 6), round(float(y), 6)] for x, y in points]


def local_minimum(candidates: list[dict[str, Any]]) -> dict[str, Any] | None:
    """Choose a tape-blind natural-waist candidate.

    The waist is the smallest certified closed section in the anatomical
    search window.  Tape is intentionally not an argument to this function.
    This is a diagnostic candidate rule until a held-out canary validates it.
    """
    safe = [candidate for candidate in candidates if candidate["certified"]]
    if not safe:
        return None
    return min(
        safe,
        key=lambda candidate: (
            candidate["walked_perimeter_mm"],
            abs(candidate["offset_mm"]),
        ),
    )


def main() -> None:
    args = parse_args()
    if args.radius_mm <= 0 or args.step_mm <= 0:
        raise ValueError("radius-mm and step-mm must be positive")
    renderer = load_renderer()
    record = load_record(args.manifest, args.scan_id)
    mesh_path = local_mesh_path(record, args.source_root)
    record = {
        **record,
        "source": {**record.get("source", {}), "mesh": str(mesh_path.resolve())},
    }
    row_sources = {**record.get("measurements_mm", {}), **record.get("extracted_standing_mm", {})}
    height_mm, height_method = renderer.row_height_mm(args.row, row_sources, {})

    renderer.BASE.clean_scene()
    renderer.configure_scene(bpy.context.scene)
    body, transform, offset, height_m = renderer.BASE.import_body(record)
    raw_landmarks = renderer.BASE.transform_landmarks(record, transform, offset)
    landmarks, landmark_contract = renderer.canonicalize_landmarks(raw_landmarks)
    # Row heights that depend on landmarks can only be resolved after import.
    height_mm, height_method = renderer.row_height_mm(args.row, row_sources, landmarks)
    if height_mm is None:
        raise RuntimeError(f"{args.scan_id} has no source height for {args.row}")

    points = np.empty(len(body.data.vertices) * 3, dtype=np.float64)
    body.data.vertices.foreach_get("co", points)
    body_points = points.reshape((-1, 3)) + np.asarray(body.location)[None, :]
    anatomy_bounds = renderer.BASE.torso_bounds(landmarks, args.row)
    camera, camera_data = renderer.add_perspective_camera(height_m, renderer.DEFAULT_VIEWS[0])

    _, circumference_key = renderer.ROW_SPECS[args.row]
    tape_mm = finite(row_sources.get(circumference_key))
    def measure_offset(offset_mm: float) -> dict[str, Any]:
        candidate_height_mm = float(height_mm + offset_mm)
        geometry = renderer.torso_contour(
            body,
            body_points,
            candidate_height_mm / 1000.0,
            anatomy_bounds,
            None,
            debug_label=f"{args.scan_id}:{args.row}:offset={offset_mm}",
        )
        if geometry is None:
            return {
                "offset_mm": round(offset_mm, 6),
                "height_mm": round(candidate_height_mm, 3),
                "valid": False,
                "certified": False,
                "reason": "no-certified-closed-PLY-section",
            }
        contour = np.asarray(geometry["normalized_contour"], dtype=np.float64)
        walked_mm = walked_perimeter_mm(np.asarray([
            [
                geometry["center_x_m"] + point[0] * geometry["width_mm"] / 2000.0,
                geometry["center_y_m"] + point[1] * geometry["depth_mm"] / 2000.0,
            ]
            for point in contour
        ], dtype=np.float64))
        projected = renderer.project_contour(bpy.context.scene, camera, geometry)
        return {
            "offset_mm": round(offset_mm, 6),
            "height_mm": round(candidate_height_mm, 3),
            "valid": True,
            "certified": geometry.get("certified_section") is True,
            "source": geometry.get("contour_source"),
            "raw_slice_closed": geometry.get("raw_slice_closed") is True,
            "raw_perimeter_mm": (
                round(float(geometry["raw_perimeter_mm"]), 3)
                if finite(geometry.get("raw_perimeter_mm")) is not None
                else None
            ),
            "walked_perimeter_mm": round(walked_mm, 3),
            "width_mm": round(float(geometry["width_mm"]), 3),
            "depth_mm": round(float(geometry["depth_mm"]), 3),
            "closure_gap_mm": round(float(geometry.get("closure_gap_mm", 0.0)), 3),
            "contour": normalized_points(contour),
            "y_norm": projected.get("y_norm") if projected else None,
            "left_x_norm": projected.get("left_x_norm") if projected else None,
            "right_x_norm": projected.get("right_x_norm") if projected else None,
        }

    # These are the only two direct waist-position sources supplied by WEAR.
    # Build both PLY sections before the recorded tape is revealed. The rib and
    # iliocristale landmarks are retained as anatomical bounds/checks; they are
    # not silently promoted into a third guessed waist plane.
    provided_position_checks: list[dict[str, Any]] = []
    if args.row == "waist":
        position_sources: list[tuple[str, float]] = [
            ("WEAR waist_height_mm", float(height_mm)),
        ]
        posterior_waist = landmarks.get("Waist, Preferred, Post.")
        if posterior_waist is not None:
            position_sources.append(
                ("WEAR LND Waist, Preferred, Post.", float(posterior_waist.z) * 1000.0)
            )
        for source_label, position_mm in position_sources:
            provided_position_checks.append({
                "position_source": source_label,
                "position_height_mm": round(position_mm, 3),
                "geometry_before_tape": measure_offset(position_mm - float(height_mm)),
            })

    candidates: list[dict[str, Any]] = []
    for offset_mm in range(-args.radius_mm, args.radius_mm + 1, args.step_mm):
        candidates.append(measure_offset(float(offset_mm)))

    # Only now reveal the recorded tape for diagnosis.  It did not enter any
    # section, edge, depth, resampling, validity, or tape-blind selection call.
    for candidate in candidates:
        walked = finite(candidate.get("walked_perimeter_mm"))
        candidate["tape_difference_mm"] = (
            round(walked - tape_mm, 3)
            if walked is not None and tape_mm is not None
            else None
        )

    # Reveal the recorded tape only after both WEAR-positioned PLY sections
    # already exist. This comparison cannot move either plane.
    for check in provided_position_checks:
        geometry = check["geometry_before_tape"]
        walked = finite(geometry.get("walked_perimeter_mm"))
        check["tape_reveal_after_geometry"] = {
            "recorded_tape_mm": round(tape_mm, 3) if tape_mm is not None else None,
            "difference_mm": (
                round(walked - tape_mm, 3)
                if walked is not None and tape_mm is not None
                else None
            ),
        }

    current = next((candidate for candidate in candidates if candidate["offset_mm"] == 0), None)
    tape_blind = local_minimum(candidates) if args.row == "waist" else current
    valid_with_tape = [
        candidate for candidate in candidates
        if candidate.get("certified") and finite(candidate.get("tape_difference_mm")) is not None
    ]
    oracle = min(valid_with_tape, key=lambda candidate: abs(candidate["tape_difference_mm"])) if valid_with_tape else None
    # Refine a sign-changing interval only after the tape reveal. This locates
    # the diagnostic zero crossing without ever feeding tape into PLY section
    # construction. The refined result remains forbidden as a teacher rule.
    sign_change = None
    ordered = sorted(valid_with_tape, key=lambda candidate: candidate["offset_mm"])
    for left, right in zip(ordered, ordered[1:]):
        left_delta = float(left["tape_difference_mm"])
        right_delta = float(right["tape_difference_mm"])
        if left_delta == 0.0 or left_delta * right_delta <= 0.0:
            sign_change = (left, right)
            if oracle is not None and left["offset_mm"] <= oracle["offset_mm"] <= right["offset_mm"]:
                break
    refined_oracle = None
    if sign_change is not None and tape_mm is not None:
        left_offset = float(sign_change[0]["offset_mm"])
        right_offset = float(sign_change[1]["offset_mm"])
        left_delta = float(sign_change[0]["tape_difference_mm"])
        for _ in range(14):
            middle_offset = (left_offset + right_offset) / 2.0
            middle = measure_offset(middle_offset)
            middle_walk = finite(middle.get("walked_perimeter_mm"))
            if not middle.get("certified") or middle_walk is None:
                break
            middle["tape_difference_mm"] = round(middle_walk - tape_mm, 6)
            refined_oracle = middle
            if abs(float(middle["tape_difference_mm"])) <= 0.001:
                break
            if left_delta * float(middle["tape_difference_mm"]) <= 0.0:
                right_offset = middle_offset
            else:
                left_offset = middle_offset
                left_delta = float(middle["tape_difference_mm"])
    if refined_oracle is not None and (
        oracle is None
        or abs(float(refined_oracle["tape_difference_mm"])) < abs(float(oracle["tape_difference_mm"]))
    ):
        oracle = refined_oracle
    payload = {
        "schema": "wear-ply-plane-sweep/v1",
        "scan_id": args.scan_id,
        "subject_id": record.get("subject_id"),
        "row": args.row,
        "source_height_mm": round(float(height_mm), 3),
        "source_height_method": height_method,
        "recorded_tape_mm_reveal_only": round(tape_mm, 3) if tape_mm is not None else None,
        "search": {
            "radius_mm": args.radius_mm,
            "step_mm": args.step_mm,
            "candidate_count": len(candidates),
            "certified_count": sum(candidate.get("certified") is True for candidate in candidates),
            "geometry_inputs": ["anatomically oriented PLY", "73 WEAR LND bounds", "source row height"],
            "forbidden_geometry_input": "recorded tape",
        },
        "camera": camera_data,
        "landmarks": landmark_contract,
        "waist_position_evidence": {
            "direct_position_checks": provided_position_checks,
            "anatomical_bound_landmark_heights_mm": {
                name: round(float(landmarks[name].z) * 1000.0, 3)
                for name in ("Rt. 10th Rib", "Lt. 10th Rib", "Rt. Iliocristale", "Lt. Iliocristale")
                if name in landmarks
            },
            "rule": "Only WEAR waist_height_mm and Waist, Preferred, Post. choose planes; rib and iliocristale landmarks only validate anatomy.",
        } if args.row == "waist" else None,
        "anatomy_bounds_mm": [round(bound * 1000.0, 3) for bound in anatomy_bounds],
        "current_source_plane": current,
        "tape_blind_candidate_rule": "smallest certified closed PLY waist section in the anatomical +/- radius window",
        "tape_blind_candidate": tape_blind,
        "tape_oracle_diagnostic_only": oracle,
        "warning": "The tape oracle proves whether plane selection can explain the error. It is never a training label or production rule.",
        "candidates": candidates,
    }
    args.output_root.mkdir(parents=True, exist_ok=True)
    output_path = args.output_root / f"{args.scan_id.lower()}-{args.row}.json"
    output_path.write_text(json.dumps(payload, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "output": str(output_path),
        "current_difference_mm": current.get("tape_difference_mm") if current else None,
        "tape_blind_offset_mm": tape_blind.get("offset_mm") if tape_blind else None,
        "tape_blind_difference_mm": tape_blind.get("tape_difference_mm") if tape_blind else None,
        "oracle_offset_mm": oracle.get("offset_mm") if oracle else None,
        "oracle_difference_mm": oracle.get("tape_difference_mm") if oracle else None,
        "provided_position_differences_mm": {
            check["position_source"]: check["tape_reveal_after_geometry"]["difference_mm"]
            for check in provided_position_checks
        },
    }, sort_keys=True))


if __name__ == "__main__":
    main()
