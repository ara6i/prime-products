#!/usr/bin/env python3
"""Build a Blender comparison scene for three real WEAR standing scans.

The colored horizontal marks show only the WEAR-recorded anatomical height.
Their endpoints are deliberately shortened and are not width measurements.
"""

from __future__ import annotations

import gzip
import math
import shutil
import tempfile
from pathlib import Path

import bpy
from mathutils import Vector


REPO_ROOT = Path(__file__).resolve().parents[2]
SOURCE_DIR = REPO_ROOT / ".local-ml/blender/delaram-similarity/sources"
OUTPUT_DIR = REPO_ROOT / ".local-ml/blender/delaram-three-height-weight"
OUTPUT_BLEND = OUTPUT_DIR / "delaram-three-real-wear-bodies.blend"
OUTPUT_RENDER = OUTPUT_DIR / "delaram-three-real-wear-bodies.png"

SUBJECTS = [
    {
        "scan_id": "NA-1591-A",
        "stem": "csr1591a",
        "x": -1.25,
        "height_cm": 168.1,
        "weight_kg": 70.975,
        "chest_cm": 91.9,
        "waist_cm": 75.4,
        "hips_cm": 112.0,
        "color": (0.32, 0.62, 0.96, 1.0),
        "rows": {
            "chest": {"height_mm": 1218.0, "mesh_width_mm": 364.434},
            "waist": {"height_mm": 1035.0, "mesh_width_mm": 289.425},
            "hips": {"height_mm": 830.0, "mesh_width_mm": 410.144},
        },
    },
    {
        "scan_id": "NA-1420-A",
        "stem": "csr1420a",
        "x": 0.0,
        "height_cm": 167.9,
        "weight_kg": 71.429,
        "chest_cm": 94.6,
        "waist_cm": 79.1,
        "hips_cm": 109.3,
        "color": (0.94, 0.58, 0.38, 1.0),
        "rows": {
            "chest": {"height_mm": 1222.0, "mesh_width_mm": 366.382},
            "waist": {"height_mm": 1065.0, "mesh_width_mm": 314.256},
            "hips": {"height_mm": 956.0, "mesh_width_mm": 396.486},
        },
    },
    {
        "scan_id": "NA-1220-A",
        "stem": "csr1220a",
        "x": 1.25,
        "height_cm": 168.3,
        "weight_kg": 70.295,
        "chest_cm": 89.3,
        "waist_cm": 70.9,
        "hips_cm": 112.2,
        "color": (0.43, 0.82, 0.59, 1.0),
        "rows": {
            "chest": {"height_mm": 1266.0, "mesh_width_mm": 392.224},
            "waist": {"height_mm": 1063.0, "mesh_width_mm": 287.502},
            "hips": {"height_mm": 846.0, "mesh_width_mm": 410.791},
        },
    },
]

ROW_COLORS = {
    "chest": (1.0, 0.48, 0.12, 1.0),
    "waist": (0.08, 0.88, 1.0, 1.0),
    "hips": (1.0, 0.24, 0.68, 1.0),
}


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (
        bpy.data.curves,
        bpy.data.meshes,
        bpy.data.materials,
        bpy.data.cameras,
        bpy.data.lights,
    ):
        for datablock in list(datablocks):
            if datablock.users == 0:
                datablocks.remove(datablock)


def material(name: str, color: tuple[float, float, float, float], roughness: float = 0.42) -> bpy.types.Material:
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get("Principled BSDF")
    shader.inputs["Base Color"].default_value = color
    shader.inputs["Roughness"].default_value = roughness
    if "Specular IOR Level" in shader.inputs:
        shader.inputs["Specular IOR Level"].default_value = 0.28
    return mat


def emissive_material(name: str, color: tuple[float, float, float, float]) -> bpy.types.Material:
    mat = material(name, color, 0.3)
    shader = mat.node_tree.nodes.get("Principled BSDF")
    if "Emission Color" in shader.inputs:
        shader.inputs["Emission Color"].default_value = color
        shader.inputs["Emission Strength"].default_value = 2.5
    elif "Emission" in shader.inputs:
        shader.inputs["Emission"].default_value = color
        shader.inputs["Emission Strength"].default_value = 2.5
    return mat


def parse_landmarks(path: Path) -> dict[str, Vector]:
    landmarks: dict[str, Vector] = {}
    for raw_line in path.read_text(errors="replace").splitlines():
        parts = raw_line.split()
        if len(parts) < 8 or not parts[0].isdigit():
            continue
        try:
            # CAESAR LND rows carry one non-coordinate value before XYZ.
            point = Vector((float(parts[4]), float(parts[5]), float(parts[6])))
        except ValueError:
            continue
        landmarks[" ".join(parts[7:])] = point
    return landmarks


def front_yaw(landmarks: dict[str, Vector]) -> float:
    front_points = [landmarks.get("Suprasternale"), landmarks.get("Substernale")]
    back_points = [landmarks.get("Cervicale"), landmarks.get("10th Rib Midspine")]
    front = sum((point for point in front_points if point is not None), Vector()) / 2.0
    back = sum((point for point in back_points if point is not None), Vector()) / 2.0
    direction = front - back
    return -math.pi / 2.0 - math.atan2(direction.y, direction.x)


def world_bounds(obj: bpy.types.Object) -> tuple[Vector, Vector]:
    corners = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    return (
        Vector((min(p.x for p in corners), min(p.y for p in corners), min(p.z for p in corners))),
        Vector((max(p.x for p in corners), max(p.y for p in corners), max(p.z for p in corners))),
    )


def import_scan(subject: dict, temp_dir: Path) -> tuple[bpy.types.Object, tuple[Vector, Vector], float]:
    source = SOURCE_DIR / f"{subject['stem']}.ply.gz"
    landmarks_path = SOURCE_DIR / f"{subject['stem']}.lnd"
    uncompressed = temp_dir / f"{subject['stem']}.ply"
    with gzip.open(source, "rb") as source_file, uncompressed.open("wb") as target_file:
        shutil.copyfileobj(source_file, target_file)

    before = set(bpy.data.objects)
    bpy.ops.wm.ply_import(filepath=str(uncompressed))
    imported = [obj for obj in bpy.data.objects if obj not in before and obj.type == "MESH"]
    if len(imported) != 1:
        raise RuntimeError(f"Expected one mesh for {subject['scan_id']}, got {len(imported)}")
    body = imported[0]
    body.name = f"REAL_WEAR_{subject['scan_id']}"

    yaw = front_yaw(parse_landmarks(landmarks_path))
    # The CAESAR/WEAR PLY vertex coordinates are already stored in metres.
    # Landmark/tape metadata is millimetres, so only those metadata values are
    # divided by 1000 below. Scaling the mesh here would make it 1000x too small.
    body.scale = (1.0, 1.0, 1.0)
    body.rotation_euler.z = yaw
    bpy.context.view_layer.objects.active = body
    body.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)

    low, high = world_bounds(body)
    body.location += Vector((subject["x"] - (low.x + high.x) / 2.0, -(low.y + high.y) / 2.0, -low.z))
    bpy.context.view_layer.update()
    low, high = world_bounds(body)

    for polygon in body.data.polygons:
        polygon.use_smooth = True
    body.data.materials.clear()
    body.data.materials.append(material(f"Body_{subject['scan_id']}", subject["color"]))
    body["wear_scan_id"] = subject["scan_id"]
    body["source_mesh"] = str(source)
    body["source_landmarks"] = str(landmarks_path)
    body["front_rotation_degrees"] = math.degrees(yaw)
    body["is_real_wear_scan"] = True
    body["height_cm"] = subject["height_cm"]
    body["weight_kg"] = subject["weight_kg"]
    body["chest_tape_cm"] = subject["chest_cm"]
    body["waist_tape_cm"] = subject["waist_cm"]
    body["hips_tape_cm"] = subject["hips_cm"]
    return body, (low, high), yaw


def add_position_line(subject: dict, row_name: str, front_y: float) -> bpy.types.Object:
    row = subject["rows"][row_name]
    # Use a deliberately shortened span so the mark communicates height only.
    visual_length = row["mesh_width_mm"] * 0.001 * 0.72
    half = visual_length / 2.0
    z = row["height_mm"] * 0.001
    curve = bpy.data.curves.new(f"{row_name.title()} position {subject['scan_id']}", "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 2
    curve.bevel_depth = 0.006
    curve.bevel_resolution = 4
    spline = curve.splines.new("POLY")
    spline.points.add(1)
    spline.points[0].co = (subject["x"] - half, front_y, z, 1.0)
    spline.points[1].co = (subject["x"] + half, front_y, z, 1.0)
    obj = bpy.data.objects.new(f"{row_name.upper()}_POSITION_ONLY_{subject['scan_id']}", curve)
    bpy.context.collection.objects.link(obj)
    curve.materials.append(emissive_material(f"{row_name}_{subject['scan_id']}", ROW_COLORS[row_name]))
    obj["row"] = row_name
    obj["height_from_floor_cm"] = row["height_mm"] / 10.0
    obj["meaning"] = "WEAR anatomical height only; endpoints are not measurements"
    obj["width_used_only_to_shorten_marker_cm"] = row["mesh_width_mm"] / 10.0
    return obj


def add_text(
    name: str,
    body: str,
    location: tuple[float, float, float],
    size: float,
    color: tuple[float, float, float, float],
    extrude: float = 0.001,
) -> bpy.types.Object:
    curve = bpy.data.curves.new(name, "FONT")
    curve.body = body
    curve.align_x = "CENTER"
    curve.align_y = "CENTER"
    curve.size = size
    curve.extrude = extrude
    curve.bevel_depth = 0.0004
    curve.materials.append(emissive_material(f"{name}_material", color))
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    obj.location = location
    obj.rotation_euler = (math.pi / 2.0, 0.0, 0.0)
    return obj


def add_plane(name: str, size: float, location: tuple[float, float, float], color: tuple[float, float, float, float]) -> bpy.types.Object:
    bpy.ops.mesh.primitive_plane_add(size=size, location=location)
    plane = bpy.context.object
    plane.name = name
    plane.data.materials.append(material(f"{name}_material", color, 0.72))
    return plane


def add_area_light(name: str, location: tuple[float, float, float], energy: float, size: float, color: tuple[float, float, float]) -> None:
    data = bpy.data.lights.new(name, "AREA")
    data.energy = energy
    data.shape = "DISK"
    data.size = size
    data.color = color
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    obj.location = location
    direction = Vector((0.0, 0.0, 0.95)) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def add_camera() -> bpy.types.Object:
    data = bpy.data.cameras.new("Comparison Camera")
    camera = bpy.data.objects.new("Comparison Camera", data)
    bpy.context.collection.objects.link(camera)
    camera.location = (0.0, -8.0, 1.04)
    target = Vector((0.0, 0.0, 1.04))
    camera.rotation_euler = (target - camera.location).to_track_quat("-Z", "Y").to_euler()
    data.type = "ORTHO"
    # Fit all three full-height bodies, their labels and the outside columns.
    data.ortho_scale = 4.25
    bpy.context.scene.camera = camera
    return camera


def configure_scene() -> None:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 2880
    scene.render.resolution_y = 1620
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.filepath = str(OUTPUT_RENDER)
    scene.render.film_transparent = False
    scene.render.image_settings.color_mode = "RGBA"
    scene.world.use_nodes = True
    background = scene.world.node_tree.nodes.get("Background")
    background.inputs["Color"].default_value = (0.018, 0.028, 0.055, 1.0)
    background.inputs["Strength"].default_value = 0.32
    try:
        scene.view_settings.look = "AgX - Medium High Contrast"
    except TypeError:
        pass


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    clear_scene()
    configure_scene()

    add_plane("Gallery Floor", 8.0, (0.0, 0.0, -0.012), (0.026, 0.045, 0.082, 1.0))
    add_area_light("Key", (-2.8, -3.8, 4.2), 1100.0, 4.0, (1.0, 0.91, 0.82))
    add_area_light("Fill", (3.6, -2.5, 2.4), 750.0, 3.0, (0.65, 0.78, 1.0))
    add_area_light("Rim", (0.0, 3.0, 3.8), 1200.0, 2.5, (0.52, 0.72, 1.0))
    add_camera()

    add_text(
        "Title",
        "DELARAM HEIGHT + WEIGHT MATCHES · REAL WEAR PLY SCANS",
        (0.0, -0.64, 2.13),
        0.105,
        (0.92, 0.96, 1.0, 1.0),
    )
    add_text(
        "Legend",
        "POSITION ONLY — orange CHEST   cyan WAIST   pink HIPS   ·   endpoints are not measurements",
        (0.0, -0.64, 2.01),
        0.055,
        (0.68, 0.76, 0.9, 1.0),
    )

    with tempfile.TemporaryDirectory(prefix="primestyle-wear-three-") as temp:
        temp_dir = Path(temp)
        for subject in SUBJECTS:
            body, bounds, _ = import_scan(subject, temp_dir)
            low, _high = bounds
            front_y = low.y - 0.025
            for row_name in ("chest", "waist", "hips"):
                add_position_line(subject, row_name, front_y)
            add_text(
                f"Label {subject['scan_id']}",
                subject["scan_id"],
                (subject["x"], -0.63, 1.84),
                0.095,
                subject["color"],
            )
            add_text(
                f"Measures {subject['scan_id']}",
                (
                    f"H {subject['height_cm']:.1f} cm  ·  W {subject['weight_kg']:.2f} kg\n"
                    f"Chest {subject['chest_cm']:.1f}  ·  Waist {subject['waist_cm']:.1f}  ·  Hips {subject['hips_cm']:.1f} cm"
                ),
                (subject["x"], -0.63, -0.095),
                0.052,
                (0.9, 0.94, 1.0, 1.0),
            )
            body.select_set(False)

    scene = bpy.context.scene
    scene["scene_truth"] = "Three real WEAR standing PLY scans; no Delaram proxy"
    scene["line_truth"] = "Colored lines show only recorded WEAR row height; endpoints are deliberately shortened"
    scene["delaram_reference"] = "Height 168.0 cm; weight 70.8 kg; chest 102.0 cm; waist 79.0 cm; hips 113.0 cm"

    bpy.ops.wm.save_as_mainfile(filepath=str(OUTPUT_BLEND))
    bpy.ops.render.render(write_still=True)
    print(f"Saved Blender scene: {OUTPUT_BLEND}")
    print(f"Saved render: {OUTPUT_RENDER}")


if __name__ == "__main__":
    main()
