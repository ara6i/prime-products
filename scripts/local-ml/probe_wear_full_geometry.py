#!/usr/bin/env python3
"""One-subject, no-tape-leak probe for the full WEAR geometry contract.

Run with Blender.  This is a visual-canary precursor, not a bulk renderer and
not training code.  Each candidate is selected from PLY/LND anatomy first; the
recorded tape is attached only after selection for an honest diagnostic.
"""

from __future__ import annotations

import argparse
import heapq
import importlib.util
import json
import math
import sys
from pathlib import Path
from typing import Any

import bpy
import numpy as np
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[2]
RENDERER_PATH = ROOT / "scripts/local-ml/cloud/wear3d-v6/render_wear3d_multiview.py"
CONTRACT_PATH = ROOT / "scripts/local-ml/wear_full_contract.py"


def load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not import {path}")
    module = importlib.util.module_from_spec(spec)
    # dataclasses and other runtime helpers resolve annotations through
    # sys.modules while the module body is executing.
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


RENDERER = load_module("wear_v8_renderer", RENDERER_PATH)
CONTRACT = load_module("wear_full_contract", CONTRACT_PATH)


def parse_args() -> argparse.Namespace:
    argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--scan-id", required=True)
    parser.add_argument("--mesh-override-dir", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    return parser.parse_args(argv)


def record_for(path: Path, scan_id: str) -> dict[str, Any]:
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.strip():
            record = json.loads(line)
            if record.get("scan_id") == scan_id:
                return record
    raise KeyError(scan_id)


def perimeter(points: np.ndarray) -> float:
    return float(np.linalg.norm(np.diff(np.vstack((points, points[0])), axis=0), axis=1).sum())


def certify_ring(
    points: np.ndarray,
    *,
    min_width: float,
    max_width: float,
    min_depth: float,
    max_depth: float,
    raw_closed: bool = True,
    max_open_gap_m: float = 0.0,
) -> dict[str, Any] | None:
    if len(points) < 12 or not np.isfinite(points).all():
        return None
    path_m = float(np.linalg.norm(np.diff(points, axis=0), axis=1).sum())
    closure_gap_m = float(np.linalg.norm(points[0] - points[-1]))
    if not raw_closed and (
        max_open_gap_m <= 0.0
        or closure_gap_m > max_open_gap_m
        or closure_gap_m / max(path_m + closure_gap_m, 1e-9) > 0.08
    ):
        return None
    contour = RENDERER.resample_closed_contour(points, RENDERER.CONTOUR_POINTS)
    width, depth = contour.max(axis=0) - contour.min(axis=0)
    walked = perimeter(contour)
    if not (min_width <= width <= max_width and min_depth <= depth <= max_depth):
        return None
    if walked <= 0.0:
        return None
    return {
        "points": contour,
        "width_mm": float(width * 1000.0),
        "depth_mm": float(depth * 1000.0),
        "walked_mm": float(walked * 1000.0),
        "raw_slice_closed": bool(raw_closed),
        "closure_gap_mm": float(closure_gap_m * 1000.0),
        "closure_gap_ratio": float(closure_gap_m / max(path_m + closure_gap_m, 1e-9)),
    }


def attach_tape(candidate: dict[str, Any] | None, tape: float | None, protocol: str) -> dict[str, Any]:
    if candidate is None:
        return {"accepted": False, "protocol": protocol, "failure": "no-independent-geometry-candidate"}
    result = {
        "accepted": True,
        "protocol": protocol,
        "width_mm": round(candidate["width_mm"], 3),
        "depth_mm": round(candidate["depth_mm"], 3),
        "walked_mm": round(candidate["walked_mm"], 3),
        "points": [[round(float(x), 7), round(float(y), 7)] for x, y in candidate["points"]],
        "tape_used_to_select_geometry": False,
        "recorded_tape_mm": round(float(tape), 3) if tape is not None else None,
    }
    for key in ("raw_slice_closed", "closure_gap_mm", "closure_gap_ratio"):
        if key in candidate:
            result[key] = candidate[key]
    if tape is not None and tape > 0.0:
        result["walked_minus_tape_mm"] = round(candidate["walked_mm"] - tape, 3)
        result["walked_minus_tape_pct"] = round((candidate["walked_mm"] - tape) / tape * 100.0, 3)
    return result


def nearest_component_ring(
    components: list[dict[str, Any]],
    target_xy: np.ndarray,
    *,
    min_width: float,
    max_width: float,
    min_depth: float,
    max_depth: float,
    max_open_gap_m: float = 0.0,
) -> dict[str, Any] | None:
    candidates = []
    for component in components:
        ring = certify_ring(
            component["points"],
            min_width=min_width,
            max_width=max_width,
            min_depth=min_depth,
            max_depth=max_depth,
            raw_closed=bool(component.get("closed")),
            max_open_gap_m=max_open_gap_m,
        )
        if ring is None:
            continue
        distance = float(np.linalg.norm(np.asarray(component["centroid"]) - target_xy))
        candidates.append((distance, ring))
    return min(candidates, key=lambda item: item[0])[1] if candidates else None


def component_diagnostics(components: list[dict[str, Any]]) -> list[dict[str, Any]]:
    diagnostics = []
    for component in components:
        points = np.asarray(component["points"], dtype=np.float64)
        span = points.max(axis=0) - points.min(axis=0)
        path = float(np.linalg.norm(np.diff(points, axis=0), axis=1).sum())
        gap = float(np.linalg.norm(points[0] - points[-1]))
        diagnostics.append({
            "closed": bool(component.get("closed")),
            "point_count": int(len(points)),
            "span_u_mm": round(float(span[0] * 1000.0), 3),
            "span_v_mm": round(float(span[1] * 1000.0), 3),
            "closure_gap_mm": round(gap * 1000.0, 3),
            "closure_gap_ratio": round(gap / max(path + gap, 1e-9), 6),
            "centroid_mm": [round(float(value * 1000.0), 3) for value in component["centroid"]],
        })
    return diagnostics


def chest_scye(body, body_points: np.ndarray, landmarks: dict[str, Vector], tape: float | None) -> dict[str, Any]:
    axillae = [landmarks.get(name) for name in (
        "Rt. Axilla, Ant", "Rt. Axilla, Post.", "Lt. Axilla, Ant", "Lt. Axilla, Post.",
    )]
    valid = [point for point in axillae if point is not None]
    if len(valid) < 3:
        return {"accepted": False, "protocol": "horizontal-torso-section-at-axilla", "failure": "missing-axilla-landmarks"}
    height = float(np.mean([point.z for point in valid]))
    geometry = RENDERER.torso_contour(
        body,
        body_points,
        height,
        RENDERER.BASE.torso_bounds(landmarks, "chest"),
        tape,
    )
    if geometry is None:
        return {"accepted": False, "protocol": "horizontal-torso-section-at-axilla", "failure": "no-independent-geometry-candidate"}
    candidate = {
        # Keep the real metric PLY ring here. Normalized shape points are a
        # derived training target and must never replace the surface geometry
        # used for the visual line proof.
        "points": np.asarray(
            [[float(point.x), float(point.y)] for point in geometry["contour_world_points"]],
            dtype=np.float64,
        ),
        "width_mm": geometry["width_mm"],
        "depth_mm": geometry["depth_mm"],
        "walked_mm": geometry["perimeter_mm"],
    }
    result = attach_tape(candidate, tape, "horizontal-torso-section-at-axilla")
    result["height_mm"] = round(height * 1000.0, 3)
    result["certified_section"] = geometry.get("certified_section", False)
    return result


def ankle(body, landmarks: dict[str, Vector], tape: float | None) -> dict[str, Any]:
    lateral = landmarks.get("Rt. Lateral Malleolus")
    medial = landmarks.get("Rt. Medial Malleolus")
    knee_lateral = landmarks.get("Rt. Femoral Lateral Epicn")
    knee_medial = landmarks.get("Rt. Femoral Medial Epicn")
    if any(point is None for point in (lateral, medial, knee_lateral, knee_medial)):
        return {"accepted": False, "protocol": "horizontal-right-leg-section", "failure": "missing-right-ankle-landmarks"}
    target = (lateral + medial) / 2.0
    knee = (knee_lateral + knee_medial) / 2.0
    normal = (knee - target).normalized()
    basis_u = (medial - lateral).normalized()
    basis_v = normal.cross(basis_u).normalized()
    components = RENDERER.mesh_plane_section_components(body, target, normal, basis_u, basis_v)
    ring = nearest_component_ring(
        components,
        np.asarray((0.0, 0.0)),
        min_width=0.035,
        max_width=0.18,
        min_depth=0.025,
        max_depth=0.20,
        max_open_gap_m=0.012,
    )
    result = attach_tape(ring, tape, "right-ankle-plane-perpendicular-to-lower-leg")
    result["height_mm"] = round(target.z * 1000.0, 3)
    result["component_diagnostics"] = component_diagnostics(components)
    return result


def head(body, landmarks: dict[str, Vector], body_points: np.ndarray, tape: float | None) -> dict[str, Any]:
    tragions = [landmarks.get("Rt. Tragion"), landmarks.get("Lt. Tragion")]
    valid = [point for point in tragions if point is not None]
    if len(valid) != 2:
        return {"accepted": False, "protocol": "maximum-horizontal-head-section", "failure": "missing-tragion-landmarks"}
    target_xy = np.mean([[point.x, point.y] for point in valid], axis=0)
    low = max(point.z for point in valid) + 0.005
    high = float(body_points[:, 2].max()) - 0.012
    candidates = []
    for height in np.linspace(low, high, 40):
        ring = nearest_component_ring(
            RENDERER.horizontal_section_components(body, float(height)),
            target_xy,
            min_width=0.10,
            max_width=0.26,
            min_depth=0.12,
            max_depth=0.30,
            max_open_gap_m=0.015,
        )
        if ring is not None:
            candidates.append((ring["walked_mm"], float(height), ring))
    if not candidates:
        return {"accepted": False, "protocol": "maximum-horizontal-head-section", "failure": "no-independent-geometry-candidate"}
    _, height, ring = max(candidates, key=lambda item: item[0])
    result = attach_tape(ring, tape, "maximum-horizontal-head-section")
    result["height_mm"] = round(height * 1000.0, 3)
    return result


def thigh(body, landmarks: dict[str, Vector], tape: float | None) -> dict[str, Any]:
    crotch = landmarks.get("Crotch")
    trochanter = landmarks.get("Rt. Trochanterion")
    knee = landmarks.get("Rt. Knee Crease")
    if crotch is None or trochanter is None or knee is None:
        return {"accepted": False, "protocol": "highest-right-thigh-section", "failure": "missing-right-thigh-landmarks"}
    target_xy = np.asarray((trochanter.x, trochanter.y))
    top = min(crotch.z, trochanter.z + 0.045)
    bottom = max(knee.z + 0.18, top - 0.22)
    stable = []
    for height in np.linspace(top, bottom, 45):
        ring = nearest_component_ring(
            RENDERER.horizontal_section_components(body, float(height)),
            target_xy,
            min_width=0.10,
            max_width=0.32,
            min_depth=0.10,
            max_depth=0.38,
            max_open_gap_m=0.015,
        )
        if ring is not None:
            stable.append((float(height), ring))
    if not stable:
        return {"accepted": False, "protocol": "highest-right-thigh-section", "failure": "no-independent-geometry-candidate"}
    height, ring = max(stable, key=lambda item: item[0])
    result = attach_tape(ring, tape, "highest-right-thigh-section")
    result["height_mm"] = round(height * 1000.0, 3)
    return result


def local_plane_ring(
    body,
    origin: Vector,
    normal: Vector,
    basis_u: Vector,
    basis_v: Vector,
    *,
    min_width: float,
    max_width: float,
    min_depth: float,
    max_depth: float,
    max_open_gap_m: float = 0.0,
) -> dict[str, Any] | None:
    components = RENDERER.mesh_plane_section_components(body, origin, normal, basis_u, basis_v)
    return nearest_component_ring(
        components,
        np.asarray((0.0, 0.0)),
        min_width=min_width,
        max_width=max_width,
        min_depth=min_depth,
        max_depth=max_depth,
        max_open_gap_m=max_open_gap_m,
    )


def hand(body, landmarks: dict[str, Vector], tape: float | None) -> dict[str, Any]:
    second = landmarks.get("Rt. Metacarpal Phal. II")
    fifth = landmarks.get("Rt. Metacarpal-Phal. V")
    radial = landmarks.get("Rt. Radial Styloid")
    ulnar = landmarks.get("Rt. Ulnar Styloid")
    if any(point is None for point in (second, fifth, radial, ulnar)):
        return {"accepted": False, "protocol": "local-metacarpal-section", "failure": "missing-right-hand-landmarks"}
    origin = (second + fifth) / 2.0
    wrist = (radial + ulnar) / 2.0
    normal = (origin - wrist).normalized()
    basis_u = (fifth - second).normalized()
    basis_v = normal.cross(basis_u).normalized()
    components = RENDERER.mesh_plane_section_components(body, origin, normal, basis_u, basis_v)
    ring = nearest_component_ring(
        components,
        np.asarray((0.0, 0.0)),
        min_width=0.035, max_width=0.14, min_depth=0.012, max_depth=0.09,
        max_open_gap_m=0.010,
    )
    result = attach_tape(ring, tape, "local-metacarpal-section")
    result["component_diagnostics"] = component_diagnostics(components)
    return result


def mesh_graph(body) -> tuple[np.ndarray, list[dict[int, float]]]:
    vertices = np.asarray([tuple(vertex.co + body.location) for vertex in body.data.vertices], dtype=np.float64)
    neighbors: list[dict[int, float]] = [dict() for _ in range(len(vertices))]
    for polygon in body.data.polygons:
        indices = list(polygon.vertices)
        for index, first in enumerate(indices):
            second = indices[(index + 1) % len(indices)]
            weight = float(np.linalg.norm(vertices[first] - vertices[second]))
            old = neighbors[first].get(second)
            if old is None or weight < old:
                neighbors[first][second] = weight
                neighbors[second][first] = weight
    return vertices, neighbors


def nearest_vertex(vertices: np.ndarray, point: Vector) -> int:
    return int(np.argmin(np.linalg.norm(vertices - np.asarray(tuple(point))[None, :], axis=1)))


def shortest_path(neighbors: list[dict[int, float]], start: int, target: int) -> list[int]:
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
        raise RuntimeError("surface waypoints are disconnected")
    path = [target]
    while path[-1] != start:
        path.append(previous[path[-1]])
    path.reverse()
    return path


def surface_path(body, landmarks: dict[str, Vector], names: list[str], tape: float | None, protocol: str) -> dict[str, Any]:
    waypoints = [landmarks.get(name) for name in names]
    if any(point is None for point in waypoints):
        return {"accepted": False, "protocol": protocol, "failure": "missing-surface-path-landmarks"}
    vertices, neighbors = mesh_graph(body)
    waypoint_vertices = [nearest_vertex(vertices, point) for point in waypoints]
    walked_indices: list[int] = []
    segment_lengths_mm: list[float] = []
    for start, target in zip(waypoint_vertices, waypoint_vertices[1:] + waypoint_vertices[:1]):
        segment = shortest_path(neighbors, start, target)
        segment_points = vertices[segment]
        segment_lengths_mm.append(float(np.linalg.norm(np.diff(segment_points, axis=0), axis=1).sum() * 1000.0))
        walked_indices.extend(segment[:-1])
    walked_points = vertices[walked_indices]
    walked_mm = float(np.linalg.norm(np.diff(np.vstack((walked_points, walked_points[0])), axis=0), axis=1).sum() * 1000.0)
    planar = walked_points[:, :2]
    width_mm = float(np.ptp(planar[:, 0]) * 1000.0)
    depth_mm = float(np.ptp(planar[:, 1]) * 1000.0)
    shape_points = RENDERER.resample_closed_contour(planar, RENDERER.CONTOUR_POINTS)
    result = {
        "accepted": True,
        "protocol": protocol,
        "path_landmarks": names,
        "walked_mm": round(walked_mm, 3),
        "width_mm": round(width_mm, 3),
        "depth_mm": round(depth_mm, 3),
        "points": [[round(float(x), 7), round(float(y), 7)] for x, y in shape_points],
        "path_vertex_count": len(walked_indices),
        "segment_lengths_mm": [round(value, 3) for value in segment_lengths_mm],
        "tape_used_to_select_geometry": False,
        "recorded_tape_mm": round(float(tape), 3) if tape is not None else None,
        # A shortest path is only a diagnostic proposal.  It is not a teacher
        # until the protocol path is independently certified visually.
        "geometry_certified": False,
        "path_world_points_m": [
            [round(float(x), 7), round(float(y), 7), round(float(z), 7)]
            for x, y, z in walked_points
        ],
    }
    if tape is not None and tape > 0:
        result["walked_minus_tape_mm"] = round(walked_mm - tape, 3)
        result["walked_minus_tape_pct"] = round((walked_mm - tape) / tape * 100.0, 3)
    return result


def add_projection(result: dict[str, Any], scene, camera) -> None:
    """Attach exact front-camera proof coordinates without changing geometry."""
    if result.get("accepted") is not True:
        result["geometry_certified"] = False
        result["circumference_teacher_accepted"] = False
        return
    projected = []
    if result.get("points") and result.get("height_mm") is not None:
        height_m = float(result["height_mm"]) / 1000.0
        for x, y in result["points"]:
            point = RENDERER.BASE.project(scene, camera, Vector((float(x), float(y), height_m)))
            if point.get("visible"):
                projected.append([round(float(point["x"]), 7), round(float(point["y"]), 7)])
        if projected:
            xs = [point[0] for point in projected]
            ys = [point[1] for point in projected]
            result["projected_contour"] = projected
            result["projected_line"] = {
                "left_x_norm": round(min(xs), 7),
                "right_x_norm": round(max(xs), 7),
                "y_norm": round(float(np.median(ys)), 7),
            }
    if result.get("path_world_points_m"):
        for x, y, z in result["path_world_points_m"]:
            point = RENDERER.BASE.project(scene, camera, Vector((float(x), float(y), float(z))))
            if point.get("visible"):
                projected.append([round(float(point["x"]), 7), round(float(point["y"]), 7)])
        result["projected_path"] = projected
        result.pop("path_world_points_m", None)

    if "geometry_certified" not in result:
        # Closed raw PLY rings (head, thigh, ankle, hand) are independently
        # certified by the component/range checks. Reconstructed torso rows
        # carry their explicit renderer certification flag.
        result["geometry_certified"] = bool(result.get("certified_section", True))
    tape = result.get("recorded_tape_mm")
    delta = result.get("walked_minus_tape_pct")
    result["circumference_teacher_accepted"] = bool(
        result["geometry_certified"]
        and tape is not None
        and delta is not None
        and abs(float(delta)) <= 5.0
    )


def main() -> None:
    args = parse_args()
    source = record_for(args.manifest, args.scan_id)
    record = RENDERER.apply_mesh_override(source, args.mesh_override_dir)
    RENDERER.BASE.clean_scene()
    scene = bpy.context.scene
    RENDERER.configure_scene(scene)
    body, transform, offset, height_m = RENDERER.BASE.import_body(record)
    landmarks, landmark_contract = RENDERER.canonicalize_landmarks(
        RENDERER.BASE.transform_landmarks(record, transform, offset)
    )
    raw = np.empty(len(body.data.vertices) * 3, dtype=np.float64)
    body.data.vertices.foreach_get("co", raw)
    body_points = raw.reshape((-1, 3)) + np.asarray(body.location)[None, :]
    tapes = record.get("measurements_mm") or {}
    existing, masked = RENDERER.prepare_geometry_rows(record, body, body_points, landmarks)
    results: dict[str, Any] = {
        "schema": "wear-full-geometry-probe/v1",
        "scan_id": args.scan_id,
        "landmark_contract": landmark_contract,
        "existing_rows": {
            name: {
                # `row_present` only means an anatomical candidate was found.
                # It must never be confused with teacher acceptance.
                "row_present": name not in masked,
                "accepted": name not in masked,
                "width_mm": round(float(value["width_mm"]), 3),
                "depth_mm": round(float(value["depth_mm"]), 3),
                "walked_mm": round(float(value["perimeter_mm"]), 3),
                "recorded_tape_mm": value.get("measurement_circumference_mm"),
                "tape_used_to_select_geometry": False,
                "geometry_certified": bool(value.get("geometry_target_valid")),
                "circumference_teacher_accepted": bool(value.get("tape_target_valid")),
                "contour_source": value.get("contour_source"),
                "raw_slice_closed": bool(value.get("raw_slice_closed")),
                "closure_gap_mm": value.get("closure_gap_mm"),
                "closure_ratio": value.get("closure_ratio"),
                "anatomy_bounds_width_mm": value.get("anatomy_bounds_width_mm"),
                "edge_within_anatomy_bounds": value.get("edge_within_anatomy_bounds"),
                "stitch_evidence": value.get("stitch_evidence"),
                "geometry_rejection_reasons": (
                    []
                    if value.get("geometry_target_valid") is True
                    else [
                        reason
                        for reason in (
                            "raw-PLY-section-is-open" if value.get("raw_slice_closed") is not True else None,
                            "certified-landmark-bounded-stitch-failed"
                            if not (value.get("stitch_evidence") or {}).get("certified")
                            else None,
                            "fallback-hull-is-diagnostic-only"
                            if "fallback" in str(value.get("contour_source") or "")
                            else None,
                        )
                        if reason
                    ]
                ),
            }
            for name, value in existing.items()
        },
        "new_protocols": {},
    }
    horizontal_chest_scye = chest_scye(body, body_points, landmarks, tapes.get("chest_scye_circumference_mm"))
    results["new_protocols"]["chest_scye"] = surface_path(
        body,
        landmarks,
        ["Rt. Axilla, Ant", "Lt. Axilla, Ant", "Lt. Axilla, Post.", "Rt. Axilla, Post."],
        tapes.get("chest_scye_circumference_mm"),
        "closed-axilla-landmark-constrained-torso-surface-path",
    )
    results["new_protocols"]["chest_scye"]["horizontal_section_diagnostic"] = {
        key: horizontal_chest_scye.get(key)
        for key in ("accepted", "width_mm", "depth_mm", "walked_mm", "walked_minus_tape_pct", "certified_section", "failure")
    }
    results["new_protocols"]["ankle"] = ankle(body, landmarks, tapes.get("ankle_circumference_mm"))
    results["new_protocols"]["head"] = head(body, landmarks, body_points, tapes.get("head_circumference_mm"))
    results["new_protocols"]["thigh"] = thigh(body, landmarks, tapes.get("thigh_circumference_mm"))
    results["new_protocols"]["hand"] = hand(body, landmarks, tapes.get("hand_circumference_mm"))
    results["new_protocols"]["armscye"] = surface_path(
        body,
        landmarks,
        ["Rt. Acromion", "Rt. Axilla, Post.", "Rt. Axilla, Ant"],
        tapes.get("armscye_circumference_mm"),
        "closed-landmark-constrained-surface-path",
    )
    shoulder = (landmarks["Rt. Clavicale"] + landmarks["Rt. Acromion"]) / 2.0
    landmarks = {**landmarks, "Rt. Shoulder Line Midpoint": shoulder}
    results["new_protocols"]["vertical_trunk"] = surface_path(
        body,
        landmarks,
        ["Rt. Shoulder Line Midpoint", "Rt. PSIS", "Crotch", "Rt. ASIS", "Rt. Thelion/Bustpoint"],
        tapes.get("vertical_trunk_circumference_mm"),
        "closed-landmark-constrained-surface-path",
    )
    camera, camera_data = RENDERER.add_perspective_camera(height_m, RENDERER.DEFAULT_VIEWS[0])
    results["camera"] = camera_data
    for value in results["new_protocols"].values():
        add_projection(value, scene, camera)
    bpy.data.objects.remove(camera, do_unlink=True)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(results, indent=2, sort_keys=True), encoding="utf-8")
    print(json.dumps({
        "output": str(args.output),
        "scan_id": args.scan_id,
        "accepted": {name: value.get("accepted") for name, value in results["new_protocols"].items()},
    }, indent=2))


if __name__ == "__main__":
    main()
