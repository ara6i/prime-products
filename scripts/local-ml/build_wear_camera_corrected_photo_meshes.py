#!/usr/bin/env python3
"""Canonicalize Delaram's front/side 2D meshes with a neutral WEAR frame.

The strict WEAR cohort supplies only anatomical axes, bilateral landmark names,
and average waist cross-section geometry.  No tape, circumference, saved row,
or Delaram measurement is read.  The transform is global camera geometry only:
background verticals remove roll and paired front/side Sapiens landmarks
estimate the small residual yaw.  Vertices are never moved independently.
"""

from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any

import cv2
import numpy as np


ROOT = Path(__file__).resolve().parents[2]
OVERLAY = ROOT / ".local-ml/wear-mesh-overlay"
METRIC = OVERLAY / "metric-lines"
ANATOMICAL = OVERLAY / "anatomical"
BLENDER = OVERLAY / "blender-mesh"
OUTPUT = OVERLAY / "camera-corrected"

PHOTO_PATHS = {
    "front": ROOT / "public/try-on-test/sizing-lab/delaram-front.jpg",
    "side": ROOT / "public/try-on-test/sizing-lab/delaram-side.jpg",
}
MESH_PATHS = {
    "front": BLENDER / "delaram.json",
    "side": BLENDER / "delaram-side.json",
}
POSE_PATHS = {
    "front": ANATOMICAL / "delaram-sapiens2.json",
    "side": ANATOMICAL / "delaram-side-sapiens2.json",
}

POSE_PAIRS = {
    "shoulder": (5, 6),
    "hip": (9, 10),
    "knee": (11, 12),
    "ankle": (13, 14),
}
WEAR_PAIR_BUILDERS = {
    "shoulder": ("Lt. Acromion", "Rt. Acromion"),
    "hip": ("Lt. Trochanterion", "Rt. Trochanterion"),
}


def read_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text())


def pairs(flat: list[float]) -> np.ndarray:
    return np.asarray(flat, dtype=np.float64).reshape(-1, 2)


def weighted_mean(values: list[float], weights: list[float]) -> float:
    return float(np.average(np.asarray(values), weights=np.asarray(weights)))


def estimate_background_roll_deg(image_path: Path, person_outline: np.ndarray) -> tuple[float, int]:
    image = cv2.imread(str(image_path), cv2.IMREAD_GRAYSCALE)
    if image is None:
        raise FileNotFoundError(image_path)
    height, width = image.shape
    edges = cv2.Canny(image, 50, 150)
    lines = cv2.HoughLinesP(
        edges,
        1,
        np.pi / 1800,
        threshold=120,
        minLineLength=max(120, int(height * 0.20)),
        maxLineGap=30,
    )
    person_polygon = (person_outline * np.asarray([width, height])).astype(np.float32)
    candidates: list[tuple[float, float]] = []
    for raw in lines[:, 0] if lines is not None else []:
        x1, y1, x2, y2 = [float(value) for value in raw]
        dx, dy = x2 - x1, y2 - y1
        if abs(dy) < 1:
            continue
        deviation = math.degrees(math.atan2(dx, dy))
        midpoint_x = (x1 + x2) / 2.0
        length = math.hypot(dx, dy)
        midpoint_y = (y1 + y2) / 2.0
        outside_person = cv2.pointPolygonTest(person_polygon, (midpoint_x, midpoint_y), False) < 0
        if abs(deviation) <= 8 and outside_person:
            candidates.append((deviation, length))
    if not candidates:
        return 0.0, 0
    ordered = sorted(candidates, key=lambda item: item[0])
    half = sum(length for _, length in ordered) / 2.0
    walked = 0.0
    median = ordered[-1][0]
    for deviation, length in ordered:
        walked += length
        if walked >= half:
            median = deviation
            break
    return float(median), len(candidates)


def build_wear_reference(metric_assets: list[dict[str, Any]]) -> dict[str, Any]:
    pair_points: dict[str, list[list[list[float]]]] = {name: [] for name in WEAR_PAIR_BUILDERS}
    for asset in metric_assets:
        stature = float(asset["profile"]["heightCm"])
        points = asset["landmarks"]["points"]
        for name, (left_name, right_name) in WEAR_PAIR_BUILDERS.items():
            if left_name not in points or right_name not in points:
                continue
            left = np.asarray(points[left_name]["canonical3dCm"], dtype=np.float64) / stature
            right = np.asarray(points[right_name]["canonical3dCm"], dtype=np.float64) / stature
            pair_points[name].append([left.tolist(), right.tolist()])
    average_pairs = {}
    for name, values in pair_points.items():
        array = np.asarray(values, dtype=np.float64)
        average_pairs[name] = {
            "left": np.mean(array[:, 0, :], axis=0).round(8).tolist(),
            "right": np.mean(array[:, 1, :], axis=0).round(8).tolist(),
            "scanCount": int(array.shape[0]),
        }
    return {
        "frame": "average strict-cohort WEAR canonical axes: X lateral, Y posterior-to-anterior, Z up",
        "units": "body-height fractions",
        "pairs": average_pairs,
    }


def estimate_paired_yaw_deg(
    front_pose: dict[str, Any],
    side_pose: dict[str, Any],
    front_outline: np.ndarray,
    side_outline: np.ndarray,
) -> tuple[float, list[dict[str, float]]]:
    front_height = float(np.ptp(front_outline[:, 1]) * front_pose["imageSize"][1])
    side_height = float(np.ptp(side_outline[:, 1]) * side_pose["imageSize"][1])
    estimates = []
    values, weights = [], []
    # Shoulder and hip are stable torso pairs. Knees/ankles are deliberately
    # excluded because stance changes their side-view separation.
    for name in ("shoulder", "hip"):
        left_index, right_index = POSE_PAIRS[name]
        front_left, front_right = front_pose["mhr70"][left_index], front_pose["mhr70"][right_index]
        side_left, side_right = side_pose["mhr70"][left_index], side_pose["mhr70"][right_index]
        front_span = abs(float(front_left["xPx"]) - float(front_right["xPx"])) / front_height
        side_span = abs(float(side_left["xPx"]) - float(side_right["xPx"])) / side_height
        angle = math.degrees(math.atan2(side_span, front_span))
        weight = min(
            float(front_left["score"]), float(front_right["score"]),
            float(side_left["score"]), float(side_right["score"]),
        )
        values.append(angle)
        weights.append(max(weight, 0.01))
        estimates.append({
            "pair": name,
            "frontSpanBodyHeight": round(front_span, 8),
            "sideSpanBodyHeight": round(side_span, 8),
            "yawMagnitudeDeg": round(angle, 4),
            "confidenceWeight": round(weight, 6),
        })
    return weighted_mean(values, weights), estimates


def neutral_projection_factors(metric_assets: list[dict[str, Any]], yaw_deg: float) -> tuple[float, float, list[dict[str, float]]]:
    yaw = math.radians(yaw_deg)
    factors = []
    for asset in metric_assets:
        contour = np.asarray(asset["rows"]["waist"]["contour"]["pointsCm"], dtype=np.float64)
        contour -= np.mean(contour, axis=0)
        breadth = float(np.ptp(contour[:, 0]))
        depth = float(np.ptp(contour[:, 1]))
        front_values, side_values = [], []
        for sign in (-1.0, 1.0):
            angle = sign * yaw
            front_projected = contour[:, 0] * math.cos(angle) + contour[:, 1] * math.sin(angle)
            side_angle = math.pi / 2.0 - angle
            side_projected = contour[:, 0] * math.cos(side_angle) + contour[:, 1] * math.sin(side_angle)
            front_values.append(breadth / float(np.ptp(front_projected)))
            side_values.append(depth / float(np.ptp(side_projected)))
        factors.append({
            "scanId": asset["scanId"],
            "frontFactor": float(np.mean(front_values)),
            "sideFactor": float(np.mean(side_values)),
        })
    return (
        float(np.mean([item["frontFactor"] for item in factors])),
        float(np.mean([item["sideFactor"] for item in factors])),
        [{key: round(value, 8) if isinstance(value, float) else value for key, value in item.items()} for item in factors],
    )


def transform_mesh(mesh: dict[str, Any], roll_deg: float, horizontal_factor: float, shared: dict[str, Any]) -> dict[str, Any]:
    width, height = [float(value) for value in mesh["imageSize"]]
    outline = pairs(mesh["outline"])
    pixel_outline = outline * np.asarray([width, height])
    center = np.asarray([
        float((pixel_outline[:, 0].min() + pixel_outline[:, 0].max()) / 2.0),
        float((pixel_outline[:, 1].min() + pixel_outline[:, 1].max()) / 2.0),
    ])
    angle = math.radians(roll_deg)
    rotation = np.asarray([
        [math.cos(angle), -math.sin(angle)],
        [math.sin(angle), math.cos(angle)],
    ])

    def correct(flat: list[float]) -> list[float]:
        points = pairs(flat) * np.asarray([width, height])
        points = (points - center) @ rotation.T + center
        points[:, 0] = center[0] + (points[:, 0] - center[0]) * horizontal_factor
        points /= np.asarray([width, height])
        return np.round(points.reshape(-1), 8).tolist()

    return {
        **mesh,
        "schemaVersion": "wear-angle-corrected-visible-2d/v1",
        "vertices": correct(mesh["vertices"]),
        "outline": correct(mesh["outline"]),
        "cameraCorrection": {
            **shared,
            "backgroundRollRemovedDeg": round(roll_deg, 4),
            "horizontalCanonicalFactor": round(horizontal_factor, 8),
            "transform": "one global image-plane rotation plus one global horizontal camera factor",
            "localVertexWarpUsed": False,
            "bodyMeasurementsUsed": False,
        },
    }


def main() -> None:
    index = read_json(METRIC / "index.json")
    metric_assets = [read_json(METRIC / entry["path"]) for entry in index["scans"]]
    front_mesh, side_mesh = read_json(MESH_PATHS["front"]), read_json(MESH_PATHS["side"])
    front_pose, side_pose = read_json(POSE_PATHS["front"]), read_json(POSE_PATHS["side"])
    front_outline, side_outline = pairs(front_mesh["outline"]), pairs(side_mesh["outline"])
    front_roll, front_line_count = estimate_background_roll_deg(PHOTO_PATHS["front"], front_outline)
    side_roll, side_line_count = estimate_background_roll_deg(PHOTO_PATHS["side"], side_outline)
    yaw_deg, yaw_evidence = estimate_paired_yaw_deg(front_pose, side_pose, front_outline, side_outline)
    front_factor, side_factor, factor_evidence = neutral_projection_factors(metric_assets, yaw_deg)
    reference = build_wear_reference(metric_assets)
    shared = {
        "source": "strict-cohort average WEAR canonical frame plus Delaram front/side Sapiens2 pairs",
        "strictWearScanIds": [asset["scanId"] for asset in metric_assets],
        "wearReference": reference,
        "estimatedResidualYawMagnitudeDeg": round(yaw_deg, 4),
        "yawEvidence": yaw_evidence,
        "neutralProjectionFactorEvidence": factor_evidence,
        "tapeUsed": False,
        "circumferenceUsed": False,
        "depthLabelUsed": False,
        "savedLineUsed": False,
        "limitations": [
            "Small-angle correction only; it does not reconstruct occluded pixels.",
            "Background verticals remove roll, while paired front/side torso landmarks estimate yaw magnitude.",
            "Perspective and clothing remain independent error sources.",
        ],
    }
    OUTPUT.mkdir(parents=True, exist_ok=True)
    front = transform_mesh(front_mesh, front_roll, front_factor, {
        **shared, "view": "front", "backgroundVerticalLineCount": front_line_count,
    })
    side = transform_mesh(side_mesh, side_roll, side_factor, {
        **shared, "view": "side", "backgroundVerticalLineCount": side_line_count,
    })
    (OUTPUT / "delaram.json").write_text(json.dumps(front, indent=2) + "\n")
    (OUTPUT / "delaram-side.json").write_text(json.dumps(side, indent=2) + "\n")
    report = {
        "schemaVersion": "wear-camera-reference-proof/v1",
        "frontMesh": "delaram.json",
        "sideMesh": "delaram-side.json",
        "estimatedResidualYawMagnitudeDeg": round(yaw_deg, 4),
        "frontBackgroundRollDeg": round(front_roll, 4),
        "sideBackgroundRollDeg": round(side_roll, 4),
        "frontHorizontalFactor": round(front_factor, 8),
        "sideHorizontalFactor": round(side_factor, 8),
        "reference": reference,
        "answerLabelsUsed": False,
    }
    (OUTPUT / "index.json").write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
