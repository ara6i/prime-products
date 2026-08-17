#!/usr/bin/env python3
"""Small, topology-safe 2D residual fit for the Delaram MHR candidates.

This implements the limited residual stage allowed by the proof plan after an
MHR fit. It is not RBF and it does not replace the mesh with a mask. A sparse
Laplacian/ARAP-style energy preserves local edge structure while an internal
outline contributes soft contour constraints. A topology line search rejects
every step that flips even one visible baseline triangle.

The same internal outline is diagnostic fitting evidence, not independent QA.
"""

from __future__ import annotations

import argparse
from collections import Counter
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
from typing import Any

import cv2
import numpy as np
from scipy import ndimage, sparse
from scipy.sparse.linalg import spsolve


REPO_ROOT = Path(__file__).resolve().parents[2]
BASELINE_DIR = REPO_ROOT / ".local-ml/wear-mesh-proof/methods/raw-meta-vith"
MASK_DIR = REPO_ROOT / ".local-ml/wear-mesh-overlay/photo-masks"
SAPIENS_DIR = REPO_ROOT / ".local-ml/wear-mesh-overlay/anatomical"
DEFAULT_OUTPUT_DIR = REPO_ROOT / ".local-ml/wear-mesh-proof/delaram-specialist"
PHOTO_IDS = ("delaram", "delaram-2")


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def load_json(path: Path) -> dict[str, Any]:
    value = json.loads(path.read_text())
    if not isinstance(value, dict):
        raise RuntimeError(f"Expected object: {path}")
    return value


def signed_areas(vertices: np.ndarray, triangles: np.ndarray) -> np.ndarray:
    points = vertices[triangles]
    a, b, c = points[:, 0], points[:, 1], points[:, 2]
    return 0.5 * ((b[:, 0] - a[:, 0]) * (c[:, 1] - a[:, 1]) - (b[:, 1] - a[:, 1]) * (c[:, 0] - a[:, 0]))


def rasterize(vertices: np.ndarray, triangles: np.ndarray, width: int, height: int) -> np.ndarray:
    mask = np.zeros((height, width), dtype=np.uint8)
    for triangle in triangles:
        points = vertices[triangle]
        if np.isfinite(points).all():
            cv2.fillConvexPoly(mask, np.rint(points).astype(np.int32), 1)
    return mask


def boundary(mask: np.ndarray) -> np.ndarray:
    eroded = cv2.erode((mask > 0).astype(np.uint8), np.ones((3, 3), dtype=np.uint8), iterations=1)
    return (mask > 0) & ~(eroded > 0)


def build_laplacian(vertex_count: int, triangles: np.ndarray) -> sparse.csr_matrix:
    edges = np.concatenate(
        [triangles[:, [0, 1]], triangles[:, [1, 2]], triangles[:, [2, 0]]],
        axis=0,
    )
    edges = np.concatenate([edges, edges[:, ::-1]], axis=0)
    data = np.ones(len(edges), dtype=np.float64)
    adjacency = sparse.coo_matrix((data, (edges[:, 0], edges[:, 1])), shape=(vertex_count, vertex_count)).tocsr()
    adjacency.data[:] = 1.0
    degree = np.asarray(adjacency.sum(axis=1)).reshape(-1)
    inverse = np.divide(1.0, degree, out=np.zeros_like(degree), where=degree > 0)
    return sparse.eye(vertex_count, format="csr") - sparse.diags(inverse) @ adjacency


def external_contour_indices(vertices: np.ndarray, triangles: np.ndarray, width: int, height: int, shoulder_y: float) -> np.ndarray:
    rendered_boundary = boundary(rasterize(vertices, triangles, width, height))
    distance = ndimage.distance_transform_edt(~rendered_boundary)
    counts: Counter[tuple[int, int]] = Counter()
    for a, b, c in triangles:
        counts[tuple(sorted((int(a), int(b))))] += 1
        counts[tuple(sorted((int(b), int(c))))] += 1
        counts[tuple(sorted((int(c), int(a))))] += 1
    possible = sorted({value for edge, count in counts.items() if count == 1 for value in edge})
    result = []
    for index in possible:
        x, y = vertices[index]
        if not np.isfinite((x, y)).all() or y < shoulder_y - 20:
            continue
        ix = int(np.clip(round(x), 0, width - 1))
        iy = int(np.clip(round(y), 0, height - 1))
        if distance[iy, ix] <= 3.0:
            result.append(index)
    return np.asarray(result, dtype=np.int64)


def contour_targets(
    vertices: np.ndarray,
    indices: np.ndarray,
    target_mask: np.ndarray,
    body_height: float,
) -> tuple[np.ndarray, np.ndarray]:
    target_boundary = boundary(target_mask)
    _, nearest = ndimage.distance_transform_edt(~target_boundary, return_indices=True)
    targets = vertices[indices].copy()
    weights = np.ones(len(indices), dtype=np.float64)
    for row, vertex_index in enumerate(indices):
        x, y = vertices[vertex_index]
        ix = int(np.clip(round(x), 0, target_mask.shape[1] - 1))
        iy = int(np.clip(round(y), 0, target_mask.shape[0] - 1))
        targets[row] = [nearest[1, iy, ix], nearest[0, iy, ix]]
        fraction = (y - np.min(vertices[:, 1])) / max(1.0, body_height)
        max_shift = body_height * (0.010 if 0.18 <= fraction <= 0.58 else 0.014)
        delta = targets[row] - vertices[vertex_index]
        norm = float(np.linalg.norm(delta))
        if norm > max_shift:
            targets[row] = vertices[vertex_index] + delta * (max_shift / norm)
            weights[row] = 0.5
    return targets, weights


def topology_safe_alpha(original: np.ndarray, proposed: np.ndarray, triangles: np.ndarray) -> tuple[float, int]:
    baseline = signed_areas(original, triangles)
    comparable = np.abs(baseline) > 1e-6
    for alpha in (
        1.0,
        0.75,
        0.5,
        0.35,
        0.25,
        0.15,
        0.1,
        0.05,
        0.025,
        0.01,
        0.005,
        0.0025,
        0.001,
        0.0005,
        0.0001,
        0.0,
    ):
        candidate = original + alpha * (proposed - original)
        areas = signed_areas(candidate, triangles)
        flipped = int(np.sum(np.sign(areas[comparable]) != np.sign(baseline[comparable])))
        degenerate = int(np.sum(np.abs(areas[comparable]) <= 1e-6))
        if flipped == 0 and degenerate == 0:
            return alpha, 0
    return 0.0, 0


def fit_one(photo_id: str, laplacian_weight: float, anchor_weight: float, pin_weight: float) -> dict[str, Any]:
    baseline_path = BASELINE_DIR / f"{photo_id}.json"
    baseline = load_json(baseline_path)
    width = int(baseline["imageWidth"])
    height = int(baseline["imageHeight"])
    vertices = np.asarray(baseline["vertices"], dtype=np.float64).reshape(-1, 2) * [width, height]
    triangles = np.asarray(baseline["triangles"], dtype=np.int64).reshape(-1, 3)
    mask_path = MASK_DIR / f"{photo_id}.png"
    mask = cv2.imread(str(mask_path), cv2.IMREAD_GRAYSCALE)
    if mask is None or mask.shape != (height, width):
        raise RuntimeError(f"Missing internal mask: {mask_path}")
    mask = (mask >= 128).astype(np.uint8)
    sapiens_path = SAPIENS_DIR / f"{photo_id}-sapiens2.json"
    sapiens = load_json(sapiens_path)
    keypoints = np.asarray(sapiens["keypoints"], dtype=np.float64)
    shoulder_y = float(np.mean(keypoints[[5, 6], 1]))
    ys = np.where(mask > 0)[0]
    body_height = float(np.ptp(ys))
    contour_indices = external_contour_indices(vertices, triangles, width, height, shoulder_y)
    targets, target_weights = contour_targets(vertices, contour_indices, mask, body_height)

    laplacian = build_laplacian(len(vertices), triangles)
    selector = sparse.coo_matrix(
        (np.sqrt(target_weights), (np.arange(len(contour_indices)), contour_indices)),
        shape=(len(contour_indices), len(vertices)),
    ).tocsr()
    identity = sparse.eye(len(vertices), format="csr")
    system = sparse.vstack(
        [
            np.sqrt(laplacian_weight) * laplacian,
            np.sqrt(anchor_weight) * selector,
            np.sqrt(pin_weight) * identity,
        ],
        format="csr",
    )
    rhs = np.vstack(
        [
            np.sqrt(laplacian_weight) * (laplacian @ vertices),
            np.sqrt(anchor_weight) * (targets * np.sqrt(target_weights)[:, None]),
            np.sqrt(pin_weight) * vertices,
        ]
    )
    normal = (system.T @ system).tocsc()
    projected = np.column_stack([spsolve(normal, system.T @ rhs[:, axis]) for axis in range(2)])
    alpha, flips = topology_safe_alpha(vertices, projected, triangles)
    fitted = vertices + alpha * (projected - vertices)

    output_path = DEFAULT_OUTPUT_DIR / f"{photo_id}-arap-residual.json"
    payload = {
        "schemaVersion": 1,
        "id": f"delaram-arap-residual--{photo_id}",
        "methodId": "delaram-arap-residual",
        "photoId": photo_id,
        "imageWidth": width,
        "imageHeight": height,
        "coordinateSpace": "normalized-image-xy",
        "vertexCount": int(len(fitted)),
        "triangleCount": int(len(triangles)),
        "vertices": np.round(fitted / [width, height], 7).reshape(-1).tolist(),
        "triangles": triangles.reshape(-1).tolist(),
        "fixedTopology": "Meta MHR 18,439 vertex IDs and baseline visible triangles",
        "device": "cpu",
        "gpuUsed": False,
        "awsUsed": False,
        "fitMethod": "topology-safe sparse Laplacian/ARAP-style residual",
        "outputIsMask": False,
        "outputIsMaskTriangulation": False,
        "rbfUsed": False,
        "vertexSnappingUsed": False,
        "depthUsed": False,
        "measurementsUsed": False,
        "fitEvidenceIds": [f"rgb:{photo_id}", f"internal-birefnet-outline:{photo_id}"],
        "fitEvidenceSha256": [sha256_file(Path(baseline["sourcePhotoPath"])), sha256_file(mask_path)],
        "topologyBaselinePath": str(baseline_path),
        "optimization": {
            "laplacianWeight": laplacian_weight,
            "anchorWeight": anchor_weight,
            "pinWeight": pin_weight,
            "contourVertexCount": int(len(contour_indices)),
            "maximumAppliedFraction": alpha,
            "flippedTrianglesAfterLineSearch": flips,
            "meanAppliedResidualPx": round(float(np.mean(np.linalg.norm(fitted - vertices, axis=1))), 5),
            "p95AppliedResidualPx": round(float(np.quantile(np.linalg.norm(fitted - vertices, axis=1), 0.95)), 5),
        },
        "proofStatus": "Candidate" if alpha > 0 else "Rejected",
        "proofBlocker": "Internal fitting outline is not independent held-out QA truth",
    }
    output_path.write_text(json.dumps(payload, separators=(",", ":")))
    return {
        "photoId": photo_id,
        "meshPath": str(output_path),
        "topologyBaselinePath": str(baseline_path),
        "coordinateSpace": "normalized-image-xy",
        "fitEvidenceIds": payload["fitEvidenceIds"],
        "fitEvidenceSha256": payload["fitEvidenceSha256"],
        "isTopologyBaseline": False,
        "alpha": alpha,
        "contourVertexCount": int(len(contour_indices)),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--laplacian-weight", type=float, default=8.0)
    parser.add_argument("--anchor-weight", type=float, default=16.0)
    parser.add_argument("--pin-weight", type=float, default=0.08)
    args = parser.parse_args()
    DEFAULT_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    candidates = [
        fit_one(photo_id, args.laplacian_weight, args.anchor_weight, args.pin_weight)
        for photo_id in PHOTO_IDS
    ]
    report = {
        "schemaVersion": 1,
        "generatedAt": utc_now(),
        "methodId": "delaram-arap-residual",
        "status": "Candidate" if all(item["alpha"] > 0 for item in candidates) else "Rejected",
        "device": "cpu",
        "gpuUsed": False,
        "awsUsed": False,
        "published": False,
        "releaseBlocked": True,
        "candidateRecords": candidates,
    }
    path = DEFAULT_OUTPUT_DIR / "arap-run-report.json"
    path.write_text(json.dumps(report, indent=2))
    print(json.dumps({"report": str(path), "candidates": candidates}, indent=2))


if __name__ == "__main__":
    main()
