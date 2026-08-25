#!/usr/bin/env python3
"""Train the CPU-only structured WEAR waist/hip v9 candidate.

This candidate fixes the failure that made previous ONNX rows look visibly
wrong.  The network no longer learns a vague combined target.  It learns only
the two anatomical row positions first.  At inference the left and right A-B
endpoints are then intersected with the projected Blender mesh silhouette, so
an accepted line cannot extend beyond the visible body.

Depth and the closed 32-point PLY cross-section remain separate predictions.
Recorded tape and walked PLY circumference are never read by this trainer.
The 448 test people are read only after model selection and are never fitted.
"""

from __future__ import annotations

import argparse
from dataclasses import asdict, dataclass
import json
import math
import os
from pathlib import Path
import random
from typing import Any

import joblib
import numpy as np
from PIL import Image
from sklearn.ensemble import ExtraTreesRegressor

import train_wear_waist_hips_geometry_v4 as legacy


ROWS = legacy.ROWS
HEIGHT = legacy.HEIGHT
WIDTH = legacy.WIDTH
POINTS = legacy.POINTS
PCA_COMPONENTS = legacy.PCA_COMPONENTS
SEED = 20260824
PROFILE_SAMPLES = 128
BLOCK_HEIGHT = 32
BLOCK_WIDTH = 24


@dataclass(frozen=True)
class RowCandidate:
    name: str
    min_samples_leaf: int
    max_features: float


ROW_CANDIDATES = (
    RowCandidate("extra-leaf-1-all", 1, 1.0),
    RowCandidate("extra-leaf-2-all", 2, 1.0),
    RowCandidate("extra-leaf-2-70pct", 2, 0.7),
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path)
    parser.add_argument("--output-dir", type=Path)
    parser.add_argument("--jobs", type=int, default=max(1, os.cpu_count() or 4))
    parser.add_argument("--row-trees", type=int, default=512)
    parser.add_argument("--geometry-trees", type=int, default=640)
    parser.add_argument("--train-limit", type=int, default=0)
    parser.add_argument("--validation-limit", type=int, default=0)
    parser.add_argument("--test-limit", type=int, default=0)
    parser.add_argument("--include-test", action="store_true")
    parser.add_argument("--startup-smoke", action="store_true")
    return parser.parse_args()


def resample_1d(values: np.ndarray, count: int = PROFILE_SAMPLES) -> np.ndarray:
    source = np.asarray(values, dtype=np.float32).reshape(-1)
    if len(source) == count:
        return source
    old = np.linspace(0.0, 1.0, len(source), dtype=np.float32)
    new = np.linspace(0.0, 1.0, count, dtype=np.float32)
    return np.interp(new, old, source).astype(np.float32)


def resize_plane(values: np.ndarray) -> np.ndarray:
    plane = np.clip(np.asarray(values) * 255.0, 0, 255).astype(np.uint8)
    resampling = getattr(Image, "Resampling", Image)
    image = Image.fromarray(plane, mode="L").resize((BLOCK_WIDTH, BLOCK_HEIGHT), resampling.BILINEAR)
    return np.asarray(image, dtype=np.float32).reshape(-1) / 255.0


def record_features(channels: np.ndarray, run_profiles: np.ndarray, profile: np.ndarray) -> np.ndarray:
    left = run_profiles[:, 0]
    right = run_profiles[:, 1]
    span = right - left
    center = (right + left) * 0.5
    span_delta = np.gradient(span)
    center_delta = np.gradient(center)
    silhouette, boundary, mesh_lines = channels[:3]
    row_area = silhouette.mean(1)
    row_boundary = boundary.mean(1)
    row_mesh = mesh_lines.mean(1)
    column_area = silhouette.mean(0)
    column_boundary = boundary.mean(0)
    column_mesh = mesh_lines.mean(0)
    body_rows, body_columns = np.where(silhouette > 0.5)
    if body_rows.size:
        bounds = np.asarray(
            (
                body_columns.min() / max(WIDTH - 1, 1),
                body_columns.max() / max(WIDTH - 1, 1),
                body_rows.min() / max(HEIGHT - 1, 1),
                body_rows.max() / max(HEIGHT - 1, 1),
                float(silhouette.mean()),
            ),
            dtype=np.float32,
        )
    else:
        bounds = np.zeros(5, dtype=np.float32)
    vertical = np.concatenate(
        [resample_1d(value) for value in (
            left, right, span, center, span_delta, center_delta, row_area, row_boundary, row_mesh
        )]
    )
    horizontal = np.concatenate(
        [resample_1d(value, 96) for value in (column_area, column_boundary, column_mesh)]
    )
    blocks = np.concatenate([resize_plane(value) for value in (silhouette, boundary, mesh_lines)])
    return np.concatenate((profile.astype(np.float32), bounds, vertical, horizontal, blocks)).astype(np.float32)


def limit_records(records: list[legacy.Record], role: str, limit: int) -> list[legacy.Record]:
    selected = [record for record in records if record.role == role and np.all(record.row_mask > 0.5)]
    return selected if limit <= 0 else selected[:limit]


def build_cached(records: list[legacy.Record]) -> dict[str, tuple[np.ndarray, np.ndarray]]:
    return {record.scan_id: legacy.load_inputs(record.mesh_path, record.mask_path) for record in records}


def build_features(
    records: list[legacy.Record],
    cached: dict[str, tuple[np.ndarray, np.ndarray]],
) -> np.ndarray:
    return np.stack(
        [record_features(*cached[record.scan_id], record.profile) for record in records]
    ).astype(np.float32)


def row_targets(records: list[legacy.Record]) -> np.ndarray:
    rows = np.stack([record.edges[:, 0] for record in records]).astype(np.float32)
    return np.stack((rows[:, 0], rows[:, 1] - rows[:, 0]), 1)


def decode_rows(values: np.ndarray) -> np.ndarray:
    waist = np.clip(values[:, 0], 0.28, 0.58)
    delta = np.clip(values[:, 1], 0.02, 0.30)
    hips = np.clip(waist + delta, 0.35, 0.70)
    return np.stack((waist, hips), 1).astype(np.float32)


def row_metrics(records: list[legacy.Record], rows: np.ndarray) -> dict[str, Any]:
    truth = np.stack([record.edges[:, 0] for record in records])
    error = np.abs(rows - truth) * (HEIGHT - 1)
    return {
        row: legacy.metric(error[:, index].tolist(), 1.0)
        for index, row in enumerate(ROWS)
    }


def row_score(metrics: dict[str, Any]) -> float:
    return sum(
        float(metrics[row]["mae"]) + 0.1 * float(metrics[row]["p95"])
        for row in ROWS
    )


def shape_basis(records: list[legacy.Record]) -> tuple[np.ndarray, np.ndarray]:
    return legacy.shape_basis(records)


def geometry_targets(
    records: list[legacy.Record],
    cached: dict[str, tuple[np.ndarray, np.ndarray]],
    shape_mean: np.ndarray,
    shape_components: np.ndarray,
    row_index: int,
) -> np.ndarray:
    targets = []
    for record in records:
        _, runs = cached[record.scan_id]
        y = int(np.clip(round(record.edges[row_index, 0] * (HEIGHT - 1)), 0, HEIGHT - 1))
        span = max(float(runs[y, 1] - runs[y, 0]), 1e-5)
        scale = float(record.geometry[row_index, 0]) / span
        depth = float(record.geometry[row_index, 1])
        centered = record.geometry[row_index, 2:] - shape_mean[row_index]
        coefficients = shape_components[row_index] @ centered
        targets.append(np.concatenate(([scale, depth], coefficients)))
    return np.asarray(targets, dtype=np.float32)


def normalized_targets(values: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    mean = values.mean(0).astype(np.float32)
    std = np.maximum(values.std(0), 1e-5).astype(np.float32)
    return ((values - mean) / std).astype(np.float32), mean, std


def fit_extra_trees(
    features: np.ndarray,
    targets: np.ndarray,
    trees: int,
    jobs: int,
    min_samples_leaf: int,
    max_features: float,
    seed_offset: int,
) -> ExtraTreesRegressor:
    model = ExtraTreesRegressor(
        n_estimators=trees,
        min_samples_leaf=min_samples_leaf,
        max_features=max_features,
        n_jobs=jobs,
        random_state=SEED + seed_offset,
        bootstrap=False,
        criterion="squared_error",
    )
    model.fit(features, targets)
    return model


def run_values_at_rows(run_profiles: np.ndarray, rows: np.ndarray) -> np.ndarray:
    output = np.zeros((len(rows), 2, 2), dtype=np.float32)
    for index in range(len(rows)):
        for row in range(2):
            y = int(np.clip(round(float(rows[index, row]) * (HEIGHT - 1)), 0, HEIGHT - 1))
            output[index, row] = run_profiles[index, y]
    return output


def make_predictions(
    records: list[legacy.Record],
    cached: dict[str, tuple[np.ndarray, np.ndarray]],
    features: np.ndarray,
    row_model: ExtraTreesRegressor,
    geometry_models: list[ExtraTreesRegressor],
    geometry_mean: np.ndarray,
    geometry_std: np.ndarray,
    shape_mean: np.ndarray,
    shape_components: np.ndarray,
) -> list[tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray]]:
    rows = decode_rows(np.asarray(row_model.predict(features), dtype=np.float32))
    runs = np.stack([cached[record.scan_id][1] for record in records])
    selected_runs = run_values_at_rows(runs, rows)
    spans = selected_runs[..., 1] - selected_runs[..., 0]
    raw_geometry = []
    geometry_features = np.concatenate((features, rows), 1)
    for row, model in enumerate(geometry_models):
        normalized = np.asarray(model.predict(geometry_features), dtype=np.float32)
        raw_geometry.append(normalized * geometry_std[row] + geometry_mean[row])
    raw = np.stack(raw_geometry, 1)
    breadth = spans * np.maximum(raw[..., 0], 1.0)
    depth = np.maximum(raw[..., 1], 1.0)
    coefficients = raw[..., 2:]
    shape = shape_mean[None] + np.einsum("brk,rkd->brd", coefficients, shape_components)
    shape = shape.reshape(-1, 2, POINTS, 2).astype(np.float32)
    edges = np.concatenate((rows[..., None], selected_runs), -1)
    ratio = depth / np.maximum(breadth, 1e-4)
    return [
        (edges[index], breadth[index], depth[index], ratio[index], shape[index])
        for index in range(len(records))
    ]


def export_onnx(model: ExtraTreesRegressor, feature_count: int, output: Path) -> bool:
    try:
        from skl2onnx import convert_sklearn
        from skl2onnx.common.data_types import FloatTensorType
        import onnx
    except ImportError:
        return False
    converted = convert_sklearn(
        model,
        initial_types=[("features", FloatTensorType([None, feature_count]))],
        target_opset=18,
    )
    output.write_bytes(converted.SerializeToString())
    onnx.checker.check_model(onnx.load(str(output)))
    return True


def metrics_for(
    records: list[legacy.Record],
    predictions: list[tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, np.ndarray]],
) -> dict[str, Any]:
    result = legacy.report(records, predictions)
    result["endpointGuarantee"] = "row is learned; left/right always intersect the projected Blender mesh silhouette"
    result["recordedTapeUsed"] = False
    result["walkedPlyCircumferenceUsed"] = False
    return result


def smoke() -> None:
    channels = np.zeros((5, HEIGHT, WIDTH), dtype=np.float32)
    channels[0, 30:230, 70:122] = 1.0
    runs = legacy.central_run_profiles(channels[0])
    feature = record_features(channels, runs, np.asarray((170.0, 70.0, 24.2, 1.0), dtype=np.float32))
    expected = 4 + 5 + 9 * PROFILE_SAMPLES + 3 * 96 + 3 * BLOCK_HEIGHT * BLOCK_WIDTH
    if feature.shape != (expected,) or not np.isfinite(feature).all():
        raise RuntimeError(f"Unexpected feature contract: {feature.shape}, expected {expected}")
    print(json.dumps({"startupSmoke": "passed", "featureCount": int(len(feature)), "rows": ROWS}))


def main() -> None:
    args = parse_args()
    if args.startup_smoke:
        smoke()
        return
    if args.manifest is None or args.output_dir is None:
        raise RuntimeError("--manifest and --output-dir are required")
    random.seed(SEED)
    np.random.seed(SEED)
    roles = ("train", "validation", "test") if args.include_test else ("train", "validation")
    records = legacy.read_records(args.manifest, roles)
    by_role = {
        "train": limit_records(records, "train", args.train_limit),
        "validation": limit_records(records, "validation", args.validation_limit),
        "test": limit_records(records, "test", args.test_limit) if args.include_test else [],
    }
    if not by_role["train"] or not by_role["validation"]:
        raise RuntimeError("Train and validation data are required")
    all_records = by_role["train"] + by_role["validation"] + by_role["test"]
    cached = build_cached(all_records)
    features = {role: build_features(values, cached) for role, values in by_role.items() if values}

    row_history = []
    best_row_model = None
    best_row_candidate = None
    best_row_score = float("inf")
    train_row_targets = row_targets(by_role["train"])
    for index, candidate in enumerate(ROW_CANDIDATES):
        model = fit_extra_trees(
            features["train"], train_row_targets, args.row_trees, args.jobs,
            candidate.min_samples_leaf, candidate.max_features, index,
        )
        validation_rows = decode_rows(np.asarray(model.predict(features["validation"]), dtype=np.float32))
        candidate_metrics = row_metrics(by_role["validation"], validation_rows)
        score = row_score(candidate_metrics)
        item = {"candidate": asdict(candidate), "score": round(score, 6), "rows": candidate_metrics}
        row_history.append(item)
        print(json.dumps({"stage": "row-candidate", **item}), flush=True)
        if score < best_row_score:
            best_row_model = model
            best_row_candidate = candidate
            best_row_score = score
    if best_row_model is None or best_row_candidate is None:
        raise RuntimeError("No row model trained")

    train_rows = decode_rows(np.asarray(best_row_model.predict(features["train"]), dtype=np.float32))
    shape_mean, shape_components = shape_basis(by_role["train"])
    geometry_models = []
    geometry_mean = []
    geometry_std = []
    train_geometry_features = np.concatenate((features["train"], train_rows), 1)
    for row in range(2):
        raw_target = geometry_targets(
            by_role["train"], cached, shape_mean, shape_components, row
        )
        normalized, mean, std = normalized_targets(raw_target)
        model = fit_extra_trees(
            train_geometry_features, normalized, args.geometry_trees, args.jobs,
            min_samples_leaf=2, max_features=0.8, seed_offset=10 + row,
        )
        geometry_models.append(model)
        geometry_mean.append(mean)
        geometry_std.append(std)
        print(json.dumps({"stage": "geometry", "row": ROWS[row], "trees": args.geometry_trees}), flush=True)
    geometry_mean_array = np.stack(geometry_mean).astype(np.float32)
    geometry_std_array = np.stack(geometry_std).astype(np.float32)

    args.output_dir.mkdir(parents=True, exist_ok=True)
    joblib.dump(best_row_model, args.output_dir / "row-model.joblib", compress=3)
    for row, model in enumerate(geometry_models):
        joblib.dump(model, args.output_dir / f"{ROWS[row]}-geometry-model.joblib", compress=3)

    validation_predictions = make_predictions(
        by_role["validation"], cached, features["validation"], best_row_model,
        geometry_models, geometry_mean_array, geometry_std_array, shape_mean, shape_components,
    )
    validation_metrics = metrics_for(by_role["validation"], validation_predictions)
    train_predictions = make_predictions(
        by_role["train"], cached, features["train"], best_row_model,
        geometry_models, geometry_mean_array, geometry_std_array, shape_mean, shape_components,
    )
    result: dict[str, Any] = {
        "schemaVersion": "wear-waist-hips-structured-cpu-v9/v1",
        "trainSubjects": len(by_role["train"]),
        "validationSubjects": len(by_role["validation"]),
        "testSubjects": len(by_role["test"]),
        "bestRowCandidate": asdict(best_row_candidate),
        "rowCandidateHistory": row_history,
        "validation": validation_metrics,
        "train": metrics_for(by_role["train"], train_predictions),
        "teacherInputs": "projected Blender PLY mesh plus height/weight/BMI/gender; no RGB",
        "leftRightPath": "deterministic central projected-mesh intersection at predicted row",
        "recordedTapeUsed": False,
        "walkedPlyCircumferenceUsed": False,
        "sealed448UsedForFittingOrSelection": False,
        "sealed448EvaluatedAfterSelection": bool(by_role["test"]),
    }
    legacy.contact_sheet(
        by_role["validation"], validation_predictions, args.output_dir / "validation-contact-sheet.jpg"
    )
    if by_role["test"]:
        test_predictions = make_predictions(
            by_role["test"], cached, features["test"], best_row_model,
            geometry_models, geometry_mean_array, geometry_std_array, shape_mean, shape_components,
        )
        result["test"] = metrics_for(by_role["test"], test_predictions)
        # The legacy report helper always emits false because it was written
        # for validation-only candidates.  This run opens test exactly once,
        # after row-model selection, so record that distinction honestly.
        result["test"]["sealed448Opened"] = True
        result["test"]["sealed448UsedForFittingOrSelection"] = False
        legacy.contact_sheet(
            by_role["test"], test_predictions, args.output_dir / "test-contact-sheet.jpg"
        )

    feature_count = int(features["train"].shape[1])
    geometry_feature_count = feature_count + 2
    exported = {
        "row": export_onnx(best_row_model, feature_count, args.output_dir / "waist-hips-row.onnx"),
        "waistGeometry": export_onnx(
            geometry_models[0], geometry_feature_count, args.output_dir / "waist-geometry.onnx"
        ),
        "hipsGeometry": export_onnx(
            geometry_models[1], geometry_feature_count, args.output_dir / "hips-geometry.onnx"
        ),
    }
    metadata = {
        "schemaVersion": result["schemaVersion"],
        "featureCount": feature_count,
        "geometryFeatureCount": geometry_feature_count,
        "geometryMean": geometry_mean_array.tolist(),
        "geometryStd": geometry_std_array.tolist(),
        "shapeMean": shape_mean.tolist(),
        "shapeComponents": shape_components.tolist(),
        "rowOutput": ["waist_y_normalized", "hips_minus_waist_y_normalized"],
        "onnxExported": exported,
        "recordedTapeUsed": False,
        "walkedPlyCircumferenceUsed": False,
    }
    result["onnxExported"] = exported
    (args.output_dir / "model-metadata.json").write_text(json.dumps(metadata, indent=2) + "\n")
    (args.output_dir / "training-history.json").write_text(json.dumps(row_history, indent=2) + "\n")
    (args.output_dir / "validation-metrics.json").write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, indent=2), flush=True)


if __name__ == "__main__":
    main()
