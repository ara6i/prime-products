#!/usr/bin/env python3
"""Build small browser-ready GLB wireframe sources from real WEAR PLY scans.

Run with Blender:
  blender --background --python scripts/local-ml/build_wear_mesh_overlay_assets.py

The output is deliberately stored under .local-ml and served only through the
guarded Test Lab API. It is not copied to public/.
"""

from __future__ import annotations

import gzip
import json
import math
import shutil
import tempfile
from pathlib import Path

import bmesh
import bpy
from mathutils import Vector


REPO_ROOT = Path(__file__).resolve().parents[2]
SOURCE_DIR = REPO_ROOT / ".local-ml/blender/delaram-similarity/sources"
OUTPUT_DIR = REPO_ROOT / ".local-ml/wear-mesh-overlay/models"
SOURCE_MANIFEST = REPO_ROOT / ".local-ml/wear3d-v6-audit/source-manifest-standing-a.jsonl"
TARGET_FACE_COUNT = 18_000

SUBJECTS = [
    {
        "scan_id": "NA-0087-A",
        "stem": "csr0087a",
        "height_cm": 167.1,
        "weight_kg": 70.068,
        "color": "#38bdf8",
    },
    {
        "scan_id": "NA-0252-A",
        "stem": "csr0252a",
        "height_cm": 167.6,
        "weight_kg": 70.068,
        "color": "#fbbf24",
    },
    {
        "scan_id": "NA-1591-A",
        "stem": "csr1591a",
        "height_cm": 168.1,
        "weight_kg": 70.975,
        "color": "#22d3ee",
    },
    {
        "scan_id": "NA-1420-A",
        "stem": "csr1420a",
        "height_cm": 167.9,
        "weight_kg": 71.429,
        "color": "#fb7185",
    },
    {
        "scan_id": "NA-1220-A",
        "stem": "csr1220a",
        "height_cm": 168.3,
        "weight_kg": 70.295,
        "color": "#a78bfa",
    },
    {
        "scan_id": "NA-3013-A",
        "stem": "csr3013a",
        "height_cm": 168.8,
        "weight_kg": 70.975,
        "color": "#34d399",
    },
    {
        "scan_id": "NL-1344-A",
        "stem": "nl_1344a",
        "height_cm": 167.4,
        "weight_kg": 71.3,
        "color": "#f472b6",
    },
    {
        "scan_id": "NL-5934-A",
        "stem": "nl_5934a",
        "height_cm": 168.8,
        "weight_kg": 70.7,
        "color": "#2dd4bf",
    },
    {
        "scan_id": "NL-6759-A",
        "stem": "nl_6759a",
        "height_cm": 168.6,
        "weight_kg": 70.3,
        "color": "#fb923c",
    },
]


def load_display_metadata(subjects: list[dict]) -> list[dict]:
    """Attach real WEAR profile/measurements without using them to build the mesh."""
    wanted = {str(subject["scan_id"]) for subject in subjects}
    records: dict[str, dict] = {}
    for raw_line in SOURCE_MANIFEST.read_text().splitlines():
        if not raw_line.strip():
            continue
        record = json.loads(raw_line)
        scan_id = str(record.get("scan_id") or "")
        if scan_id in wanted:
            records[scan_id] = record
            if len(records) == len(wanted):
                break
    missing = sorted(wanted - records.keys())
    if missing:
        raise RuntimeError(f"Missing WEAR display metadata for: {', '.join(missing)}")

    enriched: list[dict] = []
    for subject in subjects:
        record = records[str(subject["scan_id"])]
        measurements = record.get("measurements_mm") or {}
        enriched.append(
            {
                **subject,
                "gender": str(record.get("gender") or ""),
                "height_cm": float(record["height_cm"]),
                "weight_kg": float(record["weight_kg"]),
                "measurements_cm": {
                    "chest": float(measurements["chest_circumference_mm"]) / 10.0,
                    "waist": float(measurements["waist_circumference_mm"]) / 10.0,
                    "hips": float(measurements["hip_circumference_mm"]) / 10.0,
                },
            }
        )
    return enriched


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for meshes in list(bpy.data.meshes):
        if meshes.users == 0:
            bpy.data.meshes.remove(meshes)


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
    front = sum((point for point in front_points if point is not None), Vector()) / 2.0
    back = sum((point for point in back_points if point is not None), Vector()) / 2.0
    direction = front - back
    # Matches the front orientation used by the verified Blender gallery.
    return -math.pi / 2.0 - math.atan2(direction.y, direction.x)


def world_bounds(obj: bpy.types.Object) -> tuple[Vector, Vector]:
    corners = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    return (
        Vector((min(p.x for p in corners), min(p.y for p in corners), min(p.z for p in corners))),
        Vector((max(p.x for p in corners), max(p.y for p in corners), max(p.z for p in corners))),
    )


def remove_scan_floor_and_loose_parts(body: bpy.types.Object) -> dict[str, int]:
    """Remove the scanner floor sheet, then keep the largest connected body."""
    mesh = body.data
    working = bmesh.new()
    working.from_mesh(mesh)
    working.verts.ensure_lookup_table()
    original_vertices = len(working.verts)
    original_faces = len(working.faces)
    minimum_z = min(vertex.co.z for vertex in working.verts)
    floor_limit = minimum_z + 0.018
    floor_faces = [
        face
        for face in working.faces
        if max(vertex.co.z for vertex in face.verts) <= floor_limit
    ]
    if floor_faces:
        bmesh.ops.delete(working, geom=floor_faces, context="FACES")
    loose_vertices = [vertex for vertex in working.verts if not vertex.link_faces]
    if loose_vertices:
        bmesh.ops.delete(working, geom=loose_vertices, context="VERTS")

    unvisited = set(working.verts)
    components: list[list[bmesh.types.BMVert]] = []
    while unvisited:
        seed = unvisited.pop()
        component = [seed]
        stack = [seed]
        while stack:
            current = stack.pop()
            for edge in current.link_edges:
                other = edge.other_vert(current)
                if other in unvisited:
                    unvisited.remove(other)
                    component.append(other)
                    stack.append(other)
        components.append(component)
    if not components:
        working.free()
        raise RuntimeError(f"Floor cleanup removed the whole scan for {body.name}.")
    largest = max(components, key=len)
    keep = set(largest)
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


def import_and_prepare(subject: dict, temp_dir: Path) -> tuple[bpy.types.Object, dict]:
    source = SOURCE_DIR / f"{subject['stem']}.ply.gz"
    landmark_source = SOURCE_DIR / f"{subject['stem']}.lnd"
    if not source.exists() or not landmark_source.exists():
        raise FileNotFoundError(f"Missing WEAR source pair for {subject['scan_id']}")

    uncompressed = temp_dir / f"{subject['stem']}.ply"
    with gzip.open(source, "rb") as source_file, uncompressed.open("wb") as target_file:
        shutil.copyfileobj(source_file, target_file)

    before = set(bpy.data.objects)
    bpy.ops.wm.ply_import(filepath=str(uncompressed))
    imported = [obj for obj in bpy.data.objects if obj not in before and obj.type == "MESH"]
    if len(imported) != 1:
        raise RuntimeError(f"Expected one mesh for {subject['scan_id']}, got {len(imported)}")
    body = imported[0]
    body.name = subject["scan_id"]
    cleanup = remove_scan_floor_and_loose_parts(body)

    # WEAR regions do not share one raw PLY unit scale.  Normalize the whole
    # scan from its cleaned vertical span to the recorded stature before any
    # browser comparison.  This is a single uniform scale; body proportions
    # and the original surface shape stay unchanged.
    raw_low, raw_high = world_bounds(body)
    raw_height = raw_high.z - raw_low.z
    if raw_height <= 0:
        raise RuntimeError(f"Invalid body height for {subject['scan_id']}")
    target_height_m = float(subject["height_cm"]) / 100.0
    scale_factor = target_height_m / raw_height
    body.scale = Vector((scale_factor, scale_factor, scale_factor))
    bpy.context.view_layer.objects.active = body
    body.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)

    body.rotation_euler.z = front_yaw(parse_landmarks(landmark_source))
    bpy.context.view_layer.objects.active = body
    body.select_set(True)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)

    low, high = world_bounds(body)
    body.location += Vector((-(low.x + high.x) / 2.0, -(low.y + high.y) / 2.0, -low.z))
    bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)

    original_faces = len(body.data.polygons)
    if original_faces > TARGET_FACE_COUNT:
        modifier = body.modifiers.new(name="Browser decimation", type="DECIMATE")
        modifier.decimate_type = "COLLAPSE"
        modifier.ratio = TARGET_FACE_COUNT / original_faces
        modifier.use_collapse_triangulate = True
        bpy.context.view_layer.objects.active = body
        bpy.ops.object.modifier_apply(modifier=modifier.name)

    for polygon in body.data.polygons:
        polygon.use_smooth = True

    low, high = world_bounds(body)
    return body, {
        "scanId": subject["scan_id"],
        "heightCm": subject["height_cm"],
        "weightKg": subject["weight_kg"],
        "gender": subject["gender"],
        "measurementsCm": subject["measurements_cm"],
        "measurementsUsage": "display only; never used to build, filter, or rank this mesh",
        "color": subject["color"],
        "source": "real WEAR PLY standing scan",
        "scaleNormalization": {
            "method": "uniform cleaned mesh span to recorded WEAR stature",
            "rawHeight": round(raw_height, 6),
            "targetHeightMeters": round(target_height_m, 6),
            "scaleFactor": round(scale_factor, 9),
        },
        "scanCleanup": cleanup,
        "originalFaceCount": original_faces,
        "browserFaceCount": len(body.data.polygons),
        "boundsMeters": {
            # Blender is Z-up. The glTF exporter performs the single required
            # conversion to browser Y-up: (x, y, z) -> (x, z, -y).
            "minimum": [round(low.x, 6), round(low.z, 6), round(-high.y, 6)],
            "maximum": [round(high.x, 6), round(high.z, 6), round(-low.y, 6)],
        },
    }


def export_subject(subject: dict, temp_dir: Path) -> dict:
    clear_scene()
    body, metadata = import_and_prepare(subject, temp_dir)
    bpy.ops.object.select_all(action="DESELECT")
    body.select_set(True)
    bpy.context.view_layer.objects.active = body
    output = OUTPUT_DIR / f"{subject['scan_id'].lower()}.glb"
    bpy.ops.export_scene.gltf(
        filepath=str(output),
        export_format="GLB",
        use_selection=True,
        export_apply=True,
        export_materials="NONE",
        export_yup=True,
    )
    metadata["file"] = output.name
    metadata["bytes"] = output.stat().st_size
    return metadata


def main() -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="wear-mesh-overlay-") as temporary:
        temp_dir = Path(temporary)
        records = [
            export_subject(subject, temp_dir)
            for subject in load_display_metadata(SUBJECTS)
        ]
    (OUTPUT_DIR / "index.json").write_text(json.dumps({"models": records}, indent=2) + "\n")
    print(json.dumps({"output": str(OUTPUT_DIR), "models": records}, indent=2))


if __name__ == "__main__":
    main()
