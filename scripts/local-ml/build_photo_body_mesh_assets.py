#!/usr/bin/env python3
"""Create isolated browser GLBs from one photo with Meta SAM 3D Body.

This runner uses the RGB photo, known height, and a private CPU silhouette to
fit the visible 2D display mesh. It never uses tape, waist, hip, chest, or any
other body measurement. Run on CPU:

  PRIMESTYLE_SAM3D_DEVICE=cpu \
    .local-ml/venvs/sam-3d-body/bin/python \
    scripts/local-ml/build_photo_body_mesh_assets.py

The output is private Test Lab data under .local-ml/wear-mesh-overlay.
"""

from __future__ import annotations

import base64
import importlib.util
import json
import os
from pathlib import Path

import cv2
import numpy as np
import trimesh


REPO_ROOT = Path(__file__).resolve().parents[2]
OUTPUT_DIR = REPO_ROOT / ".local-ml/wear-mesh-overlay/photo-models"
MASK_DIR = REPO_ROOT / ".local-ml/wear-mesh-overlay/photo-masks"
SHAPE_RUNNER = REPO_ROOT / "scripts/local-ml/run_sam3d_shape.py"

PHOTOS = [
    {
        "id": "delaram",
        "label": "Delaram clean front",
        "path": REPO_ROOT / "public/try-on-test/sizing-lab/delaram-front.jpg",
        "height_cm": 168.0,
        "weight_kg": 70.8,
    },
    {
        "id": "delaram-2",
        "label": "Delaram tape front",
        "path": REPO_ROOT / "public/try-on-test/sizing-lab/delaram-2-front.jpg",
        "height_cm": 168.0,
        "weight_kg": 70.8,
    },
]


def load_shape_runner():
    spec = importlib.util.spec_from_file_location("primestyle_sam3d_shape_runner", SHAPE_RUNNER)
    if spec is None or spec.loader is None:
        raise RuntimeError("Could not load the isolated SAM 3D Body adapter.")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def configure_environment() -> None:
    os.environ.setdefault(
        "PRIMESTYLE_SAM3D_ROOT",
        str(REPO_ROOT / ".local-ml/external/sam-3d-body"),
    )
    os.environ.setdefault(
        "PRIMESTYLE_SAM3D_CHECKPOINT",
        str(REPO_ROOT / ".local-ml/checkpoints/sam-3d-body-vith/model.ckpt"),
    )
    os.environ.setdefault(
        "PRIMESTYLE_SAM3D_MHR",
        str(REPO_ROOT / ".local-ml/checkpoints/sam-3d-body-vith/assets/mhr_model.pt"),
    )
    # Fail closed: this offline generator never starts or uses a GPU unless a
    # future explicit run overrides the environment itself.
    os.environ.setdefault("PRIMESTYLE_SAM3D_DEVICE", "cpu")


def normalized_browser_vertices(vertices: np.ndarray, height_cm: float) -> np.ndarray:
    points = np.asarray(vertices, dtype=np.float64).reshape(-1, 3).copy()
    raw_height = float(np.ptp(points, axis=0)[1])
    if not np.isfinite(points).all() or not np.isfinite(raw_height) or raw_height <= 0:
        raise RuntimeError("Meta returned an invalid photo body mesh.")
    points *= height_cm / 100.0 / raw_height
    floor_y = float(points[:, 1].max())
    points[:, 0] -= float((points[:, 0].min() + points[:, 0].max()) / 2.0)
    points[:, 1] = floor_y - points[:, 1]
    points[:, 2] -= float((points[:, 2].min() + points[:, 2].max()) / 2.0)
    return points.astype(np.float32)


def projected_browser_vertices(
    vertices: np.ndarray,
    camera_translation: np.ndarray,
    camera_projection: dict,
    image_width: int,
    image_height: int,
) -> np.ndarray:
    """Project Meta's posed mesh into the original photo coordinate system.

    The browser overlay must keep this camera projection. Centering the mesh
    and fitting it inside an arbitrary rectangle changes the relative screen
    positions of the head, hands, knees, and feet.
    """
    points = np.asarray(vertices, dtype=np.float64).reshape(-1, 3)
    translation = np.asarray(camera_translation, dtype=np.float64).reshape(1, 3)
    camera_points = points + translation
    if (
        not np.isfinite(camera_points).all()
        or np.any(camera_points[:, 2] <= 1e-6)
        or image_width <= 0
        or image_height <= 0
    ):
        raise RuntimeError("Meta returned an invalid camera-space photo mesh.")

    x_px = (
        float(camera_projection["fx"]) * camera_points[:, 0] / camera_points[:, 2]
        + float(camera_projection["cx"])
    )
    y_px = (
        float(camera_projection["fy"]) * camera_points[:, 1] / camera_points[:, 2]
        + float(camera_projection["cy"])
    )
    aspect = float(image_width) / float(image_height)
    projected = np.column_stack(
        [
            ((x_px / float(image_width)) * 2.0 - 1.0) * aspect,
            1.0 - (y_px / float(image_height)) * 2.0,
            np.zeros_like(x_px),
        ]
    )
    if not np.isfinite(projected).all():
        raise RuntimeError("Meta photo projection produced invalid vertices.")
    return projected.astype(np.float32)


def export_glb(path: Path, vertices: np.ndarray, faces: np.ndarray) -> None:
    mesh = trimesh.Trimesh(vertices=vertices, faces=faces, process=False)
    path.write_bytes(mesh.export(file_type="glb"))


def export_projected_json(
    path: Path,
    projected_vertices: np.ndarray,
    faces: np.ndarray,
    image_width: int,
    image_height: int,
    underlay_faces: np.ndarray | None = None,
) -> None:
    normalized_xy = image_normalized_vertices(
        projected_vertices,
        image_width,
        image_height,
    )
    payload = {
        "imageWidth": int(image_width),
        "imageHeight": int(image_height),
        "vertices": np.round(normalized_xy, 6).reshape(-1).tolist(),
        "triangles": np.asarray(faces, dtype=np.int64).reshape(-1).tolist(),
    }
    if underlay_faces is not None:
        payload["underlayTriangles"] = (
            np.asarray(underlay_faces, dtype=np.int64).reshape(-1).tolist()
        )
    path.write_text(json.dumps(payload, separators=(",", ":")))


def image_normalized_vertices(
    projected_vertices: np.ndarray,
    image_width: int,
    image_height: int,
) -> np.ndarray:
    aspect = float(image_width) / float(image_height)
    return np.column_stack(
        [
            (projected_vertices[:, 0] / aspect + 1.0) / 2.0,
            (1.0 - projected_vertices[:, 1]) / 2.0,
        ]
    )


def projected_vertices_from_image_normalized(
    normalized_xy: np.ndarray,
    image_width: int,
    image_height: int,
) -> np.ndarray:
    aspect = float(image_width) / float(image_height)
    return np.column_stack(
        [
            (normalized_xy[:, 0] * 2.0 - 1.0) * aspect,
            1.0 - normalized_xy[:, 1] * 2.0,
            np.zeros(len(normalized_xy), dtype=np.float64),
        ]
    ).astype(np.float32)


def rasterize_projection(
    normalized_xy: np.ndarray,
    faces: np.ndarray,
    image_width: int,
    image_height: int,
) -> np.ndarray:
    mask = np.zeros((image_height, image_width), dtype=np.uint8)
    pixel_vertices = np.rint(
        normalized_xy * np.asarray([image_width - 1, image_height - 1])
    ).astype(np.int32)
    for face in np.asarray(faces, dtype=np.int64):
        cv2.fillConvexPoly(mask, pixel_vertices[face], 1)
    return mask


def row_intervals(row: np.ndarray, minimum_width: int = 3) -> list[tuple[int, int]]:
    xs = np.flatnonzero(row)
    if not len(xs):
        return []
    cuts = np.flatnonzero(np.diff(xs) > 1)
    starts = np.r_[0, cuts + 1]
    ends = np.r_[cuts, len(xs) - 1]
    return [
        (int(xs[start]), int(xs[end]))
        for start, end in zip(starts, ends)
        if int(xs[end] - xs[start] + 1) >= minimum_width
    ]


def mask_bounds(mask: np.ndarray) -> tuple[int, int, int, int]:
    ys, xs = np.where(mask > 0)
    if len(xs) < 100:
        raise RuntimeError("The projected body silhouette is empty.")
    return int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())


def silhouette_iou(left: np.ndarray, right: np.ndarray) -> float:
    union = np.logical_or(left > 0, right > 0).sum()
    if not union:
        return 0.0
    return float(np.logical_and(left > 0, right > 0).sum() / union)


def fit_projection_to_visible_silhouette(
    projected_vertices: np.ndarray,
    faces: np.ndarray,
    target_mask_path: Path,
    image_width: int,
    image_height: int,
) -> tuple[np.ndarray, float, float]:
    """Fit the 2D triangle projection to the photographed visible outline.

    This deliberately changes only the 2D display mesh. It does not claim that
    the fitted points are new 3D depth or circumference evidence.
    """
    target_mask = cv2.imread(str(target_mask_path), cv2.IMREAD_GRAYSCALE)
    if target_mask is None:
        raise RuntimeError(f"Could not read private silhouette: {target_mask_path}")
    if target_mask.shape != (image_height, image_width):
        target_mask = cv2.resize(
            target_mask,
            (image_width, image_height),
            interpolation=cv2.INTER_NEAREST,
        )
    target_mask = (target_mask >= 128).astype(np.uint8)
    normalized_xy = image_normalized_vertices(
        projected_vertices,
        image_width,
        image_height,
    )
    source_mask = rasterize_projection(
        normalized_xy,
        faces,
        image_width,
        image_height,
    )
    source_mask = cv2.morphologyEx(
        source_mask,
        cv2.MORPH_CLOSE,
        np.ones((3, 3), dtype=np.uint8),
    )
    target_mask = cv2.morphologyEx(
        target_mask,
        cv2.MORPH_CLOSE,
        np.ones((3, 3), dtype=np.uint8),
    )
    source_bounds = mask_bounds(source_mask)
    target_bounds = mask_bounds(target_mask)
    source_rows = [row_intervals(source_mask[y]) for y in range(image_height)]
    target_rows = [row_intervals(target_mask[y]) for y in range(image_height)]
    pixels = normalized_xy * np.asarray([image_width - 1, image_height - 1])
    fitted = np.empty_like(pixels)

    for index, (x, y) in enumerate(pixels):
        fitted_y = target_bounds[1] + (
            (y - source_bounds[1])
            * (target_bounds[3] - target_bounds[1])
            / max(1, source_bounds[3] - source_bounds[1])
        )
        fitted_y = float(np.clip(fitted_y, 0, image_height - 1))
        source_intervals = source_rows[int(np.clip(round(y), 0, image_height - 1))]
        target_intervals = target_rows[int(round(fitted_y))]
        if not source_intervals or not target_intervals:
            fitted_x = target_bounds[0] + (
                (x - source_bounds[0])
                * (target_bounds[2] - target_bounds[0])
                / max(1, source_bounds[2] - source_bounds[0])
            )
        else:
            source_index = min(
                range(len(source_intervals)),
                key=lambda item: 0
                if source_intervals[item][0] <= x <= source_intervals[item][1]
                else min(
                    abs(x - source_intervals[item][0]),
                    abs(x - source_intervals[item][1]),
                ),
            )
            if len(source_intervals) == len(target_intervals):
                source_span = source_intervals[source_index]
                target_span = target_intervals[min(source_index, len(target_intervals) - 1)]
            elif len(source_intervals) == 1 or len(target_intervals) == 1:
                source_span = (source_intervals[0][0], source_intervals[-1][1])
                target_span = (target_intervals[0][0], target_intervals[-1][1])
            else:
                source_center = sum(source_intervals[source_index]) / 2.0
                predicted_center = target_bounds[0] + (
                    (source_center - source_bounds[0])
                    * (target_bounds[2] - target_bounds[0])
                    / max(1, source_bounds[2] - source_bounds[0])
                )
                target_index = min(
                    range(len(target_intervals)),
                    key=lambda item: abs(
                        sum(target_intervals[item]) / 2.0 - predicted_center
                    ),
                )
                source_span = source_intervals[source_index]
                target_span = target_intervals[target_index]
            amount = (x - source_span[0]) / max(1, source_span[1] - source_span[0])
            fitted_x = target_span[0] + amount * (target_span[1] - target_span[0])
        fitted[index] = (float(np.clip(fitted_x, 0, image_width - 1)), fitted_y)

    fitted_normalized = fitted / np.asarray([image_width - 1, image_height - 1])
    fitted_mask = rasterize_projection(
        fitted_normalized,
        faces,
        image_width,
        image_height,
    )
    return (
        projected_vertices_from_image_normalized(
            fitted_normalized,
            image_width,
            image_height,
        ),
        silhouette_iou(source_mask, target_mask),
        silhouette_iou(fitted_mask, target_mask),
    )


def front_display_faces(
    raw_projected_vertices: np.ndarray,
    fitted_projected_vertices: np.ndarray,
    faces: np.ndarray,
    image_width: int,
    image_height: int,
) -> np.ndarray:
    raw_xy = image_normalized_vertices(
        raw_projected_vertices,
        image_width,
        image_height,
    ) * np.asarray([image_width - 1, image_height - 1])
    fitted_xy = image_normalized_vertices(
        fitted_projected_vertices,
        image_width,
        image_height,
    ) * np.asarray([image_width - 1, image_height - 1])
    triangles = np.asarray(faces, dtype=np.int64)
    a = raw_xy[triangles[:, 0]]
    b = raw_xy[triangles[:, 1]]
    c = raw_xy[triangles[:, 2]]
    signed_area = (
        (b[:, 0] - a[:, 0]) * (c[:, 1] - a[:, 1])
        - (b[:, 1] - a[:, 1]) * (c[:, 0] - a[:, 0])
    )
    fitted_triangles = fitted_xy[triangles]
    edge_lengths = np.linalg.norm(
        fitted_triangles - np.roll(fitted_triangles, 1, axis=1),
        axis=2,
    )
    maximum_edge = max(80.0, min(image_width, image_height) * 0.042)
    keep = (signed_area > 0.05) & (edge_lengths.max(axis=1) <= maximum_edge)
    visible = triangles[keep]
    if len(visible) < 1_000:
        raise RuntimeError("Too few front-surface triangles survived the 2D fit.")
    return visible


def nonstretched_display_faces(
    fitted_projected_vertices: np.ndarray,
    faces: np.ndarray,
    image_width: int,
    image_height: int,
) -> np.ndarray:
    fitted_xy = image_normalized_vertices(
        fitted_projected_vertices,
        image_width,
        image_height,
    ) * np.asarray([image_width - 1, image_height - 1])
    triangles = np.asarray(faces, dtype=np.int64)
    fitted_triangles = fitted_xy[triangles]
    edge_lengths = np.linalg.norm(
        fitted_triangles - np.roll(fitted_triangles, 1, axis=1),
        axis=2,
    )
    maximum_edge = max(80.0, min(image_width, image_height) * 0.042)
    return triangles[edge_lengths.max(axis=1) <= maximum_edge]


def mask_data_url(photo_id: str) -> str:
    mask_path = MASK_DIR / f"{photo_id}.png"
    if not mask_path.is_file():
        raise FileNotFoundError(
            f"Missing private silhouette for {photo_id}. Run build_photo_body_masks.py first."
        )
    return "data:image/png;base64," + base64.b64encode(mask_path.read_bytes()).decode("ascii")


def main() -> None:
    configure_environment()
    runner = load_shape_runner()
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    estimator = runner.load_estimator()
    records = []
    for photo in PHOTOS:
        request = {
            "heightCm": photo["height_cm"],
            "maskDataUrl": mask_data_url(photo["id"]),
        }
        diagnostics: dict[str, np.ndarray] = {}
        (
            posed_vertices,
            neutral_vertices,
            faces,
            returned_box,
            _mask_bounds_y,
            image_width,
            image_height,
            _mask,
            _camera_conditioned,
            camera_translation,
            camera_projection,
        ) = runner.run_model(estimator, photo["path"], request, capture=diagnostics)
        posed = normalized_browser_vertices(posed_vertices, photo["height_cm"])
        neutral = normalized_browser_vertices(neutral_vertices, photo["height_cm"])
        projected = projected_browser_vertices(
            posed_vertices,
            camera_translation,
            camera_projection,
            image_width,
            image_height,
        )
        fitted_projected, raw_iou, fitted_iou = fit_projection_to_visible_silhouette(
            projected,
            faces,
            MASK_DIR / f"{photo['id']}.png",
            image_width,
            image_height,
        )
        display_faces = front_display_faces(
            projected,
            fitted_projected,
            faces,
            image_width,
            image_height,
        )
        underlay_faces = nonstretched_display_faces(
            fitted_projected,
            faces,
            image_width,
            image_height,
        )
        posed_path = OUTPUT_DIR / f"{photo['id']}-posed.glb"
        neutral_path = OUTPUT_DIR / f"{photo['id']}-neutral.glb"
        projected_path = OUTPUT_DIR / f"{photo['id']}-projected.glb"
        projected_json_path = OUTPUT_DIR / f"{photo['id']}-projected.json"
        raw_projected_path = OUTPUT_DIR / f"{photo['id']}-projected-raw.glb"
        raw_projected_json_path = OUTPUT_DIR / f"{photo['id']}-projected-raw.json"
        export_glb(posed_path, posed, faces)
        export_glb(neutral_path, neutral, faces)
        export_glb(projected_path, fitted_projected, display_faces)
        export_glb(raw_projected_path, projected, display_faces)
        export_projected_json(
            projected_json_path,
            fitted_projected,
            display_faces,
            image_width,
            image_height,
            underlay_faces,
        )
        export_projected_json(
            raw_projected_json_path,
            projected,
            display_faces,
            image_width,
            image_height,
            underlay_faces,
        )
        records.append({
            "id": photo["id"],
            "label": photo["label"],
            "source": "Meta SAM 3D Body from RGB + private CPU silhouette crop + known height",
            "maskUsed": True,
            "measurementLinesUsed": False,
            "heightCm": photo["height_cm"],
            "weightKg": photo["weight_kg"],
            "imageSize": [image_width, image_height],
            "personBoxPx": [round(float(value), 2) for value in returned_box],
            "keypointCount": int(len(diagnostics.get("pred_keypoints_2d", []))),
            "vertexCount": int(len(posed)),
            "triangleCount": int(len(faces)),
            "displayTriangleCount": int(len(display_faces)),
            "underlayTriangleCount": int(len(underlay_faces)),
            "rawSilhouetteIoU": round(raw_iou, 6),
            "fittedSilhouetteIoU": round(fitted_iou, 6),
            "posedFile": posed_path.name,
            "neutralFile": neutral_path.name,
            "projectedFile": projected_path.name,
            "projectedJsonFile": projected_json_path.name,
            "rawProjectedFile": raw_projected_path.name,
            "rawProjectedJsonFile": raw_projected_json_path.name,
            "projectionSource": "Meta perspective projection fitted in 2D to the private CPU silhouette",
            "projectionFitSource": "visible body outline only; no tape or body measurements",
            "posedBytes": posed_path.stat().st_size,
            "neutralBytes": neutral_path.stat().st_size,
            "projectedBytes": projected_path.stat().st_size,
            "projectedJsonBytes": projected_json_path.stat().st_size,
            "rawProjectedBytes": raw_projected_path.stat().st_size,
            "rawProjectedJsonBytes": raw_projected_json_path.stat().st_size,
        })
        print(json.dumps({"completed": records[-1]}, indent=2), flush=True)
    (OUTPUT_DIR / "index.json").write_text(json.dumps({"models": records}, indent=2) + "\n")


if __name__ == "__main__":
    main()
