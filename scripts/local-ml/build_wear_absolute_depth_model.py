#!/usr/bin/env python3
"""Build an anonymous WEAR 1D model that predicts body depth in centimetres.

The model never reads named sizing-lab people or their target circumferences.
It learns only from licensed WEAR 1D breadth/depth measurements and writes
aggregate coefficients plus validation errors; raw rows and identifiers stay
outside the repository.

Usage:
  python3 scripts/local-ml/build_wear_absolute_depth_model.py \
    --wear-root .local-ml/wear-1d \
    --output app/try-on-test/sizing-lab/models/wear-1d-absolute-depth-v1.json
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import sys

import numpy as np
import pandas as pd

SCRIPTS_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SCRIPTS_ROOT))

from fit_wear_depth_ratio_formula import (  # noqa: E402
    fit_linear,
    load_body_rows,
    load_lower_waist_rows,
    predict,
)


MODEL_VERSION = "wear-1d-absolute-depth-v1"

# These feature sets were chosen from WEAR-only cross-validation. Shane 2,
# Nadia, Shahnaz, and every other named test-lab profile are excluded from both
# fitting and feature selection.
ROW_FEATURES = {
    "waist": ["breadthCm", "bmi", "heightCm", "isMale"],
    "trouserWaist": ["breadthCm", "bmi", "heightCm", "isMale", "breadthMale", "bmiMale"],
    "hips": ["breadthCm", "bmi"],
}

ROW_METADATA = {
    "waist": {
        "label": "Natural waist",
        "measurement": "Measured waist depth in centimetres",
        "validationMethod": "leave-one-survey-out",
    },
    "trouserWaist": {
        "label": "Stomach proxy for trouser waist",
        "measurement": "Measured abdomen or stomach depth in centimetres; not an exact trouser waistband plane",
        "validationMethod": "deterministic-five-fold-within-surveys",
    },
    "hips": {
        "label": "Hips",
        "measurement": "Measured buttock depth in centimetres",
        "validationMethod": "leave-one-survey-out",
    },
}


def rounded(value: float, digits: int = 6) -> float:
    return round(float(value), digits)


def prepare_rows(root: Path) -> dict[str, pd.DataFrame]:
    body = load_body_rows(root)
    lower = load_lower_waist_rows(root)
    rows = {
        "waist": body.rename(columns={"waistBreadthCm": "breadthCm", "waistDepthCm": "depthCm"}),
        "trouserWaist": lower,
        "hips": body.rename(columns={"hipBreadthCm": "breadthCm", "hipDepthCm": "depthCm"}),
    }
    prepared: dict[str, pd.DataFrame] = {}
    for kind, frame in rows.items():
        usable = frame.dropna(subset=["gender", "survey", "breadthCm", "depthCm", "heightCm", "bmi"]).copy()
        usable = usable.query("0.35 < depthCm / breadthCm < 1.2")
        usable["isMale"] = (usable.gender == "male").astype(float)
        usable["breadthMale"] = usable.breadthCm * usable.isMale
        usable["bmiMale"] = usable.bmi * usable.isMale
        prepared[kind] = usable.reset_index(drop=True)
    return prepared


def validation_errors(rows: pd.DataFrame, features: list[str], method: str) -> np.ndarray:
    errors: list[float] = []
    if method == "leave-one-survey-out":
        for held_out in sorted(rows.survey.unique()):
            train = rows[rows.survey != held_out]
            test = rows[rows.survey == held_out]
            if len(train) < 20 or len(test) < 5:
                continue
            predicted = predict(test, features, fit_linear(train, features, "depthCm"))
            errors.extend((predicted - test.depthCm).tolist())
    else:
        # Each fold contains rows from both source surveys. The two available
        # trouser proxies are confounded with sex, so survey holdout would test
        # an unseen sex/protocol rather than this formula's expected use.
        for fold in range(5):
            test_mask = rows.index % 5 == fold
            train = rows[~test_mask]
            test = rows[test_mask]
            predicted = predict(test, features, fit_linear(train, features, "depthCm"))
            errors.extend((predicted - test.depthCm).tolist())
    return np.asarray(errors)


def build_row_model(kind: str, rows: pd.DataFrame) -> dict[str, object]:
    features = ROW_FEATURES[kind]
    metadata = ROW_METADATA[kind]
    rows = rows.dropna(subset=[*features, "depthCm"]).reset_index(drop=True)
    errors = validation_errors(rows, features, str(metadata["validationMethod"]))
    centers, scales, standardized_coefficients = fit_linear(rows, features, "depthCm")
    raw_coefficients = standardized_coefficients[1:] / scales
    absolute_errors = np.abs(errors)
    gender_counts = rows.gender.value_counts().to_dict()
    return {
        **metadata,
        "trainingSubjects": int(len(rows)),
        "trainingSurveyCount": int(rows.survey.nunique()),
        "genderCounts": {
            "female": int(gender_counts.get("female", 0)),
            "male": int(gender_counts.get("male", 0)),
        },
        "featureNames": features,
        "featureCenters": {
            feature: rounded(center) for feature, center in zip(features, centers.tolist())
        },
        "interceptCm": rounded(standardized_coefficients[0]),
        "coefficients": {
            feature: rounded(coefficient)
            for feature, coefficient in zip(features, raw_coefficients.tolist())
        },
        "supportedDepthMinCm": rounded(rows.depthCm.quantile(0.01), 3),
        "supportedDepthMaxCm": rounded(rows.depthCm.quantile(0.99), 3),
        "featureP05": {
            feature: rounded(rows[feature].quantile(0.05), 3) for feature in features
        },
        "featureP95": {
            feature: rounded(rows[feature].quantile(0.95), 3) for feature in features
        },
        "validationMaeCm": rounded(absolute_errors.mean(), 3),
        "validationP90AbsErrorCm": rounded(np.quantile(absolute_errors, 0.9), 3),
        "validationP95AbsErrorCm": rounded(np.quantile(absolute_errors, 0.95), 3),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--wear-root", type=Path, required=True, help="Extracted 1DWEARDataALLSurveys directory")
    parser.add_argument("--output", type=Path, required=True, help="Anonymous aggregate JSON output")
    args = parser.parse_args()

    rows = prepare_rows(args.wear_root)
    model = {
        "version": MODEL_VERSION,
        "method": (
            "Linear absolute-depth prediction from measured WEAR breadth, BMI, height, and sex features. "
            "Named sizing-lab people and target circumferences are excluded."
        ),
        "formula": "depthCm = interceptCm + sum(coefficient[feature] * (featureValue - featureCenter))",
        "rows": {kind: build_row_model(kind, rows[kind]) for kind in ("waist", "trouserWaist", "hips")},
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(model, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "output": str(args.output),
        "version": MODEL_VERSION,
        "validation": {
            kind: {
                "subjects": definition["trainingSubjects"],
                "surveys": definition["trainingSurveyCount"],
                "maeCm": definition["validationMaeCm"],
                "p90Cm": definition["validationP90AbsErrorCm"],
            }
            for kind, definition in model["rows"].items()
        },
    }, indent=2))


if __name__ == "__main__":
    main()
