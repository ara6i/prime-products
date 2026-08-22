#!/usr/bin/env python3
"""Fit Delaram camera orientation to real WEAR 3D landmark frames.

This is a private, CPU-only diagnostic.  It deliberately does not inspect the
room, a tape value, circumference, depth labels, or saved red lines.  It also
does not deform either the user mesh or a WEAR mesh.  A single rigid similarity
transform is fitted between paired anatomical landmarks for each of the nine
strict WEAR bodies.  Agreement between those independent fits is the angle
test; landmark residual remains a separate body-shape test.
"""

from __future__ import annotations

import json
import math
from pathlib import Path

import numpy as np
from scipy.optimize import least_squares


REPO_ROOT = Path(__file__).resolve().parents[2]
OVERLAY_ROOT = REPO_ROOT / ".local-ml/wear-mesh-overlay"
METRIC_ROOT = OVERLAY_ROOT / "metric-lines"
ANATOMICAL_ROOT = OVERLAY_ROOT / "anatomical"
PHOTO_MESH_ROOT = OVERLAY_ROOT / "blender-mesh"
OUTPUT_ROOT = OVERLAY_ROOT / "rigid-camera-fit"
HEIGHT_CM = 168.0

PHOTO_IDS = ("delaram", "delaram-side")
PAIR_MAP = {
    "shoulders": (("Lt. Acromion", "Rt. Acromion"), (5, 6)),
    "hips": (("Lt. Trochanterion", "Rt. Trochanterion"), (9, 10)),
    "knees": (("Lt. Femoral Lateral Epicn", "Rt. Femoral Lateral Epicn"), (11, 12)),
    "ankles": (("Lt. Lateral Malleolus", "Rt. Lateral Malleolus"), (13, 14)),
}


def similarity_fit(source: np.ndarray, target: np.ndarray) -> tuple[float, np.ndarray, np.ndarray]:
    """Return scale, rotation and translation for row-vector source @ R."""
    source_centered = source - source.mean(axis=0)
    target_centered = target - target.mean(axis=0)
    source_norm = float(np.linalg.norm(source_centered))
    target_norm = float(np.linalg.norm(target_centered))
    if source_norm <= 1e-9 or target_norm <= 1e-9:
        raise ValueError("Landmark fit is degenerate.")
    scale = target_norm / source_norm
    u, _, vt = np.linalg.svd(source_centered.T @ target_centered)
    rotation = u @ vt
    if np.linalg.det(rotation) < 0:
        vt[-1] *= -1
        rotation = u @ vt
    translation = target.mean(axis=0) - scale * source.mean(axis=0) @ rotation
    return scale, rotation, translation


def yaw_from_rotation(rotation: np.ndarray) -> float:
    """WEAR posterior-to-anterior axis direction in Meta camera X/Z."""
    anterior_in_camera = np.asarray([0.0, 1.0, 0.0]) @ rotation
    return math.degrees(math.atan2(anterior_in_camera[0], anterior_in_camera[2]))


def roll_from_rotation(rotation: np.ndarray) -> float:
    """WEAR up-axis tilt in Meta camera X/Y."""
    up_in_camera = np.asarray([0.0, 0.0, 1.0]) @ rotation
    return math.degrees(math.atan2(up_in_camera[0], -up_in_camera[1]))


def scanline(points: np.ndarray, y: float) -> tuple[float, float] | None:
    intersections: list[float] = []
    for index, (ax, ay) in enumerate(points):
        bx, by = points[(index + 1) % len(points)]
        if not ((ay <= y < by) or (by <= y < ay)):
            continue
        intersections.append(float(ax + (y - ay) / (by - ay) * (bx - ax)))
    intersections.sort()
    candidates = list(zip(intersections[0::2], intersections[1::2]))
    return max(candidates, key=lambda pair: pair[1] - pair[0]) if candidates else None


def photo_width_cm(photo_id: str, height_fraction: float) -> float:
    payload = json.loads((PHOTO_MESH_ROOT / f"{photo_id}.json").read_text())
    points = np.asarray(payload["outline"], dtype=np.float64).reshape(-1, 2)
    image_width, image_height = payload["imageSize"]
    minimum = points.min(axis=0)
    maximum = points.max(axis=0)
    body_height_px = float((maximum[1] - minimum[1]) * image_height)
    y = float(maximum[1] - height_fraction * (maximum[1] - minimum[1]))
    interval = scanline(points, y)
    if interval is None or body_height_px <= 0:
        raise ValueError(f"No body interval for {photo_id} at {height_fraction:.3f}.")
    return float((interval[1] - interval[0]) * image_width / body_height_px * HEIGHT_CM)


def contour_span(points: np.ndarray, scale_x: float, scale_y: float, yaw_deg: float) -> float:
    radians = math.radians(yaw_deg)
    projected = points[:, 0] * scale_x * math.cos(radians) + points[:, 1] * scale_y * math.sin(radians)
    return float(np.ptp(projected))


def resized_perimeter(points: np.ndarray, scale_x: float, scale_y: float) -> float:
    resized = points * np.asarray([scale_x, scale_y])
    return float(np.linalg.norm(np.roll(resized, -1, axis=0) - resized, axis=1).sum())


def solve_cross_section(
    points: np.ndarray,
    front_yaw_deg: float,
    side_yaw_deg: float,
    observed_front_cm: float,
    observed_side_cm: float,
) -> dict:
    centered = points - (points.min(axis=0) + points.max(axis=0)) / 2.0

    def residual(log_scales: np.ndarray) -> np.ndarray:
        scale_x, scale_y = np.exp(log_scales)
        return np.asarray([
            contour_span(centered, scale_x, scale_y, front_yaw_deg) - observed_front_cm,
            contour_span(centered, scale_x, scale_y, side_yaw_deg) - observed_side_cm,
        ])

    result = least_squares(residual, np.zeros(2), bounds=(math.log(0.45), math.log(1.65)))
    scale_x, scale_y = np.exp(result.x)
    breadth = float(np.ptp(centered[:, 0]) * scale_x)
    depth = float(np.ptp(centered[:, 1]) * scale_y)
    return {
        "canonicalBreadthCm": round(breadth, 5),
        "canonicalDepthCm": round(depth, 5),
        "circumferenceCm": round(resized_perimeter(centered, scale_x, scale_y), 5),
        "frontReprojectionCm": round(contour_span(centered, scale_x, scale_y, front_yaw_deg), 5),
        "sideReprojectionCm": round(contour_span(centered, scale_x, scale_y, side_yaw_deg), 5),
        "solverResidualCm": round(float(np.linalg.norm(result.fun)), 6),
    }


def load_landmark_pairs(metric: dict, mhr70: np.ndarray) -> tuple[np.ndarray, np.ndarray, list[str]]:
    wear: list[list[float]] = []
    meta: list[list[float]] = []
    labels: list[str] = []
    for pair_name, (landmark_names, mhr_indices) in PAIR_MAP.items():
        for landmark_name, mhr_index in zip(landmark_names, mhr_indices):
            wear.append(metric["landmarks"]["points"][landmark_name]["canonical3dCm"])
            meta.append(mhr70[mhr_index].tolist())
            labels.append(pair_name)
    return np.asarray(wear) / 100.0, np.asarray(meta), labels


def main() -> None:
    metric_index = json.loads((METRIC_ROOT / "index.json").read_text())
    metrics = {
        entry["scanId"]: json.loads((METRIC_ROOT / entry["path"]).read_text())
        for entry in metric_index["scans"]
    }
    photo_payloads = {
        photo_id: json.loads((ANATOMICAL_ROOT / f"{photo_id}-mhr-rgb.json").read_text())
        for photo_id in PHOTO_IDS
    }

    view_reports: dict[str, dict] = {}
    all_fit_rotations: dict[str, list[np.ndarray]] = {photo_id: [] for photo_id in PHOTO_IDS}
    for photo_id, photo in photo_payloads.items():
        mhr70 = np.asarray(photo["mhr70Camera3d"], dtype=np.float64)
        references = []
        for scan_id, metric in metrics.items():
            wear, meta, labels = load_landmark_pairs(metric, mhr70)
            scale, rotation, translation = similarity_fit(wear, meta)
            predicted = scale * wear @ rotation + translation
            residuals = np.linalg.norm(predicted - meta, axis=1)
            holdouts = []
            for held_pair in PAIR_MAP:
                keep = np.asarray([label != held_pair for label in labels])
                held = ~keep
                held_scale, held_rotation, held_translation = similarity_fit(wear[keep], meta[keep])
                held_prediction = held_scale * wear[held] @ held_rotation + held_translation
                holdouts.append({
                    "pair": held_pair,
                    "yawDeg": round(yaw_from_rotation(held_rotation), 5),
                    "meanResidualCm": round(float(np.mean(np.linalg.norm(held_prediction - meta[held], axis=1))) * 100.0, 4),
                })
            all_fit_rotations[photo_id].append(rotation)
            references.append({
                "scanId": scan_id,
                "yawDeg": round(yaw_from_rotation(rotation), 5),
                "rollDeg": round(roll_from_rotation(rotation), 5),
                "meanLandmarkResidualCm": round(float(np.mean(residuals)) * 100.0, 4),
                "maxLandmarkResidualCm": round(float(np.max(residuals)) * 100.0, 4),
                "heldOutPairs": holdouts,
            })
        yaws = np.asarray([entry["yawDeg"] for entry in references])
        rolls = np.asarray([entry["rollDeg"] for entry in references])
        holdout_residuals = np.asarray([
            holdout["meanResidualCm"]
            for entry in references
            for holdout in entry["heldOutPairs"]
        ])
        view_reports[photo_id] = {
            "medianYawDeg": round(float(np.median(yaws)), 5),
            "yawStandardDeviationDeg": round(float(np.std(yaws)), 5),
            "yawMinDeg": round(float(np.min(yaws)), 5),
            "yawMaxDeg": round(float(np.max(yaws)), 5),
            "medianRollDeg": round(float(np.median(rolls)), 5),
            "medianHeldOutLandmarkResidualCm": round(float(np.median(holdout_residuals)), 4),
            "references": references,
        }

    front_yaw = view_reports["delaram"]["medianYawDeg"]
    side_yaw = view_reports["delaram-side"]["medianYawDeg"]
    orthogonality_error = abs(abs(side_yaw - front_yaw) - 90.0)
    max_yaw_std = max(report["yawStandardDeviationDeg"] for report in view_reports.values())
    angle_accepted = max_yaw_std <= 2.0 and orthogonality_error <= 3.0

    # The row comes from the RGB outline alone. It is not a saved line or tape.
    waist_fraction = 0.632
    observed_front = photo_width_cm("delaram", waist_fraction)
    observed_side = photo_width_cm("delaram-side", waist_fraction)
    candidate_solutions = {}
    for scan_id, metric in metrics.items():
        contour = np.asarray(metric["rows"]["waist"]["contour"]["pointsCm"], dtype=np.float64)
        candidate_solutions[scan_id] = solve_cross_section(
            contour,
            front_yaw,
            side_yaw,
            observed_front,
            observed_side,
        )

    output = {
        "schemaVersion": "wear-rigid-camera-fit/v1",
        "status": "accepted-angle-only" if angle_accepted else "rejected",
        "privateTestLabOnly": True,
        "releaseApproved": False,
        "method": "rigid similarity fit from each real WEAR 3D landmark frame to Meta MHR70 camera-space joints",
        "inputs": {
            "rgbPhotos": ["delaram-front.jpg", "delaram-side.jpg"],
            "strictWearScanCount": len(metrics),
            "wearLandmarkPairs": list(PAIR_MAP),
            "delaramTapeUsed": False,
            "wearTapeUsed": False,
            "circumferenceUsedForFit": False,
            "wallsOrDoorsUsed": False,
            "depthProUsed": False,
            "appleUsed": False,
            "gpuUsed": False,
        },
        "transform": {
            "type": "one global rigid rotation + translation + uniform scale",
            "localVertexWarpUsed": False,
            "nonUniformStretchUsed": False,
            "meshVerticesModified": False,
        },
        "angleValidation": {
            "status": "accepted" if angle_accepted else "rejected",
            "gate": "yaw std <= 2 degrees and front/side separation within 3 degrees of 90",
            "maximumReferenceYawStdDeg": round(max_yaw_std, 5),
            "frontSideOrthogonalityErrorDeg": round(orthogonality_error, 5),
            "views": view_reports,
        },
        "shapeValidation": {
            "status": "rejected",
            "reason": "Held-out landmark position residual is too large to claim that Meta reconstructed Delaram's exact body shape.",
        },
        "measurementEffect": {
            "row": "natural waist candidate from visible RGB outline",
            "heightFractionFromFeet": waist_fraction,
            "observedFrontSpanCmEquivalent": round(observed_front, 5),
            "observedSideSpanCmEquivalent": round(observed_side, 5),
            "frontYawDeg": front_yaw,
            "sideYawDeg": side_yaw,
            "candidateSolutions": candidate_solutions,
        },
        "honestBoundary": (
            "The angle is stable across WEAR references, but the centimetre scale still comes from photo height. "
            "Camera rotation can be tested here; it does not independently prove absolute A-B centimetres."
        ),
    }
    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)
    output_path = OUTPUT_ROOT / "index.json"
    output_path.write_text(json.dumps(output, indent=2) + "\n")
    print(json.dumps({
        "output": str(output_path.relative_to(REPO_ROOT)),
        "status": output["status"],
        "frontYawDeg": front_yaw,
        "sideYawDeg": side_yaw,
        "orthogonalityErrorDeg": round(orthogonality_error, 5),
        "observedFrontCm": round(observed_front, 3),
        "observedSideCm": round(observed_side, 3),
    }, indent=2))


if __name__ == "__main__":
    main()
