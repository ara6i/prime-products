#!/usr/bin/env python3
"""Fit the local sizing-lab WEAR 1D depth-ratio formulas.

Usage:
  python scripts/fit_wear_depth_ratio_formula.py --wear-root /path/to/extracted/archive

The licensed rows stay outside the repository. This script prints derived
coefficients and validation summaries only; it never reads Shane 2 or Nadia.
Run it with the bundled Codex Python runtime, which includes pandas and numpy.
"""

from __future__ import annotations

import argparse
import json
from dataclasses import dataclass
from pathlib import Path

import numpy as np
import pandas as pd


@dataclass(frozen=True)
class BodySurvey:
    gender: str
    survey: str
    relative_path: str
    weight: int
    height: int
    waist_breadth: int
    waist_depth: int
    hip_breadth: int
    hip_depth: int | None


@dataclass(frozen=True)
class LowerWaistSurvey:
    gender: str
    survey: str
    relative_path: str
    weight: int
    height: int
    breadth: int
    depth: int


BODY_SURVEYS = (
    BodySurvey("female", "AF68", "SURVEY OF AIR FORCE WOMEN 1968/AF68FE Dataset.csv", 3, 8, 68, 76, 69, 78),
    BodySurvey("female", "ARFE77", "Survey of US Army Women - File #2 1977/ARFE77_2 Dataset.csv", 2, 3, 22, 20, 23, None),
    BodySurvey("female", "STEWA72", "American Airline Stewardesses Survey 1972/STEWA72 Dataset.csv", 2, 3, 42, 38, 46, 37),
    BodySurvey("male", "GERMAN68", "German Air Force 1968/GERMAN68 Dataset.csv", 2, 9, 48, 45, 43, 46),
    BodySurvey("male", "ATC61", "Air Traffic Controllers 1961/ATCMAL61 Dataset.csv", 3, 5, 43, 46, 44, 47),
    BodySurvey("male", "MARFLY64", "Survey of U.S. Naval Aviators 1964/MARFLY64 Dataset.csv", 2, 3, 26, 29, 27, 30),
    BodySurvey("male", "AFFLY50", "Survey of Flying Personnel 1950/AFFLY50 Dataset.csv", 2, 3, 42, 45, 43, 46),
    BodySurvey("male", "NATO61", "NATO Anthropometric Survey 1960-1961/NATO61 Dataset.csv", 2, 3, 38, 44, 39, 45),
    BodySurvey("male", "KOREAN64", "Survey of ROKAF Flying Personnel 1960/KOREAN64 Dataset.csv", 2, 3, 42, 45, 43, 46),
)

LOWER_WAIST_SURVEYS = (
    LowerWaistSurvey("female", "ARFE77-abdomen", "Survey of US Army Women - File #3 1977/ARFE77_3 Dataset.csv", 33, 32, 18, 15),
    LowerWaistSurvey("male", "CANADA74-stomach", "Canadian Forces Survey 1974/CANADA74 Dataset.csv", 2, 3, 30, 29),
)


def numeric_column(frame: pd.DataFrame, index: int | None) -> pd.Series:
    if index is None:
        return pd.Series(np.nan, index=frame.index)
    return pd.to_numeric(frame.iloc[:, index], errors="coerce")


def load_body_rows(root: Path) -> pd.DataFrame:
    frames: list[pd.DataFrame] = []
    for survey in BODY_SURVEYS:
        source = pd.read_csv(root / survey.relative_path, low_memory=False)
        frame = pd.DataFrame(
            {
                "gender": survey.gender,
                "survey": survey.survey,
                "weightKg": numeric_column(source, survey.weight),
                "heightCm": numeric_column(source, survey.height) / 10,
                "waistBreadthCm": numeric_column(source, survey.waist_breadth) / 10,
                "waistDepthCm": numeric_column(source, survey.waist_depth) / 10,
                "hipBreadthCm": numeric_column(source, survey.hip_breadth) / 10,
                "hipDepthCm": numeric_column(source, survey.hip_depth) / 10,
            }
        )
        frame["bmi"] = frame.weightKg / (frame.heightCm / 100) ** 2
        frames.append(frame)

    rows = pd.concat(frames, ignore_index=True)
    rows = rows.query(
        "140 < heightCm < 210 and 35 < weightKg < 160 and "
        "14 < waistBreadthCm < 60 and 10 < waistDepthCm < 50 and "
        "20 < hipBreadthCm < 65 and 14 < bmi < 50"
    ).copy()
    rows["waist"] = rows.waistDepthCm / rows.waistBreadthCm
    rows["hips"] = rows.hipDepthCm / rows.hipBreadthCm
    rows["waistWidthToHeight"] = rows.waistBreadthCm / rows.heightCm
    rows["hipWidthToHeight"] = rows.hipBreadthCm / rows.heightCm
    rows["waistToHipWidth"] = rows.waistBreadthCm / rows.hipBreadthCm
    return rows


def load_lower_waist_rows(root: Path) -> pd.DataFrame:
    frames: list[pd.DataFrame] = []
    for survey in LOWER_WAIST_SURVEYS:
        source = pd.read_csv(root / survey.relative_path, low_memory=False)
        frame = pd.DataFrame(
            {
                "gender": survey.gender,
                "survey": survey.survey,
                "weightKg": numeric_column(source, survey.weight),
                "heightCm": numeric_column(source, survey.height) / 10,
                "breadthCm": numeric_column(source, survey.breadth) / 10,
                "depthCm": numeric_column(source, survey.depth) / 10,
            }
        )
        frame["bmi"] = frame.weightKg / (frame.heightCm / 100) ** 2
        frame["trouserWaist"] = frame.depthCm / frame.breadthCm
        frame["trouserWidthToHeight"] = frame.breadthCm / frame.heightCm
        frame = frame.query(
            "140 < heightCm < 210 and 35 < weightKg < 160 and "
            "15 < breadthCm < 60 and 10 < depthCm < 50 and "
            "14 < bmi < 50 and 0.35 < trouserWaist < 1.2"
        )
        frames.append(frame)
    return pd.concat(frames, ignore_index=True)


def fit_linear(rows: pd.DataFrame, features: list[str], target: str) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    centers = rows[features].mean().to_numpy()
    scales = rows[features].std().to_numpy()
    design = np.column_stack((np.ones(len(rows)), (rows[features].to_numpy() - centers) / scales))
    ridge = np.diag([0.0] + [1e-5] * len(features))
    coefficients = np.linalg.solve(design.T @ design + ridge, design.T @ rows[target].to_numpy())
    return centers, scales, coefficients


def predict(rows: pd.DataFrame, features: list[str], fit: tuple[np.ndarray, np.ndarray, np.ndarray]) -> np.ndarray:
    centers, scales, coefficients = fit
    design = np.column_stack((np.ones(len(rows)), (rows[features].to_numpy() - centers) / scales))
    return design @ coefficients


def summarize_model(
    rows: pd.DataFrame,
    features: list[str],
    target: str,
    validation: str,
) -> dict[str, object]:
    rows = rows.dropna(subset=[*features, target]).reset_index(drop=True)
    errors: list[float] = []
    if validation == "leave-one-survey-out":
        for held_out in rows.survey.unique():
            train = rows[rows.survey != held_out]
            test = rows[rows.survey == held_out]
            errors.extend((predict(test, features, fit_linear(train, features, target)) - test[target]).tolist())
    else:
        for fold in range(5):
            test_mask = rows.index % 5 == fold
            train = rows[~test_mask]
            test = rows[test_mask]
            errors.extend((predict(test, features, fit_linear(train, features, target)) - test[target]).tolist())

    centers, scales, coefficients = fit_linear(rows, features, target)
    absolute_errors = np.abs(np.asarray(errors))
    return {
        "trainingSubjects": len(rows),
        "trainingSurveys": sorted(rows.survey.unique().tolist()),
        "features": features,
        "centers": dict(zip(features, centers.tolist())),
        "intercept": float(coefficients[0]),
        "coefficients": dict(zip(features, (coefficients[1:] / scales).tolist())),
        "supportedMin": float(rows[target].quantile(0.01)),
        "supportedMax": float(rows[target].quantile(0.99)),
        "featureP05": {feature: float(rows[feature].quantile(0.05)) for feature in features},
        "featureP95": {feature: float(rows[feature].quantile(0.95)) for feature in features},
        "validationMethod": validation,
        "validationMae": float(absolute_errors.mean()),
        "validationP90AbsError": float(np.quantile(absolute_errors, 0.9)),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--wear-root", type=Path, required=True, help="Extracted 1DWEARDataALLSurveys directory")
    args = parser.parse_args()
    body = load_body_rows(args.wear_root)
    lower = load_lower_waist_rows(args.wear_root)

    models = {
        "female.waist": summarize_model(body.query("gender == 'female' and 0.35 < waist < 1.15"), ["bmi", "waistWidthToHeight"], "waist", "leave-one-survey-out"),
        "female.trouserWaist": summarize_model(lower.query("gender == 'female'"), ["bmi", "trouserWidthToHeight"], "trouserWaist", "deterministic-five-fold"),
        "female.hips": summarize_model(body.query("gender == 'female' and 0.35 < hips < 1.15"), ["bmi", "hipWidthToHeight"], "hips", "leave-one-survey-out"),
        "male.waist": summarize_model(body.query("gender == 'male' and 0.35 < waist < 1.15"), ["bmi", "waistWidthToHeight"], "waist", "leave-one-survey-out"),
        "male.trouserWaist": summarize_model(lower.query("gender == 'male'"), ["bmi", "trouserWidthToHeight"], "trouserWaist", "deterministic-five-fold"),
        "male.hips": summarize_model(body.query("gender == 'male' and 0.35 < hips < 1.15"), ["bmi", "hipWidthToHeight", "waistToHipWidth"], "hips", "leave-one-survey-out"),
    }
    print(json.dumps(models, indent=2))


if __name__ == "__main__":
    main()
