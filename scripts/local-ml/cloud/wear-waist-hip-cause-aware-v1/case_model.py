#!/usr/bin/env python3
"""Transparent case matching and physical waist/hip reconstruction."""

from __future__ import annotations

import math
from typing import Any

import numpy as np

from features import PROFILE_ROWS, feature_groups, feature_schema


ROWS = ("waist", "hips")
SHAPE_POINTS = 32
RECIPES = (
    "teacher_average_v0",
    "direct_outline_v1",
    "silhouette_extrema_v2",
    "hip_extrema_v3",
    "audited_tape_cases_v4",
    "hip_tape_cases_v5",
    "hip_tape_same_gender_v6",
    "hip_tape_same_bmi_band_v7",
    "bmi_bias_correction_v8",
    "bmi_bias_guarded_v9",
    "transparent_bmi_guard_v1",
    "transparent_ratio_v2",
    "target_local_cases_v1",
    "waist_local_hip_ratio_v3",
    "waist_local_hip_physical_v4",
    "waist_local_hip_physical_guard_v5",
    "waist_local_hip_banded_physical_v6",
    "waist_local_hip_named_shape_v7",
    "waist_local_tape_v1",
    "waist_local_tape_median_v2",
)
OUTLINE_FRACTIONS = np.linspace(0.08, 0.92, PROFILE_ROWS)
GROUP_IMPORTANCE = {
    "profile": 0.30,
    "global_silhouette": 0.10,
    "outline_rows": 0.55,
    "vertical_bands": 0.05,
}

NAMED_HIP_INPUT_NAMES = (
    "height", "weight", "female indicator", "BMI", "front silhouette area", "body-box fill",
    "shoulder A-to-B width", "chest A-to-B width", "waist A-to-B width", "hip A-to-B width",
    "mass-to-front-area depth clue", "waist-to-shoulder ratio", "hip-to-shoulder ratio", "hip-to-waist ratio",
    "outline row 8 A-to-B width", "outline row 10 A-to-B width", "outline row 12 A-to-B width",
    "outline row 14 A-to-B width", "outline row 16 A-to-B width", "outline row 18 A-to-B width",
    "outline row 20 A-to-B width", "front-area band 0", "front-area band 1", "front-area band 2",
    "front-area band 3", "front-area band 4", "front-area band 5", "front-area band 6", "front-area band 7",
)
NAMED_HIP_CENTERS = np.asarray((
    0.0875717316, 0.0012626067, 0.0223166844, 0.3117378379, 0.0002775696, -1.7954314215,
    4.4687467180, 3.8918688772, 0.1934504623, 0.0195287429, 0.0205748284, -0.0677913617,
    0.0003401571, 0.1088501085, 1.0518980288, -0.7206161684, 0.0239121641, 0.7875593489,
    0.9713985421, -1.3293513684, -3.9763845893, 0.0987029384, 0.2232482812, 0.3547755587,
    0.3444667545, 0.2752401906, 0.1743609044, 0.1420937649, 0.0906018440,
), dtype=np.float64)
NAMED_HIP_SCALES = np.asarray((
    1.0345458276, 0.9159615118, 0.4995017173, 1.0451587479, 0.8695474828, 0.2702556154,
    1.5945594133, 2.6867334702, 1.1794040651, 0.9871469255, 0.9309494007, 0.3969318067,
    0.6264704469, 1.4999674495, 2.5118440455, 1.0554005259, 0.9922395472, 0.8217940389,
    1.1670304442, 2.4370569787, 1.4318117110, 0.0065528708, 0.0222325844, 0.0349706944,
    0.0316982266, 0.0232287382, 0.0206310400, 0.0155334380, 0.0086149756,
), dtype=np.float64)
NAMED_HIP_COEFFICIENTS = np.asarray((
    1.6454479555, -0.2594614976, 0.9400694430, 6.3581242890, -2.2069392033, -0.1667300064,
    0.0225452566, -0.2308529019, -0.9827388115, 4.0836253852, 0.8984565314, 0.5365313437,
    -0.7181292825, 0.2081775829, -0.2990249945, -0.5803397858, 0.1031111399, 1.4822815012,
    -0.0589618556, 0.1471876082, -0.0214574837, -0.2288254873, -0.1410083468, -0.3180083416,
    0.1151978327, 0.6717735440, 1.2748354356, -0.1638650366, 0.0437865994,
), dtype=np.float64)
NAMED_HIP_INTERCEPT_CM = 103.4286370209
NAMED_HIP_HIGH_BMI_CENTERS = np.asarray((
    0.1162354866, 1.3603086250, 0.0041459370, 2.1586518115, 1.1006809593, -1.5896894925,
    6.5561290031, 6.7780740715, 1.7801920036, 1.1578562950, 1.5108294311, 0.1854275485,
    -0.2469455010, -0.8991392596, 4.1797430306, 0.7410903142, 1.4499278810, 1.8196826111,
    1.9172132040, 1.0339065952, -2.2612882770, 0.1019938344, 0.2485720683, 0.4067514332,
    0.3892143319, 0.2970345468, 0.1992628052, 0.1602315499, 0.0995102922,
), dtype=np.float64)
NAMED_HIP_HIGH_BMI_SCALES = np.asarray((
    1.0615383176, 0.9015017589, 0.4999828109, 0.9434817141, 0.7766271253, 0.2610061488,
    1.4518315883, 1.9303029425, 1.0375603357, 1.1094422277, 0.8108774486, 0.4111384636,
    0.6417942603, 1.2888321518, 2.5441911923, 1.0829020910, 0.9817346288, 0.9033630482,
    0.9934692892, 1.5805942388, 2.2947107200, 0.0063849115, 0.0206140039, 0.0286748801,
    0.0313891346, 0.0239950745, 0.0234672428, 0.0173503874, 0.0095407536,
), dtype=np.float64)
NAMED_HIP_HIGH_BMI_COEFFICIENTS = np.asarray((
    0.8609352800, 0.9719979721, 0.5226525647, 4.8865152926, -2.8159010612, -0.0685207772,
    0.0774077979, -0.4357356316, 0.8596818108, 2.6960977208, 0.8778797669, -0.1739189011,
    0.1352207603, 0.7075361357, -0.5073687855, -0.9201319636, -0.1424632530, 3.0939487893,
    -0.1908470962, -0.0824398313, -0.0694456324, 0.0003866273, -0.1227914031, 0.3835337610,
    1.7176414060, 0.4891331596, 0.6267750630, 0.0300733022, 0.0628705833,
), dtype=np.float64)
NAMED_HIP_HIGH_BMI_INTERCEPT_CM = 118.7474639112


def _named_visible_hip_formula(
    features: np.ndarray,
    schema: dict[str, int],
) -> tuple[float, str, list[dict[str, float | str]]]:
    """Return the printed hip formula and every named per-input contribution."""
    height_cm = float(features[schema["height_profile"]]) * 20.0 + 170.0
    weight_kg = float(features[schema["weight_profile"]]) * 25.0 + 70.0
    bmi = float(features[schema["bmi_profile"]]) * 8.0 + 24.0
    female = float(features[schema["female"]])
    area = float(features[schema["silhouette.area_fraction"]])
    fill = float(features[schema["silhouette.bbox_fill_fraction"]])
    widths = np.asarray([
        features[schema[f"outline.row_{row:02d}.width"]]
        for row in range(32)
    ], dtype=np.float64)
    bands = np.asarray([
        features[schema[f"silhouette.band_{band:02d}.area_fraction"]]
        for band in range(8)
    ], dtype=np.float64)
    shoulder = float(widths[4:10].max())
    chest = float(widths[7:13].max())
    waist = float(widths[9:16].min())
    hip = float(widths[13:20].max())
    height_m = height_cm / 100.0
    mass_depth = weight_kg / max(area * height_m * height_m, 1e-6)
    values = np.asarray((
        (height_cm - 170.0) / 10.0,
        (weight_kg - 75.0) / 20.0,
        female - 0.5,
        (bmi - 24.0) / 5.0,
        (area - 0.195) / 0.02,
        (fill - 0.5) / 0.1,
        (shoulder * height_cm - 42.0) / 4.0,
        (chest * height_cm - 40.0) / 4.0,
        (waist * height_cm - 33.0) / 4.0,
        (hip * height_cm - 44.0) / 4.0,
        (mass_depth - 130.0) / 20.0,
        (waist / max(shoulder, 1e-6) - 0.57) / 0.1,
        (hip / max(shoulder, 1e-6) - 0.74) / 0.1,
        (hip / max(waist, 1e-6) - 1.31) / 0.1,
        *[(float(widths[row]) * height_cm - 38.0) / 5.0 for row in (8, 10, 12, 14, 16, 18, 20)],
        *bands.tolist(),
    ), dtype=np.float64)
    if bmi >= 30.0:
        formula_name = "BMI 30 or above named visible hip formula"
        centers = NAMED_HIP_HIGH_BMI_CENTERS
        scales = NAMED_HIP_HIGH_BMI_SCALES
        coefficients = NAMED_HIP_HIGH_BMI_COEFFICIENTS
        intercept = NAMED_HIP_HIGH_BMI_INTERCEPT_CM
    else:
        formula_name = "below BMI 30 named visible hip formula"
        centers = NAMED_HIP_CENTERS
        scales = NAMED_HIP_SCALES
        coefficients = NAMED_HIP_COEFFICIENTS
        intercept = NAMED_HIP_INTERCEPT_CM
    standardized = (values - centers) / scales
    contributions = standardized * coefficients
    prediction = float(intercept + contributions.sum())
    trace = [
        {
            "name": name,
            "input": round(float(value), 8),
            "center": round(float(center), 8),
            "scale": round(float(scale), 8),
            "coefficientCm": round(float(coefficient), 8),
            "contributionCm": round(float(contribution), 8),
        }
        for name, value, center, scale, coefficient, contribution in zip(
            NAMED_HIP_INPUT_NAMES,
            values,
            centers,
            scales,
            coefficients,
            contributions,
        )
    ]
    return prediction, formula_name, trace


def ring_perimeter_cm(width: float, depth: float, shape: np.ndarray) -> float:
    points = np.asarray(shape, dtype=np.float64) * np.asarray((width / 2.0, depth / 2.0))
    return float(np.linalg.norm(np.roll(points, -1, axis=0) - points, axis=1).sum())


def robust_scale(features: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    center = np.median(features, axis=0)
    scale = np.median(np.abs(features - center), axis=0) * 1.4826
    standard = np.std(features, axis=0)
    scale = np.where(scale > 1e-5, scale, np.where(standard > 1e-5, standard, 1.0))
    return center.astype(np.float32), scale.astype(np.float32)


def named_distance(query: np.ndarray, references: np.ndarray, center: np.ndarray, scale: np.ndarray) -> tuple[np.ndarray, dict[str, np.ndarray]]:
    query_z = (query - center) / scale
    reference_z = (references - center) / scale
    groups = feature_groups()
    contributions: dict[str, np.ndarray] = {}
    total = np.zeros(len(references), dtype=np.float64)
    for name, columns in groups.items():
        difference = reference_z[:, columns] - query_z[columns]
        contribution = np.mean(difference * difference, axis=1) * GROUP_IMPORTANCE[name]
        contributions[name] = contribution
        total += contribution
    return np.sqrt(np.maximum(total, 0.0)), contributions


def _weighted_mean(values: np.ndarray, distance: np.ndarray) -> np.ndarray:
    weights = 1.0 / np.maximum(distance, 0.03)
    weights /= weights.sum()
    return np.sum(values * weights.reshape((-1,) + (1,) * (values.ndim - 1)), axis=0)


def _outline_at_body_fraction(features: np.ndarray, body_fraction: float, schema: dict[str, int]) -> tuple[float, float]:
    """Read A and B from the person's own silhouette at one body-height fraction."""
    fraction = float(np.clip(body_fraction, OUTLINE_FRACTIONS[0], OUTLINE_FRACTIONS[-1]))
    left = np.asarray([features[schema[f"outline.row_{index:02d}.left_x"]] for index in range(PROFILE_ROWS)])
    right = np.asarray([features[schema[f"outline.row_{index:02d}.right_x"]] for index in range(PROFILE_ROWS)])
    return (
        float(np.interp(fraction, OUTLINE_FRACTIONS, left)),
        float(np.interp(fraction, OUTLINE_FRACTIONS, right)),
    )


def _snap_to_visible_body_line(
    features: np.ndarray,
    expected_fraction: float,
    row: str,
    schema: dict[str, int],
) -> tuple[float, dict[str, Any]]:
    """Choose a named silhouette extremum near the teacher-derived body level."""
    widths = np.asarray([
        features[schema[f"outline.row_{index:02d}.width"]]
        for index in range(PROFILE_ROWS)
    ], dtype=np.float64)
    if row == "hips":
        allowed = (OUTLINE_FRACTIONS >= expected_fraction - 0.065) & (OUTLINE_FRACTIONS <= expected_fraction + 0.012)
        rule = "widest visible torso row from 6.5% above to 1.2% below the expected hip level"
        candidate_positions = np.flatnonzero(allowed)
        selected = int(candidate_positions[np.argmax(widths[candidate_positions])])
    else:
        allowed = (OUTLINE_FRACTIONS >= expected_fraction - 0.04) & (OUTLINE_FRACTIONS <= expected_fraction + 0.04)
        rule = "narrowest visible torso row within 4% of the expected waist level"
        candidate_positions = np.flatnonzero(allowed)
        selected = int(candidate_positions[np.argmin(widths[candidate_positions])])
    return float(OUTLINE_FRACTIONS[selected]), {
        "expectedBodyRowFraction": expected_fraction,
        "selectedOutlineRow": selected,
        "bodyRowRule": rule,
    }


def _body_fraction(y_norm: np.ndarray, features: np.ndarray, schema: dict[str, int]) -> np.ndarray:
    top = features[:, schema["silhouette.bbox_top"]]
    bottom = features[:, schema["silhouette.bbox_bottom"]]
    return np.clip((y_norm - top) / np.maximum(bottom - top, 1e-5), 0.08, 0.92)


def predict_from_ranked_people(
    *,
    ranked_view_indices: np.ndarray,
    ranked_distances: np.ndarray,
    scan_ids: np.ndarray,
    targets: np.ndarray,
    target_masks: np.ndarray,
    target_schema: list[str],
    neighbors: int,
    features: np.ndarray | None = None,
    query_features: np.ndarray | None = None,
    feature_names: list[str] | None = None,
    recipe: str = "teacher_average_v0",
) -> dict[str, Any]:
    if recipe not in RECIPES:
        raise ValueError(f"Unknown visible recipe: {recipe}")
    schema = {name: index for index, name in enumerate(target_schema)}
    visible_schema = {name: index for index, name in enumerate(feature_names or feature_schema())}
    if recipe in ("direct_outline_v1", "silhouette_extrema_v2", "hip_extrema_v3") and (features is None or query_features is None):
        raise ValueError(f"{recipe} requires the query and teacher named features")
    if recipe in ("transparent_ratio_v2", "waist_local_hip_ratio_v3", "waist_local_hip_physical_v4", "waist_local_hip_physical_guard_v5", "waist_local_hip_banded_physical_v6", "waist_local_hip_named_shape_v7") and query_features is None:
        raise ValueError(f"{recipe} requires the query's named silhouette and profile features")
    answer: dict[str, Any] = {}
    for row in ROWS:
        geometry_column = schema[f"{row}.ring_cm"]
        correction_column = schema[f"{row}.tape_correction_cm"]
        geometry_candidates = [
            (int(view), float(distance))
            for view, distance in zip(ranked_view_indices.tolist(), ranked_distances.tolist())
            if math.isfinite(float(distance)) and bool(target_masks[int(view), geometry_column])
        ][:neighbors]
        correction_candidates = [
            (int(view), float(distance))
            for view, distance in zip(ranked_view_indices.tolist(), ranked_distances.tolist())
            if math.isfinite(float(distance)) and bool(target_masks[int(view), correction_column])
        ][:neighbors]
        if len(geometry_candidates) < min(3, neighbors) or len(correction_candidates) < min(3, neighbors):
            raise RuntimeError(f"Too few approved {row} teachers")
        geometry_indices = np.asarray([item[0] for item in geometry_candidates], dtype=np.int64)
        geometry_distance = np.asarray([item[1] for item in geometry_candidates], dtype=np.float64)
        scalar_names = ("y_norm", "left_x_norm", "right_x_norm", "width_cm", "depth_cm")
        scalars = {
            name: float(_weighted_mean(targets[geometry_indices, schema[f"{row}.{name}"]], geometry_distance))
            for name in scalar_names
        }
        first_answer_trace: dict[str, Any]
        direct_visible_row = recipe in ("direct_outline_v1", "silhouette_extrema_v2") or (recipe == "hip_extrema_v3" and row == "hips")
        if direct_visible_row:
            teacher_features = features[geometry_indices]
            teacher_y = targets[geometry_indices, schema[f"{row}.y_norm"]]
            teacher_body_fraction = _body_fraction(teacher_y, teacher_features, visible_schema)
            expected_body_fraction = float(_weighted_mean(teacher_body_fraction, geometry_distance))
            if recipe in ("silhouette_extrema_v2", "hip_extrema_v3"):
                body_fraction, body_line_trace = _snap_to_visible_body_line(
                    query_features,
                    expected_body_fraction,
                    row,
                    visible_schema,
                )
            else:
                body_fraction = expected_body_fraction
                body_line_trace = {
                    "expectedBodyRowFraction": expected_body_fraction,
                    "bodyRowRule": "use distance-weighted audited-teacher body level",
                }
            query_left, query_right = _outline_at_body_fraction(query_features, body_fraction, visible_schema)
            query_span = max(query_right - query_left, 1e-5)
            teacher_span = (
                targets[geometry_indices, schema[f"{row}.right_x_norm"]]
                - targets[geometry_indices, schema[f"{row}.left_x_norm"]]
            )
            teacher_width = targets[geometry_indices, schema[f"{row}.width_cm"]]
            cm_per_normalized_image_width = float(_weighted_mean(
                teacher_width / np.maximum(teacher_span, 1e-5),
                geometry_distance,
            ))
            depth_to_width_ratio = float(_weighted_mean(
                targets[geometry_indices, schema[f"{row}.depth_cm"]] / np.maximum(teacher_width, 1e-5),
                geometry_distance,
            ))
            query_top = float(query_features[visible_schema["silhouette.bbox_top"]])
            query_bottom = float(query_features[visible_schema["silhouette.bbox_bottom"]])
            scalars = {
                "y_norm": query_top + body_fraction * (query_bottom - query_top),
                "left_x_norm": query_left,
                "right_x_norm": query_right,
                "width_cm": query_span * cm_per_normalized_image_width,
                "depth_cm": query_span * cm_per_normalized_image_width * depth_to_width_ratio,
            }
            first_answer_trace = {
                "recipe": recipe,
                **body_line_trace,
                "bodyRowFraction": body_fraction,
                "leftAPixelAt96Wide": query_left * 95.0,
                "rightBPixelAt96Wide": query_right * 95.0,
                "pixelWidthAt96Wide": query_span * 95.0,
                "cmPerNormalizedImageWidth": cm_per_normalized_image_width,
                "depthToWidthRatio": depth_to_width_ratio,
                "widthFormula": "own silhouette A-B span x audited-teacher centimetre scale",
                "depthFormula": "calculated width x audited-teacher depth-to-width ratio",
            }
        else:
            first_answer_trace = {
                "recipe": recipe,
                "widthFormula": "distance-weighted mean of audited-teacher widths",
                "depthFormula": "distance-weighted mean of audited-teacher depths",
            }
        shape_columns = [
            schema[f"{row}.shape.{point:02d}.{axis}"]
            for point in range(SHAPE_POINTS) for axis in ("x", "depth")
        ]
        shape = _weighted_mean(targets[np.ix_(geometry_indices, shape_columns)], geometry_distance).reshape(SHAPE_POINTS, 2)
        correction_indices = np.asarray([item[0] for item in correction_candidates], dtype=np.int64)
        correction_distance = np.asarray([item[1] for item in correction_candidates], dtype=np.float64)
        correction = float(_weighted_mean(targets[correction_indices, schema[f"{row}.tape_correction_cm"]], correction_distance))
        correction = float(np.clip(correction, -7.0, 7.0))
        ring = ring_perimeter_cm(scalars["width_cm"], scalars["depth_cm"], shape)
        use_tape_cases = recipe in ("audited_tape_cases_v4", "waist_local_tape_v1", "waist_local_tape_median_v2") or (
            recipe in (
                "hip_tape_cases_v5",
                "hip_tape_same_gender_v6",
                "hip_tape_same_bmi_band_v7",
                "bmi_bias_correction_v8",
                "bmi_bias_guarded_v9",
                "transparent_bmi_guard_v1",
                "transparent_ratio_v2",
                "target_local_cases_v1",
                "waist_local_hip_ratio_v3",
            ) and row == "hips"
        )
        if use_tape_cases:
            if recipe == "waist_local_tape_median_v2" and row == "waist":
                final_tape = float(np.median(targets[correction_indices, schema[f"{row}.final_tape_cm"]]))
                first_answer_trace["tapeFormula"] = "middle approved tape answer among the listed closest waist teachers"
            else:
                final_tape = float(_weighted_mean(
                    targets[correction_indices, schema[f"{row}.final_tape_cm"]],
                    correction_distance,
                ))
                first_answer_trace["tapeFormula"] = "distance-weighted mean of the listed approved tape teachers"
            correction = final_tape - ring
            first_answer_trace["geometryUse"] = "named geometry remains visible for cause diagnosis; final tape comes directly from approved similar cases"
        else:
            final_tape = ring + correction
        if recipe in ("bmi_bias_correction_v8", "bmi_bias_guarded_v9", "transparent_bmi_guard_v1", "transparent_ratio_v2", "waist_local_hip_ratio_v3", "waist_local_hip_physical_v4", "waist_local_hip_physical_guard_v5", "waist_local_hip_banded_physical_v6", "waist_local_hip_named_shape_v7") and not (recipe in ("waist_local_hip_physical_v4", "waist_local_hip_physical_guard_v5", "waist_local_hip_banded_physical_v6", "waist_local_hip_named_shape_v7") and row == "hips"):
            bmi = float(query_features[visible_schema["bmi_profile"]]) * 8.0 + 24.0
            if row == "waist":
                if recipe in ("bmi_bias_guarded_v9", "transparent_bmi_guard_v1", "transparent_ratio_v2", "waist_local_hip_ratio_v3", "waist_local_hip_physical_v4", "waist_local_hip_physical_guard_v5", "waist_local_hip_banded_physical_v6", "waist_local_hip_named_shape_v7") and bmi < 20.0:
                    bmi_correction = 0.0
                    bmi_formula = "0 cm when BMI is below 20 because the earlier correction worsened this group's large errors"
                elif recipe in ("waist_local_hip_ratio_v3", "waist_local_hip_physical_v4", "waist_local_hip_physical_guard_v5", "waist_local_hip_banded_physical_v6", "waist_local_hip_named_shape_v7"):
                    bmi_correction = float(np.clip(-0.0907731297 + 0.0952294367 * (bmi - 24.0), -3.0, 3.0))
                    bmi_formula = "clip(-0.0907731297 + 0.0952294367 x (BMI - 24), -3, +3) cm"
                elif recipe in ("transparent_bmi_guard_v1", "transparent_ratio_v2"):
                    bmi_correction = float(np.clip(0.1630393172 + 0.2932305411 * (bmi - 24.0), -3.0, 3.0))
                    bmi_formula = "clip(0.1630393172 + 0.2932305411 x (BMI - 24), -3, +3) cm"
                else:
                    bmi_correction = float(np.clip(0.170227 + 0.293723 * (bmi - 24.0), -3.0, 3.0))
                    bmi_formula = "clip(0.170227 + 0.293723 x (BMI - 24), -3, +3) cm"
            else:
                if recipe in ("transparent_bmi_guard_v1", "transparent_ratio_v2", "waist_local_hip_ratio_v3"):
                    bmi_correction = float(np.clip(-0.1533645611 + 0.2185861517 * (bmi - 24.0), -3.0, 3.0))
                    bmi_formula = "clip(-0.1533645611 + 0.2185861517 x (BMI - 24), -3, +3) cm"
                else:
                    bmi_correction = float(np.clip(-0.140901 + 0.247407 * (bmi - 24.0), -3.0, 3.0))
                    bmi_formula = "clip(-0.140901 + 0.247407 x (BMI - 24), -3, +3) cm"
            final_tape += bmi_correction
            correction += bmi_correction
            first_answer_trace["bmi"] = bmi
            first_answer_trace["bmiCmCorrection"] = bmi_correction
            first_answer_trace["bmiCorrectionFormula"] = bmi_formula
            first_answer_trace["bmiCorrectionReason"] = "correct the measured pull of low/high-BMI bodies toward the middle"
        if recipe in ("transparent_ratio_v2", "waist_local_hip_ratio_v3") and not (recipe == "waist_local_hip_ratio_v3" and row == "waist"):
            def outline_width(outline_row: int) -> float:
                return float(query_features[visible_schema[f"outline.row_{outline_row:02d}.width"]])

            shoulder_width = max(outline_width(outline_row) for outline_row in range(4, 9))
            waist_width = min(outline_width(outline_row) for outline_row in range(10, 15))
            hip_width = max(outline_width(outline_row) for outline_row in range(14, 19))
            waist_to_shoulder = waist_width / max(shoulder_width, 1e-6)
            hip_to_shoulder = hip_width / max(shoulder_width, 1e-6)
            hip_to_waist = hip_width / max(waist_width, 1e-6)
            height_10cm = float(query_features[visible_schema["height_profile"]]) * 2.0
            if row == "waist":
                ratio_correction = (
                    0.0822025310
                    + 3.6864482259 * ((waist_to_shoulder - 0.57) / 0.10)
                    + 0.2375025171 * ((hip_to_waist - 1.31) / 0.10)
                    + 0.4920890905 * ((height_10cm - 0.08) / 1.0)
                )
                ratio_formula = "clip(0.0822025310 + 3.6864482259 x waist/shoulder + 0.2375025171 x hip/waist + 0.4920890905 x height, -3, +3) cm; printed terms are centred and scaled as listed"
            else:
                ratio_correction = (
                    0.0338149970
                    + 2.2712455761 * ((hip_to_shoulder - 0.74) / 0.10)
                    + 0.3398328515 * ((hip_to_waist - 1.31) / 0.10)
                    + 1.4163881241 * ((height_10cm - 0.08) / 1.0)
                )
                ratio_formula = "clip(0.0338149970 + 2.2712455761 x hip/shoulder + 0.3398328515 x hip/waist + 1.4163881241 x height, -3, +3) cm; printed terms are centred and scaled as listed"
            ratio_correction = float(np.clip(ratio_correction, -3.0, 3.0))
            final_tape += ratio_correction
            correction += ratio_correction
            first_answer_trace["visibleRatios"] = {
                "waistToShoulder": waist_to_shoulder,
                "hipToShoulder": hip_to_shoulder,
                "hipToWaist": hip_to_waist,
                "heightIn10CmFrom170": height_10cm,
            }
            first_answer_trace["ratioCmCorrection"] = ratio_correction
            first_answer_trace["ratioCorrectionFormula"] = ratio_formula
            first_answer_trace["ratioCorrectionReason"] = "correct the measured residual associated with visible body-width ratios and height"
        if recipe in ("waist_local_hip_physical_v4", "waist_local_hip_physical_guard_v5", "waist_local_hip_banded_physical_v6", "waist_local_hip_named_shape_v7") and row == "hips":
            bmi = float(query_features[visible_schema["bmi_profile"]]) * 8.0 + 24.0
            height_cm = float(query_features[visible_schema["height_profile"]]) * 20.0 + 170.0
            weight_kg = float(query_features[visible_schema["weight_profile"]]) * 25.0 + 70.0
            female = float(query_features[visible_schema["female"]])
            silhouette_area = float(query_features[visible_schema["silhouette.area_fraction"]])
            hip_visible_width = max(
                float(query_features[visible_schema[f"outline.row_{outline_row:02d}.width"]])
                for outline_row in range(13, 20)
            )
            hip_width_cm_proxy = hip_visible_width * height_cm
            height_m = height_cm / 100.0
            mass_depth_index = weight_kg / max(silhouette_area * height_m * height_m, 1e-6)
            height_term = (height_cm - 170.0) / 10.0
            weight_term = (weight_kg - 75.0) / 20.0
            gender_term = female - 0.5
            width_term = (hip_width_cm_proxy - 44.0) / 4.0
            depth_term = (mass_depth_index - 130.0) / 20.0
            use_richer_evidence = recipe in ("waist_local_hip_physical_guard_v5", "waist_local_hip_banded_physical_v6")
            if use_richer_evidence:
                shoulder_visible_width = max(
                    float(query_features[visible_schema[f"outline.row_{outline_row:02d}.width"]])
                    for outline_row in range(4, 10)
                )
                waist_visible_width = min(
                    float(query_features[visible_schema[f"outline.row_{outline_row:02d}.width"]])
                    for outline_row in range(9, 16)
                )
                high_bmi_term = max(bmi - 30.0, 0.0) / 5.0
                area_term = (silhouette_area - 0.195) / 0.02
                hip_shoulder_term = (hip_visible_width / max(shoulder_visible_width, 1e-6) - 0.74) / 0.10
                hip_waist_term = (hip_visible_width / max(waist_visible_width, 1e-6) - 1.31) / 0.10
            if recipe == "waist_local_hip_named_shape_v7":
                final_tape, formula_name, visible_contributions = _named_visible_hip_formula(query_features, visible_schema)
                first_answer_trace["namedVisibleHipContributions"] = visible_contributions
                first_answer_trace["namedVisibleHipInterceptCm"] = (
                    NAMED_HIP_HIGH_BMI_INTERCEPT_CM if bmi >= 30.0 else NAMED_HIP_INTERCEPT_CM
                )
            elif recipe == "waist_local_hip_banded_physical_v6" and bmi < 20.0:
                final_tape = (
                    104.93122
                    - 0.83661 * height_term
                    + 7.75537 * weight_term
                    + 2.95581 * gender_term
                    + 3.73519 * width_term
                    + 2.83970 * depth_term
                    - 0.45076 * area_term
                    + 0.23692 * hip_shoulder_term
                    + 0.29834 * hip_waist_term
                )
                formula_name = "printed physical hip formula for BMI below 20"
            elif recipe == "waist_local_hip_banded_physical_v6" and bmi < 25.0:
                final_tape = (
                    103.40686
                    + 0.00863 * height_term
                    + 4.08581 * weight_term
                    + 2.98896 * gender_term
                    + 3.98405 * width_term
                    + 3.94531 * depth_term
                    + 0.16529 * area_term
                    + 0.51475 * hip_shoulder_term
                    + 0.37283 * hip_waist_term
                )
                formula_name = "printed physical hip formula for BMI 20 to 24.99"
            elif recipe == "waist_local_hip_banded_physical_v6" and bmi >= 30.0:
                final_tape = (
                    100.96120
                    - 1.52993 * height_term
                    + 3.76784 * weight_term
                    + 0.95954 * gender_term
                    + 4.83880 * width_term
                    + 4.86136 * depth_term
                    + 0.72407 * area_term
                    + 1.08605 * hip_shoulder_term
                    + 0.63390 * hip_waist_term
                )
                formula_name = "printed physical hip formula for BMI 30 or above"
            elif use_richer_evidence and bmi >= 20.0:
                final_tape = (
                    102.70389943
                    + 1.66930617 * height_term
                    - 0.84933894 * weight_term
                    + 2.26573458 * gender_term
                    + 4.40888175 * width_term
                    + 6.22837720 * depth_term
                    + 1.86483988 * high_bmi_term
                    + 1.50637239 * area_term
                    + 0.55884813 * hip_shoulder_term
                    + 0.46247152 * hip_waist_term
                )
                formula_name = "printed physical hip formula for BMI 25 to 29.99" if recipe == "waist_local_hip_banded_physical_v6" else "guarded richer physical hip formula for BMI 20 or above"
            else:
                final_tape = (
                    103.16808952
                    + 0.12982175 * height_term
                    + 1.40189589 * weight_term
                    + 2.70977346 * gender_term
                    + 5.48036562 * width_term
                    + 4.97903455 * depth_term
                )
                formula_name = "simple physical hip formula"
            correction = final_tape - ring
            first_answer_trace["directPhysicalInputs"] = {
                "heightCm": height_cm,
                "weightKg": weight_kg,
                "femaleIndicator": female,
                "visibleHipWidthTimesHeight": hip_width_cm_proxy,
                "massDepthIndex": mass_depth_index,
                "selectedFormula": formula_name,
            }
            first_answer_trace["directPhysicalFormula"] = "the selected printed formula is stored in its accepted lesson; every input is named, centred and scaled"
            first_answer_trace["directPhysicalReason"] = "visible hip width supplies front width; weight divided by front-body area supplies an explicit estimate of missing front-to-back depth"
        answer[row] = {
            **scalars,
            "shape": shape,
            "ring_cm": ring,
            "tape_correction_cm": correction,
            "final_tape_cm": final_tape,
            "firstAnswerTrace": {
                **first_answer_trace,
                "teacherSelectionRule": (
                    "same gender only" if recipe == "hip_tape_same_gender_v6"
                    else "same visible BMI band only" if recipe == "hip_tape_same_bmi_band_v7"
                    else "closest approved visible cases"
                ),
                "ringFormula": "walk all 32 named cross-section points",
                "tapeFormula": first_answer_trace.get("tapeFormula", "walked ring + approved tape-protocol correction"),
            },
            "teachers": [
                {"scanId": str(scan_ids[index]), "distance": round(distance, 7)}
                for index, distance in geometry_candidates
            ],
            "correctionTeachers": [
                {"scanId": str(scan_ids[index]), "distance": round(distance, 7)}
                for index, distance in correction_candidates
            ],
        }
    return answer


def best_view_per_person(distances: np.ndarray, reference_indices: np.ndarray, scan_ids: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    best: dict[str, tuple[int, float]] = {}
    for index, distance in zip(reference_indices.tolist(), distances.tolist()):
        scan_id = str(scan_ids[index])
        previous = best.get(scan_id)
        if previous is None or distance < previous[1]:
            best[scan_id] = (int(index), float(distance))
    ranked = sorted(best.values(), key=lambda item: (item[1], str(scan_ids[item[0]])))
    return (
        np.asarray([item[0] for item in ranked], dtype=np.int64),
        np.asarray([item[1] for item in ranked], dtype=np.float64),
    )


def explain_query_distance(
    query: np.ndarray,
    selected_reference: np.ndarray,
    center: np.ndarray,
    scale: np.ndarray,
) -> dict[str, float]:
    _, contributions = named_distance(query, selected_reference[None, :], center, scale)
    return {name: round(math.sqrt(max(float(value[0]), 0.0)), 7) for name, value in contributions.items()}


__all__ = [
    "GROUP_IMPORTANCE",
    "RECIPES",
    "ROWS",
    "best_view_per_person",
    "explain_query_distance",
    "named_distance",
    "predict_from_ranked_people",
    "ring_perimeter_cm",
    "robust_scale",
]
