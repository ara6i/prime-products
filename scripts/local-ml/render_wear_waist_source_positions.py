#!/usr/bin/env python3
"""Render the real WEAR PLY with source-defined preferred-waist evidence.

This is a read-only visual audit. It does not move a waist plane with tape and
does not create training labels. Run with Blender:

  blender --background --python scripts/local-ml/render_wear_waist_source_positions.py
"""

from __future__ import annotations

import importlib.util
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector


PROJECT_ROOT = Path(__file__).resolve().parents[2]
MANIFEST = PROJECT_ROOT / ".local-ml/wear3d-v6-audit/source-manifest-standing-a.jsonl"
SOURCE_ROOT = PROJECT_ROOT / ".local-ml/wear-mesh-overlay/dynamic-sources"
OUTPUT = PROJECT_ROOT / ".local-ml/reports/it-4028-a-waist-source-positions.png"
METADATA = PROJECT_ROOT / ".local-ml/reports/it-4028-a-waist-source-positions.json"
SCAN_ID = "IT-4028-A"


def load_renderer():
    source = PROJECT_ROOT / "scripts/local-ml/cloud/wear3d-v6/render_wear3d_multiview.py"
    spec = importlib.util.spec_from_file_location("wear_waist_source_renderer", source)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not import {source}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def load_record() -> dict:
    for line in MANIFEST.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        record = json.loads(line)
        if str(record.get("scan_id", "")).upper() == SCAN_ID:
            source_name = Path(record["source"]["mesh"]).name
            local_mesh = SOURCE_ROOT / SCAN_ID.lower() / source_name
            if not local_mesh.is_file():
                raise FileNotFoundError(local_mesh)
            return {**record, "source": {**record["source"], "mesh": str(local_mesh)}}
    raise RuntimeError(f"{SCAN_ID} not found")


def make_curve(name: str, points: list[Vector], material, thickness: float = 0.0045):
    curve = bpy.data.curves.new(name, type="CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 1
    curve.bevel_depth = thickness
    curve.bevel_resolution = 3
    spline = curve.splines.new("POLY")
    spline.points.add(len(points) - 1)
    for item, point in zip(spline.points, points):
        item.co = (*point, 1.0)
    spline.use_cyclic_u = True
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(material)
    return obj


def make_open_line(name: str, points: list[Vector], material, thickness: float = 0.003):
    curve = bpy.data.curves.new(name, type="CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 1
    curve.bevel_depth = thickness
    curve.bevel_resolution = 3
    spline = curve.splines.new("POLY")
    spline.points.add(len(points) - 1)
    for item, point in zip(spline.points, points):
        item.co = (*point, 1.0)
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(material)
    return obj


def parent_preserving_world(obj, parent) -> None:
    matrix = obj.matrix_world.copy()
    obj.parent = parent
    obj.matrix_world = matrix


def duplicate_group(objects: list, name: str, location: tuple[float, float, float], rotation_z: float):
    parent = bpy.data.objects.new(name, None)
    bpy.context.collection.objects.link(parent)
    parent.location = location
    parent.rotation_euler.z = rotation_z
    copies = []
    for original in objects:
        copy = original.copy()
        if getattr(original, "data", None) is not None:
            copy.data = original.data.copy()
        bpy.context.collection.objects.link(copy)
        parent_preserving_world(copy, parent)
        copies.append(copy)
    return parent, copies


def main() -> None:
    renderer = load_renderer()
    record = load_record()
    row_sources = {**record.get("measurements_mm", {}), **record.get("extracted_standing_mm", {})}

    renderer.BASE.clean_scene()
    scene = bpy.context.scene
    renderer.configure_scene(scene)
    scene.render.resolution_x = 1400
    scene.render.resolution_y = 900
    scene.render.resolution_percentage = 100
    scene.render.film_transparent = False
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.world.color = (0.002, 0.006, 0.018)

    body, transform, offset, height_m = renderer.BASE.import_body(record)
    raw_landmarks = renderer.BASE.transform_landmarks(record, transform, offset)
    landmarks, contract = renderer.canonicalize_landmarks(raw_landmarks)

    points = [0.0] * (len(body.data.vertices) * 3)
    body.data.vertices.foreach_get("co", points)
    import numpy as np
    body_points = np.asarray(points, dtype=np.float64).reshape((-1, 3)) + np.asarray(body.location)[None, :]
    body_min_z = float(np.min(body_points[:, 2]))
    body_max_z = float(np.max(body_points[:, 2]))
    body_center_z = (body_min_z + body_max_z) * 0.5
    body_world_height = body_max_z - body_min_z
    anatomy_bounds = renderer.BASE.torso_bounds(landmarks, "waist")

    waist_height_mm = float(row_sources["waist_height_mm"])
    posterior = landmarks["Waist, Preferred, Post."]
    posterior_height_mm = float(posterior.z) * 1000.0
    official_geometry = renderer.torso_contour(
        body, body_points, waist_height_mm / 1000.0, anatomy_bounds, None,
        debug_label=f"{SCAN_ID}:WEAR-waist-height",
    )
    posterior_geometry = renderer.torso_contour(
        body, body_points, posterior_height_mm / 1000.0, anatomy_bounds, None,
        debug_label=f"{SCAN_ID}:posterior-waist-landmark-height",
    )
    if official_geometry is None or posterior_geometry is None:
        raise RuntimeError("Could not create exact PLY waist sections")

    cyan = renderer.BASE.make_material("PLY mesh", (0.0, 0.88, 1.0, 1.0), emission=True)
    orange = renderer.BASE.make_material("WEAR waist height", (1.0, 0.35, 0.04, 1.0), emission=True)
    purple = renderer.BASE.make_material("Posterior waist landmark", (0.68, 0.36, 1.0, 1.0), emission=True)
    muted = renderer.BASE.make_material("Floor", (0.24, 0.32, 0.44, 1.0), emission=True)

    body.data.materials.clear()
    body.data.materials.append(cyan)
    polygon_count = max(len(body.data.polygons), 1)
    decimate = body.modifiers.new(name="ProofMeshDecimate", type="DECIMATE")
    decimate.ratio = min(1.0, 14_000.0 / polygon_count)
    wire = body.modifiers.new(name="ProofMeshWire", type="WIREFRAME")
    wire.thickness = 0.00072
    wire.use_replace = True
    wire.use_even_offset = True

    official_ring = make_curve(
        "WEAR waist_height_mm ring",
        [Vector(point) for point in official_geometry["contour_world_points"]],
        orange,
    )
    posterior_ring = make_curve(
        "Horizontal PLY slice at posterior landmark height",
        [Vector(point) for point in posterior_geometry["contour_world_points"]],
        purple,
        thickness=0.003,
    )
    bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=0.016, location=posterior)
    posterior_dot = bpy.context.object
    posterior_dot.name = "WEAR LND Waist Preferred Posterior"
    posterior_dot.data.materials.append(purple)

    floor = make_open_line(
        "Standing surface",
        [Vector((-0.30, 0.0, 0.0)), Vector((0.30, 0.0, 0.0))],
        muted,
        thickness=0.0025,
    )
    source_objects = [body, official_ring, posterior_ring, posterior_dot, floor]
    for obj in source_objects:
        obj.hide_render = True

    front_parent, front_objects = duplicate_group(source_objects, "Front exact PLY", (-0.72, 0.0, 0.0), 0.0)
    side_parent, side_objects = duplicate_group(source_objects, "Side exact PLY", (0.72, 0.0, 0.0), math.radians(90.0))
    for obj in front_objects + side_objects:
        obj.hide_render = False

    camera_data = bpy.data.cameras.new("ProofCamera")
    camera = bpy.data.objects.new("ProofCamera", camera_data)
    bpy.context.collection.objects.link(camera)
    camera_data.type = "ORTHO"
    # Fit the camera to the real PLY bounds.  Do not trust profile stature for
    # framing: the imported scan coordinate range can include platform/scan
    # offsets that otherwise clip the exact head or feet.
    render_aspect = scene.render.resolution_x / scene.render.resolution_y
    camera_data.ortho_scale = body_world_height * render_aspect * 1.10
    camera.location = (0.0, 6.0, body_center_z)
    renderer.BASE.look_at(camera, Vector((0.0, 0.0, body_center_z)))
    scene.camera = camera

    for obj in scene.objects:
        if obj.type == "LIGHT":
            obj.hide_render = True
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    scene.render.filepath = str(OUTPUT)
    bpy.ops.render.render(write_still=True)

    METADATA.write_text(json.dumps({
        "schema": "wear-waist-source-position-proof/v1",
        "scan_id": SCAN_ID,
        "source": {
            "mesh": record["source"]["mesh"],
            "landmarks": record["source"]["landmarks"],
            "manual": str(PROJECT_ROOT / ".local-ml/reports/wear-caesar-volume-ii-protocol-source.pdf"),
        },
        "landmark_contract": contract,
        "preferred_waist_sources": {
            "right_side_height_mm": waist_height_mm,
            "posterior_landmark_height_mm": round(posterior_height_mm, 3),
            "posterior_landmark_xyz_m": [round(float(value), 6) for value in posterior],
            "front_surface_length_mm": row_sources.get("waist_front_length_mm"),
            "back_point_to_point_distance_mm": row_sources.get("waist_back_mm"),
            "recorded_circumference_mm": row_sources.get("waist_circumference_mm"),
        },
        "ply_world_bounds_m": {
            "min_z": round(body_min_z, 6),
            "max_z": round(body_max_z, 6),
            "height": round(body_world_height, 6),
        },
        "render_legend": {
            "cyan": "exact IT-4028-A PLY wire mesh",
            "orange": "exact horizontal PLY ring at WEAR waist_height_mm",
            "purple_ring": "horizontal comparison slice at posterior landmark z; not an official full waist line",
            "purple_dot": "exact WEAR Waist, Preferred, Posterior 3D landmark",
        },
        "warning": "The manual defines an elastic preferred-waist band. Right-side height plus one posterior point do not uniquely define the full 3D band path when their heights disagree.",
    }, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"image": str(OUTPUT), "metadata": str(METADATA)}))


if __name__ == "__main__":
    main()
