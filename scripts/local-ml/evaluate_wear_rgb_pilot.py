#!/usr/bin/env python3
"""Bounded CPU-only RGB-to-MHR retrieval pilot for 24 WEAR front fixtures.

Pixels are passed to Meta SAM 3D Body with a full-image crop. The resulting
fixed MHR topology is projected to 2D and bridged into the existing semantic
WEAR index using only MHR70 points and the rasterized MHR output itself.

The fixture manifest's teacher rows, teacher landmarks, masks, measurements,
depth, and circumference values are never passed into the extractor or query.
This is a same-view/front-only synthetic RGB pilot, not the required blind
customer-photo or 448x8 RGB gate.
"""

from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import math
import os
import sys
import tempfile
import time
import traceback
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Mapping

import cv2
import numpy as np

from wear_mesh_index import build_descriptor, load_index, rank_candidates


ROOT = Path(__file__).resolve().parents[2]
PILOT_MANIFEST = ROOT / ".local-ml/wear3d-pilot/proof-100-v3/render-manifest.jsonl"
INDEX_MANIFEST = ROOT / ".local-ml/wear-mesh-index/index-manifest.json"
ORACLE_REPORT = ROOT / ".local-ml/wear-mesh-index/blind-retrieval-report.json"
OUTPUT_DIR = ROOT / ".local-ml/wear-mesh-index/rgb-pilot"
REPORT_PATH = ROOT / ".local-ml/wear-mesh-index/rgb-pilot-report.json"
SHAPE_RUNNER = ROOT / "scripts/local-ml/run_sam3d_shape.py"
MESH_HELPERS = ROOT / "scripts/local-ml/build_photo_body_mesh_assets.py"
EXPECTED_MHR_VERTICES = 18_439


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--pilot-manifest", type=Path, default=PILOT_MANIFEST)
    parser.add_argument("--index-manifest", type=Path, default=INDEX_MANIFEST)
    parser.add_argument("--oracle-report", type=Path, default=ORACLE_REPORT)
    parser.add_argument("--output-dir", type=Path, default=OUTPUT_DIR)
    parser.add_argument("--report", type=Path, default=REPORT_PATH)
    parser.add_argument("--limit", type=int, default=24)
    parser.add_argument(
        "--max-wall-seconds",
        type=float,
        default=7_200.0,
        help="Stop between people after this total wall-clock budget.",
    )
    parser.add_argument("--top-k-evidence", type=int, default=5)
    return parser.parse_args()


def load_module(name: str, path: Path):
    specification = importlib.util.spec_from_file_location(name, path)
    if specification is None or specification.loader is None:
        raise RuntimeError(f"Could not import {path}")
    module = importlib.util.module_from_spec(specification)
    specification.loader.exec_module(module)
    return module


def configure_cpu_environment() -> None:
    os.environ.setdefault(
        "PRIMESTYLE_SAM3D_ROOT", str(ROOT / ".local-ml/external/sam-3d-body")
    )
    os.environ.setdefault(
        "PRIMESTYLE_SAM3D_CHECKPOINT",
        str(ROOT / ".local-ml/checkpoints/sam-3d-body-vith/model.ckpt"),
    )
    os.environ.setdefault(
        "PRIMESTYLE_SAM3D_MHR",
        str(ROOT / ".local-ml/checkpoints/sam-3d-body-vith/assets/mhr_model.pt"),
    )
    os.environ["PRIMESTYLE_SAM3D_DEVICE"] = "cpu"
    os.environ.setdefault("OMP_NUM_THREADS", "8")
    os.environ.setdefault("MKL_NUM_THREADS", "8")


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def atomic_write(path: Path, payload: Mapping[str, Any], *, compact: bool = False) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary = tempfile.mkstemp(prefix=path.name + ".", dir=path.parent)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
            if compact:
                json.dump(payload, handle, ensure_ascii=False, separators=(",", ":"))
            else:
                json.dump(payload, handle, ensure_ascii=False, indent=2, sort_keys=True)
                handle.write("\n")
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, path)
    except BaseException:
        try:
            os.unlink(temporary)
        except FileNotFoundError:
            pass
        raise


def load_pinned_records(args: argparse.Namespace) -> list[dict[str, Any]]:
    records = [
        json.loads(line)
        for line in args.pilot_manifest.open("r", encoding="utf-8")
        if line.strip()
    ]
    by_subject = {str(record.get("subject_id")): record for record in records}
    selected_ids: list[str] = []
    if args.oracle_report.is_file():
        oracle = json.loads(args.oracle_report.read_text(encoding="utf-8"))
        selected_ids = [
            str(value)
            for value in oracle.get("runs", {})
            .get("pilot_front24", {})
            .get("selected_scan_ids", [])
        ]
    selected = [by_subject[subject_id] for subject_id in selected_ids if subject_id in by_subject]
    if not selected:
        ordered = sorted(
            records,
            key=lambda record: (
                str(record.get("gender")),
                float(record.get("bmi") or -1.0),
                float(record.get("height_cm") or -1.0),
                str(record.get("subject_id")),
            ),
        )
        if args.limit >= len(ordered):
            selected = ordered
        elif args.limit > 0:
            positions = [
                round(index * (len(ordered) - 1) / max(args.limit - 1, 1))
                for index in range(args.limit)
            ]
            selected = [ordered[position] for position in positions]
    return selected[: max(args.limit, 0)]


def visible_point(point: np.ndarray, image_width: int, image_height: int) -> dict[str, Any]:
    return {
        "visible": True,
        "x": float(point[0]) / float(image_width),
        "y": float(point[1]) / float(image_height),
    }


def interpolate(left: np.ndarray, right: np.ndarray, fraction: float) -> np.ndarray:
    return left + (right - left) * fraction


def central_interval(
    mesh_raster: np.ndarray,
    y_normalized: float,
    center_x_normalized: float,
) -> tuple[float, float] | None:
    height, width = mesh_raster.shape
    center_x = center_x_normalized * width
    row_y = int(round(y_normalized * (height - 1)))
    candidates: list[tuple[int, int]] = []
    for y in range(max(0, row_y - 2), min(height, row_y + 3)):
        xs = np.flatnonzero(mesh_raster[y] > 0)
        if not len(xs):
            continue
        cuts = np.flatnonzero(np.diff(xs) > 1)
        starts = np.r_[0, cuts + 1]
        ends = np.r_[cuts, len(xs) - 1]
        intervals = [
            (int(xs[start]), int(xs[end]))
            for start, end in zip(starts, ends)
            if int(xs[end] - xs[start] + 1) >= 3
        ]
        if not intervals:
            continue
        containing = [interval for interval in intervals if interval[0] <= center_x <= interval[1]]
        if containing:
            candidates.append(max(containing, key=lambda interval: interval[1] - interval[0]))
        else:
            candidates.append(
                min(intervals, key=lambda interval: abs((interval[0] + interval[1]) / 2 - center_x))
            )
    if not candidates:
        return None
    left = float(np.median([value[0] for value in candidates])) / float(width)
    right = float(np.median([value[1] for value in candidates])) / float(width)
    if right - left < 0.01:
        return None
    return left, right


def mhr_query_record(
    profile: Mapping[str, Any],
    normalized_xy: np.ndarray,
    display_faces: np.ndarray,
    mhr70_px: np.ndarray,
    image_width: int,
    image_height: int,
    helpers: Any,
) -> tuple[dict[str, Any], dict[str, Any]]:
    """Bridge RGB MHR output to the existing semantic descriptor allowlist."""

    if mhr70_px.shape != (70, 2):
        raise RuntimeError(f"Unexpected MHR70 shape {mhr70_px.shape}")
    if not np.isfinite(normalized_xy).all() or not np.isfinite(mhr70_px).all():
        raise RuntimeError("MHR output contains non-finite geometry")
    projected = helpers.projected_vertices_from_image_normalized(
        normalized_xy, image_width, image_height
    )
    mesh_raster = helpers.rasterize_projection(
        normalized_xy, display_faces, image_width, image_height
    )
    if int(mesh_raster.sum()) < max(200, int(image_width * image_height * 0.02)):
        raise RuntimeError("RGB MHR projected raster is empty or too small")

    shoulder_left, shoulder_right = mhr70_px[5], mhr70_px[6]
    hip_left, hip_right = mhr70_px[9], mhr70_px[10]
    neck = mhr70_px[69]
    shoulder_y = float(np.mean([shoulder_left[1], shoulder_right[1]])) / image_height
    hip_y = float(np.mean([hip_left[1], hip_right[1]])) / image_height
    torso_span = hip_y - shoulder_y
    if not math.isfinite(torso_span) or torso_span < 0.08:
        raise RuntimeError(f"Invalid RGB MHR torso span: {torso_span}")
    center_x = float(
        np.mean([shoulder_left[0], shoulder_right[0], hip_left[0], hip_right[0]])
    ) / image_width
    row_levels = {
        "neck": float(neck[1]) / image_height,
        "chest": shoulder_y + 0.28 * torso_span,
        "underbust": shoulder_y + 0.48 * torso_span,
        "waist": shoulder_y + 0.72 * torso_span,
        "hips": hip_y + 0.04 * torso_span,
    }
    rows: dict[str, Any] = {}
    intervals: dict[str, tuple[float, float]] = {}
    for name, y_norm in row_levels.items():
        interval = central_interval(mesh_raster, y_norm, center_x)
        if interval is None:
            continue
        intervals[name] = interval
        rows[name] = {
            "accepted": True,
            "geometry_target_valid": True,
            "left_x_norm": interval[0],
            "right_x_norm": interval[1],
            "y_norm": y_norm,
        }
    missing_rows = sorted(set(("chest", "waist", "hips")) - set(intervals))
    if missing_rows:
        raise RuntimeError("RGB MHR raster missing required rows: " + ",".join(missing_rows))

    landmarks: dict[str, Any] = {}

    def assign(name: str, point: np.ndarray) -> None:
        landmarks[name] = visible_point(point, image_width, image_height)

    assign("Sellion", mhr70_px[0])
    assign("Lt. Infraorbitale", mhr70_px[1])
    assign("Rt. Infraorbitale", mhr70_px[2])
    assign("Lt. Tragion", mhr70_px[3])
    assign("Rt. Tragion", mhr70_px[4])
    assign("Lt. Gonion", interpolate(mhr70_px[3], mhr70_px[0], 0.38))
    assign("Rt. Gonion", interpolate(mhr70_px[4], mhr70_px[0], 0.38))
    for name in ("Supramenton", "Cervicale", "Nuchale"):
        assign(name, neck)
    assign("Lt. Acromion", mhr70_px[67])
    assign("Rt. Acromion", mhr70_px[68])
    assign("Lt. Clavicale", interpolate(neck, mhr70_px[67], 0.48))
    assign("Rt. Clavicale", interpolate(neck, mhr70_px[68], 0.48))

    def row_point(row_name: str, fraction: float) -> np.ndarray:
        left, right = intervals[row_name]
        return np.asarray(
            [(left + (right - left) * fraction) * image_width, row_levels[row_name] * image_height],
            dtype=np.float64,
        )

    for suffix in ("Ant", "Post."):
        assign(f"Lt. Axilla, {suffix}", row_point("chest", 0.0))
        assign(f"Rt. Axilla, {suffix}", row_point("chest", 1.0))
    assign("Lt. Thelion/Bustpoint", row_point("chest", 0.30))
    assign("Rt. Thelion/Bustpoint", row_point("chest", 0.70))
    assign("Lt. 10th Rib", row_point("underbust", 0.0))
    assign("Rt. 10th Rib", row_point("underbust", 1.0))
    assign("Lt. Iliocristale", row_point("waist", 0.0))
    assign("Rt. Iliocristale", row_point("waist", 1.0))
    assign("Lt. ASIS", row_point("hips", 0.20))
    assign("Rt. ASIS", row_point("hips", 0.80))
    assign("Lt. Trochanterion", hip_left)
    assign("Rt. Trochanterion", hip_right)
    for suffix in ("Femoral Lateral Epicn", "Femoral Medial Epicn", "Knee Crease"):
        assign(f"Lt. {suffix}", mhr70_px[11])
        assign(f"Rt. {suffix}", mhr70_px[12])
    for suffix in ("Lateral Malleolus", "Medial Malleolus"):
        assign(f"Lt. {suffix}", mhr70_px[13])
        assign(f"Rt. {suffix}", mhr70_px[14])
    assign("Lt. Calcaneous, Post.", mhr70_px[17])
    assign("Rt. Calcaneous, Post.", mhr70_px[20])
    assign("Lt. Digit II", mhr70_px[15])
    assign("Rt. Digit II", mhr70_px[18])

    def segment(indices: list[int]) -> list[dict[str, Any]]:
        return [visible_point(mhr70_px[index], image_width, image_height) for index in indices]

    segments = {
        "left_sleeve": segment([5, 7, 62]),
        "right_sleeve": segment([6, 8, 41]),
        "left_inseam": segment([9, 13]),
        "right_inseam": segment([10, 14]),
        "shoulders": segment([5, 6]),
    }
    descriptor_input = {
        "gender": profile.get("gender"),
        "height_cm": profile.get("height_cm"),
        "weight_kg": profile.get("weight_kg"),
        "training_pose_valid": True,
        "landmark_targets_valid": True,
        "landmarks_2d": landmarks,
        "rows": rows,
        "segments": segments,
    }
    descriptor = build_descriptor(descriptor_input)
    bridge = {
        "method": "RGB SAM3D fixed-MHR projection + MHR70 + projected-MHR central torso intervals",
        "teacherRowsUsed": False,
        "teacherLandmarksUsed": False,
        "teacherMaskUsed": False,
        "externalMaskUsed": False,
        "mhrOutputRasterizedForRows": True,
        "rowLevelHeuristic": {
            "chest": "shoulder-to-hip 28%",
            "underbust": "shoulder-to-hip 48%",
            "waist": "shoulder-to-hip 72%",
            "hips": "hip-joint level + 4% torso span",
        },
        "queryFeatureCoverage": descriptor["quality"]["weighted_coverage"],
        "projectedRasterPixels": int(mesh_raster.sum()),
        "projectedVertexCount": int(len(projected)),
    }
    return descriptor_input, bridge


def rank_value(matches: list[Mapping[str, Any]], subject_id: str, field: str) -> int | None:
    for match in matches:
        if str(match.get("subject_id")) == subject_id:
            return int(match[field])
    return None


def metric(ranks: list[int]) -> dict[str, Any]:
    return {
        "count": len(ranks),
        "top1Rate": round(sum(rank == 1 for rank in ranks) / len(ranks), 6) if ranks else None,
        "top5Rate": round(sum(rank <= 5 for rank in ranks) / len(ranks), 6) if ranks else None,
        "medianRank": float(np.median(ranks)) if ranks else None,
        "worstRank": max(ranks) if ranks else None,
    }


def main() -> int:
    args = parse_args()
    started = time.monotonic()
    configure_cpu_environment()
    manifest, entries = load_index(args.index_manifest)
    selected = load_pinned_records(args)
    records: list[dict[str, Any]] = []
    combined_ranks: list[int] = []
    shape_ranks: list[int] = []
    profile_ranks: list[int] = []
    successful = 0
    rgb_extractor_attempts = 0
    model_loaded = False
    model_load_error: str | None = None
    topology_hash: str | None = None
    topology_asset: str | None = None

    try:
        runner = load_module("primestyle_rgb_pilot_runner", SHAPE_RUNNER)
        helpers = load_module("primestyle_rgb_pilot_helpers", MESH_HELPERS)
        import torch

        torch.set_num_threads(max(1, min(8, os.cpu_count() or 1)))
        estimator = runner.load_estimator()
        model_loaded = True
    except Exception as error:  # report a hard local compatibility blocker
        runner = helpers = estimator = None
        model_load_error = f"{type(error).__name__}: {error}"

    if model_loaded:
        args.output_dir.mkdir(parents=True, exist_ok=True)
        for fixture in selected:
            if time.monotonic() - started > args.max_wall_seconds:
                records.append(
                    {
                        "status": "not-run-budget-exhausted",
                        "subjectId": fixture.get("subject_id"),
                    }
                )
                continue
            subject_id = str(fixture.get("subject_id"))
            image_path = Path(str(fixture.get("image")))
            if not image_path.is_absolute():
                image_path = ROOT / image_path
            record_started = time.monotonic()
            evidence: dict[str, Any] = {
                "subjectId": subject_id,
                "image": str(image_path.relative_to(ROOT)),
                "imageSha256": sha256_file(image_path) if image_path.is_file() else None,
                "status": "failed",
                "rgbPixelsEnteredExtractor": False,
                "identitySentToSearch": False,
            }
            try:
                image = cv2.imread(str(image_path))
                if image is None:
                    raise RuntimeError(f"Could not read RGB fixture {image_path}")
                image_height, image_width = image.shape[:2]
                diagnostics: dict[str, np.ndarray] = {}
                request = {
                    "heightCm": float(fixture["height_cm"]),
                    "personBoxPx": [0.0, 0.0, float(image_width - 1), float(image_height - 1)],
                }
                (
                    posed_vertices,
                    _neutral_vertices,
                    faces,
                    returned_box,
                    _mask_bounds_y,
                    returned_width,
                    returned_height,
                    supplied_mask,
                    _camera_conditioned,
                    camera_translation,
                    camera_projection,
                ) = runner.run_model(
                    estimator,
                    image_path,
                    request,
                    capture=diagnostics,
                )
                evidence["rgbPixelsEnteredExtractor"] = True
                rgb_extractor_attempts += 1
                if supplied_mask is not None:
                    raise RuntimeError("RGB pilot unexpectedly used an external mask")
                projected = helpers.projected_browser_vertices(
                    posed_vertices,
                    camera_translation,
                    camera_projection,
                    returned_width,
                    returned_height,
                )
                normalized_xy = helpers.image_normalized_vertices(
                    projected, returned_width, returned_height
                )
                display_faces = helpers.front_display_faces(
                    projected,
                    projected,
                    faces,
                    returned_width,
                    returned_height,
                )
                mhr70 = np.asarray(diagnostics.get("pred_keypoints_2d", []), dtype=np.float64)
                if len(normalized_xy) != EXPECTED_MHR_VERTICES:
                    raise RuntimeError(
                        f"Unexpected fixed MHR vertex count {len(normalized_xy)}"
                    )
                current_topology_hash = hashlib.sha256(
                    np.asarray(faces, dtype=np.int64).tobytes()
                ).hexdigest()
                if topology_hash is None:
                    topology_hash = current_topology_hash
                    topology_path = args.output_dir / "shared-mhr-topology.json"
                    atomic_write(
                        topology_path,
                        {
                            "schemaVersion": "rgb-pilot-shared-mhr-topology/v1",
                            "vertexCount": int(len(normalized_xy)),
                            "triangleCount": int(len(faces)),
                            "topologySha256": topology_hash,
                            "triangles": np.asarray(faces, dtype=np.int64).reshape(-1).tolist(),
                        },
                        compact=True,
                    )
                    topology_asset = str(topology_path.relative_to(ROOT))
                elif current_topology_hash != topology_hash:
                    raise RuntimeError("MHR face topology changed between RGB fixtures")

                profile_only = {
                    "gender": fixture.get("gender"),
                    "height_cm": float(fixture["height_cm"]),
                    "weight_kg": float(fixture["weight_kg"]),
                }
                descriptor_input, bridge = mhr_query_record(
                    profile_only,
                    normalized_xy,
                    display_faces,
                    mhr70,
                    returned_width,
                    returned_height,
                    helpers,
                )
                query = {
                    **profile_only,
                    "descriptor": build_descriptor(descriptor_input),
                }
                serialized_query = json.dumps(query, sort_keys=True).lower()
                forbidden_tokens = (
                    "scan_id",
                    "subject_id",
                    "circumference",
                    "mesh_depth",
                    "measurements_mm",
                    "tape",
                )
                leaked = [token for token in forbidden_tokens if token in serialized_query]
                if leaked:
                    raise RuntimeError("Query leakage audit failed: " + ",".join(leaked))
                ranked = rank_candidates(query, entries, manifest["robust_scaler"])
                target_combined = rank_value(ranked["matches"], subject_id, "rank")
                target_shape = rank_value(ranked["matches"], subject_id, "shape_only_rank")
                target_profile = rank_value(ranked["matches"], subject_id, "profile_only_rank")
                if target_combined is not None:
                    combined_ranks.append(target_combined)
                if target_shape is not None:
                    shape_ranks.append(target_shape)
                if target_profile is not None:
                    profile_ranks.append(target_profile)
                asset_path = args.output_dir / f"{subject_id}-mhr-rgb.json"
                atomic_write(
                    asset_path,
                    {
                        "schemaVersion": "rgb-pilot-mhr-projection/v1",
                        "subjectIdHeldOutFromQuery": subject_id,
                        "sourceImage": str(image_path.relative_to(ROOT)),
                        "sourceImageSha256": evidence["imageSha256"],
                        "rgbPixelsEnteredExtractor": True,
                        "externalMaskUsed": False,
                        "depthUsed": False,
                        "tapeCircumferenceUsed": False,
                        "fixedTopology": True,
                        "topologySha256": topology_hash,
                        "imageSize": [returned_width, returned_height],
                        "personBoxXYXY": [round(float(value), 3) for value in returned_box],
                        "vertices": np.round(normalized_xy, 7).reshape(-1).tolist(),
                        "mhr70": np.round(mhr70, 4).tolist(),
                    },
                    compact=True,
                )
                evidence.update(
                    {
                        "status": "extracted-and-queried",
                        "fixedVertexCount": int(len(normalized_xy)),
                        "fixedTriangleCount": int(len(faces)),
                        "displayTriangleCount": int(len(display_faces)),
                        "topologySha256": topology_hash,
                        "asset": str(asset_path.relative_to(ROOT)),
                        "descriptorQuality": query["descriptor"]["quality"],
                        "semanticBridge": bridge,
                        "strictCohortCount": ranked["cohort_count"],
                        "targetRanks": {
                            "combined": target_combined,
                            "shapeOnly": target_shape,
                            "profileOnly": target_profile,
                        },
                        "topMatches": [
                            {
                                "scanId": match.get("scan_id"),
                                "subjectId": match.get("subject_id"),
                                "rank": match.get("rank"),
                                "shapeOnlyRank": match.get("shape_only_rank"),
                                "totalScore": match.get("total_score"),
                                "shapeScore": match.get("shape_score"),
                            }
                            for match in ranked["matches"][: args.top_k_evidence]
                        ],
                    }
                )
                successful += 1
            except Exception as error:
                evidence["error"] = f"{type(error).__name__}: {error}"
                evidence["tracebackTail"] = traceback.format_exc().splitlines()[-8:]
            evidence["elapsedSeconds"] = round(time.monotonic() - record_started, 3)
            records.append(evidence)

    report = {
        "schemaVersion": "wear-rgb-mhr-retrieval-pilot/v1",
        "createdAt": datetime.now(timezone.utc).isoformat(),
        "status": "private-cpu-pilot-only",
        "releaseApproved": False,
        "scope": {
            "requestedPinnedPeople": min(args.limit, len(selected)),
            "attemptedPeople": sum(
                record.get("status") != "not-run-budget-exhausted" for record in records
            ),
            "successfulRgbMhrQueries": successful,
            "fixtureType": "synthetic WEAR RGB front renders",
            "sameViewFrontOnly": True,
            "alternateView448x8RgbRun": False,
        },
        # This means decoded image pixels genuinely crossed the model boundary.
        # Successful index queries are counted separately below.
        "rgbPipelineUsed": rgb_extractor_attempts > 0,
        "rgbPipelineDefinition": (
            "Meta SAM 3D Body received decoded RGB pixels plus a full-image crop and returned "
            "a projected fixed-topology MHR mesh."
        ),
        "requiredBlindGateSatisfied": False,
        "fixedTopology": {
            "expectedVertexCount": EXPECTED_MHR_VERTICES,
            "topologySha256": topology_hash,
            "sharedTopologyAsset": topology_asset,
            "singleQueryTopologyObserved": successful >= 1 and topology_hash is not None,
            "sameVertexIdsAcrossSuccessfulQueries": successful >= 2 and topology_hash is not None,
        },
        "leakageGuard": {
            "teacherRowsUsedForQuery": False,
            "teacherLandmarksUsedForQuery": False,
            "teacherMaskUsedForQuery": False,
            "externalMaskUsedForQuery": False,
            "depthUsedForQuery": False,
            "tapeOrCircumferenceUsedForQuery": False,
            "identitySentToSearch": False,
            "fixtureManifestFieldsReadForExtraction": [
                "image",
                "gender",
                "height_cm",
                "weight_kg",
            ],
        },
        "model": {
            "name": "Meta SAM 3D Body",
            "device": "cpu",
            "modelLoaded": model_loaded,
            "modelLoadError": model_load_error,
            "python": sys.executable,
        },
        "retrieval": {
            "indexVersion": manifest.get("index_version"),
            "method": "strict cohort plus exact direct ranking",
            "combined": metric(combined_ranks),
            "shapeOnly": metric(shape_ranks),
            "profileOnly": metric(profile_ranks),
        },
        "limitationsAndBlockers": [
            "This is synthetic front RGB and same-view only, not a real customer-photo gate.",
            "MHR-to-WEAR semantic rows use explicit shoulder-to-hip heuristics; they are not validated anatomical row predictors.",
            "The existing index contains WEAR teacher/oracle descriptors, so cross-domain descriptor compatibility remains experimental.",
            "Current regional feature weights remain hand-set and are not validation-selected then frozen.",
            "A successful self rank can still be dominated by the strict height/weight cohort; profile-only is reported separately.",
            "This report does not alter or satisfy the separate 448x8 oracle diagnostic or required blind RGB test gate.",
        ],
        "elapsedSeconds": round(time.monotonic() - started, 3),
        "records": records,
    }
    atomic_write(args.report, report)
    print(
        json.dumps(
            {
                "report": str(args.report),
                "rgbPipelineUsed": report["rgbPipelineUsed"],
                "requiredBlindGateSatisfied": False,
                "requested": report["scope"]["requestedPinnedPeople"],
                "successful": successful,
                "retrieval": report["retrieval"],
                "elapsedSeconds": report["elapsedSeconds"],
            },
            indent=2,
        ),
        flush=True,
    )
    return 0 if successful > 0 else 2


if __name__ == "__main__":
    raise SystemExit(main())
