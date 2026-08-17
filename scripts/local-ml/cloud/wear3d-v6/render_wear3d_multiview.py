#!/usr/bin/env python3
"""Render camera-aware, formula-free WEAR 3D v6 training examples.

The large PLY is used to build true torso cross-section targets. Each subject
is imported once and rendered from several deterministic perspective cameras.
Recorded tape circumferences remain independent labels; they are never used to
solve an ellipse depth.
"""

from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import math
import random
import sys
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

import bpy
import numpy as np
from mathutils import Vector


# Render at the exact network input size.  Rendering at 2x and immediately
# downsampling in the dataset loader spent most of the CPU budget on pixels the
# model never sees; normalized landmark/row geometry is unchanged.
IMAGE_WIDTH = 192
IMAGE_HEIGHT = 256
RENDER_COLOR_SAMPLES = 16
RENDER_MASK_SAMPLES = 4
CONTOUR_POINTS = 32
MAX_GEOMETRY_TAPE_DELTA_PCT = 12.0
ROW_SPECS = {
    "neck": (None, "neck_base_circumference_mm"),
    "chest": ("chest_height_standing_mm", "chest_circumference_mm"),
    "underbust": (None, "underbust_circumference_mm"),
    "waist": ("waist_height_mm", "waist_circumference_mm"),
    "hips": ("hip_max_height_mm", "hip_circumference_mm"),
}
ROW_PROTOCOLS = {
    "neck": {
        "measurement_path": "sloped-chain-through-clavicales-suprasternale-and-cervicale",
        "mesh_plane": "tilted-WEAR-neck-base-landmark-plane",
        "perimeter_comparison": "diagnostic-plane-approximation",
    },
    "chest": {
        "measurement_path": "horizontal-tape-at-nipple-level-with-arms-hanging",
        "mesh_plane": "horizontal-WEAR-recorded-standing-chest-height-with-A-pose-arms-cropped",
        "perimeter_comparison": "diagnostic-pose-mismatch",
    },
    "underbust": {
        "measurement_path": "horizontal-tape-immediately-below-bra-cups",
        "mesh_plane": "horizontal-WEAR-substernale-landmark-with-documented-height-fallback",
        "perimeter_comparison": "diagnostic-pose-and-clothing-protocol-mismatch",
    },
    "waist": {
        "measurement_path": "horizontal-tape-at-subject-preferred-natural-waist",
        "mesh_plane": "horizontal-WEAR-recorded-waist-height",
        "perimeter_comparison": "direct",
    },
    "hips": {
        "measurement_path": "horizontal-maximum-hip-tape",
        "mesh_plane": "horizontal-WEAR-recorded-maximum-hip-height",
        "perimeter_comparison": "direct",
    },
}
SOURCE_ROW_MASK_REASONS = {
    "underbust": "source-underbust-plane-not-below-chest",
    "waist": "source-waist-plane-not-above-hips",
}
MIN_UNDERBUST_CHEST_SEPARATION_MM = 10.0
SOURCE_ROW_HEIGHT_EPSILON_MM = 0.01


def load_base_renderer():
    candidates = [
        Path(__file__).with_name("render_wear3d_pilot.py"),
        Path.cwd() / ".local-ml/tools/render_wear3d_pilot.py",
    ]
    source = next((path for path in candidates if path.exists()), None)
    if source is None:
        raise RuntimeError("render_wear3d_pilot.py is required beside v6 or under .local-ml/tools")
    spec = importlib.util.spec_from_file_location("wear_v6_base_renderer", source)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not import the base WEAR renderer from {source}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


BASE = load_base_renderer()


@dataclass(frozen=True)
class ViewSpec:
    view_id: str
    lens_mm: float
    yaw_deg: float
    pitch_deg: float
    distance_scale: float
    target_height_offset_ratio: float


DEFAULT_VIEWS = (
    ViewSpec("front-50", 50.0, 0.0, 0.0, 1.00, 0.00),
    ViewSpec("left-35", 35.0, -6.0, -3.0, 1.00, -0.02),
    ViewSpec("right-35", 35.0, 6.0, 3.0, 1.00, 0.02),
    ViewSpec("left-50", 50.0, -10.0, 0.0, 1.05, 0.03),
    ViewSpec("right-50", 50.0, 10.0, 0.0, 1.05, -0.03),
    ViewSpec("high-wide", 28.0, -4.0, 5.0, 0.98, 0.06),
    ViewSpec("low-wide", 28.0, 4.0, -5.0, 0.98, -0.06),
    ViewSpec("left-tele", 70.0, -3.0, 2.0, 1.10, 0.01),
    ViewSpec("right-tele", 70.0, 3.0, -2.0, 1.10, -0.01),
)


def parse_args() -> argparse.Namespace:
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--limit", type=int, default=0)
    parser.add_argument("--subject-id", action="append", default=[])
    parser.add_argument("--views-per-subject", type=int, default=len(DEFAULT_VIEWS))
    parser.add_argument("--mask-only", action="store_true")
    return parser.parse_args(argv)


def load_manifest(path: Path, limit: int, subject_ids: list[str]) -> list[dict[str, Any]]:
    records = [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]
    if subject_ids:
        selected = set(subject_ids)
        records = [record for record in records if record.get("subject_id") in selected]
    if limit > 0:
        records = records[:limit]
    return records


def views_for_subject(subject_id: str, count: int) -> list[ViewSpec]:
    if count < 1:
        raise ValueError("views-per-subject must be positive")
    views = list(DEFAULT_VIEWS[:count])
    if len(views) >= count:
        return views
    seed = int(hashlib.sha256(subject_id.encode()).hexdigest()[:16], 16)
    randomizer = random.Random(seed)
    while len(views) < count:
        index = len(views)
        views.append(
            ViewSpec(
                f"random-{index:02d}",
                randomizer.uniform(28.0, 72.0),
                randomizer.uniform(-12.0, 12.0),
                randomizer.uniform(-6.0, 6.0),
                randomizer.uniform(0.96, 1.12),
                randomizer.uniform(-0.07, 0.07),
            )
        )
    return views


def configure_scene(scene) -> None:
    BASE.configure_scene(scene)
    scene.render.resolution_x = IMAGE_WIDTH
    scene.render.resolution_y = IMAGE_HEIGHT
    scene.render.resolution_percentage = 100
    set_eevee_samples(scene, RENDER_COLOR_SAMPLES)


def set_eevee_samples(scene, samples: int) -> None:
    """Bound software-render cost on the Ubuntu Blender 3 worker.

    Blender 4/5 no longer exposes ``scene.eevee.taa_render_samples`` in the
    same place, so local visual-audit builds simply keep their runtime default.
    """
    eevee = getattr(scene, "eevee", None)
    if eevee is not None and hasattr(eevee, "taa_render_samples"):
        eevee.taa_render_samples = int(samples)


def add_perspective_camera(height_m: float, view: ViewSpec):
    data = bpy.data.cameras.new(f"Camera_{view.view_id}")
    camera = bpy.data.objects.new(f"Camera_{view.view_id}", data)
    bpy.context.collection.objects.link(camera)
    data.type = "PERSP"
    data.lens = view.lens_mm
    data.sensor_fit = "VERTICAL"
    data.sensor_height = 36.0
    vertical_fov = 2.0 * math.atan(data.sensor_height / (2.0 * data.lens))
    distance = (height_m * 1.10 / 2.0) / max(math.tan(vertical_fov / 2.0), 1e-6)
    distance *= view.distance_scale
    target_z = height_m * (0.50 + view.target_height_offset_ratio)
    yaw = math.radians(view.yaw_deg)
    pitch = math.radians(view.pitch_deg)
    camera.location = (
        distance * math.sin(yaw),
        distance * math.cos(yaw),
        target_z + distance * math.tan(pitch),
    )
    BASE.look_at(camera, Vector((0.0, 0.0, target_z)))
    bpy.context.scene.camera = camera
    focal_px = data.lens / data.sensor_height * IMAGE_HEIGHT
    return camera, {
        "projection": "perspective",
        "focal_x_px": round(focal_px, 5),
        "focal_y_px": round(focal_px, 5),
        "principal_x_px": IMAGE_WIDTH / 2.0,
        "principal_y_px": IMAGE_HEIGHT / 2.0,
        "distance_m": round(distance, 6),
        "target_height_m": round(target_z, 6),
        **asdict(view),
    }


def finite(value: Any) -> float | None:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if math.isfinite(number) else None


def row_height_mm(row_name: str, row_sources: dict[str, Any], landmarks: dict[str, Vector]) -> tuple[float | None, str]:
    if row_name == "neck":
        points = [
            landmarks.get("Suprasternale"),
            landmarks.get("Rt. Clavicale"),
            landmarks.get("Lt. Clavicale"),
            landmarks.get("Cervicale"),
        ]
        valid = [point for point in points if point is not None]
        return (
            sum(point.z for point in valid) / len(valid) * 1000.0 if valid else None,
            "mean_valid_neck_landmarks",
        )
    if row_name == "underbust":
        substernale = landmarks.get("Substernale")
        if substernale is not None:
            return substernale.z * 1000.0, "WEAR_Substernale_landmark"
        chest = finite(row_sources.get("chest_height_standing_mm"))
        waist = finite(row_sources.get("waist_height_mm"))
        if chest is None or waist is None or chest <= waist:
            return None, "unavailable"
        return chest - 0.20 * (chest - waist), "derived_20pct_below_chest_toward_waist"
    height_key = ROW_SPECS[row_name][0]
    measured = finite(row_sources.get(height_key))
    if measured is not None:
        return measured, "WEAR_recorded_height"
    if row_name == "waist":
        # This is the exact WEAR preferred-waist landmark, not a visual
        # minimum-width guess. Preserve the other 3D supervision when the
        # spreadsheet's redundant waist-height cell is missing.
        posterior_waist = landmarks.get("Waist, Preferred, Post.")
        if posterior_waist is not None:
            return posterior_waist.z * 1000.0, "WEAR_preferred_waist_posterior_landmark"
    return None, "unavailable"


def polygon_area(points: np.ndarray) -> float:
    return float(0.5 * np.sum(points[:, 0] * np.roll(points[:, 1], -1) - np.roll(points[:, 0], -1) * points[:, 1]))


def resample_closed_contour(points: np.ndarray, count: int) -> np.ndarray:
    if polygon_area(points) < 0.0:
        points = points[::-1].copy()
    start = int(np.lexsort((points[:, 1], points[:, 0]))[0])
    points = np.roll(points, -start, axis=0)
    closed = np.vstack((points, points[0]))
    segment_lengths = np.linalg.norm(np.diff(closed, axis=0), axis=1)
    perimeter = float(segment_lengths.sum())
    if perimeter <= 1e-8:
        raise ValueError("Degenerate torso contour")
    cumulative = np.concatenate(([0.0], np.cumsum(segment_lengths)))
    samples = np.linspace(0.0, perimeter, count, endpoint=False)
    result = []
    for distance in samples:
        segment = min(int(np.searchsorted(cumulative, distance, side="right") - 1), len(points) - 1)
        length = segment_lengths[segment]
        ratio = 0.0 if length <= 1e-9 else (distance - cumulative[segment]) / length
        result.append(closed[segment] + ratio * (closed[segment + 1] - closed[segment]))
    return np.asarray(result, dtype=np.float64)


def contour_candidate(points: np.ndarray, source: str, raw_closed: bool) -> dict[str, Any] | None:
    """Build a raw-mesh contour candidate without using the tape value.

    WEAR meshes can contain tiny holes or non-manifold seams. A nearly complete
    open loop may be closed across its two endpoints, but a badly fragmented or
    jagged loop is rejected. This prevents arm/root fragments from becoming a
    depth target.
    """
    if len(points) < 12:
        return None
    finite_points = points[np.isfinite(points).all(axis=1)]
    if len(finite_points) < 12:
        return None
    deltas = np.linalg.norm(np.diff(finite_points, axis=0), axis=1)
    path_length = float(deltas.sum())
    closure_gap = float(np.linalg.norm(finite_points[0] - finite_points[-1]))
    if path_length <= 1e-8:
        return None
    positive = deltas[deltas > 1e-8]
    if not len(positive):
        return None
    median_segment = float(np.median(positive))
    if "slab-hull" not in source and float(positive.max()) > max(0.035, median_segment * 18.0):
        return None
    closure_ratio = closure_gap / path_length
    if not raw_closed and closure_ratio > 0.42:
        return None
    contour = resample_closed_contour(finite_points, CONTOUR_POINTS)
    minimum = contour.min(axis=0)
    maximum = contour.max(axis=0)
    width_m, depth_m = maximum - minimum
    if not (0.08 < width_m < 0.90 and 0.05 < depth_m < 0.80):
        return None
    perimeter_m = float(np.linalg.norm(np.diff(np.vstack((contour, contour[0])), axis=0), axis=1).sum())
    hull = BASE.convex_hull(finite_points)
    hull_points = np.asarray([(point.x, point.y) for point in hull], dtype=np.float64)
    if len(hull_points) < 8:
        return None
    hull_perimeter_m = float(
        np.linalg.norm(np.diff(np.vstack((hull_points, hull_points[0])), axis=0), axis=1).sum()
    )
    # A long folded traversal is a non-manifold artifact, not body shape.
    if perimeter_m > hull_perimeter_m * 1.35:
        return None
    return {
        "points": contour,
        "source": source,
        "closure_gap_mm": closure_gap * 1000.0,
        "closure_ratio": closure_ratio,
        "reconstructed": not raw_closed,
    }


def mesh_plane_section_contour(
    body,
    origin: Vector,
    normal: Vector,
    basis_u: Vector,
    basis_v: Vector,
) -> tuple[np.ndarray, bool, float] | None:
    """Intersect a raw WEAR mesh with an anatomical 3D plane.

    The returned coordinates live in the plane's lateral/depth basis. This is
    required for neck-base circumference because the CAESAR tape path slopes
    from the front clavicular landmarks up to cervicale at the back; a
    horizontal slice is not the same anatomical measurement.
    """
    accumulated: dict[tuple[int, int], list[float]] = {}
    edges: set[tuple[tuple[int, int], tuple[int, int]]] = set()
    vertices = body.data.vertices
    matrix = body.matrix_world
    epsilon = 1e-9

    def add_point(world_point: Vector) -> tuple[int, int]:
        relative = world_point - origin
        point = Vector((relative.dot(basis_u), relative.dot(basis_v)))
        key = BASE.point_key(point)
        if key not in accumulated:
            accumulated[key] = [point.x, point.y, 1.0]
        else:
            accumulated[key][0] += point.x
            accumulated[key][1] += point.y
            accumulated[key][2] += 1.0
        return key

    for polygon in body.data.polygons:
        indices = list(polygon.vertices)
        triangles = [indices] if len(indices) == 3 else [
            (indices[0], indices[index], indices[index + 1])
            for index in range(1, len(indices) - 1)
        ]
        for triangle in triangles:
            triangle_points = [matrix @ vertices[index].co for index in triangle]
            intersections: list[Vector] = []
            for edge_index in range(3):
                first = triangle_points[edge_index]
                second = triangle_points[(edge_index + 1) % 3]
                first_delta = (first - origin).dot(normal)
                second_delta = (second - origin).dot(normal)
                if abs(first_delta) <= epsilon and abs(second_delta) <= epsilon:
                    continue
                if first_delta * second_delta > 0.0:
                    continue
                denominator = first_delta - second_delta
                if abs(denominator) <= epsilon:
                    continue
                ratio = first_delta / denominator
                if -epsilon <= ratio <= 1.0 + epsilon:
                    intersections.append(first + ratio * (second - first))
            unique: list[Vector] = []
            for point in intersections:
                if not any((point - existing).length <= 1e-7 for existing in unique):
                    unique.append(point)
            if len(unique) != 2:
                continue
            first_key = add_point(unique[0])
            second_key = add_point(unique[1])
            if first_key != second_key:
                edges.add(tuple(sorted((first_key, second_key))))

    points = {
        key: Vector((values[0] / values[2], values[1] / values[2]))
        for key, values in accumulated.items()
    }
    neighbors = {key: set() for key in points}
    for first_key, second_key in edges:
        neighbors[first_key].add(second_key)
        neighbors[second_key].add(first_key)

    components = []
    remaining = set(points)
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
        if len(component) >= 12:
            components.append(component)

    candidates = []
    center = Vector((0.0, 0.0))
    for component in components:
        contour, closed = BASE.ordered_component(component, neighbors, points)
        if len(contour) < 12:
            continue
        area = abs(polygon_area(np.asarray([(point.x, point.y) for point in contour], dtype=np.float64)))
        centroid = sum(contour, Vector((0.0, 0.0))) / len(contour)
        contains_center = closed and BASE.point_in_polygon(center, contour)
        score = (20.0 if contains_center else 0.0) + area * 100.0 - centroid.length * 2.0
        candidates.append((score, contour, closed))
    if not candidates:
        return None
    _, contour, closed = max(candidates, key=lambda item: item[0])
    points_array = np.asarray([(point.x, point.y) for point in contour], dtype=np.float64)
    perimeter = float(
        np.linalg.norm(
            np.diff(np.vstack((points_array, points_array[0] if closed else points_array[-1])), axis=0),
            axis=1,
        ).sum()
    )
    return points_array, closed, perimeter


def neck_contour(
    body,
    body_points: np.ndarray,
    landmarks: dict[str, Vector],
    circumference_mm: float | None,
) -> dict[str, Any] | None:
    front_points = [
        landmarks.get("Rt. Clavicale"),
        landmarks.get("Lt. Clavicale"),
        landmarks.get("Suprasternale"),
    ]
    front_points = [point for point in front_points if point is not None]
    cervicale = landmarks.get("Cervicale")
    right = landmarks.get("Rt. Clavicale")
    left = landmarks.get("Lt. Clavicale")
    if len(front_points) < 2 or cervicale is None or right is None or left is None:
        return None
    front = sum(front_points, Vector()) / len(front_points)
    basis_u = left - right
    if basis_u.length <= 1e-6:
        return None
    basis_u.normalize()
    depth_axis = cervicale - front
    depth_axis -= basis_u * depth_axis.dot(basis_u)
    if depth_axis.length <= 1e-6:
        return None
    basis_v = depth_axis.normalized()
    normal = basis_u.cross(basis_v)
    if normal.length <= 1e-6:
        return None
    normal.normalize()
    origin = (front + cervicale) / 2.0
    raw_section = mesh_plane_section_contour(body, origin, normal, basis_u, basis_v)
    raw_closed = bool(raw_section and raw_section[1])
    raw_perimeter_mm = float(raw_section[2] * 1000.0) if raw_section else None
    candidate = None
    if raw_section:
        candidate = contour_candidate(
            raw_section[0],
            "raw-WEAR-tilted-neck-plane-closed-loop" if raw_closed else "raw-WEAR-tilted-neck-plane-gap-closed-loop",
            raw_closed,
        )

    if candidate is None:
        selected_cloud = None
        used_slab = None
        relative = body_points - np.asarray(origin)[None, :]
        distances = relative @ np.asarray(normal)
        plane_u = relative @ np.asarray(basis_u)
        plane_v = relative @ np.asarray(basis_v)
        half_width = max(0.075, (left - right).length * 0.70)
        for slab in (0.003, 0.005, 0.008, 0.012):
            keep = (np.abs(distances) <= slab) & (np.abs(plane_u) <= half_width)
            cloud = np.column_stack((plane_u[keep], plane_v[keep]))
            if len(cloud) >= 80:
                selected_cloud = cloud
                used_slab = slab
                break
        if selected_cloud is None:
            return None
        low_v, high_v = np.quantile(selected_cloud[:, 1], [0.005, 0.995])
        selected_cloud = selected_cloud[(selected_cloud[:, 1] >= low_v) & (selected_cloud[:, 1] <= high_v)]
        hull = BASE.convex_hull(selected_cloud)
        hull_points = np.asarray([(point.x, point.y) for point in hull], dtype=np.float64)
        candidate = contour_candidate(hull_points, "raw-WEAR-tilted-neck-plane-slab-hull-fallback", True)
        if candidate is None:
            return None
    else:
        used_slab = 0.0

    contour = candidate["points"]
    minimum = contour.min(axis=0)
    maximum = contour.max(axis=0)
    center = (minimum + maximum) / 2.0
    width_m, depth_m = maximum - minimum
    perimeter_m = float(np.linalg.norm(np.diff(np.vstack((contour, contour[0])), axis=0), axis=1).sum())
    delta_pct = (
        abs(perimeter_m * 1000.0 - circumference_mm) / circumference_mm * 100.0
        if circumference_mm is not None and circumference_mm > 0.0
        else None
    )
    normalized = np.column_stack(
        ((contour[:, 0] - center[0]) / (width_m / 2.0), (contour[:, 1] - center[1]) / (depth_m / 2.0))
    )
    center_world = origin + basis_u * float(center[0]) + basis_v * float(center[1])
    world_points = [
        origin + basis_u * float(point[0]) + basis_v * float(point[1])
        for point in contour
    ]
    return {
        "height_m": float(center_world.z),
        "center_x_m": float(center_world.x),
        "center_y_m": float(center_world.y),
        "center_world": center_world,
        "contour_world_points": world_points,
        "width_mm": float(width_m * 1000.0),
        "depth_mm": float(depth_m * 1000.0),
        "contour_depth_mm": float(depth_m * 1000.0),
        "perimeter_mm": float(perimeter_m * 1000.0),
        "normalized_contour": normalized,
        "raw_slice_closed": raw_closed,
        "raw_perimeter_mm": raw_perimeter_mm,
        "reconstructed": candidate["reconstructed"],
        "contour_source": candidate["source"],
        "closure_gap_mm": candidate["closure_gap_mm"],
        "closure_ratio": candidate["closure_ratio"],
        "slab_mm": float((used_slab or 0.0) * 1000.0),
        "delta_pct": delta_pct,
        "geometry_target_valid": True,
        "shape_target_valid": True,
        "perimeter_consistent": delta_pct is None or delta_pct <= MAX_GEOMETRY_TAPE_DELTA_PCT,
        "plane_origin_mm": [round(float(value * 1000.0), 3) for value in center_world],
        "plane_normal": [round(float(value), 7) for value in normal],
    }


def torso_contour(
    body,
    body_points: np.ndarray,
    height_m: float,
    anatomy_bounds: tuple[float, float],
    circumference_mm: float | None,
    force_slab_hull: bool = False,
) -> dict[str, Any] | None:
    if not 0.05 < height_m < float(body_points[:, 2].max()):
        return None
    raw_section = BASE.mesh_section_contour(body, height_m)
    raw_closed = bool(raw_section and raw_section[1])
    raw_perimeter_mm = float(raw_section[2] * 1000.0) if raw_section else None
    selected_cloud = None
    used_slab = None
    left_bound, right_bound = anatomy_bounds
    for slab in (0.003, 0.005, 0.008, 0.012, 0.018):
        keep = (
            (np.abs(body_points[:, 2] - height_m) <= slab)
            & (body_points[:, 0] >= left_bound - 0.008)
            & (body_points[:, 0] <= right_bound + 0.008)
        )
        candidate = body_points[keep, :2]
        if len(candidate) >= 100:
            selected_cloud = candidate
            used_slab = slab
            break
    if selected_cloud is None:
        return None
    low_y, high_y = np.quantile(selected_cloud[:, 1], [0.005, 0.995])
    selected_cloud = selected_cloud[(selected_cloud[:, 1] >= low_y) & (selected_cloud[:, 1] <= high_y)]
    anatomy_center_x = (left_bound + right_bound) / 2.0
    central_half_width = min(0.060, max(0.020, (right_bound - left_bound) * 0.18))
    central_points = selected_cloud[np.abs(selected_cloud[:, 0] - anatomy_center_x) <= central_half_width]
    central_depth_m = None
    if len(central_points) >= 20:
        central_low_y, central_high_y = np.quantile(central_points[:, 1], [0.005, 0.995])
        candidate_depth = float(central_high_y - central_low_y)
        if 0.05 < candidate_depth < 0.60:
            central_depth_m = candidate_depth
    hull = BASE.convex_hull(selected_cloud)
    if len(hull) < 8:
        return None
    hull_points = np.asarray([(point.x, point.y) for point in hull], dtype=np.float64)
    candidate = None
    if raw_section and not force_slab_hull:
        raw_points = np.asarray([(point.x, point.y) for point in raw_section[0]], dtype=np.float64)
        candidate = contour_candidate(
            raw_points,
            "raw-mesh-closed-loop" if raw_closed else "raw-mesh-gap-closed-loop",
            raw_closed,
        )
        # A horizontal hip slice may contain two disconnected upper-thigh
        # components. The base selector can otherwise choose just one thigh.
        # Reject any raw component that is much narrower than the anatomical
        # left/right landmark span, then let the outer slab hull bridge the
        # same path a physical hip tape bridges.
        if candidate is not None:
            candidate_width = float(np.ptp(candidate["points"][:, 0]))
            candidate_left = float(candidate["points"][:, 0].min())
            candidate_right = float(candidate["points"][:, 0].max())
            if (
                candidate_width < (right_bound - left_bound) * 0.60
                or candidate_left < left_bound - 0.0085
                or candidate_right > right_bound + 0.0085
            ):
                candidate = None
    if candidate is None:
        candidate = contour_candidate(hull_points, "raw-mesh-slab-hull-fallback", True)
    if candidate is None:
        return None
    contour = candidate["points"]
    minimum = contour.min(axis=0)
    maximum = contour.max(axis=0)
    center = (minimum + maximum) / 2.0
    width_m, contour_depth_m = maximum - minimum
    if not (0.08 < width_m < 0.90 and 0.05 < contour_depth_m < 0.80):
        return None
    normalized = np.column_stack(
        (
            (contour[:, 0] - center[0]) / (width_m / 2.0),
            (contour[:, 1] - center[1]) / (contour_depth_m / 2.0),
        )
    )
    perimeter_m = float(np.linalg.norm(np.diff(np.vstack((contour, contour[0])), axis=0), axis=1).sum())
    delta_pct = (
        abs(perimeter_m * 1000.0 - circumference_mm) / circumference_mm * 100.0
        if circumference_mm is not None and circumference_mm > 0.0
        else None
    )
    perimeter_consistent = delta_pct is None or delta_pct <= MAX_GEOMETRY_TAPE_DELTA_PCT
    return {
        "height_m": height_m,
        "center_x_m": float(center[0]),
        "center_y_m": float(center[1]),
        "width_mm": float(width_m * 1000.0),
        "depth_mm": float(central_depth_m * 1000.0) if central_depth_m is not None else None,
        "contour_depth_mm": float(contour_depth_m * 1000.0),
        "perimeter_mm": float(perimeter_m * 1000.0),
        "normalized_contour": normalized,
        "center_world": Vector((float(center[0]), float(center[1]), height_m)),
        "contour_world_points": [Vector((float(point[0]), float(point[1]), height_m)) for point in contour],
        "raw_slice_closed": raw_closed,
        "raw_perimeter_mm": raw_perimeter_mm,
        "reconstructed": candidate["reconstructed"],
        "contour_source": candidate["source"],
        "closure_gap_mm": candidate["closure_gap_mm"],
        "closure_ratio": candidate["closure_ratio"],
        "slab_mm": float(used_slab * 1000.0),
        "delta_pct": delta_pct,
        "geometry_target_valid": central_depth_m is not None,
        "shape_target_valid": True,
        "perimeter_consistent": perimeter_consistent,
        "anatomy_bounds_width_mm": float((right_bound - left_bound) * 1000.0),
        "edge_within_anatomy_bounds": bool(
            minimum[0] >= left_bound - 0.009 and maximum[0] <= right_bound + 0.009
        ),
    }


def rounded_contour(points: np.ndarray) -> list[list[float]]:
    return [[round(float(x), 6), round(float(y), 6)] for x, y in points]


def project_contour(scene, camera, geometry: dict[str, Any]) -> dict[str, Any] | None:
    points = geometry["contour_world_points"]
    projected = [BASE.project(scene, camera, point) for point in points]
    visible = [point for point in projected if point["visible"]]
    if len(visible) < CONTOUR_POINTS * 0.8:
        return None
    left = min(float(point["x"]) for point in visible)
    right = max(float(point["x"]) for point in visible)
    center_world = geometry["center_world"]
    center = BASE.project(scene, camera, center_world)
    one_cm = BASE.project(scene, camera, center_world + Vector((0.01, 0.0, 0.0)))
    pixels_per_cm = abs(float(one_cm["x"]) - float(center["x"])) * (IMAGE_WIDTH - 1)
    span_px = (right - left) * (IMAGE_WIDTH - 1)
    if pixels_per_cm <= 1e-4 or span_px <= 1.0:
        return None
    return {
        "y_norm": round(float(center["y"]), 6),
        "left_x_norm": round(left, 6),
        "right_x_norm": round(right, 6),
        "span_px": round(span_px, 4),
        "row_cm_per_px": round(1.0 / pixels_per_cm, 8),
        "apple_corrected_width_cm": round(span_px / pixels_per_cm, 4),
        "projected_contour": [[round(float(point["x"]), 6), round(float(point["y"]), 6)] for point in visible],
    }


def body_material_for(subject_id: str, view_id: str):
    seed = int(hashlib.sha256(f"{subject_id}:{view_id}".encode()).hexdigest()[:16], 16)
    randomizer = random.Random(seed)
    body_color = tuple(randomizer.uniform(low, high) for low, high in ((0.18, 0.90), (0.15, 0.82), (0.12, 0.78))) + (1.0,)
    background = tuple(randomizer.uniform(0.02, 0.95) for _ in range(3))
    return BASE.make_material(f"Body_{subject_id}_{view_id}", body_color), background


def render_one_view(
    record: dict[str, Any],
    body,
    height_m: float,
    geometry_rows: dict[str, dict[str, Any]],
    masked_rows: dict[str, dict[str, Any]],
    landmarks: dict[str, Vector],
    scene,
    output_dir: Path,
    view: ViewSpec,
    mask_only: bool,
) -> dict[str, Any]:
    camera, camera_data = add_perspective_camera(height_m, view)
    material, background = body_material_for(record["subject_id"], view.view_id)
    mask_material = BASE.make_material(
        f"Mask_{record['subject_id']}_{view.view_id}",
        (1.0, 1.0, 1.0, 1.0),
        emission=True,
    )
    body.data.materials.clear()
    body.data.materials.append(material)
    scene.world.color = background
    sample_id = f"{record.get('scan_id', record['subject_id'])}-{view.view_id}"
    image_dir = output_dir / "images"
    mask_dir = output_dir / "masks"
    image_dir.mkdir(parents=True, exist_ok=True)
    mask_dir.mkdir(parents=True, exist_ok=True)
    image_path = image_dir / f"{sample_id}.png"
    mask_path = mask_dir / f"{sample_id}.png"

    if not mask_only:
        set_eevee_samples(scene, RENDER_COLOR_SAMPLES)
        scene.render.film_transparent = False
        scene.render.image_settings.color_mode = "RGBA"
        for obj in scene.objects:
            if obj.type == "LIGHT":
                obj.hide_render = False
        scene.render.filepath = str(image_path)
        bpy.ops.render.render(write_still=True)

    set_eevee_samples(scene, RENDER_MASK_SAMPLES)
    body.data.materials[0] = mask_material
    scene.world.color = (0.0, 0.0, 0.0)
    scene.render.film_transparent = True
    scene.render.image_settings.color_mode = "RGBA"
    for obj in scene.objects:
        if obj.type == "LIGHT":
            obj.hide_render = True
    scene.render.filepath = str(mask_path)
    bpy.ops.render.render(write_still=True)
    mask, cleanup = BASE.load_mask_pixels(mask_path)
    body.data.materials[0] = material
    set_eevee_samples(scene, RENDER_COLOR_SAMPLES)

    rows: dict[str, Any] = {}
    for row_name, geometry in geometry_rows.items():
        projected = project_contour(scene, camera, geometry)
        if projected is None:
            rows[row_name] = {"accepted": False, "reason": "contour projection failed"}
            continue
        visible_run = BASE.central_mask_run(mask, projected["y_norm"], (projected["left_x_norm"] + projected["right_x_norm"]) / 2.0)
        # The WEAR target must stay independent from the rendered mask. A mask
        # scanline can jump onto an upper arm at chest/under-bust height. Use
        # the projected closed torso contour for the learned WEAR endpoints,
        # and preserve the mask run only as a separate comparison target.
        edge_left = projected["left_x_norm"]
        edge_right = projected["right_x_norm"]
        edge_source = "projected-WEAR-3D-closed-torso-contour"
        rows[row_name] = {
            "accepted": True,
            **projected,
            "wear_edge_left_x_norm": round(edge_left, 6),
            "wear_edge_right_x_norm": round(edge_right, 6),
            "visible_mask_left_x_norm": round(visible_run[0], 6) if visible_run else None,
            "visible_mask_right_x_norm": round(visible_run[1], 6) if visible_run else None,
            "mesh_width_mm": round(geometry["width_mm"], 3),
            "mesh_depth_mm": round(geometry["depth_mm"], 3) if geometry["depth_mm"] is not None else None,
            "mesh_contour_depth_mm": round(geometry["contour_depth_mm"], 3),
            "mesh_section_perimeter_mm": round(geometry["perimeter_mm"], 3),
            "mesh_depth_ratio": (
                round(geometry["depth_mm"] / geometry["width_mm"], 6)
                if geometry["depth_mm"] is not None
                else None
            ),
            "measurement_circumference_mm": geometry["measurement_circumference_mm"],
            "contour_points_normalized": rounded_contour(geometry["normalized_contour"]),
            "slice_height_mm": round(geometry["height_m"] * 1000.0, 3),
            "slice_method": geometry["contour_source"],
            "slice_reconstructed": geometry["reconstructed"],
            "closure_gap_mm": round(geometry["closure_gap_mm"], 3),
            "closure_ratio": round(geometry["closure_ratio"], 6),
            "raw_slice_closed": geometry["raw_slice_closed"],
            "raw_mesh_section_perimeter_mm": (
                round(geometry["raw_perimeter_mm"], 3) if geometry["raw_perimeter_mm"] is not None else None
            ),
            "perimeter_delta_to_measurement_pct": (
                round(geometry["delta_pct"], 3) if geometry["delta_pct"] is not None else None
            ),
            "height_method": geometry["height_method"],
            "geometry_target_valid": geometry["geometry_target_valid"],
            "perimeter_consistent_with_tape": geometry["perimeter_consistent"],
            "shape_target_valid": geometry["shape_target_valid"],
            "depth_target_source": "raw-mesh-torso-contour",
            "edge_target_source": edge_source,
            "circumference_target_source": (
                "WEAR-recorded-standing-measurement"
                if geometry["measurement_circumference_mm"] is not None
                else "unavailable-for-subject"
            ),
            "measurement_protocol": ROW_PROTOCOLS[row_name]["measurement_path"],
            "mesh_plane_protocol": (
                "horizontal-WEAR-preferred-waist-posterior-landmark"
                if geometry["height_method"] == "WEAR_preferred_waist_posterior_landmark"
                else ROW_PROTOCOLS[row_name]["mesh_plane"]
            ),
            "perimeter_comparison": ROW_PROTOCOLS[row_name]["perimeter_comparison"],
            "arm_exclusion_method": (
                "WEAR-landmark-bounded-torso-crop" if row_name in {"chest", "underbust"} else "not-applicable"
            ),
            "anatomy_bounds_width_mm": geometry.get("anatomy_bounds_width_mm"),
            "edge_within_anatomy_bounds": geometry.get("edge_within_anatomy_bounds", True),
            "plane_origin_mm": geometry.get("plane_origin_mm"),
            "plane_normal": geometry.get("plane_normal"),
        }

    projected_landmarks = {name: BASE.project(scene, camera, point) for name, point in landmarks.items()}
    projected_segments = BASE.projected_segments(landmarks, scene, camera)
    camera.select_set(True)
    bpy.data.objects.remove(camera, do_unlink=True)
    return {
        "schema_version": 2,
        "pipeline_id": "wear3d-standing-multiview-v6",
        "sample_id": sample_id,
        "subject_id": record["subject_id"],
        "scan_id": record.get("scan_id", record["subject_id"]),
        "view_id": view.view_id,
        "role": record["role"],
        "region": record["region"],
        "pose": record.get("pose", "unknown"),
        "training_pose_valid": (
            record.get("training_pose_valid")
            if record.get("training_pose_valid") is not None
            else record.get("pose") == "standing_a"
        ),
        "landmark_targets_valid": record.get("landmark_targets_valid", True),
        "gender": record["gender"],
        "height_cm": record["height_cm"],
        "weight_kg": record["weight_kg"],
        "bmi": record["bmi"],
        "image": str(image_path if not mask_only else mask_path),
        "mask": str(mask_path),
        "mask_cleanup": cleanup,
        "camera": camera_data,
        "rows": rows,
        "masked_rows": masked_rows,
        "landmarks_2d": projected_landmarks,
        "segments": projected_segments,
        "measurements_mm": record.get("measurements_mm", {}),
        "extracted_standing_mm": record.get("extracted_standing_mm", {}),
        "render": {
            "view": "deterministic_perspective_multiview",
            "width": IMAGE_WIDTH,
            "height": IMAGE_HEIGHT,
            "source": "WEAR standing PLY mesh plus LND/XLS labels",
            "vertical_alignment_method": body.get("wear_vertical_alignment_method", "unknown"),
            "vertical_offset_mm": body.get("wear_vertical_offset_mm"),
            "synthetic_only": True,
            "mask_only": mask_only,
        },
    }


def prepare_geometry_rows(
    record: dict[str, Any],
    body,
    body_points: np.ndarray,
    landmarks: dict[str, Vector],
) -> tuple[dict[str, dict[str, Any]], dict[str, dict[str, Any]]]:
    row_sources = {**record.get("measurements_mm", {}), **record.get("extracted_standing_mm", {})}
    rows: dict[str, dict[str, Any]] = {}
    for row_name, (_, circumference_key) in ROW_SPECS.items():
        circumference = finite(row_sources.get(circumference_key))
        # WEAR defines under-bust as a female tape protocol.  Do not invent a
        # male under-bust target from geometry when the source does not contain
        # that measurement.
        if row_name == "underbust" and circumference is None:
            continue
        if row_name == "neck":
            geometry = neck_contour(body, body_points, landmarks, circumference)
            height_method = "WEAR_tilted_neck_base_landmark_plane"
        else:
            height_mm, height_method = row_height_mm(row_name, row_sources, landmarks)
            if height_mm is None and row_name == "hips":
                # Six people have a real hip tape but no recorded height for
                # that tape plane. A large abdomen can make several raw pelvis
                # sections equally plausible, so do not invent a 2D hip row.
                # The trainer still consumes the independent circumference;
                # only this ambiguous edge/depth/shape target is masked.
                geometry = None
                height_method = "source-hip-height-unavailable-row-masked"
            elif height_mm is not None:
                geometry = torso_contour(
                    body,
                    body_points,
                    height_mm / 1000.0,
                    BASE.torso_bounds(landmarks, row_name),
                    circumference,
                )
            else:
                geometry = None
        if geometry is None:
            continue
        # A missing tape field must not erase valid supervision from the raw
        # mesh.  Keep the anatomical row, projected torso edges, true depth,
        # and 32-point cross-section; the trainer independently masks only the
        # unavailable circumference target for this subject.
        geometry["measurement_circumference_mm"] = (
            round(circumference, 3) if circumference is not None else None
        )
        geometry["height_method"] = height_method
        rows[row_name] = geometry

    # A small number of source records contain anatomically inverted *row
    # heights* even though their independent tape circumference is valid.  Do
    # not move a line to make the audit pass and do not discard the person.
    # Mask only that source-corrupt edge/depth/shape target; the trainer still
    # consumes the original WEAR tape value from measurements_mm.
    masked_rows: dict[str, dict[str, Any]] = {}

    def mask_row(row_name: str, reference_name: str, reason: str) -> None:
        geometry = rows.pop(row_name)
        reference = rows[reference_name]
        masked_rows[row_name] = {
            "reason": reason,
            "source_slice_height_mm": round(float(geometry["height_m"]) * 1000.0, 3),
            "reference_row": reference_name,
            "reference_slice_height_mm": round(float(reference["height_m"]) * 1000.0, 3),
            "tape_circumference_preserved": geometry.get("measurement_circumference_mm") is not None,
        }

    if (
        "underbust" in rows
        and "chest" in rows
        and (
            float(rows["underbust"]["height_m"]) * 1000.0 + SOURCE_ROW_HEIGHT_EPSILON_MM
            >= float(rows["chest"]["height_m"]) * 1000.0 - MIN_UNDERBUST_CHEST_SEPARATION_MM
        )
    ):
        mask_row("underbust", "chest", SOURCE_ROW_MASK_REASONS["underbust"])
    if (
        "waist" in rows
        and "hips" in rows
        and float(rows["waist"]["height_m"]) <= float(rows["hips"]["height_m"])
    ):
        mask_row("waist", "hips", SOURCE_ROW_MASK_REASONS["waist"])
    return rows, masked_rows


def render_subject(record: dict[str, Any], output_dir: Path, views_per_subject: int, mask_only: bool) -> list[dict[str, Any]]:
    BASE.clean_scene()
    scene = bpy.context.scene
    configure_scene(scene)
    body, transform, offset, height_m = BASE.import_body(record)
    landmarks = BASE.transform_landmarks(record, transform, offset)
    BASE.add_lights(height_m)
    for polygon in body.data.polygons:
        polygon.use_smooth = True
    points = np.empty(len(body.data.vertices) * 3, dtype=np.float64)
    body.data.vertices.foreach_get("co", points)
    body_points = points.reshape((-1, 3)) + np.asarray(body.location)[None, :]
    geometry_rows, masked_rows = prepare_geometry_rows(record, body, body_points, landmarks)
    # Keep an otherwise valid standing person when the subject-specific tilted
    # neck plane cannot form a stable closed contour.  Neck is independently
    # masked by the trainer and has its own coverage gate, so discarding the
    # person's chest, waist, landmarks, and every other WEAR measurement would
    # throw away valid supervision. Hip is mandatory whenever WEAR supplied its
    # plane height; the six source records missing that height keep their tape
    # label but mask only the ambiguous row geometry.
    row_sources = {**record.get("measurements_mm", {}), **record.get("extracted_standing_mm", {})}
    required_rows = ["chest"]
    if "waist" not in masked_rows:
        required_rows.append("waist")
    if finite(row_sources.get("hip_max_height_mm")) is not None:
        required_rows.append("hips")
    if not all(row in geometry_rows for row in required_rows):
        missing = sorted(set(required_rows) - set(geometry_rows))
        raise RuntimeError(f"missing stable core mesh rows: {missing}")
    return [
        render_one_view(
            record,
            body,
            height_m,
            geometry_rows,
            masked_rows,
            landmarks,
            scene,
            output_dir,
            view,
            mask_only,
        )
        for view in views_for_subject(record["subject_id"], views_per_subject)
    ]


def main() -> None:
    args = parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)
    records = load_manifest(args.manifest, args.limit, args.subject_id)
    manifest_path = args.output_dir / "render-manifest.jsonl"
    with manifest_path.open("w", encoding="utf-8") as handle:
        completed = 0
        for subject_index, record in enumerate(records, 1):
            try:
                rendered = render_subject(record, args.output_dir, args.views_per_subject, args.mask_only)
            except Exception as error:
                scan_id = record.get("scan_id", record.get("subject_id"))
                rendered = [
                    {
                        "schema_version": 2,
                        "pipeline_id": "wear3d-standing-multiview-v6",
                        "sample_id": f"{scan_id}-{view.view_id}",
                        "subject_id": record.get("subject_id"),
                        "scan_id": scan_id,
                        "view_id": view.view_id,
                        "role": record.get("role"),
                        "region": record.get("region"),
                        "error": f"{type(error).__name__}: {error}",
                    }
                    for view in views_for_subject(str(record.get("subject_id")), args.views_per_subject)
                ]
            for item in rendered:
                handle.write(json.dumps(item, separators=(",", ":"), sort_keys=True) + "\n")
                completed += 1
            handle.flush()
            state = "ERROR" if rendered and rendered[0].get("error") else "OK"
            print(f"[{subject_index}/{len(records)}] {record.get('subject_id')} {state} samples={completed}", flush=True)
    print(f"render_manifest={manifest_path}", flush=True)


if __name__ == "__main__":
    main()
