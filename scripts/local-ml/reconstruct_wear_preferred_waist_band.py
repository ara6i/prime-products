#!/usr/bin/env python3
"""Tape-blind preferred-waist reconstruction for one exact WEAR PLY.

The CAESAR protocol defines the waist with an elastic preferred-waist band.
This diagnostic uses only independent WEAR geometry to build an approximate
band plane:

* the exact posterior preferred-waist landmark;
* the recorded right-side preferred-waist height;
* the recorded front-waist surface length, walked from Suprasternale over the
  exact PLY surface as the closest available 3-D front-neck-base anchor.

Only after the plane has intersected the PLY and produced a closed contour is
the recorded tape value revealed.  The script never moves a plane to fit tape.

Run with Blender:

  blender --background --python scripts/local-ml/reconstruct_wear_preferred_waist_band.py
"""

from __future__ import annotations

import heapq
import importlib.util
import json
import math
import sys
from pathlib import Path

import bpy
import numpy as np
from mathutils import Vector


PROJECT_ROOT = Path(__file__).resolve().parents[2]
MANIFEST = PROJECT_ROOT / ".local-ml/wear3d-v6-audit/source-manifest-standing-a.jsonl"
SOURCE_ROOT = PROJECT_ROOT / ".local-ml/wear-mesh-overlay/dynamic-sources"
OUTPUT = PROJECT_ROOT / ".local-ml/reports/it-4028-a-reconstructed-waist-band.png"
METADATA = PROJECT_ROOT / ".local-ml/reports/it-4028-a-reconstructed-waist-band.json"
SCAN_ID = "IT-4028-A"


def import_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not import {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


def load_record() -> dict:
    for line in MANIFEST.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        record = json.loads(line)
        if str(record.get("scan_id", "")).upper() != SCAN_ID:
            continue
        source_name = Path(record["source"]["mesh"]).name
        local_mesh = SOURCE_ROOT / SCAN_ID.lower() / source_name
        if not local_mesh.is_file():
            raise FileNotFoundError(local_mesh)
        return {**record, "source": {**record["source"], "mesh": str(local_mesh)}}
    raise RuntimeError(f"{SCAN_ID} not found")


def world_vertices(body) -> np.ndarray:
    values = [0.0] * (len(body.data.vertices) * 3)
    body.data.vertices.foreach_get("co", values)
    return np.asarray(values, dtype=np.float64).reshape((-1, 3)) + np.asarray(body.location)[None, :]


def mesh_graph(body, points: np.ndarray) -> list[dict[int, float]]:
    adjacency: list[dict[int, float]] = [dict() for _ in range(len(points))]
    for polygon in body.data.polygons:
        indices = list(polygon.vertices)
        for index, first in enumerate(indices):
            second = indices[(index + 1) % len(indices)]
            if first == second:
                continue
            weight = float(np.linalg.norm(points[first] - points[second]))
            previous = adjacency[first].get(second)
            if previous is None or weight < previous:
                adjacency[first][second] = weight
                adjacency[second][first] = weight
    return adjacency


def nearest_vertex(points: np.ndarray, point: Vector) -> int:
    target = np.asarray(point, dtype=np.float64)
    return int(np.argmin(np.linalg.norm(points - target[None, :], axis=1)))


def dijkstra(
    adjacency: list[dict[int, float]],
    start: int,
    cutoff_m: float,
) -> tuple[np.ndarray, np.ndarray]:
    distances = np.full(len(adjacency), np.inf, dtype=np.float64)
    previous = np.full(len(adjacency), -1, dtype=np.int64)
    distances[start] = 0.0
    queue: list[tuple[float, int]] = [(0.0, start)]
    while queue:
        distance, current = heapq.heappop(queue)
        if distance != distances[current]:
            continue
        if distance > cutoff_m:
            break
        for neighbor, weight in adjacency[current].items():
            candidate = distance + weight
            if candidate >= distances[neighbor] or candidate > cutoff_m:
                continue
            distances[neighbor] = candidate
            previous[neighbor] = current
            heapq.heappush(queue, (candidate, neighbor))
    return distances, previous


def restore_path(previous: np.ndarray, start: int, end: int) -> list[int]:
    path = [end]
    current = end
    while current != start:
        current = int(previous[current])
        if current < 0:
            raise RuntimeError("Front-waist geodesic did not reach its endpoint")
        path.append(current)
    path.reverse()
    return path


def choose_anterior_waist(
    points: np.ndarray,
    neck_distances: np.ndarray,
    crotch_distances: np.ndarray,
    posterior_to_crotch_m: float,
    center_x: float,
    front_sign: float,
    posterior_y: float,
    source_height_m: float,
    target_front_length_m: float,
    target_crotch_length_m: float,
) -> tuple[int, dict]:
    # Search only the front midsagittal body surface in a plausible waist
    # region.  Bin-wise extrema ensure an interior mesh vertex cannot satisfy
    # the scalar length by accident.
    z_low = source_height_m - 0.18
    z_high = source_height_m + 0.12
    central = (
        (np.abs(points[:, 0] - center_x) <= 0.035)
        & (points[:, 2] >= z_low)
        & (points[:, 2] <= z_high)
        & np.isfinite(neck_distances)
        & np.isfinite(crotch_distances)
    )
    central_indices = np.nonzero(central)[0]
    if not len(central_indices):
        raise RuntimeError("No reachable front midsagittal waist candidates")

    bins = np.floor(points[central_indices, 2] / 0.004).astype(np.int64)
    front_extreme: dict[int, float] = {}
    for vertex_index, bin_index in zip(central_indices.tolist(), bins.tolist()):
        value = float(front_sign * points[vertex_index, 1])
        front_extreme[bin_index] = max(front_extreme.get(bin_index, -math.inf), value)

    candidates = []
    for vertex_index, bin_index in zip(central_indices.tolist(), bins.tolist()):
        point = points[vertex_index]
        front_value = float(front_sign * point[1])
        if front_extreme[bin_index] - front_value > 0.005:
            continue
        if front_sign * (float(point[1]) - posterior_y) < 0.10:
            continue
        front_length_error = abs(float(neck_distances[vertex_index]) - target_front_length_m)
        reconstructed_crotch_length = posterior_to_crotch_m + float(crotch_distances[vertex_index])
        crotch_length_error = abs(reconstructed_crotch_length - target_crotch_length_m)
        midline_error = abs(float(point[0]) - center_x)
        # Total crotch length uses the exact posterior preferred-waist and
        # crotch landmarks, so it owns the score.  Waist-front length is only
        # a weak cross-check because its physical chain landmark is absent
        # from the stored LND file and Suprasternale is merely a proxy.
        height_tiebreaker = abs(float(point[2]) - source_height_m)
        score = (
            crotch_length_error
            + 0.12 * front_length_error
            + 0.12 * midline_error
            + 0.015 * height_tiebreaker
        )
        candidates.append((
            score,
            vertex_index,
            crotch_length_error,
            front_length_error,
            reconstructed_crotch_length,
            midline_error,
        ))
    if not candidates:
        raise RuntimeError("No front-surface candidates survived")
    candidates.sort()
    (
        _,
        selected,
        crotch_length_error,
        front_length_error,
        reconstructed_crotch_length,
        midline_error,
    ) = candidates[0]
    return selected, {
        "candidate_count": len(candidates),
        "target_front_length_mm": target_front_length_m * 1000.0,
        "walked_front_length_from_suprasternale_proxy_mm": float(neck_distances[selected] * 1000.0),
        "front_length_proxy_error_mm": float(front_length_error * 1000.0),
        "target_total_crotch_length_mm": target_crotch_length_m * 1000.0,
        "posterior_to_crotch_geodesic_mm": posterior_to_crotch_m * 1000.0,
        "reconstructed_total_crotch_length_mm": reconstructed_crotch_length * 1000.0,
        "total_crotch_length_error_mm": float(crotch_length_error * 1000.0),
        "midline_error_mm": float(midline_error * 1000.0),
    }


def resample_closed(points: np.ndarray, count: int = 32) -> np.ndarray:
    closed = np.vstack((points, points[0]))
    lengths = np.linalg.norm(np.diff(closed, axis=0), axis=1)
    cumulative = np.concatenate(([0.0], np.cumsum(lengths)))
    total = float(cumulative[-1])
    targets = np.linspace(0.0, total, count, endpoint=False)
    result = []
    for target in targets:
        index = min(int(np.searchsorted(cumulative, target, side="right") - 1), len(lengths) - 1)
        local = 0.0 if lengths[index] <= 1e-12 else (target - cumulative[index]) / lengths[index]
        result.append(closed[index] + local * (closed[index + 1] - closed[index]))
    return np.asarray(result, dtype=np.float64)


def walk_ordered_polyline(
    points: np.ndarray,
    start_index: int,
    direction: int,
    target_length_m: float,
    closed: bool,
) -> tuple[np.ndarray, np.ndarray, float] | None:
    count = len(points)
    current_index = start_index
    current = points[current_index]
    path = [current.copy()]
    walked = 0.0
    visited = 0
    while visited < count - 1:
        next_index = current_index + direction
        if closed:
            next_index %= count
        elif not (0 <= next_index < count):
            return None
        next_point = points[next_index]
        length = float(np.linalg.norm(next_point - current))
        if walked + length >= target_length_m and length > 1e-12:
            ratio = (target_length_m - walked) / length
            endpoint = current + ratio * (next_point - current)
            path.append(endpoint.copy())
            return endpoint, np.asarray(path, dtype=np.float64), walked + length * ratio
        walked += length
        path.append(next_point.copy())
        current_index = next_index
        current = next_point
        visited += 1
    return None


def sagittal_front_length_anchor(
    renderer,
    body,
    center_x: float,
    suprasternale: Vector,
    posterior_y: float,
    front_sign: float,
    source_height_m: float,
    target_length_m: float,
) -> tuple[Vector, np.ndarray, dict]:
    origin = Vector((center_x, 0.0, 0.0))
    normal = Vector((1.0, 0.0, 0.0))
    basis_u = Vector((0.0, 1.0, 0.0))
    basis_v = Vector((0.0, 0.0, 1.0))
    components = renderer.mesh_plane_section_components(body, origin, normal, basis_u, basis_v)
    if not components:
        raise RuntimeError("The exact PLY has no midsagittal surface section")

    source_2d = np.asarray((suprasternale.y, suprasternale.z), dtype=np.float64)
    trials = []
    component_audit = []
    for component_index, component in enumerate(components):
        points_2d = np.asarray(component["points"], dtype=np.float64)
        if len(points_2d) < 12:
            continue
        distances = np.linalg.norm(points_2d - source_2d[None, :], axis=1)
        start_index = int(np.argmin(distances))
        source_error = float(distances[start_index])
        span = points_2d.max(axis=0) - points_2d.min(axis=0)
        component_audit.append({
            "component_index": component_index,
            "closed": bool(component["closed"]),
            "point_count": int(len(points_2d)),
            "source_distance_mm": source_error * 1000.0,
            "depth_span_mm": float(span[0] * 1000.0),
            "height_span_mm": float(span[1] * 1000.0),
        })
        if source_error > 0.06:
            continue
        points_3d = np.column_stack((
            np.full(len(points_2d), center_x, dtype=np.float64),
            points_2d[:, 0],
            points_2d[:, 1],
        ))
        for direction in (-1, 1):
            walked = walk_ordered_polyline(
                points_3d,
                start_index,
                direction,
                target_length_m,
                bool(component["closed"]),
            )
            if walked is None:
                continue
            endpoint, path, walked_length = walked
            front_separation = front_sign * (float(endpoint[1]) - posterior_y)
            height_error = abs(float(endpoint[2]) - source_height_m)
            front_penalty = max(0.0, 0.10 - front_separation) * 4.0
            upward_penalty = max(0.0, float(endpoint[2]) - suprasternale.z) * 4.0
            score = height_error + front_penalty + upward_penalty + source_error * 0.10
            trials.append((score, endpoint, path, {
                "component_index": component_index,
                "direction": direction,
                "closed": bool(component["closed"]),
                "source_to_section_mm": source_error * 1000.0,
                "walked_length_mm": walked_length * 1000.0,
                "endpoint_height_mm": float(endpoint[2] * 1000.0),
                "endpoint_height_minus_right_side_mm": float((endpoint[2] - source_height_m) * 1000.0),
                "front_separation_from_posterior_mm": front_separation * 1000.0,
            }))
    if not trials:
        raise RuntimeError(
            "No sagittal PLY path could walk the WEAR waist-front length: "
            + json.dumps(component_audit)
        )
    trials.sort(key=lambda item: item[0])
    _, endpoint, path, audit = trials[0]
    audit["component_candidates"] = component_audit
    return Vector(endpoint.tolist()), path, audit


def front_profile_length_anchor(
    points: np.ndarray,
    center_x: float,
    suprasternale: Vector,
    front_sign: float,
    source_height_m: float,
    target_length_m: float,
) -> tuple[Vector, np.ndarray, dict]:
    """Walk a tape-blind front-center profile sampled from exact PLY points.

    The raw sagittal triangle cut is fragmented by scan seams.  This profile
    uses narrow midsagittal height bins and the robust front surface in every
    bin; it does not use a mask, a photo, or the circumference tape.
    """
    selected = points[
        (np.abs(points[:, 0] - center_x) <= 0.018)
        & (points[:, 2] <= suprasternale.z + 0.008)
        & (points[:, 2] >= source_height_m - 0.22)
    ]
    if len(selected) < 80:
        raise RuntimeError("Too few exact PLY points for a front-center profile")
    bin_size = 0.003
    bin_ids = np.floor(selected[:, 2] / bin_size).astype(np.int64)
    rows = []
    for bin_id in sorted(set(bin_ids.tolist()), reverse=True):
        row = selected[bin_ids == bin_id]
        if len(row) < 2:
            continue
        z = float(np.median(row[:, 2]))
        signed_y = front_sign * row[:, 1]
        # Robust front surface: high quantile avoids one isolated scan spike.
        y = front_sign * float(np.quantile(signed_y, 0.90))
        x = float(np.median(row[:, 0]))
        rows.append((x, y, z))
    profile = np.asarray(rows, dtype=np.float64)
    if len(profile) < 30:
        raise RuntimeError("Front-center PLY profile is too fragmented")

    # Five-row median removes scanner speckle without changing the metric
    # vertical positions or consulting tape.
    smoothed = profile.copy()
    for index in range(len(profile)):
        lo = max(0, index - 2)
        hi = min(len(profile), index + 3)
        smoothed[index, 0] = float(np.median(profile[lo:hi, 0]))
        smoothed[index, 1] = float(np.median(profile[lo:hi, 1]))

    source = np.asarray(tuple(suprasternale), dtype=np.float64)
    start_index = int(np.argmin(np.linalg.norm(smoothed - source[None, :], axis=1)))
    downward = smoothed[start_index:]
    if len(downward) < 2:
        raise RuntimeError("Front-center profile has no downward path")
    path = [source.copy()]
    current = source.copy()
    walked = 0.0
    for next_point in downward:
        length = float(np.linalg.norm(next_point - current))
        if walked + length >= target_length_m and length > 1e-12:
            ratio = (target_length_m - walked) / length
            endpoint = current + ratio * (next_point - current)
            path.append(endpoint.copy())
            return Vector(endpoint.tolist()), np.asarray(path), {
                "method": "exact-PLY-front-center-height-profile",
                "source_to_profile_mm": float(np.linalg.norm(smoothed[start_index] - source) * 1000.0),
                "profile_point_count": int(len(profile)),
                "walked_length_mm": target_length_m * 1000.0,
                "endpoint_height_mm": float(endpoint[2] * 1000.0),
                "endpoint_height_minus_right_side_mm": float((endpoint[2] - source_height_m) * 1000.0),
            }
        walked += length
        path.append(next_point.copy())
        current = next_point
    raise RuntimeError(
        f"Front-center PLY profile ended after {walked * 1000.0:.1f} mm, before the target"
    )


def crotch_length_anchor_from_ply_profile(
    points: np.ndarray,
    center_x: float,
    posterior: Vector,
    crotch: Vector,
    front_sign: float,
    target_total_length_m: float,
) -> tuple[Vector, np.ndarray, dict]:
    """Recover anterior preferred waist from the recorded crotch surface path.

    CAESAR defines total crotch length from anterior preferred waist, through
    the crotch, to the exact posterior preferred-waist landmark.  This avoids
    inventing the missing anterior neck-chain landmark.  Raw scan seams make a
    triangle-only sagittal cut fragment, so we sample the exact PLY's robust
    front and back midsagittal surfaces in narrow height bins.
    """
    z_low = float(crotch.z) - 0.006
    z_high = float(posterior.z) + 0.18
    selected = points[
        (np.abs(points[:, 0] - center_x) <= 0.026)
        & (points[:, 2] >= z_low)
        & (points[:, 2] <= z_high)
    ]
    if len(selected) < 120:
        raise RuntimeError("Too few exact PLY points for the crotch profile")

    bin_size = 0.003
    bin_ids = np.floor(selected[:, 2] / bin_size).astype(np.int64)
    rows = []
    for bin_id in sorted(set(bin_ids.tolist())):
        row = selected[bin_ids == bin_id]
        if len(row) < 3:
            continue
        signed_depth = front_sign * row[:, 1]
        rows.append((
            float(np.median(row[:, 0])),
            front_sign * float(np.quantile(signed_depth, 0.90)),
            front_sign * float(np.quantile(signed_depth, 0.10)),
            float(np.median(row[:, 2])),
        ))
    profile = np.asarray(rows, dtype=np.float64)
    if len(profile) < 40:
        raise RuntimeError("The crotch profile is too fragmented")

    # Smooth scanner speckle only along the two depth coordinates. Metric
    # heights and the exact posterior/crotch landmarks remain untouched.
    smoothed = profile.copy()
    for index in range(len(profile)):
        lo = max(0, index - 2)
        hi = min(len(profile), index + 3)
        smoothed[index, 0] = float(np.median(profile[lo:hi, 0]))
        smoothed[index, 1] = float(np.median(profile[lo:hi, 1]))
        smoothed[index, 2] = float(np.median(profile[lo:hi, 2]))

    # Back surface: posterior waist down to the exact crotch landmark.
    posterior_array = np.asarray(tuple(posterior), dtype=np.float64)
    crotch_array = np.asarray(tuple(crotch), dtype=np.float64)
    posterior_index = int(np.argmin(np.abs(smoothed[:, 3] - posterior.z)))
    crotch_index = int(np.argmin(np.abs(smoothed[:, 3] - crotch.z)))
    if posterior_index <= crotch_index:
        raise RuntimeError("Crotch profile ordering is anatomically invalid")
    back_descending = smoothed[crotch_index:posterior_index + 1][::-1]
    back_path = [posterior_array]
    back_path.extend(
        np.asarray((row[0], row[2], row[3]), dtype=np.float64)
        for row in back_descending
    )
    back_path.append(crotch_array)
    back_path_array = np.asarray(back_path, dtype=np.float64)
    back_length_m = float(np.linalg.norm(np.diff(back_path_array, axis=0), axis=1).sum())
    remaining_front_m = target_total_length_m - back_length_m
    if not 0.08 < remaining_front_m < 0.48:
        raise RuntimeError(
            f"Back-to-crotch PLY path leaves an implausible front path: "
            f"back={back_length_m * 1000.0:.1f} mm, "
            f"remaining={remaining_front_m * 1000.0:.1f} mm"
        )

    # Front surface: exact crotch landmark upward until the total recorded
    # surface length is satisfied. No circumference tape is consulted.
    front_ascending = smoothed[crotch_index:]
    front_path = [crotch_array]
    current = crotch_array.copy()
    walked_front_m = 0.0
    endpoint = None
    for row in front_ascending:
        next_point = np.asarray((row[0], row[1], row[3]), dtype=np.float64)
        length = float(np.linalg.norm(next_point - current))
        if walked_front_m + length >= remaining_front_m and length > 1e-12:
            ratio = (remaining_front_m - walked_front_m) / length
            endpoint = current + ratio * (next_point - current)
            front_path.append(endpoint.copy())
            walked_front_m = remaining_front_m
            break
        walked_front_m += length
        front_path.append(next_point.copy())
        current = next_point
    if endpoint is None:
        raise RuntimeError("Front PLY profile ended before total crotch length")

    full_path = np.vstack((back_path_array, np.asarray(front_path[1:])))
    reconstructed_total_m = float(
        np.linalg.norm(np.diff(full_path, axis=0), axis=1).sum()
    )
    return Vector(endpoint.tolist()), full_path, {
        "method": "exact-PLY-midsagittal-back-crotch-front-profile",
        "profile_point_count": int(len(profile)),
        "posterior_to_crotch_surface_mm": back_length_m * 1000.0,
        "crotch_to_anterior_surface_mm": remaining_front_m * 1000.0,
        "target_total_crotch_length_mm": target_total_length_m * 1000.0,
        "reconstructed_total_crotch_length_mm": reconstructed_total_m * 1000.0,
        "total_length_error_mm": (reconstructed_total_m - target_total_length_m) * 1000.0,
        "endpoint_height_mm": float(endpoint[2] * 1000.0),
    }


def main() -> None:
    renderer = import_module(
        "wear_preferred_waist_renderer",
        PROJECT_ROOT / "scripts/local-ml/cloud/wear3d-v6/render_wear3d_multiview.py",
    )
    proof = import_module(
        "wear_waist_source_proof_helpers",
        PROJECT_ROOT / "scripts/local-ml/render_wear_waist_source_positions.py",
    )
    record = load_record()
    sources = {**record.get("measurements_mm", {}), **record.get("extracted_standing_mm", {})}

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

    body, transform, offset, _ = renderer.BASE.import_body(record)
    raw_landmarks = renderer.BASE.transform_landmarks(record, transform, offset)
    landmarks, landmark_contract = renderer.canonicalize_landmarks(raw_landmarks)
    points = world_vertices(body)

    # Independent WEAR inputs. Recorded tape is deliberately not read here.
    posterior = landmarks["Waist, Preferred, Post."].copy()
    suprasternale = landmarks["Suprasternale"].copy()
    crotch = landmarks["Crotch"].copy()
    right_iliocristale = landmarks["Rt. Iliocristale"].copy()
    left_iliocristale = landmarks["Lt. Iliocristale"].copy()
    source_height_m = float(sources["waist_height_mm"]) / 1000.0
    front_length_m = float(sources["waist_front_length_mm"]) / 1000.0
    total_crotch_length_m = float(sources["total_crotch_length_mm"]) / 1000.0
    center_x = float((right_iliocristale.x + left_iliocristale.x) * 0.5)
    front_sign = 1.0 if suprasternale.y >= posterior.y else -1.0

    anatomy_bounds = renderer.BASE.torso_bounds(landmarks, "waist")
    horizontal_geometry = renderer.torso_contour(
        body,
        points,
        source_height_m,
        anatomy_bounds,
        None,
        debug_label=f"{SCAN_ID}:right-side-height-anchor",
    )
    if horizontal_geometry is None:
        raise RuntimeError("Could not locate the right-side waist-height anchor")
    horizontal_world = np.asarray(horizontal_geometry["contour_world_points"], dtype=np.float64)
    right_is_low_x = right_iliocristale.x < left_iliocristale.x
    lateral_index = int(np.argmin(horizontal_world[:, 0]) if right_is_low_x else np.argmax(horizontal_world[:, 0]))
    right_lateral = Vector(horizontal_world[lateral_index].tolist())

    anterior, crotch_path, anterior_audit = crotch_length_anchor_from_ply_profile(
        points,
        center_x,
        posterior,
        crotch,
        front_sign,
        total_crotch_length_m,
    )

    # Waist-front length is now an independent validation signal. It does not
    # place the band because its physical anterior neck-chain point is absent
    # from the 73 stored LND landmarks.
    front_length_anchor, front_length_path, front_length_audit = front_profile_length_anchor(
        points,
        center_x,
        suprasternale,
        front_sign,
        source_height_m,
        front_length_m,
    )
    anterior_audit["waist_front_length_proxy_endpoint_mm"] = [
        float(value * 1000.0) for value in front_length_anchor
    ]
    anterior_audit["waist_front_length_proxy_endpoint_distance_mm"] = float(
        (front_length_anchor - anterior).length * 1000.0
    )
    anterior_audit["waist_front_length_proxy_audit"] = front_length_audit

    first = right_lateral - posterior
    second = anterior - posterior
    normal = first.cross(second)
    if normal.length <= 1e-8:
        raise RuntimeError("Preferred-waist anchors do not define a stable plane")
    normal.normalize()
    if normal.z < 0.0:
        normal.negate()
    lateral_axis = Vector((1.0, 0.0, 0.0))
    basis_u = lateral_axis - normal * lateral_axis.dot(normal)
    basis_u.normalize()
    basis_v = normal.cross(basis_u)
    basis_v.normalize()
    anchor_centroid = (posterior + right_lateral + anterior) / 3.0
    body_center = Vector((center_x, float((anterior.y + posterior.y) * 0.5), float(anchor_centroid.z)))
    plane_origin = body_center - normal * (body_center - posterior).dot(normal)

    section = renderer.mesh_plane_section_contour(body, plane_origin, normal, basis_u, basis_v)
    if section is None:
        raise RuntimeError("The reconstructed waist plane did not intersect the PLY")
    section_2d, section_closed, raw_perimeter_m = section
    if not section_closed:
        raise RuntimeError("The reconstructed PLY waist section is not closed")
    section_3d = np.asarray([
        np.asarray(plane_origin + basis_u * float(point[0]) + basis_v * float(point[1]))
        for point in section_2d
    ])
    shape_32 = resample_closed(section_3d, 32)
    walked_perimeter_m = float(
        np.linalg.norm(np.diff(np.vstack((shape_32, shape_32[0])), axis=0), axis=1).sum()
    )

    anchor_distances_mm = {
        "posterior": float(np.min(np.linalg.norm(section_3d - np.asarray(posterior)[None, :], axis=1)) * 1000.0),
        "right_lateral": float(np.min(np.linalg.norm(section_3d - np.asarray(right_lateral)[None, :], axis=1)) * 1000.0),
        "anterior": float(np.min(np.linalg.norm(section_3d - np.asarray(anterior)[None, :], axis=1)) * 1000.0),
    }

    # Tape is revealed only now, after the geometry is frozen.
    recorded_tape_mm = float(sources["waist_circumference_mm"])
    walked_mm = walked_perimeter_m * 1000.0
    tape_error_mm = walked_mm - recorded_tape_mm

    cyan = renderer.BASE.make_material("Exact PLY", (0.0, 0.88, 1.0, 1.0), emission=True)
    green = renderer.BASE.make_material("Reconstructed band", (0.15, 1.0, 0.38, 1.0), emission=True)
    orange = renderer.BASE.make_material("Old horizontal row", (1.0, 0.35, 0.04, 1.0), emission=True)
    purple = renderer.BASE.make_material("WEAR anchors", (0.75, 0.40, 1.0, 1.0), emission=True)
    white = renderer.BASE.make_material("Front length path", (1.0, 1.0, 1.0, 1.0), emission=True)
    muted = renderer.BASE.make_material("Floor", (0.24, 0.32, 0.44, 1.0), emission=True)

    body.data.materials.clear()
    body.data.materials.append(cyan)
    decimate = body.modifiers.new(name="ProofMeshDecimate", type="DECIMATE")
    decimate.ratio = min(1.0, 14_000.0 / max(len(body.data.polygons), 1))
    wire = body.modifiers.new(name="ProofMeshWire", type="WIREFRAME")
    wire.thickness = 0.00072
    wire.use_replace = True
    wire.use_even_offset = True

    reconstructed = proof.make_curve(
        "Tape-blind reconstructed preferred-waist band",
        [Vector(point.tolist()) for point in section_3d],
        green,
        thickness=0.006,
    )
    old_horizontal = proof.make_curve(
        "Old horizontal waist-height row",
        [Vector(point.tolist()) for point in horizontal_world],
        orange,
        thickness=0.003,
    )
    crotch_length_curve = proof.make_open_line(
        "WEAR total-crotch surface-length path",
        [Vector(point.tolist()) for point in crotch_path],
        white,
        thickness=0.0025,
    )
    front_length_curve = proof.make_open_line(
        "WEAR front-waist proxy validation path",
        [Vector(point.tolist()) for point in front_length_path],
        purple,
        thickness=0.0018,
    )
    anchor_objects = []
    for label, point in (
        ("Posterior preferred waist", posterior),
        ("Right-side preferred-waist height", right_lateral),
        ("Anterior from front-waist length", anterior),
    ):
        bpy.ops.mesh.primitive_uv_sphere_add(segments=24, ring_count=12, radius=0.017, location=point)
        anchor = bpy.context.object
        anchor.name = label
        anchor.data.materials.append(purple)
        anchor_objects.append(anchor)
    floor = proof.make_open_line(
        "Standing surface",
        [Vector((-0.30, 0.0, 0.0)), Vector((0.30, 0.0, 0.0))],
        muted,
        thickness=0.0025,
    )

    source_objects = [
        body,
        reconstructed,
        old_horizontal,
        crotch_length_curve,
        front_length_curve,
        *anchor_objects,
        floor,
    ]
    for obj in source_objects:
        obj.hide_render = True
    _, front_objects = proof.duplicate_group(source_objects, "Front exact PLY", (-0.72, 0.0, 0.0), 0.0)
    _, side_objects = proof.duplicate_group(source_objects, "Side exact PLY", (0.72, 0.0, 0.0), math.radians(90.0))
    for obj in front_objects + side_objects:
        obj.hide_render = False

    min_z = float(points[:, 2].min())
    max_z = float(points[:, 2].max())
    center_z = (min_z + max_z) * 0.5
    camera_data = bpy.data.cameras.new("ProofCamera")
    camera = bpy.data.objects.new("ProofCamera", camera_data)
    bpy.context.collection.objects.link(camera)
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = (max_z - min_z) * (scene.render.resolution_x / scene.render.resolution_y) * 1.10
    camera.location = (0.0, 6.0, center_z)
    renderer.BASE.look_at(camera, Vector((0.0, 0.0, center_z)))
    scene.camera = camera
    for obj in scene.objects:
        if obj.type == "LIGHT":
            obj.hide_render = True

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    scene.render.filepath = str(OUTPUT)
    bpy.ops.render.render(write_still=True)

    METADATA.write_text(json.dumps({
        "schema": "wear-preferred-waist-tape-blind-canary/v1",
        "scan_id": SCAN_ID,
        "source": {
            "mesh": record["source"]["mesh"],
            "landmarks": record["source"]["landmarks"],
        },
        "landmark_contract": landmark_contract,
        "geometry_inputs_before_tape_reveal": {
            "right_side_waist_height_mm": source_height_m * 1000.0,
            "posterior_landmark_xyz_mm": [float(value * 1000.0) for value in posterior],
            "front_waist_surface_length_mm": front_length_m * 1000.0,
            "total_crotch_surface_length_mm": total_crotch_length_m * 1000.0,
            "anterior_anchor_method": "recorded total crotch length walked from exact posterior waist through exact crotch over the PLY profile",
            "front_neck_base_proxy": "Suprasternale is used only to audit waist-front length; the protocol chain point is not directly stored",
        },
        "derived_anchors_mm": {
            "anterior": [float(value * 1000.0) for value in anterior],
            "right_lateral": [float(value * 1000.0) for value in right_lateral],
            "posterior": [float(value * 1000.0) for value in posterior],
        },
        "anterior_geodesic_audit": anterior_audit,
        "plane": {
            "origin_mm": [float(value * 1000.0) for value in plane_origin],
            "normal": [float(value) for value in normal],
            "tilt_from_horizontal_degrees": float(math.degrees(math.acos(min(1.0, abs(normal.z))))),
        },
        "closed_section": bool(section_closed),
        "raw_ply_perimeter_mm": raw_perimeter_m * 1000.0,
        "walked_32_point_perimeter_mm": walked_mm,
        "anchor_to_ring_distance_mm": anchor_distances_mm,
        "tape_reveal_after_geometry": {
            "recorded_waist_circumference_mm": recorded_tape_mm,
            "walked_minus_tape_mm": tape_error_mm,
            "absolute_error_mm": abs(tape_error_mm),
        },
        "render_legend": {
            "cyan": "exact PLY wire mesh",
            "green": "tape-blind reconstructed preferred-waist plane intersection",
            "orange": "old horizontal waist-height slice, shown only for comparison",
            "purple": "three independent geometry anchors",
            "white": "PLY surface path used to satisfy WEAR total crotch length",
            "thin_purple": "independent waist-front-length proxy audit; not used to place the band",
        },
        "limitations": [
            "WEAR does not store the anterior neck-chain point; waist-front length remains a proxy-only cross-check.",
            "Three anchors define a plane, while a physical elastic band can be mildly non-planar.",
            "This is a one-person diagnostic, not an approved training teacher.",
        ],
    }, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "image": str(OUTPUT),
        "metadata": str(METADATA),
        "walked_mm": walked_mm,
        "tape_mm": recorded_tape_mm,
        "error_mm": tape_error_mm,
    }))


if __name__ == "__main__":
    main()
