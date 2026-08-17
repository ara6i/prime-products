#!/usr/bin/env python3
"""Leakage-safe semantic 2D indexing and exact search for WEAR standing scans.

This module intentionally uses only projected, visible 2D geometry plus the
user-supplied profile fields (sex/gender, height, and weight).  It never reads
WEAR circumference, tape, depth, or hidden 3D contour values while building a
descriptor or ranking candidates.

The data set is small (4,326 standing scans), so an auditable exact scan is
preferred over an approximate nearest-neighbour dependency.
"""

from __future__ import annotations

import copy
import hashlib
import json
import math
import statistics
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Iterable, Iterator, Mapping, Sequence


INDEX_SCHEMA_VERSION = "wear-mesh-index/v1"
INDEX_VERSION = "wear-2d-semantic-v1"
DESCRIPTOR_SCHEMA_VERSION = "wear-semantic-2d-descriptor/v1"
CANONICAL_VIEW = "front-50"
EVALUATION_VIEWS = (
    "left-35",
    "right-35",
    "left-50",
    "right-50",
    "high-wide",
    "low-wide",
    "left-tele",
    "right-tele",
)

# Only these source/render fields may influence indexing or ranking.
ALLOWED_PROFILE_FIELDS = (
    "scan_id",
    "subject_id",
    "role",
    "gender",
    "height_cm",
    "weight_kg",
    "bmi",
    "training_pose_valid",
    "landmark_targets_valid",
)
ALLOWED_RENDER_GEOMETRY_FIELDS = ("landmarks_2d", "segments", "rows")

# Names are recorded in the manifest and regression-tested.  Their values are
# never copied into an index entry or sent into the scorer.
FORBIDDEN_LEAKAGE_FIELDS = (
    "measurements_mm",
    "extracted_standing_mm",
    "measurement_circumference_mm",
    "mesh_depth_mm",
    "mesh_contour_depth_mm",
    "mesh_depth_ratio",
    "mesh_section_perimeter_mm",
    "raw_mesh_section_perimeter_mm",
    "contour_points_normalized",
    "projected_contour",
    "apple_corrected_width_cm",
    "row_cm_per_px",
    "slice_height_mm",
    "anatomy_bounds_width_mm",
)

ROW_NAMES = ("neck", "chest", "underbust", "waist", "hips")
REQUIRED_ROWS = ("chest", "waist", "hips")

PAIR_SPECS = (
    ("face_infraorbitale", "Lt. Infraorbitale", "Rt. Infraorbitale", 0.45),
    ("face_tragion", "Lt. Tragion", "Rt. Tragion", 0.45),
    ("jaw", "Lt. Gonion", "Rt. Gonion", 0.55),
    ("clavicle", "Lt. Clavicale", "Rt. Clavicale", 1.40),
    ("shoulders", "Lt. Acromion", "Rt. Acromion", 2.40),
    ("axilla_front", "Lt. Axilla, Ant", "Rt. Axilla, Ant", 2.40),
    ("axilla_back", "Lt. Axilla, Post.", "Rt. Axilla, Post.", 1.50),
    ("bustpoints", "Lt. Thelion/Bustpoint", "Rt. Thelion/Bustpoint", 1.60),
    ("rib10", "Lt. 10th Rib", "Rt. 10th Rib", 2.00),
    ("iliocristale", "Lt. Iliocristale", "Rt. Iliocristale", 2.30),
    ("asis", "Lt. ASIS", "Rt. ASIS", 2.30),
    ("trochanter", "Lt. Trochanterion", "Rt. Trochanterion", 2.40),
    (
        "femoral_lateral",
        "Lt. Femoral Lateral Epicn",
        "Rt. Femoral Lateral Epicn",
        1.15,
    ),
    (
        "femoral_medial",
        "Lt. Femoral Medial Epicn",
        "Rt. Femoral Medial Epicn",
        1.00,
    ),
    ("knee_crease", "Lt. Knee Crease", "Rt. Knee Crease", 0.90),
    (
        "ankle_lateral",
        "Lt. Lateral Malleolus",
        "Rt. Lateral Malleolus",
        0.75,
    ),
    (
        "ankle_medial",
        "Lt. Medial Malleolus",
        "Rt. Medial Malleolus",
        0.65,
    ),
    ("heel", "Lt. Calcaneous, Post.", "Rt. Calcaneous, Post.", 0.55),
    ("toe", "Lt. Digit II", "Rt. Digit II", 0.55),
)

SEGMENT_SPECS = (
    ("left_sleeve", 1.00),
    ("right_sleeve", 1.00),
    ("left_inseam", 1.15),
    ("right_inseam", 1.15),
    ("shoulders", 1.20),
)

TOP_FRAME_LANDMARKS = (
    "Sellion",
    "Lt. Infraorbitale",
    "Rt. Infraorbitale",
    "Lt. Tragion",
    "Rt. Tragion",
    "Supramenton",
    "Cervicale",
    "Nuchale",
)
BOTTOM_FRAME_LANDMARKS = (
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
CENTER_FRAME_PAIRS = (
    ("Lt. Acromion", "Rt. Acromion"),
    ("Lt. Axilla, Ant", "Rt. Axilla, Ant"),
    ("Lt. ASIS", "Rt. ASIS"),
    ("Lt. Trochanterion", "Rt. Trochanterion"),
    ("Lt. Medial Malleolus", "Rt. Medial Malleolus"),
)


def _feature_layout() -> tuple[dict[str, Any], ...]:
    result: list[dict[str, Any]] = []
    for row in ROW_NAMES:
        result.append(
            {
                "name": f"row.{row}.width",
                "group": "torso_rows",
                "weight": 3.0 if row in REQUIRED_ROWS else 2.0,
            }
        )
        result.append(
            {
                "name": f"row.{row}.y",
                "group": "vertical_levels",
                "weight": 0.90,
            }
        )
    for label, _left, _right, width_weight in PAIR_SPECS:
        result.append(
            {
                "name": f"pair.{label}.width",
                "group": "skeletal_widths",
                "weight": width_weight,
            }
        )
        result.append(
            {
                "name": f"pair.{label}.y",
                "group": "vertical_levels",
                "weight": 0.35,
            }
        )
    for label, weight in SEGMENT_SPECS:
        result.append(
            {
                "name": f"segment.{label}.length",
                "group": "limb_proportions",
                "weight": weight,
            }
        )
    return tuple(result)


FEATURE_LAYOUT = _feature_layout()
FEATURE_BY_NAME = {spec["name"]: spec for spec in FEATURE_LAYOUT}
TOTAL_FEATURE_WEIGHT = sum(float(spec["weight"]) for spec in FEATURE_LAYOUT)


@dataclass(frozen=True)
class SearchConfig:
    height_tolerance_cm: float = 1.0
    weight_tolerance_kg: float = 1.0
    profile_weight: float = 0.05
    minimum_joint_weight_coverage: float = 0.50


DEFAULT_SEARCH_CONFIG = SearchConfig()


def _finite_number(value: Any) -> float | None:
    if isinstance(value, bool):
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if math.isfinite(number) else None


def normalize_gender(value: Any) -> str:
    normalized = str(value or "").strip().lower()
    aliases = {
        "f": "female",
        "woman": "female",
        "women": "female",
        "m": "male",
        "man": "male",
        "men": "male",
    }
    return aliases.get(normalized, normalized)


def _visible_point(landmarks: Mapping[str, Any], name: str) -> tuple[float, float] | None:
    raw = landmarks.get(name)
    if not isinstance(raw, Mapping) or raw.get("visible") is False:
        return None
    x = _finite_number(raw.get("x"))
    y = _finite_number(raw.get("y"))
    if x is None or y is None:
        return None
    return x, y


def _median(values: Sequence[float]) -> float:
    return float(statistics.median(values))


def _body_frame(landmarks: Mapping[str, Any]) -> dict[str, Any]:
    visible = {
        name: point
        for name in landmarks
        if (point := _visible_point(landmarks, name)) is not None
    }
    top_values = [visible[name][1] for name in TOP_FRAME_LANDMARKS if name in visible]
    bottom_values = [
        visible[name][1] for name in BOTTOM_FRAME_LANDMARKS if name in visible
    ]
    if not top_values and visible:
        top_values = [point[1] for point in visible.values()]
    if not bottom_values and visible:
        bottom_values = [point[1] for point in visible.values()]

    top_y = min(top_values) if top_values else None
    bottom_y = max(bottom_values) if bottom_values else None
    span = (
        bottom_y - top_y
        if top_y is not None and bottom_y is not None and bottom_y > top_y
        else None
    )

    center_candidates: list[float] = []
    for left_name, right_name in CENTER_FRAME_PAIRS:
        left = visible.get(left_name)
        right = visible.get(right_name)
        if left and right:
            center_candidates.append((left[0] + right[0]) / 2.0)
    if not center_candidates and visible:
        center_candidates = [point[0] for point in visible.values()]
    center_x = _median(center_candidates) if center_candidates else None

    valid = (
        span is not None
        and span >= 0.20
        and center_x is not None
        and len(visible) >= 12
    )
    return {
        "valid": valid,
        "top_y": top_y,
        "bottom_y": bottom_y,
        "center_x": center_x,
        "body_span": span,
        "visible_landmarks": len(visible),
        "total_landmarks": len(landmarks),
        "points": visible,
    }


def _normalized_y(y: float, frame: Mapping[str, Any]) -> float:
    return (y - float(frame["top_y"])) / float(frame["body_span"])


def _segment_length(points: Any, body_span: float) -> float | None:
    if not isinstance(points, Sequence) or isinstance(points, (str, bytes)):
        return None
    parsed: list[tuple[float, float]] = []
    for raw in points:
        if not isinstance(raw, Mapping) or raw.get("visible") is False:
            return None
        x = _finite_number(raw.get("x"))
        y = _finite_number(raw.get("y"))
        if x is None or y is None:
            return None
        parsed.append((x, y))
    if len(parsed) < 2:
        return None
    length = sum(
        math.hypot(b[0] - a[0], b[1] - a[1])
        for a, b in zip(parsed, parsed[1:])
    )
    return length / body_span


def build_descriptor(render_record: Mapping[str, Any]) -> dict[str, Any]:
    """Build a semantic 2D descriptor from an allowlisted projection only."""

    landmarks = render_record.get("landmarks_2d")
    rows = render_record.get("rows")
    segments = render_record.get("segments")
    if not isinstance(landmarks, Mapping):
        landmarks = {}
    if not isinstance(rows, Mapping):
        rows = {}
    if not isinstance(segments, Mapping):
        segments = {}

    frame = _body_frame(landmarks)
    features: dict[str, float] = {}
    present_required_rows: list[str] = []
    issues: list[str] = []
    if not frame["valid"]:
        issues.append("invalid_body_frame")
    else:
        span = float(frame["body_span"])
        visible_points: Mapping[str, tuple[float, float]] = frame["points"]

        for row_name in ROW_NAMES:
            row = rows.get(row_name)
            if not isinstance(row, Mapping):
                continue
            if row.get("accepted") is False or row.get("geometry_target_valid") is False:
                continue
            left = _finite_number(row.get("left_x_norm"))
            right = _finite_number(row.get("right_x_norm"))
            y = _finite_number(row.get("y_norm"))
            if left is not None and right is not None and right != left:
                features[f"row.{row_name}.width"] = abs(right - left) / span
                if row_name in REQUIRED_ROWS:
                    present_required_rows.append(row_name)
            if y is not None:
                features[f"row.{row_name}.y"] = _normalized_y(y, frame)

        for label, left_name, right_name, _weight in PAIR_SPECS:
            left = visible_points.get(left_name)
            right = visible_points.get(right_name)
            if left is None or right is None:
                continue
            features[f"pair.{label}.width"] = abs(right[0] - left[0]) / span
            features[f"pair.{label}.y"] = _normalized_y(
                (left[1] + right[1]) / 2.0, frame
            )

        for label, _weight in SEGMENT_SPECS:
            length = _segment_length(segments.get(label), span)
            if length is not None:
                features[f"segment.{label}.length"] = length

    present_weight = sum(
        float(FEATURE_BY_NAME[name]["weight"])
        for name in features
        if name in FEATURE_BY_NAME
    )
    coverage = present_weight / TOTAL_FEATURE_WEIGHT if TOTAL_FEATURE_WEIGHT else 0.0
    source_pose_valid = render_record.get("training_pose_valid") is not False
    source_landmarks_valid = render_record.get("landmark_targets_valid") is not False
    if not source_pose_valid:
        issues.append("source_pose_invalid")
    if not source_landmarks_valid:
        issues.append("source_landmarks_invalid")
    missing_required = [name for name in REQUIRED_ROWS if name not in present_required_rows]
    if missing_required:
        issues.append("missing_required_rows:" + ",".join(missing_required))
    if coverage < 0.55:
        issues.append("low_feature_coverage")

    accepted = (
        bool(frame["valid"])
        and source_pose_valid
        and source_landmarks_valid
        and not missing_required
        and coverage >= 0.55
    )
    return {
        "schema_version": DESCRIPTOR_SCHEMA_VERSION,
        "features": {name: round(value, 9) for name, value in sorted(features.items())},
        "quality": {
            "accepted": accepted,
            "visible_landmarks": int(frame["visible_landmarks"]),
            "total_landmarks": int(frame["total_landmarks"]),
            "present_features": len(features),
            "total_features": len(FEATURE_LAYOUT),
            "weighted_coverage": round(coverage, 6),
            "required_rows_present": sorted(set(present_required_rows)),
            "body_span_normalized_image": (
                round(float(frame["body_span"]), 9) if frame["body_span"] is not None else None
            ),
            "issues": issues,
        },
    }


def public_profile(record: Mapping[str, Any]) -> dict[str, Any]:
    """Copy only the explicitly allowed profile and quality fields."""

    result: dict[str, Any] = {}
    for key in ALLOWED_PROFILE_FIELDS:
        if key in record:
            result[key] = copy.deepcopy(record[key])
    result["gender"] = normalize_gender(result.get("gender"))
    for key in ("height_cm", "weight_kg", "bmi"):
        value = _finite_number(result.get(key))
        result[key] = value
    return result


def make_index_entry(
    source_record: Mapping[str, Any],
    render_record: Mapping[str, Any],
    *,
    index_version: str = INDEX_VERSION,
) -> dict[str, Any]:
    profile = public_profile(source_record)
    scan_id = str(profile.get("scan_id") or render_record.get("scan_id") or "")
    if not scan_id:
        raise ValueError("WEAR index entry is missing scan_id")
    profile["scan_id"] = scan_id
    if not profile.get("subject_id"):
        profile["subject_id"] = render_record.get("subject_id")
    if not profile.get("role"):
        profile["role"] = render_record.get("role")
    if not profile.get("gender"):
        profile["gender"] = normalize_gender(render_record.get("gender"))
    for key in ("height_cm", "weight_kg", "bmi"):
        if profile.get(key) is None:
            profile[key] = _finite_number(render_record.get(key))

    descriptor = build_descriptor(render_record)
    source_quality = {
        "training_pose_valid": profile.get("training_pose_valid") is not False,
        "landmark_targets_valid": profile.get("landmark_targets_valid") is not False,
    }
    source_uri = render_record.get("image")
    return {
        "schema_version": INDEX_SCHEMA_VERSION,
        "index_version": index_version,
        "scan_id": scan_id,
        "subject_id": profile.get("subject_id"),
        "role": profile.get("role"),
        "gender": profile.get("gender"),
        "height_cm": profile.get("height_cm"),
        "weight_kg": profile.get("weight_kg"),
        "bmi": profile.get("bmi"),
        "canonical_view": str(render_record.get("view_id") or CANONICAL_VIEW),
        "canonical_render_uri": str(source_uri) if source_uri else None,
        "source_quality": source_quality,
        "descriptor": descriptor,
    }


def fit_robust_scaler(entries: Sequence[Mapping[str, Any]]) -> dict[str, Any]:
    """Fit per-feature robust scales using training-role accepted entries only."""

    training = [
        entry
        for entry in entries
        if entry.get("role") == "train"
        and entry.get("descriptor", {}).get("quality", {}).get("accepted") is True
    ]
    if not training:
        raise ValueError("No accepted train-role entries are available for scaler fitting")

    features: dict[str, Any] = {}
    for spec in FEATURE_LAYOUT:
        name = str(spec["name"])
        values = [
            float(entry["descriptor"]["features"][name])
            for entry in training
            if name in entry.get("descriptor", {}).get("features", {})
        ]
        if not values:
            continue
        median = float(statistics.median(values))
        absolute_deviations = [abs(value - median) for value in values]
        mad = float(statistics.median(absolute_deviations))
        stddev = float(statistics.pstdev(values)) if len(values) > 1 else 0.0
        scale = max(1.4826 * mad, 0.25 * stddev, 1e-4)
        features[name] = {
            "median": round(median, 10),
            "mad": round(mad, 10),
            "scale": round(scale, 10),
            "count": len(values),
        }
    return {
        "method": "train-role median plus max(1.4826*MAD, 0.25*population-std, 1e-4)",
        "fit_role": "train",
        "accepted_training_records": len(training),
        "features": features,
    }


def load_jsonl(path: Path | str) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    with Path(path).open("r", encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, 1):
            if not line.strip():
                continue
            try:
                records.append(json.loads(line))
            except json.JSONDecodeError as error:
                raise ValueError(f"Invalid JSONL at {path}:{line_number}: {error}") from error
    return records


def iter_jsonl(path: Path | str) -> Iterator[dict[str, Any]]:
    with Path(path).open("r", encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, 1):
            if not line.strip():
                continue
            try:
                yield json.loads(line)
            except json.JSONDecodeError as error:
                raise ValueError(f"Invalid JSONL at {path}:{line_number}: {error}") from error


def sha256_file(path: Path | str) -> str:
    digest = hashlib.sha256()
    with Path(path).open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_index(
    manifest_path: Path | str,
) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    manifest_file = Path(manifest_path)
    manifest = json.loads(manifest_file.read_text(encoding="utf-8"))
    artifact = manifest.get("artifacts", {}).get("index_jsonl")
    if not artifact:
        raise ValueError(f"Index manifest {manifest_file} does not name index_jsonl")
    index_path = manifest_file.parent / str(artifact)
    entries = load_jsonl(index_path)
    expected = manifest.get("counts", {}).get("indexed_records")
    if expected is not None and int(expected) != len(entries):
        raise ValueError(
            f"Index record count mismatch: manifest={expected}, jsonl={len(entries)}"
        )
    return manifest, entries


def query_from_render_record(render_record: Mapping[str, Any]) -> dict[str, Any]:
    """Strip identity and forbidden targets before constructing a search query."""

    profile = public_profile(render_record)
    return {
        "gender": profile.get("gender"),
        "height_cm": profile.get("height_cm"),
        "weight_kg": profile.get("weight_kg"),
        "descriptor": build_descriptor(render_record),
    }


def _validate_query(query: Mapping[str, Any]) -> None:
    gender = normalize_gender(query.get("gender"))
    height = _finite_number(query.get("height_cm"))
    weight = _finite_number(query.get("weight_kg"))
    if gender not in {"female", "male"}:
        raise ValueError("Query gender must be female or male")
    if height is None or weight is None:
        raise ValueError("Query requires finite height_cm and weight_kg")
    descriptor = query.get("descriptor")
    if not isinstance(descriptor, Mapping):
        raise ValueError("Query is missing descriptor")
    if descriptor.get("quality", {}).get("accepted") is not True:
        issues = descriptor.get("quality", {}).get("issues", [])
        raise ValueError(f"Query descriptor failed quality gate: {issues}")


def strict_cohort(
    query: Mapping[str, Any],
    entries: Sequence[Mapping[str, Any]],
    *,
    config: SearchConfig = DEFAULT_SEARCH_CONFIG,
) -> list[Mapping[str, Any]]:
    _validate_query(query)
    gender = normalize_gender(query.get("gender"))
    height = float(query["height_cm"])
    weight = float(query["weight_kg"])
    epsilon = 1e-9
    result: list[Mapping[str, Any]] = []
    for entry in entries:
        if normalize_gender(entry.get("gender")) != gender:
            continue
        candidate_height = _finite_number(entry.get("height_cm"))
        candidate_weight = _finite_number(entry.get("weight_kg"))
        if candidate_height is None or candidate_weight is None:
            continue
        if abs(candidate_height - height) > config.height_tolerance_cm + epsilon:
            continue
        if abs(candidate_weight - weight) > config.weight_tolerance_kg + epsilon:
            continue
        if entry.get("descriptor", {}).get("quality", {}).get("accepted") is not True:
            continue
        result.append(entry)
    return result


def _shape_score(
    query_features: Mapping[str, Any],
    candidate_features: Mapping[str, Any],
    scaler: Mapping[str, Any],
) -> tuple[float, float, dict[str, float]] | None:
    feature_scaler = scaler.get("features", {})
    weighted_distance = 0.0
    common_weight = 0.0
    grouped_distance: dict[str, float] = {}
    grouped_weight: dict[str, float] = {}
    query_weight = sum(
        float(FEATURE_BY_NAME[name]["weight"])
        for name in query_features
        if name in FEATURE_BY_NAME and name in feature_scaler
    )
    for name, raw_query in query_features.items():
        if name not in candidate_features or name not in FEATURE_BY_NAME:
            continue
        scaling = feature_scaler.get(name)
        if not isinstance(scaling, Mapping):
            continue
        scale = _finite_number(scaling.get("scale"))
        query_value = _finite_number(raw_query)
        candidate_value = _finite_number(candidate_features.get(name))
        if scale is None or scale <= 0 or query_value is None or candidate_value is None:
            continue
        spec = FEATURE_BY_NAME[name]
        weight = float(spec["weight"])
        distance = abs(query_value - candidate_value) / scale
        weighted_distance += weight * distance
        common_weight += weight
        group = str(spec["group"])
        grouped_distance[group] = grouped_distance.get(group, 0.0) + weight * distance
        grouped_weight[group] = grouped_weight.get(group, 0.0) + weight
    if common_weight <= 0 or query_weight <= 0:
        return None
    coverage = common_weight / query_weight
    groups = {
        group: grouped_distance[group] / grouped_weight[group]
        for group in grouped_distance
        if grouped_weight[group] > 0
    }
    return weighted_distance / common_weight, coverage, groups


def rank_candidates(
    query: Mapping[str, Any],
    entries: Sequence[Mapping[str, Any]],
    scaler: Mapping[str, Any],
    *,
    config: SearchConfig = DEFAULT_SEARCH_CONFIG,
) -> dict[str, Any]:
    """Exact, deterministic ranking inside the mandatory strict cohort."""

    _validate_query(query)
    cohort = strict_cohort(query, entries, config=config)
    query_features = query["descriptor"]["features"]
    query_height = float(query["height_cm"])
    query_weight = float(query["weight_kg"])
    matches: list[dict[str, Any]] = []
    for entry in cohort:
        scored = _shape_score(
            query_features,
            entry.get("descriptor", {}).get("features", {}),
            scaler,
        )
        if scored is None:
            continue
        shape_score, joint_coverage, groups = scored
        if joint_coverage < config.minimum_joint_weight_coverage:
            continue
        height_delta = abs(float(entry["height_cm"]) - query_height)
        weight_delta = abs(float(entry["weight_kg"]) - query_weight)
        profile_score = math.hypot(
            height_delta / max(config.height_tolerance_cm, 1e-9),
            weight_delta / max(config.weight_tolerance_kg, 1e-9),
        ) / math.sqrt(2.0)
        total_score = shape_score + config.profile_weight * profile_score
        matches.append(
            {
                "scan_id": entry.get("scan_id"),
                "subject_id": entry.get("subject_id"),
                "role": entry.get("role"),
                "gender": entry.get("gender"),
                "height_cm": entry.get("height_cm"),
                "weight_kg": entry.get("weight_kg"),
                "bmi": entry.get("bmi"),
                "canonical_view": entry.get("canonical_view"),
                "canonical_render_uri": entry.get("canonical_render_uri"),
                "shape_score": round(shape_score, 9),
                "profile_score": round(profile_score, 9),
                "total_score": round(total_score, 9),
                "joint_feature_coverage": round(joint_coverage, 6),
                "component_scores": {
                    name: round(value, 9) for name, value in sorted(groups.items())
                },
                "height_delta_cm": round(height_delta, 6),
                "weight_delta_kg": round(weight_delta, 6),
            }
        )

    matches.sort(key=lambda item: (item["total_score"], str(item["scan_id"])))
    for rank, match in enumerate(matches, 1):
        match["rank"] = rank

    shape_order = sorted(matches, key=lambda item: (item["shape_score"], str(item["scan_id"])))
    shape_ranks = {str(item["scan_id"]): rank for rank, item in enumerate(shape_order, 1)}
    profile_order = sorted(
        matches, key=lambda item: (item["profile_score"], str(item["scan_id"]))
    )
    profile_ranks = {
        str(item["scan_id"]): rank for rank, item in enumerate(profile_order, 1)
    }
    for match in matches:
        match["shape_only_rank"] = shape_ranks[str(match["scan_id"])]
        match["profile_only_rank"] = profile_ranks[str(match["scan_id"])]

    return {
        "search_method": "exact-direct-scan",
        "strict_criteria": {
            "same_gender": True,
            "height_tolerance_cm": config.height_tolerance_cm,
            "weight_tolerance_kg": config.weight_tolerance_kg,
            "silent_fallback": False,
        },
        "cohort_count": len(cohort),
        "scored_count": len(matches),
        "query_quality": copy.deepcopy(query["descriptor"]["quality"]),
        "matches": matches,
    }


def search_index(
    query: Mapping[str, Any],
    manifest: Mapping[str, Any],
    entries: Sequence[Mapping[str, Any]],
    *,
    top_k: int = 10,
    config: SearchConfig = DEFAULT_SEARCH_CONFIG,
) -> dict[str, Any]:
    ranked = rank_candidates(
        query,
        entries,
        manifest.get("robust_scaler", {}),
        config=config,
    )
    all_matches = ranked["matches"]
    ranked["matches"] = all_matches[: max(top_k, 0)] if top_k else all_matches
    ranked["returned_count"] = len(ranked["matches"])
    ranked["index_version"] = manifest.get("index_version")
    ranked["descriptor_version"] = manifest.get("descriptor", {}).get(
        "schema_version", DESCRIPTOR_SCHEMA_VERSION
    )
    ranked["leakage_guard"] = {
        "circumference_used": False,
        "depth_used": False,
        "tape_used": False,
        "query_identity_used": False,
    }
    return ranked


def evenly_spaced(items: Sequence[Any], count: int) -> list[Any]:
    if count <= 0 or not items:
        return []
    if count >= len(items):
        return list(items)
    if count == 1:
        return [items[len(items) // 2]]
    indices = [round(index * (len(items) - 1) / (count - 1)) for index in range(count)]
    return [items[index] for index in indices]


def select_pinned_test_scans(
    entries: Sequence[Mapping[str, Any]], count: int = 24
) -> list[str]:
    """Deterministically span female/male BMI and stature instead of cherry-picking."""

    tests = [entry for entry in entries if entry.get("role") == "test"]
    grouped: dict[str, list[Mapping[str, Any]]] = {"female": [], "male": []}
    for entry in tests:
        gender = normalize_gender(entry.get("gender"))
        if gender in grouped:
            grouped[gender].append(entry)
    female_count = count // 2 + count % 2
    male_count = count // 2
    chosen: list[Mapping[str, Any]] = []
    for gender, target in (("female", female_count), ("male", male_count)):
        ordered = sorted(
            grouped[gender],
            key=lambda entry: (
                _finite_number(entry.get("bmi")) or -1.0,
                _finite_number(entry.get("height_cm")) or -1.0,
                _finite_number(entry.get("weight_kg")) or -1.0,
                str(entry.get("scan_id")),
            ),
        )
        chosen.extend(evenly_spaced(ordered, min(target, len(ordered))))
    return sorted(str(entry["scan_id"]) for entry in chosen)


def compact_json(record: Mapping[str, Any]) -> str:
    return json.dumps(record, ensure_ascii=False, separators=(",", ":"), sort_keys=True)


def summarize_quality(entries: Sequence[Mapping[str, Any]]) -> dict[str, Any]:
    accepted = [
        entry
        for entry in entries
        if entry.get("descriptor", {}).get("quality", {}).get("accepted") is True
    ]
    issues: dict[str, int] = {}
    coverages: list[float] = []
    for entry in entries:
        quality = entry.get("descriptor", {}).get("quality", {})
        coverage = _finite_number(quality.get("weighted_coverage"))
        if coverage is not None:
            coverages.append(coverage)
        for issue in quality.get("issues", []):
            issues[str(issue)] = issues.get(str(issue), 0) + 1
    return {
        "accepted": len(accepted),
        "rejected": len(entries) - len(accepted),
        "rejected_scan_ids": sorted(
            str(entry.get("scan_id"))
            for entry in entries
            if entry.get("descriptor", {}).get("quality", {}).get("accepted") is not True
        ),
        "acceptance_rate": round(len(accepted) / len(entries), 6) if entries else 0.0,
        "weighted_coverage_median": (
            round(float(statistics.median(coverages)), 6) if coverages else None
        ),
        "issues": dict(sorted(issues.items())),
    }


def role_counts(entries: Iterable[Mapping[str, Any]]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for entry in entries:
        role = str(entry.get("role") or "missing")
        counts[role] = counts.get(role, 0) + 1
    return dict(sorted(counts.items()))


def gender_counts(entries: Iterable[Mapping[str, Any]]) -> dict[str, int]:
    counts: dict[str, int] = {}
    for entry in entries:
        gender = normalize_gender(entry.get("gender")) or "missing"
        counts[gender] = counts.get(gender, 0) + 1
    return dict(sorted(counts.items()))
