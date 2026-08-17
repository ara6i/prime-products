#!/usr/bin/env python3
"""Honest CPU-only visible-2D matching of Delaram against nine WEAR scans.

The ranking uses only:

* Delaram's private Blender-generated visible 2D mesh outline;
* Sapiens2 pose anchors used only to align vertical body segments;
* cleaned, canonical-front GLBs made from real WEAR standing PLY scans;
* leakage-safe normalized 2D row endpoints from ``wear-2d-semantic-v1``;
* sex, height, and weight for the strict cohort filter.

It deliberately does not read or use circumference, tape, depth, BMI, saved
measurement lines, or the user's known bust/waist/hip answers.  A mask was an
internal input to the existing Blender mesh, but no mask is emitted here.

This is an outline matcher, not shared-topology registration.  Delaram's flat
Blender triangulation and each WEAR surface keep their original, different
vertex IDs.  Canonical overlays are for shape comparison only.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import statistics
import struct
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable, Mapping, Sequence


ROOT = Path(__file__).resolve().parents[2]
QUERY_DIR = ROOT / ".local-ml/wear-mesh-overlay/blender-mesh"
SAPIENS_DIR = ROOT / ".local-ml/wear-mesh-overlay/anatomical"
WEAR_MODEL_DIR = ROOT / ".local-ml/wear-mesh-overlay/models"
WEAR_MODEL_INDEX = WEAR_MODEL_DIR / "index.json"
WEAR_SEMANTIC_INDEX = ROOT / ".local-ml/wear-mesh-index/wear-2d-semantic-v1.jsonl"
WEAR_SOURCE_DIR = ROOT / ".local-ml/blender/delaram-similarity/sources"
METRIC_LINE_MANIFEST = ROOT / ".local-ml/wear-mesh-overlay/metric-lines/index.json"
OUTPUT_DIR = ROOT / ".local-ml/wear-mesh-overlay/matches"
PROOF_DIR = ROOT / ".local-ml/wear-mesh-proof/delaram-wear-match"

SCHEMA_VERSION = "delaram-wear-visible-2d-match/v1"
PROFILE_SAMPLES = 257
CANONICAL_RENDER_WIDTH = 192
CANONICAL_RENDER_HEIGHT = 256
CANONICAL_RENDER_ASPECT = CANONICAL_RENDER_WIDTH / CANONICAL_RENDER_HEIGHT
QUERY_HEIGHT_CM = 168.0
QUERY_WEIGHT_KG = 70.8
QUERY_GENDER = "female"
HEIGHT_TOLERANCE_CM = 1.0
WEIGHT_TOLERANCE_KG = 1.0
PHOTO_IDS = ("delaram", "delaram-2")
ROW_NAMES = ("neck", "chest", "underbust", "waist", "hips")

# These are the only expected strict-cohort records.  The code still proves
# the filter from the model/index metadata instead of trusting this tuple.
EXPECTED_COHORT = (
    "NA-0087-A",
    "NA-0252-A",
    "NA-1220-A",
    "NA-1420-A",
    "NA-1591-A",
    "NA-3013-A",
    "NL-1344-A",
    "NL-5934-A",
    "NL-6759-A",
)

ANCHOR_FEATURES = {
    "shoulder": "pair.shoulders.y",
    "hip": "pair.trochanter.y",
    "knee": "pair.knee_crease.y",
    "ankle": "pair.ankle_lateral.y",
}

REGIONS = {
    "torso": {"start": 0.16, "end": 0.30, "mode": "central", "weight": 0.23},
    "waist": {"start": 0.30, "end": 0.40, "mode": "central", "weight": 0.19},
    "hip": {"start": 0.40, "end": 0.53, "mode": "central", "weight": 0.20},
    "arms": {"start": 0.18, "end": 0.54, "mode": "arms", "weight": 0.05},
    "thigh": {"start": 0.53, "end": 0.70, "mode": "legs", "weight": 0.17},
    "calf": {"start": 0.70, "end": 0.89, "mode": "legs", "weight": 0.12},
    "feet": {"start": 0.89, "end": 0.995, "mode": "legs", "weight": 0.04},
}

FORBIDDEN_RANKING_INPUTS = (
    "circumference",
    "tape",
    "depth",
    "bmi",
    "saved measurement line",
    "known Delaram bust/waist/hip",
)

MHR70_BODY_NAMES = {
    "shoulder": ("left-shoulder", "right-shoulder"),
    "hip": ("left-hip", "right-hip"),
    "knee": ("left-knee", "right-knee"),
    "ankle": ("left-ankle", "right-ankle"),
}
MHR70_FRAME_TOP = ("nose", "left-eye", "right-eye", "left-ear", "right-ear")
MHR70_FRAME_BOTTOM = (
    "left-big-toe-tip",
    "left-small-toe-tip",
    "left-heel",
    "right-big-toe-tip",
    "right-small-toe-tip",
    "right-heel",
)

TOP_LANDMARKS = (
    "Sellion",
    "Lt. Infraorbitale",
    "Rt. Infraorbitale",
    "Lt. Tragion",
    "Rt. Tragion",
    "Supramenton",
    "Cervicale",
    "Nuchale",
)
BOTTOM_LANDMARKS = (
    "Lt. Digit II",
    "Rt. Digit II",
    "Lt. Calcaneous, Post.",
    "Rt. Calcaneous, Post.",
    "Lt. Metatarsal-Phal. I",
    "Rt. Metatarsal-Phal. I",
    "Lt. Metatarsal-Phal. V",
    "Rt. Metatarsal-Phal. V",
    "Lt. Sphyrion",
    "Rt. Sphyrion",
)


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def finite(value: Any) -> float | None:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if math.isfinite(number) else None


def median(values: Iterable[float]) -> float:
    materialized = [float(value) for value in values]
    if not materialized:
        raise ValueError("Cannot take the median of no values")
    return float(statistics.median(materialized))


def clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def merge_intervals(
    intervals: Sequence[tuple[float, float]], tolerance: float = 1e-4
) -> list[tuple[float, float]]:
    valid = sorted(
        (min(float(left), float(right)), max(float(left), float(right)))
        for left, right in intervals
        if math.isfinite(left) and math.isfinite(right) and abs(right - left) > 1e-8
    )
    merged: list[list[float]] = []
    for left, right in valid:
        if not merged or left > merged[-1][1] + tolerance:
            merged.append([left, right])
        else:
            merged[-1][1] = max(merged[-1][1], right)
    return [(left, right) for left, right in merged]


def polygon_intervals(
    polygon: Sequence[tuple[float, float]], y: float
) -> list[tuple[float, float]]:
    """Return the inside X intervals for one horizontal polygon scanline."""
    intersections: list[float] = []
    for (x1, y1), (x2, y2) in zip(polygon, polygon[1:] + polygon[:1]):
        if y1 == y2:
            continue
        if not ((y1 <= y < y2) or (y2 <= y < y1)):
            continue
        amount = (y - y1) / (y2 - y1)
        intersections.append(x1 + amount * (x2 - x1))
    intersections.sort()
    if len(intersections) % 2:
        intersections = intersections[:-1]
    return merge_intervals(
        [
            (intersections[index], intersections[index + 1])
            for index in range(0, len(intersections), 2)
        ],
        tolerance=1e-7,
    )


def central_interval(
    intervals: Sequence[tuple[float, float]], center: float = 0.0
) -> tuple[float, float] | None:
    if not intervals:
        return None
    containing = [span for span in intervals if span[0] <= center <= span[1]]
    if containing:
        return max(containing, key=lambda span: span[1] - span[0])
    return min(intervals, key=lambda span: abs((span[0] + span[1]) / 2.0 - center))


def piecewise_map(
    value: float,
    source_points: Sequence[float],
    target_points: Sequence[float],
) -> float:
    """Map source to target using monotonic piecewise-linear anchors."""
    if len(source_points) != len(target_points) or len(source_points) < 2:
        raise ValueError("Piecewise map requires paired anchors")
    if any(b <= a for a, b in zip(source_points, source_points[1:])):
        raise ValueError(f"Source anchors are not increasing: {source_points}")
    if any(b <= a for a, b in zip(target_points, target_points[1:])):
        raise ValueError(f"Target anchors are not increasing: {target_points}")
    value = clamp(float(value), source_points[0], source_points[-1])
    for index in range(len(source_points) - 1):
        left, right = source_points[index], source_points[index + 1]
        if value <= right or index == len(source_points) - 2:
            amount = (value - left) / max(1e-12, right - left)
            return target_points[index] + amount * (
                target_points[index + 1] - target_points[index]
            )
    return target_points[-1]


def canonical_to_source(
    canonical: float,
    source_anchors: Mapping[str, float],
    canonical_anchors: Mapping[str, float],
) -> float:
    names = ("top", "shoulder", "hip", "knee", "ankle", "bottom")
    return piecewise_map(
        canonical,
        [canonical_anchors[name] for name in names],
        [source_anchors[name] for name in names],
    )


def _read_accessor(
    document: Mapping[str, Any], binary: bytes, accessor_index: int
) -> list[tuple[float | int, ...]]:
    accessor = document["accessors"][accessor_index]
    view = document["bufferViews"][accessor["bufferView"]]
    component_type = int(accessor["componentType"])
    component_format = {
        5120: "b",
        5121: "B",
        5122: "h",
        5123: "H",
        5125: "I",
        5126: "f",
    }.get(component_type)
    if component_format is None:
        raise ValueError(f"Unsupported GLB component type {component_type}")
    width = {
        "SCALAR": 1,
        "VEC2": 2,
        "VEC3": 3,
        "VEC4": 4,
        "MAT4": 16,
    }[accessor["type"]]
    item_struct = struct.Struct("<" + component_format * width)
    offset = int(view.get("byteOffset", 0)) + int(accessor.get("byteOffset", 0))
    stride = int(view.get("byteStride", item_struct.size))
    return [
        item_struct.unpack_from(binary, offset + index * stride)
        for index in range(int(accessor["count"]))
    ]


def read_glb_mesh(path: Path) -> tuple[list[tuple[float, float, float]], list[tuple[int, int, int]]]:
    payload = path.read_bytes()
    magic, version, declared_length = struct.unpack_from("<4sII", payload, 0)
    if magic != b"glTF" or version != 2 or declared_length != len(payload):
        raise ValueError(f"Invalid GLB header: {path}")
    document: dict[str, Any] | None = None
    binary: bytes | None = None
    offset = 12
    while offset < len(payload):
        length, chunk_type = struct.unpack_from("<II", payload, offset)
        offset += 8
        chunk = payload[offset : offset + length]
        offset += length
        if chunk_type == 0x4E4F534A:
            document = json.loads(chunk.decode("utf-8").rstrip("\x00 "))
        elif chunk_type == 0x004E4942:
            binary = chunk
    if document is None or binary is None:
        raise ValueError(f"GLB is missing JSON or BIN data: {path}")
    primitives = document.get("meshes", [{}])[0].get("primitives", [])
    if len(primitives) != 1:
        raise ValueError(f"Expected one GLB primitive in {path}")
    primitive = primitives[0]
    positions = _read_accessor(document, binary, primitive["attributes"]["POSITION"])
    flat_indices = _read_accessor(document, binary, primitive["indices"])
    indices = [int(item[0]) for item in flat_indices]
    if len(indices) % 3:
        raise ValueError(f"Non-triangular index count in {path}")
    vertices = [(float(x), float(y), float(z)) for x, y, z in positions]
    faces = [tuple(indices[index : index + 3]) for index in range(0, len(indices), 3)]
    return vertices, faces


def rasterize_mesh_rows(
    vertices: Sequence[tuple[float, float, float]],
    faces: Sequence[tuple[int, int, int]],
    *,
    frame_top_y: float,
    frame_span: float,
    samples: int = PROFILE_SAMPLES,
) -> list[list[tuple[float, float]]]:
    """Project all surface triangles and return silhouette intervals per row."""
    if frame_span <= 0:
        raise ValueError("WEAR landmark frame has no vertical span")
    normalized = [
        (float(x) / frame_span, (frame_top_y - float(y)) / frame_span)
        for x, y, _z in vertices
    ]
    row_intervals: list[list[tuple[float, float]]] = [[] for _ in range(samples)]
    for a_index, b_index, c_index in faces:
        triangle = (normalized[a_index], normalized[b_index], normalized[c_index])
        ys = [point[1] for point in triangle]
        start = max(0, int(math.ceil(min(ys) * (samples - 1) - 0.5)))
        end = min(samples - 1, int(math.floor(max(ys) * (samples - 1) + 0.5)))
        if end < start:
            continue
        for row_index in range(start, end + 1):
            y = row_index / (samples - 1)
            xs: list[float] = []
            for (x1, y1), (x2, y2) in zip(triangle, triangle[1:] + triangle[:1]):
                if abs(y2 - y1) < 1e-12:
                    if abs(y - y1) < 1e-8:
                        xs.extend((x1, x2))
                    continue
                if y < min(y1, y2) - 1e-9 or y > max(y1, y2) + 1e-9:
                    continue
                amount = (y - y1) / (y2 - y1)
                if -1e-9 <= amount <= 1.0 + 1e-9:
                    xs.append(x1 + amount * (x2 - x1))
            if len(xs) >= 2:
                row_intervals[row_index].append((min(xs), max(xs)))
    return [merge_intervals(intervals, tolerance=0.0015) for intervals in row_intervals]


def profile_center(rows: Sequence[Sequence[tuple[float, float]]]) -> float:
    centers: list[float] = []
    for index in range(round(0.18 * (len(rows) - 1)), round(0.52 * (len(rows) - 1))):
        interval = central_interval(rows[index], 0.0)
        if interval is not None:
            centers.append((interval[0] + interval[1]) / 2.0)
    return median(centers) if centers else 0.0


def shift_rows(
    rows: Sequence[Sequence[tuple[float, float]]], center: float
) -> list[list[tuple[float, float]]]:
    return [[(left - center, right - center) for left, right in row] for row in rows]


def warp_profile(
    source_rows: Sequence[Sequence[tuple[float, float]]],
    source_anchors: Mapping[str, float],
    canonical_anchors: Mapping[str, float],
) -> list[list[tuple[float, float]]]:
    result: list[list[tuple[float, float]]] = []
    for index in range(PROFILE_SAMPLES):
        canonical = index / (PROFILE_SAMPLES - 1)
        source = canonical_to_source(canonical, source_anchors, canonical_anchors)
        source_index = int(round(clamp(source, 0.0, 1.0) * (len(source_rows) - 1)))
        result.append(list(source_rows[source_index]))
    return result


def load_sapiens_frame(photo_id: str, image_height: int) -> dict[str, Any]:
    path = SAPIENS_DIR / f"{photo_id}-sapiens2.json"
    payload = json.loads(path.read_text())
    points = {str(record["name"]): record for record in payload["mhr70"]}

    def valid_y(name: str) -> float | None:
        point = points.get(name)
        if not point or float(point.get("score", 0.0)) < 0.45:
            return None
        return float(point["yPx"])

    top_values = [value for name in MHR70_FRAME_TOP if (value := valid_y(name)) is not None]
    bottom_values = [
        value for name in MHR70_FRAME_BOTTOM if (value := valid_y(name)) is not None
    ]
    if len(top_values) < 3 or len(bottom_values) < 3:
        raise RuntimeError(f"Insufficient Sapiens frame anchors for {photo_id}")
    frame_top = min(top_values)
    frame_bottom = max(bottom_values)
    frame_span = frame_bottom - frame_top
    if frame_span < image_height * 0.45:
        raise RuntimeError(f"Invalid Sapiens body span for {photo_id}")

    anchors = {"top": 0.0, "bottom": 1.0}
    anchor_evidence: dict[str, Any] = {}
    for label, names in MHR70_BODY_NAMES.items():
        values = [value for name in names if (value := valid_y(name)) is not None]
        if len(values) != len(names):
            raise RuntimeError(f"Missing Sapiens {label} pair for {photo_id}")
        y_px = sum(values) / len(values)
        anchors[label] = (y_px - frame_top) / frame_span
        anchor_evidence[label] = {
            "names": list(names),
            "meanYPx": round(y_px, 3),
            "sourceBodyY": round(anchors[label], 6),
        }
    names = ("top", "shoulder", "hip", "knee", "ankle", "bottom")
    if any(anchors[b] <= anchors[a] for a, b in zip(names, names[1:])):
        raise RuntimeError(f"Non-monotonic Sapiens anchors for {photo_id}: {anchors}")

    midline_points: list[float] = []
    for pair in (MHR70_BODY_NAMES["shoulder"], MHR70_BODY_NAMES["hip"]):
        left, right = (points[name] for name in pair)
        if min(float(left["score"]), float(right["score"])) >= 0.45:
            midline_points.append((float(left["xPx"]) + float(right["xPx"])) / 2.0)
    if not midline_points:
        raise RuntimeError(f"No stable horizontal midline for {photo_id}")
    return {
        "path": path,
        "frameTopPx": frame_top,
        "frameBottomPx": frame_bottom,
        "frameSpanPx": frame_span,
        "midlineXPx": median(midline_points),
        "sourceAnchors": anchors,
        "anchorEvidence": anchor_evidence,
    }


def build_query_profile(
    photo_id: str, canonical_anchors: Mapping[str, float]
) -> dict[str, Any]:
    path = QUERY_DIR / f"{photo_id}.json"
    payload = json.loads(path.read_text())
    if payload.get("blenderApiUsed") is not True:
        raise RuntimeError(f"{path} is not the Blender-generated visible mesh")
    if payload.get("depthUsed") is not False or payload.get("measurementsUsed") is not False:
        raise RuntimeError(f"{path} is not leakage-safe")
    image_width, image_height = [int(value) for value in payload["imageSize"]]
    outline_flat = payload["outline"]
    outline = [
        (float(outline_flat[index]), float(outline_flat[index + 1]))
        for index in range(0, len(outline_flat), 2)
    ]
    frame = load_sapiens_frame(photo_id, image_height)
    rows: list[list[tuple[float, float]]] = []
    for index in range(PROFILE_SAMPLES):
        canonical = index / (PROFILE_SAMPLES - 1)
        source_y = canonical_to_source(
            canonical, frame["sourceAnchors"], canonical_anchors
        )
        y_px = frame["frameTopPx"] + source_y * frame["frameSpanPx"]
        raw = polygon_intervals(outline, y_px / image_height)
        rows.append(
            [
                (
                    (left * image_width - frame["midlineXPx"]) / frame["frameSpanPx"],
                    (right * image_width - frame["midlineXPx"]) / frame["frameSpanPx"],
                )
                for left, right in raw
            ]
        )
    return {
        "photoId": photo_id,
        "meshPath": path,
        "meshSha256": sha256(path),
        "imageSize": [image_width, image_height],
        "frame": frame,
        "profile": rows,
        "source": payload.get("source"),
        "topology": {
            "kind": "Blender visible-outline triangulation",
            "vertexCount": int(payload["stats"]["vertexCount"]),
            "triangleCount": int(payload["stats"]["triangleCount"]),
            "sharedWithWear": False,
        },
    }


def parse_landmark_z(path: Path) -> dict[str, float]:
    result: dict[str, float] = {}
    for raw_line in path.read_text(errors="replace").splitlines():
        parts = raw_line.split()
        if len(parts) < 8 or not parts[0].lstrip("-").isdigit():
            continue
        z = finite(parts[6])
        if z is None:
            continue
        result[" ".join(parts[7:])] = z
    return result


def landmark_frame_span_meters(model: Mapping[str, Any]) -> tuple[float, Path, dict[str, Any]]:
    scan_id = str(model["scanId"])
    if scan_id.startswith("NA-"):
        stem = "csr" + scan_id.split("-")[1].lower() + "a"
    elif scan_id.startswith("NL-"):
        stem = "nl_" + scan_id.split("-")[1].lower() + "a"
    else:
        raise ValueError(f"Unsupported WEAR region in {scan_id}")
    path = WEAR_SOURCE_DIR / f"{stem}.lnd"
    landmarks = parse_landmark_z(path)
    top_values = [landmarks[name] for name in TOP_LANDMARKS if name in landmarks]
    bottom_values = [landmarks[name] for name in BOTTOM_LANDMARKS if name in landmarks]
    if len(top_values) < 4 or len(bottom_values) < 4:
        raise RuntimeError(f"Insufficient WEAR vertical landmarks for {scan_id}")
    raw_span = max(top_values) - min(bottom_values)
    normalization = model["scaleNormalization"]
    raw_height = float(normalization["rawHeight"])
    raw_unit_per_landmark_unit = 0.001 if raw_height < 10.0 else 1.0
    span_meters = (
        raw_span
        * raw_unit_per_landmark_unit
        * float(normalization["scaleFactor"])
    )
    return span_meters, path, {
        "topLandmarkZ": round(max(top_values), 6),
        "bottomLandmarkZ": round(min(bottom_values), 6),
        "rawLandmarkSpan": round(raw_span, 6),
        "landmarkToRawMeshUnit": raw_unit_per_landmark_unit,
        "uniformMeshScale": float(normalization["scaleFactor"]),
        "frameSpanMeters": round(span_meters, 6),
    }


def load_semantic_cohort() -> dict[str, dict[str, Any]]:
    records: dict[str, dict[str, Any]] = {}
    with WEAR_SEMANTIC_INDEX.open() as handle:
        for line in handle:
            entry = json.loads(line)
            gender = str(entry.get("gender") or "").lower()
            height = finite(entry.get("height_cm"))
            weight = finite(entry.get("weight_kg"))
            if gender != QUERY_GENDER or height is None or weight is None:
                continue
            if abs(height - QUERY_HEIGHT_CM) > HEIGHT_TOLERANCE_CM + 1e-9:
                continue
            if abs(weight - QUERY_WEIGHT_KG) > WEIGHT_TOLERANCE_KG + 1e-9:
                continue
            if entry.get("canonical_view") != "front-50":
                continue
            if entry.get("descriptor", {}).get("quality", {}).get("accepted") is not True:
                continue
            records[str(entry["scan_id"])] = entry
    if tuple(sorted(records)) != tuple(sorted(EXPECTED_COHORT)):
        raise RuntimeError(
            f"Strict cohort changed. Expected {EXPECTED_COHORT}, got {tuple(sorted(records))}"
        )
    return records


def load_model_cohort(semantic: Mapping[str, Any]) -> dict[str, dict[str, Any]]:
    payload = json.loads(WEAR_MODEL_INDEX.read_text())
    models: dict[str, dict[str, Any]] = {}
    for raw in payload.get("models", []):
        scan_id = str(raw.get("scanId") or "")
        if scan_id not in semantic:
            continue
        # Explicit allowlist: measurementsCm exists in the source file but is
        # intentionally not copied into memory used by the scorer.
        models[scan_id] = {
            key: raw[key]
            for key in (
                "scanId",
                "heightCm",
                "weightKg",
                "gender",
                "file",
                "scaleNormalization",
                "source",
            )
        }
    if set(models) != set(semantic):
        raise RuntimeError("The nine strict WEAR GLB assets are incomplete")
    return models


def canonical_anchor_medians(semantic: Mapping[str, Mapping[str, Any]]) -> dict[str, float]:
    result = {"top": 0.0, "bottom": 1.0}
    for label, feature_name in ANCHOR_FEATURES.items():
        result[label] = median(
            entry["descriptor"]["features"][feature_name]
            for entry in semantic.values()
        )
    names = ("top", "shoulder", "hip", "knee", "ankle", "bottom")
    if any(result[b] <= result[a] for a, b in zip(names, names[1:])):
        raise RuntimeError(f"Invalid cohort anchor medians: {result}")
    return result


def build_wear_profile(
    model: Mapping[str, Any],
    semantic: Mapping[str, Any],
    canonical_anchors: Mapping[str, float],
) -> dict[str, Any]:
    path = WEAR_MODEL_DIR / str(model["file"])
    vertices, faces = read_glb_mesh(path)
    frame_span, landmark_path, frame_evidence = landmark_frame_span_meters(model)
    minimum_y = min(point[1] for point in vertices)
    frame_top_y = minimum_y + frame_span
    maximum_y = max(point[1] for point in vertices)
    if frame_top_y > maximum_y + 0.03:
        raise RuntimeError(f"Landmark frame extends outside {model['scanId']} GLB")
    source_rows = rasterize_mesh_rows(
        vertices,
        faces,
        frame_top_y=frame_top_y,
        frame_span=frame_span,
    )
    center = profile_center(source_rows)
    source_rows = shift_rows(source_rows, center)
    features = semantic["descriptor"]["features"]
    anchors = {
        "top": 0.0,
        "bottom": 1.0,
        **{label: float(features[name]) for label, name in ANCHOR_FEATURES.items()},
    }
    canonical = warp_profile(source_rows, anchors, canonical_anchors)
    return {
        "scanId": model["scanId"],
        "modelPath": path,
        "modelSha256": sha256(path),
        "landmarkPath": landmark_path,
        "landmarkSha256": sha256(landmark_path),
        "profile": canonical,
        "sourceAnchors": anchors,
        "frameEvidence": frame_evidence,
        "mesh": {
            "vertexCount": len(vertices),
            "triangleCount": len(faces),
            "source": model["source"],
            "canonicalProjection": "orthographic X/Y of cleaned front-oriented GLB",
        },
    }


def row_value(profile: Sequence[Sequence[tuple[float, float]]], y: float) -> dict[str, float] | None:
    index = int(round(clamp(y, 0.0, 1.0) * (len(profile) - 1)))
    intervals = profile[index]
    center = central_interval(intervals)
    if center is None:
        return None
    return {
        "left": center[0],
        "right": center[1],
        "width": center[1] - center[0],
        "occupiedWidth": sum(right - left for left, right in intervals),
        "outerSpan": intervals[-1][1] - intervals[0][0],
        "componentCount": len(intervals),
    }


def _interval_widths(intervals: Sequence[tuple[float, float]], limit: int = 3) -> list[float]:
    return sorted((right - left for left, right in intervals), reverse=True)[:limit]


def regional_error(
    query: Sequence[Sequence[tuple[float, float]]],
    wear: Sequence[Sequence[tuple[float, float]]],
    *,
    start: float,
    end: float,
    mode: str,
) -> dict[str, Any]:
    errors: list[float] = []
    comparable = 0
    attempted = 0
    for index in range(PROFILE_SAMPLES):
        canonical = index / (PROFILE_SAMPLES - 1)
        if canonical < start or canonical > end:
            continue
        attempted += 1
        query_intervals = query[index]
        wear_intervals = wear[index]
        if not query_intervals or not wear_intervals:
            continue
        if mode == "central":
            left = central_interval(query_intervals)
            right = central_interval(wear_intervals)
            if left is None or right is None:
                continue
            error = (abs(left[0] - right[0]) + abs(left[1] - right[1])) / 2.0
        elif mode == "arms":
            query_center = central_interval(query_intervals)
            wear_center = central_interval(wear_intervals)
            if query_center is None or wear_center is None:
                continue
            query_side = sorted(
                [
                    b - a
                    for a, b in query_intervals
                    if (a, b) != query_center
                ],
                reverse=True,
            )[:2]
            wear_side = sorted(
                [b - a for a, b in wear_intervals if (a, b) != wear_center],
                reverse=True,
            )[:2]
            while len(query_side) < 2:
                query_side.append(0.0)
            while len(wear_side) < 2:
                wear_side.append(0.0)
            thickness_error = sum(abs(a - b) for a, b in zip(query_side, wear_side)) / 2.0
            query_span = query_intervals[-1][1] - query_intervals[0][0]
            wear_span = wear_intervals[-1][1] - wear_intervals[0][0]
            error = 0.70 * thickness_error + 0.30 * abs(query_span - wear_span)
        else:
            query_widths = _interval_widths(query_intervals, 2)
            wear_widths = _interval_widths(wear_intervals, 2)
            while len(query_widths) < 2:
                query_widths.append(0.0)
            while len(wear_widths) < 2:
                wear_widths.append(0.0)
            thickness_error = sum(
                abs(a - b) for a, b in zip(query_widths, wear_widths)
            ) / 2.0
            query_span = query_intervals[-1][1] - query_intervals[0][0]
            wear_span = wear_intervals[-1][1] - wear_intervals[0][0]
            error = 0.80 * thickness_error + 0.20 * abs(query_span - wear_span)
        errors.append(error)
        comparable += 1
    if not errors:
        return {
            "meanBoundaryErrorBodyHeight": None,
            "p95BoundaryErrorBodyHeight": None,
            "score": 0.0,
            "coverage": 0.0,
            "rowsCompared": 0,
        }
    ordered = sorted(errors)
    p95 = ordered[min(len(ordered) - 1, math.ceil(0.95 * len(ordered)) - 1)]
    mean_error = sum(errors) / len(errors)
    return {
        "meanBoundaryErrorBodyHeight": round(mean_error, 6),
        "p95BoundaryErrorBodyHeight": round(p95, 6),
        "score": round(max(0.0, 100.0 * (1.0 - mean_error / 0.12)), 2),
        "coverage": round(comparable / max(1, attempted), 4),
        "rowsCompared": comparable,
    }


def load_metric_lines_if_supported() -> tuple[dict[str, Any], str]:
    """Prefer future metric-line geometry when its stable schema is available.

    The producer was still running when this matcher was written.  Unknown
    schemas fail closed and the leakage-safe semantic row geometry is used.
    """
    if not METRIC_LINE_MANIFEST.is_file():
        return {}, "not-ready; semantic 2D row endpoint fallback used"
    payload = json.loads(METRIC_LINE_MANIFEST.read_text())
    if payload.get("schemaVersion") != 1:
        return {}, "unsupported metric-line schema; semantic 2D row endpoint fallback used"
    records = payload.get("scans")
    if not isinstance(records, list):
        return {}, "invalid metric-line manifest; semantic 2D row endpoint fallback used"
    result: dict[str, Any] = {}
    for record in records:
        scan_id = str(record.get("scanId") or "")
        relative_path = record.get("path")
        if not scan_id or not isinstance(relative_path, str):
            continue
        path = METRIC_LINE_MANIFEST.parent / relative_path
        if not path.is_file():
            continue
        source = json.loads(path.read_text())
        if source.get("schemaVersion") != 1 or source.get("scanId") != scan_id:
            continue
        rows = source.get("rows")
        if not isinstance(rows, Mapping):
            continue
        projection = source.get("frontProjection")
        bounds = (
            projection.get("boundsCm") if isinstance(projection, Mapping) else None
        )
        min_z = finite(bounds.get("minZ")) if isinstance(bounds, Mapping) else None
        max_z = finite(bounds.get("maxZ")) if isinstance(bounds, Mapping) else None
        body_span = (
            max_z - min_z
            if min_z is not None and max_z is not None and max_z > min_z
            else None
        )
        sanitized: dict[str, Any] = {}
        for row_name in ROW_NAMES:
            row = rows.get(row_name)
            if not isinstance(row, Mapping) or row.get("geometryAvailable") is not True:
                continue
            breadth = finite(row.get("breadthCm"))
            plane = row.get("plane")
            plane_height = (
                finite(plane.get("heightCm")) if isinstance(plane, Mapping) else None
            )
            if breadth is None or breadth <= 0:
                continue
            ab = row.get("abBreadth")
            projection = (
                ab.get("frontProjectionCm") if isinstance(ab, Mapping) else None
            )
            sanitized[row_name] = {
                "breadthCm": breadth,
                "planeHeightCm": plane_height,
                "canonicalBodyY": (
                    clamp((max_z - plane_height) / body_span, 0.0, 1.0)
                    if body_span is not None
                    and max_z is not None
                    and plane_height is not None
                    else None
                ),
                "heightSource": (
                    str(plane.get("heightSource")) if isinstance(plane, Mapping) else None
                ),
                "frontProjectionCm": projection,
                "qualityFlags": list(row.get("qualityFlags") or []),
                "sourcePath": str(path.relative_to(ROOT)),
                "sourceSha256": sha256(path),
            }
        if sanitized:
            result[scan_id] = sanitized
    return result, f"wear-metric-lines/v1 {len(result)}/{len(EXPECTED_COHORT)} scans"


def named_row_differences(
    query_profile: Sequence[Sequence[tuple[float, float]]],
    wear_profile: Sequence[Sequence[tuple[float, float]]],
    semantic: Mapping[str, Any],
    metric_rows: Mapping[str, Any] | None,
    canonical_row_medians: Mapping[str, float],
) -> dict[str, Any]:
    features = semantic["descriptor"]["features"]
    result: dict[str, Any] = {}
    for row_name in ROW_NAMES:
        row_y = finite(features.get(f"row.{row_name}.y"))
        metric_row = metric_rows.get(row_name) if isinstance(metric_rows, Mapping) else None
        exact_row_y = (
            finite(metric_row.get("canonicalBodyY"))
            if isinstance(metric_row, Mapping)
            else None
        )
        if exact_row_y is not None:
            row_y = exact_row_y
        if row_y is None:
            row_y = float(canonical_row_medians[row_name])
        query_row = row_value(query_profile, row_y)
        wear_row = row_value(wear_profile, row_y)
        semantic_width = finite(features.get(f"row.{row_name}.width"))
        # The semantic descriptor stores normalized-image X divided by
        # normalized-image Y. Convert both axes back to pixels first. The
        # canonical WEAR render is 192x256; without this aspect correction all
        # fallback row widths are inflated by 4/3.
        wear_width = (
            semantic_width * CANONICAL_RENDER_ASPECT
            if semantic_width is not None
            else None
        )
        wear_source = "wear-2d-semantic-v1 projected row endpoints"
        if isinstance(metric_row, Mapping):
            exact_breadth_cm = finite(metric_row.get("breadthCm"))
            candidate_height_cm = finite(semantic.get("height_cm"))
            if (
                exact_breadth_cm is not None
                and exact_breadth_cm > 0
                and candidate_height_cm is not None
                and candidate_height_cm > 0
            ):
                wear_width = exact_breadth_cm / candidate_height_cm
                wear_source = "wear-metric-lines/v1 exact PLY/LND A-B breadth"
        if wear_width is None and wear_row is not None:
            wear_width = wear_row["width"]
            wear_source = "canonical WEAR GLB silhouette fallback"
        if query_row is None or wear_width is None:
            result[row_name] = {
                "available": False,
                "reason": "visible central interval unavailable",
            }
            continue
        delta = wear_width - query_row["width"]
        photo_cm = query_row["width"] * QUERY_HEIGHT_CM
        height_aligned_wear_cm = wear_width * QUERY_HEIGHT_CM
        exact_wear_cm = (
            finite(metric_row.get("breadthCm"))
            if isinstance(metric_row, Mapping)
            else None
        )
        comparison_wear_cm = (
            exact_wear_cm if exact_wear_cm is not None else height_aligned_wear_cm
        )
        comparison_delta_cm = comparison_wear_cm - photo_cm
        if abs(comparison_delta_cm) < 0.2:
            direction = "about the same visible width"
        elif comparison_delta_cm > 0:
            direction = "WEAR is wider than photo"
        else:
            direction = "WEAR is narrower than photo"
        result[row_name] = {
            "available": True,
            "canonicalBodyY": round(row_y, 6),
            "photoVisibleWidthBodyHeight": round(query_row["width"], 6),
            "wearVisibleWidthBodyHeight": round(wear_width, 6),
            "wearMinusPhotoBodyHeight": round(delta, 6),
            "photoVisibleWidthCmEquivalent": round(photo_cm, 2),
            "wearVisibleWidthCmEquivalent": round(height_aligned_wear_cm, 2),
            "wearExactPlyBreadthCm": (
                round(exact_wear_cm, 5) if exact_wear_cm is not None else None
            ),
            "wearMinusPhotoCm": round(comparison_delta_cm, 2),
            "wearMinusPhotoCmEquivalent": round(comparison_delta_cm, 2),
            "wearPlaneHeightCm": (
                round(float(metric_row["planeHeightCm"]), 5)
                if isinstance(metric_row, Mapping)
                and finite(metric_row.get("planeHeightCm")) is not None
                else None
            ),
            "wearPlaneHeightSource": (
                metric_row.get("heightSource")
                if isinstance(metric_row, Mapping)
                else None
            ),
            "wearLineQualityFlags": (
                metric_row.get("qualityFlags")
                if isinstance(metric_row, Mapping)
                else []
            ),
            "wearMetricEvidence": (
                {
                    "path": metric_row.get("sourcePath"),
                    "sha256": metric_row.get("sourceSha256"),
                    "frontProjectionCm": metric_row.get("frontProjectionCm"),
                }
                if isinstance(metric_row, Mapping)
                else None
            ),
            "direction": direction,
            "wearWidthSource": wear_source,
            "unitWarning": "height-aligned visible-front width; not circumference or depth",
            "positionUncertainty": (
                "low-to-medium"
                if exact_row_y is not None
                else "medium" if f"row.{row_name}.y" in features else "high"
            ),
            "positionSource": (
                "exact PLY/LND plane height normalized by exact front-projection bounds"
                if exact_row_y is not None
                else "wear-2d-semantic-v1 row height"
            ),
        }
    return result


def exact_metric_row_medians(
    metric_lines: Mapping[str, Mapping[str, Any]],
    semantic_fallback: Mapping[str, float],
) -> dict[str, float]:
    """Return cohort-median exact plane positions for photo-level row checks."""
    result: dict[str, float] = {}
    for row_name in ROW_NAMES:
        values = [
            value
            for rows in metric_lines.values()
            if isinstance(rows, Mapping)
            and isinstance(rows.get(row_name), Mapping)
            and (value := finite(rows[row_name].get("canonicalBodyY"))) is not None
        ]
        result[row_name] = (
            median(values) if values else float(semantic_fallback[row_name])
        )
    return result


def photo_row_widths(
    profile: Sequence[Sequence[tuple[float, float]]],
    canonical_row_medians: Mapping[str, float],
) -> dict[str, Any]:
    result: dict[str, Any] = {}
    for row_name in ROW_NAMES:
        y = float(canonical_row_medians[row_name])
        row = row_value(profile, y)
        result[row_name] = (
            {
                "available": True,
                "canonicalBodyY": round(y, 6),
                "visibleWidthBodyHeight": round(row["width"], 6),
                "visibleWidthCmEquivalent": round(row["width"] * QUERY_HEIGHT_CM, 2),
                "positionSource": "strict-cohort median exact PLY/LND plane height",
                "unitWarning": "height-scaled visible photo width; not tape circumference",
            }
            if row is not None
            else {"available": False, "canonicalBodyY": round(y, 6)}
        )
    return result


def profile_outer(profile: Sequence[Sequence[tuple[float, float]]]) -> dict[str, list[float | None]]:
    left: list[float | None] = []
    right: list[float | None] = []
    central_left: list[float | None] = []
    central_right: list[float | None] = []
    for intervals in profile:
        if intervals:
            left.append(round(intervals[0][0], 6))
            right.append(round(intervals[-1][1], 6))
            center = central_interval(intervals)
            central_left.append(round(center[0], 6) if center else None)
            central_right.append(round(center[1], 6) if center else None)
        else:
            left.append(None)
            right.append(None)
            central_left.append(None)
            central_right.append(None)
    return {
        "left": left,
        "right": right,
        "centralLeft": central_left,
        "centralRight": central_right,
    }


def write_overlay(
    photo_id: str,
    scan_id: str,
    query_profile: Sequence[Sequence[tuple[float, float]]],
    wear_profile: Sequence[Sequence[tuple[float, float]]],
    rows: Mapping[str, Any],
) -> tuple[Path, Path]:
    overlays_dir = OUTPUT_DIR / "overlays"
    overlays_dir.mkdir(parents=True, exist_ok=True)
    stem = f"{photo_id}--{scan_id.lower()}"
    json_path = overlays_dir / f"{stem}.json"
    svg_path = overlays_dir / f"{stem}.svg"
    payload = {
        "schemaVersion": "canonical-visible-overlay/v1",
        "photoId": photo_id,
        "scanId": scan_id,
        "canonicalY": [round(index / (PROFILE_SAMPLES - 1), 6) for index in range(PROFILE_SAMPLES)],
        "photo": profile_outer(query_profile),
        "wear": profile_outer(wear_profile),
        "rows": rows,
        "matchingAxes": "canonical height-aligned X/Y only",
        "topologyWarning": "different source topologies; overlay compares visible outline, not vertex IDs",
    }
    json_path.write_text(json.dumps(payload, separators=(",", ":")) + "\n")

    width, height = 420, 620
    x_scale = 460.0
    y_scale = 540.0
    center_x = width / 2.0
    top_y = 40.0

    def points(profile: Sequence[Sequence[tuple[float, float]]], side: str) -> str:
        result = []
        for index, intervals in enumerate(profile):
            if not intervals:
                continue
            x = intervals[0][0] if side == "left" else intervals[-1][1]
            y = index / (PROFILE_SAMPLES - 1)
            result.append(f"{center_x + x * x_scale:.2f},{top_y + y * y_scale:.2f}")
        return " ".join(result)

    row_lines = []
    for name, row in rows.items():
        if not row.get("available"):
            continue
        y = top_y + float(row["canonicalBodyY"]) * y_scale
        row_lines.append(
            f'<line x1="50" y1="{y:.2f}" x2="370" y2="{y:.2f}" stroke="#334155" stroke-dasharray="3 4"/>'
            f'<text x="54" y="{y - 4:.2f}" fill="#94a3b8" font-size="10">{name}</text>'
        )
    svg = f'''<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}">
<rect width="100%" height="100%" fill="#020617"/>
<text x="16" y="22" fill="#f8fafc" font-family="sans-serif" font-size="14">{photo_id} vs {scan_id}</text>
<line x1="{center_x}" y1="{top_y}" x2="{center_x}" y2="{top_y + y_scale}" stroke="#1e293b"/>
{''.join(row_lines)}
<polyline points="{points(wear_profile, 'left')}" fill="none" stroke="#fb923c" stroke-width="2"/>
<polyline points="{points(wear_profile, 'right')}" fill="none" stroke="#fb923c" stroke-width="2"/>
<polyline points="{points(query_profile, 'left')}" fill="none" stroke="#22d3ee" stroke-width="2"/>
<polyline points="{points(query_profile, 'right')}" fill="none" stroke="#22d3ee" stroke-width="2"/>
<text x="16" y="604" fill="#22d3ee" font-family="sans-serif" font-size="12">photo</text>
<text x="74" y="604" fill="#fb923c" font-family="sans-serif" font-size="12">WEAR</text>
</svg>'''
    svg_path.write_text(svg)
    return json_path, svg_path


def compare_photo_candidate(
    query: Mapping[str, Any],
    wear: Mapping[str, Any],
    semantic: Mapping[str, Any],
    metric_rows: Mapping[str, Any] | None,
    canonical_row_medians: Mapping[str, float],
) -> dict[str, Any]:
    regional: dict[str, Any] = {}
    weighted_error = 0.0
    weight_total = 0.0
    for name, spec in REGIONS.items():
        metric = regional_error(
            query["profile"],
            wear["profile"],
            start=float(spec["start"]),
            end=float(spec["end"]),
            mode=str(spec["mode"]),
        )
        uncertainty = "high" if name in {"arms", "feet"} else "medium"
        metric["uncertainty"] = uncertainty
        metric["poseSensitivity"] = (
            "high: Delaram is near arms-down; WEAR is canonical A-pose"
            if name == "arms"
            else "medium" if name == "feet" else "low-to-medium"
        )
        regional[name] = metric
        error = metric["meanBoundaryErrorBodyHeight"]
        if error is not None and metric["coverage"] >= 0.50:
            weighted_error += float(error) * float(spec["weight"])
            weight_total += float(spec["weight"])
    overall_error = weighted_error / max(1e-12, weight_total)
    overall_score = max(0.0, 100.0 * (1.0 - overall_error / 0.12))
    rows = named_row_differences(
        query["profile"],
        wear["profile"],
        semantic,
        metric_rows,
        canonical_row_medians,
    )
    overlay_json, overlay_svg = write_overlay(
        str(query["photoId"]),
        str(wear["scanId"]),
        query["profile"],
        wear["profile"],
        rows,
    )
    return {
        "scanId": wear["scanId"],
        "overallScore": round(overall_score, 2),
        "overallMeanBoundaryErrorBodyHeight": round(overall_error, 6),
        "confidence": "medium" if overall_error <= 0.055 and weight_total >= 0.90 else "low",
        "regionalScores": regional,
        "rowDifferences": rows,
        "canonicalOverlay": str(overlay_json.relative_to(ROOT)),
        "canonicalOverlaySvg": str(overlay_svg.relative_to(ROOT)),
        "topology": {
            "sharedVertexIds": False,
            "rankingMethod": "anatomically height-aligned visible outline",
            "poseAdjustedPhotoOverlayUsedForRanking": False,
        },
        "caveats": [
            "Delaram outline contains tight clothing and visible hair.",
            "WEAR is canonical A-pose while Delaram's arms are closer to her sides.",
            "This compares visible front width and outline only; hidden body shape is unknown.",
        ],
    }


def profile_distance(
    left: Sequence[Sequence[tuple[float, float]]],
    right: Sequence[Sequence[tuple[float, float]]],
    start: float = 0.16,
    end: float = 0.995,
) -> float:
    values: list[float] = []
    for index in range(PROFILE_SAMPLES):
        y = index / (PROFILE_SAMPLES - 1)
        if not start <= y <= end or not left[index] or not right[index]:
            continue
        left_width = sum(b - a for a, b in left[index])
        right_width = sum(b - a for a, b in right[index])
        values.append(abs(left_width - right_width))
    return sum(values) / max(1, len(values))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=OUTPUT_DIR / "index.json")
    args = parser.parse_args()

    semantic = load_semantic_cohort()
    models = load_model_cohort(semantic)
    canonical_anchors = canonical_anchor_medians(semantic)
    canonical_row_medians = {
        row: median(
            float(entry["descriptor"]["features"][f"row.{row}.y"])
            for entry in semantic.values()
            if f"row.{row}.y" in entry["descriptor"]["features"]
        )
        for row in ROW_NAMES
    }
    metric_lines, metric_line_status = load_metric_lines_if_supported()
    canonical_row_medians = exact_metric_row_medians(
        metric_lines, canonical_row_medians
    )

    queries = {
        photo_id: build_query_profile(photo_id, canonical_anchors)
        for photo_id in PHOTO_IDS
    }
    wear_profiles = {
        scan_id: build_wear_profile(models[scan_id], semantic[scan_id], canonical_anchors)
        for scan_id in sorted(models)
    }

    photo_results: list[dict[str, Any]] = []
    match_by_photo: dict[str, dict[str, dict[str, Any]]] = {}
    for photo_id in PHOTO_IDS:
        matches = [
            compare_photo_candidate(
                queries[photo_id],
                wear_profiles[scan_id],
                semantic[scan_id],
                metric_lines.get(scan_id),
                canonical_row_medians,
            )
            for scan_id in sorted(wear_profiles)
        ]
        matches.sort(key=lambda item: item["overallMeanBoundaryErrorBodyHeight"])
        for rank, match in enumerate(matches, 1):
            match["rank"] = rank
        match_by_photo[photo_id] = {match["scanId"]: match for match in matches}
        query = queries[photo_id]
        photo_results.append(
            {
                "photoId": photo_id,
                "queryMesh": {
                    "path": str(query["meshPath"].relative_to(ROOT)),
                    "sha256": query["meshSha256"],
                    "source": query["source"],
                    "topology": query["topology"],
                },
                "alignmentAnchors": {
                    "source": "Meta Sapiens2 2D pairs plus face/foot frame",
                    "sourceBodyY": {
                        key: round(float(value), 6)
                        for key, value in query["frame"]["sourceAnchors"].items()
                    },
                    "canonicalBodyY": {
                        key: round(float(value), 6)
                        for key, value in canonical_anchors.items()
                    },
                    "evidence": query["frame"]["anchorEvidence"],
                },
                "rowWidths": photo_row_widths(
                    query["profile"], canonical_row_medians
                ),
                "candidates": matches,
            }
        )

    consensus: list[dict[str, Any]] = []
    for scan_id in sorted(wear_profiles):
        individual = [match_by_photo[photo_id][scan_id] for photo_id in PHOTO_IDS]
        mean_error = sum(
            item["overallMeanBoundaryErrorBodyHeight"] for item in individual
        ) / len(individual)
        scores = [item["overallScore"] for item in individual]
        ranks = [item["rank"] for item in individual]
        confidence = (
            "medium"
            if max(ranks) <= 5 and max(scores) - min(scores) <= 8.0
            else "low"
        )
        consensus.append(
            {
                "scanId": scan_id,
                "meanOverallScore": round(sum(scores) / len(scores), 2),
                "meanBoundaryErrorBodyHeight": round(mean_error, 6),
                "photoRanks": dict(zip(PHOTO_IDS, ranks)),
                "scoreRange": [min(scores), max(scores)],
                "confidence": confidence,
                "profile": {
                    "gender": semantic[scan_id]["gender"],
                    "heightCm": semantic[scan_id]["height_cm"],
                    "weightKg": semantic[scan_id]["weight_kg"],
                },
                "wearEvidence": {
                    "glb": str(wear_profiles[scan_id]["modelPath"].relative_to(ROOT)),
                    "glbSha256": wear_profiles[scan_id]["modelSha256"],
                    "landmarks": str(
                        wear_profiles[scan_id]["landmarkPath"].relative_to(ROOT)
                    ),
                    "landmarksSha256": wear_profiles[scan_id]["landmarkSha256"],
                    "frame": wear_profiles[scan_id]["frameEvidence"],
                    "mesh": wear_profiles[scan_id]["mesh"],
                },
            }
        )
    consensus.sort(key=lambda item: item["meanBoundaryErrorBodyHeight"])
    for rank, item in enumerate(consensus, 1):
        item["rank"] = rank

    cross_photo_error = profile_distance(
        queries["delaram"]["profile"], queries["delaram-2"]["profile"]
    )
    output = {
        "schemaVersion": SCHEMA_VERSION,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "status": "candidate-evidence-only",
        "releaseAllowed": False,
        "device": "cpu",
        "queryPolicy": {
            "gender": QUERY_GENDER,
            "heightCm": QUERY_HEIGHT_CM,
            "weightKg": QUERY_WEIGHT_KG,
            "visibleTruth": "Blender-generated Delaram 2D mesh outline",
            "hiddenBodyClaim": False,
        },
        "cohortPolicy": {
            "sameGender": True,
            "heightToleranceCm": HEIGHT_TOLERANCE_CM,
            "weightToleranceKg": WEIGHT_TOLERANCE_KG,
            "standingOnly": True,
            "canonicalView": "front-50",
            "count": len(semantic),
            "scanIds": sorted(semantic),
        },
        "rankingInputs": [
            "Blender visible 2D outline",
            "Sapiens2 vertical alignment anchors",
            "real cleaned WEAR GLB canonical front X/Y projection",
            "leakage-safe normalized WEAR 2D row endpoints",
            "gender plus strict height and weight filter",
        ],
        "forbiddenInputs": list(FORBIDDEN_RANKING_INPUTS),
        "metricLineAssetStatus": metric_line_status,
        "rankingScopes": {
            "perPhoto": {
                "path": "photos[].candidates",
                "meaning": "ranking for that one selected Delaram photo only",
            },
            "twoPhotoConsensus": {
                "path": "consensusRanking",
                "meaning": "arithmetic mean of Delaram and Delaram 2 outline scores",
                "defaultForCrossPhotoBodySearch": True,
            },
        },
        "canonicalAlignment": {
            "anchors": canonical_anchors,
            "rowMedians": canonical_row_medians,
            "method": "piecewise top/shoulder/hip/knee/ankle/bottom alignment",
            "wearRenderPixelAspect": {
                "width": CANONICAL_RENDER_WIDTH,
                "height": CANONICAL_RENDER_HEIGHT,
                "xOverY": CANONICAL_RENDER_ASPECT,
                "why": "normalized image X and Y require pixel-aspect correction before width/body-height",
            },
        },
        "regionalWeights": {
            name: float(spec["weight"]) for name, spec in REGIONS.items()
        },
        "photos": photo_results,
        "consensusRanking": consensus,
        "crossPhotoConsistency": {
            "meanOccupiedWidthDifferenceBodyHeight": round(cross_photo_error, 6),
            "confidenceImpact": "keeps every match at medium or low confidence",
        },
        "evidence": {
            "semanticIndex": str(WEAR_SEMANTIC_INDEX.relative_to(ROOT)),
            "semanticIndexSha256": sha256(WEAR_SEMANTIC_INDEX),
            "wearModelIndex": str(WEAR_MODEL_INDEX.relative_to(ROOT)),
            "wearModelIndexSha256": sha256(WEAR_MODEL_INDEX),
            "profileSamples": PROFILE_SAMPLES,
        },
        "caveats": [
            "The Delaram Blender mesh is an internal visible-outline triangulation, not a fixed MHR topology.",
            "The WEAR GLBs are real 3D scans, but ranking uses their canonical front X/Y projection only.",
            "The two source topologies are different; overlay does not imply vertex correspondence.",
            "Delaram wears tight clothing and WEAR scans use canonical A-pose, so arms and feet have high uncertainty.",
            "Named row centimetres are height-aligned visible-width equivalents, never tape circumference.",
            "No candidate is a proven hidden-body match; this output is private Test Lab evidence only.",
        ],
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(output, indent=2) + "\n")
    PROOF_DIR.mkdir(parents=True, exist_ok=True)
    summary_path = PROOF_DIR / "summary.json"
    summary_path.write_text(
        json.dumps(
            {
                "schemaVersion": SCHEMA_VERSION,
                "index": str(args.output.relative_to(ROOT)),
                "indexSha256": sha256(args.output),
                "cohortCount": len(semantic),
                "consensusRanking": consensus,
                "crossPhotoConsistency": output["crossPhotoConsistency"],
                "releaseAllowed": False,
            },
            indent=2,
        )
        + "\n"
    )
    print(
        json.dumps(
            {
                "output": str(args.output.relative_to(ROOT)),
                "summary": str(summary_path.relative_to(ROOT)),
                "cohortCount": len(semantic),
                "consensus": [
                    {
                        "rank": item["rank"],
                        "scanId": item["scanId"],
                        "score": item["meanOverallScore"],
                        "confidence": item["confidence"],
                    }
                    for item in consensus
                ],
            },
            indent=2,
        ),
        flush=True,
    )


if __name__ == "__main__":
    main()
