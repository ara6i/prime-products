#!/usr/bin/env python3
"""Store one measured photo silhouette as an honest Blender edge reference."""

from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

import bpy


def arguments() -> argparse.Namespace:
    raw = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--spec", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    return parser.parse_args(raw)


def signed_area(points: list[tuple[float, float]]) -> float:
    return 0.5 * sum(
        ax * by - bx * ay
        for (ax, ay), (bx, by) in zip(points, points[1:] + points[:1])
    )


def main() -> None:
    args = arguments()
    spec = json.loads(args.spec.read_text())
    height_cm = float(spec["heightCm"])
    raw_outline = spec["outline"]
    if not 120 <= height_cm <= 230 or not isinstance(raw_outline, list) or len(raw_outline) < 16:
        raise RuntimeError("The photo outline specification is invalid.")

    normalized = [(float(point[0]), float(point[1])) for point in raw_outline]
    if not all(math.isfinite(value) for point in normalized for value in point):
        raise RuntimeError("The photo outline contains a non-finite point.")
    minimum_x = min(point[0] for point in normalized)
    maximum_x = max(point[0] for point in normalized)
    centre_x = (minimum_x + maximum_x) / 2.0
    outline_cm = [((x - centre_x) * height_cm, (1.0 - y) * height_cm) for x, y in normalized]
    if abs(signed_area(outline_cm)) < 1.0:
        raise RuntimeError("The photo outline has no usable area.")
    if signed_area(outline_cm) < 0:
        outline_cm.reverse()

    browser_vertices = [[round(x, 5), round(y, 5)] for x, y in outline_cm]
    boundary_edges = [(index, (index + 1) % len(browser_vertices)) for index in range(len(browser_vertices))]
    outline_segments = [
        [browser_vertices[start], browser_vertices[end]]
        for start, end in boundary_edges
    ]
    mesh = bpy.data.meshes.new("photo-outline-reference-2d")
    mesh.from_pydata([(x, 0.0, y) for x, y in outline_cm], boundary_edges, [])
    mesh.update()

    obj = bpy.data.objects.new("PHOTO_OUTLINE_REFERENCE_2D", mesh)
    bpy.context.collection.objects.link(obj)
    obj["source"] = "measured photo silhouette"
    obj["generator"] = "Blender bpy source boundary edges only"
    obj["depth_used"] = False
    obj["is_body_mesh"] = False

    args.output_dir.mkdir(parents=True, exist_ok=True)
    blend_path = args.output_dir / "photo-2d.blend"
    json_path = args.output_dir / "photo-2d.json"
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path), check_existing=False)
    payload = {
        "schemaVersion": "primestyle-blender-photo-outline/v2",
        "units": "centimetres",
        "source": "Measured saved-photo boundary stored as Blender edges; this is not claimed as a reconstructed body mesh",
        "generator": {
            "application": "Blender",
            "version": bpy.app.version_string,
            "headless": bool(bpy.app.background),
            "pythonApi": True,
            "operation": "boundary edges only; no generated faces or triangulation",
        },
        "heightCm": height_cm,
        "verticesCm": browser_vertices,
        "triangles": [],
        "outlineCm": [[round(x, 5), round(y, 5)] for x, y in outline_cm],
        "outlineSegmentsCm": outline_segments,
        "stats": {
            "vertexCount": len(browser_vertices),
            "triangleCount": 0,
            "outlinePointCount": len(outline_cm),
            "silhouetteSegmentCount": len(outline_segments),
        },
        "blendFile": blend_path.name,
    }
    json_path.write_text(json.dumps(payload, separators=(",", ":")) + "\n")
    print("BLENDER_PHOTO_OUTLINE_RESULT=" + json.dumps(payload["stats"], separators=(",", ":")))


if __name__ == "__main__":
    main()
