#!/usr/bin/env python3
"""Train robust scalar students for depth and independent recorded tape."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
from typing import Any, Callable

import joblib
import numpy as np
import onnxruntime as ort
from sklearn.ensemble import ExtraTreesRegressor, HistGradientBoostingRegressor, RandomForestRegressor, VotingRegressor
from skl2onnx import convert_sklearn
from skl2onnx.common.data_types import FloatTensorType
import torch

from observable_student import FEATURE_FIELDS, ROWS
from train_observable_student_v3 import (
    EXPECTED_TRAIN_SUBJECTS,
    EXPECTED_VALIDATION_SUBJECTS,
    feature_arrays,
    geometry_quality,
    sha256,
    summarize,
    write_json,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--index", type=Path, required=True)
    parser.add_argument("--masks-dir", type=Path, required=True)
    parser.add_argument("--teacher-audit", type=Path, required=True)
    parser.add_argument("--v3-checkpoint", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--workers", type=int, default=min(16, os.cpu_count() or 8))
    parser.add_argument("--trees", type=int, default=500)
    return parser.parse_args()


def model_factories(trees: int) -> dict[str, Callable[[], Any]]:
    factories: dict[str, Callable[[], Any]] = {}
    for leaf in (2, 3, 5, 8):
        for features in (0.45, 0.70, 1.0):
            name = f"extra_leaf{leaf}_features{features:.2f}"
            factories[name] = lambda leaf=leaf, features=features: ExtraTreesRegressor(
                n_estimators=trees,
                min_samples_leaf=leaf,
                max_features=features,
                n_jobs=-1,
                random_state=20260825,
            )
    for loss in ("squared_error", "absolute_error"):
        for leaves in (15, 31):
            name = f"hist_{loss}_leaves{leaves}"
            factories[name] = lambda loss=loss, leaves=leaves: HistGradientBoostingRegressor(
                loss=loss,
                learning_rate=0.055,
                max_iter=350,
                max_leaf_nodes=leaves,
                min_samples_leaf=18,
                l2_regularization=1.0,
                early_stopping=True,
                random_state=20260825,
            )
    factories["random_forest"] = lambda: RandomForestRegressor(
        n_estimators=max(300, trees // 2),
        min_samples_leaf=3,
        max_features=0.70,
        n_jobs=-1,
        random_state=20260825,
    )
    return factories


def metric(prediction: np.ndarray, truth: np.ndarray) -> dict[str, Any]:
    return summarize(np.abs(np.asarray(prediction) - np.asarray(truth)))


def export_and_check(model: Any, path: Path, example: np.ndarray) -> dict[str, Any]:
    # sklearn 1.9 exposes HGB's missing direction as np.bool_; skl2onnx 1.20
    # forwards it unchanged, while ONNX correctly requires an integer list.
    # Keep this compatibility shim local to export instead of altering either
    # installed dependency.
    import skl2onnx.common.tree_ensemble as tree_ensemble

    if not getattr(tree_ensemble, "_wear_bool_compat", False):
        original_add_node = tree_ensemble.add_node

        def compatible_add_node(*node_args: Any, **node_kwargs: Any) -> Any:
            if "nodes_missing_value_tracks_true" in node_kwargs:
                node_kwargs["nodes_missing_value_tracks_true"] = int(
                    node_kwargs["nodes_missing_value_tracks_true"]
                )
            return original_add_node(*node_args, **node_kwargs)

        tree_ensemble.add_node = compatible_add_node
        tree_ensemble._wear_bool_compat = True
    converted = convert_sklearn(
        model,
        initial_types=[("prepared_observables", FloatTensorType([None, example.shape[1]]))],
        target_opset=17,
    )
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_bytes(converted.SerializeToString())
    temporary.replace(path)
    session = ort.InferenceSession(str(path), providers=["CPUExecutionProvider"])
    runtime = session.run(None, {session.get_inputs()[0].name: example.astype(np.float32)})[0].reshape(-1)
    reference = np.asarray(model.predict(example), dtype=np.float32).reshape(-1)
    maximum_error = float(np.max(np.abs(runtime - reference)))
    if maximum_error > 1e-3:
        raise RuntimeError(f"ONNX parity failed for {path.name}: {maximum_error}")
    return {"sha256": sha256(path), "bytes": path.stat().st_size, "maximumParityError": maximum_error}


def main() -> None:
    args = parse_args()
    args.output_dir.mkdir(parents=True, exist_ok=True)
    packed = np.load(args.index, allow_pickle=False)
    source_schema = packed["target_schema"].tolist()
    source_index = {name: position for position, name in enumerate(source_schema)}
    canonical = packed["view_ids"] == "canonical"
    train_rows = np.flatnonzero((packed["roles"] == 0) & canonical)
    validation_rows = np.flatnonzero((packed["roles"] == 1) & canonical)
    if len(train_rows) != EXPECTED_TRAIN_SUBJECTS or len(validation_rows) != EXPECTED_VALIDATION_SUBJECTS:
        raise RuntimeError("Canonical split changed")
    if set(packed["scan_ids"][train_rows]) & set(packed["scan_ids"][validation_rows]):
        raise RuntimeError("Subject leakage")

    audit = json.loads(args.teacher_audit.read_text())
    failures = audit["failuresByPerson"]
    selected_rows = np.concatenate((train_rows, validation_rows))
    selected_quality = {
        row: geometry_quality(packed["scan_ids"][selected_rows], failures, row)
        for row in ("neck", "chest", "underbust", "waist", "hips")
    }
    observable_quality = {
        row: np.ones(len(selected_rows), dtype=np.bool_)
        for row in ("neck", "chest", "underbust", "waist", "hips")
    }
    raw, validity = feature_arrays(
        packed,
        selected_rows,
        args.masks_dir,
        source_index,
        observable_quality,
        args.workers,
    )
    checkpoint = torch.load(args.v3_checkpoint, map_location="cpu", weights_only=False)
    if checkpoint["featureFields"] != list(FEATURE_FIELDS) or checkpoint.get("test448Opened") is not False:
        raise RuntimeError("V3 feature/checkpoint contract changed")
    train_validity = validity[:len(train_rows)]
    counts = train_validity.sum(axis=0, dtype=np.int64)
    sums = (raw[:len(train_rows)] * train_validity).sum(axis=0, dtype=np.float64)
    means = np.divide(sums, counts, out=np.zeros_like(sums), where=counts > 0).astype(np.float32)
    centered = np.where(train_validity, raw[:len(train_rows)] - means, 0.0)
    variances = np.divide(
        (centered * centered).sum(axis=0, dtype=np.float64),
        counts,
        out=np.ones_like(sums),
        where=counts > 0,
    )
    stds = np.sqrt(np.maximum(variances, 1e-8)).astype(np.float32)
    imputed = np.where(validity, raw, means)
    prepared = np.concatenate(((imputed - means) / stds, validity.astype(np.float32)), axis=1).astype(np.float32)
    train_x = prepared[:len(train_rows)]
    validation_x = prepared[len(train_rows):]

    factories = model_factories(args.trees)
    results: dict[str, Any] = {}
    artifacts: dict[str, Any] = {}
    for row in ROWS:
        for kind, source_name in (
            ("depth", f"row.{row}.depth_cm"),
            ("tape", f"tape.{row}.circumference_cm"),
        ):
            key = f"{row}_{kind}"
            source = source_index[source_name]
            train_valid = packed["masks"][train_rows, source].copy()
            validation_valid = packed["masks"][validation_rows, source].copy()
            if kind == "depth":
                train_valid &= selected_quality[row][:len(train_rows)]
                validation_valid &= selected_quality[row][len(train_rows):]
            train_y = packed["targets"][train_rows[train_valid], source]
            validation_y = packed["targets"][validation_rows[validation_valid], source]
            candidates: list[tuple[float, str, Any, np.ndarray, dict[str, Any]]] = []
            for name, factory in factories.items():
                model = factory()
                model.fit(train_x[train_valid], train_y)
                prediction = model.predict(validation_x[validation_valid])
                metrics = metric(prediction, validation_y)
                score = float(metrics["mae"] + 0.20 * metrics["p95"])
                candidates.append((score, name, model, prediction, metrics))
            candidates.sort(key=lambda item: item[0])

            # A validation-selected two-model blend often lowers both mean and
            # tail error; refit as a VotingRegressor so it remains exportable.
            blend_candidates: list[tuple[float, float, int, dict[str, Any]]] = []
            first = candidates[0]
            for other_index in range(1, min(6, len(candidates))):
                other = candidates[other_index]
                for first_weight in (0.5, 0.65, 0.8):
                    blended = first_weight * first[3] + (1.0 - first_weight) * other[3]
                    blended_metrics = metric(blended, validation_y)
                    score = float(blended_metrics["mae"] + 0.20 * blended_metrics["p95"])
                    blend_candidates.append((score, first_weight, other_index, blended_metrics))
            blend_candidates.sort(key=lambda item: item[0])
            best_score, best_name, best_model, _, best_metrics = first
            chosen_description: dict[str, Any] = {"type": "single", "candidate": best_name}
            if blend_candidates and blend_candidates[0][0] < best_score:
                blend_score, first_weight, other_index, blend_metrics = blend_candidates[0]
                other = candidates[other_index]
                best_model = VotingRegressor(
                    estimators=[("primary", factories[best_name]()), ("secondary", factories[other[1]]())],
                    weights=np.asarray([first_weight, 1.0 - first_weight], dtype=np.float64),
                    n_jobs=-1,
                )
                best_model.fit(train_x[train_valid], train_y)
                best_metrics = metric(best_model.predict(validation_x[validation_valid]), validation_y)
                chosen_description = {
                    "type": "blend",
                    "primary": best_name,
                    "secondary": other[1],
                    "primaryWeight": first_weight,
                    "selectionScore": blend_score,
                }

            joblib_path = args.output_dir / f"{key}.joblib"
            onnx_path = args.output_dir / f"{key}.onnx"
            joblib.dump(best_model, joblib_path, compress=3)
            onnx_evidence = export_and_check(best_model, onnx_path, validation_x[:8])
            results[key] = {
                "target": source_name,
                "trainingCount": int(train_valid.sum()),
                "validationCount": int(validation_valid.sum()),
                "chosen": chosen_description,
                "metrics": best_metrics,
                "topCandidates": [
                    {"name": name, "score": score, "metrics": metrics}
                    for score, name, _, _, metrics in candidates[:5]
                ],
            }
            artifacts[key] = {
                "joblib": str(joblib_path.resolve()),
                "joblibSha256": sha256(joblib_path),
                "onnx": str(onnx_path.resolve()),
                **onnx_evidence,
            }
            print(json.dumps({"student": key, "metrics": best_metrics, "chosen": chosen_description}), flush=True)

    result = {
        "schemaVersion": "wear3d-waist-hips-v3-scalar-calibrators/v1",
        "state": "complete",
        "test448Opened": False,
        "trainingSubjects": len(train_rows),
        "validationSubjects": len(validation_rows),
        "preparedFeatureCount": prepared.shape[1],
        "preprocessor": {
            "featureFields": list(FEATURE_FIELDS),
            "featureMeans": means.tolist(),
            "featureStds": stds.tolist(),
            "preparedOrder": "standardized_imputed_values_then_validity",
        },
        "selectionMetric": "MAE + 0.20 * P95 absolute error",
        "models": results,
        "artifacts": artifacts,
        "sourceHashes": {
            "trainingIndex": sha256(args.index),
            "teacherAudit": sha256(args.teacher_audit),
            "v3Checkpoint": sha256(args.v3_checkpoint),
        },
    }
    write_json(args.output_dir / "result.json", result)
    print(json.dumps(result, indent=2, sort_keys=True), flush=True)


if __name__ == "__main__":
    main()
