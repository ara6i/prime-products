#!/usr/bin/env python3
"""Render camera-aware, formula-free WEAR 3D v6 training examples.

The large PLY is used to build true torso cross-section targets. Each subject
is imported once and rendered from several deterministic perspective cameras.
Recorded tape circumferences never create or validate a line, mesh slice, or
PLY perimeter. PLY/LND supplies only row position, A-B, C-D, and the normalized
32-point shape. The recorded WEAR tape is the only circumference target.
"""

from __future__ import annotations

import argparse
import heapq
import hashlib
import importlib.util
import json
import math
import os
import random
import sys
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

import bpy
import numpy as np
from mathutils import Vector
from mathutils.bvhtree import BVHTree


# Render at the exact network input size.  Rendering at 2x and immediately
# downsampling in the dataset loader spent most of the CPU budget on pixels the
# model never sees; normalized landmark/row geometry is unchanged.
IMAGE_WIDTH = 192
IMAGE_HEIGHT = 256
RENDER_COLOR_SAMPLES = 16
RENDER_MASK_SAMPLES = 4
CONTOUR_POINTS = 32
ROW_SPECS = {
    "neck": (None, "neck_base_circumference_mm"),
    "chest": ("chest_height_standing_mm", "chest_circumference_mm"),
    "underbust": (None, "underbust_circumference_mm"),
    "waist": ("waist_height_mm", "waist_circumference_mm"),
    "hips": ("hip_max_height_mm", "hip_circumference_mm"),
}
DEFAULT_PIPELINE_ID = "wear3d-standing-mesh-teacher-v8"


def pipeline_id() -> str:
    return os.environ.get("WEAR_TEACHER_PIPELINE_ID", DEFAULT_PIPELINE_ID)
ROW_PROTOCOLS = {
    "neck": {
        "measurement_path": "sloped-chain-through-clavicales-suprasternale-and-cervicale",
        "mesh_plane": "tilted-WEAR-neck-base-landmark-plane",
    },
    "chest": {
        "measurement_path": "horizontal-tape-at-nipple-level-with-arms-hanging",
        "mesh_plane": "horizontal-WEAR-recorded-standing-chest-height-with-A-pose-arms-cropped",
    },
    "underbust": {
        "measurement_path": "horizontal-tape-immediately-below-bra-cups",
        "mesh_plane": "horizontal-WEAR-substernale-landmark-with-documented-height-fallback",
    },
    "waist": {
        "measurement_path": "horizontal-tape-at-subject-preferred-natural-waist",
        "mesh_plane": "horizontal-WEAR-recorded-waist-height",
    },
    "hips": {
        "measurement_path": "horizontal-maximum-hip-tape",
        "mesh_plane": "horizontal-WEAR-recorded-maximum-hip-height",
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


def load_full_contract():
    candidates = [
        Path(__file__).with_name("wear_full_contract.py"),
        Path(__file__).resolve().parents[2] / "wear_full_contract.py",
    ]
    source = next((path for path in candidates if path.exists()), None)
    if source is None:
        raise RuntimeError("wear_full_contract.py is required beside the renderer or under scripts/local-ml")
    spec = importlib.util.spec_from_file_location("wear_full_contract", source)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not import the full WEAR contract from {source}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


FULL_CONTRACT = load_full_contract()
CANONICAL_LANDMARKS = frozenset(FULL_CONTRACT.CANONICAL_LANDMARKS)
LANDMARK_ALIASES = {
    FULL_CONTRACT.MALFORMED_LANDMARK: "Rt. Femoral Lateral Epicn",
}


def connected_tape_protocol(row_name: str) -> tuple[bool, dict[str, Any]]:
    """Return whether recorded tape may supervise this exact PLY row.

    PLY geometry may still teach row position, A-B, C-D, and shape when the
    historical tape protocol used a different pose or path.  Only the tape
    loss is blocked in that case; this prevents a good mesh row from being
    mislabeled as the same geometry as an incompatible recorded tape.
    """
    protocol = FULL_CONTRACT.CIRCUMFERENCE_PROTOCOLS[row_name]
    return protocol["geometry_status"] == "implemented-certified", protocol


@dataclass(frozen=True)
class ViewSpec:
    view_id: str
    lens_mm: float
    yaw_deg: float
    pitch_deg: float
    distance_scale: float
    target_height_offset_ratio: float
    roll_deg: float = 0.0


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
    parser.add_argument(
        "--target-row",
        action="append",
        choices=tuple(ROW_SPECS),
        default=[],
        help="Render only the requested anatomical row. Repeat for more than one row.",
    )
    parser.add_argument("--mask-only", action="store_true")
    parser.add_argument(
        "--mesh-override-dir",
        type=Path,
        default=None,
        help="Local proof-only directory containing PLY/PLY.GZ files with the same basename as the manifest source.",
    )
    return parser.parse_args(argv)


def load_manifest(path: Path, limit: int, subject_ids: list[str]) -> list[dict[str, Any]]:
    records = [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]
    if subject_ids:
        selected = set(subject_ids)
        records = [record for record in records if record.get("subject_id") in selected]
    if limit > 0:
        records = records[:limit]
    return records


def apply_mesh_override(record: dict[str, Any], override_dir: Path | None) -> dict[str, Any]:
    """Point a proof render at a local copy without changing source truth."""
    if override_dir is None:
        return record
    source = dict(record.get("source") or {})
    original = Path(str(source.get("mesh") or ""))
    candidate = override_dir / original.name
    if not candidate.is_file():
        matches = list(override_dir.rglob(original.name))
        if len(matches) != 1:
            raise FileNotFoundError(
                f"local mesh override is missing or ambiguous: {candidate} matches={len(matches)}"
            )
        candidate = matches[0]
    source["mesh"] = str(candidate.resolve())
    return {**record, "source": source}


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
    camera.rotation_euler.rotate_axis("Z", math.radians(view.roll_deg))
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


def canonicalize_landmarks(
    landmarks: dict[str, Vector],
) -> tuple[dict[str, Vector], dict[str, Any]]:
    """Normalize scanner-specific LND names to the canonical WEAR 73."""
    result: dict[str, Vector] = {}
    dropped: list[str] = []
    repaired: dict[str, str] = {}
    for raw_name, point in landmarks.items():
        name = LANDMARK_ALIASES.get(raw_name, raw_name)
        if name != raw_name:
            repaired[raw_name] = name
        if name not in CANONICAL_LANDMARKS:
            dropped.append(raw_name)
            continue
        previous = result.get(name)
        if previous is not None and (previous - point).length > 1e-7:
            raise RuntimeError(f"conflicting canonical WEAR landmark coordinates for {name}")
        result[name] = point
    missing = sorted(CANONICAL_LANDMARKS - set(result))
    return result, {
        "schema": "WEAR-canonical-73/v1",
        "canonical_count": len(CANONICAL_LANDMARKS),
        "available_count": len(result),
        "missing_count": len(missing),
        "missing_landmark_mask": missing,
        "dropped_noncanonical_names": sorted(dropped),
        "repaired_aliases": repaired,
    }


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
        # Keep the original ordered path for world-space proof. The 32-point
        # contour is a compact training target; drawing only those chords can
        # visibly cut through a curved body even when the source path is real.
        "surface_points": finite_points,
        "source": source,
        "closure_gap_mm": closure_gap * 1000.0,
        "closure_ratio": closure_ratio,
        "reconstructed": not raw_closed,
    }


def mesh_plane_section_components(
    body,
    origin: Vector,
    normal: Vector,
    basis_u: Vector,
    basis_v: Vector,
) -> list[dict[str, Any]]:
    """Intersect a raw WEAR mesh with an anatomical 3D plane.

    The returned coordinates live in the plane's lateral/depth basis. This is
    required for neck-base circumference because the CAESAR tape path slopes
    from the front clavicular landmarks up to cervicale at the back; a
    horizontal slice is not the same anatomical measurement.
    """
    accumulated: dict[tuple[int, int], list[float]] = {}
    edges: set[tuple[tuple[int, int], tuple[int, int]]] = set()
    vertices = body.data.vertices
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
            # The importer applies the anatomical transform and unit scale to
            # vertex data; only the verified centering/floor offset remains on
            # the object.  Use that explicit transform, matching horizontal
            # sections and transformed WEAR landmarks.  A stale matrix_world
            # before dependency-graph evaluation previously made the tilted
            # neck plane miss the mesh entirely.
            triangle_points = [vertices[index].co + body.location for index in triangle]
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

    candidates: list[dict[str, Any]] = []
    for component in components:
        contour, closed = BASE.ordered_component(component, neighbors, points)
        if len(contour) < 12:
            continue
        points_array = np.asarray([(point.x, point.y) for point in contour], dtype=np.float64)
        area = abs(polygon_area(points_array))
        centroid = sum(contour, Vector((0.0, 0.0))) / len(contour)
        candidates.append({
            "points": points_array,
            "closed": bool(closed and all(len(neighbors[key]) == 2 for key in component)),
            "centroid": np.asarray((centroid.x, centroid.y), dtype=np.float64),
            "area": float(area),
        })
    return candidates


def mesh_plane_section_contour(
    body,
    origin: Vector,
    normal: Vector,
    basis_u: Vector,
    basis_v: Vector,
) -> tuple[np.ndarray, bool, float] | None:
    candidates = mesh_plane_section_components(body, origin, normal, basis_u, basis_v)
    if not candidates:
        return None
    center = Vector((0.0, 0.0))

    def score(candidate: dict[str, Any]) -> float:
        points_array = candidate["points"]
        contour = [Vector((float(point[0]), float(point[1]))) for point in points_array]
        contains_center = candidate["closed"] and BASE.point_in_polygon(center, contour)
        centroid = candidate["centroid"]
        return (20.0 if contains_center else 0.0) + candidate["area"] * 100.0 - float(np.linalg.norm(centroid)) * 2.0

    selected = max(candidates, key=score)
    points_array = selected["points"]
    closed = bool(selected["closed"])
    perimeter = float(
        np.linalg.norm(
            np.diff(np.vstack((points_array, points_array[0] if closed else points_array[-1])), axis=0),
            axis=1,
        ).sum()
    )
    return points_array, closed, perimeter


def horizontal_section_components(body, world_height_m: float) -> list[dict[str, Any]]:
    """Return every real PLY intersection component at one horizontal row."""
    plane_z = world_height_m - body.location.z + 0.0001
    accumulated: dict[tuple[int, int], list[float]] = {}
    edges: set[tuple[tuple[int, int], tuple[int, int]]] = set()

    def add_point(point: Vector) -> tuple[int, int]:
        world_point = Vector((point.x + body.location.x, point.y + body.location.y))
        key = BASE.point_key(world_point)
        value = accumulated.setdefault(key, [0.0, 0.0, 0.0])
        value[0] += world_point.x
        value[1] += world_point.y
        value[2] += 1.0
        return key

    vertices = body.data.vertices
    for polygon in body.data.polygons:
        indices = list(polygon.vertices)
        triangles = [indices] if len(indices) == 3 else [
            (indices[0], indices[index], indices[index + 1])
            for index in range(1, len(indices) - 1)
        ]
        for triangle in triangles:
            triangle_points = [vertices[index].co for index in triangle]
            intersections = []
            for edge_index in range(3):
                first = triangle_points[edge_index]
                second = triangle_points[(edge_index + 1) % 3]
                first_delta = first.z - plane_z
                second_delta = second.z - plane_z
                if first_delta * second_delta >= 0.0:
                    continue
                ratio = first_delta / (first_delta - second_delta)
                intersections.append(Vector((
                    first.x + ratio * (second.x - first.x),
                    first.y + ratio * (second.y - first.y),
                )))
            if len(intersections) != 2:
                continue
            first_key = add_point(intersections[0])
            second_key = add_point(intersections[1])
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
        if len(component) < 12:
            continue
        contour, closed = BASE.ordered_component(component, neighbors, points)
        if len(contour) < 12:
            continue
        array = np.asarray([(point.x, point.y) for point in contour], dtype=np.float64)
        components.append({
            "points": array,
            "closed": bool(closed and all(len(neighbors[key]) == 2 for key in component)),
            "centroid": array.mean(axis=0),
        })
    return components


def bounded_polyline_runs(
    points: np.ndarray,
    minimum_x: float,
    maximum_x: float,
    *,
    minimum_points: int = 12,
) -> list[np.ndarray]:
    """Return ordered PLY path runs inside the WEAR torso landmark bounds.

    A chest plane can connect a valid torso arc to an A-pose arm. Rejecting the
    entire connected component throws away the torso. Cropping the ordered
    intersection path at the axilla bounds preserves only real in-bound PLY
    segments and prevents the arm from becoming an A-B endpoint.
    """
    inside = (points[:, 0] >= minimum_x) & (points[:, 0] <= maximum_x)
    if not np.any(inside):
        return []
    runs: list[np.ndarray] = []
    start = None
    for index, keep in enumerate(inside):
        if keep and start is None:
            start = index
        elif not keep and start is not None:
            if index - start >= minimum_points:
                runs.append(points[start:index])
            start = None
    if start is not None and len(points) - start >= minimum_points:
        runs.append(points[start:])
    return runs


def certified_central_torso_arc_ring(
    components: list[dict[str, Any]],
    left_bound: float,
    right_bound: float,
) -> tuple[np.ndarray | None, dict[str, Any]]:
    """Find the real WEAR-LND-bounded anterior/posterior torso arcs.

    The returned contour contains only the two observed PLY arcs plus the two
    side gaps needed to order them as one diagnostic loop.  ``certified`` is
    true only when those gaps are small enough to be trusted as a closed-shape
    teacher.  Even when the closure is not certified, the observed arc extrema
    remain useful as separate A-B and C-D targets; callers must not promote the
    diagnostic loop to a 32-point shape teacher.
    """
    arcs = []
    for component in components:
        if component["closed"]:
            continue
        for points in bounded_polyline_runs(
            component["points"],
            left_bound - 0.012,
            right_bound + 0.012,
        ):
            minimum = points.min(axis=0)
            maximum = points.max(axis=0)
            if minimum[0] <= 0.0 <= maximum[0]:
                arcs.append(points)
    evidence: dict[str, Any] = {
        "method": "WEAR-LND-bounded-front-back-arc-stitch",
        "central_arc_count": len(arcs),
        "certified": False,
    }
    if len(arcs) < 2:
        return None, {**evidence, "failures": ["fewer-than-two-central-torso-arcs"]}
    ordered = sorted(arcs, key=lambda points: float(points[:, 1].mean()))
    back, front = ordered[0], ordered[-1]
    if back[0, 0] > back[-1, 0]:
        back = back[::-1]
    if front[0, 0] > front[-1, 0]:
        front = front[::-1]
    back_range = (float(back[:, 0].min()), float(back[:, 0].max()))
    front_range = (float(front[:, 0].min()), float(front[:, 0].max()))
    overlap = max(0.0, min(back_range[1], front_range[1]) - max(back_range[0], front_range[0]))
    union = max(back_range[1], front_range[1]) - min(back_range[0], front_range[0])
    overlap_ratio = overlap / max(union, 1e-9)
    left_bridge_m = float(np.linalg.norm(front[0] - back[0]))
    right_bridge_m = float(np.linalg.norm(back[-1] - front[-1]))
    path_m = (
        float(np.linalg.norm(np.diff(back, axis=0), axis=1).sum())
        + float(np.linalg.norm(np.diff(front, axis=0), axis=1).sum())
    )
    perimeter_m = path_m + left_bridge_m + right_bridge_m
    bridge_ratio = (left_bridge_m + right_bridge_m) / max(perimeter_m, 1e-9)
    depth_separation_m = float(front[:, 1].mean() - back[:, 1].mean())
    contour = np.vstack((back, front[::-1]))
    failures = []
    if overlap_ratio < 0.80:
        failures.append("front-back-lateral-overlap-under-80pct")
    # A 3D scan may have a narrow topology seam, but a large straight bridge
    # is invented geometry. Permit only a tiny acquisition seam here; wider
    # gaps must be recovered from nearby raw PLY points or remain a partial
    # A-B/C-D teacher.
    if max(left_bridge_m, right_bridge_m) > 0.012:
        failures.append("side-seam-bridge-over-12mm")
    if bridge_ratio > 0.03:
        failures.append("side-seam-bridges-over-3pct-perimeter")
    if depth_separation_m < 0.045:
        failures.append("front-back-depth-separation-under-45mm")
    if abs(polygon_area(contour)) < 0.005:
        failures.append("stitched-ring-area-too-small")
    evidence.update({
        "front_back_overlap_ratio": round(overlap_ratio, 6),
        "left_bridge_mm": round(left_bridge_m * 1000.0, 3),
        "right_bridge_mm": round(right_bridge_m * 1000.0, 3),
        "bridge_perimeter_ratio": round(bridge_ratio, 6),
        "depth_separation_mm": round(depth_separation_m * 1000.0, 3),
        "observed_width_mm": round(float(np.ptp(contour[:, 0])) * 1000.0, 3),
        "observed_depth_mm": round(float(np.ptp(contour[:, 1])) * 1000.0, 3),
        "diagnostic_walked_mm": round(perimeter_m * 1000.0, 3),
        "certified": not failures,
        "failures": failures,
    })
    # Return the observed arcs even when the two missing side seams make the
    # closed shape invalid.  A-B/C-D can then remain exact PLY-derived targets
    # while the 32-point shape and walked circumference fail closed.
    return contour, evidence


def certified_single_gap_torso_ring(
    components: list[dict[str, Any]],
    left_bound: float,
    right_bound: float,
) -> tuple[np.ndarray | None, dict[str, Any]]:
    """Close one real torso traversal only across a small scanner seam.

    Some CAESAR PLY scans contain one almost-complete torso component instead
    of separate front/back components.  The component remains source PLY
    geometry; this helper permits only one short missing side seam and never
    uses tape, a hull, or rendered-mask pixels.
    """
    arcs = []
    for component in components:
        if component["closed"]:
            continue
        for points in bounded_polyline_runs(
            component["points"],
            left_bound - 0.012,
            right_bound + 0.012,
        ):
            minimum = points.min(axis=0)
            maximum = points.max(axis=0)
            if minimum[0] <= 0.0 <= maximum[0]:
                arcs.append(points)
    evidence: dict[str, Any] = {
        "method": "WEAR-LND-bounded-single-torso-seam-closure",
        "central_arc_count": len(arcs),
        "certified": False,
    }
    if len(arcs) != 1:
        return None, {**evidence, "failures": ["torso-requires-exactly-one-bounded-open-ring"]}
    arc = arcs[0]
    gap_m = float(np.linalg.norm(arc[0] - arc[-1]))
    path_m = float(np.linalg.norm(np.diff(arc, axis=0), axis=1).sum())
    perimeter_m = path_m + gap_m
    gap_ratio = gap_m / max(perimeter_m, 1e-9)
    span = arc.max(axis=0) - arc.min(axis=0)
    anatomy_width = right_bound - left_bound
    failures = []
    if gap_m > 0.012:
        failures.append("torso-single-seam-gap-over-12mm")
    if gap_ratio > 0.03:
        failures.append("torso-single-seam-over-3pct-perimeter")
    if span[0] < anatomy_width * 0.70:
        failures.append("torso-single-ring-narrower-than-landmark-torso")
    if span[1] < 0.045:
        failures.append("torso-single-ring-depth-under-45mm")
    if abs(polygon_area(arc)) < 0.005:
        failures.append("torso-single-ring-area-too-small")
    evidence.update({
        "closure_gap_mm": round(gap_m * 1000.0, 3),
        "closure_gap_ratio": round(gap_ratio, 6),
        "observed_width_mm": round(float(span[0]) * 1000.0, 3),
        "observed_depth_mm": round(float(span[1]) * 1000.0, 3),
        "diagnostic_walked_mm": round(perimeter_m * 1000.0, 3),
        "certified": not failures,
        "failures": failures,
    })
    return (arc if not failures else None), evidence


def certified_polar_slab_ring(
    cloud: np.ndarray,
    left_bound: float,
    right_bound: float,
    *,
    bins: int = 96,
    minimum_anatomy_width_ratio: float = 0.60,
) -> tuple[np.ndarray | None, dict[str, Any]]:
    """Recover a closed torso ring from dense raw PLY points near one plane.

    A scanner seam can leave the exact triangle intersection open even when
    the surrounding PLY surface contains enough points to prove the body
    boundary.  This reconstruction is tape-blind: it bins the *raw surface
    points* by angle around the anatomical torso centre, keeps the outer
    surface radius in every occupied bin, and permits only tiny interpolated
    angular gaps.  Arms remain excluded by the WEAR-LND torso bounds already
    applied to ``cloud``.
    """
    evidence: dict[str, Any] = {
        "method": "WEAR-LND-bounded-dense-PLY-polar-ring",
        "bin_count": bins,
        "certified": False,
    }
    if len(cloud) < bins * 3 or not np.isfinite(cloud).all():
        return None, {**evidence, "failures": ["insufficient-dense-PLY-slab-points"]}

    center = np.asarray(
        ((left_bound + right_bound) * 0.5, float(np.median(cloud[:, 1]))),
        dtype=np.float64,
    )
    relative = cloud - center[None, :]
    radii = np.linalg.norm(relative, axis=1)
    angles = (np.arctan2(relative[:, 1], relative[:, 0]) + 2.0 * np.pi) % (2.0 * np.pi)
    bin_indices = np.floor(angles / (2.0 * np.pi) * bins).astype(np.int64) % bins
    radial = np.full(bins, np.nan, dtype=np.float64)
    counts = np.zeros(bins, dtype=np.int64)
    for index in range(bins):
        values = radii[bin_indices == index]
        counts[index] = len(values)
        if len(values) >= 3:
            # The 90th percentile follows the outer body surface while
            # resisting isolated scanner spikes.  Tape never enters here.
            radial[index] = float(np.quantile(values, 0.90))

    occupied = np.isfinite(radial)
    occupied_count = int(occupied.sum())
    missing_count = bins - occupied_count
    doubled = np.concatenate((~occupied, ~occupied))
    longest_gap = 0
    current_gap = 0
    for missing in doubled:
        current_gap = current_gap + 1 if missing else 0
        longest_gap = max(longest_gap, current_gap)
    longest_gap = min(longest_gap, bins)
    failures: list[str] = []
    # CAESAR side seams can remove a short run of otherwise well-supported
    # surface samples. Require at least 89% real angular coverage and allow no
    # missing run longer than 6/96 bins (22.5 degrees). The missing points are
    # interpolation inside the same thin PLY slab, never tape-derived.
    if occupied_count / bins < 0.89:
        failures.append("polar-angular-coverage-under-89pct")
    if longest_gap > 6:
        failures.append("polar-missing-arc-over-six-bins")
    if failures:
        return None, {
            **evidence,
            "occupied_bins": occupied_count,
            "missing_bins": missing_count,
            "longest_missing_arc_bins": longest_gap,
            "failures": failures,
        }

    known = np.flatnonzero(occupied)
    missing = np.flatnonzero(~occupied)
    if len(missing):
        extended_x = np.concatenate((known - bins, known, known + bins))
        extended_y = np.tile(radial[known], 3)
        radial[missing] = np.interp(missing, extended_x, extended_y)

    # A three-bin circular median removes isolated PLY spikes without changing
    # the anatomical plane, A-B target, or using the recorded circumference.
    padded = np.concatenate((radial[-1:], radial, radial[:1]))
    smoothed = np.asarray(
        [np.median(padded[index : index + 3]) for index in range(bins)],
        dtype=np.float64,
    )
    relative_change = np.abs(smoothed - radial) / np.maximum(radial, 1e-9)
    changed_over_12pct = float(np.mean(relative_change > 0.12))
    if changed_over_12pct > 0.05:
        failures.append("polar-profile-required-too-much-smoothing")

    theta = (np.arange(bins, dtype=np.float64) + 0.5) / bins * 2.0 * np.pi
    ring = center[None, :] + np.column_stack((np.cos(theta), np.sin(theta))) * smoothed[:, None]
    span = ring.max(axis=0) - ring.min(axis=0)
    anatomy_width = right_bound - left_bound
    if span[0] < anatomy_width * minimum_anatomy_width_ratio:
        failures.append("polar-ring-narrower-than-landmark-torso")
    if ring[:, 0].min() < left_bound - 0.009 or ring[:, 0].max() > right_bound + 0.009:
        failures.append("polar-ring-outside-landmark-torso-bounds")
    if not (0.08 < span[0] < 0.90 and 0.05 < span[1] < 0.80):
        failures.append("polar-ring-span-out-of-human-range")
    if abs(polygon_area(ring)) < 0.005:
        failures.append("polar-ring-area-too-small")

    evidence.update({
        "point_count": int(len(cloud)),
        "occupied_bins": occupied_count,
        "missing_bins": missing_count,
        "longest_missing_arc_bins": longest_gap,
        "bins_changed_over_12pct": round(changed_over_12pct, 6),
        "width_mm": round(float(span[0] * 1000.0), 3),
        "depth_mm": round(float(span[1] * 1000.0), 3),
        "certified": not failures,
        "failures": failures,
    })
    return (ring if not failures else None), evidence


def certified_horizontal_mesh_ray_ring(
    body,
    height_m: float,
    left_bound: float,
    right_bound: float,
    center_y: float,
    *,
    bins: int = 96,
) -> tuple[np.ndarray | None, list[Vector] | None, dict[str, Any]]:
    """Cast from inside the torso to the first real PLY triangle per angle.

    At chest height the full horizontal mesh section can continue into an
    A-pose arm. Cropping that component creates fake open "side" gaps. A ray
    starting inside the torso hits the torso surface before the arm, so this
    separates them without inventing a bridge or using the recorded tape.
    """
    evidence: dict[str, Any] = {
        "method": "WEAR-centered-horizontal-first-PLY-triangle-ray-ring",
        "bin_count": bins,
        "certified": False,
    }
    vertices = [vertex.co + body.location for vertex in body.data.vertices]
    polygons = [tuple(polygon.vertices) for polygon in body.data.polygons]
    bvh = BVHTree.FromPolygons(vertices, polygons, all_triangles=True)
    origin = Vector(((left_bound + right_bound) * 0.5, center_y, height_m))
    hits: list[Vector | None] = []
    distances: list[float | None] = []
    recovered_offsets_mm: list[float] = []
    recovered_angle_jitter_degrees: list[float] = []
    for index in range(bins):
        angle = (index + 0.5) / bins * 2.0 * math.pi
        accepted_location = None
        accepted_distance = None
        accepted_offset_mm = None
        accepted_jitter_degrees = None
        # A triangle seam can miss one exact horizontal ray while the source
        # surface exists immediately above or below it. Search only an 8 mm
        # local band and preserve the real 3D hit instead of drawing a chord.
        angular_step = 2.0 * math.pi / bins
        searches = [
            (0.0, 0.0),
            *((0.0, jitter) for jitter in (
                angular_step * 0.18,
                -angular_step * 0.18,
                angular_step * 0.36,
                -angular_step * 0.36,
            )),
            *((offset, 0.0) for offset in (0.001, -0.001, 0.0025, -0.0025, 0.005, -0.005, 0.008, -0.008)),
            *((offset, 0.0) for offset in (0.012, -0.012, 0.016, -0.016, 0.020, -0.020)),
        ]
        for offset_m, angle_jitter in searches:
            ray_origin = Vector((origin.x, origin.y, height_m + offset_m))
            ray_angle = angle + angle_jitter
            direction = Vector((math.cos(ray_angle), math.sin(ray_angle), 0.0))
            result = bvh.ray_cast(ray_origin, direction, 0.60)
            location = result[0] if result is not None else None
            distance = result[3] if result is not None else None
            if (
                location is not None
                and distance is not None
                and 0.025 <= float(distance) <= 0.45
                and left_bound - 0.015 <= float(location.x) <= right_bound + 0.015
                and abs(float(location.z) - (height_m + offset_m)) <= 0.001
            ):
                accepted_location = Vector(location)
                accepted_distance = float(distance)
                accepted_offset_mm = offset_m * 1000.0
                accepted_jitter_degrees = math.degrees(angle_jitter)
                break
        hits.append(accepted_location)
        distances.append(accepted_distance)
        if accepted_offset_mm is not None:
            recovered_offsets_mm.append(accepted_offset_mm)
            recovered_angle_jitter_degrees.append(float(accepted_jitter_degrees or 0.0))

    occupied = np.asarray([point is not None for point in hits], dtype=bool)
    occupied_count = int(occupied.sum())
    doubled = np.concatenate((~occupied, ~occupied))
    longest_gap = 0
    current_gap = 0
    for missing in doubled:
        current_gap = current_gap + 1 if missing else 0
        longest_gap = max(longest_gap, current_gap)
    longest_gap = min(longest_gap, bins)
    failures: list[str] = []
    if occupied_count / bins < 0.94:
        failures.append("horizontal-ray-coverage-under-94pct")
    if longest_gap > 3:
        failures.append("horizontal-ray-gap-over-three-bins")
    if failures:
        return None, None, {
            **evidence,
            "occupied_bins": occupied_count,
            "missing_bins": bins - occupied_count,
            "longest_missing_arc_bins": longest_gap,
            "failures": failures,
        }

    # Missing rays are permitted only in a tiny run. Interpolate an initial
    # query point between the surrounding real hits, then project it to the
    # nearest original triangle. The later attachment gate validates all
    # points and all connecting segments before certification.
    known = np.flatnonzero(occupied)
    missing = np.flatnonzero(~occupied)
    if len(missing):
        known_angles = (known + 0.5) / bins * 2.0 * math.pi
        known_points = np.asarray([[hits[index].x, hits[index].y] for index in known], dtype=np.float64)
        extended_angles = np.concatenate((known_angles - 2.0 * math.pi, known_angles, known_angles + 2.0 * math.pi))
        for index in missing:
            angle = (index + 0.5) / bins * 2.0 * math.pi
            x = float(np.interp(angle, extended_angles, np.tile(known_points[:, 0], 3)))
            y = float(np.interp(angle, extended_angles, np.tile(known_points[:, 1], 3)))
            nearest = bvh.find_nearest(Vector((x, y, height_m)))
            if nearest is None or float(nearest[3]) > 0.020:
                failures.append("missing-horizontal-ray-could-not-snap-to-PLY")
                break
            hits[index] = Vector(nearest[0])
            distances[index] = float((hits[index] - origin).length)
    if failures or any(point is None for point in hits):
        return None, None, {**evidence, "failures": failures or ["incomplete-horizontal-ray-ring"]}

    world = [Vector(point) for point in hits if point is not None]
    ring = np.asarray([[point.x, point.y] for point in world], dtype=np.float64)
    span = np.ptp(ring, axis=0)
    anatomy_width = right_bound - left_bound
    radial_distances = [value * 1000.0 for value in distances if value is not None]
    if span[0] < anatomy_width * 0.60:
        failures.append("horizontal-ray-ring-narrower-than-landmark-torso")
    if ring[:, 0].min() < left_bound - 0.015 or ring[:, 0].max() > right_bound + 0.015:
        failures.append("horizontal-ray-ring-outside-landmark-torso-bounds")
    if not (0.08 < span[0] < 0.90 and 0.05 < span[1] < 0.80):
        failures.append("horizontal-ray-ring-span-out-of-human-range")
    if abs(polygon_area(ring)) < 0.005:
        failures.append("horizontal-ray-ring-area-too-small")
    evidence.update({
        "origin_mm": [round(float(value) * 1000.0, 3) for value in origin],
        "exact_height_and_angle_bins": int(sum(
            abs(offset) < 1e-9 and abs(jitter) < 1e-9
            for offset, jitter in zip(recovered_offsets_mm, recovered_angle_jitter_degrees)
        )),
        "offset_recovered_bins": int(sum(abs(value) >= 1e-9 for value in recovered_offsets_mm)),
        "angular_jitter_recovered_bins": int(sum(
            abs(value) >= 1e-9 for value in recovered_angle_jitter_degrees
        )),
        "maximum_height_recovery_offset_mm": round(
            max((abs(value) for value in recovered_offsets_mm), default=0.0),
            3,
        ),
        "maximum_angular_recovery_degrees": round(
            max((abs(value) for value in recovered_angle_jitter_degrees), default=0.0),
            3,
        ),
        "occupied_bins": occupied_count,
        "missing_bins": bins - occupied_count,
        "longest_missing_arc_bins": longest_gap,
        "minimum_radius_mm": round(min(radial_distances, default=0.0), 3),
        "maximum_radius_mm": round(max(radial_distances, default=0.0), 3),
        "width_mm": round(float(span[0]) * 1000.0, 3),
        "depth_mm": round(float(span[1]) * 1000.0, 3),
        "certified": not failures,
        "failures": failures,
    })
    return (ring if not failures else None), (world if not failures else None), evidence


def certified_neck_side_arc_ring(
    components: list[dict[str, Any]],
    minimum_u: float,
    maximum_u: float,
) -> tuple[np.ndarray | None, dict[str, Any]]:
    """Join the two small PLY seam arcs of the tilted neck-base plane.

    Unlike torso scans, the scanner seam commonly splits a neck section into
    left and right arcs.  Both arcs and both tiny closure bridges must pass
    strict geometric checks; no convex hull or tape value creates the ring.
    """
    arcs = [
        component["points"]
        for component in components
        if not component["closed"]
        and float(component["points"][:, 0].min()) >= minimum_u - 0.012
        and float(component["points"][:, 0].max()) <= maximum_u + 0.012
    ]
    evidence: dict[str, Any] = {
        "method": "WEAR-LND-bounded-left-right-neck-arc-stitch",
        "central_arc_count": len(arcs),
        "certified": False,
    }
    if len(arcs) != 2:
        return None, {**evidence, "failures": ["neck-requires-exactly-two-bounded-side-arcs"]}
    left, right = sorted(arcs, key=lambda points: float(points[:, 0].mean()))
    if left[0, 1] > left[-1, 1]:
        left = left[::-1]
    if right[0, 1] > right[-1, 1]:
        right = right[::-1]
    left_range = (float(left[:, 1].min()), float(left[:, 1].max()))
    right_range = (float(right[:, 1].min()), float(right[:, 1].max()))
    overlap = max(0.0, min(left_range[1], right_range[1]) - max(left_range[0], right_range[0]))
    union = max(left_range[1], right_range[1]) - min(left_range[0], right_range[0])
    overlap_ratio = overlap / max(union, 1e-9)
    back_bridge_m = float(np.linalg.norm(right[0] - left[0]))
    front_bridge_m = float(np.linalg.norm(left[-1] - right[-1]))
    path_m = (
        float(np.linalg.norm(np.diff(left, axis=0), axis=1).sum())
        + float(np.linalg.norm(np.diff(right, axis=0), axis=1).sum())
    )
    perimeter_m = path_m + back_bridge_m + front_bridge_m
    bridge_ratio = (back_bridge_m + front_bridge_m) / max(perimeter_m, 1e-9)
    lateral_separation_m = float(right[:, 0].mean() - left[:, 0].mean())
    contour = np.vstack((left, right[::-1]))
    failures = []
    if overlap_ratio < 0.80:
        failures.append("left-right-depth-overlap-under-80pct")
    if max(back_bridge_m, front_bridge_m) > 0.040:
        failures.append("neck-seam-bridge-over-40mm")
    if bridge_ratio > 0.08:
        failures.append("neck-seam-bridges-over-8pct-perimeter")
    if lateral_separation_m < 0.045:
        failures.append("left-right-lateral-separation-under-45mm")
    if abs(polygon_area(contour)) < 0.005:
        failures.append("stitched-neck-ring-area-too-small")
    evidence.update({
        "left_right_depth_overlap_ratio": round(overlap_ratio, 6),
        "back_bridge_mm": round(back_bridge_m * 1000.0, 3),
        "front_bridge_mm": round(front_bridge_m * 1000.0, 3),
        "bridge_perimeter_ratio": round(bridge_ratio, 6),
        "lateral_separation_mm": round(lateral_separation_m * 1000.0, 3),
        "certified": not failures,
        "failures": failures,
    })
    return (contour if not failures else None), evidence


def certified_neck_single_gap_ring(
    components: list[dict[str, Any]],
    minimum_u: float,
    maximum_u: float,
) -> tuple[np.ndarray | None, dict[str, Any]]:
    """Close one bounded neck arc only when its scanner seam is tiny."""
    arcs = [
        component["points"]
        for component in components
        if not component["closed"]
        and float(component["points"][:, 0].min()) >= minimum_u - 0.012
        and float(component["points"][:, 0].max()) <= maximum_u + 0.012
    ]
    evidence: dict[str, Any] = {
        "method": "WEAR-LND-bounded-single-neck-seam-closure",
        "central_arc_count": len(arcs),
        "certified": False,
    }
    if len(arcs) != 1:
        return None, {**evidence, "failures": ["neck-requires-exactly-one-bounded-open-ring"]}
    arc = arcs[0]
    gap_m = float(np.linalg.norm(arc[0] - arc[-1]))
    path_m = float(np.linalg.norm(np.diff(arc, axis=0), axis=1).sum())
    perimeter_m = path_m + gap_m
    gap_ratio = gap_m / max(perimeter_m, 1e-9)
    span = arc.max(axis=0) - arc.min(axis=0)
    failures = []
    if gap_m > 0.020:
        failures.append("neck-single-seam-gap-over-20mm")
    if gap_ratio > 0.05:
        failures.append("neck-single-seam-over-5pct-perimeter")
    if span[0] < 0.080 or span[1] < 0.050:
        failures.append("neck-single-ring-span-too-small")
    if abs(polygon_area(arc)) < 0.005:
        failures.append("neck-single-ring-area-too-small")
    evidence.update({
        "closure_gap_mm": round(gap_m * 1000.0, 3),
        "closure_gap_ratio": round(gap_ratio, 6),
        "certified": not failures,
        "failures": failures,
    })
    return (arc if not failures else None), evidence


def resample_closed_path_3d(points: np.ndarray, count: int) -> np.ndarray:
    """Resample an already closed mesh-edge path without flattening its slope."""
    closed = np.vstack((points, points[0]))
    segment_lengths = np.linalg.norm(np.diff(closed, axis=0), axis=1)
    perimeter = float(segment_lengths.sum())
    if perimeter <= 1e-8:
        raise ValueError("Degenerate 3D surface path")
    cumulative = np.concatenate(([0.0], np.cumsum(segment_lengths)))
    samples = np.linspace(0.0, perimeter, count, endpoint=False)
    result = []
    for distance in samples:
        segment = min(int(np.searchsorted(cumulative, distance, side="right") - 1), len(points) - 1)
        length = segment_lengths[segment]
        ratio = 0.0 if length <= 1e-9 else (distance - cumulative[segment]) / length
        result.append(closed[segment] + ratio * (closed[segment + 1] - closed[segment]))
    return np.asarray(result, dtype=np.float64)


def certified_neck_surface_chain(
    body,
    landmarks: dict[str, Vector],
) -> dict[str, Any] | None:
    """Walk the non-planar WEAR neck-base protocol on real PLY mesh edges.

    The neck-base tape path is a sloped surface chain through Suprasternale,
    both Clavicales, and Cervicale.  A single planar cut is therefore only a
    convenient first choice; it is not guaranteed to intersect a closed neck
    loop.  This fallback never creates a hull or uses tape.  It snaps the four
    WEAR LND anchors to the source mesh and joins them with constrained mesh
    edge geodesics, then certifies the resulting closed surface path.
    """
    names = ("Suprasternale", "Rt. Clavicale", "Cervicale", "Lt. Clavicale")
    anchors = [landmarks.get(name) for name in names]
    if any(point is None for point in anchors):
        return None
    anchor_array = np.asarray([tuple(point) for point in anchors], dtype=np.float64)
    vertices = np.asarray(
        [tuple(vertex.co + body.location) for vertex in body.data.vertices],
        dtype=np.float64,
    )
    waypoint_indices = [
        int(np.argmin(np.linalg.norm(vertices - point[None, :], axis=1)))
        for point in anchor_array
    ]
    snap_distances = np.asarray(
        [np.linalg.norm(vertices[index] - point) for index, point in zip(waypoint_indices, anchor_array)],
        dtype=np.float64,
    )

    right = anchor_array[1]
    cervicale = anchor_array[2]
    left = anchor_array[3]
    suprasternale = anchor_array[0]
    minimum = np.minimum.reduce((right, left, cervicale, suprasternale))
    maximum = np.maximum.reduce((right, left, cervicale, suprasternale))
    allowed = (
        (vertices[:, 0] >= minimum[0] - 0.070)
        & (vertices[:, 0] <= maximum[0] + 0.070)
        & (vertices[:, 1] >= minimum[1] - 0.060)
        & (vertices[:, 1] <= maximum[1] + 0.060)
        & (vertices[:, 2] >= minimum[2] - 0.035)
        & (vertices[:, 2] <= maximum[2] + 0.035)
    )
    allowed[waypoint_indices] = True
    neighbors: list[dict[int, float]] = [dict() for _ in range(len(vertices))]
    for polygon in body.data.polygons:
        indices = list(polygon.vertices)
        for edge_index, first in enumerate(indices):
            second = indices[(edge_index + 1) % len(indices)]
            if not (allowed[first] and allowed[second]):
                continue
            weight = float(np.linalg.norm(vertices[first] - vertices[second]))
            old = neighbors[first].get(second)
            if old is None or weight < old:
                neighbors[first][second] = weight
                neighbors[second][first] = weight

    def shortest_path(start: int, target: int) -> list[int] | None:
        queue = [(0.0, start)]
        distances = {start: 0.0}
        previous: dict[int, int] = {}
        while queue:
            distance, current = heapq.heappop(queue)
            if current == target:
                break
            if distance != distances.get(current):
                continue
            for neighbor, weight in neighbors[current].items():
                candidate = distance + weight
                if candidate < distances.get(neighbor, math.inf):
                    distances[neighbor] = candidate
                    previous[neighbor] = current
                    heapq.heappush(queue, (candidate, neighbor))
        if target not in distances:
            return None
        path = [target]
        while path[-1] != start:
            path.append(previous[path[-1]])
        path.reverse()
        return path

    walked_indices: list[int] = []
    segment_lengths: list[float] = []
    segment_stretch: list[float] = []
    for start, target in zip(waypoint_indices, waypoint_indices[1:] + waypoint_indices[:1]):
        segment = shortest_path(start, target)
        if not segment:
            return None
        segment_points = vertices[segment]
        length = float(np.linalg.norm(np.diff(segment_points, axis=0), axis=1).sum())
        direct = float(np.linalg.norm(vertices[start] - vertices[target]))
        segment_lengths.append(length)
        segment_stretch.append(length / max(direct, 1e-9))
        walked_indices.extend(segment[:-1])
    if len(walked_indices) < CONTOUR_POINTS:
        return None
    walked = vertices[walked_indices]
    planar = walked[:, :2]
    candidate = contour_candidate(
        planar,
        "raw-WEAR-neck-base-landmark-mesh-edge-surface-chain",
        True,
    )
    if candidate is None:
        return None
    closed_3d = np.vstack((walked, walked[0]))
    walked_m = float(np.linalg.norm(np.diff(closed_3d, axis=0), axis=1).sum())
    duplicate_fraction = 1.0 - len(set(walked_indices)) / max(len(walked_indices), 1)
    failures = []
    if float(snap_distances.max()) > 0.020:
        failures.append("neck-landmark-to-PLY-snap-over-20mm")
    if max(segment_stretch) > 2.75:
        failures.append("neck-surface-segment-detour-over-2.75x")
    if duplicate_fraction > 0.05:
        failures.append("neck-surface-chain-overlaps-itself")
    if not 0.25 < walked_m < 0.75:
        failures.append("neck-surface-chain-length-out-of-human-range")
    if walked[:, 2].min() < minimum[2] - 0.035 or walked[:, 2].max() > maximum[2] + 0.035:
        failures.append("neck-surface-chain-left-landmark-height-band")
    if failures:
        return None

    contour = candidate["points"]
    contour_minimum = contour.min(axis=0)
    contour_maximum = contour.max(axis=0)
    center = (contour_minimum + contour_maximum) / 2.0
    width_m, depth_m = contour_maximum - contour_minimum
    sampled_3d = resample_closed_path_3d(walked, CONTOUR_POINTS)
    center_world = Vector((float(center[0]), float(center[1]), float(np.median(walked[:, 2]))))
    return {
        "height_m": float(center_world.z),
        "center_x_m": float(center[0]),
        "center_y_m": float(center[1]),
        "center_world": center_world,
        "contour_world_points": [Vector(tuple(point)) for point in walked],
        "surface_path_points_mm": [
            [round(float(value * 1000.0), 3) for value in point]
            for point in sampled_3d
        ],
        "width_mm": float(width_m * 1000.0),
        "depth_mm": float(depth_m * 1000.0),
        "contour_depth_mm": float(depth_m * 1000.0),
        "normalized_contour": np.column_stack((
            (contour[:, 0] - center[0]) / (width_m / 2.0),
            (contour[:, 1] - center[1]) / (depth_m / 2.0),
        )),
        "raw_slice_closed": True,
        "certified_section": True,
        "stitch_evidence": {
            "method": "four-WEAR-LND-anchor-constrained-PLY-mesh-edge-geodesic",
            "path_landmarks": list(names),
            "landmark_snap_mm": [round(float(value * 1000.0), 3) for value in snap_distances],
            "segment_lengths_mm": [round(value * 1000.0, 3) for value in segment_lengths],
            "segment_stretch": [round(value, 6) for value in segment_stretch],
            "walked_3d_mm": round(walked_m * 1000.0, 3),
            "duplicate_vertex_fraction": round(duplicate_fraction, 6),
            "certified": True,
            "failures": [],
        },
        "reconstructed": False,
        "contour_source": "raw-WEAR-neck-base-landmark-mesh-edge-surface-chain",
        "geometry_protocol": "sloped-WEAR-neck-base-landmark-path-on-source-PLY-surface",
        "closure_gap_mm": float(np.linalg.norm(walked[-1] - walked[0]) * 1000.0),
        "closure_ratio": float(np.linalg.norm(walked[-1] - walked[0]) / max(walked_m, 1e-9)),
        "slab_mm": 0.0,
        "geometry_target_valid": True,
        "edge_target_valid": True,
        "depth_target_valid": True,
        "shape_target_valid": True,
        # The path is non-planar. The current connected-circumference head
        # walks a 2D section, so tape must remain masked until it predicts Z.
        "tape_target_valid": False,
        "tape_target_rejection_reason": "nonplanar-neck-surface-path-requires-3D-path-circumference-head",
        "surface_path_nonplanar": True,
        "plane_origin_mm": [round(float(value * 1000.0), 3) for value in center_world],
        "plane_normal": None,
    }


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
    # WEAR's neck-base protocol is a sloped four-landmark surface path, not a
    # horizontal or tilted planar slice. Prefer that exact source-mesh path;
    # retain the planar logic below only as a diagnostic fallback when a scan
    # cannot support the landmark-constrained geodesic.
    surface_chain = certified_neck_surface_chain(body, landmarks)
    if surface_chain is not None:
        return surface_chain
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
    components = mesh_plane_section_components(body, origin, normal, basis_u, basis_v)
    # Components below live in the tilted plane's (basis_u, basis_v)
    # coordinates.  World-X torso bounds are not comparable here and used to
    # reject real neck loops.  Build the lateral bounds from the same WEAR
    # clavicale landmarks after projecting them into this exact plane.
    clavicale_u = [float((point - origin).dot(basis_u)) for point in (right, left)]
    left_bound = min(clavicale_u) - 0.060
    right_bound = max(clavicale_u) + 0.060
    component_diagnostics = [
        {
            "closed": bool(component["closed"]),
            "minimum_u_mm": round(float(component["points"][:, 0].min()) * 1000.0, 3),
            "maximum_u_mm": round(float(component["points"][:, 0].max()) * 1000.0, 3),
            "minimum_v_mm": round(float(component["points"][:, 1].min()) * 1000.0, 3),
            "maximum_v_mm": round(float(component["points"][:, 1].max()) * 1000.0, 3),
            "centroid_u_mm": round(float(component["points"][:, 0].mean()) * 1000.0, 3),
            "centroid_v_mm": round(float(component["points"][:, 1].mean()) * 1000.0, 3),
            "point_count": int(len(component["points"])),
        }
        for component in components
    ]
    central_components = []
    for component in components:
        points = component["points"]
        minimum = points.min(axis=0)
        maximum = points.max(axis=0)
        if (
            maximum[0] - minimum[0] >= 0.06
            and minimum[0] >= left_bound - 0.012
            and maximum[0] <= right_bound + 0.012
        ):
            central_components.append(component)
    selected = max(
        central_components,
        key=lambda component: (
            (100.0 if component["closed"] and polygon_area(component["points"]) != 0.0 else 0.0)
            + component["area"] * 1000.0
            - float(np.linalg.norm(component["centroid"])) * 5.0
        ),
        default=None,
    )
    raw_closed = bool(selected and selected["closed"])
    candidate = None
    raw_candidate_accepted = False
    stitch_evidence = None
    if selected is not None and raw_closed:
        candidate = contour_candidate(
            selected["points"],
            "raw-WEAR-tilted-neck-plane-closed-loop",
            True,
        )
        raw_candidate_accepted = candidate is not None

    if candidate is None:
        stitched, stitch_evidence = certified_neck_side_arc_ring(
            components,
            left_bound,
            right_bound,
        )
        if stitched is None:
            stitched, stitch_evidence = certified_neck_single_gap_ring(
                components,
                left_bound,
                right_bound,
            )
        stitch_evidence.update({
            "plane_component_count": len(components),
            "plane_component_diagnostics": component_diagnostics,
            "lateral_bounds_mm": [round(left_bound * 1000.0, 3), round(right_bound * 1000.0, 3)],
        })
        if stitched is not None:
            candidate = contour_candidate(
                stitched,
                "certified-WEAR-LND-bounded-tilted-neck-arc-ring",
                True,
            )
            if candidate is not None:
                candidate["reconstructed"] = True
                candidate["certified_stitch"] = True

    if candidate is None:
        selected_cloud = None
        used_slab = None
        slab_clouds: list[tuple[float, np.ndarray]] = []
        relative = body_points - np.asarray(origin)[None, :]
        distances = relative @ np.asarray(normal)
        plane_u = relative @ np.asarray(basis_u)
        plane_v = relative @ np.asarray(basis_v)
        half_width = max(0.075, (left - right).length * 0.70)
        for slab in (0.003, 0.005, 0.008, 0.012):
            keep = (np.abs(distances) <= slab) & (np.abs(plane_u) <= half_width)
            cloud = np.column_stack((plane_u[keep], plane_v[keep]))
            if len(cloud) >= 80:
                low_v, high_v = np.quantile(cloud[:, 1], [0.005, 0.995])
                cloud = cloud[(cloud[:, 1] >= low_v) & (cloud[:, 1] <= high_v)]
                slab_clouds.append((slab, cloud))
                if selected_cloud is None:
                    selected_cloud = cloud
                    used_slab = slab
        if selected_cloud is None:
            return None
        polar_attempts = []
        for slab, cloud in slab_clouds:
            ring, polar_evidence = certified_polar_slab_ring(
                cloud,
                left_bound,
                right_bound,
                minimum_anatomy_width_ratio=0.45,
            )
            polar_evidence["slab_mm"] = round(slab * 1000.0, 3)
            polar_attempts.append(polar_evidence)
            if ring is None:
                continue
            candidate = contour_candidate(
                ring,
                "certified-WEAR-LND-bounded-tilted-neck-dense-PLY-polar-ring",
                True,
            )
            if candidate is not None:
                candidate["reconstructed"] = True
                candidate["certified_stitch"] = True
                stitch_evidence = polar_evidence
                used_slab = slab
                break
        if candidate is None:
            surface_chain = certified_neck_surface_chain(body, landmarks)
            if surface_chain is not None:
                return surface_chain
            hull = BASE.convex_hull(selected_cloud)
            hull_points = np.asarray([(point.x, point.y) for point in hull], dtype=np.float64)
            candidate = contour_candidate(hull_points, "raw-WEAR-tilted-neck-plane-slab-hull-fallback", True)
        if candidate is None:
            return None
        candidate.setdefault("certified_stitch", False)
        if candidate.get("certified_stitch") is not True and stitch_evidence is not None:
            stitch_evidence["polar_attempts"] = polar_attempts
    else:
        used_slab = 0.0

    contour = candidate["points"]
    minimum = contour.min(axis=0)
    maximum = contour.max(axis=0)
    center = (minimum + maximum) / 2.0
    width_m, depth_m = maximum - minimum
    certified_section = bool(raw_candidate_accepted or candidate.get("certified_stitch") is True)
    tape_training_eligible = bool(certified_section and circumference_mm is not None)
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
        "normalized_contour": normalized,
        "raw_slice_closed": raw_closed,
        "certified_section": certified_section,
        "stitch_evidence": stitch_evidence,
        "reconstructed": candidate["reconstructed"],
        "contour_source": candidate["source"],
        "closure_gap_mm": candidate["closure_gap_mm"],
        "closure_ratio": candidate["closure_ratio"],
        "slab_mm": float((used_slab or 0.0) * 1000.0),
        "geometry_target_valid": certified_section,
        "shape_target_valid": certified_section,
        "tape_target_valid": tape_training_eligible,
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
    debug_label: str | None = None,
) -> dict[str, Any] | None:
    if not 0.05 < height_m < float(body_points[:, 2].max()):
        return None
    raw_section = BASE.mesh_section_contour(body, height_m)
    raw_closed = bool(raw_section and raw_section[1])
    selected_cloud = None
    used_slab = None
    slab_clouds: list[tuple[float, np.ndarray]] = []
    left_bound, right_bound = anatomy_bounds
    for slab in (0.003, 0.005, 0.008, 0.012, 0.018):
        keep = (
            (np.abs(body_points[:, 2] - height_m) <= slab)
            & (body_points[:, 0] >= left_bound - 0.008)
            & (body_points[:, 0] <= right_bound + 0.008)
        )
        cloud = body_points[keep, :2]
        if len(cloud) < 100:
            continue
        low_y, high_y = np.quantile(cloud[:, 1], [0.005, 0.995])
        cloud = cloud[(cloud[:, 1] >= low_y) & (cloud[:, 1] <= high_y)]
        if len(cloud) < 100:
            continue
        slab_clouds.append((slab, cloud))
        if selected_cloud is None:
            selected_cloud = cloud
            used_slab = slab
    if selected_cloud is None:
        return None
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
    raw_candidate_accepted = False
    stitch_evidence = None
    observed_stitched = None
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
        raw_candidate_accepted = candidate is not None and raw_closed
        # An open raw traversal is diagnostic evidence, not a closed body
        # teacher. Force the certified front/back arc path to run instead of
        # silently training on the artificial end-to-end closure.
        if not raw_candidate_accepted:
            candidate = None
    if candidate is None:
        ray_ring, ray_world, ray_evidence = certified_horizontal_mesh_ray_ring(
            body,
            height_m,
            left_bound,
            right_bound,
            float(np.median(selected_cloud[:, 1])),
        )
        if ray_ring is not None and ray_world is not None:
            candidate = contour_candidate(
                ray_ring,
                "raw-WEAR-centered-horizontal-first-PLY-triangle-ray-ring",
                True,
            )
            if candidate is not None:
                candidate["certified_stitch"] = True
                candidate["observed_arc_geometry"] = True
                candidate["surface_world_points"] = ray_world
                stitch_evidence = ray_evidence
    if candidate is None:
        components = horizontal_section_components(body, height_m)
        stitched, stitch_evidence = certified_central_torso_arc_ring(
            components,
            left_bound,
            right_bound,
        )
        if stitched is None or stitch_evidence.get("certified") is not True:
            single_gap, single_gap_evidence = certified_single_gap_torso_ring(
                components,
                left_bound,
                right_bound,
            )
            if single_gap is not None and single_gap_evidence.get("certified") is True:
                stitched = single_gap
                stitch_evidence = single_gap_evidence
            elif stitch_evidence.get("certified") is not True:
                stitch_evidence["single_gap_attempt"] = single_gap_evidence
        stitch_evidence["plane_components"] = [
            {
                "closed": bool(component.get("closed")),
                "point_count": int(len(component["points"])),
                "minimum_x_mm": round(float(component["points"][:, 0].min()) * 1000.0, 3),
                "maximum_x_mm": round(float(component["points"][:, 0].max()) * 1000.0, 3),
                "minimum_depth_mm": round(float(component["points"][:, 1].min()) * 1000.0, 3),
                "maximum_depth_mm": round(float(component["points"][:, 1].max()) * 1000.0, 3),
                "centroid_x_mm": round(float(component["centroid"][0]) * 1000.0, 3),
                "centroid_depth_mm": round(float(component["centroid"][1]) * 1000.0, 3),
            }
            for component in components
        ]
        if stitched is not None:
            observed_stitched = stitched
            if stitch_evidence.get("certified") is True:
                candidate = contour_candidate(
                    stitched,
                    "certified-WEAR-LND-bounded-front-back-arc-ring",
                    True,
                )
                if candidate is not None:
                    candidate["reconstructed"] = True
                    candidate["certified_stitch"] = True
                    candidate["observed_arc_geometry"] = True
    # If the exact triangle plane has a large scanner seam, try a very thin
    # slab of the original PLY surface. This is still tape-blind source
    # geometry: WEAR landmark bounds crop away the arms, at least 89% of the
    # angular bins must contain real PLY points, and no missing run may exceed
    # six of 96 bins. A convex hull remains forbidden.
    if candidate is None:
        polar_attempts = []
        for slab, cloud in slab_clouds:
            polar_ring, polar_evidence = certified_polar_slab_ring(
                cloud,
                left_bound,
                right_bound,
            )
            polar_evidence["slab_mm"] = round(slab * 1000.0, 3)
            polar_attempts.append(polar_evidence)
            if polar_ring is None:
                continue
            candidate = contour_candidate(
                polar_ring,
                "certified-WEAR-LND-bounded-dense-PLY-polar-ring",
                True,
            )
            if candidate is not None:
                candidate["reconstructed"] = True
                candidate["certified_stitch"] = True
                candidate["observed_arc_geometry"] = True
                stitch_evidence = polar_evidence
                break
        if candidate is None and stitch_evidence is not None:
            stitch_evidence["polar_attempts"] = polar_attempts
    if candidate is None and observed_stitched is not None:
        # The front and back PLY arcs independently prove the row height,
        # A-B breadth, and C-D depth even when this extraction has unclosed
        # side gaps too large to certify a loop. This does not claim that the
        # source scan lacks side surfaces. Preserve the observed extrema as
        # partial supervision; never join the gaps or expose a fake loop.
        left_bridge_mm = finite((stitch_evidence or {}).get("left_bridge_mm")) or 0.0
        right_bridge_mm = finite((stitch_evidence or {}).get("right_bridge_mm")) or 0.0
        candidate = {
            "points": observed_stitched,
            "source": "observed-WEAR-LND-bounded-front-back-torso-arcs",
            "closure_gap_mm": max(left_bridge_mm, right_bridge_mm),
            "closure_ratio": finite((stitch_evidence or {}).get("bridge_perimeter_ratio")) or 0.0,
            "reconstructed": False,
            "certified_stitch": False,
            "observed_arc_geometry": True,
        }
    # Never use a slab convex hull as a teacher. It can absorb arm roots and
    # invent unobserved body corners.
    if candidate is None:
        print(
            "[WEAR-TEACHER-BLOCK] "
            + json.dumps(
                {
                    "row": debug_label,
                    "height_mm": round(height_m * 1000.0, 3),
                    "anatomy_bounds_mm": [
                        round(left_bound * 1000.0, 3),
                        round(right_bound * 1000.0, 3),
                    ],
                    "raw_slice_found": raw_section is not None,
                    "raw_slice_closed": raw_closed,
                    "stitch_evidence": stitch_evidence,
                },
                sort_keys=True,
            )
        )
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
    certified_section = bool(raw_candidate_accepted or candidate.get("certified_stitch") is True)
    observed_arc_geometry = candidate.get("observed_arc_geometry") is True
    edge_target_valid = bool(raw_candidate_accepted or observed_arc_geometry)
    depth_target_valid = bool(raw_candidate_accepted or observed_arc_geometry)
    # Tape is the final recorded target. PLY perimeter is intentionally neither
    # calculated nor compared. Its mask is assigned independently later; the
    # geometry flags here describe only what this PLY path can supervise.
    tape_training_eligible = bool(certified_section and circumference_mm is not None)
    surface_points = np.asarray(candidate.get("surface_points", contour), dtype=np.float64)
    surface_world_points = candidate.get("surface_world_points")
    return {
        "height_m": height_m,
        "center_x_m": float(center[0]),
        "center_y_m": float(center[1]),
        "width_mm": float(width_m * 1000.0),
        # C-D must be the depth extent of the exact same certified ring whose
        # normalized 32 points and A-B breadth are exported. A separate robust
        # center-strip depth would break the connected circumference path.
        "depth_mm": float(contour_depth_m * 1000.0),
        "contour_depth_mm": float(contour_depth_m * 1000.0),
        "normalized_contour": normalized,
        "center_world": Vector((float(center[0]), float(center[1]), height_m)),
        "contour_world_points": (
            [Vector(point) for point in surface_world_points]
            if surface_world_points is not None
            else [
                Vector((float(point[0]), float(point[1]), height_m))
                for point in surface_points
            ]
        ),
        "raw_slice_closed": raw_closed,
        "certified_section": certified_section,
        "stitch_evidence": stitch_evidence,
        "reconstructed": candidate["reconstructed"],
        "contour_source": candidate["source"],
        "closure_gap_mm": candidate["closure_gap_mm"],
        "closure_ratio": candidate["closure_ratio"],
        "slab_mm": float(used_slab * 1000.0),
        "geometry_target_valid": certified_section,
        "edge_target_valid": edge_target_valid,
        "depth_target_valid": depth_target_valid,
        "shape_target_valid": certified_section,
        "tape_target_valid": tape_training_eligible,
        "anatomy_bounds_width_mm": float((right_bound - left_bound) * 1000.0),
        "edge_within_anatomy_bounds": bool(
            minimum[0] >= left_bound - 0.012 and maximum[0] <= right_bound + 0.012
        ),
    }


def rounded_contour(points: np.ndarray) -> list[list[float]]:
    return [[round(float(x), 6), round(float(y), 6)] for x, y in points]


def rounded_world_points_mm(points: list[Vector]) -> list[list[float]]:
    return [
        [round(float(value) * 1000.0, 3) for value in point]
        for point in points
    ]


def apply_surface_attachment_gate(body, geometry_rows: dict[str, dict[str, Any]]) -> None:
    """Require the complete displayed contour to remain on the original PLY.

    Dense polar recovery is built from a thin slab of raw PLY points. Its
    compact polar path can still contain short chords inside a curved body.
    When that happens, project a densely sampled version of the tape-blind path
    back to the nearest original triangles, then validate the *segments* as
    well as their vertices. This creates a surface-following teacher; it never
    uses or tries to match the recorded tape circumference.
    """
    vertices = [vertex.co + body.location for vertex in body.data.vertices]
    polygons = [tuple(polygon.vertices) for polygon in body.data.polygons]
    bvh = BVHTree.FromPolygons(vertices, polygons, all_triangles=True)
    mesh_neighbors: list[dict[int, float]] = [dict() for _ in vertices]
    for polygon in polygons:
        for index, first in enumerate(polygon):
            second = polygon[(index + 1) % len(polygon)]
            distance = float((vertices[second] - vertices[first]).length)
            old = mesh_neighbors[first].get(second)
            if old is None or distance < old:
                mesh_neighbors[first][second] = distance
                mesh_neighbors[second][first] = distance

    def densify(points: list[Vector], maximum_step_m: float) -> list[Vector]:
        dense: list[Vector] = []
        for first, second in zip(points, points[1:] + points[:1]):
            distance = float((second - first).length)
            steps = max(1, int(math.ceil(distance / maximum_step_m)))
            dense.extend(first.lerp(second, index / steps) for index in range(steps))
        return dense

    def nearest(points: list[Vector]) -> tuple[list[Vector], list[float], list[int]]:
        locations: list[Vector] = []
        distances_mm: list[float] = []
        face_indices: list[int] = []
        for point in points:
            result = bvh.find_nearest(point)
            if result is None:
                continue
            locations.append(Vector(result[0]))
            distances_mm.append(float(result[3]) * 1000.0)
            face_indices.append(int(result[2]))
        return locations, distances_mm, face_indices

    def segment_maximum_distance(first: Vector, second: Vector) -> float:
        samples = densify([first, second], 0.0015)[: max(1, int(math.ceil((second - first).length / 0.0015)))]
        _, distances, _ = nearest(samples)
        return max(distances, default=math.inf)

    def surface_bridge(
        first: Vector,
        first_face: int,
        second: Vector,
        second_face: int,
        geometry: dict[str, Any],
        bounds: tuple[float, float, float, float],
    ) -> list[Vector] | None:
        if not (0 <= first_face < len(polygons) and 0 <= second_face < len(polygons)):
            return None
        start = min(polygons[first_face], key=lambda index: float((vertices[index] - first).length))
        target = min(polygons[second_face], key=lambda index: float((vertices[index] - second).length))
        nominal_z = float(geometry["height_m"])
        minimum_x, maximum_x, minimum_y, maximum_y = bounds

        def allowed(index: int) -> bool:
            point = vertices[index]
            return bool(
                nominal_z - 0.040 <= point.z <= nominal_z + 0.040
                and minimum_x - 0.030 <= point.x <= maximum_x + 0.030
                and minimum_y - 0.030 <= point.y <= maximum_y + 0.030
            )

        queue = [(0.0, start)]
        distances = {start: 0.0}
        previous: dict[int, int] = {}
        while queue:
            distance, current = heapq.heappop(queue)
            if current == target:
                break
            if distance != distances.get(current) or distance > 0.080:
                continue
            for neighbor, edge_length in mesh_neighbors[current].items():
                if neighbor not in (start, target) and not allowed(neighbor):
                    continue
                midpoint_z = (float(vertices[current].z) + float(vertices[neighbor].z)) * 0.5
                vertical_penalty = 1.0 + 2.0 * abs(midpoint_z - nominal_z) / 0.040
                candidate = distance + edge_length * vertical_penalty
                if candidate < distances.get(neighbor, math.inf):
                    distances[neighbor] = candidate
                    previous[neighbor] = current
                    heapq.heappush(queue, (candidate, neighbor))
        if target not in distances:
            return None
        indices = [target]
        while indices[-1] != start:
            indices.append(previous[indices[-1]])
        indices.reverse()
        path = [first, *[vertices[index].copy() for index in indices], second]
        path_length = float(np.linalg.norm(np.diff(np.asarray(path), axis=0), axis=1).sum())
        direct = float((second - first).length)
        if path_length > 0.085 or path_length > max(0.018, direct * 8.0):
            return None
        return path

    def repair_surface_discontinuities(
        snapped: list[Vector],
        faces: list[int],
        geometry: dict[str, Any],
    ) -> tuple[list[Vector], int, int]:
        if len(snapped) < 3 or len(faces) != len(snapped):
            return snapped, 0, 0
        array = np.asarray(snapped, dtype=np.float64)
        bounds = (
            float(array[:, 0].min()),
            float(array[:, 0].max()),
            float(array[:, 1].min()),
            float(array[:, 1].max()),
        )
        repaired: list[Vector] = []
        attempted = 0
        bridged = 0
        for index, first in enumerate(snapped):
            second_index = (index + 1) % len(snapped)
            second = snapped[second_index]
            repaired.append(first)
            if segment_maximum_distance(first, second) <= 3.0:
                continue
            attempted += 1
            bridge = surface_bridge(
                first,
                faces[index],
                second,
                faces[second_index],
                geometry,
                bounds,
            )
            if bridge is not None:
                repaired.extend(bridge[1:-1])
                bridged += 1
        return repaired, attempted, bridged

    def metric(values: list[float], quantile: float, default: float = math.inf) -> float:
        return float(np.quantile(values, quantile)) if values else default

    for geometry in geometry_rows.values():
        points = [Vector(point) for point in (geometry.get("contour_world_points") or [])]
        dense = densify(points, 0.004) if len(points) >= 3 else points
        _, initial_distances_mm, _ = nearest(dense)
        initial_maximum_mm = max(initial_distances_mm, default=math.inf)
        initial_median_mm = metric(initial_distances_mm, 0.5)
        initial_p90_mm = metric(initial_distances_mm, 0.90)
        initial_p95_mm = metric(initial_distances_mm, 0.95)
        tested_points = dense
        distances_mm = initial_distances_mm
        projection_applied = False
        projection_reason = None
        bridge_attempts = 0
        bridges_completed = 0

        initially_attached = bool(
            len(initial_distances_mm) == len(dense)
            and initial_maximum_mm <= 8.0
            and initial_median_mm <= 0.75
            and initial_p95_mm <= 1.5
        )
        if geometry.get("shape_target_valid") is True and not initially_attached and dense:
            snapped, _, snapped_faces = nearest(dense)
            nominal_z = float(geometry["height_m"])
            z_deviation_mm = [abs(float(point.z) - nominal_z) * 1000.0 for point in snapped]
            original_span = np.ptp(np.asarray([[point.x, point.y] for point in dense]), axis=0)
            snapped_xy = np.asarray([[point.x, point.y] for point in snapped], dtype=np.float64)
            snapped_span = np.ptp(snapped_xy, axis=0) if len(snapped_xy) else np.asarray([0.0, 0.0])
            span_drift = np.abs(snapped_span - original_span) / np.maximum(original_span, 1e-9)
            projection_allowed = bool(
                len(snapped) == len(dense)
                and initial_median_mm <= 6.0
                and initial_p90_mm <= 20.0
                and initial_maximum_mm <= 50.0
                and max(z_deviation_mm, default=math.inf) <= 25.0
                and float(span_drift[0]) <= 0.08
                and float(span_drift[1]) <= 0.12
            )
            if projection_allowed:
                snapped, bridge_attempts, bridges_completed = repair_surface_discontinuities(
                    snapped,
                    snapped_faces,
                    geometry,
                )
                # Check short chords between the projected surface points too;
                # testing only endpoints would recreate the original UI bug.
                tested_points = densify(snapped, 0.0015)
                _, distances_mm, _ = nearest(tested_points)
                maximum_mm = max(distances_mm, default=math.inf)
                median_mm = metric(distances_mm, 0.5)
                if (
                    len(distances_mm) == len(tested_points)
                    and maximum_mm <= 3.0
                    and median_mm <= 0.75
                ):
                    compact = resample_closed_contour(snapped_xy, CONTOUR_POINTS)
                    minimum = compact.min(axis=0)
                    maximum = compact.max(axis=0)
                    center = (minimum + maximum) / 2.0
                    width_m, depth_m = maximum - minimum
                    geometry["contour_world_points"] = snapped
                    geometry["normalized_contour"] = np.column_stack((
                        (compact[:, 0] - center[0]) / (width_m / 2.0),
                        (compact[:, 1] - center[1]) / (depth_m / 2.0),
                    ))
                    geometry["center_x_m"] = float(center[0])
                    geometry["center_y_m"] = float(center[1])
                    geometry["center_world"] = Vector((float(center[0]), float(center[1]), nominal_z))
                    geometry["width_mm"] = float(width_m * 1000.0)
                    geometry["depth_mm"] = float(depth_m * 1000.0)
                    geometry["contour_depth_mm"] = float(depth_m * 1000.0)
                    geometry["surface_path_nonplanar"] = (
                        max(z_deviation_mm, default=0.0) > 1.0
                    )
                    projection_applied = True
                    geometry["contour_source"] += "-nearest-original-PLY-surface-path"
                else:
                    projection_reason = "projected-segments-left-original-PLY-surface"
            else:
                projection_reason = "surface-projection-exceeded-shape-or-height-guard"

        maximum_mm = max(distances_mm, default=math.inf)
        median_mm = metric(distances_mm, 0.5)
        attached = bool(
            distances_mm
            and len(distances_mm) == len(tested_points)
            and (
                (projection_applied and maximum_mm <= 3.0 and median_mm <= 0.75)
                or (
                    not projection_applied
                    and maximum_mm <= 8.0
                    and median_mm <= 0.75
                    and metric(distances_mm, 0.95) <= 1.5
                )
            )
        )
        geometry["surface_attachment"] = {
            "tested_points": len(distances_mm),
            "median_distance_mm": round(median_mm, 3) if math.isfinite(median_mm) else None,
            "p95_distance_mm": (
                round(metric(distances_mm, 0.95), 3) if distances_mm else None
            ),
            "maximum_distance_mm": round(maximum_mm, 3) if math.isfinite(maximum_mm) else None,
            "maximum_allowed_mm": 3.0 if projection_applied else 8.0,
            "median_allowed_mm": 0.75,
            "p95_allowed_mm": 1.5,
            "initial_median_distance_mm": (
                round(initial_median_mm, 3) if math.isfinite(initial_median_mm) else None
            ),
            "initial_p90_distance_mm": (
                round(initial_p90_mm, 3) if math.isfinite(initial_p90_mm) else None
            ),
            "initial_p95_distance_mm": (
                round(initial_p95_mm, 3) if math.isfinite(initial_p95_mm) else None
            ),
            "initial_maximum_distance_mm": (
                round(initial_maximum_mm, 3) if math.isfinite(initial_maximum_mm) else None
            ),
            "projection_applied": projection_applied,
            "projection_rejection_reason": projection_reason,
            "surface_bridge_attempts": bridge_attempts,
            "surface_bridges_completed": bridges_completed,
            "certified": attached,
        }
        geometry["surface_attachment_valid"] = attached
        if geometry.get("shape_target_valid") is True and not attached:
            geometry["certified_section"] = False
            geometry["geometry_target_valid"] = False
            geometry["shape_target_valid"] = False
            evidence = geometry.get("stitch_evidence")
            if not isinstance(evidence, dict):
                evidence = {"method": geometry.get("contour_source"), "failures": []}
                geometry["stitch_evidence"] = evidence
            failures = evidence.setdefault("failures", [])
            if "contour-not-attached-to-original-PLY-surface" not in failures:
                failures.append("contour-not-attached-to-original-PLY-surface")
            evidence["certified"] = False


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
    landmark_contract: dict[str, Any],
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
    mesh_dir = output_dir / "mesh-cards"
    mask_dir = output_dir / "masks"
    image_dir.mkdir(parents=True, exist_ok=True)
    mesh_dir.mkdir(parents=True, exist_ok=True)
    mask_dir.mkdir(parents=True, exist_ok=True)
    image_path = image_dir / f"{sample_id}.png"
    mesh_path = mesh_dir / f"{sample_id}.png"
    mask_path = mask_dir / f"{sample_id}.png"

    # The v8 network sees this deterministic Blender projection—not the RGB
    # render. Decimation is render-only and preserves the raw PLY used for all
    # teacher geometry. The outer cyan contour plus internal triangles exposes
    # camera distortion to the model without walls, clothing, or tape pixels.
    mesh_material = BASE.make_material(
        f"MeshCard_{record['subject_id']}_{view.view_id}",
        (0.0, 0.88, 1.0, 1.0),
        emission=True,
    )
    body.data.materials[0] = mesh_material
    polygon_count = max(len(body.data.polygons), 1)
    decimate = body.modifiers.new(name="TeacherMeshDecimate", type="DECIMATE")
    decimate.ratio = min(1.0, 8_000.0 / polygon_count)
    wire = body.modifiers.new(name="TeacherMeshWire", type="WIREFRAME")
    wire.thickness = 0.00065
    wire.use_replace = True
    wire.use_even_offset = True
    scene.world.color = (0.002, 0.006, 0.018)
    scene.render.film_transparent = False
    scene.render.image_settings.color_mode = "RGBA"
    for obj in scene.objects:
        if obj.type == "LIGHT":
            obj.hide_render = True
    scene.render.filepath = str(mesh_path)
    bpy.ops.render.render(write_still=True)
    body.modifiers.remove(wire)
    body.modifiers.remove(decimate)
    body.data.materials[0] = material

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
        # A mask scanline can jump onto an upper arm at chest/under-bust
        # height. Use the projected PLY torso arcs for the learned endpoints,
        # and preserve the mask run only as a separate comparison target.
        edge_left = projected["left_x_norm"]
        edge_right = projected["right_x_norm"]
        edge_source = (
            "projected-WEAR-3D-closed-torso-contour"
            if geometry.get("shape_target_valid") is True
            else "projected-observed-WEAR-PLY-torso-arcs"
        )
        edge_target_valid = bool(
            geometry.get("edge_target_valid", geometry.get("geometry_target_valid", False))
            and geometry.get("edge_within_anatomy_bounds", True)
        )
        depth_target_valid = bool(
            geometry.get("depth_target_valid", geometry.get("geometry_target_valid", False))
        )
        shape_target_valid = geometry.get("shape_target_valid") is True
        teacher_rejections = []
        tape_protocol_allowed, tape_protocol = connected_tape_protocol(row_name)
        if geometry.get("certified_section") is not True:
            teacher_rejections.append("closed-section-not-certified-from-real-PLY-surface")
        if not edge_target_valid:
            teacher_rejections.append("A-B-geometry-invalid")
        if not depth_target_valid:
            teacher_rejections.append("C-D-geometry-invalid")
        if not shape_target_valid:
            teacher_rejections.append("closed-32-point-shape-invalid")
        if geometry.get("edge_within_anatomy_bounds", True) is not True:
            teacher_rejections.append("A-B-outside-WEAR-landmark-bounds")
        geometry_teacher_accepted = not teacher_rejections
        # Recorded tape is an independent direct target. It never certifies
        # PLY geometry, but broken geometry also must not discard valid tape.
        tape_target_valid = geometry.get("measurement_circumference_mm") is not None
        tape_teacher_rejections = (
            [] if tape_target_valid else ["recorded-WEAR-tape-unavailable"]
        )
        world_path_mm = (
            geometry.get("surface_path_points_mm")
            or rounded_world_points_mm(geometry["contour_world_points"])
        )
        rows[row_name] = {
            "accepted": geometry_teacher_accepted,
            "edge_teacher_accepted": edge_target_valid,
            "depth_teacher_accepted": depth_target_valid,
            "shape_teacher_accepted": shape_target_valid,
            "teacher_rejection_reasons": teacher_rejections,
            "geometry_teacher_version": "v8-certified-PLY-ring",
            **projected,
            # A projected open arc can teach visible A-B/C-D extents, but it
            # must never masquerade as a closed 32-point shape. Keep the
            # diagnostic projection under an explicitly non-training field.
            "projected_contour": projected["projected_contour"] if shape_target_valid else [],
            "observed_arc_projection": projected["projected_contour"] if not shape_target_valid else None,
            "wear_edge_left_x_norm": round(edge_left, 6),
            "wear_edge_right_x_norm": round(edge_right, 6),
            "visible_mask_left_x_norm": round(visible_run[0], 6) if visible_run else None,
            "visible_mask_right_x_norm": round(visible_run[1], 6) if visible_run else None,
            "mesh_width_mm": round(geometry["width_mm"], 3),
            "mesh_depth_mm": round(geometry["depth_mm"], 3) if geometry["depth_mm"] is not None else None,
            "mesh_contour_depth_mm": round(geometry["contour_depth_mm"], 3),
            "mesh_depth_ratio": (
                round(geometry["depth_mm"] / geometry["width_mm"], 6)
                if geometry["depth_mm"] is not None
                else None
            ),
            "measurement_circumference_mm": geometry["measurement_circumference_mm"],
            "contour_points_normalized": (
                rounded_contour(geometry["normalized_contour"]) if shape_target_valid else []
            ),
            # These are the original canonical PLY coordinates. The browser
            # proof must draw this path against a GLB built with the exact same
            # transform; it must never recreate a decorative ring at origin.
            "contour_world_points_mm": world_path_mm if shape_target_valid else [],
            "observed_arc_world_points_mm": world_path_mm if not shape_target_valid else None,
            "center_world_mm": [
                round(float(value) * 1000.0, 3)
                for value in geometry["center_world"]
            ],
            "surface_path_points_mm": geometry.get("surface_path_points_mm"),
            "surface_path_nonplanar": geometry.get("surface_path_nonplanar") is True,
            "observed_arc_points_normalized": (
                rounded_contour(geometry["normalized_contour"]) if not shape_target_valid else None
            ),
            "slice_height_mm": round(geometry["height_m"] * 1000.0, 3),
            "nominal_slice_height_mm": geometry.get("nominal_slice_height_mm"),
            "slice_robustness_offset_mm": geometry.get("slice_robustness_offset_mm"),
            "slice_method": geometry["contour_source"],
            "slice_reconstructed": geometry["reconstructed"],
            "closure_gap_mm": round(geometry["closure_gap_mm"], 3),
            "closure_ratio": round(geometry["closure_ratio"], 6),
            "raw_slice_closed": geometry["raw_slice_closed"],
            "certified_section": geometry.get("certified_section", False),
            "stitch_evidence": geometry.get("stitch_evidence"),
            "surface_attachment": geometry.get("surface_attachment"),
            "surface_attachment_valid": geometry.get("surface_attachment_valid") is True,
            "height_method": geometry["height_method"],
            "geometry_target_valid": geometry["geometry_target_valid"],
            "edge_target_valid": edge_target_valid,
            "depth_target_valid": depth_target_valid,
            "shape_target_valid": shape_target_valid,
            "tape_target_valid": tape_target_valid,
            "tape_teacher_rejection_reasons": tape_teacher_rejections,
            "recorded_protocol_exact_geometry_alignment": tape_protocol_allowed,
            "recorded_protocol_alignment_warning": (
                None
                if tape_protocol_allowed
                else f"tape retained independently; geometry protocol differs: {tape_protocol['geometry_status']}"
            ),
            "recorded_protocol_geometry_type": tape_protocol["geometry_type"],
            "recorded_protocol_pose": tape_protocol["pose"],
            "recorded_protocol_manual_page": tape_protocol.get("manual_page"),
            "recorded_protocol_teacher_rule": tape_protocol.get("teacher_rule"),
            "depth_target_source": (
                "same-certified-PLY-ring-C-D-extent"
                if shape_target_valid
                else "observed-WEAR-PLY-front-back-arc-extent"
            ),
            "edge_target_source": edge_source,
            "circumference_target_source": (
                "WEAR-recorded-standing-tape-direct-head-independent-of-PLY-shape"
                if tape_target_valid
                else "recorded-WEAR-tape-unavailable"
            ),
            "measurement_protocol": ROW_PROTOCOLS[row_name]["measurement_path"],
            "mesh_plane_protocol": (
                str(geometry["geometry_protocol"])
                if geometry.get("geometry_protocol")
                else "horizontal-WEAR-preferred-waist-posterior-landmark"
                if geometry["height_method"] == "WEAR_preferred_waist_posterior_landmark"
                else ROW_PROTOCOLS[row_name]["mesh_plane"]
            ),
            "arm_exclusion_method": (
                "WEAR-landmark-bounded-torso-crop" if row_name in {"chest", "underbust"} else "not-applicable"
            ),
            "anatomy_bounds_width_mm": geometry.get("anatomy_bounds_width_mm"),
            "edge_within_anatomy_bounds": geometry.get("edge_within_anatomy_bounds", True),
            "plane_origin_mm": geometry.get("plane_origin_mm"),
            "plane_normal": geometry.get("plane_normal"),
        }

    projected_landmarks = {}
    for name in sorted(CANONICAL_LANDMARKS):
        point = landmarks.get(name)
        projected_landmarks[name] = (
            {**BASE.project(scene, camera, point), "source_available": True}
            if point is not None
            else {"x": None, "y": None, "visible": False, "source_available": False}
        )
    projected_segments = BASE.projected_segments(landmarks, scene, camera)
    camera.select_set(True)
    bpy.data.objects.remove(camera, do_unlink=True)
    return {
        "schema_version": 3,
        "pipeline_id": pipeline_id(),
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
        "landmark_contract": landmark_contract,
        "gender": record["gender"],
        "height_cm": record["height_cm"],
        "weight_kg": record["weight_kg"],
        "bmi": record["bmi"],
        "image": str(image_path if not mask_only else mask_path),
        "mesh_image": str(mesh_path),
        "mask": str(mask_path),
        "mask_cleanup": cleanup,
        "camera": camera_data,
        "rows": rows,
        "masked_rows": masked_rows,
        # Some source scans have a valid body silhouette and recorded tape
        # measurements but no row whose raw PLY section survives the strict
        # geometry gates. Keep those samples for camera, silhouette, tape, and
        # tape-ratio heads while making their lack of 3D supervision explicit.
        # Downstream geometry heads must continue to use per-target masks.
        "teacher_eligibility": {
            "camera": True,
            "silhouette": True,
            "geometry_rows": bool(rows),
            "geometry_row_count": len(rows),
            "all_geometry_rows_masked": not rows and bool(masked_rows),
            "recorded_tape": any(
                payload.get("tape_target_valid") is True
                for payload in masked_rows.values()
            ) or any(
                payload.get("tape_target_valid") is True
                for payload in rows.values()
            ),
        },
        "landmarks_2d": projected_landmarks,
        "segments": projected_segments,
        "measurements_mm": record.get("measurements_mm", {}),
        "extracted_standing_mm": record.get("extracted_standing_mm", {}),
        "render": {
            "view": "deterministic_perspective_multiview",
            "blender_version": bpy.app.version_string,
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
    target_rows: tuple[str, ...] = tuple(ROW_SPECS),
) -> tuple[dict[str, dict[str, Any]], dict[str, dict[str, Any]]]:
    row_sources = {**record.get("measurements_mm", {}), **record.get("extracted_standing_mm", {})}
    rows: dict[str, dict[str, Any]] = {}
    for row_name in target_rows:
        _, circumference_key = ROW_SPECS[row_name]
        circumference = finite(row_sources.get(circumference_key))
        # WEAR defines under-bust as a female tape protocol.  Do not invent a
        # male under-bust target from geometry when the source does not contain
        # that measurement.
        if row_name == "underbust" and circumference is None:
            continue
        if row_name == "neck":
            geometry = neck_contour(body, body_points, landmarks, circumference)
            height_method = (
                "WEAR_neck_base_landmark_surface_chain"
                if geometry is not None and geometry.get("surface_path_nonplanar") is True
                else "WEAR_tilted_neck_base_landmark_plane"
            )
        else:
            height_mm, height_method = row_height_mm(row_name, row_sources, landmarks)
            if height_mm is None and row_name == "hips":
                # Six people have a real hip tape but no recorded height for
                # that tape plane. A large abdomen can make several raw pelvis
                # sections equally plausible, so do not invent a 2D hip row.
                # The tape is retained for audit only. The connected v8
                # trainer must not consume a circumference when this row's
                # edge/depth/shape target is ambiguous.
                geometry = None
                height_method = "source-hip-height-unavailable-row-masked"
            elif height_mm is not None:
                geometry = torso_contour(
                    body,
                    body_points,
                    height_mm / 1000.0,
                    BASE.torso_bounds(landmarks, row_name),
                    circumference,
                    debug_label=f"{record['subject_id']}:{row_name}",
                )
                if (
                    row_name == "underbust"
                    and geometry is not None
                    and geometry.get("certified_section") is not True
                ):
                    # Substernale is WEAR's anatomical proxy, not a recorded
                    # under-bust row height. Search only a 10 mm local band and
                    # choose the closest certified PLY section without tape.
                    # Prefer downward offsets because the protocol is directly
                    # below the breast root. Exact source-height chest/waist/
                    # hip rows are never moved by this robustness rule.
                    nominal_height_mm = float(height_mm)
                    for offset_mm in (-2.0, -4.0, -6.0, -8.0, -10.0, 2.0, 4.0, 6.0, 8.0, 10.0):
                        candidate = torso_contour(
                            body,
                            body_points,
                            (nominal_height_mm + offset_mm) / 1000.0,
                            BASE.torso_bounds(landmarks, row_name),
                            circumference,
                            debug_label=f"{record['subject_id']}:{row_name}:robustness={offset_mm:+.0f}mm",
                        )
                        if candidate is not None and candidate.get("certified_section") is True:
                            geometry = candidate
                            geometry["nominal_slice_height_mm"] = round(nominal_height_mm, 3)
                            geometry["slice_robustness_offset_mm"] = offset_mm
                            height_method = "nearest-certified-PLY-plane-within-10mm-below-WEAR-Substernale"
                            break
            else:
                geometry = None
        if geometry is None:
            continue
        # Geometry and recorded tape are separate teachers. A missing tape must
        # not erase valid PLY geometry, and a broken PLY section must not erase
        # a valid WEAR tape from the direct circumference head.
        geometry["measurement_circumference_mm"] = (
            round(circumference, 3) if circumference is not None else None
        )
        geometry["tape_target_valid"] = circumference is not None
        geometry["height_method"] = height_method
        rows[row_name] = geometry

    # A small number of source records contain anatomically inverted *row
    # heights* even though their independent tape circumference is present. Do
    # not move a line to make the audit pass. Geometry is masked independently;
    # the recorded tape remains a valid direct-head target.
    masked_rows: dict[str, dict[str, Any]] = {}

    def mask_row(row_name: str, reference_name: str, reason: str) -> None:
        geometry = rows.pop(row_name)
        reference = rows[reference_name]
        masked_rows[row_name] = {
            "reason": reason,
            "source_slice_height_mm": round(float(geometry["height_m"]) * 1000.0, 3),
            "reference_row": reference_name,
            "reference_slice_height_mm": round(float(reference["height_m"]) * 1000.0, 3),
            "tape_circumference_preserved_for_training": geometry.get("measurement_circumference_mm") is not None,
            "tape_value_retained_for_audit_only": False,
            "tape_target_valid": geometry.get("measurement_circumference_mm") is not None,
            "measurement_circumference_mm": geometry.get("measurement_circumference_mm"),
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


def render_subject(
    record: dict[str, Any],
    output_dir: Path,
    views_per_subject: int,
    mask_only: bool,
    target_rows: tuple[str, ...],
) -> list[dict[str, Any]]:
    BASE.clean_scene()
    scene = bpy.context.scene
    configure_scene(scene)
    body, transform, offset, height_m = BASE.import_body(record)
    raw_landmarks = BASE.transform_landmarks(record, transform, offset)
    landmarks, landmark_contract = canonicalize_landmarks(raw_landmarks)
    BASE.add_lights(height_m)
    for polygon in body.data.polygons:
        polygon.use_smooth = True
    points = np.empty(len(body.data.vertices) * 3, dtype=np.float64)
    body.data.vertices.foreach_get("co", points)
    body_points = points.reshape((-1, 3)) + np.asarray(body.location)[None, :]
    geometry_rows, masked_rows = prepare_geometry_rows(
        record,
        body,
        body_points,
        landmarks,
        target_rows,
    )
    apply_surface_attachment_gate(body, geometry_rows)
    # Keep an otherwise valid standing person when one body-part row cannot
    # form a stable closed contour.  Every WEAR row that has a recorded tape
    # value must still appear in the audit as either geometry or an explicit
    # masked row; silently omitting a failed row would make the canary look
    # safer than it is. A valid recorded tape remains independently usable by
    # the direct tape head even when the 3D row geometry is unavailable.
    row_sources = {**record.get("measurements_mm", {}), **record.get("extracted_standing_mm", {})}
    applicable_rows = {
        row_name
        for row_name, (_, circumference_key) in ROW_SPECS.items()
        if row_name in target_rows
        if finite(row_sources.get(circumference_key)) is not None
    }
    missing = sorted(applicable_rows - set(geometry_rows) - set(masked_rows))
    for row_name in missing:
        _, circumference_key = ROW_SPECS[row_name]
        masked_rows[row_name] = {
            "reason": "source-PLY-row-not-certifiable-after-landmark-bounded-seam-recovery",
            "tape_circumference_preserved_for_training": finite(row_sources.get(circumference_key)) is not None,
            "tape_value_retained_for_audit_only": False,
            "tape_target_valid": finite(row_sources.get(circumference_key)) is not None,
            "measurement_circumference_mm": finite(row_sources.get(circumference_key)),
        }
    # Do not turn an independently useful source record into a render error
    # merely because every 3D row is masked. The rendered silhouette and
    # camera augmentation remain valid inputs, while recorded tapes and their
    # ratios remain valid direct targets. `teacher_eligibility.geometry_rows`
    # explicitly prevents this sample from supervising width/depth/shape.
    return [
        render_one_view(
            record,
            body,
            height_m,
            geometry_rows,
            masked_rows,
            landmarks,
            landmark_contract,
            scene,
            output_dir,
            view,
            mask_only,
        )
        for view in views_for_subject(record["subject_id"], views_per_subject)
    ]


def main() -> None:
    args = parse_args()
    target_rows = tuple(dict.fromkeys(args.target_row or ROW_SPECS.keys()))
    args.output_dir.mkdir(parents=True, exist_ok=True)
    records = load_manifest(args.manifest, args.limit, args.subject_id)
    manifest_path = args.output_dir / "render-manifest.jsonl"
    with manifest_path.open("w", encoding="utf-8") as handle:
        completed = 0
        for subject_index, source_record in enumerate(records, 1):
            record = apply_mesh_override(source_record, args.mesh_override_dir)
            try:
                rendered = render_subject(
                    record,
                    args.output_dir,
                    args.views_per_subject,
                    args.mask_only,
                    target_rows,
                )
            except Exception as error:
                scan_id = record.get("scan_id", record.get("subject_id"))
                rendered = [
                    {
                        "schema_version": 3,
                        "pipeline_id": pipeline_id(),
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
