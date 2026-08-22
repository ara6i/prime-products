#!/usr/bin/env python3
"""Build honest, metric, browser-ready assets from real WEAR PLY/LND pairs.

This is an offline CPU tool.  It does not infer a body from a photograph and
it never uses a recorded tape circumference to manufacture mesh geometry.
The PLY surface supplies geometry; the LND file supplies orientation and
anatomical anchors; the profile manifest supplies independent measurements.

The WEAR archive contains mixed PLY coordinate units.  For every scan we test
both supported raw-unit hypotheses against the source LND points and recorded
stature, preserve both scores, and use only the evidence-backed winner.
"""

from __future__ import annotations

import argparse
import gzip
import hashlib
import json
import math
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable

import cv2
import numpy as np
import trimesh
from scipy.spatial import ConvexHull, cKDTree


REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_SOURCE_DIR = REPO_ROOT / ".local-ml/blender/delaram-similarity/sources"
DEFAULT_MANIFEST = REPO_ROOT / ".local-ml/wear3d-v6-audit/source-manifest-standing-a.jsonl"
DEFAULT_OUTPUT_DIR = REPO_ROOT / ".local-ml/wear-mesh-overlay/metric-lines"
SCHEMA_VERSION = 2
RASTER_PIXELS_PER_METRE = 500.0
TARGET_BROWSER_TRIANGLES = 8_000

# Fixed height fractions are directly reproducible from any visible front
# outline after floor/head normalization.  They do not require WEAR row labels,
# tape, circumference, or depth.  Fractions below the pelvis are deliberately
# excluded because a horizontal line can cross two independently posed legs.
SAFE_TORSO_HEIGHT_FRACTIONS = (0.50, 0.54, 0.58, 0.62, 0.66, 0.70)

SUBJECTS = (
    ("NA-0087-A", "csr0087a"),
    ("NA-0252-A", "csr0252a"),
    ("NA-1591-A", "csr1591a"),
    ("NA-1420-A", "csr1420a"),
    ("NA-1220-A", "csr1220a"),
    ("NA-3013-A", "csr3013a"),
    ("NL-1344-A", "nl_1344a"),
    ("NL-5934-A", "nl_5934a"),
    ("NL-6759-A", "nl_6759a"),
)

ROW_SPECS: dict[str, dict[str, Any]] = {
    "neck": {
        "label": "Neck base",
        "heightKey": None,
        "tapeKey": "neck_base_circumference_mm",
        "plane": "tilted landmark plane through clavicales, suprasternale and cervicale",
    },
    "chest": {
        "label": "Bust / chest",
        "heightKey": "chest_height_standing_mm",
        "tapeKey": "chest_circumference_mm",
        "plane": "horizontal plane at WEAR recorded standing chest height",
    },
    "underbust": {
        "label": "Under-bust",
        "heightKey": None,
        "tapeKey": "underbust_circumference_mm",
        "plane": "horizontal plane through WEAR Substernale landmark",
    },
    "waist": {
        "label": "Natural waist",
        "heightKey": "waist_height_mm",
        "tapeKey": "waist_circumference_mm",
        "plane": "horizontal plane at WEAR recorded preferred-waist height",
    },
    "hips": {
        "label": "Maximum hips",
        "heightKey": "hip_max_height_mm",
        "tapeKey": "hip_circumference_mm",
        "plane": "horizontal plane at WEAR recorded maximum-hip height",
    },
}

LATERAL_LANDMARK_PAIRS = (
    ("Rt. Acromion", "Lt. Acromion"),
    ("Rt. Clavicale", "Lt. Clavicale"),
    ("Rt. Infraorbitale", "Lt. Infraorbitale"),
    ("Rt. Gonion", "Lt. Gonion"),
    ("Rt. Tragion", "Lt. Tragion"),
    ("Rt. Thelion/Bustpoint", "Lt. Thelion/Bustpoint"),
    ("Rt. Axilla, Ant", "Lt. Axilla, Ant"),
    ("Rt. Axilla, Post.", "Lt. Axilla, Post."),
    ("Rt. 10th Rib", "Lt. 10th Rib"),
    ("Rt. ASIS", "Lt. ASIS"),
    ("Rt. PSIS", "Lt. PSIS"),
    ("Rt. Iliocristale", "Lt. Iliocristale"),
    ("Rt. Trochanterion", "Lt. Trochanterion"),
    ("Rt. Femoral Lateral Epicn", "Lt. Femoral Lateral Epicn"),
    ("Rt. Femoral Medial Epicn", "Lt. Femoral Medial Epicn"),
    ("Rt. Lateral Malleolus", "Lt. Lateral Malleolus"),
    ("Rt. Medial Malleolus", "Lt. Medial Malleolus"),
    ("Rt. Sphyrion", "Lt. Sphyrion"),
)

ANTERIOR_NAMES = (
    "Suprasternale", "Substernale", "Rt. Thelion/Bustpoint", "Lt. Thelion/Bustpoint",
    "Rt. Axilla, Ant", "Lt. Axilla, Ant", "Rt. ASIS", "Lt. ASIS",
)
POSTERIOR_NAMES = (
    "Cervicale", "Waist, Preferred, Post.", "10th Rib Midspine",
    "Rt. Axilla, Post.", "Lt. Axilla, Post.", "Rt. PSIS", "Lt. PSIS",
)

VERTICAL_ALIGNMENT_ANCHORS = (
    ("Lt. Acromion", "acromial_height_standing_left_mm"),
    ("Rt. Acromion", "acromial_height_standing_right_mm"),
    ("Lt. Axilla, Ant", "axilla_height_left_mm"),
    ("Rt. Axilla, Ant", "axilla_height_right_mm"),
    ("Cervicale", "cervicale_height_mm"),
    ("Lt. Infraorbitale", "infraorbitale_height_standing_left_mm"),
    ("Rt. Infraorbitale", "infraorbitale_height_standing_right_mm"),
    ("Suprasternale", "suprasternale_height_mm"),
    ("Lt. Trochanterion", "trochanterion_height_left_mm"),
    ("Rt. Trochanterion", "trochanterion_height_right_mm"),
)

ROW_BOUND_ANCHORS = {
    "neck": ("Rt. Clavicale", "Lt. Clavicale"),
    "chest": ("Rt. Axilla, Ant", "Lt. Axilla, Ant", "Rt. Axilla, Post.", "Lt. Axilla, Post."),
    "underbust": ("Rt. 10th Rib", "Lt. 10th Rib"),
    "waist": ("Rt. Iliocristale", "Lt. Iliocristale", "Rt. 10th Rib", "Lt. 10th Rib"),
    "hips": ("Rt. Trochanterion", "Lt. Trochanterion"),
}
ROW_MIN_WIDTH_M = {"neck": 0.14, "chest": 0.30, "underbust": 0.32, "waist": 0.32, "hips": 0.40}
ROW_MARGIN_M = {"neck": 0.015, "chest": 0.0, "underbust": 0.045, "waist": 0.045, "hips": 0.045}


@dataclass(frozen=True)
class Plane:
    origin: np.ndarray
    normal: np.ndarray
    lateral: np.ndarray
    depth: np.ndarray


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-dir", type=Path, default=DEFAULT_SOURCE_DIR)
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--scan-id", action="append", default=[])
    parser.add_argument("--browser-triangles", type=int, default=TARGET_BROWSER_TRIANGLES)
    return parser.parse_args()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        while block := source.read(1024 * 1024):
            digest.update(block)
    return digest.hexdigest()


def finite(value: Any) -> float | None:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if math.isfinite(number) else None


def round_float(value: float | np.floating, digits: int = 5) -> float:
    return round(float(value), digits)


def points_json(points: np.ndarray, digits: int = 5) -> list[list[float]]:
    return [[round_float(value, digits) for value in point] for point in np.asarray(points)]


def parse_lnd(path: Path) -> dict[str, np.ndarray]:
    """Parse the actual source LND coordinates, which are explicitly mm."""
    landmarks: dict[str, np.ndarray] = {}
    for raw_line in path.read_text(errors="replace").splitlines():
        parts = raw_line.split()
        if len(parts) < 8 or not parts[0].isdigit():
            continue
        try:
            coordinates = np.asarray([float(parts[4]), float(parts[5]), float(parts[6])], dtype=np.float64)
        except ValueError:
            continue
        if np.isfinite(coordinates).all() and np.any(np.abs(coordinates) > 1e-9):
            landmarks[" ".join(parts[7:]).rstrip("#").strip()] = coordinates
    if not landmarks:
        raise ValueError(f"No valid landmarks in {path}")
    return landmarks


def load_profiles(path: Path, wanted: set[str]) -> dict[str, dict[str, Any]]:
    records: dict[str, dict[str, Any]] = {}
    for line in path.read_text().splitlines():
        if not line.strip():
            continue
        record = json.loads(line)
        scan_id = str(record.get("scan_id") or "")
        if scan_id in wanted:
            record["_manifestRecordSha256"] = hashlib.sha256(line.encode()).hexdigest()
            records[scan_id] = record
    missing = wanted - records.keys()
    if missing:
        raise RuntimeError(f"Missing manifest profiles: {', '.join(sorted(missing))}")
    return records


def source_stem(record: dict[str, Any]) -> str:
    source = record.get("source", {})
    mesh_name = Path(str(source.get("mesh") or "")).name
    landmark_name = Path(str(source.get("landmarks") or "")).name
    if not mesh_name.endswith(".ply.gz") or not landmark_name.endswith(".lnd"):
        raise RuntimeError(f"Missing source filenames for {record.get('scan_id')}")
    mesh_stem = mesh_name.removesuffix(".ply.gz")
    landmark_stem = landmark_name.removesuffix(".lnd")
    if mesh_stem.lower() != landmark_stem.lower():
        raise RuntimeError(
            f"PLY/LND source stems disagree for {record.get('scan_id')}: "
            f"{mesh_stem}, {landmark_stem}"
        )
    return mesh_stem


def load_ply(path: Path) -> tuple[np.ndarray, np.ndarray]:
    with gzip.open(path, "rb") as source:
        loaded = trimesh.load(source, file_type="ply", process=False, maintain_order=True)
    if isinstance(loaded, trimesh.Scene):
        loaded = loaded.dump(concatenate=True)
    if not isinstance(loaded, trimesh.Trimesh):
        raise TypeError(f"Expected Trimesh from {path}, got {type(loaded)!r}")
    vertices = np.asarray(loaded.vertices, dtype=np.float64)
    faces = np.asarray(loaded.faces, dtype=np.int64)
    if len(vertices) < 100 or len(faces) < 100:
        raise ValueError(f"Implausibly small PLY {path}")
    return vertices, faces


def scale_hypotheses(
    raw_vertices: np.ndarray,
    landmarks_mm: dict[str, np.ndarray],
    stature_cm: float,
) -> dict[str, Any]:
    landmark_metres = np.asarray(list(landmarks_mm.values()), dtype=np.float64) / 1000.0
    candidates: list[dict[str, Any]] = []
    for factor, raw_unit in ((1.0, "metre"), (0.001, "millimetre")):
        vertices_m = raw_vertices * factor
        distances_m, _ = cKDTree(vertices_m).query(landmark_metres, k=1, workers=-1)
        median_mm = float(np.median(distances_m) * 1000.0)
        p95_mm = float(np.quantile(distances_m, 0.95) * 1000.0)
        extent_m = float(np.ptp(vertices_m[:, 2]))
        stature_error_mm = abs(extent_m - stature_cm / 100.0) * 1000.0
        score = median_mm + 0.25 * p95_mm + 0.25 * stature_error_mm
        candidates.append(
            {
                "rawUnitHypothesis": raw_unit,
                "rawToMetresFactor": factor,
                "landmarkNearestMedianMm": round_float(median_mm, 4),
                "landmarkNearestP95Mm": round_float(p95_mm, 4),
                "meshVerticalExtentCm": round_float(extent_m * 100.0, 4),
                "recordedStatureCm": round_float(stature_cm, 4),
                "statureDifferenceCm": round_float(stature_error_mm / 10.0, 4),
                "score": round_float(score, 4),
            }
        )
    candidates.sort(key=lambda item: item["score"])
    winner, runner_up = candidates
    ratio = float(runner_up["score"]) / max(float(winner["score"]), 1e-9)
    return {
        "chosenRawUnit": winner["rawUnitHypothesis"],
        "rawToMetresFactor": winner["rawToMetresFactor"],
        "selectionMethod": "minimum LND-to-PLY nearest-surface error plus stature consistency",
        "selectionConfidenceRatio": round_float(ratio, 3),
        "ambiguous": ratio < 4.0,
        "hypotheses": candidates,
    }


def unit_vector(vector: np.ndarray) -> np.ndarray:
    length = float(np.linalg.norm(vector))
    if length <= 1e-10:
        raise ValueError("Cannot normalize zero vector")
    return vector / length


def canonical_axes(landmarks_m: dict[str, np.ndarray]) -> tuple[np.ndarray, dict[str, Any]]:
    lateral_candidates = []
    used_pairs = []
    for right_name, left_name in LATERAL_LANDMARK_PAIRS:
        right = landmarks_m.get(right_name)
        left = landmarks_m.get(left_name)
        if right is None or left is None:
            continue
        vector = left - right
        vector[2] = 0.0
        if np.linalg.norm(vector) > 1e-6:
            lateral_candidates.append(unit_vector(vector))
            used_pairs.append([right_name, left_name])
    if not lateral_candidates:
        raise ValueError("No bilateral LND pair for anatomical orientation")
    lateral = unit_vector(np.median(np.asarray(lateral_candidates), axis=0))
    anterior = [landmarks_m[name] for name in ANTERIOR_NAMES if name in landmarks_m]
    posterior = [landmarks_m[name] for name in POSTERIOR_NAMES if name in landmarks_m]
    if not anterior or not posterior:
        raise ValueError("No anterior/posterior LND evidence")
    front = np.mean(anterior, axis=0) - np.mean(posterior, axis=0)
    front[2] = 0.0
    front -= lateral * float(np.dot(front, lateral))
    front = unit_vector(front)
    # Subject right->left, posterior->anterior, and up is an intentionally
    # left-handed anatomical display frame.  Do not flip `front` merely to
    # force a positive determinant: doing so silently reverses depth while
    # leaving the X/Z picture unchanged.  This matches the verified renderer.
    vertical = np.asarray([0.0, 0.0, 1.0], dtype=np.float64)
    axes = np.vstack((lateral, front, vertical))
    return axes, {
        "lateralAxisSource": "component median of semantic right-to-left LND pairs",
        "lateralPairs": used_pairs,
        "frontAxisSource": "mean anterior LND minus mean posterior LND, orthogonalized to lateral",
        "handedness": "left-handed anatomical display convention",
        "axisRowsRawScannerCoordinates": points_json(axes, 8),
    }


def canonicalize(
    vertices_m: np.ndarray,
    landmarks_m: dict[str, np.ndarray],
    axes: np.ndarray,
    record: dict[str, Any],
) -> tuple[np.ndarray, dict[str, np.ndarray], dict[str, Any]]:
    vertices = vertices_m @ axes.T
    landmarks = {name: point @ axes.T for name, point in landmarks_m.items()}
    minimum = vertices.min(axis=0)
    maximum = vertices.max(axis=0)
    lateral_midpoints = [
        (landmarks[right_name][0] + landmarks[left_name][0]) / 2.0
        for right_name, left_name in LATERAL_LANDMARK_PAIRS
        if right_name in landmarks and left_name in landmarks
    ]
    anterior_y = [landmarks[name][1] for name in ANTERIOR_NAMES if name in landmarks]
    posterior_y = [landmarks[name][1] for name in POSTERIOR_NAMES if name in landmarks]
    center_x = float(np.median(lateral_midpoints)) if lateral_midpoints else float((minimum[0] + maximum[0]) / 2.0)
    center_y = (
        float((np.mean(anterior_y) + np.mean(posterior_y)) / 2.0)
        if anterior_y and posterior_y
        else float((minimum[1] + maximum[1]) / 2.0)
    )
    center_xy = np.asarray([center_x, center_y], dtype=np.float64)
    vertices[:, :2] -= center_xy
    for name in landmarks:
        landmarks[name] = landmarks[name].copy()
        landmarks[name][:2] -= center_xy

    sources = {**record.get("measurements_mm", {}), **record.get("extracted_standing_mm", {})}
    offsets = []
    offset_details = []
    for landmark_name, height_key in VERTICAL_ALIGNMENT_ANCHORS:
        if landmark_name not in landmarks:
            continue
        height_mm = finite(sources.get(height_key))
        if height_mm is None:
            continue
        offset = height_mm / 1000.0 - float(landmarks[landmark_name][2])
        offsets.append(offset)
        offset_details.append({"landmark": landmark_name, "heightKey": height_key, "offsetMm": round_float(offset * 1000.0, 3)})
    method = "mesh-minimum-fallback"
    if len(offsets) >= 2:
        median = float(np.median(offsets))
        stable = [value for value in offsets if abs(value - median) <= 0.025]
        if len(stable) >= 2:
            z_offset = float(np.median(stable))
            method = "WEAR exact LND/standing-height median"
        else:
            z_offset = -float(vertices[:, 2].min())
    else:
        z_offset = -float(vertices[:, 2].min())
    vertices[:, 2] += z_offset
    for name in landmarks:
        landmarks[name][2] += z_offset
    return vertices, landmarks, {
        "projection": "orthographic anatomical front",
        "coordinateSystem": {"x": "subject right-to-left", "y": "posterior-to-anterior depth", "z": "floor-to-head"},
        "units": "metres internally; centimetres in JSON",
        "horizontalCenterMethod": "median bilateral LND midpoint for X; anterior/posterior LND midpoint for Y",
        "horizontalCenterRawCanonicalCm": points_json(center_xy[None, :] * 100.0)[0],
        "verticalAlignmentMethod": method,
        "verticalOffsetMm": round_float(z_offset * 1000.0, 3),
        "verticalOffsetEvidence": offset_details,
    }


def largest_component_mask(mask: np.ndarray) -> np.ndarray:
    count, labels, stats, _ = cv2.connectedComponentsWithStats(mask.astype(np.uint8), connectivity=8)
    if count <= 1:
        return mask.astype(bool)
    largest = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    return labels == largest


def projection_outline(vertices: np.ndarray, faces: np.ndarray) -> tuple[np.ndarray, dict[str, Any]]:
    xz = vertices[:, [0, 2]]
    minimum = xz.min(axis=0)
    maximum = xz.max(axis=0)
    padding_m = 0.025
    origin = minimum - padding_m
    width = int(math.ceil((maximum[0] - minimum[0] + 2.0 * padding_m) * RASTER_PIXELS_PER_METRE)) + 1
    height = int(math.ceil((maximum[1] - minimum[1] + 2.0 * padding_m) * RASTER_PIXELS_PER_METRE)) + 1
    pixel = np.rint((xz - origin) * RASTER_PIXELS_PER_METRE).astype(np.int32)
    pixel[:, 1] = height - 1 - pixel[:, 1]
    mask = np.zeros((height, width), dtype=np.uint8)
    floor_limit = float(vertices[:, 2].min() + 0.018)
    face_keep = np.max(vertices[faces, 2], axis=1) > floor_limit
    triangles = pixel[faces[face_keep]]
    for start in range(0, len(triangles), 20_000):
        cv2.fillPoly(mask, list(triangles[start : start + 20_000]), 255)
    cleaned = largest_component_mask(mask > 0).astype(np.uint8) * 255
    contours, _ = cv2.findContours(cleaned, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    if not contours:
        raise ValueError("Projected mesh produced no silhouette outline")
    contour_px = max(contours, key=cv2.contourArea)
    epsilon = max(0.75, 0.001 * height)
    simplified = cv2.approxPolyDP(contour_px, epsilon, True)[:, 0, :].astype(np.float64)
    simplified[:, 1] = height - 1 - simplified[:, 1]
    outline_m = simplified / RASTER_PIXELS_PER_METRE + origin
    if len(outline_m) < 20:
        raise ValueError("Projected silhouette outline is too small")
    return outline_m, {
        "method": "orthographic projection of PLY triangles; largest connected external contour",
        "internalRasterPixelsPerMetre": RASTER_PIXELS_PER_METRE,
        "internalMaskPersisted": False,
        "outlinePointCount": len(outline_m),
        "boundsCm": {
            "minX": round_float(outline_m[:, 0].min() * 100.0),
            "maxX": round_float(outline_m[:, 0].max() * 100.0),
            "minZ": round_float(outline_m[:, 1].min() * 100.0),
            "maxZ": round_float(outline_m[:, 1].max() * 100.0),
        },
    }


def horizontal_outline_runs(outline_xz_m: np.ndarray, height_m: float) -> list[tuple[float, float]]:
    """Intersect an ordered closed front outline with one horizontal line.

    Only X/Z is inspected.  Multiple runs are preserved so an arm separated
    from the torso cannot silently enlarge the central body width.
    """
    points = np.asarray(outline_xz_m, dtype=np.float64)
    intersections: list[float] = []
    for first, second in zip(points, np.vstack((points[1:], points[:1]))):
        z1, z2 = float(first[1]), float(second[1])
        if not ((z1 <= height_m < z2) or (z2 <= height_m < z1)):
            continue
        ratio = (height_m - z1) / (z2 - z1)
        intersections.append(float(first[0] + ratio * (second[0] - first[0])))
    intersections.sort()
    # Raster contour simplification can create nearly duplicate crossings at
    # a corner; collapse them before pairing inside/outside transitions.
    unique: list[float] = []
    for value in intersections:
        if not unique or abs(value - unique[-1]) > 0.0005:
            unique.append(value)
    if len(unique) % 2:
        return []
    return [(unique[index], unique[index + 1]) for index in range(0, len(unique), 2)]


def central_outline_run(outline_xz_m: np.ndarray, height_m: float) -> dict[str, Any] | None:
    runs = horizontal_outline_runs(outline_xz_m, height_m)
    if not runs:
        return None
    containing = [run for run in runs if run[0] <= 0.0 <= run[1]]
    if containing:
        selected = max(containing, key=lambda run: run[1] - run[0])
        selection = "run containing canonical body center"
        contains_center = True
    else:
        selected = min(runs, key=lambda run: abs((run[0] + run[1]) / 2.0))
        selection = "nearest run; canonical center fell in a gap"
        contains_center = False
    return {
        "leftM": float(selected[0]),
        "rightM": float(selected[1]),
        "widthM": float(selected[1] - selected[0]),
        "runCount": len(runs),
        "containsCanonicalCenter": contains_center,
        "selection": selection,
        "allRunsM": runs,
    }


def _front2d_point(landmarks: dict[str, np.ndarray], name: str) -> np.ndarray | None:
    point = landmarks.get(name)
    return np.asarray([point[0], point[2]], dtype=np.float64) if point is not None else None


def _front2d_midpoint(landmarks: dict[str, np.ndarray], first: str, second: str) -> np.ndarray | None:
    a = _front2d_point(landmarks, first)
    b = _front2d_point(landmarks, second)
    return (a + b) / 2.0 if a is not None and b is not None else None


def sapiens_equivalent_points(landmarks: dict[str, np.ndarray]) -> dict[str, dict[str, Any]]:
    """Build only the WEAR points with a defensible 2D pose equivalent.

    These are not asserted to be identical anatomical protocols.  They remain
    conditional until the query extractor uses the named Sapiens point and a
    measured cross-model bias gate passes.
    """
    definitions: dict[str, tuple[np.ndarray | None, str, str]] = {
        "left_shoulder": (_front2d_point(landmarks, "Lt. Acromion"), "Lt. Acromion", "Sapiens left shoulder"),
        "right_shoulder": (_front2d_point(landmarks, "Rt. Acromion"), "Rt. Acromion", "Sapiens right shoulder"),
        "left_elbow": (
            _front2d_midpoint(landmarks, "Lt. Humeral Lateral Epicn", "Lt. Humeral Medial Epicn"),
            "midpoint(Lt. Humeral Lateral Epicn,Lt. Humeral Medial Epicn)",
            "Sapiens left elbow",
        ),
        "right_elbow": (
            _front2d_midpoint(landmarks, "Rt. Humeral Lateral Epicn", "Rt. Humeral Medial Epicn"),
            "midpoint(Rt. Humeral Lateral Epicn,Rt. Humeral Medial Epicn)",
            "Sapiens right elbow",
        ),
        "left_wrist": (
            _front2d_midpoint(landmarks, "Lt. Radial Styloid", "Lt. Ulnar Styloid"),
            "midpoint(Lt. Radial Styloid,Lt. Ulnar Styloid)",
            "Sapiens left wrist",
        ),
        "right_wrist": (
            _front2d_midpoint(landmarks, "Rt. Radial Styloid", "Rt. Ulnar Styloid"),
            "midpoint(Rt. Radial Styloid,Rt. Ulnar Styloid)",
            "Sapiens right wrist",
        ),
        "left_hip": (_front2d_point(landmarks, "Lt. Trochanterion"), "Lt. Trochanterion", "Sapiens left hip"),
        "right_hip": (_front2d_point(landmarks, "Rt. Trochanterion"), "Rt. Trochanterion", "Sapiens right hip"),
        "left_knee": (
            _front2d_midpoint(landmarks, "Lt. Femoral Lateral Epicn", "Lt. Femoral Medial Epicn"),
            "midpoint(Lt. Femoral Lateral Epicn,Lt. Femoral Medial Epicn)",
            "Sapiens left knee",
        ),
        "right_knee": (
            _front2d_midpoint(landmarks, "Rt. Femoral Lateral Epicn", "Rt. Femoral Medial Epicn"),
            "midpoint(Rt. Femoral Lateral Epicn,Rt. Femoral Medial Epicn)",
            "Sapiens right knee",
        ),
        "left_ankle": (
            _front2d_midpoint(landmarks, "Lt. Lateral Malleolus", "Lt. Medial Malleolus"),
            "midpoint(Lt. Lateral Malleolus,Lt. Medial Malleolus)",
            "Sapiens left ankle",
        ),
        "right_ankle": (
            _front2d_midpoint(landmarks, "Rt. Lateral Malleolus", "Rt. Medial Malleolus"),
            "midpoint(Rt. Lateral Malleolus,Rt. Medial Malleolus)",
            "Sapiens right ankle",
        ),
    }
    return {
        name: {"pointM": point, "wearDefinition": wear, "queryEquivalent": query}
        for name, (point, wear, query) in definitions.items()
        if point is not None
    }


def build_leakage_safe_2d_descriptor(
    outline_xz_m: np.ndarray,
    landmarks: dict[str, np.ndarray],
    stature_cm: float,
    front2d_rows: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    """Create front-X/Z-only features without tape, circumference, or depth."""
    stature_m = stature_cm / 100.0
    if not 1.2 <= stature_m <= 2.4:
        raise ValueError(f"Invalid stature for descriptor: {stature_cm}")
    default_features: dict[str, float] = {}
    conditional_features: dict[str, float] = {}
    audit_only_unsafe_features: dict[str, float] = {}
    features: list[dict[str, Any]] = []

    for fraction in SAFE_TORSO_HEIGHT_FRACTIONS:
        run = central_outline_run(outline_xz_m, stature_m * fraction)
        feature_id = f"outline.fixed_height.{fraction:.2f}.central_width"
        if run is None:
            features.append(
                {
                    "id": feature_id,
                    "kind": "visible central silhouette width",
                    "heightFraction": fraction,
                    "available": False,
                    "rankingStatus": "unavailable",
                    "reason": "no closed outline run at this height",
                }
            )
            continue
        normalized = run["widthM"] / stature_m
        eligible = bool(run["containsCanonicalCenter"] and 0.08 <= normalized <= 0.45)
        if eligible:
            default_features[feature_id] = normalized
        features.append(
            {
                "id": feature_id,
                "kind": "visible central silhouette width",
                "available": True,
                "heightFraction": fraction,
                "heightCm": round_float(stature_cm * fraction),
                "leftCm": round_float(run["leftM"] * 100.0),
                "rightCm": round_float(run["rightM"] * 100.0),
                "valueCm": round_float(run["widthM"] * 100.0),
                "valueNormalizedByKnownHeight": round_float(normalized, 9),
                "runCount": run["runCount"],
                "selection": run["selection"],
                "usesOnly": ["front_x", "vertical_z", "known_height"],
                "rankingStatus": "default-safe" if eligible else "unsafe",
                "unsafeReason": None if eligible else "center gap or implausible torso-width ratio",
                "queryRequirement": "same central visible-outline run at the same known-height fraction",
            }
        )

    # Exact WEAR anatomical planes are essential, but conditional: the query
    # must locate the same semantic row independently.  Only the X end points
    # of the arm-excluded central torso section enter the feature vector.  The
    # accompanying outer-outline width is retained as a no-depth diagnostic,
    # but is not scored because a projected arm can merge into that outline.
    for row_name in ("chest", "underbust", "waist", "hips"):
        row = front2d_rows.get(row_name, {})
        height_cm = finite(row.get("heightCm"))
        breadth_cm = finite(row.get("breadthCm"))
        endpoints_cm = row.get("frontProjectionCm")
        source_quality_flags = list(row.get("sourceQualityFlags") or [])
        feature_id = f"section.semantic_row.{row_name}.central_breadth"
        run = central_outline_run(outline_xz_m, height_cm / 100.0) if height_cm is not None else None
        if height_cm is None or breadth_cm is None or not isinstance(endpoints_cm, list) or len(endpoints_cm) != 2:
            features.append(
                {
                    "id": feature_id,
                    "kind": "arm-excluded central torso breadth at exact WEAR row",
                    "available": False,
                    "rankingStatus": "unavailable",
                    "reason": "row height or certified A-B section endpoints unavailable",
                }
            )
            continue
        normalized = breadth_cm / stature_cm
        conditional_features[feature_id] = normalized
        features.append(
            {
                "id": feature_id,
                "kind": "arm-excluded central torso breadth at exact WEAR row",
                "available": True,
                "semanticRow": row_name,
                "heightCm": round_float(height_cm),
                "heightFraction": round_float(height_cm / stature_cm, 9),
                "frontProjectionCm": endpoints_cm,
                "valueCm": round_float(breadth_cm),
                "valueNormalizedByKnownHeight": round_float(normalized, 9),
                "source": "real PLY central-torso plane intersection A-B X extent",
                "sourceQualityFlags": source_quality_flags,
                "breadthQualityBoundary": "reconstructed sections may supply breadth, but never a certified circumference",
                "usesOnlyInRankingVector": ["A_x", "B_x", "known_height", "independent_semantic_row_height"],
                "explicitlyExcludedFromRankingVector": ["Y/depth", "perimeter", "circumference", "recorded tape"],
                "rankingStatus": "conditional-safe",
                "queryRequirement": "query row must be independently confirmed as the same semantic anatomical plane",
            }
        )
        if run is not None:
            outline_normalized = run["widthM"] / stature_m
            features.append(
                {
                    "id": f"outline.semantic_row.{row_name}.central_width",
                    "kind": "visible projected outer-outline width at exact WEAR row",
                    "available": True,
                    "semanticRow": row_name,
                    "heightCm": round_float(height_cm),
                    "heightFraction": round_float(height_cm / stature_cm, 9),
                    "leftCm": round_float(run["leftM"] * 100.0),
                    "rightCm": round_float(run["rightM"] * 100.0),
                    "valueCm": round_float(run["widthM"] * 100.0),
                    "valueNormalizedByKnownHeight": round_float(outline_normalized, 9),
                    "runCount": run["runCount"],
                    "selection": run["selection"],
                    "usesOnly": ["front_x", "vertical_z", "known_height"],
                    "rankingStatus": "diagnostic-safe-not-scored",
                    "notScoredReason": "outer projection can include an arm merged with the torso",
                }
            )

    equivalents = sapiens_equivalent_points(landmarks)
    pair_specs = (
        (
            "landmark.shoulder_span.horizontal",
            "left_shoulder",
            "right_shoulder",
            "conditional-safe",
            "mapped Sapiens shoulder endpoints plus cross-model landmark-bias validation",
        ),
        (
            "landmark.hip_span.horizontal",
            "left_hip",
            "right_hip",
            "audit-only-unsafe",
            "WEAR Trochanterion is a lateral surface landmark; Sapiens hip is a joint keypoint",
        ),
    )
    segment_specs = (
        ("segment.left_upper_arm", "left_shoulder", "left_elbow", "moderate: out-of-plane arm rotation shortens 2D length"),
        ("segment.right_upper_arm", "right_shoulder", "right_elbow", "moderate: out-of-plane arm rotation shortens 2D length"),
        ("segment.left_forearm", "left_elbow", "left_wrist", "moderate: out-of-plane arm rotation shortens 2D length"),
        ("segment.right_forearm", "right_elbow", "right_wrist", "moderate: out-of-plane arm rotation shortens 2D length"),
        ("segment.left_thigh", "left_hip", "left_knee", "moderate: leg abduction and camera yaw affect 2D length"),
        ("segment.right_thigh", "right_hip", "right_knee", "moderate: leg abduction and camera yaw affect 2D length"),
        ("segment.left_lower_leg", "left_knee", "left_ankle", "low-to-moderate: out-of-plane stance affects 2D length"),
        ("segment.right_lower_leg", "right_knee", "right_ankle", "low-to-moderate: out-of-plane stance affects 2D length"),
    )
    for feature_id, left_name, right_name, ranking_status, requirement in pair_specs:
        if left_name not in equivalents or right_name not in equivalents:
            continue
        left = equivalents[left_name]["pointM"]
        right = equivalents[right_name]["pointM"]
        value_m = abs(float(left[0] - right[0]))
        normalized = value_m / stature_m
        if ranking_status == "conditional-safe":
            conditional_features[feature_id] = normalized
        else:
            audit_only_unsafe_features[feature_id] = normalized
        features.append(
            {
                "id": feature_id,
                "kind": "semantically mapped projected landmark span",
                "available": True,
                "endpointNames": [left_name, right_name],
                "wearDefinitions": [equivalents[left_name]["wearDefinition"], equivalents[right_name]["wearDefinition"]],
                "queryEquivalents": [equivalents[left_name]["queryEquivalent"], equivalents[right_name]["queryEquivalent"]],
                "pointsCm": points_json(np.asarray([left, right]) * 100.0),
                "valueCm": round_float(value_m * 100.0),
                "valueNormalizedByKnownHeight": round_float(normalized, 9),
                "usesOnly": ["front_x", "vertical_z", "known_height"],
                "rankingStatus": ranking_status,
                "queryRequirement" if ranking_status == "conditional-safe" else "unsafeReason": requirement,
            }
        )
    for feature_id, first_name, second_name, sensitivity in segment_specs:
        if first_name not in equivalents or second_name not in equivalents:
            continue
        first = equivalents[first_name]["pointM"]
        second = equivalents[second_name]["pointM"]
        value_m = float(np.linalg.norm(second - first))
        normalized = value_m / stature_m
        audit_only_unsafe_features[feature_id] = normalized
        features.append(
            {
                "id": feature_id,
                "kind": "semantically mapped projected limb segment",
                "available": True,
                "endpointNames": [first_name, second_name],
                "wearDefinitions": [equivalents[first_name]["wearDefinition"], equivalents[second_name]["wearDefinition"]],
                "queryEquivalents": [equivalents[first_name]["queryEquivalent"], equivalents[second_name]["queryEquivalent"]],
                "pointsCm": points_json(np.asarray([first, second]) * 100.0),
                "valueCm": round_float(value_m * 100.0),
                "valueNormalizedByKnownHeight": round_float(normalized, 9),
                "usesOnly": ["front_x", "vertical_z", "known_height"],
                "poseSensitivity": sensitivity,
                "rankingStatus": "audit-only-unsafe",
                "unsafeReason": "articulation and out-of-plane pose are not normalized",
            }
        )

    return {
        "schemaVersion": "wear-leakage-safe-front2d/v1",
        "coordinateSystem": "canonical front X/Z in centimetres; values normalized by user-known height",
        "inputsUsed": [
            "real PLY visible front outline X/Z",
            "real LND projected X/Z",
            "recorded/user-known stature",
            "WEAR vertical row height and central-section A-B X endpoints for conditional semantic-row breadths",
        ],
        "inputsForbiddenAndUnused": [
            "canonical or raw Y/depth",
            "front-to-back depth",
            "circumference",
            "recorded tape value",
            "closed-loop perimeter",
            "BMI",
            "weight as a shape feature",
        ],
        "defaultRankingFeatureVector": {name: round_float(value, 9) for name, value in sorted(default_features.items())},
        "conditionalFeatureVector": {name: round_float(value, 9) for name, value in sorted(conditional_features.items())},
        "auditOnlyUnsafeFeatureVector": {
            name: round_float(value, 9) for name, value in sorted(audit_only_unsafe_features.items())
        },
        "features": features,
        "unsafeFeatureClasses": [
            "raw pointwise mesh-vertex distances before articulation normalization",
            "full outer width where arms can join the torso",
            "projected limb lengths when the query and candidate have different out-of-plane pose",
            "any Y/depth, circumference, tape, or perimeter value",
        ],
        "releaseStatus": "private validation only",
    }


def canonical_projection_audit(
    axes: np.ndarray,
    vertices: np.ndarray,
    landmarks: dict[str, np.ndarray],
    record: dict[str, Any],
    scale_evidence: dict[str, Any],
) -> dict[str, Any]:
    gram_error = float(np.max(np.abs(axes @ axes.T - np.eye(3))))
    determinant = float(np.linalg.det(axes))
    pair_checks = []
    for right_name, left_name in LATERAL_LANDMARK_PAIRS:
        if right_name in landmarks and left_name in landmarks:
            delta = float(landmarks[left_name][0] - landmarks[right_name][0])
            pair_checks.append({"right": right_name, "left": left_name, "leftMinusRightCm": round_float(delta * 100.0), "correct": delta > 0.0})
    anterior = [landmarks[name][1] for name in ANTERIOR_NAMES if name in landmarks]
    posterior = [landmarks[name][1] for name in POSTERIOR_NAMES if name in landmarks]
    anterior_delta_cm = (float(np.mean(anterior) - np.mean(posterior)) * 100.0) if anterior and posterior else None
    correct_pairs = sum(bool(item["correct"]) for item in pair_checks)
    pair_fraction = correct_pairs / len(pair_checks) if pair_checks else 0.0
    mesh_min_cm = float(vertices[:, 2].min() * 100.0)
    mesh_max_cm = float(vertices[:, 2].max() * 100.0)
    stature_cm = float(record["height_cm"])
    orientation_valid = bool(
        gram_error <= 1e-6
        and -1.00001 <= determinant <= -0.99999
        and pair_fraction >= 0.95
        and anterior_delta_cm is not None
        and anterior_delta_cm > 0.0
        and not scale_evidence.get("ambiguous")
    )
    return {
        "status": "orientation-correct-pose-not-normalized" if orientation_valid else "invalid",
        "frontProjectionValid": orientation_valid,
        "axisOrthogonalityMaximumError": round_float(gram_error, 12),
        "axisDeterminant": round_float(determinant, 9),
        "expectedDeterminant": -1.0,
        "expectedHandedness": "left-handed: X subject right-to-left, Y posterior-to-anterior, Z up",
        "bilateralPairChecks": pair_checks,
        "bilateralCorrectFraction": round_float(pair_fraction, 6),
        "meanAnteriorMinusPosteriorCm": round_float(anterior_delta_cm, 6) if anterior_delta_cm is not None else None,
        "meshVerticalBoundsCm": [round_float(mesh_min_cm), round_float(mesh_max_cm)],
        "recordedStatureCm": round_float(stature_cm),
        "meshTopDifferenceFromStatureCm": round_float(mesh_max_cm - stature_cm),
        "normalization": {
            "metricUnitResolved": not scale_evidence.get("ambiguous"),
            "anatomicalYawNormalized": True,
            "horizontalTranslationNormalized": True,
            "floorTranslationNormalized": True,
            "scaleNormalized": False,
            "descriptorNormalizedByKnownHeight": True,
            "articulationNormalized": False,
            "pointwiseRawMeshOverlaySafeForRanking": False,
            "safeUse": "front-outline width profiles and semantically equivalent X/Z landmark features only",
        },
    }


def _cluster_projected_mesh(
    projected_cm: np.ndarray,
    faces: np.ndarray,
    cell_cm: float,
) -> tuple[np.ndarray, np.ndarray]:
    minimum = projected_cm.min(axis=0)
    keys = np.floor((projected_cm - minimum) / cell_cm).astype(np.int64)
    _, inverse = np.unique(keys, axis=0, return_inverse=True)
    counts = np.bincount(inverse)
    clustered = np.column_stack(
        [np.bincount(inverse, weights=projected_cm[:, axis]) / counts for axis in range(2)]
    )
    remapped = inverse[faces]
    valid = (remapped[:, 0] != remapped[:, 1]) & (remapped[:, 1] != remapped[:, 2]) & (remapped[:, 2] != remapped[:, 0])
    remapped = remapped[valid]
    if len(remapped):
        canonical = np.sort(remapped, axis=1)
        _, keep = np.unique(canonical, axis=0, return_index=True)
        remapped = remapped[np.sort(keep)]
        triangle_points = clustered[remapped]
        signed_double_area = (
            (triangle_points[:, 1, 0] - triangle_points[:, 0, 0]) * (triangle_points[:, 2, 1] - triangle_points[:, 0, 1])
            - (triangle_points[:, 1, 1] - triangle_points[:, 0, 1]) * (triangle_points[:, 2, 0] - triangle_points[:, 0, 0])
        )
        remapped = remapped[np.abs(signed_double_area) >= max(1e-5, cell_cm * cell_cm * 0.02)]
    used, compact_inverse = np.unique(remapped.reshape(-1), return_inverse=True)
    return clustered[used], compact_inverse.reshape((-1, 3)).astype(np.int32)


def browser_mesh_2d(vertices: np.ndarray, faces: np.ndarray, target_triangles: int) -> tuple[np.ndarray, np.ndarray, dict[str, Any]]:
    projected_cm = vertices[:, [0, 2]] * 100.0
    floor_limit = float(vertices[:, 2].min() + 0.018)
    selected_faces = faces[np.max(vertices[faces, 2], axis=1) > floor_limit]
    low = 0.03
    high = max(4.0, float(np.max(np.ptp(projected_cm, axis=0))) / 2.0)
    best = None
    for _ in range(16):
        cell = (low + high) / 2.0
        candidate_vertices, candidate_faces = _cluster_projected_mesh(projected_cm, selected_faces, cell)
        best = (candidate_vertices, candidate_faces, cell)
        if len(candidate_faces) > target_triangles:
            low = cell
        else:
            high = cell
    assert best is not None
    candidates = []
    for cell in (max(0.08, best[2] * 0.90), best[2], best[2] * 1.10):
        verts, tris = _cluster_projected_mesh(projected_cm, selected_faces, cell)
        candidates.append((abs(len(tris) - target_triangles), verts, tris, cell))
    _, result_vertices, result_faces, cell = min(candidates, key=lambda item: item[0])
    return result_vertices, result_faces, {
        "method": "2D vertex-cluster decimation of exact canonical PLY projection",
        "units": "centimetres",
        "targetTriangleCount": target_triangles,
        "triangleCount": int(len(result_faces)),
        "vertexCount": int(len(result_vertices)),
        "clusterCellCm": round_float(cell, 5),
        "depthUsed": False,
    }


def polygon_area(points: np.ndarray) -> float:
    return float(0.5 * np.sum(points[:, 0] * np.roll(points[:, 1], -1) - np.roll(points[:, 0], -1) * points[:, 1]))


def point_in_polygon(point: np.ndarray, polygon: np.ndarray) -> bool:
    x, y = float(point[0]), float(point[1])
    inside = False
    previous = polygon[-1]
    for current in polygon:
        if (current[1] > y) != (previous[1] > y):
            crossing_x = (previous[0] - current[0]) * (y - current[1]) / (previous[1] - current[1]) + current[0]
            if x < crossing_x:
                inside = not inside
        previous = current
    return inside


def _ordered_component(component: set[tuple[int, int]], neighbors: dict, points: dict) -> tuple[np.ndarray, bool]:
    endpoints = [key for key in component if len(neighbors[key]) == 1]
    start = endpoints[0] if endpoints else min(component)
    ordered = []
    previous = None
    current = start
    closed = False
    for _ in range(len(component) + 2):
        ordered.append(current)
        choices = [key for key in neighbors[current] if key != previous]
        if not choices:
            break
        if len(choices) == 1 or previous is None:
            following = choices[0]
        else:
            incoming = points[current] - points[previous]
            following = max(
                choices,
                key=lambda candidate: float(np.dot(incoming, points[candidate] - points[current]))
                / max(np.linalg.norm(incoming) * np.linalg.norm(points[candidate] - points[current]), 1e-12),
            )
        if following == start:
            closed = True
            break
        if following in ordered:
            break
        previous, current = current, following
    return np.asarray([points[key] for key in ordered], dtype=np.float64), closed


def section_components(vertices: np.ndarray, faces: np.ndarray, plane: Plane, snap_m: float = 0.0002) -> list[dict[str, Any]]:
    triangle_points = vertices[faces]
    signed = (triangle_points - plane.origin) @ plane.normal
    segments: list[tuple[np.ndarray, np.ndarray]] = []
    epsilon = 1e-10
    for edge_a, edge_b in ((0, 1), (1, 2), (2, 0)):
        da = signed[:, edge_a]
        db = signed[:, edge_b]
        crossing = (da * db <= 0.0) & (np.abs(da - db) > epsilon)
        indices = np.nonzero(crossing)[0]
        if not len(indices):
            continue
        ratio = da[indices] / (da[indices] - db[indices])
        points = triangle_points[indices, edge_a] + ratio[:, None] * (
            triangle_points[indices, edge_b] - triangle_points[indices, edge_a]
        )
        for face_index, point in zip(indices.tolist(), points):
            segments.append((np.asarray([face_index], dtype=np.int64), point))
    by_face: dict[int, list[np.ndarray]] = {}
    for face_index_array, point in segments:
        by_face.setdefault(int(face_index_array[0]), []).append(point)
    raw_segments = []
    for points3d in by_face.values():
        unique = []
        for point in points3d:
            if not any(np.linalg.norm(point - previous) <= 1e-8 for previous in unique):
                unique.append(point)
        if len(unique) == 2:
            raw_segments.append((unique[0], unique[1]))
    if not raw_segments:
        return []

    accumulated: dict[tuple[int, int], list[float]] = {}
    edge_keys: set[tuple[tuple[int, int], tuple[int, int]]] = set()
    for point_a, point_b in raw_segments:
        keys = []
        for point3d in (point_a, point_b):
            relative = point3d - plane.origin
            point2d = np.asarray([np.dot(relative, plane.lateral), np.dot(relative, plane.depth)])
            key = (round(float(point2d[0]) / snap_m), round(float(point2d[1]) / snap_m))
            value = accumulated.setdefault(key, [0.0, 0.0, 0.0])
            value[0] += float(point2d[0])
            value[1] += float(point2d[1])
            value[2] += 1.0
            keys.append(key)
        if keys[0] != keys[1]:
            edge_keys.add(tuple(sorted(keys)))
    points = {key: np.asarray([value[0] / value[2], value[1] / value[2]]) for key, value in accumulated.items()}
    neighbors = {key: set() for key in points}
    for first, second in edge_keys:
        neighbors[first].add(second)
        neighbors[second].add(first)
    remaining = set(points)
    components = []
    while remaining:
        seed = remaining.pop()
        component = {seed}
        stack = [seed]
        while stack:
            current = stack.pop()
            for neighbor in neighbors[current]:
                if neighbor in remaining:
                    remaining.remove(neighbor)
                    component.add(neighbor)
                    stack.append(neighbor)
        if len(component) >= 8:
            contour, closed = _ordered_component(component, neighbors, points)
            if len(contour) >= 8:
                components.append(
                    {
                        "points": contour,
                        "closed": closed and all(len(neighbors[key]) == 2 for key in component),
                        "area": abs(polygon_area(contour)),
                        "centroid": np.mean(contour, axis=0),
                    }
                )
    return components


def torso_bounds(landmarks: dict[str, np.ndarray], row_name: str) -> tuple[float, float, dict[str, Any]]:
    names = ROW_BOUND_ANCHORS[row_name]
    values = [(name, float(landmarks[name][0])) for name in names if name in landmarks]
    minimum_width = ROW_MIN_WIDTH_M[row_name]
    margin = ROW_MARGIN_M[row_name]
    if not values:
        return -minimum_width / 2.0, minimum_width / 2.0, {"source": "minimum anatomical default", "landmarks": []}
    right_values = [value for name, value in values if name.startswith("Rt.")]
    left_values = [value for name, value in values if name.startswith("Lt.")]
    if bool(right_values) != bool(left_values):
        half = max(minimum_width / 2.0, max(abs(value) for _, value in values) + margin)
        low, high = -half, half
    else:
        low = min(value for _, value in values) - margin
        high = max(value for _, value in values) + margin
        if high - low < minimum_width:
            center = (low + high) / 2.0
            low, high = center - minimum_width / 2.0, center + minimum_width / 2.0
    return low, high, {"source": "WEAR LND anatomical bounds", "landmarks": [name for name, _ in values]}


def choose_torso_component(components: list[dict[str, Any]], low_x: float, high_x: float) -> dict[str, Any] | None:
    candidates = []
    for component in components:
        points = component["points"]
        minimum = points.min(axis=0)
        maximum = points.max(axis=0)
        width = float(maximum[0] - minimum[0])
        inside_bounds = minimum[0] >= low_x - 0.012 and maximum[0] <= high_x + 0.012
        contains_center = component["closed"] and point_in_polygon(np.zeros(2), points)
        center_distance = float(np.linalg.norm(component["centroid"]))
        score = (100.0 if contains_center else 0.0) + (20.0 if inside_bounds else -40.0) + component["area"] * 1000.0 - center_distance * 5.0
        if width >= 0.07:
            candidates.append((score, component))
    return max(candidates, key=lambda item: item[0])[1] if candidates else None


def certified_central_torso_arc_ring(
    components: list[dict[str, Any]],
    low_x: float,
    high_x: float,
) -> tuple[np.ndarray | None, dict[str, Any]]:
    """Close the real front/back torso arcs without pulling in arm components.

    Many WEAR scans contain a narrow scanner seam at the left/right torso
    sides.  The horizontal mesh intersection is therefore two open arcs even
    though both arcs are real body surface.  A convex hull hides that evidence
    and can alter the chest shape.  This routine instead joins the two real
    arcs only at their anatomical side endpoints and certifies the join when
    the overlap and bridge gaps are small.
    """
    central_arcs = []
    for component in components:
        points = component["points"]
        minimum = points.min(axis=0)
        maximum = points.max(axis=0)
        crosses_midline = minimum[0] <= 0.0 <= maximum[0]
        inside_torso_bounds = minimum[0] >= low_x - 0.012 and maximum[0] <= high_x + 0.012
        if not component["closed"] and crosses_midline and inside_torso_bounds:
            central_arcs.append(points)
    evidence: dict[str, Any] = {
        "method": "WEAR-LND-bounded-front-back-arc-stitch",
        "centralArcCount": len(central_arcs),
        "certified": False,
    }
    if len(central_arcs) < 2:
        return None, {**evidence, "reason": "fewer-than-two-central-torso-arcs"}

    # The two most depth-separated arcs are the posterior and anterior body
    # surfaces. Lateral arm fragments never cross the canonical midline and
    # were removed above.
    ordered_by_depth = sorted(central_arcs, key=lambda points: float(points[:, 1].mean()))
    back = ordered_by_depth[0]
    front = ordered_by_depth[-1]

    def left_to_right(points: np.ndarray) -> np.ndarray:
        return points if points[0, 0] <= points[-1, 0] else points[::-1]

    back = left_to_right(back)
    front = left_to_right(front)
    back_range = (float(back[:, 0].min()), float(back[:, 0].max()))
    front_range = (float(front[:, 0].min()), float(front[:, 0].max()))
    overlap = max(0.0, min(back_range[1], front_range[1]) - max(back_range[0], front_range[0]))
    union = max(back_range[1], front_range[1]) - min(back_range[0], front_range[0])
    overlap_ratio = overlap / max(union, 1e-9)
    left_bridge_m = float(np.linalg.norm(front[0] - back[0]))
    right_bridge_m = float(np.linalg.norm(back[-1] - front[-1]))
    back_path_m = float(np.linalg.norm(np.diff(back, axis=0), axis=1).sum())
    front_path_m = float(np.linalg.norm(np.diff(front, axis=0), axis=1).sum())
    perimeter_m = back_path_m + front_path_m + left_bridge_m + right_bridge_m
    bridge_ratio = (left_bridge_m + right_bridge_m) / max(perimeter_m, 1e-9)
    depth_separation_m = float(front[:, 1].mean() - back[:, 1].mean())
    contour = np.vstack((back, front[::-1]))
    area_m2 = abs(polygon_area(contour))
    failures = []
    if overlap_ratio < 0.80:
        failures.append("front-back-lateral-overlap-under-80pct")
    if max(left_bridge_m, right_bridge_m) > 0.040:
        failures.append("side-seam-bridge-over-40mm")
    if bridge_ratio > 0.08:
        failures.append("side-seam-bridges-over-8pct-perimeter")
    if depth_separation_m < 0.045:
        failures.append("front-back-depth-separation-under-45mm")
    if area_m2 < 0.005:
        failures.append("stitched-ring-area-too-small")
    evidence.update({
        "frontBackOverlapRatio": round_float(overlap_ratio, 6),
        "leftBridgeMm": round_float(left_bridge_m * 1000.0, 3),
        "rightBridgeMm": round_float(right_bridge_m * 1000.0, 3),
        "bridgePerimeterRatio": round_float(bridge_ratio, 6),
        "depthSeparationMm": round_float(depth_separation_m * 1000.0, 3),
        "areaCm2": round_float(area_m2 * 10_000.0, 3),
        "certified": not failures,
        "failures": failures,
    })
    return (contour if not failures else None), evidence


def slab_hull(vertices: np.ndarray, plane: Plane, low_x: float, high_x: float) -> tuple[np.ndarray | None, float | None]:
    relative = vertices - plane.origin
    distance = relative @ plane.normal
    u = relative @ plane.lateral
    v = relative @ plane.depth
    for slab_m in (0.003, 0.005, 0.008, 0.012, 0.018):
        keep = (np.abs(distance) <= slab_m) & (u >= low_x - 0.008) & (u <= high_x + 0.008)
        cloud = np.column_stack((u[keep], v[keep]))
        if len(cloud) < 80:
            continue
        low_v, high_v = np.quantile(cloud[:, 1], [0.005, 0.995])
        cloud = cloud[(cloud[:, 1] >= low_v) & (cloud[:, 1] <= high_v)]
        try:
            hull = ConvexHull(cloud)
        except Exception:
            continue
        return cloud[hull.vertices], slab_m
    return None, None


def row_plane(row_name: str, record: dict[str, Any], landmarks: dict[str, np.ndarray]) -> tuple[Plane | None, dict[str, Any]]:
    measurements = record.get("measurements_mm", {})
    extracted = record.get("extracted_standing_mm", {})
    if row_name == "neck":
        required = [landmarks.get(name) for name in ("Rt. Clavicale", "Lt. Clavicale", "Suprasternale", "Cervicale")]
        if any(point is None for point in required):
            return None, {"available": False, "reason": "missing neck LND plane anchor"}
        right, left, suprasternale, cervicale = required
        lateral = unit_vector(left - right)
        front = (right + left + suprasternale) / 3.0
        depth = cervicale - front
        depth -= lateral * float(np.dot(depth, lateral))
        depth = unit_vector(depth)
        normal = unit_vector(np.cross(lateral, depth))
        origin = (front + cervicale) / 2.0
        return Plane(origin, normal, lateral, depth), {
            "available": True,
            "heightCm": round_float(origin[2] * 100.0),
            "heightSource": "mean tilted WEAR neck-base LND plane",
        }
    if row_name == "underbust":
        point = landmarks.get("Substernale")
        if point is None:
            return None, {"available": False, "reason": "missing Substernale LND"}
        height_m = float(point[2])
        source = "WEAR Substernale LND"
    else:
        key = ROW_SPECS[row_name]["heightKey"]
        height_mm = finite(measurements.get(key))
        if height_mm is None:
            height_mm = finite(extracted.get(key))
        if height_mm is None and row_name == "waist" and "Waist, Preferred, Post." in landmarks:
            height_m = float(landmarks["Waist, Preferred, Post."][2])
            source = "WEAR preferred-waist posterior LND fallback"
        elif height_mm is None:
            return None, {"available": False, "reason": f"missing {key}"}
        else:
            height_m = height_mm / 1000.0
            source = f"WEAR profile {key}"
    return Plane(
        np.asarray([0.0, 0.0, height_m]),
        np.asarray([0.0, 0.0, 1.0]),
        np.asarray([1.0, 0.0, 0.0]),
        np.asarray([0.0, 1.0, 0.0]),
    ), {"available": True, "heightCm": round_float(height_m * 100.0), "heightSource": source}


def row_geometry(
    row_name: str,
    vertices: np.ndarray,
    faces: np.ndarray,
    landmarks: dict[str, np.ndarray],
    record: dict[str, Any],
) -> dict[str, Any]:
    plane, plane_info = row_plane(row_name, record, landmarks)
    spec = ROW_SPECS[row_name]
    tape_mm = finite(record.get("measurements_mm", {}).get(spec["tapeKey"]))
    base = {
        "id": row_name,
        "label": spec["label"],
        "planeProtocol": spec["plane"],
        "plane": plane_info,
        "recordedTape": {
            "valueCm": round_float(tape_mm / 10.0) if tape_mm is not None else None,
            "sourceKey": spec["tapeKey"],
            "role": "never creates geometry; eligible rows use it only to supervise circumference walked from predicted A-B, depth, and shape",
        },
    }
    if plane is None:
        return {**base, "geometryAvailable": False, "qualityFlags": ["row-plane-unavailable"]}
    low_x, high_x, bounds_info = torso_bounds(landmarks, row_name)
    components = section_components(vertices, faces, plane)
    selected = choose_torso_component(components, low_x, high_x)
    raw_closed = bool(selected and selected["closed"])
    reconstructed = False
    reconstruction_source = None
    stitch_evidence: dict[str, Any] | None = None
    slab_m = None
    if selected is None or not raw_closed:
        points, stitch_evidence = certified_central_torso_arc_ring(components, low_x, high_x)
        if points is not None:
            reconstruction_source = "certified-central-torso-open-arcs"
        else:
            points, slab_m = slab_hull(vertices, plane, low_x, high_x)
            if points is not None:
                reconstruction_source = "bounded-slab-hull"
        if points is None:
            return {
                **base,
                "geometryAvailable": False,
                "qualityFlags": ["no-central-torso-section"],
                "torsoBoundsCm": [round_float(low_x * 100.0), round_float(high_x * 100.0)],
                "torsoBoundsEvidence": bounds_info,
            }
        reconstructed = True
        contour = points
    else:
        contour = selected["points"]
    if polygon_area(contour) < 0.0:
        contour = contour[::-1]
    minimum = contour.min(axis=0)
    maximum = contour.max(axis=0)
    width_m, depth_m = maximum - minimum
    center = (minimum + maximum) / 2.0
    perimeter_m = float(np.linalg.norm(np.diff(np.vstack((contour, contour[0])), axis=0), axis=1).sum())
    a2 = np.asarray([minimum[0], center[1]])
    b2 = np.asarray([maximum[0], center[1]])
    c2 = np.asarray([center[0], minimum[1]])
    d2 = np.asarray([center[0], maximum[1]])

    def world(point2: np.ndarray) -> np.ndarray:
        return plane.origin + plane.lateral * float(point2[0]) + plane.depth * float(point2[1])

    contour_world = np.asarray([world(point) for point in contour])
    quality = []
    if reconstructed:
        quality.extend(["reconstructed-slab-hull", "closed-loop-circumference-not-certified"])
        if reconstruction_source == "certified-central-torso-open-arcs":
            quality.remove("reconstructed-slab-hull")
            quality.remove("closed-loop-circumference-not-certified")
            quality.extend(["certified-central-torso-arc-ring", "arms-excluded-by-WEAR-LND-bounds"])
        if row_name in {"chest", "underbust"}:
            quality.append("arm-exclusion-not-proven")
            if reconstruction_source == "certified-central-torso-open-arcs":
                quality.remove("arm-exclusion-not-proven")
    else:
        quality.append("raw-central-closed-loop")
    if minimum[0] < low_x - 0.012 or maximum[0] > high_x + 0.012:
        quality.append("edge-outside-LND-torso-bounds")
    if tape_mm is not None:
        difference_pct = abs(perimeter_m * 1000.0 - tape_mm) / tape_mm * 100.0
        if difference_pct > 12.0:
            quality.append("mesh-loop-vs-recorded-tape-over-12pct")
    else:
        difference_pct = None
    certified_section = bool(raw_closed or (stitch_evidence and stitch_evidence.get("certified") is True))
    tape_training_eligible = bool(
        certified_section
        and tape_mm is not None
        and difference_pct is not None
        and difference_pct <= 5.0
    )
    return {
        **base,
        "geometryAvailable": True,
        "sourceGeometry": "raw WEAR PLY plane intersection" if not reconstructed else (
            "raw WEAR PLY central front/back torso arcs; arm components excluded"
            if reconstruction_source == "certified-central-torso-open-arcs"
            else "raw WEAR PLY bounded slab convex hull diagnostic fallback"
        ),
        "torsoBoundsCm": [round_float(low_x * 100.0), round_float(high_x * 100.0)],
        "torsoBoundsEvidence": bounds_info,
        "sectionComponentCount": len(components),
        "centralTorsoArcCount": (stitch_evidence or {}).get("centralArcCount", 0),
        "stitchEvidence": stitch_evidence,
        "rawCentralLoopClosed": raw_closed,
        "certifiedSection": certified_section,
        "geometryTrainingEligible": certified_section,
        "tapeTrainingEligible": tape_training_eligible,
        "reconstructed": reconstructed,
        "reconstructionSource": reconstruction_source,
        "slabMm": round_float((slab_m or 0.0) * 1000.0, 3),
        "breadthCm": round_float(width_m * 100.0),
        "depthCm": round_float(depth_m * 100.0),
        "closedLoopCircumferenceCm": round_float(perimeter_m * 100.0) if certified_section else None,
        "diagnosticReconstructedPerimeterCm": round_float(perimeter_m * 100.0) if reconstructed and not certified_section else None,
        "meshVsTapeDifferencePercent": round_float(difference_pct, 3) if difference_pct is not None and certified_section else None,
        "abBreadth": {
            "valueCm": round_float(width_m * 100.0),
            "aCanonicalCm": points_json(world(a2)[None, :] * 100.0)[0],
            "bCanonicalCm": points_json(world(b2)[None, :] * 100.0)[0],
            "frontProjectionCm": points_json(np.asarray([[a2[0], plane.origin[2]], [b2[0], plane.origin[2]]]) * 100.0),
        },
        "cdDepth": {
            "valueCm": round_float(depth_m * 100.0),
            "cCanonicalCm": points_json(world(c2)[None, :] * 100.0)[0],
            "dCanonicalCm": points_json(world(d2)[None, :] * 100.0)[0],
            "notVisibleInFrontProjection": True,
        },
        "contour": {
            "basis": "plane lateral/depth",
            "units": "centimetres",
            "pointsCm": points_json(contour * 100.0),
            "canonical3dPointsCm": points_json(contour_world * 100.0),
        },
        "qualityFlags": quality,
    }


def midpoint(landmarks: dict[str, np.ndarray], first: str, second: str) -> np.ndarray | None:
    if first not in landmarks or second not in landmarks:
        return None
    return (landmarks[first] + landmarks[second]) / 2.0


def measurement_mapping(key: str) -> list[str] | None:
    direct = {
        "biacromial_breadth_mm": ["Rt. Acromion", "Lt. Acromion"],
        "bicristale_breadth_mm": ["Rt. Iliocristale", "Lt. Iliocristale"],
        "bigonial_breadth_mm": ["Rt. Gonion", "Lt. Gonion"],
        "bispinous_breadth_mm": ["Rt. ASIS", "Lt. ASIS"],
        "bitragion_breadth_mm": ["Rt. Tragion", "Lt. Tragion"],
        "bitrochanteric_breadth_mm": ["Rt. Trochanterion", "Lt. Trochanterion"],
        "bustpoint_breadth_mm": ["Rt. Thelion/Bustpoint", "Lt. Thelion/Bustpoint"],
        "interscye_distance_standing_mm": ["Rt. Axilla, Post.", "Lt. Axilla, Post."],
        "foot_breadth_left_mm": ["Lt. Metatarsal-Phal. I", "Lt. Metatarsal-Phal. V"],
        "foot_breadth_right_mm": ["Rt. Metatarsal-Phal. I", "Rt. Metatarsal-Phal. V"],
        "acromion_radiale_length_left_mm": ["Lt. Acromion", "Lt. Radiale"],
        "acromion_radiale_length_right_mm": ["Rt. Acromion", "Rt. Radiale"],
        "radiale_stylion_length_left_mm": ["Lt. Radiale", "Lt. Radial Styloid"],
        "radiale_stylion_length_right_mm": ["Rt. Radiale", "Rt. Radial Styloid"],
        "sellion_supramenton_length_mm": ["Sellion", "Supramenton"],
        "waist_back_mm": ["Cervicale", "Waist, Preferred, Post."],
        "shoulder_breadth_mm": ["Rt. Acromion", "Lt. Acromion"],
        "spine_to_elbow_mm": ["Cervicale", "Rt. Olecranon"],
        "spine_to_shoulder_mm": ["Cervicale", "Rt. Acromion"],
        "arm_length_shoulder_to_elbow_mm": ["Rt. Acromion", "Rt. Radiale"],
        "arm_length_shoulder_to_wrist_mm": ["Rt. Acromion", "Rt. Radiale", "Rt. Radial Styloid"],
        "arm_length_spine_to_wrist_mm": ["Cervicale", "Rt. Acromion", "Rt. Radiale", "Rt. Radial Styloid"],
        "foot_length_mm": ["Rt. Calcaneous, Post.", "Rt. Digit II"],
        "hand_length_mm": ["Rt. Radial Styloid", "Rt. Dactylion"],
        "face_length_mm": ["Sellion", "Supramenton"],
    }
    return direct.get(key)


HEIGHT_LANDMARK_MAP = {
    "acromial_height_standing_left_mm": "Lt. Acromion",
    "acromial_height_standing_right_mm": "Rt. Acromion",
    "ankle_height_lateral_malleolus_left_mm": "Lt. Lateral Malleolus",
    "ankle_height_lateral_malleolus_right_mm": "Rt. Lateral Malleolus",
    "axilla_height_left_mm": "Lt. Axilla, Ant",
    "axilla_height_right_mm": "Rt. Axilla, Ant",
    "cervicale_height_mm": "Cervicale",
    "crotch_height_mm": "Crotch",
    "elbow_height_standing_left_mm": "Lt. Olecranon",
    "elbow_height_standing_right_mm": "Rt. Olecranon",
    "infraorbitale_height_standing_left_mm": "Lt. Infraorbitale",
    "infraorbitale_height_standing_right_mm": "Rt. Infraorbitale",
    "knee_height_standing_left_mm": "Lt. Knee Crease",
    "knee_height_standing_right_mm": "Rt. Knee Crease",
    "malleolus_medial_left_mm": "Lt. Medial Malleolus",
    "malleolus_medial_right_mm": "Rt. Medial Malleolus",
    "sphyrion_height_left_mm": "Lt. Sphyrion",
    "sphyrion_height_right_mm": "Rt. Sphyrion",
    "suprasternale_height_mm": "Suprasternale",
    "trochanterion_height_left_mm": "Lt. Trochanterion",
    "trochanterion_height_right_mm": "Rt. Trochanterion",
}


def measurement_records(record: dict[str, Any], landmarks: dict[str, np.ndarray], rows: dict[str, Any]) -> list[dict[str, Any]]:
    result = []
    row_by_tape = {spec["tapeKey"]: row_name for row_name, spec in ROW_SPECS.items()}
    for source_group in ("measurements_mm", "extracted_standing_mm"):
        for key, raw_value in sorted(record.get(source_group, {}).items()):
            value = finite(raw_value)
            if value is None:
                continue
            unit = "kg" if key.endswith("_kg") else "mm"
            item: dict[str, Any] = {
                "id": f"{source_group}:{key}",
                "sourceGroup": source_group,
                "sourceKey": key,
                "value": round_float(value),
                "unit": unit,
                "valueCm": round_float(value / 10.0) if unit == "mm" else None,
            }
            if key in row_by_tape:
                row_name = row_by_tape[key]
                item.update({"geometryAvailable": rows[row_name].get("geometryAvailable", False), "geometryType": "linked anatomical row", "rowId": row_name})
            elif (mapping := measurement_mapping(key)) is not None and all(name in landmarks for name in mapping):
                chain = np.asarray([landmarks[name] for name in mapping])
                length_cm = float(np.linalg.norm(np.diff(chain, axis=0), axis=1).sum() * 100.0)
                item.update(
                    {
                        "geometryAvailable": True,
                        "geometryType": "LND segment" if len(mapping) == 2 else "LND polyline",
                        "landmarkNames": mapping,
                        "canonicalPointsCm": points_json(chain * 100.0),
                        "geometryLengthCm": round_float(length_cm),
                        "protocolNote": "LND geometry comparison; recorded measurement protocol can follow a different path",
                    }
                )
            elif key in HEIGHT_LANDMARK_MAP and HEIGHT_LANDMARK_MAP[key] in landmarks:
                name = HEIGHT_LANDMARK_MAP[key]
                endpoint = landmarks[name]
                item.update(
                    {
                        "geometryAvailable": True,
                        "geometryType": "WEAR LND to floor vertical segment",
                        "landmarkNames": ["floor", name],
                        "canonicalPointsCm": [
                            [round_float(endpoint[0] * 100.0), round_float(endpoint[1] * 100.0), 0.0],
                            points_json(endpoint[None, :] * 100.0)[0],
                        ],
                        "geometryLengthCm": round_float(endpoint[2] * 100.0),
                        "protocolNote": "source LND endpoint; recorded value remains independent",
                    }
                )
            elif key in {"chest_height_standing_mm", "waist_height_mm", "hip_max_height_mm", "stature_mm"}:
                item.update(
                    {
                        "geometryAvailable": True,
                        "geometryType": "recorded vertical plane/height from WEAR floor",
                        "canonicalPointsCm": [[0.0, 0.0, 0.0], [0.0, 0.0, round_float(value / 10.0)]],
                        "geometryLengthCm": round_float(value / 10.0),
                        "protocolNote": "recorded vertical measurement; not inferred from a photo",
                    }
                )
            else:
                item.update(
                    {
                        "geometryAvailable": False,
                        "geometryUnavailableReason": "no defensible A-B path from available LND names; value preserved without inventing endpoints",
                    }
                )
            result.append(item)
    return result


def landmark_manifest_agreement(lnd_mm: dict[str, np.ndarray], record: dict[str, Any]) -> dict[str, Any]:
    differences = []
    manifest_landmarks = record.get("landmarks_3d_mm", {})
    for name, point in lnd_mm.items():
        value = manifest_landmarks.get(name)
        if isinstance(value, list) and len(value) == 3:
            differences.append(float(np.linalg.norm(point - np.asarray(value, dtype=np.float64))))
    return {
        "comparedCount": len(differences),
        "medianDifferenceMm": round_float(np.median(differences), 6) if differences else None,
        "maximumDifferenceMm": round_float(np.max(differences), 6) if differences else None,
        "exactWithin0_01Mm": bool(differences and max(differences) <= 0.01),
    }


def build_scan(
    scan_id: str,
    stem: str,
    record: dict[str, Any],
    source_dir: Path,
    manifest_path: Path,
    output_dir: Path,
    target_browser_triangles: int,
) -> dict[str, Any]:
    ply_path = source_dir / f"{stem}.ply.gz"
    lnd_path = source_dir / f"{stem}.lnd"
    if not ply_path.exists() or not lnd_path.exists():
        raise FileNotFoundError(f"Missing local source pair for {scan_id}: {ply_path}, {lnd_path}")
    raw_vertices, faces = load_ply(ply_path)
    lnd_mm = parse_lnd(lnd_path)
    scale = scale_hypotheses(raw_vertices, lnd_mm, float(record["height_cm"]))
    vertices_m = raw_vertices * float(scale["rawToMetresFactor"])
    landmarks_m = {name: value / 1000.0 for name, value in lnd_mm.items()}
    axes, axis_evidence = canonical_axes(landmarks_m)
    vertices, landmarks, canonical_info = canonicalize(vertices_m, landmarks_m, axes, record)

    outline_m, outline_info = projection_outline(vertices, faces)
    browser_vertices, browser_faces, browser_info = browser_mesh_2d(vertices, faces, target_browser_triangles)
    exact_name = f"{scan_id.lower()}-canonical-front-full.npz"
    browser_name = f"{scan_id.lower()}-canonical-front-browser.json"
    np.savez_compressed(
        output_dir / exact_name,
        vertices_cm=(vertices * 100.0).astype(np.float32),
        projected_xz_cm=(vertices[:, [0, 2]] * 100.0).astype(np.float32),
        depth_cm=(vertices[:, 1] * 100.0).astype(np.float32),
        triangles=faces.astype(np.int32),
    )
    browser_payload = {
        "schemaVersion": SCHEMA_VERSION,
        "scanId": scan_id,
        "units": "centimetres",
        "coordinateOrder": ["x", "z"],
        "verticesCm": points_json(browser_vertices),
        "triangles": browser_faces.tolist(),
        **browser_info,
    }
    (output_dir / browser_name).write_text(json.dumps(browser_payload, separators=(",", ":")))

    rows = {row_name: row_geometry(row_name, vertices, faces, landmarks, record) for row_name in ROW_SPECS}
    front2d_rows = {
        row_name: {
            "heightCm": row.get("plane", {}).get("heightCm"),
            "breadthCm": row.get("abBreadth", {}).get("valueCm"),
            "frontProjectionCm": row.get("abBreadth", {}).get("frontProjectionCm"),
            "sourceQualityFlags": row.get("qualityFlags", []),
        }
        for row_name, row in rows.items()
        if row.get("geometryAvailable")
    }
    leakage_safe_descriptor = build_leakage_safe_2d_descriptor(
        outline_m,
        landmarks,
        float(record["height_cm"]),
        front2d_rows,
    )
    ply_sha256 = sha256_file(ply_path)
    lnd_sha256 = sha256_file(lnd_path)
    leakage_safe_descriptor["sourceProvenance"] = {
        "localPlyGz": str(ply_path.relative_to(REPO_ROOT)),
        "localPlyGzSha256": ply_sha256,
        "localLnd": str(lnd_path.relative_to(REPO_ROOT)),
        "localLndSha256": lnd_sha256,
        "rigidFrameOnlyBeforeFront2dExtraction": True,
    }
    projection_audit = canonical_projection_audit(axes, vertices, landmarks, record, scale)
    source_original = record.get("source", {})
    quality_flags = []
    if scale["ambiguous"]:
        quality_flags.append("ambiguous-ply-unit-scale")
    agreement = landmark_manifest_agreement(lnd_mm, record)
    if not agreement["exactWithin0_01Mm"]:
        quality_flags.append("LND-vs-manifest-landmark-mismatch")
    if not projection_audit["frontProjectionValid"]:
        quality_flags.append("canonical-front-projection-invalid")
    for row_name, row in rows.items():
        if not row.get("geometryAvailable"):
            quality_flags.append(f"{row_name}-geometry-unavailable")
        if row.get("reconstructed"):
            quality_flags.append(f"{row_name}-reconstructed-not-certified-loop")
    return {
        "schemaVersion": SCHEMA_VERSION,
        "scanId": scan_id,
        "subjectId": record.get("subject_id"),
        "cohort": "selected WEAR standing scan",
        "profile": {
            "gender": record.get("gender"),
            "heightCm": round_float(record["height_cm"]),
            "weightKg": round_float(record["weight_kg"]),
            "bmi": round_float(record["bmi"]),
            "pose": record.get("pose"),
        },
        "provenance": {
            "localPlyGz": str(ply_path.relative_to(REPO_ROOT)),
            "localPlyGzSha256": ply_sha256,
            "localLnd": str(lnd_path.relative_to(REPO_ROOT)),
            "localLndSha256": lnd_sha256,
            "profileManifest": (
                str(manifest_path.resolve().relative_to(REPO_ROOT.resolve()))
                if manifest_path.resolve().is_relative_to(REPO_ROOT.resolve())
                else str(manifest_path.resolve())
            ),
            "profileManifestRecordSha256": record["_manifestRecordSha256"],
            "originalWearPointers": source_original,
            "geometryTruth": "local real PLY and local real LND",
            "recordedMeasurementRole": "independent metadata/comparison; never used to solve geometry",
        },
        "scaleEvidence": {
            **scale,
            "rawBounds": {"minimum": points_json(raw_vertices.min(axis=0)[None, :])[0], "maximum": points_json(raw_vertices.max(axis=0)[None, :])[0]},
            "lndVsManifestAgreement": agreement,
        },
        "canonicalFrame": {**canonical_info, **axis_evidence},
        "canonicalProjectionAudit": projection_audit,
        "frontProjection": {
            **outline_info,
            "outline": {"closed": True, "units": "centimetres", "pointsCm": points_json(outline_m * 100.0)},
            "exactFullProjection": {
                "path": exact_name,
                "format": "NPZ",
                "arrays": ["vertices_cm", "projected_xz_cm", "depth_cm", "triangles"],
                "vertexCount": len(vertices),
                "triangleCount": len(faces),
                "sha256": sha256_file(output_dir / exact_name),
            },
            "mesh2d": {
                "path": browser_name,
                "format": "JSON",
                "coordinateOrder": ["x", "z"],
                "units": "centimetres",
                "vertexCount": len(browser_vertices),
                "triangleCount": len(browser_faces),
                "sha256": sha256_file(output_dir / browser_name),
                "depthUsed": False,
            },
        },
        "landmarks": {
            "units": "centimetres",
            "source": "actual local WEAR LND file, transformed only by evidenced unit scale and rigid canonical frame",
            "points": {
                name: {"canonical3dCm": points_json(point[None, :] * 100.0)[0], "front2dCm": [round_float(point[0] * 100.0), round_float(point[2] * 100.0)]}
                for name, point in sorted(landmarks.items())
            },
        },
        "rows": rows,
        "leakageSafe2dDescriptor": leakage_safe_descriptor,
        "measurements": measurement_records(record, landmarks, rows),
        "qualityFlags": sorted(set(quality_flags)) or ["no-blocking-quality-flag"],
    }


def main() -> int:
    args = parse_args()
    if args.scan_id:
        wanted = set(args.scan_id)
        profiles = load_profiles(args.manifest, wanted)
        selected = [(scan_id, source_stem(profiles[scan_id])) for scan_id in args.scan_id]
    else:
        selected = list(SUBJECTS)
        profiles = load_profiles(args.manifest, {scan_id for scan_id, _ in selected})
    args.output_dir.mkdir(parents=True, exist_ok=True)
    entries = []
    for scan_id, stem in selected:
        print(f"[metric-lines] {scan_id}: loading real PLY/LND", flush=True)
        payload = build_scan(
            scan_id,
            stem,
            profiles[scan_id],
            args.source_dir,
            args.manifest,
            args.output_dir,
            args.browser_triangles,
        )
        scan_name = f"{scan_id.lower()}.json"
        scan_path = args.output_dir / scan_name
        scan_path.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n")
        entries.append(
            {
                "scanId": scan_id,
                "subjectId": payload["subjectId"],
                "path": scan_name,
                "sha256": sha256_file(scan_path),
                "profile": payload["profile"],
                "qualityFlags": payload["qualityFlags"],
                "descriptorSummary": {
                    "schemaVersion": payload["leakageSafe2dDescriptor"]["schemaVersion"],
                    "frontProjectionValid": payload["canonicalProjectionAudit"]["frontProjectionValid"],
                    "projectionStatus": payload["canonicalProjectionAudit"]["status"],
                    "defaultRankingFeatureCount": len(
                        payload["leakageSafe2dDescriptor"]["defaultRankingFeatureVector"]
                    ),
                    "conditionalFeatureCount": len(
                        payload["leakageSafe2dDescriptor"]["conditionalFeatureVector"]
                    ),
                    "auditOnlyUnsafeFeatureCount": len(
                        payload["leakageSafe2dDescriptor"]["auditOnlyUnsafeFeatureVector"]
                    ),
                    "articulationNormalized": payload["canonicalProjectionAudit"]["normalization"][
                        "articulationNormalized"
                    ],
                },
                "rowSummary": {
                    row_name: {
                        "geometryAvailable": row.get("geometryAvailable", False),
                        "breadthCm": row.get("breadthCm"),
                        "depthCm": row.get("depthCm"),
                        "closedLoopCircumferenceCm": row.get("closedLoopCircumferenceCm"),
                        "recordedTapeCm": row["recordedTape"]["valueCm"],
                        "qualityFlags": row.get("qualityFlags", []),
                    }
                    for row_name, row in payload["rows"].items()
                },
            }
        )
        print(f"[metric-lines] {scan_id}: wrote {scan_name}", flush=True)
    audit = {
        "schemaVersion": "wear-leakage-safe-front2d-audit/v1",
        "generatedBy": "scripts/local-ml/build_wear_metric_line_assets.py",
        "cpuOnly": True,
        "published": False,
        "scanCount": len(entries),
        "rankingContract": {
            "defaultScored": "normalized central visible-outline widths at fixed known-height fractions",
            "conditionallyScored": [
                "arm-excluded central-torso A-B X breadth at an independently located equivalent semantic row",
                "Acromion/Sapiens shoulder span only after cross-model landmark-bias validation",
            ],
            "neverScored": [
                "Y/depth or any value derived from depth",
                "circumference, recorded tape, closed-loop perimeter, BMI, or weight as a shape feature",
                "pointwise raw mesh overlays before articulation normalization",
                "limb projected lengths before pose equivalence is proven",
                "WEAR Trochanterion span against Sapiens joint-center hip span",
                "outer semantic-row outline widths that can merge arms into the torso",
            ],
        },
        "canonicalProjectionContract": {
            "frame": "left-handed anatomical display: X subject right-to-left, Y posterior-to-anterior, Z up",
            "metricUnitResolvedPerScan": True,
            "yawNormalized": True,
            "translationNormalized": True,
            "scaleNormalized": False,
            "descriptorNormalizedByKnownHeight": True,
            "articulationNormalized": False,
            "pointwiseOverlaySafeForRanking": False,
        },
        "scans": [
            {
                "scanId": entry["scanId"],
                "path": entry["path"],
                "sha256": entry["sha256"],
                **entry["descriptorSummary"],
            }
            for entry in entries
        ],
    }
    audit_name = "leakage-safe-descriptor-audit.json"
    audit_path = args.output_dir / audit_name
    audit_path.write_text(json.dumps(audit, indent=2, sort_keys=True) + "\n")
    index = {
        "schemaVersion": SCHEMA_VERSION,
        "assetType": "wear-metric-lines-standing-selection",
        "generatedBy": "scripts/local-ml/build_wear_metric_line_assets.py",
        "cpuOnly": True,
        "published": False,
        "scanCount": len(entries),
        "units": {"geometry": "centimetres", "profileWeight": "kilograms"},
        "truthBoundary": "PLY/LND geometry plus independent recorded WEAR measurements; no photo, prediction, tape-fitting, or formula",
        "leakageSafeDescriptorAudit": {
            "path": audit_name,
            "sha256": sha256_file(audit_path),
            "rankingUsesDepth": False,
            "rankingUsesTapeOrCircumference": False,
            "articulationNormalized": False,
        },
        "scans": entries,
    }
    index_path = args.output_dir / "index.json"
    index_path.write_text(json.dumps(index, indent=2, sort_keys=True) + "\n")
    print(f"[metric-lines] wrote canonical index {index_path}", flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
