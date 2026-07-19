#!/usr/bin/env python3
"""Train the local WEAR 1D anatomical-row prior.

This model predicts only vertical row position along visible head-to-foot
height. It cannot learn photo endpoints or front-to-back depth because WEAR 1D
contains neither photos nor body surfaces.
"""

from __future__ import annotations

import argparse
import csv
import hashlib
import json
import math
import re
from collections import Counter, defaultdict
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

import numpy as np


MODEL_VERSION = "wear-1d-row-prior-v1"
FEATURE_NAMES = (
    "intercept",
    "height_z",
    "bmi_z",
    "is_male",
    "height_z_x_bmi_z",
    "is_male_x_bmi_z",
)

STATURE_ALIASES = (
    "STATURE",
    "HEIGHT STATURE",
)
WEIGHT_ALIASES = (
    "WEIGHT",
    "BODY WEIGHT",
)
ROW_ALIASES = {
    "waist": (
        "WAIST HT NATURAL",
        "WAIST HEIGHT NATURAL",
        "WAIST HEIGHT",
        "WAIST HT",
        "WAIST HGHT",
    ),
    "trouserWaist": (
        "ABDOMINAL EXTENSION HEIGHT",
        "ABDOMINAL EXT HEIGHT",
        "ABDOMINAL EXT HGT",
        "ABDOM EXT HEIGHT",
        "ABDOM EXT HGT",
    ),
    "hips": (
        "BUTTOCK HEIGHT",
        "BUTTOCK HT",
    ),
}
ROW_BOUNDS = {
    "waist": (0.25, 0.50),
    "trouserWaist": (0.32, 0.58),
    "hips": (0.38, 0.65),
}
ROW_DEFINITIONS = {
    "waist": "standing natural-waist height converted to top-to-bottom stature fraction",
    "trouserWaist": "abdominal-extension height proxy converted to top-to-bottom stature fraction",
    "hips": "standing buttock-height landmark converted to top-to-bottom stature fraction",
}

REFERENCE_HEIGHT_BIN_CM = 5.0
REFERENCE_BMI_BIN = 2.0
REFERENCE_MIN_SAMPLE_COUNT = 5

FEMALE_TERMS = re.compile(r"\b(female|females|women|woman|stewardess|stewardesses)\b", re.I)
MALE_TERMS = re.compile(r"\b(male|males|men|aircrewmen|guardsmen|corpsmen|aviators|gurkhas)\b", re.I)
EXCLUDED_SURVEY_TERMS = re.compile(r"\b(children|youth|youths)\b", re.I)
DERIVED_SURVEY_TERMS = re.compile(r"\b(AFQ83|Q83|ADJUSTED)\b", re.I)


@dataclass(frozen=True)
class Record:
    subject_key: str
    survey: str
    gender: str
    height_cm: float
    bmi: float
    target: float
    source_header: str


def normalize_header(value: str) -> str:
    return re.sub(r"[^A-Z0-9]+", " ", value.upper()).strip()


def infer_gender(survey: str) -> str | None:
    if FEMALE_TERMS.search(survey):
        return "female"
    if MALE_TERMS.search(survey):
        return "male"
    return None


def choose_column(headers: list[str], aliases: Iterable[str]) -> tuple[int, str] | None:
    normalized = [normalize_header(header) for header in headers]
    for alias in aliases:
        for index, header in enumerate(normalized):
            if header == alias:
                return index, headers[index]
    return None


def number(value: str) -> float | None:
    try:
        parsed = float(value.strip())
    except (TypeError, ValueError):
        return None
    return parsed if math.isfinite(parsed) else None


def stature_cm(raw_stature: float) -> float | None:
    if 1200 <= raw_stature <= 2200:
        return raw_stature / 10.0
    if 120 <= raw_stature <= 220:
        return raw_stature
    if 48 <= raw_stature <= 90:
        return raw_stature * 2.54
    return None


def weight_kg(raw_weight: float, height_cm: float) -> float | None:
    height_m = height_cm / 100.0
    candidates = (raw_weight, raw_weight * 0.45359237)
    plausible = [candidate for candidate in candidates if 12 <= candidate / (height_m * height_m) <= 60]
    if not plausible:
        return None
    return min(plausible, key=lambda candidate: abs(candidate / (height_m * height_m) - 24.0))


def build_records(root: Path) -> tuple[dict[str, list[Record]], dict[str, object]]:
    records: dict[str, list[Record]] = defaultdict(list)
    skipped = Counter()
    scanned_surveys = 0

    for path in sorted(root.rglob("*.csv")):
        survey = path.parent.name
        if EXCLUDED_SURVEY_TERMS.search(survey):
            skipped["child_or_youth_survey"] += 1
            continue
        if DERIVED_SURVEY_TERMS.search(survey):
            skipped["derived_or_overlapping_survey"] += 1
            continue
        gender = infer_gender(survey)
        if gender is None:
            skipped["gender_not_explicit"] += 1
            continue
        try:
            with path.open("r", encoding="utf-8-sig", errors="replace", newline="") as handle:
                reader = csv.reader(handle)
                headers = next(reader)
                rows = list(reader)
        except (OSError, StopIteration, csv.Error):
            skipped["unreadable_csv"] += 1
            continue

        stature_column = choose_column(headers, STATURE_ALIASES)
        weight_column = choose_column(headers, WEIGHT_ALIASES)
        subject_column = 0 if headers else None
        if stature_column is None or weight_column is None or subject_column is None:
            skipped["missing_stature_or_weight"] += 1
            continue
        row_columns = {kind: choose_column(headers, aliases) for kind, aliases in ROW_ALIASES.items()}
        if not any(row_columns.values()):
            skipped["no_supported_row_height"] += 1
            continue
        scanned_surveys += 1

        for row_index, row in enumerate(rows):
            required_index = max(stature_column[0], weight_column[0], subject_column)
            if len(row) <= required_index:
                continue
            raw_stature = number(row[stature_column[0]])
            raw_weight = number(row[weight_column[0]])
            if raw_stature is None or raw_weight is None or raw_stature <= 0 or raw_weight <= 0:
                continue
            height_cm = stature_cm(raw_stature)
            if height_cm is None:
                continue
            active_weight_kg = weight_kg(raw_weight, height_cm)
            if active_weight_kg is None:
                continue
            bmi = active_weight_kg / ((height_cm / 100.0) ** 2)
            subject = row[subject_column].strip() or str(row_index + 1)

            for kind, column in row_columns.items():
                if column is None or len(row) <= column[0]:
                    continue
                raw_target = number(row[column[0]])
                if raw_target is None or raw_target <= 0:
                    continue
                # Target and stature originate in the same survey and therefore
                # share its length unit. The ratio remains unit-independent.
                target = 1.0 - (raw_target / raw_stature)
                lower, upper = ROW_BOUNDS[kind]
                if target < lower or target > upper:
                    continue
                records[kind].append(Record(
                    subject_key=f"{survey}:{subject}",
                    survey=survey,
                    gender=gender,
                    height_cm=height_cm,
                    bmi=bmi,
                    target=target,
                    source_header=column[1],
                ))

    # Remove exact/reweighted duplicates that survived folder-name filtering.
    for kind, values in records.items():
        unique: dict[tuple[object, ...], Record] = {}
        for record in values:
            signature = (
                record.gender,
                round(record.height_cm, 1),
                round(record.bmi, 2),
                round(record.target, 5),
            )
            unique.setdefault(signature, record)
        records[kind] = list(unique.values())

    return records, {
        "csvFiles": len(list(root.rglob("*.csv"))),
        "eligibleSurveyFiles": scanned_surveys,
        "skipped": dict(skipped),
    }


def robust_records(records: list[Record]) -> list[Record]:
    values = np.asarray([record.target for record in records], dtype=np.float64)
    if values.size < 20:
        return records
    median = float(np.median(values))
    mad = float(np.median(np.abs(values - median)))
    if mad <= 1e-8:
        return records
    limit = 5.0 * 1.4826 * mad
    return [record for record in records if abs(record.target - median) <= limit]


def feature_normalization(records: list[Record]) -> dict[str, float]:
    heights = np.asarray([record.height_cm for record in records], dtype=np.float64)
    bmis = np.asarray([record.bmi for record in records], dtype=np.float64)
    return {
        "heightMean": float(np.mean(heights)),
        "heightStd": max(1e-6, float(np.std(heights))),
        "bmiMean": float(np.mean(bmis)),
        "bmiStd": max(1e-6, float(np.std(bmis))),
    }


def feature_vector(record: Record, normalization: dict[str, float]) -> list[float]:
    height_z = (record.height_cm - normalization["heightMean"]) / normalization["heightStd"]
    bmi_z = (record.bmi - normalization["bmiMean"]) / normalization["bmiStd"]
    is_male = 1.0 if record.gender == "male" else 0.0
    return [1.0, height_z, bmi_z, is_male, height_z * bmi_z, is_male * bmi_z]


def fit(records: list[Record], ridge: float = 0.08) -> tuple[np.ndarray, dict[str, float]]:
    normalization = feature_normalization(records)
    x = np.asarray([feature_vector(record, normalization) for record in records], dtype=np.float64)
    y = np.asarray([record.target for record in records], dtype=np.float64)
    penalty = np.eye(x.shape[1], dtype=np.float64) * ridge
    penalty[0, 0] = 0.0
    coefficients = np.linalg.solve(x.T @ x + penalty, x.T @ y)
    return coefficients, normalization


def predict(record: Record, coefficients: np.ndarray, normalization: dict[str, float]) -> float:
    return float(np.dot(np.asarray(feature_vector(record, normalization)), coefficients))


def validation_predictions(records: list[Record]) -> tuple[list[float], str]:
    surveys = sorted({record.survey for record in records})
    predictions: list[float] = []
    if len(surveys) >= 3:
        for held_out in surveys:
            training = [record for record in records if record.survey != held_out]
            testing = [record for record in records if record.survey == held_out]
            if len(training) < 30 or not testing:
                continue
            coefficients, normalization = fit(training)
            predictions.extend(abs(predict(record, coefficients, normalization) - record.target) for record in testing)
        return predictions, "leave-one-survey-out"

    training: list[Record] = []
    testing: list[Record] = []
    for record in records:
        digest = hashlib.sha256(record.subject_key.encode("utf-8")).digest()[0]
        (testing if digest < 51 else training).append(record)
    if len(training) >= 30 and testing:
        coefficients, normalization = fit(training)
        predictions = [abs(predict(record, coefficients, normalization) - record.target) for record in testing]
    return predictions, "subject-hash-80-20"


def percentile(values: list[float], value: float) -> float:
    return float(np.percentile(np.asarray(values, dtype=np.float64), value)) if values else math.nan


def reference_cohorts(records: list[Record]) -> list[dict[str, object]]:
    """Create small anonymous groups for UI explanation only.

    These cohorts are never model inputs. Grouping prevents the committed
    checkpoint from exposing raw subject rows while still letting the lab show
    what an old WEAR column means for people near the active height and BMI.
    """
    buckets: dict[tuple[str, int, int], list[Record]] = defaultdict(list)
    for record in records:
        height_bin = round(record.height_cm / REFERENCE_HEIGHT_BIN_CM)
        bmi_bin = round(record.bmi / REFERENCE_BMI_BIN)
        buckets[(record.gender, height_bin, bmi_bin)].append(record)

    cohorts: list[dict[str, object]] = []
    for (gender, _height_bin, _bmi_bin), values in buckets.items():
        if len(values) < REFERENCE_MIN_SAMPLE_COUNT:
            continue
        heights = np.asarray([record.height_cm for record in values], dtype=np.float64)
        bmis = np.asarray([record.bmi for record in values], dtype=np.float64)
        floor_heights = np.asarray([
            (1.0 - record.target) * record.height_cm
            for record in values
        ], dtype=np.float64)
        source_header = Counter(
            normalize_header(record.source_header)
            for record in values
        ).most_common(1)[0][0]
        cohorts.append({
            "gender": gender,
            "averageHeightCm": float(np.mean(heights)),
            "averageBmi": float(np.mean(bmis)),
            "sampleCount": len(values),
            "measuredHeightFromFloorCm": float(np.median(floor_heights)),
            "sourceColumn": source_header,
        })
    return sorted(
        cohorts,
        key=lambda cohort: (
            str(cohort["gender"]),
            float(cohort["averageHeightCm"]),
            float(cohort["averageBmi"]),
        ),
    )


def train_row(kind: str, raw_records: list[Record]) -> dict[str, object]:
    records = robust_records(raw_records)
    if len(records) < 50:
        raise ValueError(f"{kind}: only {len(records)} usable WEAR records")
    coefficients, normalization = fit(records)
    fitted = [predict(record, coefficients, normalization) for record in records]
    train_errors = [abs(predicted - record.target) for predicted, record in zip(fitted, records)]
    validation_errors, validation_mode = validation_predictions(records)
    targets = [record.target for record in records]
    genders = Counter(record.gender for record in records)
    surveys = sorted({record.survey for record in records})
    headers = Counter(normalize_header(record.source_header) for record in records)
    validation_basis = validation_errors if validation_errors else train_errors
    return {
        "definition": ROW_DEFINITIONS[kind],
        "sampleCount": len(records),
        "surveyCount": len(surveys),
        "surveys": surveys,
        "genderCounts": dict(genders),
        "sourceHeaders": dict(headers),
        "coefficients": [float(value) for value in coefficients],
        "normalization": normalization,
        "outputMin": percentile(targets, 1),
        "outputMax": percentile(targets, 99),
        "trainingMaeFraction": float(np.mean(train_errors)),
        "validationMode": validation_mode,
        "validationCount": len(validation_errors),
        "validationMaeFraction": float(np.mean(validation_basis)),
        "validationP90Fraction": percentile(validation_basis, 90),
        "validationMaeAt170Cm": float(np.mean(validation_basis)) * 170.0,
        "validationP90At170Cm": percentile(validation_basis, 90) * 170.0,
        "referenceCohorts": reference_cohorts(records),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--wear-root", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--report", type=Path)
    args = parser.parse_args()

    records, scan = build_records(args.wear_root)
    rows = {kind: train_row(kind, records.get(kind, [])) for kind in ROW_ALIASES}
    model = {
        "version": MODEL_VERSION,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "localOnly": True,
        "source": "licensed WEAR 1D survey CSV files",
        "task": "vertical anatomical row prior only",
        "coordinateDefinition": "fraction from visible top of head to visible bottom of feet",
        "featureNames": list(FEATURE_NAMES),
        "depthReady": False,
        "endpointSource": "MediaPipe visible-mask central segment at predicted row",
        "limitations": [
            "WEAR 1D has no photos, so it cannot train visual endpoints.",
            "WEAR 1D has no body surface, so it cannot train hidden front-to-back depth.",
            "Trouser waist uses abdominal-extension height as an anatomical proxy, not a garment waistband definition.",
            "The source surveys are historical and many are military; confidence must remain visible.",
        ],
        "scan": scan,
        "rows": rows,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(model, indent=2), encoding="utf-8")
    if args.report:
        args.report.parent.mkdir(parents=True, exist_ok=True)
        report = {
            "version": MODEL_VERSION,
            "rows": {
                kind: {
                    key: row[key]
                    for key in (
                        "sampleCount",
                        "surveyCount",
                        "genderCounts",
                        "sourceHeaders",
                        "validationMode",
                        "validationCount",
                        "validationMaeAt170Cm",
                        "validationP90At170Cm",
                    )
                } | {"referenceCohortCount": len(row["referenceCohorts"])}
                for kind, row in rows.items()
            },
            "limitations": model["limitations"],
        }
        args.report.write_text(json.dumps(report, indent=2), encoding="utf-8")

    print(json.dumps({
        "output": str(args.output),
        "rows": {
            kind: {
                "samples": row["sampleCount"],
                "surveys": row["surveyCount"],
                "validation": row["validationMode"],
                "maeAt170Cm": round(float(row["validationMaeAt170Cm"]), 2),
                "p90At170Cm": round(float(row["validationP90At170Cm"]), 2),
                "genders": row["genderCounts"],
                "referenceCohorts": len(row["referenceCohorts"]),
            }
            for kind, row in rows.items()
        },
    }, indent=2))


if __name__ == "__main__":
    main()
