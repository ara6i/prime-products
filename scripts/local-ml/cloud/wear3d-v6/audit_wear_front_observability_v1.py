#!/usr/bin/env python3
"""Measure what a front-only WEAR observation can actually predict.

This is a pre-training architecture gate, not a release model.  It compares
three input contracts on train/validation subjects only:

1. runtime-safe outline: silhouette + boundary profiles + height/weight/BMI/sex
2. runtime-safe outline plus exact WEAR landmarks (an optimistic upper bound)
3. raw PLY raster plus the same information (the legacy, non-runtime-matched path)

Recorded tape and walked PLY circumference are forbidden.  Test subjects are
counted by role only and never converted to features or targets.
"""

from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
import json
import math
import os
from pathlib import Path
from typing import Any

import numpy as np
from PIL import Image
from sklearn.ensemble import ExtraTreesRegressor
from sklearn.metrics import mean_absolute_error


HEIGHT = 256
WIDTH = 192
ROWS = ("waist", "hips")
POINTS = 32
SEED = 20260824


@dataclass(frozen=True)
class Source:
    scan_id: str
    role: str
    mask_path: Path
    mesh_path: Path
    profile: np.ndarray
    landmarks: np.ndarray
    rows_px: np.ndarray
    geometry: np.ndarray
    shapes: np.ndarray


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--threads", type=int, default=max(1, os.cpu_count() or 1))
    parser.add_argument("--trees", type=int, default=384)
    parser.add_argument("--train-limit", type=int, default=0)
    parser.add_argument("--validation-limit", type=int, default=0)
    return parser.parse_args()


def finite(value: Any) -> float | None:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if math.isfinite(number) else None


def resolve_artifact(raw: str, manifest: Path) -> Path:
    path = Path(raw)
    rendered_candidate = None
    if "rendered" in path.parts:
        rendered_index = max(i for i, part in enumerate(path.parts) if part == "rendered")
        rendered_candidate = manifest.parent / "rendered" / Path(*path.parts[rendered_index + 1 :])
    for candidate in (path, Path.cwd() / path, rendered_candidate, manifest.parent / path.name):
        if candidate is not None and candidate.exists():
            return candidate.resolve()
    raise FileNotFoundError(raw)


def read_sources(manifest: Path) -> tuple[list[Source], dict[str, int]]:
    sources: list[Source] = []
    role_counts: dict[str, int] = {}
    landmark_order: tuple[str, ...] | None = None
    subject_roles: dict[str, str] = {}
    for raw_line in manifest.read_text(encoding="utf-8").splitlines():
        if not raw_line.strip():
            continue
        record = json.loads(raw_line)
        role = str(record.get("role") or "missing")
        role_counts[role] = role_counts.get(role, 0) + 1
        # The sealed test split is deliberately not materialized as a Source.
        if role not in {"train", "validation"}:
            continue
        if record.get("view_id") != "front-50" or record.get("error"):
            continue
        subject_id = str(record.get("subject_id") or record.get("scan_id") or "")
        previous = subject_roles.setdefault(subject_id, role)
        if previous != role:
            raise RuntimeError(f"Subject leakage: {subject_id} is both {previous} and {role}")
        height = finite(record.get("height_cm"))
        weight = finite(record.get("weight_kg"))
        bmi = finite(record.get("bmi"))
        gender = str(record.get("gender") or "").lower()
        if None in (height, weight, bmi) or gender not in {"female", "male"}:
            continue
        raw_landmarks = record.get("landmarks_2d") or {}
        names = tuple(sorted(raw_landmarks))
        if landmark_order is None:
            landmark_order = names
        if names != landmark_order or len(names) != 73:
            raise RuntimeError(f"{record.get('scan_id')} does not have canonical 73 landmarks")
        landmarks = np.zeros((73, 3), dtype=np.float32)
        for index, name in enumerate(names):
            point = raw_landmarks[name]
            x, y = finite(point.get("x")), finite(point.get("y"))
            if x is not None and y is not None:
                landmarks[index] = (x, y, 1.0)
        rows_px = np.zeros(2, dtype=np.float32)
        geometry = np.zeros((2, 2), dtype=np.float32)
        shapes = np.zeros((2, POINTS, 2), dtype=np.float32)
        valid = True
        for index, row_name in enumerate(ROWS):
            row = (record.get("rows") or {}).get(row_name) or {}
            contour = np.asarray(row.get("contour_points_normalized") or [], dtype=np.float32)
            values = (
                finite(row.get("y_norm")),
                finite(row.get("mesh_width_mm")),
                finite(row.get("mesh_depth_mm")),
            )
            if (
                not all(row.get(flag) is True for flag in ("accepted", "edge_target_valid", "depth_target_valid", "shape_target_valid"))
                or None in values
                or contour.shape != (POINTS, 2)
                or not np.isfinite(contour).all()
            ):
                valid = False
                break
            y_norm, width_mm, depth_mm = values
            rows_px[index] = float(y_norm) * (HEIGHT - 1)
            geometry[index] = (float(width_mm) / 10.0, float(depth_mm) / 10.0)
            shapes[index] = contour
        if not valid:
            continue
        sources.append(
            Source(
                scan_id=str(record.get("scan_id") or subject_id),
                role=role,
                mask_path=resolve_artifact(str(record.get("mask") or record.get("image")), manifest),
                mesh_path=resolve_artifact(str(record.get("mesh_image")), manifest),
                profile=np.asarray((height, weight, bmi, gender == "female"), dtype=np.float32),
                landmarks=landmarks,
                rows_px=rows_px,
                geometry=geometry,
                shapes=shapes,
            )
        )
    train_ids = {source.scan_id for source in sources if source.role == "train"}
    validation_ids = {source.scan_id for source in sources if source.role == "validation"}
    if train_ids & validation_ids:
        raise RuntimeError("Train/validation identity leakage")
    return sources, role_counts


def runs(binary_row: np.ndarray) -> list[tuple[int, int]]:
    padded = np.pad(binary_row.astype(np.int8), (1, 1))
    changes = np.diff(padded)
    return [
        (int(left), int(right - 1))
        for left, right in zip(np.flatnonzero(changes == 1), np.flatnonzero(changes == -1))
    ]


def central_profile(mask: np.ndarray) -> np.ndarray:
    center = (mask.shape[1] - 1) * 0.5
    result = np.zeros((mask.shape[0], 4), dtype=np.float32)
    previous = (center, center)
    for y, row in enumerate(mask):
        candidates = []
        for left, right in runs(row):
            length = right - left + 1
            if length < mask.shape[1] * 0.025:
                continue
            contains = left <= center <= right
            distance = 0.0 if contains else min(abs(center - left), abs(center - right))
            candidates.append(((0.0 if contains else 1000.0) + distance - length * 0.01, left, right))
        if candidates:
            _, left, right = min(candidates)
            previous = (left, right)
        left, right = previous
        result[y] = (left / (mask.shape[1] - 1), right / (mask.shape[1] - 1),
                     (right - left) / (mask.shape[1] - 1), (left + right) / (2 * (mask.shape[1] - 1)))
    return result


def image_features(source: Source) -> tuple[np.ndarray, np.ndarray]:
    resampling = getattr(Image, "Resampling", Image)
    with Image.open(source.mask_path) as image:
        rgba = np.asarray(image.convert("RGBA").resize((WIDTH, HEIGHT), resampling.NEAREST), dtype=np.uint8)
    mask = ((rgba[..., 3] > 127) & (rgba[..., :3].max(axis=2) > 127)).astype(np.uint8)
    profile = central_profile(mask)
    with Image.open(source.mesh_path) as image:
        rgb = np.asarray(image.convert("RGB").resize((48, 64), resampling.BILINEAR), dtype=np.uint8)
    small_mask = np.asarray(
        Image.fromarray(mask * 255).resize((32, 48), resampling.BILINEAR), dtype=np.float32
    ).reshape(-1) / 255.0
    # Runtime-safe features can be recreated from a fixed-topology user mesh
    # after rasterizing its visible front silhouette. No raw WEAR triangles.
    runtime = np.concatenate((source.profile, profile.reshape(-1), small_mask)).astype(np.float32)
    luma = rgb.max(axis=2).astype(np.float32)
    threshold = float(np.quantile(luma, 0.25))
    background_values = luma[luma <= threshold]
    background = float(np.median(background_values)) if background_values.size else float(luma.min())
    raw_raster = np.clip((luma - background) / max(255.0 - background, 1.0), 0.0, 1.0).reshape(-1)
    return runtime, raw_raster.astype(np.float32)


def target_matrix(sources: list[Source]) -> np.ndarray:
    return np.concatenate(
        (
            np.stack([source.rows_px for source in sources]),
            np.stack([source.geometry.reshape(-1) for source in sources]),
            np.stack([source.shapes.reshape(-1) for source in sources]),
        ),
        axis=1,
    ).astype(np.float32)


def fit_predict(
    train_x: np.ndarray,
    train_y: np.ndarray,
    validation_x: np.ndarray,
    *,
    trees: int,
    threads: int,
) -> np.ndarray:
    model = ExtraTreesRegressor(
        n_estimators=trees,
        max_features=0.7,
        min_samples_leaf=2,
        n_jobs=threads,
        random_state=SEED,
        bootstrap=False,
    )
    model.fit(train_x, train_y)
    return model.predict(validation_x).astype(np.float32)


def metrics(truth: np.ndarray, prediction: np.ndarray) -> dict[str, Any]:
    result: dict[str, Any] = {"rows": {}}
    for row_index, row_name in enumerate(ROWS):
        shape_offset = 6 + row_index * POINTS * 2
        row_error = np.abs(prediction[:, row_index] - truth[:, row_index])
        breadth_error = np.abs(prediction[:, 2 + row_index * 2] - truth[:, 2 + row_index * 2])
        depth_error = np.abs(prediction[:, 3 + row_index * 2] - truth[:, 3 + row_index * 2])
        shape_error = np.abs(
            prediction[:, shape_offset : shape_offset + POINTS * 2]
            - truth[:, shape_offset : shape_offset + POINTS * 2]
        ).mean(axis=1)
        result["rows"][row_name] = {
            "rowYpx": {
                "mae": round(float(row_error.mean()), 6),
                "p95": round(float(np.quantile(row_error, 0.95)), 6),
                "within1pxPct": round(float(np.mean(row_error <= 1.0) * 100.0), 4),
            },
            "breadthCm": round(float(breadth_error.mean()), 6),
            "depthCm": round(float(depth_error.mean()), 6),
            "shape32": round(float(shape_error.mean()), 6),
        }
    result["aggregateMae"] = round(float(mean_absolute_error(truth, prediction)), 6)
    return result


def nearest_ambiguity(features: np.ndarray, targets: np.ndarray, ids: list[str]) -> dict[str, Any]:
    mean = features.mean(0)
    std = np.maximum(features.std(0), 1e-4)
    normalized = (features - mean) / std
    # Deterministic random projection keeps the pairwise audit cheap while
    # retaining the complete feature vector. It is not used for training.
    rng = np.random.default_rng(SEED)
    projection = rng.normal(0.0, 1.0 / math.sqrt(64), (normalized.shape[1], 64)).astype(np.float32)
    reduced = normalized @ projection
    norms = (reduced * reduced).sum(1)
    distances = norms[:, None] + norms[None, :] - 2.0 * (reduced @ reduced.T)
    np.fill_diagonal(distances, np.inf)
    nearest = np.argmin(distances, axis=1)
    candidates = []
    for index, neighbor in enumerate(nearest):
        candidates.append(
            {
                "scanA": ids[index],
                "scanB": ids[int(neighbor)],
                "featureDistance": float(math.sqrt(max(float(distances[index, neighbor]), 0.0))),
                "waistRowDifferencePx": float(abs(targets[index, 0] - targets[neighbor, 0])),
                "hipRowDifferencePx": float(abs(targets[index, 1] - targets[neighbor, 1])),
                "waistDepthDifferenceCm": float(abs(targets[index, 3] - targets[neighbor, 3])),
                "hipDepthDifferenceCm": float(abs(targets[index, 5] - targets[neighbor, 5])),
            }
        )
    candidates.sort(key=lambda item: (item["featureDistance"], -item["waistDepthDifferenceCm"] - item["hipDepthDifferenceCm"]))
    return {
        "nearestPairs": candidates[:40],
        "note": "Similar front observations with different depth/row targets prove front-only ambiguity.",
    }


def main() -> int:
    args = parse_args()
    sources, role_counts = read_sources(args.manifest.resolve())
    train = [source for source in sources if source.role == "train"]
    validation = [source for source in sources if source.role == "validation"]
    if args.train_limit:
        train = train[: args.train_limit]
    if args.validation_limit:
        validation = validation[: args.validation_limit]
    if not train or not validation:
        raise RuntimeError("Both non-test train and validation records are required")
    selected = train + validation
    with ThreadPoolExecutor(max_workers=min(args.threads, 64)) as executor:
        feature_pairs = list(executor.map(image_features, selected))
    runtime = np.stack([pair[0] for pair in feature_pairs])
    raster = np.stack([pair[1] for pair in feature_pairs])
    landmarks = np.stack([source.landmarks.reshape(-1) for source in selected])
    target = target_matrix(selected)
    train_count = len(train)
    contracts = {
        "runtimeOutline": runtime,
        "runtimeOutlinePlusExactWear73Oracle": np.concatenate((runtime, landmarks), axis=1),
        "legacyRawPlyRasterPlusOracle": np.concatenate((runtime, raster, landmarks), axis=1),
    }
    reports = {}
    for name, matrix in contracts.items():
        prediction = fit_predict(
            matrix[:train_count], target[:train_count], matrix[train_count:],
            trees=args.trees, threads=args.threads,
        )
        reports[name] = metrics(target[train_count:], prediction)
    payload = {
        "schemaVersion": "wear-front-observability-audit/v1",
        "manifest": str(args.manifest.resolve()),
        "subjects": {"train": len(train), "validation": len(validation)},
        "sourceRoleCounts": role_counts,
        "sealedTestFeaturesOpened": False,
        "sealedTestTargetsOpened": False,
        "recordedTapeUsed": False,
        "walkedPlyCircumferenceUsed": False,
        "contracts": reports,
        "runtimeAmbiguity": nearest_ambiguity(
            runtime[train_count:], target[train_count:], [source.scan_id for source in validation]
        ),
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps(payload, indent=2, sort_keys=True), flush=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
