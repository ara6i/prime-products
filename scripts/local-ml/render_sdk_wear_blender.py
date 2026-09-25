#!/usr/bin/env python3
"""Build a private Blender scene, PNG, and browser GLB from one real WEAR scan."""

from __future__ import annotations

import argparse
import bmesh
import bpy
import gzip
import importlib.util
import json
import math
import numpy as np
import shutil
import sys
import tempfile
from pathlib import Path

from mathutils import Vector
RENDER_SCHEMA_VERSION = 10
MAX_DISPLAY_SOURCE_FACES = 18_000
CAMERA_CARDS = (
    {"id": "canonical", "yawDeg": 0.0, "pitchDeg": 0.0, "rollDeg": 0.0, "lensMm": 55.0},
    {"id": "yaw-left-12", "yawDeg": -12.0, "pitchDeg": 0.0, "rollDeg": 0.0, "lensMm": 55.0},
    {"id": "yaw-right-12", "yawDeg": 12.0, "pitchDeg": 0.0, "rollDeg": 0.0, "lensMm": 55.0},
    {"id": "pitch-up-6", "yawDeg": 0.0, "pitchDeg": 6.0, "rollDeg": 0.0, "lensMm": 55.0},
    {"id": "roll-right-3", "yawDeg": 0.0, "pitchDeg": 0.0, "rollDeg": 3.0, "lensMm": 55.0},
    {"id": "side-left-90", "yawDeg": -90.0, "pitchDeg": 0.0, "rollDeg": 0.0, "lensMm": 55.0},
    {"id": "side-right-90", "yawDeg": 90.0, "pitchDeg": 0.0, "rollDeg": 0.0, "lensMm": 55.0},
)


def arguments() -> argparse.Namespace:
    raw = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--scan-id", required=True)
    parser.add_argument("--mesh-gz", type=Path, required=True)
    parser.add_argument("--landmarks", type=Path, required=True)
    parser.add_argument("--teacher-record", type=Path, required=True)
    parser.add_argument("--height-cm", type=float, required=True)
    parser.add_argument("--weight-kg", type=float, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument(
        "--render-profile",
        choices=("full", "browser-comparison"),
        default="full",
        help="Use browser-comparison to export the real body and attached curves without slow PNG camera renders.",
    )
    return parser.parse_args(raw)


def load_base_renderer():
    candidates = (
        Path.cwd() / ".local-ml/tools/render_wear3d_pilot.py",
        Path.cwd() / "share/WEAR-V8-PIPELINE-2026-08-26/01_teacher/exact_remote_worker/render_wear3d_pilot.py",
    )
    source = next((candidate for candidate in candidates if candidate.is_file()), None)
    if source is None:
        raise RuntimeError(f"Canonical WEAR renderer is unavailable: {candidates}")
    spec = importlib.util.spec_from_file_location("teacher_proof_base_renderer", source)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not import canonical WEAR renderer: {source}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


BASE = load_base_renderer()


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for collection in (
        bpy.data.meshes,
        bpy.data.curves,
        bpy.data.materials,
        bpy.data.cameras,
        bpy.data.lights,
    ):
        for item in list(collection):
            collection.remove(item)


def parse_landmarks(path: Path) -> dict[str, Vector]:
    landmarks: dict[str, Vector] = {}
    for raw_line in path.read_text(errors="replace").splitlines():
        parts = raw_line.split()
        if len(parts) < 8 or not parts[0].isdigit():
            continue
        try:
            point = Vector((float(parts[4]), float(parts[5]), float(parts[6])))
        except ValueError:
            continue
        landmarks[" ".join(parts[7:])] = point
    return landmarks


def front_yaw(landmarks: dict[str, Vector]) -> float:
    front_points = [landmarks.get("Suprasternale"), landmarks.get("Substernale")]
    back_points = [landmarks.get("Cervicale"), landmarks.get("10th Rib Midspine")]
    front_values = [point for point in front_points if point is not None]
    back_values = [point for point in back_points if point is not None]
    if not front_values or not back_values:
        raise RuntimeError("The verified landmark pair cannot orient this WEAR scan.")
    front = sum(front_values, Vector()) / len(front_values)
    back = sum(back_values, Vector()) / len(back_values)
    direction = front - back
    return -math.pi / 2.0 - math.atan2(direction.y, direction.x)


def world_bounds(obj: bpy.types.Object) -> tuple[Vector, Vector]:
    corners = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    return (
        Vector((min(point.x for point in corners), min(point.y for point in corners), min(point.z for point in corners))),
        Vector((max(point.x for point in corners), max(point.y for point in corners), max(point.z for point in corners))),
    )


def write_flat_projection(body: bpy.types.Object, view: str, output_path: Path) -> dict[str, object]:
    coordinates = np.empty(len(body.data.vertices) * 3, dtype=np.float64)
    body.data.vertices.foreach_get("co", coordinates)
    coordinates = coordinates.reshape((-1, 3))
    source_triangles = np.asarray(
        [list(polygon.vertices) for polygon in body.data.polygons],
        dtype=np.int64,
    )
    if source_triangles.ndim != 2 or source_triangles.shape[1] != 3:
        raise RuntimeError("The source WEAR PLY must already contain triangle faces; no replacement triangulation is allowed.")

    # The browser view uses only faces that already exist in the PLY. We select
    # camera-facing source faces for a responsive wire display, but never create,
    # collapse, stretch, or reconnect geometry.
    face_points = coordinates[source_triangles]
    normals = np.cross(face_points[:, 1] - face_points[:, 0], face_points[:, 2] - face_points[:, 0])
    view_to_camera = np.asarray((0.0, -1.0, 0.0) if view == "front" else (1.0, 0.0, 0.0))
    facing = normals @ view_to_camera
    horizontal_index = 0 if view == "front" else 1
    horizontal_direction = 1.0 if view == "front" else -1.0
    projected_all = coordinates[:, [horizontal_index, 2]].copy() * 100.0
    projected_all[:, 0] *= horizontal_direction
    projected_faces = projected_all[source_triangles]
    projected_twice_area = np.abs(
        (projected_faces[:, 1, 0] - projected_faces[:, 0, 0])
        * (projected_faces[:, 2, 1] - projected_faces[:, 0, 1])
        - (projected_faces[:, 1, 1] - projected_faces[:, 0, 1])
        * (projected_faces[:, 2, 0] - projected_faces[:, 0, 0])
    )
    visible_face_indices = np.flatnonzero((facing > 1e-12) & (projected_twice_area > 1e-8))
    if not len(visible_face_indices):
        raise RuntimeError(f"The real WEAR PLY has no camera-facing source faces for its {view} projection.")
    if len(visible_face_indices) > MAX_DISPLAY_SOURCE_FACES:
        sample_positions = np.linspace(
            0,
            len(visible_face_indices) - 1,
            MAX_DISPLAY_SOURCE_FACES,
            dtype=np.int64,
        )
        display_face_indices = visible_face_indices[sample_positions]
    else:
        display_face_indices = visible_face_indices
    display_source_triangles = source_triangles[display_face_indices]

    # A real mesh silhouette is made of edges whose adjacent source faces turn
    # from camera-facing to back-facing. Export independent edge segments so no
    # false bridge is ever closed across an arm, torso gap, or the floor.
    source_edges = np.concatenate((
        source_triangles[:, [0, 1]],
        source_triangles[:, [1, 2]],
        source_triangles[:, [2, 0]],
    ))
    source_edge_faces = np.tile(np.arange(len(source_triangles), dtype=np.int64), 3)
    source_edges = np.sort(source_edges, axis=1)
    edge_order = np.lexsort((source_edges[:, 1], source_edges[:, 0]))
    sorted_edges = source_edges[edge_order]
    sorted_edge_faces = source_edge_faces[edge_order]
    group_starts = np.r_[0, np.flatnonzero(np.any(np.diff(sorted_edges, axis=0), axis=1)) + 1]
    group_ends = np.r_[group_starts[1:], len(sorted_edges)]
    silhouette_edges: list[np.ndarray] = []
    for start, end in zip(group_starts, group_ends):
        adjacent = sorted_edge_faces[start:end]
        adjacent_facing = facing[adjacent]
        if (
            (len(adjacent) == 1 and adjacent_facing[0] > 1e-12)
            or (adjacent_facing.max(initial=-1.0) > 1e-12 and adjacent_facing.min(initial=1.0) <= 1e-12)
        ):
            silhouette_edges.append(sorted_edges[start])
    silhouette_edge_indices = np.asarray(silhouette_edges, dtype=np.int64).reshape((-1, 2))
    silhouette_segments = [
        [[round(float(value), 5) for value in projected_all[vertex_index]] for vertex_index in edge]
        for edge in silhouette_edge_indices
    ]

    used_vertex_indices = np.unique(display_source_triangles.reshape(-1))
    remap = np.full(len(coordinates), -1, dtype=np.int64)
    remap[used_vertex_indices] = np.arange(len(used_vertex_indices), dtype=np.int64)
    vertices = np.round(projected_all[used_vertex_indices], 5).tolist()
    triangles = remap[display_source_triangles].astype(int).tolist()
    payload = {
        "schemaVersion": "primestyle-wear-blender-2d/v3",
        "scanId": body.get("wear_scan_id"),
        "view": view,
        "units": "centimetres",
        "source": "Orthographic projection of existing camera-facing faces from the real canonical WEAR PLY",
        "generator": {
            "application": "Blender",
            "version": bpy.app.version_string,
            "headless": bool(bpy.app.background),
            "pythonApi": True,
            "operation": f"Canonical {view} orthographic projection of existing source PLY face topology; no new triangulation",
        },
        "verticesCm": vertices,
        "triangles": triangles,
        "outlineCm": [],
        "outlineSegmentsCm": silhouette_segments,
        "stats": {
            "vertexCount": len(vertices),
            "triangleCount": len(triangles),
            "outlinePointCount": 0,
            "silhouetteSegmentCount": len(silhouette_segments),
            "sourcePlyVertexCount": len(body.data.vertices),
            "sourcePlyFaceCount": len(body.data.polygons),
            "cameraFacingSourceFaceCount": len(visible_face_indices),
            "displayedSourceFaceCount": len(triangles),
            "displayFaceSelection": "deterministic subset of existing camera-facing source PLY faces",
        },
    }
    output_path.write_text(json.dumps(payload, separators=(",", ":")) + "\n")
    return payload


def keep_largest_component(body: bpy.types.Object) -> dict[str, int]:
    mesh = body.data
    original_vertices = len(mesh.vertices)
    original_faces = len(mesh.polygons)
    working = bmesh.new()
    working.from_mesh(mesh)
    components: list[set[bmesh.types.BMVert]] = []
    unseen = set(working.verts)
    while unseen:
        seed = unseen.pop()
        component = {seed}
        stack = [seed]
        while stack:
            current = stack.pop()
            for edge in current.link_edges:
                neighbor = edge.other_vert(current)
                if neighbor in unseen:
                    unseen.remove(neighbor)
                    component.add(neighbor)
                    stack.append(neighbor)
        components.append(component)
    if not components:
        working.free()
        raise RuntimeError("The PLY contains no connected mesh.")
    keep = max(components, key=len)
    rejected = [vertex for vertex in working.verts if vertex not in keep]
    if rejected:
        bmesh.ops.delete(working, geom=rejected, context="VERTS")
    working.to_mesh(mesh)
    working.free()
    mesh.update()
    return {
        "removedVertices": original_vertices - len(mesh.vertices),
        "removedFaces": original_faces - len(mesh.polygons),
    }


def body_material() -> bpy.types.Material:
    material = bpy.data.materials.new("WEAR scan material")
    material.use_nodes = True
    shader = material.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = (0.055, 0.58, 0.78, 1.0)
    shader.inputs["Roughness"].default_value = 0.58
    shader.inputs["Metallic"].default_value = 0.03
    if "Coat Weight" in shader.inputs:
        shader.inputs["Coat Weight"].default_value = 0.16
    return material


def simple_material(name: str, color: tuple[float, float, float, float]) -> bpy.types.Material:
    material = bpy.data.materials.new(name)
    material.diffuse_color = color
    material.use_nodes = True
    shader = material.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = color
    shader.inputs["Roughness"].default_value = 0.8
    return material


def line_material(name: str, color: tuple[float, float, float, float]) -> bpy.types.Material:
    material = simple_material(name, color)
    shader = material.node_tree.nodes.get("Principled BSDF")
    if "Emission Color" in shader.inputs:
        shader.inputs["Emission Color"].default_value = color
        shader.inputs["Emission Strength"].default_value = 2.2
    elif "Emission" in shader.inputs:
        shader.inputs["Emission"].default_value = color
        shader.inputs["Emission Strength"].default_value = 2.2
    return material


def _section_segments(body: bpy.types.Object, height_m: float) -> list[tuple[np.ndarray, np.ndarray]]:
    working = bmesh.new()
    working.from_mesh(body.data)
    result = bmesh.ops.bisect_plane(
        working,
        geom=[*working.verts, *working.edges, *working.faces],
        dist=1e-6,
        plane_co=Vector((0.0, 0.0, height_m)),
        plane_no=Vector((0.0, 0.0, 1.0)),
        use_snap_center=False,
        clear_outer=False,
        clear_inner=False,
    )
    cut_edges = [item for item in result.get("geom_cut", ()) if isinstance(item, bmesh.types.BMEdge)]
    segments = [
        (
            np.asarray(edge.verts[0].co, dtype=np.float64),
            np.asarray(edge.verts[1].co, dtype=np.float64),
        )
        for edge in cut_edges
        if len(edge.verts) == 2 and (edge.verts[0].co - edge.verts[1].co).length > 1e-7
    ]
    working.free()
    return segments


def _ordered_section_loops(segments: list[tuple[np.ndarray, np.ndarray]]) -> list[np.ndarray]:
    if not segments:
        return []
    precision = 5
    points_by_key: dict[tuple[float, float, float], list[np.ndarray]] = {}
    adjacency: dict[tuple[float, float, float], set[tuple[float, float, float]]] = {}
    for start, end in segments:
        start_key = tuple(round(float(value), precision) for value in start)
        end_key = tuple(round(float(value), precision) for value in end)
        if start_key == end_key:
            continue
        points_by_key.setdefault(start_key, []).append(start)
        points_by_key.setdefault(end_key, []).append(end)
        adjacency.setdefault(start_key, set()).add(end_key)
        adjacency.setdefault(end_key, set()).add(start_key)
    loops: list[np.ndarray] = []
    remaining = set(adjacency)
    while remaining:
        seed = next(iter(remaining))
        component = {seed}
        stack = [seed]
        while stack:
            current = stack.pop()
            for neighbor in adjacency.get(current, ()):
                if neighbor not in component:
                    component.add(neighbor)
                    stack.append(neighbor)
        remaining.difference_update(component)
        if len(component) < 8:
            continue
        start = min(component)
        ordered = [start]
        previous = None
        current = start
        for _ in range(len(component) + 2):
            choices = [neighbor for neighbor in adjacency.get(current, ()) if neighbor != previous]
            if not choices:
                break
            unvisited = [neighbor for neighbor in choices if neighbor not in ordered]
            next_key = unvisited[0] if unvisited else choices[0]
            if next_key == start:
                break
            ordered.append(next_key)
            previous, current = current, next_key
        if len(ordered) < max(8, int(len(component) * 0.8)):
            continue
        loop = np.asarray([
            np.mean(np.asarray(points_by_key[key], dtype=np.float64), axis=0)
            for key in ordered
        ])
        loops.append(loop)
    return loops


def _closed_length(points: np.ndarray) -> float:
    return float(np.linalg.norm(np.roll(points, -1, axis=0) - points, axis=1).sum())


def _path_between(points: np.ndarray, start: int, end: int, forward: bool) -> np.ndarray:
    size = len(points)
    indices = [start]
    current = start
    step = 1 if forward else -1
    while current != end:
        current = (current + step) % size
        indices.append(current)
        if len(indices) > size + 1:
            raise RuntimeError("Could not split the body cross-section into front and back arcs.")
    return points[indices]


def _open_length(points: np.ndarray) -> float:
    return float(np.linalg.norm(np.diff(points, axis=0), axis=1).sum()) if len(points) > 1 else 0.0


def build_body_section(
    body: bpy.types.Object,
    row_name: str,
    height_m: float,
    color: tuple[float, float, float, float],
) -> tuple[dict[str, object], list[bpy.types.Object]]:
    loops = _ordered_section_loops(_section_segments(body, height_m))
    plausible = [
        loop for loop in loops
        if float(np.ptp(loop[:, 0])) >= 0.12 and float(np.ptp(loop[:, 1])) >= 0.08
    ]
    if not plausible:
        raise RuntimeError(f"No closed torso cross-section was found for {row_name} at {height_m * 100.0:.1f} cm.")
    loop = max(plausible, key=_closed_length)
    a_index = int(np.argmin(loop[:, 0]))
    b_index = int(np.argmax(loop[:, 0]))
    forward_path = _path_between(loop, a_index, b_index, True)
    backward_path = _path_between(loop, a_index, b_index, False)
    # Canonical front faces negative Y (the front camera looks from -Y).
    front_path, back_path = (
        (forward_path, backward_path)
        if float(np.mean(forward_path[:, 1])) <= float(np.mean(backward_path[:, 1]))
        else (backward_path, forward_path)
    )

    curve_data = bpy.data.curves.new(f"{row_name.title()} body intersection", "CURVE")
    curve_data.dimensions = "3D"
    curve_data.resolution_u = 2
    curve_data.bevel_depth = 0.0045
    curve_data.bevel_resolution = 4
    curve_data.materials.append(line_material(f"{row_name.title()} line material", color))
    spline = curve_data.splines.new("POLY")
    spline.points.add(len(loop) - 1)
    for point, coordinate in zip(spline.points, loop):
        point.co = (float(coordinate[0]), float(coordinate[1]), float(coordinate[2]), 1.0)
    spline.use_cyclic_u = True
    curve_object = bpy.data.objects.new(f"{row_name.upper()}_BODY_INTERSECTION", curve_data)
    bpy.context.collection.objects.link(curve_object)

    markers: list[bpy.types.Object] = []
    for label, coordinate in (("A", loop[a_index]), ("B", loop[b_index])):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=20, ring_count=12, radius=0.012, location=coordinate)
        marker = bpy.context.object
        marker.name = f"{row_name.upper()}_{label}"
        marker.data.materials.append(line_material(f"{row_name.title()} {label} material", color))
        marker["point_label"] = label
        marker["row_name"] = row_name
        markers.append(marker)

    straight_width_m = float(loop[b_index, 0] - loop[a_index, 0])
    front_arc_m = _open_length(front_path)
    back_arc_m = _open_length(back_path)
    perimeter_m = _closed_length(loop)
    payload: dict[str, object] = {
        "row": row_name,
        "heightCm": round(height_m * 100.0, 4),
        "straightABWidthCm": round(straight_width_m * 100.0, 4),
        "frontCurvedABCm": round(front_arc_m * 100.0, 4),
        "backCurvedBACm": round(back_arc_m * 100.0, 4),
        "meshCircumferenceCm": round(perimeter_m * 100.0, 4),
        "pointA": [round(float(value), 6) for value in loop[a_index]],
        "pointB": [round(float(value), 6) for value in loop[b_index]],
        "loopPointCount": len(loop),
        "source": "exact horizontal triangle-plane intersection of the canonical WEAR PLY",
    }
    return payload, [curve_object, *markers]


def build_waist_hip_sections(
    body: bpy.types.Object,
    teacher_record: dict[str, object],
) -> tuple[list[dict[str, object]], list[bpy.types.Object]]:
    measurements = teacher_record.get("measurements_mm") or {}
    if not isinstance(measurements, dict):
        raise RuntimeError("The teacher record has no measurements_mm object.")
    specs = (
        ("waist", "waist_height_mm", (0.08, 0.95, 0.72, 1.0)),
        ("hips", "hip_max_height_mm", (1.0, 0.48, 0.12, 1.0)),
    )
    rows: list[dict[str, object]] = []
    objects: list[bpy.types.Object] = []
    for row_name, height_key, color in specs:
        raw_height = measurements.get(height_key)
        if not isinstance(raw_height, (int, float)) or not math.isfinite(float(raw_height)):
            raise RuntimeError(f"The teacher record has no valid {height_key}.")
        row, created = build_body_section(body, row_name, float(raw_height) / 1000.0, color)
        rows.append(row)
        objects.extend(created)
    return rows, objects


def add_area_light(name: str, location: tuple[float, float, float], energy: float, size: float, color: tuple[float, float, float]) -> None:
    data = bpy.data.lights.new(name, "AREA")
    data.energy = energy
    data.shape = "DISK"
    data.size = size
    data.color = color
    light = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(light)
    light.location = location
    direction = Vector((0.0, 0.0, 0.9)) - light.location
    light.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def prepare_body(args: argparse.Namespace, temp_dir: Path) -> tuple[bpy.types.Object, dict[str, object]]:
    uncompressed = temp_dir / f"{args.scan_id.lower()}.ply"
    with gzip.open(args.mesh_gz, "rb") as source, uncompressed.open("wb") as target:
        shutil.copyfileobj(source, target)

    before = set(bpy.data.objects)
    bpy.ops.wm.ply_import(filepath=str(uncompressed))
    imported = [obj for obj in bpy.data.objects if obj not in before and obj.type == "MESH"]
    if len(imported) != 1:
        raise RuntimeError(f"Expected one WEAR mesh, found {len(imported)}.")
    body = imported[0]
    body.name = f"REAL_WEAR_{args.scan_id}"
    teacher_record = json.loads(args.teacher_record.read_text())
    if teacher_record.get("scan_id") != args.scan_id:
        raise RuntimeError("Teacher record does not match the requested scan.")

    # Use the exact same unit, anatomical-axis, centering, and vertical-offset
    # contract as render_wear3d_multiview.py. The browser body and exported
    # contour_world_points_mm then occupy one coordinate system.
    unit_scale = 0.001 if body.dimensions.z > 10.0 else 1.0
    body.scale = Vector((unit_scale, unit_scale, unit_scale))
    bpy.context.view_layer.objects.active = body
    body.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    raw_points = np.empty(len(body.data.vertices) * 3, dtype=np.float64)
    body.data.vertices.foreach_get("co", raw_points)
    raw_points = raw_points.reshape((-1, 3))
    transform = BASE.anatomical_transform(teacher_record, raw_points[:, :2])
    body.data.transform(transform)
    body.data.update()
    canonical_points = np.empty(len(body.data.vertices) * 3, dtype=np.float64)
    body.data.vertices.foreach_get("co", canonical_points)
    canonical_points = canonical_points.reshape((-1, 3))
    minimum = canonical_points.min(axis=0)
    maximum = canonical_points.max(axis=0)
    center = (minimum + maximum) / 2.0
    source_z_offset, vertical_method = BASE.source_vertical_alignment(teacher_record)
    vertical_offset = source_z_offset if source_z_offset is not None else -float(minimum[2])
    body.location = Vector((-float(center[0]), -float(center[1]), float(vertical_offset)))
    bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)

    original_faces = len(body.data.polygons)
    for polygon in body.data.polygons:
        polygon.use_smooth = True
    body.data.materials.clear()
    body.data.materials.append(body_material())
    body["wear_scan_id"] = args.scan_id
    body["source_geometry"] = "exact verified AWS WEAR PLY"
    body["source_landmarks"] = "exact verified AWS WEAR LND"
    body["height_cm"] = args.height_cm
    body["weight_kg"] = args.weight_kg
    body["uniform_scale_to_recorded_stature"] = 1.0
    body["wear_vertical_alignment_method"] = vertical_method

    low, high = world_bounds(body)
    metadata = {
        "scanId": args.scan_id,
        "heightCm": args.height_cm,
        "weightKg": args.weight_kg,
        "source": "exact verified AWS WEAR PLY/LND pair",
        "generator": {
            "application": "Blender",
            "version": bpy.app.version_string,
            "headless": True,
            "pythonApi": True,
        },
        "geometry": {
            "originalFaces": original_faces,
            "browserFaces": len(body.data.polygons),
            "browserVertices": len(body.data.vertices),
            "cleanup": {"removedVertices": 0, "removedFaces": 0},
            "uniformScaleToRecordedStature": 1.0,
            "verticalAlignmentMethod": vertical_method,
            "boundsMeters": {
                "minimum": [low.x, low.z, -high.y],
                "maximum": [high.x, high.z, -low.y],
            },
        },
        "truthBoundary": "The browser surface is the full real WEAR PLY in the exact same canonical transform as the exported teacher paths; no decimation, scaling-to-tape, or decorative ring reconstruction is used.",
        "canonicalTransformContract": "render_wear3d_pilot.anatomical_transform+source_vertical_alignment",
    }
    return body, metadata


def configure_scene(body_height: float, output_png: Path) -> tuple[bpy.types.Scene, bpy.types.Object, Vector]:
    scene = bpy.context.scene
    # Blender 4.2+ renamed the Eevee engine identifier. Keep the renderer
    # compatible with both the local Blender build and the test server's 4.3.
    try:
        scene.render.engine = "BLENDER_EEVEE_NEXT"
    except TypeError:
        scene.render.engine = "BLENDER_EEVEE"
    # These images are comparison cards, while the GLB keeps the complete real
    # body mesh. A compact render prevents first-time server generation from
    # taking several minutes per camera on CPU-only Test Lab hosts.
    scene.render.resolution_x = 720
    scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    if hasattr(scene, "eevee"):
        scene.eevee.taa_render_samples = 8
        if hasattr(scene.eevee, "use_raytracing"):
            scene.eevee.use_raytracing = False
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.filepath = str(output_png)
    scene.render.film_transparent = False
    scene.world.use_nodes = True
    background = scene.world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (0.008, 0.018, 0.045, 1.0)
    background.inputs["Strength"].default_value = 0.25
    try:
        scene.view_settings.look = "AgX - Medium High Contrast"
    except TypeError:
        pass

    bpy.ops.mesh.primitive_plane_add(size=7.0, location=(0.0, 0.0, -0.012))
    floor = bpy.context.object
    floor.name = "Studio floor"
    floor.data.materials.append(simple_material("Studio floor material", (0.018, 0.035, 0.075, 1.0)))

    add_area_light("Key", (-2.8, -3.4, 3.7), 1050.0, 3.5, (0.78, 0.92, 1.0))
    add_area_light("Fill", (3.0, -2.0, 2.5), 760.0, 3.0, (0.52, 0.82, 1.0))
    add_area_light("Rim", (0.0, 2.2, 3.4), 1250.0, 2.6, (0.23, 0.86, 0.95))

    camera_data = bpy.data.cameras.new("WEAR studio camera")
    camera = bpy.data.objects.new("WEAR studio camera", camera_data)
    bpy.context.collection.objects.link(camera)
    target = Vector((0.0, 0.0, body_height * 0.5))
    camera_data.type = "PERSP"
    camera_data.lens = 55.0
    camera_data.sensor_width = 36.0
    scene.camera = camera
    return scene, camera, target


def render_camera_card(
    scene: bpy.types.Scene,
    camera: bpy.types.Object,
    target: Vector,
    body_height: float,
    output_path: Path,
    card: dict[str, float | str],
) -> dict[str, object]:
    yaw = math.radians(float(card["yawDeg"]))
    pitch = math.radians(float(card["pitchDeg"]))
    roll = math.radians(float(card["rollDeg"]))
    # Fill the review card while keeping the full body inside the frame.
    distance = body_height * 2.35
    horizontal_distance = math.cos(pitch) * distance
    camera.location = Vector((
        math.sin(yaw) * horizontal_distance,
        -math.cos(yaw) * horizontal_distance,
        target.z + math.sin(pitch) * distance,
    ))
    camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
    camera.rotation_euler.rotate_axis("Z", roll)
    camera.data.lens = float(card["lensMm"])
    scene.render.filepath = str(output_path)
    bpy.ops.render.render(write_still=True)
    return {
        **card,
        "file": output_path.name,
        "cameraLocationMeters": [round(value, 6) for value in camera.location],
        "targetMeters": [round(value, 6) for value in target],
        "distanceMeters": round(distance, 6),
        "projection": "perspective",
        "knownTransform": True,
    }


def main() -> None:
    args = arguments()
    args.output_dir.mkdir(parents=True, exist_ok=True)
    output_glb = args.output_dir / "model.glb"
    output_png = args.output_dir / "render.png"
    output_blend = args.output_dir / "scene.blend"
    output_meta = args.output_dir / "metadata.json"
    output_front_2d = args.output_dir / "front-2d.json"
    output_side_2d = args.output_dir / "side-2d.json"

    clear_scene()
    with tempfile.TemporaryDirectory(prefix="primestyle-sdk-wear-") as temp:
        body, metadata = prepare_body(args, Path(temp))
    teacher_record = json.loads(args.teacher_record.read_text())
    cross_sections, section_objects = build_waist_hip_sections(body, teacher_record)
    front_2d = None
    side_2d = None
    scene = bpy.context.scene
    camera = None
    camera_target = None
    if args.render_profile == "full":
        front_2d = write_flat_projection(body, "front", output_front_2d)
        side_2d = write_flat_projection(body, "side", output_side_2d)
        scene, camera, camera_target = configure_scene(args.height_cm / 100.0, output_png)

    bpy.ops.object.select_all(action="DESELECT")
    for export_object in (body, *section_objects):
        export_object.select_set(True)
    bpy.context.view_layer.objects.active = body
    bpy.ops.export_scene.gltf(
        filepath=str(output_glb),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_materials="EXPORT",
        export_yup=True,
    )
    rendered_camera_cards = []
    if args.render_profile == "full":
        for card in CAMERA_CARDS:
            target_path = output_png if card["id"] == "canonical" else args.output_dir / f"camera-{card['id']}.png"
            rendered_camera_cards.append(render_camera_card(
                scene,
                camera,
                camera_target,
                args.height_cm / 100.0,
                target_path,
                card,
            ))
    bpy.ops.wm.save_as_mainfile(filepath=str(output_blend))

    metadata["renderSchemaVersion"] = RENDER_SCHEMA_VERSION
    metadata["renderProfile"] = args.render_profile
    metadata["crossSections"] = cross_sections
    metadata["cameraCards"] = rendered_camera_cards
    metadata["cameraCorrectionTruth"] = {
        "input": "same exact canonical WEAR PLY rendered by Blender with a known perspective camera matrix",
        "target": "canonical yaw 0, pitch 0, roll 0 body frame",
        "operation": "one global inverse camera transform; no local body-part stretching",
    }
    metadata["artifacts"] = {
        "blend": output_blend.name,
        "glb": output_glb.name,
        "cameraCards": [card["file"] for card in rendered_camera_cards],
    }
    if args.render_profile == "full":
        metadata["artifacts"].update({
            "png": output_png.name,
            "front2d": output_front_2d.name,
            "side2d": output_side_2d.name,
        })
        metadata["projection2d"] = {
            "front": front_2d["stats"],
            "side": side_2d["stats"],
            "truthBoundary": "Both 2D views project existing source PLY faces and true face-turn silhouette edges. No silhouette fill, Delaunay mesh, body guess, or RGB render is used.",
        }
    output_meta.write_text(json.dumps(metadata, indent=2) + "\n")
    print(f"SDK_WEAR_BLENDER_RESULT={json.dumps(metadata, separators=(',', ':'))}")


if __name__ == "__main__":
    main()
