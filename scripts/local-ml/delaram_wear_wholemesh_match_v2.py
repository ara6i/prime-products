#!/usr/bin/env python3
"""Leakage-safe Delaram-to-WEAR visible-front matcher, version 2.

This matcher intentionally replaces the old piecewise-warped profile score.
It preserves real normalized vertical proportions and ranks the strict cohort
from:

* actual full visible-silhouette intersection-over-union;
* central-torso and lower-body silhouette intersection-over-union;
* symmetric visible-boundary distance;
* anatomical landmark levels; and
* projected anatomical segment lengths.

At query time it uses only the RGB-derived visible mesh and RGB-derived pose,
plus the supplied height, weight, and gender used to select the strict cohort.
It does not read a query tape value, circumference, depth, BMI, saved line, or
any earlier WEAR prediction.  Candidate WEAR measurements are also excluded
from the scorer.  A nearest visible-front candidate never authorizes copying
that candidate's circumference.
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import math
import statistics
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Mapping, Sequence


ROOT = Path(__file__).resolve().parents[2]
GEOMETRY_PATH = ROOT / "scripts/local-ml/delaram_wear_overlay_match.py"
SPEC = importlib.util.spec_from_file_location("wear_match_geometry_v1", GEOMETRY_PATH)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError(f"Cannot load geometry helpers from {GEOMETRY_PATH}")
GEOMETRY = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(GEOMETRY)

QUERY_DIR = ROOT / ".local-ml/wear-mesh-overlay/blender-mesh"
POSE_DIR = ROOT / ".local-ml/wear-mesh-overlay/anatomical"
MODEL_DIR = ROOT / ".local-ml/wear-mesh-overlay/models"
MODEL_INDEX = MODEL_DIR / "index.json"
LANDMARK_DIR = ROOT / ".local-ml/blender/delaram-similarity/sources"
OUTPUT_DIR = ROOT / ".local-ml/wear-mesh-overlay/matches-v2"
PROOF_DIR = ROOT / ".local-ml/wear-mesh-proof/delaram-wear-match-v2"

SCHEMA_VERSION = "delaram-wear-wholemesh-match/v2"
PROFILE_SAMPLES = 513
QUERY_HEIGHT_CM = 168.0
QUERY_WEIGHT_KG = 70.8
QUERY_GENDER = "female"
HEIGHT_TOLERANCE_CM = 1.0
WEIGHT_TOLERANCE_KG = 1.0
PHOTO_IDS = ("delaram", "delaram-2")
EXPECTED_COHORT = (
    "NA-0087-A",
    "NA-0252-A",
    "NA-1220-A",
    "NA-1420-A",
    "NA-1591-A",
    "NA-3013-A",
    "NL-1344-A",
    "NL-5934-A",
    "NL-6759-A",
)

# Seventy percent of the final score is direct visible-mesh evidence.  The
# remaining thirty percent is independent landmark/segment geometry.
FINAL_WEIGHTS = {
    "meshOverlap": 0.55,
    "boundary": 0.15,
    "landmarkLevels": 0.12,
    "segmentLengths": 0.18,
}
OVERLAP_WEIGHTS = {
    "fullSilhouetteIoU": 0.50,
    "centralTorsoIoU": 0.30,
    "lowerBodyIoU": 0.20,
}
SIMILARITY_SCALES = {
    "boundaryMeanBodyHeight": 0.08,
    "landmarkLevelMaeBodyHeight": 0.08,
    "segmentLengthMaeBodyHeight": 0.08,
}
CLOSE_GATES = {
    "fullSilhouetteIoU": (">=", 0.82),
    "centralTorsoIoU": (">=", 0.90),
    "lowerBodyIoU": (">=", 0.85),
    "boundaryMeanBodyHeight": ("<=", 0.025),
    "landmarkLevelMaeBodyHeight": ("<=", 0.025),
    "segmentLengthMaeBodyHeight": ("<=", 0.025),
}

SAFE_MODEL_KEYS = (
    "scanId",
    "heightCm",
    "weightKg",
    "gender",
    "file",
    "source",
)
LANDMARK_LEVELS = ("shoulder", "hip", "knee", "ankle")
SEGMENTS = ("upperArm", "forearm", "torso", "thigh", "shank")


def rounded(value: float, places: int = 6) -> float:
    return round(float(value), places)


def mean(values: Sequence[float]) -> float:
    if not values:
        raise ValueError("Cannot average an empty sequence")
    return sum(float(value) for value in values) / len(values)


def load_strict_models() -> dict[str, dict[str, Any]]:
    """Load an allowlisted model view; discard measurement fields immediately."""
    payload = json.loads(MODEL_INDEX.read_text())
    result: dict[str, dict[str, Any]] = {}
    for raw in payload.get("models", []):
        safe = {key: raw.get(key) for key in SAFE_MODEL_KEYS}
        gender = str(safe.get("gender") or "").lower()
        height = GEOMETRY.finite(safe.get("heightCm"))
        weight = GEOMETRY.finite(safe.get("weightKg"))
        if gender != QUERY_GENDER or height is None or weight is None:
            continue
        if abs(height - QUERY_HEIGHT_CM) > HEIGHT_TOLERANCE_CM + 1e-9:
            continue
        if abs(weight - QUERY_WEIGHT_KG) > WEIGHT_TOLERANCE_KG + 1e-9:
            continue
        scan_id = str(safe["scanId"])
        safe["heightCm"] = height
        safe["weightKg"] = weight
        result[scan_id] = safe
    if tuple(sorted(result)) != tuple(sorted(EXPECTED_COHORT)):
        raise RuntimeError(
            f"Strict cohort changed: expected {EXPECTED_COHORT}, got {tuple(sorted(result))}"
        )
    return result


def load_pose_points(photo_id: str) -> tuple[dict[str, tuple[float, float]], dict[str, Any]]:
    path = POSE_DIR / f"{photo_id}-sapiens2.json"
    payload = json.loads(path.read_text())
    if payload.get("maskUsed") is not False:
        raise RuntimeError(f"Pose source unexpectedly used a mask: {path}")
    if payload.get("depthUsed") is not False or payload.get("measurementsUsed") is not False:
        raise RuntimeError(f"Pose source is not leakage-safe: {path}")
    points: dict[str, tuple[float, float]] = {}
    scores: dict[str, float] = {}
    for raw in payload.get("mhr70", []):
        name = str(raw["name"])
        score = float(raw.get("score", 0.0))
        if score < 0.45:
            continue
        points[name] = (float(raw["xPx"]), float(raw["yPx"]))
        scores[name] = score
    required = {
        f"{side}-{joint}"
        for side in ("left", "right")
        for joint in (
            "shoulder",
            "elbow",
            "wrist",
            "hip",
            "knee",
            "ankle",
            "heel",
            "big-toe-tip",
        )
    }
    missing = sorted(required - points.keys())
    if missing:
        raise RuntimeError(f"Missing Sapiens points for {photo_id}: {missing}")
    return points, {
        "path": str(path.relative_to(ROOT)),
        "sha256": GEOMETRY.sha256(path),
        "minimumRequiredScore": rounded(min(scores[name] for name in required)),
    }


def build_query(photo_id: str) -> dict[str, Any]:
    path = QUERY_DIR / f"{photo_id}.json"
    payload = json.loads(path.read_text())
    if payload.get("blenderApiUsed") is not True:
        raise RuntimeError(f"Query is not the reviewed Blender mesh: {path}")
    if any(
        payload.get(flag) is not False
        for flag in ("depthUsed", "measurementsUsed", "wearAnswerUsed")
    ):
        raise RuntimeError(f"Query contains forbidden measurement evidence: {path}")

    image_width, image_height = (int(value) for value in payload["imageSize"])
    flat_outline = payload["outline"]
    outline = [
        (float(flat_outline[index]), float(flat_outline[index + 1]))
        for index in range(0, len(flat_outline), 2)
    ]
    visible_top_px = min(y for _x, y in outline) * image_height
    visible_bottom_px = max(y for _x, y in outline) * image_height
    visible_span_px = visible_bottom_px - visible_top_px
    if visible_span_px <= image_height * 0.45:
        raise RuntimeError(f"Visible body span is too short for {photo_id}")

    pose, pose_evidence = load_pose_points(photo_id)
    top_px = visible_top_px
    bottom_px = visible_bottom_px
    body_span_px = visible_span_px
    midline_px = mean(
        [
            pose[name][0]
            for name in ("left-shoulder", "right-shoulder", "left-hip", "right-hip")
        ]
    )
    profile: list[list[tuple[float, float]]] = []
    for index in range(PROFILE_SAMPLES):
        body_y = index / (PROFILE_SAMPLES - 1)
        image_y_px = top_px + body_y * body_span_px
        intervals = GEOMETRY.polygon_intervals(outline, image_y_px / image_height)
        profile.append(
            [
                (
                    (left * image_width - midline_px) / body_span_px,
                    (right * image_width - midline_px) / body_span_px,
                )
                for left, right in intervals
            ]
        )

    def point(name: str) -> tuple[float, float]:
        x_px, y_px = pose[name]
        return ((x_px - midline_px) / body_span_px, (y_px - top_px) / body_span_px)

    top_margin = visible_top_px / image_height
    bottom_margin = 1.0 - visible_bottom_px / image_height
    arm_order = all(
        point(f"{side}-shoulder")[1] < point(f"{side}-elbow")[1]
        < point(f"{side}-wrist")[1]
        for side in ("left", "right")
    )
    quality_reasons: list[str] = []
    if top_margin < 0.01 or bottom_margin < 0.01:
        quality_reasons.append("visible mesh touches the photo crop")
    if not arm_order:
        quality_reasons.append("at least one arm is raised or non-neutral")
    eligible = not quality_reasons
    return {
        "photoId": photo_id,
        "profile": profile,
        "point": point,
        "features": anatomical_features(point),
        "quality": {
            "eligibleForCanonicalRanking": eligible,
            "reasons": quality_reasons,
            "topMarginFraction": rounded(top_margin),
            "bottomMarginFraction": rounded(bottom_margin),
            "neutralArmOrder": arm_order,
        },
        "evidence": {
            "meshPath": str(path.relative_to(ROOT)),
            "meshSha256": GEOMETRY.sha256(path),
            "meshSource": payload.get("source"),
            "vertexCount": int(payload["stats"]["vertexCount"]),
            "triangleCount": int(payload["stats"]["triangleCount"]),
            "pose": pose_evidence,
            "normalization": "one global full visible-body height scale plus torso-midline translation",
            "piecewiseWarpUsed": False,
        },
    }


def landmark_stem(scan_id: str) -> str:
    number = scan_id.split("-")[1].lower()
    if scan_id.startswith("NA-"):
        return f"csr{number}a"
    if scan_id.startswith("NL-"):
        return f"nl_{number}a"
    raise ValueError(f"Unsupported region: {scan_id}")


def parse_landmarks(path: Path) -> dict[str, tuple[float, float, float]]:
    result: dict[str, tuple[float, float, float]] = {}
    for raw_line in path.read_text(errors="replace").splitlines():
        parts = raw_line.split()
        if len(parts) < 8 or not parts[0].lstrip("-").isdigit():
            continue
        try:
            point = (float(parts[4]), float(parts[5]), float(parts[6]))
        except ValueError:
            continue
        name = " ".join(parts[7:]).rstrip("#").strip()
        result[name] = point
    return result


def build_wear(model: Mapping[str, Any]) -> dict[str, Any]:
    scan_id = str(model["scanId"])
    model_path = MODEL_DIR / str(model["file"])
    vertices, triangles = GEOMETRY.read_glb_mesh(model_path)
    bottom = min(point[1] for point in vertices)
    top = max(point[1] for point in vertices)
    body_span = top - bottom
    source_profile = GEOMETRY.rasterize_mesh_rows(
        vertices,
        triangles,
        frame_top_y=top,
        frame_span=body_span,
        samples=PROFILE_SAMPLES,
    )
    center = GEOMETRY.profile_center(source_profile)
    profile = GEOMETRY.shift_rows(source_profile, center)

    landmark_path = LANDMARK_DIR / f"{landmark_stem(scan_id)}.lnd"
    landmarks = parse_landmarks(landmark_path)
    front = [landmarks["Suprasternale"], landmarks["Substernale"]]
    back = [landmarks["Cervicale"], landmarks["10th Rib Midspine"]]
    direction_x = mean([point[0] for point in front]) - mean(
        [point[0] for point in back]
    )
    direction_y = mean([point[1] for point in front]) - mean(
        [point[1] for point in back]
    )
    yaw = -math.pi / 2.0 - math.atan2(direction_y, direction_x)
    cos_yaw = math.cos(yaw)
    sin_yaw = math.sin(yaw)
    height_mm = float(model["heightCm"]) * 10.0
    foot_z = min(
        landmarks[name][2] for name in GEOMETRY.BOTTOM_LANDMARKS if name in landmarks
    )
    body_top_z = foot_z + height_mm

    def raw_point(name: str) -> tuple[float, float]:
        x, y, z = landmarks[name]
        front_x = cos_yaw * x - sin_yaw * y
        return (front_x / height_mm, (body_top_z - z) / height_mm)

    def average_point(*names: str) -> tuple[float, float]:
        points = [raw_point(name) for name in names]
        return (mean([point[0] for point in points]), mean([point[1] for point in points]))

    point_builders: dict[str, Callable[[], tuple[float, float]]] = {
        "left-shoulder": lambda: raw_point("Lt. Acromion"),
        "right-shoulder": lambda: raw_point("Rt. Acromion"),
        "left-elbow": lambda: average_point(
            "Lt. Humeral Lateral Epicn", "Lt. Humeral Medial Epicn"
        ),
        "right-elbow": lambda: average_point(
            "Rt. Humeral Lateral Epicn", "Rt. Humeral Medial Epicn"
        ),
        "left-wrist": lambda: average_point("Lt. Radial Styloid", "Lt. Ulnar Styloid"),
        "right-wrist": lambda: average_point("Rt. Radial Styloid", "Rt. Ulnar Styloid"),
        "left-hip": lambda: raw_point("Lt. Trochanterion"),
        "right-hip": lambda: raw_point("Rt. Trochanterion"),
        "left-knee": lambda: average_point(
            "Lt. Femoral Lateral Epicn", "Lt. Femoral Medial Epicn"
        ),
        "right-knee": lambda: average_point(
            "Rt. Femoral Lateral Epicn", "Rt. Femoral Medial Epicn"
        ),
        "left-ankle": lambda: average_point(
            "Lt. Lateral Malleolus", "Lt. Medial Malleolus"
        ),
        "right-ankle": lambda: average_point(
            "Rt. Lateral Malleolus", "Rt. Medial Malleolus"
        ),
        "left-heel": lambda: raw_point("Lt. Calcaneous, Post."),
        "right-heel": lambda: raw_point("Rt. Calcaneous, Post."),
        "left-big-toe-tip": lambda: raw_point("Lt. Digit II"),
        "right-big-toe-tip": lambda: raw_point("Rt. Digit II"),
    }

    def point(name: str) -> tuple[float, float]:
        return point_builders[name]()

    return {
        "scanId": scan_id,
        "profile": profile,
        "features": anatomical_features(point),
        "profileData": {
            "gender": model["gender"],
            "heightCm": model["heightCm"],
            "weightKg": model["weightKg"],
        },
        "evidence": {
            "modelPath": str(model_path.relative_to(ROOT)),
            "modelSha256": GEOMETRY.sha256(model_path),
            "landmarkPath": str(landmark_path.relative_to(ROOT)),
            "landmarkSha256": GEOMETRY.sha256(landmark_path),
            "vertexCount": len(vertices),
            "triangleCount": len(triangles),
            "normalization": "one global full cleaned-mesh height scale; no piecewise warp",
            "frontYawRadians": rounded(yaw),
        },
    }


def anatomical_features(
    point: Callable[[str], tuple[float, float]],
) -> dict[str, dict[str, float]]:
    levels: dict[str, float] = {}
    for joint in LANDMARK_LEVELS:
        levels[joint] = mean(
            [point(f"left-{joint}")[1], point(f"right-{joint}")[1]]
        )

    def segment_length(start: str, end: str) -> float:
        return mean(
            [
                math.dist(point(f"{side}-{start}"), point(f"{side}-{end}"))
                for side in ("left", "right")
            ]
        )

    def midpoint(joint: str) -> tuple[float, float]:
        left = point(f"left-{joint}")
        right = point(f"right-{joint}")
        return ((left[0] + right[0]) / 2.0, (left[1] + right[1]) / 2.0)

    segments = {
        "upperArm": segment_length("shoulder", "elbow"),
        "forearm": segment_length("elbow", "wrist"),
        "torso": math.dist(midpoint("shoulder"), midpoint("hip")),
        "thigh": segment_length("hip", "knee"),
        "shank": segment_length("knee", "ankle"),
    }
    return {
        "levels": {key: rounded(value) for key, value in levels.items()},
        "segments": {key: rounded(value) for key, value in segments.items()},
    }


def intersection_length(
    left: Sequence[tuple[float, float]], right: Sequence[tuple[float, float]]
) -> float:
    left_index = 0
    right_index = 0
    result = 0.0
    while left_index < len(left) and right_index < len(right):
        result += max(
            0.0,
            min(left[left_index][1], right[right_index][1])
            - max(left[left_index][0], right[right_index][0]),
        )
        if left[left_index][1] < right[right_index][1]:
            left_index += 1
        else:
            right_index += 1
    return result


def silhouette_iou(
    left: Sequence[Sequence[tuple[float, float]]],
    right: Sequence[Sequence[tuple[float, float]]],
    *,
    start: float = 0.0,
    end: float = 1.0,
    central_only: bool = False,
) -> float:
    intersection = 0.0
    union = 0.0
    for index, (left_row, right_row) in enumerate(zip(left, right)):
        body_y = index / (PROFILE_SAMPLES - 1)
        if body_y < start or body_y > end:
            continue
        if central_only:
            left_center = GEOMETRY.central_interval(left_row)
            right_center = GEOMETRY.central_interval(right_row)
            left_row = [left_center] if left_center is not None else []
            right_row = [right_center] if right_center is not None else []
        left_area = sum(finish - begin for begin, finish in left_row)
        right_area = sum(finish - begin for begin, finish in right_row)
        overlap = intersection_length(left_row, right_row)
        intersection += overlap
        union += left_area + right_area - overlap
    return intersection / union if union > 0 else 0.0


def boundary_points(
    profile: Sequence[Sequence[tuple[float, float]]], stride: int = 2
) -> list[tuple[float, float]]:
    points: list[tuple[float, float]] = []
    for index in range(0, len(profile), stride):
        body_y = index / (len(profile) - 1)
        for left, right in profile[index]:
            points.extend(((left, body_y), (right, body_y)))
    return points


def symmetric_boundary_distance(
    left: Sequence[Sequence[tuple[float, float]]],
    right: Sequence[Sequence[tuple[float, float]]],
) -> dict[str, float]:
    left_points = boundary_points(left)
    right_points = boundary_points(right)
    if not left_points or not right_points:
        raise RuntimeError("Cannot compare empty boundaries")

    def nearest(source: Sequence[tuple[float, float]], target: Sequence[tuple[float, float]]) -> list[float]:
        return [
            min(math.dist(point, candidate) for candidate in target)
            for point in source
        ]

    distances = nearest(left_points, right_points) + nearest(right_points, left_points)
    ordered = sorted(distances)
    p95_index = min(len(ordered) - 1, math.ceil(0.95 * len(ordered)) - 1)
    return {
        "meanBodyHeight": rounded(mean(distances)),
        "p95BodyHeight": rounded(ordered[p95_index]),
        "leftPointCount": len(left_points),
        "rightPointCount": len(right_points),
    }


def feature_error(
    query: Mapping[str, float], candidate: Mapping[str, float]
) -> dict[str, Any]:
    differences = {
        name: abs(float(query[name]) - float(candidate[name])) for name in query
    }
    return {
        "meanAbsoluteBodyHeight": rounded(mean(list(differences.values()))),
        "rootMeanSquareBodyHeight": rounded(
            math.sqrt(mean([value * value for value in differences.values()]))
        ),
        "absoluteDifferencesBodyHeight": {
            name: rounded(value) for name, value in differences.items()
        },
        "queryValuesBodyHeight": dict(query),
        "wearValuesBodyHeight": dict(candidate),
    }


def similarity_from_error(value: float, scale: float) -> float:
    return max(0.0, 1.0 - value / scale)


def gate_failures(metrics: Mapping[str, float]) -> list[dict[str, Any]]:
    failures: list[dict[str, Any]] = []
    for name, (operation, threshold) in CLOSE_GATES.items():
        value = float(metrics[name])
        passed = value >= threshold if operation == ">=" else value <= threshold
        if not passed:
            failures.append(
                {
                    "metric": name,
                    "value": rounded(value),
                    "required": f"{operation} {threshold}",
                }
            )
    return failures


def compare(query: Mapping[str, Any], wear: Mapping[str, Any]) -> dict[str, Any]:
    full_iou = silhouette_iou(query["profile"], wear["profile"])
    torso_iou = silhouette_iou(
        query["profile"], wear["profile"], start=0.12, end=0.52, central_only=True
    )
    lower_iou = silhouette_iou(
        query["profile"], wear["profile"], start=0.52, end=0.98
    )
    boundary = symmetric_boundary_distance(query["profile"], wear["profile"])
    level_error = feature_error(
        query["features"]["levels"], wear["features"]["levels"]
    )
    segment_error = feature_error(
        query["features"]["segments"], wear["features"]["segments"]
    )
    overlap_similarity = (
        OVERLAP_WEIGHTS["fullSilhouetteIoU"] * full_iou
        + OVERLAP_WEIGHTS["centralTorsoIoU"] * torso_iou
        + OVERLAP_WEIGHTS["lowerBodyIoU"] * lower_iou
    )
    boundary_similarity = similarity_from_error(
        boundary["meanBodyHeight"], SIMILARITY_SCALES["boundaryMeanBodyHeight"]
    )
    landmark_similarity = similarity_from_error(
        level_error["meanAbsoluteBodyHeight"],
        SIMILARITY_SCALES["landmarkLevelMaeBodyHeight"],
    )
    segment_similarity = similarity_from_error(
        segment_error["meanAbsoluteBodyHeight"],
        SIMILARITY_SCALES["segmentLengthMaeBodyHeight"],
    )
    final_similarity = (
        FINAL_WEIGHTS["meshOverlap"] * overlap_similarity
        + FINAL_WEIGHTS["boundary"] * boundary_similarity
        + FINAL_WEIGHTS["landmarkLevels"] * landmark_similarity
        + FINAL_WEIGHTS["segmentLengths"] * segment_similarity
    )
    gate_metrics = {
        "fullSilhouetteIoU": full_iou,
        "centralTorsoIoU": torso_iou,
        "lowerBodyIoU": lower_iou,
        "boundaryMeanBodyHeight": boundary["meanBodyHeight"],
        "landmarkLevelMaeBodyHeight": level_error["meanAbsoluteBodyHeight"],
        "segmentLengthMaeBodyHeight": segment_error["meanAbsoluteBodyHeight"],
    }
    failures = gate_failures(gate_metrics)
    return {
        "scanId": wear["scanId"],
        "score": rounded(final_similarity * 100.0, 2),
        "genuinelyClose": not failures,
        "measurementTransferAllowed": False,
        "scoreComponents": {
            "meshOverlap": {
                "weightedSimilarity": rounded(overlap_similarity),
                "fullSilhouetteIoU": rounded(full_iou),
                "centralTorsoIoU": rounded(torso_iou),
                "lowerBodyIoU": rounded(lower_iou),
            },
            "boundary": boundary,
            "landmarkLevels": level_error,
            "segmentLengths": segment_error,
            "componentSimilarities": {
                "meshOverlap": rounded(overlap_similarity),
                "boundary": rounded(boundary_similarity),
                "landmarkLevels": rounded(landmark_similarity),
                "segmentLengths": rounded(segment_similarity),
            },
        },
        "closeGateFailures": failures,
        "profile": wear["profileData"],
        "wearEvidence": wear["evidence"],
    }


def profile_outer(
    profile: Sequence[Sequence[tuple[float, float]]]
) -> dict[str, list[float | None]]:
    left: list[float | None] = []
    right: list[float | None] = []
    for intervals in profile:
        left.append(rounded(intervals[0][0]) if intervals else None)
        right.append(rounded(intervals[-1][1]) if intervals else None)
    return {"left": left, "right": right}


def write_overlay_evidence(
    query: Mapping[str, Any], wear: Mapping[str, Any], result: Mapping[str, Any]
) -> tuple[str, str]:
    evidence_dir = OUTPUT_DIR / "overlays"
    evidence_dir.mkdir(parents=True, exist_ok=True)
    stem = f"{query['photoId']}--{str(wear['scanId']).lower()}"
    json_path = evidence_dir / f"{stem}.json"
    svg_path = evidence_dir / f"{stem}.svg"
    json_path.write_text(
        json.dumps(
            {
                "schemaVersion": "normalized-wholemesh-overlay/v2",
                "photoId": query["photoId"],
                "scanId": wear["scanId"],
                "normalization": "one global full visible-body height scale; no piecewise landmark warp",
                "canonicalY": [
                    rounded(index / (PROFILE_SAMPLES - 1))
                    for index in range(PROFILE_SAMPLES)
                ],
                "photo": profile_outer(query["profile"]),
                "wear": profile_outer(wear["profile"]),
                "scoreComponents": result["scoreComponents"],
            },
            separators=(",", ":"),
        )
        + "\n"
    )

    width, height = 430, 640
    center_x = width / 2.0
    x_scale = 470.0
    top_y = 48.0
    y_scale = 540.0

    def polyline(profile: Sequence[Sequence[tuple[float, float]]], side: str) -> str:
        points: list[str] = []
        for index, intervals in enumerate(profile):
            if not intervals:
                continue
            x = intervals[0][0] if side == "left" else intervals[-1][1]
            y = index / (PROFILE_SAMPLES - 1)
            points.append(f"{center_x + x * x_scale:.2f},{top_y + y * y_scale:.2f}")
        return " ".join(points)

    components = result["scoreComponents"]
    mesh = components["meshOverlap"]
    svg_path.write_text(
        f'''<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">
<rect width="100%" height="100%" fill="#020617"/>
<text x="14" y="20" fill="#f8fafc" font-family="sans-serif" font-size="14">{query['photoId']} vs {wear['scanId']} · v2</text>
<text x="14" y="38" fill="#94a3b8" font-family="sans-serif" font-size="11">score {result['score']:.2f} · full IoU {mesh['fullSilhouetteIoU']:.3f} · torso {mesh['centralTorsoIoU']:.3f} · lower {mesh['lowerBodyIoU']:.3f}</text>
<line x1="{center_x}" y1="{top_y}" x2="{center_x}" y2="{top_y + y_scale}" stroke="#1e293b"/>
<polyline points="{polyline(wear['profile'], 'left')}" fill="none" stroke="#fb923c" stroke-width="2"/>
<polyline points="{polyline(wear['profile'], 'right')}" fill="none" stroke="#fb923c" stroke-width="2"/>
<polyline points="{polyline(query['profile'], 'left')}" fill="none" stroke="#22d3ee" stroke-width="2"/>
<polyline points="{polyline(query['profile'], 'right')}" fill="none" stroke="#22d3ee" stroke-width="2"/>
<text x="14" y="622" fill="#22d3ee" font-family="sans-serif" font-size="12">photo</text>
<text x="70" y="622" fill="#fb923c" font-family="sans-serif" font-size="12">WEAR</text>
</svg>'''
    )
    return str(json_path.relative_to(ROOT)), str(svg_path.relative_to(ROOT))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=OUTPUT_DIR / "index.json")
    args = parser.parse_args()

    models = load_strict_models()
    queries = {photo_id: build_query(photo_id) for photo_id in PHOTO_IDS}
    wear = {scan_id: build_wear(models[scan_id]) for scan_id in sorted(models)}

    photos: list[dict[str, Any]] = []
    results_by_photo: dict[str, dict[str, dict[str, Any]]] = {}
    for photo_id in PHOTO_IDS:
        query = queries[photo_id]
        candidates = [compare(query, wear[scan_id]) for scan_id in sorted(wear)]
        candidates.sort(key=lambda item: (-float(item["score"]), str(item["scanId"])))
        for rank, result in enumerate(candidates, 1):
            result["rank"] = rank
            overlay_json, overlay_svg = write_overlay_evidence(
                query, wear[str(result["scanId"])], result
            )
            result["overlayEvidence"] = overlay_json
            result["overlaySvg"] = overlay_svg
        results_by_photo[photo_id] = {
            str(item["scanId"]): item for item in candidates
        }
        photos.append(
            {
                "photoId": photo_id,
                "queryQuality": query["quality"],
                "queryEvidence": query["evidence"],
                "queryAnatomicalFeatures": query["features"],
                "candidates": candidates,
            }
        )

    eligible_photo_ids = [
        photo_id
        for photo_id in PHOTO_IDS
        if queries[photo_id]["quality"]["eligibleForCanonicalRanking"]
    ]
    if not eligible_photo_ids:
        raise RuntimeError("No query photo passed the canonical ranking quality gate")
    canonical: list[dict[str, Any]] = []
    for scan_id in sorted(wear):
        source_results = [results_by_photo[photo_id][scan_id] for photo_id in eligible_photo_ids]
        score = mean([float(item["score"]) for item in source_results])
        genuinely_close = all(bool(item["genuinelyClose"]) for item in source_results)
        canonical.append(
            {
                "scanId": scan_id,
                "score": rounded(score, 2),
                "genuinelyClose": genuinely_close,
                "measurementTransferAllowed": False,
                "eligiblePhotoRanks": {
                    photo_id: results_by_photo[photo_id][scan_id]["rank"]
                    for photo_id in eligible_photo_ids
                },
                "profile": wear[scan_id]["profileData"],
            }
        )
    canonical.sort(key=lambda item: (-float(item["score"]), str(item["scanId"])))
    for rank, item in enumerate(canonical, 1):
        item["rank"] = rank

    any_close = any(bool(item["genuinelyClose"]) for item in canonical)
    output = {
        "schemaVersion": SCHEMA_VERSION,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "status": "candidate-evidence-only" if any_close else "rejected-no-genuine-close-match",
        "releaseAllowed": False,
        "device": "cpu",
        "canonicalArtifact": str(args.output.relative_to(ROOT)),
        "queryInputs": {
            "frontRgbDerivedMesh": True,
            "heightCm": QUERY_HEIGHT_CM,
            "weightKg": QUERY_WEIGHT_KG,
            "gender": QUERY_GENDER,
        },
        "rankingInputs": [
            "globally full-visible-height normalized RGB-derived visible 2D mesh",
            "globally full-height normalized real WEAR front-projected mesh",
            "RGB-derived Sapiens shoulder, hip, knee, and ankle levels",
            "RGB-derived Sapiens and WEAR LND segment lengths",
            "gender and strict height/weight cohort filter",
        ],
        "forbiddenRankingInputs": [
            "tape",
            "circumference",
            "depth",
            "BMI",
            "saved measurement lines",
            "old semantic similarity score",
        ],
        "oldSemanticScoreUsed": False,
        "piecewiseLandmarkWarpUsed": False,
        "scoreDefinition": {
            "finalWeights": FINAL_WEIGHTS,
            "meshOverlapInternalWeights": OVERLAP_WEIGHTS,
            "errorSimilarityScales": SIMILARITY_SCALES,
            "closeGates": {
                key: f"{operation} {value}"
                for key, (operation, value) in CLOSE_GATES.items()
            },
        },
        "canonicalRankingPhotoIds": eligible_photo_ids,
        "excludedPhotos": {
            photo_id: queries[photo_id]["quality"]["reasons"]
            for photo_id in PHOTO_IDS
            if photo_id not in eligible_photo_ids
        },
        "cohort": {
            "count": len(models),
            "scanIds": sorted(models),
            "sameGender": True,
            "heightToleranceCm": HEIGHT_TOLERANCE_CM,
            "weightToleranceKg": WEIGHT_TOLERANCE_KG,
        },
        "photos": photos,
        "canonicalRanking": canonical,
        "conclusion": {
            "anyGenuinelyClose": any_close,
            "nearestVisibleFrontCandidate": canonical[0]["scanId"],
            "nearestCandidateScore": canonical[0]["score"],
            "measurementTransferAllowed": False,
            "reason": (
                "At least one strict candidate passed every independent closeness gate."
                if any_close
                else "No strict candidate passed the whole-mesh, boundary, landmark, and segment gates; nearest does not mean genuinely close."
            ),
        },
        "evidence": {
            "modelIndex": str(MODEL_INDEX.relative_to(ROOT)),
            "modelIndexSha256": GEOMETRY.sha256(MODEL_INDEX),
            "geometryHelper": str(GEOMETRY_PATH.relative_to(ROOT)),
            "geometryHelperSha256": GEOMETRY.sha256(GEOMETRY_PATH),
            "profileSamples": PROFILE_SAMPLES,
        },
        "caveats": [
            "Delaram's mesh is visible tight-clothing and hair outline, not hidden naked anatomy.",
            "WEAR is an A-pose while Delaram's eligible image has arms closer to her sides.",
            "A single front view cannot prove front-to-back depth or circumference.",
            "Delaram 2 is scored for diagnosis but excluded from canonical ranking because it is crop-clipped and has a raised arm.",
            "Candidate measurements are intentionally not emitted or transferred by this matcher.",
        ],
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(output, indent=2) + "\n")
    PROOF_DIR.mkdir(parents=True, exist_ok=True)
    summary = {
        "schemaVersion": SCHEMA_VERSION,
        "index": str(args.output.relative_to(ROOT)),
        "status": output["status"],
        "canonicalRankingPhotoIds": eligible_photo_ids,
        "canonicalRanking": canonical,
        "conclusion": output["conclusion"],
    }
    (PROOF_DIR / "summary.json").write_text(json.dumps(summary, indent=2) + "\n")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
