#!/usr/bin/env python3
"""Honest, CPU-only validation for fixed-topology 2D body meshes.

This evaluator deliberately separates fitting evidence from evaluation truth.
A candidate can never pass when its reference outline (or the same bytes under
another name) was used to fit it.  It normalizes each photographed body to a
1,024 px reference height and reports silhouette, regional boundary, keypoint,
topology, and same-person cross-photo consistency metrics.

The evaluator does not generate a mesh, infer measurements, use depth, start a
GPU, or publish anything.  It consumes local JSON/PNG evidence and writes one
reviewable JSON report.
"""

from __future__ import annotations

import argparse
from collections import Counter
from datetime import datetime, timezone
import hashlib
import json
import math
from pathlib import Path
from typing import Any

import cv2
import numpy as np
from scipy import ndimage


REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_OUTPUT = REPO_ROOT / ".local-ml/wear-mesh-proof/evaluation-report.json"
NORMALIZED_BODY_HEIGHT_PX = 1024
REGIONS = ("torso", "arms", "hands", "hips", "thighs", "calves", "feet")
REGION_IDS = {name: index + 1 for index, name in enumerate(REGIONS)}

DEFAULT_GATES: dict[str, float | int] = {
    "silhouetteIouMin": 0.97,
    "regionMeanBoundaryPctMax": 0.75,
    "regionP95BoundaryPctMax": 1.5,
    "keypointMeanPctMax": 1.5,
    "keypointP95PctMax": 3.0,
    "flippedTriangleCountMax": 0,
    "brokenTopologyCountMax": 0,
    "canonicalConsistencyMeanPctMax": 1.5,
    "canonicalConsistencyP95PctMax": 4.0,
}


class ValidationInputError(ValueError):
    """Raised when an evidence artifact is malformed."""


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def sha256_json(value: Any) -> str:
    encoded = json.dumps(value, sort_keys=True, separators=(",", ":")).encode("utf-8")
    return hashlib.sha256(encoded).hexdigest()


def resolve_path(manifest_path: Path, raw: str | Path) -> Path:
    path = Path(raw).expanduser()
    if path.is_absolute():
        return path
    beside_manifest = (manifest_path.parent / path).resolve()
    if beside_manifest.exists():
        return beside_manifest
    return (REPO_ROOT / path).resolve()


def read_json(path: Path) -> dict[str, Any]:
    try:
        value = json.loads(path.read_text())
    except (OSError, json.JSONDecodeError) as error:
        raise ValidationInputError(f"Could not read JSON {path}: {error}") from error
    if not isinstance(value, dict):
        raise ValidationInputError(f"Expected a JSON object: {path}")
    return value


def flatten_points(value: Any, label: str) -> np.ndarray:
    array = np.asarray(value, dtype=np.float64)
    if array.size == 0 or array.size % 2:
        raise ValidationInputError(f"{label} must contain X/Y pairs")
    return array.reshape(-1, 2)


def flatten_triangles(value: Any, label: str) -> tuple[np.ndarray, int]:
    array = np.asarray(value, dtype=np.int64).reshape(-1)
    trailing = int(array.size % 3)
    if trailing:
        array = array[: array.size - trailing]
    return array.reshape(-1, 3), trailing


def points_to_pixels(
    points: np.ndarray,
    coordinate_space: str,
    image_width: int,
    image_height: int,
) -> np.ndarray:
    if coordinate_space in {"normalized", "normalized-image-xy", "image-normalized"}:
        return points * np.asarray([image_width - 1, image_height - 1], dtype=np.float64)
    if coordinate_space in {"pixels", "pixel", "image-pixels"}:
        return points.copy()
    raise ValidationInputError(f"Unsupported coordinateSpace: {coordinate_space}")


def infer_coordinate_space(points: np.ndarray, record: dict[str, Any]) -> str:
    declared = record.get("coordinateSpace")
    if declared:
        return str(declared)
    finite = points[np.isfinite(points)]
    if finite.size and float(np.nanmax(np.abs(finite))) <= 2.0:
        return "normalized"
    return "pixels"


def load_binary_mask(path: Path) -> np.ndarray:
    mask = cv2.imread(str(path), cv2.IMREAD_GRAYSCALE)
    if mask is None:
        raise ValidationInputError(f"Could not read reference mask: {path}")
    binary = (mask >= 128).astype(np.uint8)
    if int(binary.sum()) < 100:
        raise ValidationInputError(f"Reference mask is empty: {path}")
    return binary


def load_polygon_outline(path: Path) -> tuple[np.ndarray, int, int]:
    payload = read_json(path)
    width = int(payload.get("imageWidth", 0))
    height = int(payload.get("imageHeight", 0))
    if width <= 0 or height <= 0:
        raise ValidationInputError(f"Outline needs imageWidth/imageHeight: {path}")
    polygons = payload.get("polygons")
    if polygons is None and payload.get("outline") is not None:
        polygons = [payload["outline"]]
    if not isinstance(polygons, list) or not polygons:
        raise ValidationInputError(f"Outline needs at least one polygon: {path}")
    mask = np.zeros((height, width), dtype=np.uint8)
    for index, polygon in enumerate(polygons):
        points = flatten_points(polygon, f"polygons[{index}]")
        cv2.fillPoly(mask, [np.rint(points).astype(np.int32)], 1)
    if int(mask.sum()) < 100:
        raise ValidationInputError(f"Outline polygons are empty: {path}")
    return mask, width, height


def load_keypoints(
    value: Any,
    *,
    manifest_path: Path,
    image_width: int,
    image_height: int,
    default_coordinate_space: str = "pixels",
) -> dict[str, np.ndarray]:
    if value is None:
        return {}
    payload: Any = value
    if isinstance(value, str):
        payload = read_json(resolve_path(manifest_path, value))
    if isinstance(payload, dict) and "keypoints" in payload:
        coordinate_space = str(payload.get("coordinateSpace", default_coordinate_space))
        raw_points = payload["keypoints"]
        if isinstance(raw_points, dict):
            result = {}
            for name, point in raw_points.items():
                xy = flatten_points(point, f"keypoint {name}")[0]
                result[str(name)] = points_to_pixels(
                    xy.reshape(1, 2), coordinate_space, image_width, image_height
                )[0]
            return result
        names = payload.get("names")
        points = flatten_points(raw_points, "keypoints")
        if names is None and isinstance(payload.get("mhr70"), list):
            mhr70 = payload["mhr70"]
            if len(mhr70) <= len(points) and all(isinstance(item, dict) for item in mhr70):
                names = [str(item.get("name", f"mhr70_{index}")) for index, item in enumerate(mhr70)]
                # Sapiens2 stores its complete output, while the MHR mapping
                # describes the first 70 compatible body points.
                points = points[: len(names)]
        if not isinstance(names, list) or len(names) != len(points):
            raise ValidationInputError("Array keypoints require same-length names")
        pixels = points_to_pixels(points, coordinate_space, image_width, image_height)
        return {str(name): pixels[index] for index, name in enumerate(names)}
    if isinstance(payload, dict):
        result = {}
        for name, point in payload.items():
            xy = flatten_points(point, f"keypoint {name}")[0]
            result[str(name)] = xy
        return result
    raise ValidationInputError("Unsupported keypoint document")


def load_reference(reference: dict[str, Any], manifest_path: Path) -> dict[str, Any]:
    mask_path_raw = reference.get("maskPath")
    outline_path_raw = reference.get("outlinePath")
    if bool(mask_path_raw) == bool(outline_path_raw):
        raise ValidationInputError("Reference needs exactly one of maskPath or outlinePath")
    source_path = resolve_path(manifest_path, mask_path_raw or outline_path_raw)
    if mask_path_raw:
        mask = load_binary_mask(source_path)
        height, width = mask.shape
    else:
        mask, width, height = load_polygon_outline(source_path)

    region_mask = None
    region_mask_path = None
    if reference.get("regionMaskPath"):
        region_mask_path = resolve_path(manifest_path, reference["regionMaskPath"])
        region_mask = cv2.imread(str(region_mask_path), cv2.IMREAD_GRAYSCALE)
        if region_mask is None:
            raise ValidationInputError(f"Could not read region mask: {region_mask_path}")
        if region_mask.shape != mask.shape:
            raise ValidationInputError("Reference mask and region mask sizes differ")
        labels = reference.get("regionLabels", REGION_IDS)
        if not isinstance(labels, dict):
            raise ValidationInputError("regionLabels must be a name-to-integer object")
        remapped = np.zeros_like(region_mask, dtype=np.uint8)
        for name in REGIONS:
            if name not in labels:
                raise ValidationInputError(f"regionLabels is missing {name}")
            remapped[region_mask == int(labels[name])] = REGION_IDS[name]
        region_mask = remapped

    keypoints_value = reference.get("keypoints") or reference.get("keypointsPath")
    keypoints = load_keypoints(
        keypoints_value,
        manifest_path=manifest_path,
        image_width=width,
        image_height=height,
    )
    provenance = reference.get("provenance", {})
    if not isinstance(provenance, dict):
        provenance = {}
    proof_reasons = []
    required_flags = {
        "heldOut": "reference was not declared held out",
        "createdWithoutCandidate": "reference may have been created from the candidate",
        "hairExcluded": "hair is not excluded from visible-body truth",
        "backgroundExcluded": "background exclusion is not confirmed",
        "visibleTightClothingTruth": "visible tight-clothing truth is not confirmed",
    }
    for flag, reason in required_flags.items():
        if provenance.get(flag) is not True:
            proof_reasons.append(reason)
    if region_mask is None:
        proof_reasons.append("independent seven-region annotation is missing")
    if not keypoints:
        proof_reasons.append("independent anatomical keypoints are missing")

    evidence_id = str(reference.get("evidenceId", source_path.name))
    evidence_ids = [evidence_id]
    evidence_hashes = [sha256_file(source_path)]
    if region_mask_path is not None:
        evidence_ids.append(str(reference.get("regionEvidenceId", f"{evidence_id}:regions")))
        evidence_hashes.append(sha256_file(region_mask_path))
    if keypoints_value is not None:
        evidence_ids.append(str(reference.get("keypointEvidenceId", f"{evidence_id}:keypoints")))
        if isinstance(keypoints_value, str):
            evidence_hashes.append(sha256_file(resolve_path(manifest_path, keypoints_value)))
        else:
            evidence_hashes.append(sha256_json(keypoints_value))

    return {
        "photoId": str(reference["photoId"]),
        "mask": mask,
        "regionMask": region_mask,
        "keypoints": keypoints,
        "imageWidth": width,
        "imageHeight": height,
        "sourcePath": source_path,
        "sourceSha256": evidence_hashes[0],
        "regionMaskPath": region_mask_path,
        "evidenceId": evidence_id,
        "evidenceIds": evidence_ids,
        "evidenceSha256": evidence_hashes,
        "provenance": provenance,
        "baseProofEligible": not proof_reasons,
        "baseProofReasons": proof_reasons,
    }


def auto_region_mask(mask: np.ndarray) -> np.ndarray:
    """Diagnostic fallback only; it is never proof-eligible."""
    ys, xs = np.where(mask > 0)
    x0, x1 = int(xs.min()), int(xs.max())
    y0, y1 = int(ys.min()), int(ys.max())
    height = max(1.0, float(y1 - y0 + 1))
    center_x = (x0 + x1) / 2.0
    yy, xx = np.indices(mask.shape)
    y_fraction = (yy - y0) / height
    x_distance = np.abs(xx - center_x) / height
    labels = np.zeros_like(mask, dtype=np.uint8)

    outer_upper = (x_distance > 0.16) & (y_fraction >= 0.14) & (y_fraction < 0.59)
    labels[(mask > 0) & outer_upper] = REGION_IDS["arms"]
    labels[(mask > 0) & outer_upper & (y_fraction >= 0.44)] = REGION_IDS["hands"]
    labels[(mask > 0) & (labels == 0) & (y_fraction >= 0.12) & (y_fraction < 0.47)] = REGION_IDS["torso"]
    labels[(mask > 0) & (labels == 0) & (y_fraction >= 0.47) & (y_fraction < 0.59)] = REGION_IDS["hips"]
    labels[(mask > 0) & (labels == 0) & (y_fraction >= 0.59) & (y_fraction < 0.76)] = REGION_IDS["thighs"]
    labels[(mask > 0) & (labels == 0) & (y_fraction >= 0.76) & (y_fraction < 0.94)] = REGION_IDS["calves"]
    labels[(mask > 0) & (labels == 0) & (y_fraction >= 0.94)] = REGION_IDS["feet"]
    return labels


def mask_bounds(mask: np.ndarray) -> tuple[int, int, int, int]:
    ys, xs = np.where(mask > 0)
    if len(xs) < 100:
        raise ValidationInputError("Reference outline is empty")
    return int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())


def build_normalization(
    reference_mask: np.ndarray,
    candidate_pixels: np.ndarray,
) -> dict[str, Any]:
    x0, y0, x1, y1 = mask_bounds(reference_mask)
    # Coordinates describe pixel centres.  The physical distance between the
    # top and bottom outline samples is y1-y0, not the number of stored rows.
    # Using +1 here creates a systematic mesh-vs-mask scale disagreement after
    # normalization and can falsely fail an otherwise exact outline.
    body_height = float(max(1, y1 - y0))
    scale = NORMALIZED_BODY_HEIGHT_PX / body_height
    center_x = (x0 + x1) / 2.0
    candidate_normalized = np.column_stack(
        [(candidate_pixels[:, 0] - center_x) * scale, (candidate_pixels[:, 1] - y0) * scale]
    )
    reference_x = np.asarray([(x0 - center_x) * scale, (x1 - center_x) * scale])
    finite_candidate = candidate_normalized[np.isfinite(candidate_normalized).all(axis=1)]
    all_x = np.concatenate([reference_x, finite_candidate[:, 0]]) if len(finite_candidate) else reference_x
    all_y = np.concatenate([np.asarray([0.0, float(NORMALIZED_BODY_HEIGHT_PX)]), finite_candidate[:, 1]]) if len(finite_candidate) else np.asarray([0.0, float(NORMALIZED_BODY_HEIGHT_PX)])
    minimum_x = float(np.min(all_x))
    maximum_x = float(np.max(all_x))
    minimum_y = float(np.min(all_y))
    maximum_y = float(np.max(all_y))
    margin = 32.0
    canvas_width = int(math.ceil(maximum_x - minimum_x + margin * 2))
    canvas_height = int(math.ceil(maximum_y - minimum_y + margin * 2))
    if canvas_width > 4096 or canvas_height > 4096:
        raise ValidationInputError("Candidate is implausibly far outside the reference body")
    offset_x = -minimum_x + margin
    offset_y = -minimum_y + margin
    transform = np.asarray(
        [[scale, 0.0, -center_x * scale + offset_x], [0.0, scale, -y0 * scale + offset_y]],
        dtype=np.float64,
    )
    return {
        "scale": scale,
        "transform": transform,
        "canvasWidth": max(canvas_width, 64),
        "canvasHeight": max(canvas_height, 64),
        "referenceBodyHeightPx": body_height,
        "normalizedBodyHeightPx": NORMALIZED_BODY_HEIGHT_PX,
        "candidateVertices": candidate_normalized + [offset_x, offset_y],
    }


def valid_triangle_rows(vertices: np.ndarray, triangles: np.ndarray) -> np.ndarray:
    return (
        (triangles >= 0).all(axis=1)
        & (triangles < len(vertices)).all(axis=1)
        & (triangles[:, 0] != triangles[:, 1])
        & (triangles[:, 1] != triangles[:, 2])
        & (triangles[:, 0] != triangles[:, 2])
    )


def rasterize_mesh(vertices: np.ndarray, triangles: np.ndarray, width: int, height: int) -> np.ndarray:
    mask = np.zeros((height, width), dtype=np.uint8)
    valid = valid_triangle_rows(vertices, triangles)
    for triangle in triangles[valid]:
        points = vertices[triangle]
        if not np.isfinite(points).all():
            continue
        cv2.fillConvexPoly(mask, np.rint(points).astype(np.int32), 1)
    return mask


def signed_triangle_areas(vertices: np.ndarray, triangles: np.ndarray) -> np.ndarray:
    points = vertices[triangles]
    a, b, c = points[:, 0], points[:, 1], points[:, 2]
    return 0.5 * ((b[:, 0] - a[:, 0]) * (c[:, 1] - a[:, 1]) - (b[:, 1] - a[:, 1]) * (c[:, 0] - a[:, 0]))


def topology_metrics(
    vertices: np.ndarray,
    triangles: np.ndarray,
    trailing_triangle_values: int,
    baseline_vertices: np.ndarray | None,
    is_topology_baseline: bool,
) -> dict[str, Any]:
    in_range = (triangles >= 0).all(axis=1) & (triangles < len(vertices)).all(axis=1)
    repeated = np.zeros(len(triangles), dtype=bool)
    repeated[in_range] = (
        (triangles[in_range, 0] == triangles[in_range, 1])
        | (triangles[in_range, 1] == triangles[in_range, 2])
        | (triangles[in_range, 0] == triangles[in_range, 2])
    )
    finite_vertices = np.isfinite(vertices).all(axis=1)
    finite_faces = np.zeros(len(triangles), dtype=bool)
    finite_faces[in_range] = finite_vertices[triangles[in_range]].all(axis=1)
    geometric = in_range & ~repeated & finite_faces
    degenerate = np.zeros(len(triangles), dtype=bool)
    if geometric.any():
        areas = signed_triangle_areas(vertices, triangles[geometric])
        degenerate[geometric] = np.abs(areas) <= 1e-6

    edge_counts: Counter[tuple[int, int]] = Counter()
    for triangle in triangles[geometric & ~degenerate]:
        for left, right in ((triangle[0], triangle[1]), (triangle[1], triangle[2]), (triangle[2], triangle[0])):
            edge_counts[tuple(sorted((int(left), int(right))))] += 1
    non_manifold_edges = sum(1 for count in edge_counts.values() if count > 2)

    flip_available = is_topology_baseline
    flipped = 0
    baseline_reason = None
    if baseline_vertices is not None:
        if baseline_vertices.shape != vertices.shape:
            baseline_reason = "topology baseline vertex count differs"
        elif geometric.any():
            candidate_areas = signed_triangle_areas(vertices, triangles[geometric])
            baseline_areas = signed_triangle_areas(baseline_vertices, triangles[geometric])
            comparable = (np.abs(candidate_areas) > 1e-6) & (np.abs(baseline_areas) > 1e-6)
            flipped = int(np.sum(np.sign(candidate_areas[comparable]) != np.sign(baseline_areas[comparable])))
            flip_available = True
    elif not is_topology_baseline:
        baseline_reason = "deformed mesh has no topology baseline for flip comparison"

    invalid_indices = int((~in_range).sum())
    repeated_count = int(repeated.sum())
    nonfinite_count = int((in_range & ~finite_faces).sum())
    degenerate_count = int(degenerate.sum())
    broken_count = (
        invalid_indices
        + repeated_count
        + nonfinite_count
        + degenerate_count
        + int(non_manifold_edges)
        + int(trailing_triangle_values > 0)
    )
    return {
        "flipCheckAvailable": flip_available,
        "baselineReason": baseline_reason,
        "flippedTriangleCount": flipped,
        "brokenTopologyCount": broken_count,
        "invalidIndexTriangleCount": invalid_indices,
        "repeatedVertexTriangleCount": repeated_count,
        "nonFiniteTriangleCount": nonfinite_count,
        "degenerateTriangleCount": degenerate_count,
        "nonManifoldEdgeCount": int(non_manifold_edges),
        "trailingTriangleValueCount": int(trailing_triangle_values),
    }


def binary_boundary(mask: np.ndarray) -> np.ndarray:
    binary = (mask > 0).astype(np.uint8)
    eroded = cv2.erode(binary, np.ones((3, 3), dtype=np.uint8), iterations=1)
    return (binary > eroded)


def silhouette_iou(left: np.ndarray, right: np.ndarray) -> float:
    union = int(np.logical_or(left > 0, right > 0).sum())
    if not union:
        return 0.0
    return float(np.logical_and(left > 0, right > 0).sum() / union)


def regional_boundary_metrics(
    candidate_mask: np.ndarray,
    reference_mask: np.ndarray,
    region_mask: np.ndarray,
    scale_to_1024: float = 1.0,
) -> dict[str, Any]:
    candidate_boundary = binary_boundary(candidate_mask)
    reference_boundary = binary_boundary(reference_mask)
    if not candidate_boundary.any() or not reference_boundary.any():
        return {name: {"available": False, "reason": "empty boundary"} for name in REGIONS}
    distance_to_candidate = ndimage.distance_transform_edt(~candidate_boundary)
    distance_to_reference, nearest_reference = ndimage.distance_transform_edt(
        ~reference_boundary, return_indices=True
    )
    nearest_region = region_mask[nearest_reference[0], nearest_reference[1]]
    result: dict[str, Any] = {}
    for name in REGIONS:
        region_id = REGION_IDS[name]
        reference_selection = reference_boundary & (region_mask == region_id)
        candidate_selection = candidate_boundary & (nearest_region == region_id)
        distances = np.concatenate(
            [distance_to_candidate[reference_selection], distance_to_reference[candidate_selection]]
        ) * float(scale_to_1024)
        if distances.size == 0:
            result[name] = {"available": False, "reason": "region has no annotated boundary"}
            continue
        mean_px = float(np.mean(distances))
        p95_px = float(np.quantile(distances, 0.95))
        result[name] = {
            "available": True,
            "sampleCount": int(distances.size),
            "meanPx1024": round(mean_px, 4),
            "p95Px1024": round(p95_px, 4),
            "meanPctBodyHeight": round(mean_px / NORMALIZED_BODY_HEIGHT_PX * 100.0, 4),
            "p95PctBodyHeight": round(p95_px / NORMALIZED_BODY_HEIGHT_PX * 100.0, 4),
        }
    return result


def keypoint_metrics(
    candidate: dict[str, np.ndarray],
    reference: dict[str, np.ndarray],
    scale_to_1024: float = 1.0,
) -> dict[str, Any]:
    names = sorted(set(candidate).intersection(reference))
    if not names:
        return {"available": False, "reason": "no shared independent keypoints"}
    distances = np.asarray(
        [np.linalg.norm(candidate[name] - reference[name]) for name in names],
        dtype=np.float64,
    ) * float(scale_to_1024)
    mean_px = float(np.mean(distances))
    p95_px = float(np.quantile(distances, 0.95))
    return {
        "available": True,
        "names": names,
        "count": len(names),
        "meanPx1024": round(mean_px, 4),
        "p95Px1024": round(p95_px, 4),
        "meanPctBodyHeight": round(mean_px / NORMALIZED_BODY_HEIGHT_PX * 100.0, 4),
        "p95PctBodyHeight": round(p95_px / NORMALIZED_BODY_HEIGHT_PX * 100.0, 4),
    }


def candidate_fit_evidence(candidate: dict[str, Any]) -> tuple[list[str], list[str], bool]:
    exact_inputs = candidate.get("exactInputs", {})
    if not isinstance(exact_inputs, dict):
        exact_inputs = {}
    ids_declared = "fitEvidenceIds" in candidate or "fitEvidenceIds" in exact_inputs
    hashes_declared = "fitEvidenceSha256" in candidate or "fitEvidenceSha256" in exact_inputs
    ids = candidate.get("fitEvidenceIds", exact_inputs.get("fitEvidenceIds", []))
    hashes = candidate.get("fitEvidenceSha256", exact_inputs.get("fitEvidenceSha256", []))
    return [str(value) for value in ids or []], [str(value).lower() for value in hashes or []], bool(ids_declared and hashes_declared)


def candidate_mesh_path(candidate: dict[str, Any], manifest_path: Path) -> Path:
    raw = candidate.get("meshPath")
    artifacts = candidate.get("artifacts")
    if not raw and isinstance(artifacts, dict):
        raw = artifacts.get("meshPath") or artifacts.get("projectedMeshJson")
    if not raw:
        raise ValidationInputError("Candidate is missing meshPath")
    return resolve_path(manifest_path, raw)


def load_mesh(
    candidate: dict[str, Any], manifest_path: Path, expected_width: int, expected_height: int
) -> dict[str, Any]:
    path = candidate_mesh_path(candidate, manifest_path)
    payload = read_json(path)
    image_width = int(payload.get("imageWidth", payload.get("imageSize", [expected_width, expected_height])[0]))
    image_height = int(payload.get("imageHeight", payload.get("imageSize", [expected_width, expected_height])[1]))
    vertices = flatten_points(payload.get("vertices"), "vertices")
    coordinate_space = infer_coordinate_space(vertices, candidate | payload)
    pixels = points_to_pixels(vertices, coordinate_space, image_width, image_height)
    if (image_width, image_height) != (expected_width, expected_height):
        pixels *= np.asarray([expected_width / image_width, expected_height / image_height])
        image_width, image_height = expected_width, expected_height
    triangles, trailing = flatten_triangles(payload.get("triangles"), "triangles")

    baseline_vertices = None
    if payload.get("rawVertices") is not None:
        raw = flatten_points(payload["rawVertices"], "rawVertices")
        raw_space = infer_coordinate_space(raw, candidate | payload)
        baseline_vertices = points_to_pixels(raw, raw_space, image_width, image_height)
    elif candidate.get("topologyBaselinePath"):
        baseline_payload = read_json(resolve_path(manifest_path, candidate["topologyBaselinePath"]))
        raw = flatten_points(baseline_payload.get("vertices"), "baseline vertices")
        raw_space = infer_coordinate_space(raw, candidate | baseline_payload)
        baseline_width = int(baseline_payload.get("imageWidth", image_width))
        baseline_height = int(baseline_payload.get("imageHeight", image_height))
        baseline_vertices = points_to_pixels(raw, raw_space, baseline_width, baseline_height)
        if (baseline_width, baseline_height) != (image_width, image_height):
            baseline_vertices *= np.asarray([image_width / baseline_width, image_height / baseline_height])

    keypoints_value = candidate.get("keypoints") or candidate.get("keypointsPath")
    keypoints = load_keypoints(
        keypoints_value,
        manifest_path=manifest_path,
        image_width=image_width,
        image_height=image_height,
        default_coordinate_space=coordinate_space,
    )
    return {
        "path": path,
        "payload": payload,
        "vertices": pixels,
        "triangles": triangles,
        "trailingTriangleValues": trailing,
        "baselineVertices": baseline_vertices,
        "keypoints": keypoints,
        "imageWidth": image_width,
        "imageHeight": image_height,
        "coordinateSpace": coordinate_space,
    }


def gate_photo_metrics(
    metrics: dict[str, Any], topology: dict[str, Any], gates: dict[str, float | int]
) -> list[str]:
    reasons = []
    if metrics["silhouetteIou"] < float(gates["silhouetteIouMin"]):
        reasons.append(
            f"silhouette IoU {metrics['silhouetteIou']:.4f} is below {gates['silhouetteIouMin']}"
        )
    for name, record in metrics["regions"].items():
        if not record.get("available"):
            reasons.append(f"{name} boundary metric is unavailable")
            continue
        if record["meanPctBodyHeight"] > float(gates["regionMeanBoundaryPctMax"]):
            reasons.append(
                f"{name} mean boundary error {record['meanPctBodyHeight']:.3f}% exceeds {gates['regionMeanBoundaryPctMax']}%"
            )
        if record["p95PctBodyHeight"] > float(gates["regionP95BoundaryPctMax"]):
            reasons.append(
                f"{name} P95 boundary error {record['p95PctBodyHeight']:.3f}% exceeds {gates['regionP95BoundaryPctMax']}%"
            )
    keypoints = metrics["keypoints"]
    if not keypoints.get("available"):
        reasons.append("keypoint metric is unavailable")
    else:
        if keypoints["meanPctBodyHeight"] > float(gates["keypointMeanPctMax"]):
            reasons.append("mean keypoint error exceeds gate")
        if keypoints["p95PctBodyHeight"] > float(gates["keypointP95PctMax"]):
            reasons.append("P95 keypoint error exceeds gate")
    if not topology["flipCheckAvailable"]:
        reasons.append(topology["baselineReason"] or "triangle flip check unavailable")
    elif topology["flippedTriangleCount"] > int(gates["flippedTriangleCountMax"]):
        reasons.append(f"{topology['flippedTriangleCount']} triangles flipped")
    if topology["brokenTopologyCount"] > int(gates["brokenTopologyCountMax"]):
        reasons.append(f"{topology['brokenTopologyCount']} broken topology findings")
    return reasons


def intrinsic_topology_failures(
    topology: dict[str, Any], gates: dict[str, float | int]
) -> list[str]:
    """Failures that stay valid even when outline truth is only diagnostic."""
    reasons = []
    if (
        topology["flipCheckAvailable"]
        and topology["flippedTriangleCount"] > int(gates["flippedTriangleCountMax"])
    ):
        reasons.append(f"{topology['flippedTriangleCount']} triangles flipped")
    if topology["brokenTopologyCount"] > int(gates["brokenTopologyCountMax"]):
        reasons.append(f"{topology['brokenTopologyCount']} broken topology findings")
    return reasons


def evaluate_candidate(
    candidate: dict[str, Any],
    reference: dict[str, Any],
    manifest_path: Path,
    gates: dict[str, float | int],
) -> dict[str, Any]:
    reasons = list(reference["baseProofReasons"])
    proof_eligible = bool(reference["baseProofEligible"])
    fit_ids, fit_hashes, evidence_declared = candidate_fit_evidence(candidate)
    if not evidence_declared:
        proof_eligible = False
        reasons.append("candidate did not declare fit evidence IDs and hashes")
    leaked_ids = sorted(set(reference["evidenceIds"]).intersection(fit_ids))
    leaked_hashes = sorted(set(value.lower() for value in reference["evidenceSha256"]).intersection(fit_hashes))
    if leaked_ids:
        proof_eligible = False
        reasons.append(f"reference evidence ID was used to fit this candidate: {', '.join(leaked_ids)}")
    if leaked_hashes:
        proof_eligible = False
        reasons.append("reference bytes were used to fit this candidate")

    try:
        mesh = load_mesh(
            candidate, manifest_path, reference["imageWidth"], reference["imageHeight"]
        )
        normalization = build_normalization(reference["mask"], mesh["vertices"])
        if reference["regionMask"] is None:
            regions_original = auto_region_mask(reference["mask"])
            regional_truth = "automatic diagnostic bands; not proof eligible"
        else:
            regions_original = reference["regionMask"]
            regional_truth = "independent annotated region mask"
        candidate_normalized = normalization["candidateVertices"]
        candidate_mask = rasterize_mesh(
            mesh["vertices"],
            mesh["triangles"],
            reference["imageWidth"],
            reference["imageHeight"],
        )
        baseline_normalized = None
        if mesh["baselineVertices"] is not None:
            transform = normalization["transform"]
            baseline_normalized = (
                mesh["baselineVertices"] @ transform[:, :2].T + transform[:, 2]
            )
        topology = topology_metrics(
            candidate_normalized,
            mesh["triangles"],
            mesh["trailingTriangleValues"],
            baseline_normalized,
            bool(candidate.get("isTopologyBaseline", False)),
        )
        metrics = {
            # IoU is sampled in the shared original pixel grid to avoid a
            # half-pixel expansion caused by upscaling raster masks. Boundary
            # and keypoint distances below are still expressed in the exact
            # 1,024 px body-height frame by multiplying by the scale.
            "silhouetteIou": round(silhouette_iou(candidate_mask, reference["mask"]), 6),
            "regions": regional_boundary_metrics(
                candidate_mask,
                reference["mask"],
                regions_original,
                normalization["scale"],
            ),
            "regionalTruth": regional_truth,
            "keypoints": keypoint_metrics(
                mesh["keypoints"], reference["keypoints"], normalization["scale"]
            ),
        }
        failed_gates = gate_photo_metrics(metrics, topology, gates)
        intrinsic_failures = intrinsic_topology_failures(topology, gates)
        if intrinsic_failures:
            # These are computed from candidate topology and its declared MHR
            # baseline, not from the possibly non-held-out outline.
            status = "Rejected"
            reasons.extend(intrinsic_failures)
            reasons.extend(
                f"diagnostic only: {reason}"
                for reason in failed_gates
                if reason not in intrinsic_failures
            )
        elif proof_eligible and failed_gates:
            status = "Rejected"
            reasons.extend(failed_gates)
        elif proof_eligible:
            status = "Candidate"
            reasons.append("photo gates pass; cross-photo canonical consistency is still required")
        else:
            status = "Candidate"
            reasons.extend(f"diagnostic only: {reason}" for reason in failed_gates)
        result = {
            "photoId": reference["photoId"],
            "status": status,
            "proofEligible": proof_eligible,
            "reasons": list(dict.fromkeys(reasons)),
            "meshPath": str(mesh["path"]),
            "referenceEvidenceId": reference["evidenceId"],
            "referenceSha256": reference["sourceSha256"],
            "referenceEvidenceIds": reference["evidenceIds"],
            "referenceEvidenceSha256": reference["evidenceSha256"],
            "fitEvidenceIds": fit_ids,
            "fitEvidenceSha256": fit_hashes,
            "normalization": {
                "sourceBodyHeightPx": round(normalization["referenceBodyHeightPx"], 4),
                "normalizedBodyHeightPx": NORMALIZED_BODY_HEIGHT_PX,
                "scale": round(normalization["scale"], 8),
                "canvas": [normalization["canvasWidth"], normalization["canvasHeight"]],
            },
            "metrics": metrics,
            "topology": topology,
            "canonicalMeshPath": candidate.get("canonicalMeshPath"),
        }
    except (ValidationInputError, OSError, ValueError, cv2.error) as error:
        result = {
            "photoId": reference["photoId"],
            "status": "Candidate",
            "proofEligible": False,
            "reasons": list(dict.fromkeys(reasons + [f"evaluation input error: {error}"])),
            "referenceEvidenceId": reference["evidenceId"],
        }
    return result


def load_canonical_vertices(
    record: dict[str, Any], manifest_path: Path
) -> tuple[np.ndarray, np.ndarray] | None:
    raw = record.get("canonicalMeshPath")
    if not raw:
        return None
    payload = read_json(resolve_path(manifest_path, raw))
    vertices = flatten_points(payload.get("vertices"), "canonical vertices")
    space = infer_coordinate_space(vertices, record | payload)
    width = int(payload.get("imageWidth", 1))
    height = int(payload.get("imageHeight", 1))
    pixels = points_to_pixels(vertices, space, width, height)
    triangles, _ = flatten_triangles(payload.get("triangles"), "canonical triangles")
    return pixels, triangles


def canonicalize_points(points: np.ndarray) -> np.ndarray:
    if not np.isfinite(points).all() or len(points) < 3:
        raise ValidationInputError("Canonical mesh contains invalid points")
    minimum_y = float(points[:, 1].min())
    height = float(points[:, 1].max() - minimum_y)
    if height <= 1e-8:
        raise ValidationInputError("Canonical mesh has zero height")
    centered = points.copy()
    centered[:, 0] -= float(np.median(centered[:, 0]))
    centered[:, 1] -= minimum_y
    return centered * (NORMALIZED_BODY_HEIGHT_PX / height)


def rigid_align(source: np.ndarray, target: np.ndarray) -> np.ndarray:
    source_centered = source - source.mean(axis=0)
    target_centered = target - target.mean(axis=0)
    covariance = source_centered.T @ target_centered
    u, _, vt = np.linalg.svd(covariance)
    rotation = u @ vt
    if np.linalg.det(rotation) < 0:
        u[:, -1] *= -1
        rotation = u @ vt
    return source_centered @ rotation + target.mean(axis=0)


def cross_photo_consistency(
    candidates_by_photo: dict[str, dict[str, Any]],
    photo_results: list[dict[str, Any]],
    manifest_path: Path,
    gates: dict[str, float | int],
) -> dict[str, Any]:
    eligible_photos = [record["photoId"] for record in photo_results if record.get("proofEligible")]
    if len(eligible_photos) < 2:
        return {
            "available": False,
            "passes": False,
            "reason": "two proof-eligible photos are required",
        }
    left_id, right_id = sorted(eligible_photos)[:2]
    try:
        left_loaded = load_canonical_vertices(candidates_by_photo[left_id], manifest_path)
        right_loaded = load_canonical_vertices(candidates_by_photo[right_id], manifest_path)
        if left_loaded is None or right_loaded is None:
            raise ValidationInputError("canonicalMeshPath is required for both photos")
        left, left_triangles = left_loaded
        right, right_triangles = right_loaded
        if left.shape != right.shape or not np.array_equal(left_triangles, right_triangles):
            raise ValidationInputError("canonical meshes do not share identical vertices and triangles")
        left = canonicalize_points(left)
        right = rigid_align(canonicalize_points(right), left)
        distances = np.linalg.norm(left - right, axis=1)
        mean_px = float(np.mean(distances))
        p95_px = float(np.quantile(distances, 0.95))
        mean_pct = mean_px / NORMALIZED_BODY_HEIGHT_PX * 100.0
        p95_pct = p95_px / NORMALIZED_BODY_HEIGHT_PX * 100.0
        passes = (
            mean_pct <= float(gates["canonicalConsistencyMeanPctMax"])
            and p95_pct <= float(gates["canonicalConsistencyP95PctMax"])
        )
        return {
            "available": True,
            "passes": passes,
            "photoIds": [left_id, right_id],
            "vertexCount": int(len(left)),
            "meanPx1024": round(mean_px, 4),
            "p95Px1024": round(p95_px, 4),
            "meanPctBodyHeight": round(mean_pct, 4),
            "p95PctBodyHeight": round(p95_pct, 4),
        }
    except (ValidationInputError, OSError, ValueError) as error:
        return {"available": False, "passes": False, "reason": str(error)}


def method_status(
    method: dict[str, Any],
    photo_results: list[dict[str, Any]],
    consistency: dict[str, Any],
) -> tuple[str, list[str]]:
    preclassified = str(method.get("preclassifiedStatus", ""))
    preclassified_reasons = [str(value) for value in method.get("preclassifiedReasons", [])]
    upstream_status = str(method.get("status", ""))
    if upstream_status.lower() == "blocked" and not method.get("candidates"):
        blockers = [str(value) for value in method.get("blockerReasons", [])]
        return "Blocked", blockers or ["method runner reported this method blocked"]
    if preclassified == "Rejected":
        return "Rejected", preclassified_reasons or ["method was rejected before this run"]
    rejected = [record for record in photo_results if record["status"] == "Rejected"]
    if rejected:
        return "Rejected", list(
            dict.fromkeys(
                reason for record in rejected for reason in record.get("reasons", [])
            )
        )
    if (
        photo_results
        and all(record.get("proofEligible") for record in photo_results)
        and all(record["status"] == "Candidate" for record in photo_results)
        and consistency.get("available")
        and consistency.get("passes")
    ):
        return "Passed", []
    reasons = []
    for record in photo_results:
        if not record.get("proofEligible"):
            reasons.extend(record.get("reasons", []))
    if not consistency.get("passes"):
        reasons.append(consistency.get("reason", "cross-photo canonical consistency failed"))
    return "Candidate", list(dict.fromkeys(preclassified_reasons + reasons))


def expand_external_method_report(
    manifest: dict[str, Any], manifest_path: Path
) -> dict[str, Any]:
    """Append method-runner records without letting them overwrite QA truth."""
    raw_path = manifest.get("methodReportPath")
    if not raw_path:
        return manifest
    method_report_path = resolve_path(manifest_path, raw_path)
    external = read_json(method_report_path)
    expanded = dict(manifest)
    methods = list(manifest.get("methods", []))
    known_ids = {str(item.get("id")) for item in methods}
    for item in external.get("methods", []):
        if not isinstance(item, dict):
            continue
        method_id = str(item.get("id", ""))
        if not method_id or method_id in known_ids:
            continue
        converted = dict(item)
        converted["provenance"] = {
            "sourceMethodReport": str(method_report_path),
            "runnerGeneratedAt": external.get("generatedAt"),
            "releaseStatus": external.get("releaseStatus"),
            "executionDevice": item.get("executionDevice"),
            "executionStatus": item.get("executionStatus"),
            "registryStatus": item.get("registryStatus"),
            "exactPromptContract": item.get("exactPromptContract"),
            "forbiddenPostprocesses": item.get("forbiddenPostprocesses", []),
            "dependencies": item.get("dependencies", []),
            "blockerReasons": item.get("blockerReasons", []),
            "requiresFreshGpuApproval": item.get("requiresFreshGpuApproval"),
        }
        if str(item.get("status", "")).lower() == "rejected":
            converted["preclassifiedStatus"] = "Rejected"
            converted["preclassifiedReasons"] = item.get("reasons", [])
        methods.append(converted)
        known_ids.add(method_id)
    expanded["methods"] = methods
    expanded["methodReport"] = {
        "path": str(method_report_path),
        "sha256": sha256_file(method_report_path),
        "generatedAt": external.get("generatedAt"),
    }
    return expanded


def build_report(manifest: dict[str, Any], manifest_path: Path) -> dict[str, Any]:
    manifest = expand_external_method_report(manifest, manifest_path)
    if int(manifest.get("schemaVersion", 0)) != 1:
        raise ValidationInputError("Only validation manifest schemaVersion 1 is supported")
    gates = dict(DEFAULT_GATES)
    custom_gates = manifest.get("gates", {})
    if isinstance(custom_gates, dict):
        gates.update(custom_gates)
    references: dict[str, dict[str, Any]] = {}
    photo_summaries = []
    for raw_reference in manifest.get("references", []):
        reference = load_reference(raw_reference, manifest_path)
        photo_id = reference["photoId"]
        if photo_id in references:
            raise ValidationInputError(f"Duplicate reference photoId: {photo_id}")
        references[photo_id] = reference
        photo_summaries.append(
            {
                "photoId": photo_id,
                "referenceEvidenceId": reference["evidenceId"],
                "referencePath": str(reference["sourcePath"]),
                "referenceSha256": reference["sourceSha256"],
                "referenceEvidenceIds": reference["evidenceIds"],
                "referenceEvidenceSha256": reference["evidenceSha256"],
                "proofEligibleBeforeCandidateLeakageCheck": reference["baseProofEligible"],
                "proofReasons": reference["baseProofReasons"],
                "provenance": reference["provenance"],
                "hasIndependentRegionMask": reference["regionMask"] is not None,
                "independentKeypointCount": len(reference["keypoints"]),
            }
        )

    method_reports = []
    for method in manifest.get("methods", []):
        candidates = method.get("candidates", [])
        if not isinstance(candidates, list):
            raise ValidationInputError(f"Method {method.get('id')} candidates must be a list")
        candidates_by_photo = {str(item["photoId"]): item for item in candidates}
        photo_results = []
        upstream_blocked = str(method.get("status", "")).lower() == "blocked" and not candidates
        if upstream_blocked:
            consistency = {
                "available": False,
                "passes": False,
                "reason": "method execution is blocked; no candidate exists",
            }
        else:
            for photo_id, reference in references.items():
                candidate = candidates_by_photo.get(photo_id)
                if candidate is None:
                    photo_results.append(
                        {
                            "photoId": photo_id,
                            "status": "Candidate",
                            "proofEligible": False,
                            "reasons": ["method has no candidate for this photo"],
                        }
                    )
                    continue
                photo_results.append(
                    evaluate_candidate(candidate, reference, manifest_path, gates)
                )
            consistency = cross_photo_consistency(
                candidates_by_photo, photo_results, manifest_path, gates
            )
        status, reasons = method_status(method, photo_results, consistency)
        method_reports.append(
            {
                "id": str(method["id"]),
                "label": str(method.get("label", method["id"])),
                "status": status,
                "executionStatus": method.get("executionStatus", method.get("status")),
                "reasons": reasons,
                "photos": photo_results,
                "crossPhotoCanonicalConsistency": consistency,
                "provenance": method.get("provenance", {}),
            }
        )

    status_counts = Counter(record["status"] for record in method_reports)
    return {
        "schemaVersion": 1,
        "generatedAt": utc_now(),
        "suiteId": str(manifest.get("suiteId", "wear-2d-mesh-proof")),
        "device": "cpu",
        "releaseBlocked": True,
        "published": False,
        "normalization": {
            "bodyHeightPx": NORMALIZED_BODY_HEIGHT_PX,
            "alignment": "reference top, bottom and horizontal center",
        },
        "gates": gates,
        "statusDefinitions": {
            "Candidate": "not yet proven; incomplete/blocked evidence or photo gates awaiting cross-photo proof",
            "Rejected": "valid evidence failed a gate, or an explicit prior rejection is preserved",
            "Passed": "all independent photo, topology, keypoint, regional and cross-photo gates passed",
            "Blocked": "no mesh result exists because a required dependency or fresh GPU approval is unavailable",
        },
        "photos": photo_summaries,
        "methods": method_reports,
        "statuses": {name: int(status_counts.get(name, 0)) for name in ("Candidate", "Rejected", "Passed", "Blocked")},
        "methodReport": manifest.get("methodReport"),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    args = parser.parse_args()
    manifest_path = args.manifest.expanduser().resolve()
    output_path = args.output.expanduser().resolve()
    report = build_report(read_json(manifest_path), manifest_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(report, indent=2) + "\n")
    print(
        json.dumps(
            {
                "output": str(output_path),
                "methods": len(report["methods"]),
                "statuses": report["statuses"],
                "releaseBlocked": report["releaseBlocked"],
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
