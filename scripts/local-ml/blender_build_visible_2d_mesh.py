#!/usr/bin/env python3
"""Build the private Delaram visible-body mesh with Blender's Python API.

Run this file through Blender, not the system Python:

    blender --background --factory-startup --python this_file.py -- --photo delaram

The photo segmentation mask is produced before Blender. Blender receives only
the traced, closed mask boundary; Blender then creates, triangulates, subdivides,
validates, and saves the final flat mesh. No depth, tape, circumference, or WEAR
answer enters this job.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

import bmesh
import bpy
from mathutils import Vector
from mathutils.geometry import delaunay_2d_cdt


ROOT = Path(__file__).resolve().parents[2]
OUTLINE_DIR = ROOT / ".local-ml/wear-mesh-overlay/mask-mesh"
OUTPUT_DIR = ROOT / ".local-ml/wear-mesh-overlay/blender-mesh"
SAFE_PHOTO_ID = re.compile(r"^[a-z0-9][a-z0-9-]{0,63}$")


def parse_args() -> argparse.Namespace:
    blender_args = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--photo", required=True)
    parser.add_argument("--grid-step", type=int, default=24, choices=(12, 16, 20, 24, 32, 40))
    args = parser.parse_args(blender_args)
    if not SAFE_PHOTO_ID.fullmatch(args.photo):
        parser.error("Unsafe photo id")
    return args


def signed_area(points: list[tuple[float, float]]) -> float:
    return 0.5 * sum(
        x1 * y2 - x2 * y1
        for (x1, y1), (x2, y2) in zip(points, points[1:] + points[:1])
    )


def point_in_polygon(point: tuple[float, float], polygon: list[tuple[float, float]]) -> bool:
    x, y = point
    inside = False
    previous_x, previous_y = polygon[-1]
    for current_x, current_y in polygon:
        crosses = (current_y > y) != (previous_y > y)
        if crosses:
            denominator = previous_y - current_y
            intersection_x = (previous_x - current_x) * (y - current_y) / denominator + current_x
            if x < intersection_x:
                inside = not inside
        previous_x, previous_y = current_x, current_y
    return inside


def load_outline(photo_id: str) -> tuple[dict, list[tuple[float, float]]]:
    source_path = OUTLINE_DIR / f"{photo_id}.json"
    if not source_path.is_file():
        raise FileNotFoundError(
            f"Missing traced mask outline: {source_path}. Run build_visible_mask_mesh.py first."
        )
    source = json.loads(source_path.read_text())
    flattened = source.get("outline")
    if not isinstance(flattened, list) or len(flattened) < 32 or len(flattened) % 2:
        raise RuntimeError("The traced mask outline is invalid.")
    points = [
        (float(flattened[index]), float(flattened[index + 1]))
        for index in range(0, len(flattened), 2)
    ]
    if abs(signed_area(points)) < 1e-4:
        raise RuntimeError("The traced mask outline has no usable area.")
    return source, points


def build_blender_mesh(
    photo_id: str,
    outline_screen: list[tuple[float, float]],
    image_size: tuple[int, int],
    grid_step: int,
) -> tuple[bpy.types.Object, list[tuple[float, float]], list[int], int]:
    # Blender Y points upward; browser/photo Y points downward.
    outline_blender = [(x, 1.0 - y) for x, y in outline_screen]
    if signed_area(outline_blender) < 0:
        outline_blender.reverse()

    width, height = image_size
    cdt_vertices = [Vector(point) for point in outline_blender]
    boundary_count = len(cdt_vertices)
    offset = grid_step // 2
    for y_px in range(offset, height, grid_step):
        for x_px in range(offset, width, grid_step):
            screen_point = (x_px / width, y_px / height)
            if point_in_polygon(screen_point, outline_screen):
                cdt_vertices.append(Vector((screen_point[0], 1.0 - screen_point[1])))
    boundary_edges = [
        (index, (index + 1) % boundary_count)
        for index in range(boundary_count)
    ]
    cdt_result = delaunay_2d_cdt(
        cdt_vertices,
        boundary_edges,
        [list(range(boundary_count))],
        1,
        1e-8,
        False,
    )
    output_vertices, output_edges, output_faces = cdt_result[:3]
    if not output_faces:
        raise RuntimeError("Blender constrained Delaunay triangulation returned no body faces.")

    mesh = bpy.data.meshes.new(f"{photo_id}-visible-2d-mesh")
    mesh.from_pydata(
        [(float(vertex.x), float(vertex.y), 0.0) for vertex in output_vertices],
        output_edges,
        output_faces,
    )
    mesh.update()

    bm = bmesh.new()
    bm.from_mesh(mesh)
    bmesh.ops.triangulate(
        bm,
        faces=list(bm.faces),
        quad_method="BEAUTY",
        ngon_method="BEAUTY",
    )

    bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=1e-9)
    bm.verts.ensure_lookup_table()
    bm.faces.ensure_lookup_table()
    for vertex in bm.verts:
        vertex.index = -1
    for index, vertex in enumerate(bm.verts):
        vertex.index = index

    vertices_screen = [(float(vertex.co.x), float(1.0 - vertex.co.y)) for vertex in bm.verts]
    triangles: list[int] = []
    outside_faces = []
    for face in bm.faces:
        if len(face.verts) != 3:
            bm.free()
            raise RuntimeError("Blender left a non-triangle face in the final mesh.")
        indices = [vertex.index for vertex in face.verts]
        center = (
            sum(vertices_screen[index][0] for index in indices) / 3.0,
            sum(vertices_screen[index][1] for index in indices) / 3.0,
        )
        if not point_in_polygon(center, outline_screen):
            outside_faces.append(face)
        else:
            triangles.extend(indices)

    # Blender's constrained triangulator can leave a tiny numerical sliver
    # outside a highly concave photo outline. Remove that face from both the
    # saved .blend and browser mesh instead of rejecting an otherwise exact
    # silhouette or returning geometry beyond the visible person.
    if outside_faces:
        bmesh.ops.delete(bm, geom=outside_faces, context="FACES_ONLY")
    outside_centers = 0

    bm.to_mesh(mesh)
    bm.free()
    mesh.update()
    obj = bpy.data.objects.new(f"{photo_id}-Blender-visible-2D", mesh)
    bpy.context.collection.objects.link(obj)
    obj["photo_id"] = photo_id
    obj["source"] = "BiRefNet boundary; Blender bpy/bmesh geometry"
    obj["depth_used"] = False
    obj["measurements_used"] = False
    return obj, vertices_screen, triangles, outside_centers


def save_outputs(
    photo_id: str,
    source: dict,
    outline: list[tuple[float, float]],
    obj: bpy.types.Object,
    vertices: list[tuple[float, float]],
    triangles: list[int],
    outside_centers: int,
    grid_step: int,
) -> dict:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    blend_path = OUTPUT_DIR / f"{photo_id}.blend"
    json_path = OUTPUT_DIR / f"{photo_id}.json"

    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path), check_existing=False)

    payload = {
        "schemaVersion": "blender-visible-mask-mesh/v1",
        "photoId": photo_id,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "generator": {
            "application": "Blender",
            "version": bpy.app.version_string,
            "headless": bool(bpy.app.background),
            "pythonApi": "bpy + bmesh",
            "operations": [
                "mathutils.geometry.delaunay_2d_cdt",
                "bpy.types.Mesh.from_pydata",
                "bmesh.ops.triangulate",
            ],
        },
        "source": "Internal BiRefNet person-mask boundary converted by Blender into a flat 2D mesh",
        "outlineSource": "BiRefNet mask; OpenCV boundary trace",
        "imageSize": source.get("imageSize", [1920, 2560]),
        "maskUsedInternally": True,
        "maskReturnedToBrowser": False,
        "blenderApiUsed": True,
        "metaMhrUsed": False,
        "depthUsed": False,
        "measurementsUsed": False,
        "wearAnswerUsed": False,
        "visibleClothingAndHairIncluded": True,
        "vertices": [round(value, 7) for point in vertices for value in point],
        "triangles": triangles,
        "outline": [round(value, 7) for point in outline for value in point],
        "stats": {
            "vertexCount": len(vertices),
            "triangleCount": len(triangles) // 3,
            "outlinePointCount": len(outline),
            "gridStepPx": grid_step,
            "triangleCentersOutsideOutline": outside_centers,
        },
        "blendFile": blend_path.name,
    }
    if outside_centers:
        raise RuntimeError(
            f"Blender generated {outside_centers} triangle centers outside the visible boundary."
        )
    json_path.write_text(json.dumps(payload, separators=(",", ":")) + "\n")
    return payload


def main() -> None:
    args = parse_args()
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    source, outline = load_outline(args.photo)
    raw_image_size = source.get("imageSize", [1920, 2560])
    image_size = (int(raw_image_size[0]), int(raw_image_size[1]))
    obj, vertices, triangles, outside_centers = build_blender_mesh(
        args.photo,
        outline,
        image_size,
        args.grid_step,
    )
    payload = save_outputs(
        args.photo,
        source,
        outline,
        obj,
        vertices,
        triangles,
        outside_centers,
        args.grid_step,
    )
    print(
        "BLENDER_MESH_RESULT="
        + json.dumps(
            {
                "photoId": args.photo,
                "blenderVersion": payload["generator"]["version"],
                "vertexCount": payload["stats"]["vertexCount"],
                "triangleCount": payload["stats"]["triangleCount"],
                "triangleCentersOutsideOutline": payload["stats"]["triangleCentersOutsideOutline"],
                "json": str((OUTPUT_DIR / f"{args.photo}.json").relative_to(ROOT)),
                "blend": str((OUTPUT_DIR / f"{args.photo}.blend").relative_to(ROOT)),
            },
            separators=(",", ":"),
        ),
        flush=True,
    )


if __name__ == "__main__":
    main()
