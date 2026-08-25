#!/usr/bin/env python3
"""Measure the best row-position signal available from WEAR landmarks.

This is an audit, not a deployable model.  It deliberately gives the regressor
the exact 73 projected WEAR landmarks on validation/test people.  If even this
oracle cannot recover the certified waist/hip rows, a photo-only model cannot
be expected to do so by simply adding more trees or epochs.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
from sklearn.ensemble import ExtraTreesRegressor, RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.pipeline import make_pipeline


HEIGHT = 256
ROWS = ("waist", "hips")
SEED = 20260824


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--jobs", type=int, default=-1)
    parser.add_argument("--trees", type=int, default=512)
    return parser.parse_args()


def read_manifest(path: Path):
    raw = [json.loads(line) for line in path.read_text().splitlines() if line.strip()]
    names = sorted({name for item in raw for name in (item.get("landmarks_2d") or {})})
    if len(names) != 73:
        raise RuntimeError(f"Expected 73 landmarks, found {len(names)}")
    rows = []
    for item in raw:
        role = item.get("role")
        targets = []
        valid = role in {"train", "validation", "test"} and not item.get("error")
        for row in ROWS:
            source = (item.get("rows") or {}).get(row) or {}
            y = source.get("y_norm")
            valid = valid and source.get("accepted") is True and y is not None
            targets.append(float(y or 0.0))
        if not valid:
            continue
        points = item.get("landmarks_2d") or {}
        values = []
        masks = []
        for name in names:
            point = points.get(name) or {}
            x, y = point.get("x"), point.get("y")
            present = x is not None and y is not None
            values.extend((float(x) if present else np.nan, float(y) if present else np.nan))
            masks.append(float(present))
        height = float(item["height_cm"])
        weight = float(item["weight_kg"])
        bmi = float(item["bmi"])
        female = float(str(item["gender"]).lower() == "female")
        rows.append({
            "scan": item["scan_id"],
            "role": role,
            "profile": np.asarray((height, weight, bmi, female), dtype=np.float32),
            "landmarks": np.asarray(values + masks, dtype=np.float32),
            "target": np.asarray(targets, dtype=np.float32),
        })
    return rows


def metric(prediction: np.ndarray, truth: np.ndarray):
    error = np.abs(prediction - truth) * (HEIGHT - 1)
    return {
        row: {
            "maePx": round(float(error[:, index].mean()), 6),
            "p95Px": round(float(np.quantile(error[:, index], 0.95)), 6),
            "within1PxPct": round(float(np.mean(error[:, index] <= 1.0) * 100.0), 4),
        }
        for index, row in enumerate(ROWS)
    }


def matrix(records, key):
    return np.stack([record[key] for record in records]).astype(np.float32)


def main() -> None:
    args = parse_args()
    records = read_manifest(args.manifest)
    by_role = {role: [item for item in records if item["role"] == role] for role in ("train", "validation", "test")}
    y_train = matrix(by_role["train"], "target")
    result = {"counts": {role: len(items) for role, items in by_role.items()}, "models": {}}
    candidates = {
        "profile-only-extra": ("profile", ExtraTreesRegressor(
            n_estimators=args.trees, min_samples_leaf=2, max_features=1.0,
            n_jobs=args.jobs, random_state=SEED,
        )),
        "exact-landmarks-extra": ("landmarks", ExtraTreesRegressor(
            n_estimators=args.trees, min_samples_leaf=2, max_features=0.8,
            n_jobs=args.jobs, random_state=SEED + 1,
        )),
        "exact-landmarks-random-forest": ("landmarks", RandomForestRegressor(
            n_estimators=args.trees, min_samples_leaf=2, max_features=0.8,
            n_jobs=args.jobs, random_state=SEED + 2,
        )),
    }
    for name, (key, estimator) in candidates.items():
        model = make_pipeline(SimpleImputer(strategy="median", add_indicator=True), estimator)
        x_train = np.concatenate((matrix(by_role["train"], key), matrix(by_role["train"], "profile")), 1)
        model.fit(x_train, y_train)
        split_metrics = {}
        for role in ("train", "validation", "test"):
            x = np.concatenate((matrix(by_role[role], key), matrix(by_role[role], "profile")), 1)
            split_metrics[role] = metric(model.predict(x), matrix(by_role[role], "target"))
        result["models"][name] = split_metrics
        print(json.dumps({"model": name, **split_metrics["validation"]}), flush=True)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2) + "\n")


if __name__ == "__main__":
    main()
