#!/usr/bin/env python3
"""Create the private Blender evidence scene for the WEAR rigid camera fit."""

from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector


REPO_ROOT = Path(__file__).resolve().parents[2]
REPORT = REPO_ROOT / ".local-ml/wear-mesh-overlay/rigid-camera-fit/index.json"
SOURCE_GLB = REPO_ROOT / ".local-ml/wear-mesh-overlay/models/nl-6759-a.glb"
OUTPUT_DIR = REPO_ROOT / ".local-ml/wear-mesh-overlay/rigid-camera-fit"
PUBLIC_IMAGE = REPO_ROOT / "public/try-on-test/wear-mesh-overlay/wear-rigid-camera-fit.png"


def material(name: str, color: tuple[float, float, float, float], emission: float = 0.0):
    value = bpy.data.materials.new(name)
    value.diffuse_color = color
    value.use_nodes = True
    principled = value.node_tree.nodes.get("Principled BSDF")
    principled.inputs["Base Color"].default_value = color
    principled.inputs["Roughness"].default_value = 0.55
    if emission:
        principled.inputs["Emission Color"].default_value = color
        principled.inputs["Emission Strength"].default_value = emission
    return value


def add_camera_marker(name: str, yaw_deg: float, color, radius: float = 2.4):
    radians = math.radians(yaw_deg)
    # yaw 0 is the canonical front camera, yaw 90 is the side camera.
    position = Vector((-math.sin(radians) * radius, 0.84, -math.cos(radians) * radius))
    bpy.ops.mesh.primitive_cone_add(vertices=4, radius1=0.24, radius2=0.08, depth=0.42, location=position)
    marker = bpy.context.object
    marker.name = name
    marker.data.materials.append(color)
    direction = Vector((0.0, 0.84, 0.0)) - position
    marker.rotation_euler = direction.to_track_quat("Z", "Y").to_euler()

    curve = bpy.data.curves.new(f"{name}Ray", type="CURVE")
    curve.dimensions = "3D"
    curve.bevel_depth = 0.018
    curve.bevel_resolution = 3
    spline = curve.splines.new("POLY")
    spline.points.add(1)
    spline.points[0].co = (*position, 1.0)
    spline.points[1].co = (0.0, 0.84, 0.0, 1.0)
    ray = bpy.data.objects.new(f"{name}Ray", curve)
    bpy.context.collection.objects.link(ray)
    ray.data.materials.append(color)


def main() -> None:
    report = json.loads(REPORT.read_text())
    front_yaw = report["measurementEffect"]["frontYawDeg"]
    side_yaw = report["measurementEffect"]["sideYawDeg"]
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)

    bpy.ops.import_scene.gltf(filepath=str(SOURCE_GLB))
    bodies = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    if not bodies:
        raise RuntimeError("The selected real WEAR GLB did not contain a mesh.")
    cyan = material("WEAR body", (0.03, 0.75, 0.84, 1.0), 0.05)
    orange = material("Front camera", (1.0, 0.38, 0.06, 1.0), 0.4)
    violet = material("Side camera", (0.55, 0.35, 0.96, 1.0), 0.4)
    for body in bodies:
        body.data.materials.clear()
        body.data.materials.append(cyan)

    add_camera_marker("DelaramFrontCamera", front_yaw, orange)
    add_camera_marker("DelaramSideCamera", side_yaw, violet)

    bpy.ops.object.camera_add(location=(0.0, -6.0, 0.0), rotation=(math.radians(90), 0.0, 0.0))
    overview = bpy.context.object
    overview.name = "EvidenceOverviewCamera"
    overview.data.type = "ORTHO"
    overview.data.ortho_scale = 5.8
    bpy.context.scene.camera = overview

    world = bpy.context.scene.world
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.004, 0.008, 0.025, 1.0)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.18
    bpy.ops.object.light_add(type="AREA", location=(0.0, -2.5, 2.4))
    bpy.context.object.data.energy = 1300
    bpy.context.object.data.shape = "DISK"
    bpy.context.object.data.size = 5.0
    bpy.context.object.rotation_euler = (math.radians(75), 0.0, 0.0)

    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE"
    scene.render.resolution_x = 1000
    scene.render.resolution_y = 740
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.render.film_transparent = False
    PUBLIC_IMAGE.parent.mkdir(parents=True, exist_ok=True)
    scene.render.filepath = str(PUBLIC_IMAGE)
    scene.render.image_settings.color_mode = "RGBA"
    bpy.ops.render.render(write_still=True)

    scene["wear_camera_fit_status"] = report["status"]
    scene["front_yaw_deg"] = front_yaw
    scene["side_yaw_deg"] = side_yaw
    scene["local_vertex_warp_used"] = False
    scene["walls_or_doors_used"] = False
    scene["delaram_tape_used"] = False
    blend_path = OUTPUT_DIR / "wear-rigid-camera-fit.blend"
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))
    print(json.dumps({"blend": str(blend_path), "render": str(PUBLIC_IMAGE)}, indent=2))


if __name__ == "__main__":
    # Blender passes its own arguments before `--`; this script needs none.
    main()
