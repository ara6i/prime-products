#!/usr/bin/env python3
"""Build anonymous direct-measurement WEAR depth cohorts for the test lab.

This is intentionally not a regression model. Each output value is the median
of real subject-level depth / breadth ratios inside a fixed gender, 5 cm
height, and 2 BMI box. Raw licensed rows and subject identifiers never enter
the repository.

Usage:
  python3 scripts/local-ml/build_wear_depth_cohorts.py \
    --wear-root .local-ml/wear-1d \
    --output app/try-on-test/sizing-lab/models/wear-1d-direct-depth-cohorts-v1.json
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path
import sys

import pandas as pd

SCRIPTS_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SCRIPTS_ROOT))

from fit_wear_depth_ratio_formula import load_body_rows, load_lower_waist_rows  # noqa: E402


MODEL_VERSION = "wear-1d-direct-depth-cohorts-v1"
HEIGHT_BIN_CM = 5.0
BMI_BIN = 2.0
MIN_PEOPLE = 5


def bin_center(value: float, width: float) -> float:
    return math.floor(value / width + 0.5) * width


def rounded(value: float, digits: int = 6) -> float:
    return round(float(value), digits)


def build_cohorts(
    rows: pd.DataFrame,
    *,
    ratio_column: str,
    breadth_column: str,
    depth_column: str,
) -> list[dict[str, object]]:
    usable = rows.dropna(subset=["gender", "heightCm", "bmi", ratio_column, breadth_column, depth_column]).copy()
    usable = usable.query(f"0.35 < {ratio_column} < 1.2")
    usable["heightCenterCm"] = usable.heightCm.map(lambda value: bin_center(float(value), HEIGHT_BIN_CM))
    usable["bmiCenter"] = usable.bmi.map(lambda value: bin_center(float(value), BMI_BIN))

    cohorts: list[dict[str, object]] = []
    for (gender, height_center, bmi_center), group in usable.groupby(
        ["gender", "heightCenterCm", "bmiCenter"],
        sort=True,
    ):
        if len(group) < MIN_PEOPLE:
            continue
        cohorts.append(
            {
                "gender": str(gender),
                "heightMinCm": rounded(height_center - HEIGHT_BIN_CM / 2, 1),
                "heightMaxCm": rounded(height_center + HEIGHT_BIN_CM / 2, 1),
                "bmiMin": rounded(bmi_center - BMI_BIN / 2, 1),
                "bmiMax": rounded(bmi_center + BMI_BIN / 2, 1),
                "sampleCount": int(len(group)),
                "medianDepthRatio": rounded(group[ratio_column].median()),
                "p10DepthRatio": rounded(group[ratio_column].quantile(0.1)),
                "p90DepthRatio": rounded(group[ratio_column].quantile(0.9)),
                "medianBreadthCm": rounded(group[breadth_column].median(), 2),
                "medianDepthCm": rounded(group[depth_column].median(), 2),
                "surveys": sorted(str(value) for value in group.survey.dropna().unique()),
            }
        )
    return cohorts


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--wear-root", type=Path, required=True, help="Extracted 1DWEARDataALLSurveys directory")
    parser.add_argument("--output", type=Path, required=True, help="Anonymous aggregate JSON output")
    args = parser.parse_args()

    body = load_body_rows(args.wear_root)
    lower = load_lower_waist_rows(args.wear_root)
    model = {
        "version": MODEL_VERSION,
        "method": "Direct median of measured subject depth divided by measured subject breadth; no regression formula.",
        "heightBinCm": HEIGHT_BIN_CM,
        "bmiBin": BMI_BIN,
        "minPeople": MIN_PEOPLE,
        "rows": {
            "waist": {
                "label": "Natural waist",
                "measurement": "Measured waist depth / measured waist breadth",
                "cohorts": build_cohorts(
                    body,
                    ratio_column="waist",
                    breadth_column="waistBreadthCm",
                    depth_column="waistDepthCm",
                ),
            },
            "trouserWaist": {
                "label": "Stomach proxy for trouser waist",
                "measurement": "Measured abdomen or stomach depth / measured breadth; not an exact trouser waistband plane",
                "cohorts": build_cohorts(
                    lower,
                    ratio_column="trouserWaist",
                    breadth_column="breadthCm",
                    depth_column="depthCm",
                ),
            },
            "hips": {
                "label": "Hips",
                "measurement": "Measured buttock depth / measured hip breadth",
                "cohorts": build_cohorts(
                    body,
                    ratio_column="hips",
                    breadth_column="hipBreadthCm",
                    depth_column="hipDepthCm",
                ),
            },
        },
    }

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(model, indent=2) + "\n", encoding="utf-8")
    print(
        json.dumps(
            {
                "output": str(args.output),
                "version": MODEL_VERSION,
                "cohorts": {
                    row: len(definition["cohorts"])
                    for row, definition in model["rows"].items()
                },
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
