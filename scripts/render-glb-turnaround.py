import math
import os
import sys

import bpy
from mathutils import Vector


def look_at(obj, target):
    obj.rotation_euler = (Vector(target) - obj.location).to_track_quat("-Z", "Y").to_euler()


def scene_bounds(objects):
    corners = []
    for obj in objects:
        if obj.type != "MESH":
            continue
        corners.extend(obj.matrix_world @ Vector(corner) for corner in obj.bound_box)
    minimum = Vector((min(point.x for point in corners), min(point.y for point in corners), min(point.z for point in corners)))
    maximum = Vector((max(point.x for point in corners), max(point.y for point in corners), max(point.z for point in corners)))
    return minimum, maximum


def add_area_light(name, location, energy, size, target):
    data = bpy.data.lights.new(name=name, type="AREA")
    data.energy = energy
    data.shape = "DISK"
    data.size = size
    light = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(light)
    light.location = location
    look_at(light, target)


args = sys.argv[sys.argv.index("--") + 1 :]
if len(args) != 2:
    raise SystemExit("Usage: blender --background --python scripts/render-glb-turnaround.py -- input.glb output-dir")

source = os.path.abspath(args[0])
output_dir = os.path.abspath(args[1])
os.makedirs(output_dir, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=source)
meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
minimum, maximum = scene_bounds(meshes)
center = (minimum + maximum) / 2
extent = maximum - minimum
radius = max(extent) * 2.25

world = bpy.context.scene.world or bpy.data.worlds.new("World")
bpy.context.scene.world = world
world.use_nodes = True
world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.91, 0.90, 0.88, 1)
world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.8

camera_data = bpy.data.cameras.new("Turnaround camera")
camera_data.type = "ORTHO"
camera_data.ortho_scale = max(extent.x, extent.y) * 1.2
camera = bpy.data.objects.new("Turnaround camera", camera_data)
bpy.context.collection.objects.link(camera)
bpy.context.scene.camera = camera

add_area_light(
    "Key",
    center + Vector((radius * 0.75, radius * 0.9, radius)),
    900,
    radius,
    center,
)
add_area_light(
    "Fill",
    center + Vector((-radius, radius * 0.25, radius * 0.4)),
    550,
    radius * 1.2,
    center,
)
add_area_light(
    "Rim",
    center + Vector((0, radius * 0.7, -radius)),
    700,
    radius,
    center,
)

scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = 720
scene.render.resolution_y = 720
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.film_transparent = False
scene.render.image_settings.color_mode = "RGBA"
scene.render.image_settings.color_depth = "8"
scene.render.resolution_percentage = 100
scene.view_settings.look = "AgX - Medium High Contrast"

views = {
    "front": Vector((0, 0, radius)),
    "left": Vector((-radius, 0, 0)),
    "back": Vector((0, 0, -radius)),
    "right": Vector((radius, 0, 0)),
}

for name, offset in views.items():
    camera.location = center + offset
    look_at(camera, center)
    scene.render.filepath = os.path.join(output_dir, f"{name}.png")
    bpy.ops.render.render(write_still=True)
    print(f"Rendered {name}")
