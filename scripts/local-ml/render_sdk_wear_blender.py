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


RENDER_SCHEMA_VERSION = 4
CAMERA_CARDS = (
    {"id": "canonical", "yawDeg": 0.0, "pitchDeg": 0.0, "rollDeg": 0.0, "lensMm": 55.0},
    {"id": "yaw-left-12", "yawDeg": -12.0, "pitchDeg": 0.0, "rollDeg": 0.0, "lensMm": 55.0},
    {"id": "yaw-right-12", "yawDeg": 12.0, "pitchDeg": 0.0, "rollDeg": 0.0, "lensMm": 55.0},
    {"id": "pitch-up-6", "yawDeg": 0.0, "pitchDeg": 6.0, "rollDeg": 0.0, "lensMm": 55.0},
    {"id": "roll-right-3", "yawDeg": 0.0, "pitchDeg": 0.0, "rollDeg": 3.0, "lensMm": 55.0},
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
    return parser.parse_args(raw)


def load_base_renderer():
    source = Path.cwd() / ".local-ml/tools/render_wear3d_pilot.py"
    if not source.is_file():
        raise RuntimeError(f"Canonical WEAR renderer is unavailable: {source}")
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
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1200
    scene.render.resolution_y = 1500
    scene.render.resolution_percentage = 100
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

    clear_scene()
    with tempfile.TemporaryDirectory(prefix="primestyle-sdk-wear-") as temp:
        body, metadata = prepare_body(args, Path(temp))
    scene, camera, camera_target = configure_scene(args.height_cm / 100.0, output_png)

    bpy.ops.object.select_all(action="DESELECT")
    body.select_set(True)
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
    metadata["cameraCards"] = rendered_camera_cards
    metadata["cameraCorrectionTruth"] = {
        "input": "same exact canonical WEAR PLY rendered by Blender with a known perspective camera matrix",
        "target": "canonical yaw 0, pitch 0, roll 0 body frame",
        "operation": "one global inverse camera transform; no local body-part stretching",
    }
    metadata["artifacts"] = {
        "blend": output_blend.name,
        "glb": output_glb.name,
        "png": output_png.name,
        "cameraCards": [card["file"] for card in rendered_camera_cards],
    }
    output_meta.write_text(json.dumps(metadata, indent=2) + "\n")
    print(f"SDK_WEAR_BLENDER_RESULT={json.dumps(metadata, separators=(',', ':'))}")


if __name__ == "__main__":
    main()
