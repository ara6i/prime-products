#!/usr/bin/env python3
"""Measure the waist/hip accuracy ceiling without opening the 448 test cohort.

This audit fits small CPU regressors on canonical training subjects and scores
only the canonical validation subjects. It deliberately excludes waist/hip
depth and tape from all input feature sets. Exact waist/hip A-to-B widths are
included only in the feature sets whose names contain ``exact_ab``.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image
from sklearn.ensemble import ExtraTreesRegressor, RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.pipeline import make_pipeline


ROWS = ("waist", "hips")
EXPECTED_TRAIN_SUBJECTS = 3_451
EXPECTED_VALIDATION_SUBJECTS = 427
PCA_COMPONENTS = 8


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--index", type=Path, required=True)
    parser.add_argument("--masks-dir", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--trees", type=int, default=500)
    return parser.parse_args()


def summarize(errors: np.ndarray) -> dict[str, float | int]:
    finite = np.asarray(errors, dtype=np.float64)
    finite = finite[np.isfinite(finite)]
    return {
        "count": int(len(finite)),
        "mae": float(np.mean(finite)),
        "median": float(np.quantile(finite, 0.50)),
        "p90": float(np.quantile(finite, 0.90)),
        "p95": float(np.quantile(finite, 0.95)),
        "maximum": float(np.max(finite)),
    }


def target_columns(schema: np.ndarray, names: list[str]) -> np.ndarray:
    index = {str(name): position for position, name in enumerate(schema)}
    missing = [name for name in names if name not in index]
    if missing:
        raise RuntimeError(f"Missing required teacher columns: {missing}")
    return np.asarray([index[name] for name in names], dtype=np.int64)


def deterministic_pca(values: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    mean = values.mean(axis=0, dtype=np.float64)
    _, _, basis = np.linalg.svd(values.astype(np.float64) - mean, full_matrices=False)
    basis = basis[:PCA_COMPONENTS]
    for component in basis:
        anchor = int(np.argmax(np.abs(component)))
        if component[anchor] < 0:
            component *= -1
    return mean.astype(np.float32), basis.astype(np.float32)


def normalize_shapes(values: np.ndarray) -> np.ndarray:
    shaped = values.reshape(-1, 32, 2)
    minimum = shaped.min(axis=1, keepdims=True)
    maximum = shaped.max(axis=1, keepdims=True)
    center = (minimum + maximum) * 0.5
    radius = np.maximum((maximum - minimum) * 0.5, 1e-4)
    return ((shaped - center) / radius).reshape(-1, 64)


def evaluate_shapes(
    model: Any,
    train_x: np.ndarray,
    validation_x: np.ndarray,
    packed: Any,
    train_rows: np.ndarray,
    validation_rows: np.ndarray,
    schema: np.ndarray,
) -> dict[str, Any]:
    results: dict[str, Any] = {}
    for row in ROWS:
        names = [
            f"row.{row}.shape.{point:02d}.{axis}"
            for point in range(32)
            for axis in ("x", "depth")
        ]
        columns = target_columns(schema, names)
        valid_train = packed["masks"][train_rows][:, columns].all(axis=1)
        valid_validation = packed["masks"][validation_rows][:, columns].all(axis=1)
        train_shapes = packed["targets"][train_rows[valid_train]][:, columns]
        mean, basis = deterministic_pca(train_shapes)
        train_coefficients = (train_shapes - mean) @ basis.T
        fitted = make_pipeline(SimpleImputer(strategy="median"), model())
        fitted.fit(train_x[valid_train], train_coefficients)
        predicted_coefficients = fitted.predict(validation_x[valid_validation])
        prediction = normalize_shapes(mean + predicted_coefficients @ basis)
        truth = packed["targets"][validation_rows[valid_validation]][:, columns]
        person_mae = np.abs(prediction - truth).mean(axis=1)
        centered_truth = truth - truth.mean(axis=0, keepdims=True)
        denominator = float((centered_truth * centered_truth).sum())
        residual = prediction - truth
        truth_variance = float(truth.var(axis=0).mean())
        prediction_variance = float(prediction.var(axis=0).mean())
        results[row] = {
            **summarize(person_mae),
            "rSquared": None if denominator <= 1e-12 else 1.0 - float((residual * residual).sum()) / denominator,
            "betweenPersonVarianceRatio": None if truth_variance <= 1e-12 else prediction_variance / truth_variance,
            "pcaComponents": PCA_COMPONENTS,
        }
    return results


def silhouette_features(mask_paths: list[Path]) -> np.ndarray:
    """Return fixed observed front-outline features, never 3D labels."""
    feature_rows: list[np.ndarray] = []
    resampling = getattr(Image, "Resampling", Image)
    sample_y = np.linspace(0, 127, 64).round().astype(np.int64)
    for path in mask_paths:
        with Image.open(path) as opened:
            if "A" in opened.getbands() and opened.getchannel("A").getextrema()[0] != opened.getchannel("A").getextrema()[1]:
                plane = opened.getchannel("A")
            else:
                plane = opened.convert("L")
            pixels = np.asarray(plane.resize((96, 128), resampling.BILINEAR), dtype=np.float32) / 255.0
        foreground = pixels >= 0.20
        left = np.zeros(128, dtype=np.float32)
        right = np.zeros(128, dtype=np.float32)
        span = np.zeros(128, dtype=np.float32)
        center = np.zeros(128, dtype=np.float32)
        for y in range(128):
            columns = np.flatnonzero(foreground[y])
            if not len(columns):
                continue
            left[y] = columns[0] / 95.0
            right[y] = columns[-1] / 95.0
            span[y] = (columns[-1] - columns[0]) / 95.0
            center[y] = (columns[-1] + columns[0]) / 190.0
        band_area = foreground.reshape(16, 8, 96).mean(axis=(1, 2), dtype=np.float64).astype(np.float32)
        total_area = np.asarray([foreground.mean(dtype=np.float64)], dtype=np.float32)
        feature_rows.append(
            np.concatenate((left[sample_y], right[sample_y], span[sample_y], center[sample_y], band_area, total_area))
        )
    return np.stack(feature_rows).astype(np.float32, copy=False)


def evaluate_model(
    model: Any,
    train_x: np.ndarray,
    validation_x: np.ndarray,
    targets: np.ndarray,
    target_masks: np.ndarray,
    train_rows: np.ndarray,
    validation_rows: np.ndarray,
    target_names: list[str],
) -> dict[str, Any]:
    # Each scalar gets its own validity mask so missing labels never become zero labels.
    predictions = np.full((len(validation_rows), len(target_names)), np.nan, dtype=np.float32)
    per_target: dict[str, Any] = {}
    for target_position, name in enumerate(target_names):
        valid_train = target_masks[train_rows, target_position]
        fitted = make_pipeline(SimpleImputer(strategy="median"), model())
        fitted.fit(train_x[valid_train], targets[train_rows[valid_train], target_position])
        predictions[:, target_position] = fitted.predict(validation_x)
        valid_validation = target_masks[validation_rows, target_position]
        errors = np.abs(
            predictions[valid_validation, target_position]
            - targets[validation_rows[valid_validation], target_position]
        )
        per_target[name] = summarize(errors)
    return {"targets": per_target}


def main() -> None:
    args = parse_args()
    packed = np.load(args.index, allow_pickle=False)
    canonical = packed["view_ids"] == "canonical"
    train_rows = np.flatnonzero(canonical & (packed["roles"] == 0))
    validation_rows = np.flatnonzero(canonical & (packed["roles"] == 1))
    if len(train_rows) != EXPECTED_TRAIN_SUBJECTS or len(validation_rows) != EXPECTED_VALIDATION_SUBJECTS:
        raise RuntimeError(
            f"Split changed: train={len(train_rows)} validation={len(validation_rows)}"
        )
    train_ids = set(packed["scan_ids"][train_rows].tolist())
    validation_ids = set(packed["scan_ids"][validation_rows].tolist())
    if train_ids & validation_ids:
        raise RuntimeError("Training and validation subjects overlap")

    selected_rows = np.concatenate((train_rows, validation_rows))
    sample_ids = packed["sample_ids"][selected_rows]
    paths = [args.masks_dir / f"{sample_id}.png" for sample_id in sample_ids]
    missing_paths = [str(path) for path in paths if not path.is_file()]
    if missing_paths:
        raise RuntimeError(f"Missing {len(missing_paths)} teacher masks, first={missing_paths[0]}")
    outlines = silhouette_features(paths)
    train_count = len(train_rows)
    outline_train = outlines[:train_count]
    outline_validation = outlines[train_count:]

    schema = packed["target_schema"]
    target_names = [
        "row.waist.depth_cm",
        "tape.waist.circumference_cm",
        "row.hips.depth_cm",
        "tape.hips.circumference_cm",
    ]
    target_indices = target_columns(schema, target_names)
    targets = packed["targets"][:, target_indices]
    target_masks = packed["masks"][:, target_indices]

    profile_train = packed["profiles"][train_rows]
    profile_validation = packed["profiles"][validation_rows]

    exact_ab_names = [
        "row.waist.y_norm",
        "row.waist.left_x_norm",
        "row.waist.right_x_norm",
        "row.waist.width_cm",
        "row.hips.y_norm",
        "row.hips.left_x_norm",
        "row.hips.right_x_norm",
        "row.hips.width_cm",
        "ratio.front.shoulder_waist",
        "ratio.front.shoulder_hips",
    ]
    exact_ab_indices = target_columns(schema, exact_ab_names)
    exact_ab_train = packed["targets"][train_rows][:, exact_ab_indices].copy()
    exact_ab_validation = packed["targets"][validation_rows][:, exact_ab_indices].copy()
    exact_ab_train[~packed["masks"][train_rows][:, exact_ab_indices]] = np.nan
    exact_ab_validation[~packed["masks"][validation_rows][:, exact_ab_indices]] = np.nan

    upper_body_names = [
        *(f"row.{row}.{field}" for row in ("neck", "chest", "underbust") for field in ("y_norm", "left_x_norm", "right_x_norm", "width_cm")),
        "ratio.front.neck_shoulder",
        "tape.neck.circumference_cm",
        "tape.chest.circumference_cm",
        "tape.underbust.circumference_cm",
    ]
    upper_body_indices = target_columns(schema, upper_body_names)
    upper_body_train = packed["targets"][train_rows][:, upper_body_indices].copy()
    upper_body_validation = packed["targets"][validation_rows][:, upper_body_indices].copy()
    upper_body_train[~packed["masks"][train_rows][:, upper_body_indices]] = np.nan
    upper_body_validation[~packed["masks"][validation_rows][:, upper_body_indices]] = np.nan

    oracle_geometry_names = [
        name
        for row in ROWS
        for name in (
            f"row.{row}.width_cm",
            f"row.{row}.depth_cm",
            *(f"row.{row}.shape.{point:02d}.{axis}" for point in range(32) for axis in ("x", "depth")),
        )
    ]
    oracle_geometry_indices = target_columns(schema, oracle_geometry_names)
    oracle_geometry_train = packed["targets"][train_rows][:, oracle_geometry_indices].copy()
    oracle_geometry_validation = packed["targets"][validation_rows][:, oracle_geometry_indices].copy()
    oracle_geometry_train[~packed["masks"][train_rows][:, oracle_geometry_indices]] = np.nan
    oracle_geometry_validation[~packed["masks"][validation_rows][:, oracle_geometry_indices]] = np.nan

    feature_sets = {
        "profile_only": (profile_train, profile_validation),
        "front_photo_outline": (
            np.concatenate((profile_train, outline_train), axis=1),
            np.concatenate((profile_validation, outline_validation), axis=1),
        ),
        "exact_ab_numbers": (
            np.concatenate((profile_train, exact_ab_train), axis=1),
            np.concatenate((profile_validation, exact_ab_validation), axis=1),
        ),
        "front_photo_plus_exact_ab": (
            np.concatenate((profile_train, outline_train, exact_ab_train), axis=1),
            np.concatenate((profile_validation, outline_validation, exact_ab_validation), axis=1),
        ),
        "full_observable_numbers": (
            np.concatenate((profile_train, outline_train, exact_ab_train, upper_body_train), axis=1),
            np.concatenate((profile_validation, outline_validation, exact_ab_validation, upper_body_validation), axis=1),
        ),
    }

    def extra_trees() -> ExtraTreesRegressor:
        return ExtraTreesRegressor(
            n_estimators=args.trees,
            min_samples_leaf=3,
            max_features=0.75,
            n_jobs=-1,
            random_state=20260825,
        )

    def random_forest() -> RandomForestRegressor:
        return RandomForestRegressor(
            n_estimators=max(250, args.trees // 2),
            min_samples_leaf=3,
            max_features=0.75,
            n_jobs=-1,
            random_state=20260825,
        )

    results: dict[str, Any] = {}
    for feature_name, (train_x, validation_x) in feature_sets.items():
        algorithms = {"extra_trees": extra_trees}
        if feature_name in {"exact_ab_numbers", "front_photo_plus_exact_ab", "full_observable_numbers"}:
            algorithms["random_forest"] = random_forest
        results[feature_name] = {
            algorithm_name: evaluate_model(
                constructor,
                train_x,
                validation_x,
                targets,
                target_masks,
                train_rows,
                validation_rows,
                target_names,
            )
            for algorithm_name, constructor in algorithms.items()
        }
        if feature_name in {"front_photo_plus_exact_ab", "full_observable_numbers"}:
            results[feature_name]["extra_trees"]["shapes"] = evaluate_shapes(
                extra_trees,
                train_x,
                validation_x,
                packed,
                train_rows,
                validation_rows,
                schema,
            )

    # This is a diagnostic lower-bound study, not a deployable input contract:
    # it gives the tape head the true 3D teacher geometry but never the tape.
    oracle_train_x = np.concatenate(
        (feature_sets["full_observable_numbers"][0], oracle_geometry_train), axis=1
    )
    oracle_validation_x = np.concatenate(
        (feature_sets["full_observable_numbers"][1], oracle_geometry_validation), axis=1
    )
    diagnostic_oracle: dict[str, Any] = {}
    oracle_geometry_valid_train = packed["masks"][train_rows][:, oracle_geometry_indices].all(axis=1)
    oracle_geometry_valid_validation = packed["masks"][validation_rows][:, oracle_geometry_indices].all(axis=1)
    for target_position in (1, 3):
        name = target_names[target_position]
        valid_train = target_masks[train_rows, target_position] & oracle_geometry_valid_train
        fitted = make_pipeline(SimpleImputer(strategy="median"), extra_trees())
        fitted.fit(
            oracle_train_x[valid_train],
            targets[train_rows[valid_train], target_position],
        )
        valid_validation = target_masks[validation_rows, target_position] & oracle_geometry_valid_validation
        prediction = fitted.predict(oracle_validation_x[valid_validation])
        truth = targets[validation_rows[valid_validation], target_position]
        diagnostic_oracle[name] = summarize(np.abs(prediction - truth))

    payload = {
        "contract": {
            "test448Opened": False,
            "trainingSubjects": len(train_rows),
            "validationSubjects": len(validation_rows),
            "canonicalViewsOnly": True,
            "waistHipDepthOrTapeUsedAsInput": False,
            "diagnosticOracleUsesTrue3dGeometry": True,
            "exactAbDefinition": "teacher waist/hip row position, front endpoints, widths, and front shoulder ratios",
        },
        "featureNames": {
            "profile": ["normalized_height", "normalized_weight", "normalized_bmi", "female", "male"],
            "exactAb": exact_ab_names,
            "upperBody": upper_body_names,
            "outline": "front silhouette left/right/span/center at 64 heights plus 16 band areas",
        },
        "results": results,
        "diagnosticTrue3dGeometryToTapeOracle": diagnostic_oracle,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    temporary = args.output.with_suffix(args.output.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n")
    temporary.replace(args.output)
    print(json.dumps(payload, indent=2, sort_keys=True))


if __name__ == "__main__":
    main()
