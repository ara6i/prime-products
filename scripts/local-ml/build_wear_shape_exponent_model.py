#!/usr/bin/env python3
"""Build the local WEAR 1D superellipse-shape experiment.

This model learns only the final cross-section shape. It never changes the
photo red-line breadth or the separate WEAR absolute-depth prediction.

Only surveys with breadth, depth, and circumference measured at the same body
level are included. Named sizing-lab profiles and their saved answers are never
read. Trouser waist is intentionally unavailable because the purchased WEAR 1D
files do not provide a defensible multi-survey same-level triplet for that row.

The script uses only Python's standard library so it can run on the local Mac:

  python3 scripts/local-ml/build_wear_shape_exponent_model.py \
    --wear-root .local-ml/wear-1d \
    --output app/try-on-test/sizing-lab/models/wear-1d-shape-exponent-v2.json
"""

from __future__ import annotations

import argparse
import csv
from dataclasses import dataclass
import json
import math
from pathlib import Path
from typing import Iterable


MODEL_VERSION = "wear-1d-shape-exponent-v2"
MIN_EXPONENT = 1.2
MAX_EXPONENT = 4.0
PERIMETER_STEPS = 1024

BASE_FEATURE_NAMES = (
    "bmi",
    "depthToBreadth",
    "breadthToHeight",
    "isMale",
    "bmiSquared",
    "depthToBreadthSquared",
    "breadthToHeightSquared",
    "bmiDepthToBreadth",
    "bmiBreadthToHeight",
    "depthToBreadthBreadthToHeight",
    "isMaleBmi",
    "isMaleDepthToBreadth",
    "isMaleBreadthToHeight",
)

# Waist keeps the compact v1 feature set because it remains the strongest
# entire-survey holdout. Hips use absolute geometry as well: this reduced the
# anonymous leave-one-survey-out hip MAE without reading any sizing-lab person.
WAIST_FEATURE_NAMES = BASE_FEATURE_NAMES
HIP_FEATURE_NAMES = (
    "bmi",
    "heightCm",
    "breadthCm",
    "depthCm",
    "depthToBreadth",
    "breadthToHeight",
    "isMale",
    "bmiSquared",
    "heightCmSquared",
    "breadthCmSquared",
    "depthCmSquared",
    "depthToBreadthSquared",
    "breadthToHeightSquared",
    "bmiBreadthCm",
    "bmiDepthCm",
    "breadthDepthCm2",
    "isMaleBmi",
    "isMaleBreadthCm",
    "isMaleDepthCm",
    "isMaleDepthToBreadth",
    "isMaleBreadthToHeight",
)
ALL_FEATURE_NAMES = tuple(dict.fromkeys((*BASE_FEATURE_NAMES, *HIP_FEATURE_NAMES)))
FEATURE_INDEX = {feature: index for index, feature in enumerate(ALL_FEATURE_NAMES)}

ROW_CONFIG = {
    "waist": {
        "feature_names": WAIST_FEATURE_NAMES,
        "ridge_alpha": 0.1,
        "survey_balanced": True,
    },
    "hips": {
        "feature_names": HIP_FEATURE_NAMES,
        "ridge_alpha": 0.1,
        "survey_balanced": True,
    },
}


@dataclass(frozen=True)
class Survey:
    gender: str
    survey: str
    relative_path: str
    weight: int
    height: int
    waist_breadth: int
    waist_depth: int
    waist_circumference: int
    hip_breadth: int | None
    hip_depth: int | None
    hip_circumference: int | None


@dataclass(frozen=True)
class ShapeRow:
    survey: str
    gender: str
    height_cm: float
    bmi: float
    breadth_cm: float
    depth_cm: float
    circumference_cm: float
    features: tuple[float, ...]
    target_position: float
    minimum_perimeter_cm: float
    maximum_perimeter_cm: float


# Column indexes are zero-based and audited against the purchased measurement
# dictionaries. Each circumference is the matching standing body level.
SURVEYS = (
    Survey("female", "AF68", "SURVEY OF AIR FORCE WOMEN 1968/AF68FE Dataset.csv", 3, 8, 68, 76, 42, 69, 78, 53),
    Survey("female", "ARFE77", "Survey of US Army Women - File #2 1977/ARFE77_2 Dataset.csv", 2, 3, 22, 20, 30, None, None, None),
    Survey("female", "STEWA72", "American Airline Stewardesses Survey 1972/STEWA72 Dataset.csv", 2, 3, 42, 38, 20, 46, 37, 19),
    Survey("male", "GERMAN68", "German Air Force 1968/GERMAN68 Dataset.csv", 2, 9, 48, 45, 74, 43, 46, 75),
    Survey("male", "ATC61", "Air Traffic Controllers 1961/ATCMAL61 Dataset.csv", 3, 5, 43, 46, 57, 44, 47, 58),
    Survey("male", "MARFLY64", "Survey of U.S. Naval Aviators 1964/MARFLY64 Dataset.csv", 2, 3, 26, 29, 35, 27, 30, 36),
    Survey("male", "AFFLY50", "Survey of Flying Personnel 1950/AFFLY50 Dataset.csv", 2, 3, 42, 45, 50, 43, 46, 51),
    Survey("male", "NATO61", "NATO Anthropometric Survey 1960-1961/NATO61 Dataset.csv", 2, 3, 38, 44, 50, 39, 45, 51),
    Survey("male", "KOREAN64", "Survey of ROKAF Flying Personnel 1960/KOREAN64 Dataset.csv", 2, 3, 42, 45, 50, 43, 46, 51),
)


def numeric(row: list[str], index: int | None, divisor: float = 1.0) -> float | None:
    if index is None or index >= len(row):
        return None
    try:
        value = float(row[index]) / divisor
    except (TypeError, ValueError):
        return None
    return value if math.isfinite(value) else None


def superellipse_perimeter(width_cm: float, depth_cm: float, exponent: float) -> float:
    """Match the Test Lab's 1024-step superellipse perimeter calculation."""
    a = width_cm / 2
    b = depth_cm / 2
    safe_exponent = min(MAX_EXPONENT, max(MIN_EXPONENT, exponent))
    quarter_length = 0.0
    previous_x = a
    previous_y = 0.0
    for index in range(1, PERIMETER_STEPS + 1):
        theta = (math.pi / 2) * (index / PERIMETER_STEPS)
        x = a * max(0.0, math.cos(theta)) ** (2 / safe_exponent)
        y = b * max(0.0, math.sin(theta)) ** (2 / safe_exponent)
        quarter_length += math.hypot(x - previous_x, y - previous_y)
        previous_x = x
        previous_y = y
    return quarter_length * 4


def feature_values(gender: str, height_cm: float, bmi: float, breadth_cm: float, depth_cm: float) -> tuple[float, ...]:
    is_male = 1.0 if gender == "male" else 0.0
    depth_to_breadth = depth_cm / breadth_cm
    breadth_to_height = breadth_cm / height_cm
    values = {
        "bmi": bmi,
        "heightCm": height_cm,
        "breadthCm": breadth_cm,
        "depthCm": depth_cm,
        "depthToBreadth": depth_to_breadth,
        "breadthToHeight": breadth_to_height,
        "isMale": is_male,
        "bmiSquared": bmi * bmi,
        "heightCmSquared": height_cm * height_cm,
        "breadthCmSquared": breadth_cm * breadth_cm,
        "depthCmSquared": depth_cm * depth_cm,
        "depthToBreadthSquared": depth_to_breadth * depth_to_breadth,
        "breadthToHeightSquared": breadth_to_height * breadth_to_height,
        "bmiDepthToBreadth": bmi * depth_to_breadth,
        "bmiBreadthToHeight": bmi * breadth_to_height,
        "depthToBreadthBreadthToHeight": depth_to_breadth * breadth_to_height,
        "bmiBreadthCm": bmi * breadth_cm,
        "bmiDepthCm": bmi * depth_cm,
        "breadthDepthCm2": breadth_cm * depth_cm,
        "isMaleBmi": is_male * bmi,
        "isMaleBreadthCm": is_male * breadth_cm,
        "isMaleDepthCm": is_male * depth_cm,
        "isMaleDepthToBreadth": is_male * depth_to_breadth,
        "isMaleBreadthToHeight": is_male * breadth_to_height,
    }
    return tuple(values[feature] for feature in ALL_FEATURE_NAMES)


def selected_features(row: ShapeRow, feature_names: tuple[str, ...]) -> tuple[float, ...]:
    return tuple(row.features[FEATURE_INDEX[feature]] for feature in feature_names)


def load_rows(root: Path) -> tuple[dict[str, list[ShapeRow]], dict[str, int]]:
    rows: dict[str, list[ShapeRow]] = {"waist": [], "hips": []}
    same_level_counts = {"waist": 0, "hips": 0}
    for survey in SURVEYS:
        source_path = root / survey.relative_path
        with source_path.open(newline="", encoding="utf-8-sig") as source:
            reader = csv.reader(source)
            next(reader, None)
            for source_row in reader:
                weight_kg = numeric(source_row, survey.weight)
                height_cm = numeric(source_row, survey.height, 10)
                if weight_kg is None or height_cm is None:
                    continue
                if not (35 < weight_kg < 160 and 140 < height_cm < 210):
                    continue
                bmi = weight_kg / ((height_cm / 100) ** 2)
                if not 14 < bmi < 50:
                    continue
                definitions = (
                    ("waist", survey.waist_breadth, survey.waist_depth, survey.waist_circumference),
                    ("hips", survey.hip_breadth, survey.hip_depth, survey.hip_circumference),
                )
                for kind, breadth_index, depth_index, circumference_index in definitions:
                    breadth_cm = numeric(source_row, breadth_index, 10)
                    depth_cm = numeric(source_row, depth_index, 10)
                    circumference_cm = numeric(source_row, circumference_index, 10)
                    if breadth_cm is None or depth_cm is None or circumference_cm is None:
                        continue
                    if not (
                        14 < breadth_cm < 65
                        and 10 < depth_cm < 50
                        and 40 < circumference_cm < 180
                        and 0.35 < depth_cm / breadth_cm < 1.2
                    ):
                        continue
                    same_level_counts[kind] += 1
                    minimum_perimeter_cm = superellipse_perimeter(breadth_cm, depth_cm, MIN_EXPONENT)
                    maximum_perimeter_cm = superellipse_perimeter(breadth_cm, depth_cm, MAX_EXPONENT)
                    if not minimum_perimeter_cm <= circumference_cm <= maximum_perimeter_cm:
                        continue
                    rows[kind].append(ShapeRow(
                        survey=survey.survey,
                        gender=survey.gender,
                        height_cm=height_cm,
                        bmi=bmi,
                        breadth_cm=breadth_cm,
                        depth_cm=depth_cm,
                        circumference_cm=circumference_cm,
                        features=feature_values(survey.gender, height_cm, bmi, breadth_cm, depth_cm),
                        target_position=(circumference_cm - minimum_perimeter_cm) / (maximum_perimeter_cm - minimum_perimeter_cm),
                        minimum_perimeter_cm=minimum_perimeter_cm,
                        maximum_perimeter_cm=maximum_perimeter_cm,
                    ))
    return rows, same_level_counts


def quantile(values: Iterable[float], fraction: float) -> float:
    ordered = sorted(values)
    if not ordered:
        raise ValueError("Cannot calculate a quantile from no values.")
    position = (len(ordered) - 1) * fraction
    lower = int(math.floor(position))
    upper = min(len(ordered) - 1, lower + 1)
    weight = position - lower
    return ordered[lower] * (1 - weight) + ordered[upper] * weight


def solve_linear_system(matrix: list[list[float]], target: list[float]) -> list[float]:
    size = len(target)
    for pivot_index in range(size):
        best_index = max(range(pivot_index, size), key=lambda row: abs(matrix[row][pivot_index]))
        matrix[pivot_index], matrix[best_index] = matrix[best_index], matrix[pivot_index]
        target[pivot_index], target[best_index] = target[best_index], target[pivot_index]
        pivot = matrix[pivot_index][pivot_index]
        if abs(pivot) < 1e-12:
            raise ValueError("Shape model matrix is singular.")
        for column in range(pivot_index, size):
            matrix[pivot_index][column] /= pivot
        target[pivot_index] /= pivot
        for row_index in range(size):
            if row_index == pivot_index:
                continue
            factor = matrix[row_index][pivot_index]
            if factor == 0:
                continue
            for column in range(pivot_index, size):
                matrix[row_index][column] -= factor * matrix[pivot_index][column]
            target[row_index] -= factor * target[pivot_index]
    return target


def fit(
    rows: list[ShapeRow],
    feature_names: tuple[str, ...],
    ridge_alpha: float,
    survey_balanced: bool,
) -> tuple[list[float], list[float], list[float]]:
    feature_count = len(feature_names)
    survey_counts = {
        survey: sum(row.survey == survey for row in rows)
        for survey in {row.survey for row in rows}
    }
    weights = [1.0 / survey_counts[row.survey] if survey_balanced else 1.0 for row in rows]
    mean_weight = sum(weights) / len(weights)
    weights = [weight / mean_weight for weight in weights]
    feature_rows = [selected_features(row, feature_names) for row in rows]
    weight_sum = sum(weights)
    centers = [
        sum(weight * features[index] for features, weight in zip(feature_rows, weights)) / weight_sum
        for index in range(feature_count)
    ]
    scales = []
    for index in range(feature_count):
        variance = sum(
            weight * (features[index] - centers[index]) ** 2
            for features, weight in zip(feature_rows, weights)
        ) / weight_sum
        scales.append(math.sqrt(variance) or 1.0)
    size = feature_count + 1
    normal_matrix = [[0.0 for _ in range(size)] for _ in range(size)]
    normal_target = [0.0 for _ in range(size)]
    for row, features, weight in zip(rows, feature_rows, weights):
        design = [1.0] + [
            (features[index] - centers[index]) / scales[index]
            for index in range(feature_count)
        ]
        for left in range(size):
            normal_target[left] += weight * design[left] * row.target_position
            for right in range(size):
                normal_matrix[left][right] += weight * design[left] * design[right]
    for index in range(1, size):
        normal_matrix[index][index] += ridge_alpha
    return centers, scales, solve_linear_system(normal_matrix, normal_target)


def predict_position(features: tuple[float, ...], fitted: tuple[list[float], list[float], list[float]]) -> float:
    centers, scales, coefficients = fitted
    prediction = coefficients[0]
    for index, feature in enumerate(features):
        prediction += coefficients[index + 1] * ((feature - centers[index]) / scales[index])
    return min(1.0, max(0.0, prediction))


def validate(
    rows: list[ShapeRow],
    feature_names: tuple[str, ...],
    ridge_alpha: float,
    survey_balanced: bool,
) -> dict[str, float]:
    circumference_errors: list[float] = []
    percentage_errors: list[float] = []
    gender_errors: dict[str, list[float]] = {"female": [], "male": []}
    for held_out_survey in sorted({row.survey for row in rows}):
        training_rows = [row for row in rows if row.survey != held_out_survey]
        test_rows = [row for row in rows if row.survey == held_out_survey]
        fitted = fit(training_rows, feature_names, ridge_alpha, survey_balanced)
        for row in test_rows:
            predicted_position = predict_position(selected_features(row, feature_names), fitted)
            predicted_circumference = row.minimum_perimeter_cm + predicted_position * (
                row.maximum_perimeter_cm - row.minimum_perimeter_cm
            )
            circumference_error = abs(predicted_circumference - row.circumference_cm)
            circumference_errors.append(circumference_error)
            percentage_errors.append(circumference_error / row.circumference_cm * 100)
            gender_errors[row.gender].append(circumference_error)
    result = {
        "validationMaeCm": sum(circumference_errors) / len(circumference_errors),
        "validationP90AbsErrorCm": quantile(circumference_errors, 0.9),
        "validationMeanAbsPercentError": sum(percentage_errors) / len(percentage_errors),
        "validationP90AbsPercentError": quantile(percentage_errors, 0.9),
    }
    for gender, errors in gender_errors.items():
        if errors:
            title = gender.title()
            result[f"validation{title}MaeCm"] = sum(errors) / len(errors)
            result[f"validation{title}P90AbsErrorCm"] = quantile(errors, 0.9)
    return result


def rounded(value: float, digits: int = 6) -> float:
    return round(float(value), digits)


def build_row_model(kind: str, rows: list[ShapeRow], same_level_count: int) -> dict[str, object]:
    config = ROW_CONFIG[kind]
    feature_names = config["feature_names"]
    ridge_alpha = config["ridge_alpha"]
    survey_balanced = config["survey_balanced"]
    validation = validate(rows, feature_names, ridge_alpha, survey_balanced)
    baseline_validation = validate(rows, BASE_FEATURE_NAMES, 0.001, False)
    centers, scales, coefficients = fit(rows, feature_names, ridge_alpha, survey_balanced)
    gender_counts = {
        "female": sum(1 for row in rows if row.gender == "female"),
        "male": sum(1 for row in rows if row.gender == "male"),
    }
    ellipse_errors = [
        abs(superellipse_perimeter(row.breadth_cm, row.depth_cm, 2.0) - row.circumference_cm)
        for row in rows
    ]
    return {
        "label": "Natural waist" if kind == "waist" else "Hips",
        "measurement": (
            "Standing natural-waist breadth, depth, and circumference measured at the same level"
            if kind == "waist"
            else "Standing hip breadth, buttock depth, and buttock circumference measured at the same level"
        ),
        "validationMethod": "leave-one-survey-out",
        "trainingWeighting": "equal total weight per survey" if survey_balanced else "one equal weight per subject",
        "ridgeAlpha": ridge_alpha,
        "trainingSubjects": len(rows),
        "sameLevelSubjects": same_level_count,
        "coveragePct": rounded(len(rows) / same_level_count * 100, 2),
        "trainingSurveyCount": len({row.survey for row in rows}),
        "trainingSurveys": sorted({row.survey for row in rows}),
        "genderCounts": gender_counts,
        "featureNames": list(feature_names),
        "featureCenters": {
            feature: rounded(center) for feature, center in zip(feature_names, centers)
        },
        "featureScales": {
            feature: rounded(scale) for feature, scale in zip(feature_names, scales)
        },
        "interceptPosition": rounded(coefficients[0]),
        "coefficients": {
            feature: rounded(coefficient)
            for feature, coefficient in zip(feature_names, coefficients[1:])
        },
        "featureP05": {
            feature: rounded(quantile((selected_features(row, feature_names)[index] for row in rows), 0.05), 5)
            for index, feature in enumerate(feature_names)
        },
        "featureP95": {
            feature: rounded(quantile((selected_features(row, feature_names)[index] for row in rows), 0.95), 5)
            for index, feature in enumerate(feature_names)
        },
        "minimumExponent": MIN_EXPONENT,
        "maximumExponent": MAX_EXPONENT,
        **{key: rounded(value, 3) for key, value in validation.items()},
        "baselineV1ValidationMaeCm": rounded(baseline_validation["validationMaeCm"], 3),
        "baselineV1ValidationP90AbsErrorCm": rounded(baseline_validation["validationP90AbsErrorCm"], 3),
        "ellipseBaselineMaeCm": rounded(sum(ellipse_errors) / len(ellipse_errors), 3),
        "ellipseBaselineP90AbsErrorCm": rounded(quantile(ellipse_errors, 0.9), 3),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--wear-root", type=Path, required=True, help="Extracted 1DWEARDataALLSurveys directory")
    parser.add_argument("--output", type=Path, required=True, help="Anonymous aggregate JSON output")
    args = parser.parse_args()

    rows, same_level_counts = load_rows(args.wear_root)
    model = {
        "version": MODEL_VERSION,
        "method": (
            "Survey-balanced ridge regression predicts a normalized perimeter position from WEAR-only BMI, breadth, depth, height, and sex features; "
            "hips additionally use absolute geometry features selected by anonymous entire-survey holdout. The position is converted to a "
            "superellipse exponent between 1.2 and 4.0. Named sizing-lab profiles and answers are excluded."
        ),
        "formula": (
            "position = clamp(interceptPosition + sum(coefficient * ((feature - center) / scale)), 0, 1); "
            "targetPerimeter = P(n=1.2) + position * (P(n=4.0) - P(n=1.2)); solve n by bisection"
        ),
        "rows": {
            kind: build_row_model(kind, rows[kind], same_level_counts[kind])
            for kind in ("waist", "hips")
        },
        "unavailableRows": {
            "trouserWaist": {
                "label": "Trouser waist",
                "reason": (
                    "The purchased WEAR 1D surveys do not provide a defensible multi-survey breadth + depth + circumference triplet "
                    "measured at the same lower-waist level. Automatic shape is disabled instead of mixing abdomen and waistband levels."
                ),
            }
        },
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(model, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "output": str(args.output),
        "version": MODEL_VERSION,
        "validation": {
            kind: {
                "trainingSubjects": definition["trainingSubjects"],
                "coveragePct": definition["coveragePct"],
                "maeCm": definition["validationMaeCm"],
                "p90Cm": definition["validationP90AbsErrorCm"],
                "meanAbsPct": definition["validationMeanAbsPercentError"],
                "p90AbsPct": definition["validationP90AbsPercentError"],
            }
            for kind, definition in model["rows"].items()
        },
        "trouserWaist": "unavailable: no safe same-level multi-survey triplet",
    }, indent=2))


if __name__ == "__main__":
    main()
