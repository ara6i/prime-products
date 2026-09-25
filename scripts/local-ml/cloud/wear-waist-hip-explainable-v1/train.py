#!/usr/bin/env python3
"""Train and validate the explainable waist/hip model.

Five-fold mode always creates a fresh model per fold.  Validation uses one
canonical view per person; all nine views of that person remain together.
"""

from __future__ import annotations

import argparse
import json
import math
import os
import random
import statistics
import time
from concurrent.futures import ThreadPoolExecutor
from contextlib import nullcontext
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

import numpy as np
import torch
from PIL import Image
from torch import nn
from torch.nn import functional as F

from model import (
    CAUSES,
    ExplainableWaistHipModel,
    IMAGE_HEIGHT,
    IMAGE_WIDTH,
    ROWS,
    SHAPE_POINTS,
    ring_perimeter_cm,
    strict_path_contract,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--index", required=True, type=Path)
    parser.add_argument("--masks-dir", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("--job-id", required=True)
    parser.add_argument("--mode", choices=("dry", "fold", "cv", "final"), default="dry")
    parser.add_argument("--fold", type=int, choices=range(5), default=0)
    parser.add_argument("--epochs", type=int, default=80)
    parser.add_argument("--geometry-warmup-epochs", type=int, default=12)
    parser.add_argument("--patience", type=int, default=12)
    parser.add_argument("--batch-size", type=int, default=512)
    parser.add_argument("--learning-rate", type=float, default=3e-4)
    parser.add_argument("--weight-decay", type=float, default=1e-4)
    parser.add_argument("--device", choices=("auto", "cpu", "cuda"), default="auto")
    parser.add_argument("--decode-workers", type=int, default=24)
    parser.add_argument("--seed", type=int, default=20260904)
    parser.add_argument("--max-subjects", type=int, default=0)
    parser.add_argument("--resume", type=Path)
    return parser.parse_args()


def now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(payload, indent=2, sort_keys=True) + "\n")
    temporary.replace(path)


def quantile(values: list[float], fraction: float) -> float | None:
    if not values:
        return None
    ordered = sorted(values)
    position = (len(ordered) - 1) * fraction
    low, high = math.floor(position), math.ceil(position)
    if low == high:
        return ordered[low]
    return ordered[low] + (ordered[high] - ordered[low]) * (position - low)


def distribution(signed_errors: list[float]) -> dict[str, Any]:
    absolute = [abs(value) for value in signed_errors]
    return {
        "count": len(signed_errors),
        "mae": round(statistics.fmean(absolute), 6) if absolute else None,
        "median": round(quantile(absolute, 0.5), 6) if absolute else None,
        "p90": round(quantile(absolute, 0.9), 6) if absolute else None,
        "p95": round(quantile(absolute, 0.95), 6) if absolute else None,
        "maximum": round(max(absolute), 6) if absolute else None,
        "signedBias": round(statistics.fmean(signed_errors), 6) if signed_errors else None,
        "within1": round(sum(value <= 1 for value in absolute) / len(absolute), 6) if absolute else None,
        "within2": round(sum(value <= 2 for value in absolute) / len(absolute), 6) if absolute else None,
        "within3": round(sum(value <= 3 for value in absolute) / len(absolute), 6) if absolute else None,
        "within5": round(sum(value <= 5 for value in absolute) / len(absolute), 6) if absolute else None,
    }


def load_index(path: Path) -> dict[str, np.ndarray]:
    with np.load(path, allow_pickle=False) as archive:
        return {key: archive[key] for key in archive.files}


def read_mask(path: Path) -> np.ndarray:
    with Image.open(path) as opened:
        if "A" in opened.getbands() and opened.getchannel("A").getextrema()[0] != opened.getchannel("A").getextrema()[1]:
            gray = opened.getchannel("A")
        else:
            gray = opened.convert("L")
        if gray.size != (IMAGE_WIDTH, IMAGE_HEIGHT):
            gray = gray.resize((IMAGE_WIDTH, IMAGE_HEIGHT), Image.Resampling.BILINEAR)
        values = np.asarray(gray, dtype=np.uint8)
    return np.where(values >= 128, 255, 0).astype(np.uint8)


def load_masks(keys: np.ndarray, masks_dir: Path, workers: int) -> np.ndarray:
    paths = [masks_dir / Path(str(key)).name for key in keys]
    missing = [str(path) for path in paths if not path.is_file()]
    if missing:
        raise RuntimeError(f"Missing {len(missing)} silhouette masks; first={missing[0]}")
    with ThreadPoolExecutor(max_workers=max(1, workers)) as pool:
        decoded = list(pool.map(read_mask, paths))
    return np.stack(decoded, axis=0)


def select_subjects(
    scan_ids: np.ndarray,
    fold_ids: np.ndarray,
    validation_fold: int,
    maximum: int,
    seed: int,
) -> set[str] | None:
    if maximum <= 0:
        return None
    subjects = sorted(set(map(str, scan_ids)))
    random.Random(seed + validation_fold).shuffle(subjects)
    validation = [scan_id for scan_id in subjects if int(fold_ids[np.flatnonzero(scan_ids == scan_id)[0]]) == validation_fold]
    training = [scan_id for scan_id in subjects if scan_id not in set(validation)]
    each = max(4, maximum // 5)
    return set(validation[:each] + training[: max(4, maximum - each)])


def batches(indices: np.ndarray, batch_size: int, rng: np.random.Generator) -> Iterable[np.ndarray]:
    shuffled = indices.copy()
    rng.shuffle(shuffled)
    for start in range(0, len(shuffled), batch_size):
        yield shuffled[start : start + batch_size]


def model_targets(
    model_output: dict[str, dict[str, torch.Tensor]],
    row: str,
    truth: torch.Tensor,
    schema_index: dict[str, int],
) -> dict[str, torch.Tensor]:
    return {
        "y_norm": truth[:, schema_index[f"{row}.y_norm"]],
        "left_x_norm": truth[:, schema_index[f"{row}.left_x_norm"]],
        "right_x_norm": truth[:, schema_index[f"{row}.right_x_norm"]],
        "width_cm": truth[:, schema_index[f"{row}.width_cm"]],
        "depth_cm": truth[:, schema_index[f"{row}.depth_cm"]],
        "shape": torch.stack(tuple(
            torch.stack((
                truth[:, schema_index[f"{row}.shape.{point:02d}.x"]],
                truth[:, schema_index[f"{row}.shape.{point:02d}.depth"]],
            ), dim=1)
            for point in range(SHAPE_POINTS)
        ), dim=1),
        "ring_cm": truth[:, schema_index[f"{row}.ring_cm"]],
        "tape_correction_cm": truth[:, schema_index[f"{row}.tape_correction_cm"]],
        "final_tape_cm": truth[:, schema_index[f"{row}.final_tape_cm"]],
    }


def masked_smooth_l1(prediction: torch.Tensor, truth: torch.Tensor, mask: torch.Tensor, scale: float = 1.0) -> torch.Tensor:
    while mask.ndim < prediction.ndim:
        mask = mask.unsqueeze(-1)
    expanded = mask.expand_as(prediction)
    if not bool(expanded.any()):
        return prediction.sum() * 0.0
    return F.smooth_l1_loss(prediction[expanded] / scale, truth[expanded] / scale)


def loss_components(
    outputs: dict[str, dict[str, torch.Tensor]],
    truth: torch.Tensor,
    masks: torch.Tensor,
    eligibility: torch.Tensor,
    schema_index: dict[str, int],
    joint_tape: bool,
) -> dict[str, torch.Tensor]:
    parts: dict[str, torch.Tensor] = {}
    for row_index, row in enumerate(ROWS):
        target = model_targets(outputs, row, truth, schema_index)
        other_row = "hips" if row == "waist" else "waist"
        other_target = model_targets(outputs, other_row, truth, schema_index)
        geometry_mask = masks[:, schema_index[f"{row}.ring_cm"]]
        other_geometry_mask = masks[:, schema_index[f"{other_row}.ring_cm"]]
        final_mask = masks[:, schema_index[f"{row}.final_tape_cm"]]
        edge_mask = masks[:, schema_index[f"{row}.left_x_norm"]] & masks[:, schema_index[f"{row}.right_x_norm"]]
        parts[f"{row}.row"] = masked_smooth_l1(outputs[row]["y_norm"], target["y_norm"], geometry_mask)
        parts[f"{row}.edges"] = (
            masked_smooth_l1(outputs[row]["left_x_norm"], target["left_x_norm"], edge_mask)
            + masked_smooth_l1(outputs[row]["right_x_norm"], target["right_x_norm"], edge_mask)
        ) / 2.0
        parts[f"{row}.width"] = masked_smooth_l1(outputs[row]["width_cm"], target["width_cm"], geometry_mask, 3.0)
        parts[f"{row}.depth"] = masked_smooth_l1(outputs[row]["depth_cm"], target["depth_cm"], geometry_mask, 3.0)
        parts[f"{row}.shape"] = masked_smooth_l1(outputs[row]["shape"], target["shape"], geometry_mask, 0.2)
        parts[f"{row}.ring"] = masked_smooth_l1(outputs[row]["ring_cm"], target["ring_cm"], geometry_mask, 3.0)
        base = outputs[row]["base"]
        parts[f"{row}.firstAnswer"] = (
            masked_smooth_l1(base["y_norm"], target["y_norm"], geometry_mask)
            + masked_smooth_l1(base["width_cm"], target["width_cm"], geometry_mask, 3.0)
            + masked_smooth_l1(base["depth_cm"], target["depth_cm"], geometry_mask, 3.0)
            + masked_smooth_l1(base["shape"], target["shape"], geometry_mask, 0.2)
            + masked_smooth_l1(base["ring_cm"], target["ring_cm"], geometry_mask, 3.0)
        ) / 5.0
        if joint_tape:
            parts[f"{row}.correction"] = masked_smooth_l1(
                outputs[row]["tape_correction_cm"], target["tape_correction_cm"], final_mask, 2.0
            )
            parts[f"{row}.finalTape"] = masked_smooth_l1(
                outputs[row]["final_tape_cm"], target["final_tape_cm"], final_mask, 2.0
            )
        else:
            parts[f"{row}.correction"] = outputs[row]["tape_correction_cm"].sum() * 0.0
            parts[f"{row}.finalTape"] = outputs[row]["final_tape_cm"].sum() * 0.0
        base_ratio_width = outputs[row]["base"]["width_cm"] / outputs[other_row]["base"]["width_cm"].clamp_min(1e-5)
        truth_ratio_width = target["width_cm"] / other_target["width_cm"].clamp_min(1e-5)
        base_ratio_depth = outputs[row]["base"]["depth_cm"] / outputs[other_row]["base"]["depth_cm"].clamp_min(1e-5)
        truth_ratio_depth = target["depth_cm"] / other_target["depth_cm"].clamp_min(1e-5)
        ratio_score = torch.maximum(
            (base_ratio_width - truth_ratio_width).abs() / 0.06,
            (base_ratio_depth - truth_ratio_depth).abs() / 0.06,
        )
        issue_scores = torch.stack((
            (base["y_norm"] - target["y_norm"]).abs() / 0.03,
            (base["width_cm"] - target["width_cm"]).abs() / 3.0,
            (base["depth_cm"] - target["depth_cm"]).abs() / 3.0,
            (base["shape"] - target["shape"]).abs().mean(dim=(1, 2)) / 0.15,
            torch.where(geometry_mask & other_geometry_mask, ratio_score, torch.full_like(ratio_score, -1.0)),
            torch.where(final_mask, (base["tape_correction_cm"] - target["tape_correction_cm"]).abs() / 2.0, torch.full_like(ratio_score, -1.0)),
        ), dim=1)
        trainer_lesson = issue_scores.detach().argmax(dim=1)
        if bool(geometry_mask.any()):
            parts[f"{row}.issueLesson"] = F.cross_entropy(
                outputs[row]["issue_logits"][geometry_mask],
                trainer_lesson[geometry_mask],
            )
        else:
            parts[f"{row}.issueLesson"] = outputs[row]["issue_logits"].sum() * 0.0
        parts[f"{row}.confidence"] = F.binary_cross_entropy(
            torch.clamp(outputs[row]["confidence"], 1e-5, 1.0 - 1e-5), eligibility[:, row_index]
        )
    return parts


def total_loss(parts: dict[str, torch.Tensor], joint_tape: bool) -> torch.Tensor:
    weights = {
        "row": 2.0,
        "edges": 2.0,
        "width": 2.0,
        "depth": 2.5,
        "shape": 1.5,
        "ring": 2.0,
        "firstAnswer": 1.0,
        "correction": 1.5 if joint_tape else 0.0,
        "finalTape": 4.0 if joint_tape else 0.0,
        "issueLesson": 0.8,
        "confidence": 0.15,
    }
    numerator = sum(value * weights[name.rsplit(".", 1)[1]] for name, value in parts.items())
    denominator = len(ROWS) * sum(weights.values())
    return numerator / max(denominator, 1.0)


def tensor_batch(values: np.ndarray, indices: np.ndarray, device: torch.device, dtype: torch.dtype = torch.float32) -> torch.Tensor:
    return torch.as_tensor(values[indices], dtype=dtype, device=device)


@torch.no_grad()
def evaluate(
    model: nn.Module,
    indices: np.ndarray,
    images: np.ndarray,
    profiles: np.ndarray,
    targets: np.ndarray,
    masks: np.ndarray,
    eligibility: np.ndarray,
    schema_index: dict[str, int],
    scan_ids: np.ndarray,
    batch_size: int,
    device: torch.device,
    include_people: bool = False,
) -> dict[str, Any]:
    model.eval()
    errors = {row: {name: [] for name in ("finalTapeCm", "rowPixels", "edgePixels", "widthCm", "depthCm", "ringCm", "correctionCm")} for row in ROWS}
    cause_effect = {row: {name: [] for name in CAUSES} for row in ROWS}
    people: list[dict[str, Any]] = []
    for start in range(0, len(indices), batch_size):
        batch = indices[start : start + batch_size]
        silhouette = tensor_batch(images[:, None, :, :], batch, device) / 255.0
        profile = tensor_batch(profiles, batch, device)
        truth = tensor_batch(targets, batch, device)
        mask = tensor_batch(masks, batch, device, torch.bool)
        output = model(silhouette, profile)
        for row in ROWS:
            target = model_targets(output, row, truth, schema_index)
            other_row = "hips" if row == "waist" else "waist"
            other_target = model_targets(output, other_row, truth, schema_index)
            geometry_mask = mask[:, schema_index[f"{row}.ring_cm"]]
            final_mask = mask[:, schema_index[f"{row}.final_tape_cm"]]
            row_records: list[dict[str, Any]] = []
            for local_index in range(len(batch)):
                if bool(geometry_mask[local_index]):
                    errors[row]["rowPixels"].append(float((output[row]["y_norm"][local_index] - target["y_norm"][local_index]).cpu()) * IMAGE_HEIGHT)
                    errors[row]["edgePixels"].extend((
                        float((output[row]["left_x_norm"][local_index] - target["left_x_norm"][local_index]).cpu()) * IMAGE_WIDTH,
                        float((output[row]["right_x_norm"][local_index] - target["right_x_norm"][local_index]).cpu()) * IMAGE_WIDTH,
                    ))
                    for name, output_name, target_name in (
                        ("widthCm", "width_cm", "width_cm"),
                        ("depthCm", "depth_cm", "depth_cm"),
                        ("ringCm", "ring_cm", "ring_cm"),
                    ):
                        errors[row][name].append(float((output[row][output_name][local_index] - target[target_name][local_index]).cpu()))
                if bool(final_mask[local_index]):
                    signed = float((output[row]["final_tape_cm"][local_index] - target["final_tape_cm"][local_index]).cpu())
                    errors[row]["finalTapeCm"].append(signed)
                    errors[row]["correctionCm"].append(float((output[row]["tape_correction_cm"][local_index] - target["tape_correction_cm"][local_index]).cpu()))
                    predicted_width = output[row]["width_cm"][local_index : local_index + 1]
                    predicted_depth = output[row]["depth_cm"][local_index : local_index + 1]
                    predicted_shape = output[row]["shape"][local_index : local_index + 1]
                    predicted_correction = output[row]["tape_correction_cm"][local_index]
                    truth_width = target["width_cm"][local_index : local_index + 1]
                    truth_depth = target["depth_cm"][local_index : local_index + 1]
                    truth_shape = target["shape"][local_index : local_index + 1]
                    truth_correction = target["tape_correction_cm"][local_index]
                    truth_tape = target["final_tape_cm"][local_index]
                    predicted_other_width = output[other_row]["width_cm"][local_index : local_index + 1]
                    predicted_other_depth = output[other_row]["depth_cm"][local_index : local_index + 1]
                    truth_other_width = other_target["width_cm"][local_index : local_index + 1]
                    truth_other_depth = other_target["depth_cm"][local_index : local_index + 1]
                    if row == "waist":
                        ratio_width = predicted_other_width * (truth_width / truth_other_width.clamp_min(1e-5))
                        ratio_depth = predicted_other_depth * (truth_depth / truth_other_depth.clamp_min(1e-5))
                    else:
                        ratio_width = predicted_other_width / (truth_other_width / truth_width.clamp_min(1e-5)).clamp_min(1e-5)
                        ratio_depth = predicted_other_depth / (truth_other_depth / truth_depth.clamp_min(1e-5)).clamp_min(1e-5)
                    counterfactuals = {
                        "row_position": output[row]["final_tape_cm"][local_index],
                        "a_to_b_width": ring_perimeter_cm(truth_width, predicted_depth, predicted_shape)[0] + predicted_correction,
                        "front_to_back_depth": ring_perimeter_cm(predicted_width, truth_depth, predicted_shape)[0] + predicted_correction,
                        "cross_section_shape": ring_perimeter_cm(predicted_width, predicted_depth, truth_shape)[0] + predicted_correction,
                        "waist_to_hip_ratio": ring_perimeter_cm(ratio_width, ratio_depth, predicted_shape)[0] + predicted_correction,
                        "tape_protocol_correction": output[row]["ring_cm"][local_index] + truth_correction,
                    }
                    for cause, counterfactual in counterfactuals.items():
                        remaining = abs(float((counterfactual - truth_tape).cpu()))
                        cause_effect[row][cause].append(max(0.0, abs(signed) - remaining))
                    if include_people:
                        row_records.append({
                            "scanId": str(scan_ids[batch[local_index]]),
                            "target": row,
                            "tapeCm": round(float(truth_tape.cpu()), 6),
                            "predictionCm": round(float(output[row]["final_tape_cm"][local_index].cpu()), 6),
                            "firstPredictionCm": round(float(output[row]["base"]["final_tape_cm"][local_index].cpu()), 6),
                            "signedErrorCm": round(signed, 6),
                            "trainerLesson": max(counterfactuals, key=lambda cause: cause_effect[row][cause][-1]),
                            "studentIssuePrediction": CAUSES[int(output[row]["issue_probabilities"][local_index].argmax().cpu())],
                            "studentIssueProbabilities": {
                                cause: round(float(output[row]["issue_probabilities"][local_index, cause_index].cpu()), 6)
                                for cause_index, cause in enumerate(CAUSES)
                            },
                            "named": {
                                "rowYNorm": round(float(output[row]["y_norm"][local_index].cpu()), 6),
                                "leftXNorm": round(float(output[row]["left_x_norm"][local_index].cpu()), 6),
                                "rightXNorm": round(float(output[row]["right_x_norm"][local_index].cpu()), 6),
                                "widthCm": round(float(predicted_width[0].cpu()), 6),
                                "depthCm": round(float(predicted_depth[0].cpu()), 6),
                                "ringCm": round(float(output[row]["ring_cm"][local_index].cpu()), 6),
                                "tapeCorrectionCm": round(float(predicted_correction.cpu()), 6),
                                "confidence": round(float(output[row]["confidence"][local_index].cpu()), 6),
                            },
                            "errorRemovedCm": {
                                cause: round(cause_effect[row][cause][-1], 6) for cause in counterfactuals
                            },
                        })
            people.extend(row_records)
    metrics = {
        row: {
            name: distribution(values)
            for name, values in errors[row].items()
        }
        for row in ROWS
    }
    causes = {
        row: {
            cause: round(statistics.fmean(values), 6) if values else None
            for cause, values in cause_effect[row].items()
        }
        for row in ROWS
    }
    return {"metrics": metrics, "averageErrorRemovedCm": causes, "people": people}


def selection_score(result: dict[str, Any]) -> float:
    metrics = result["metrics"]
    tape = sum(float(metrics[row]["finalTapeCm"]["mae"] or 100) for row in ROWS)
    tails = sum(float(metrics[row]["finalTapeCm"]["p95"] or 100) for row in ROWS)
    geometry = sum(
        float(metrics[row][name]["mae"] or 100)
        for row in ROWS for name in ("widthCm", "depthCm")
    )
    return tape + 0.12 * tails + 0.08 * geometry


def train_fold(
    *,
    fold: int,
    args: argparse.Namespace,
    data: dict[str, np.ndarray],
    images: np.ndarray,
    device: torch.device,
    fold_output: Path,
) -> dict[str, Any]:
    fold_output.mkdir(parents=True, exist_ok=True)
    schema = data["target_schema"].tolist()
    schema_index = {name: index for index, name in enumerate(schema)}
    scan_ids = data["scan_ids"]
    fold_ids = data["fold_ids"]
    view_ids = data["view_ids"]
    selected_subjects = select_subjects(scan_ids, fold_ids, fold, args.max_subjects, args.seed)
    selected = np.asarray([selected_subjects is None or str(scan_id) in selected_subjects for scan_id in scan_ids])
    train_indices = np.flatnonzero(selected & (fold_ids != fold))
    validation_indices = np.flatnonzero(selected & (fold_ids == fold) & (view_ids == "canonical"))
    train_people = set(map(str, scan_ids[train_indices]))
    validation_people = set(map(str, scan_ids[validation_indices]))
    if not train_people or not validation_people or train_people & validation_people:
        raise RuntimeError("Person-level fold separation failed")

    torch.manual_seed(args.seed + fold)
    if device.type == "cuda":
        torch.cuda.manual_seed_all(args.seed + fold)
    model = ExplainableWaistHipModel().to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=args.learning_rate, weight_decay=args.weight_decay)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=max(args.epochs, 1), eta_min=args.learning_rate * 0.05)
    scaler = torch.amp.GradScaler("cuda", enabled=device.type == "cuda")
    start_epoch = 1
    best_score = math.inf
    best_epoch = 0
    best_result: dict[str, Any] | None = None
    history: list[dict[str, Any]] = []
    epochs_without_improvement = 0
    last_checkpoint = fold_output / "last-checkpoint.pt"
    best_checkpoint = fold_output / "best-checkpoint.pt"
    if args.resume:
        state = torch.load(args.resume, map_location=device, weights_only=False)
        if int(state["fold"]) != fold:
            raise RuntimeError("Resume checkpoint belongs to a different fold")
        model.load_state_dict(state["model"])
        optimizer.load_state_dict(state["optimizer"])
        scheduler.load_state_dict(state["scheduler"])
        start_epoch = int(state["epoch"]) + 1
        best_score = float(state["bestScore"])
        best_epoch = int(state["bestEpoch"])
        history = list(state.get("history") or [])

    rng = np.random.default_rng(args.seed + fold)
    started = time.monotonic()
    for epoch in range(start_epoch, args.epochs + 1):
        model.train()
        epoch_started = time.monotonic()
        sums: dict[str, float] = {}
        example_count = 0
        joint_tape = epoch > args.geometry_warmup_epochs
        for batch in batches(train_indices, args.batch_size, rng):
            optimizer.zero_grad(set_to_none=True)
            silhouette = tensor_batch(images[:, None, :, :], batch, device) / 255.0
            profile = tensor_batch(data["profiles"], batch, device)
            truth = tensor_batch(data["targets"], batch, device)
            mask = tensor_batch(data["masks"], batch, device, torch.bool)
            eligibility = tensor_batch(data["eligibility"], batch, device)
            context = torch.amp.autocast("cuda", dtype=torch.float16) if device.type == "cuda" else nullcontext()
            with context:
                output = model(silhouette, profile)
                parts = loss_components(output, truth, mask, eligibility, schema_index, joint_tape)
                loss = total_loss(parts, joint_tape)
            scaler.scale(loss).backward()
            scaler.unscale_(optimizer)
            torch.nn.utils.clip_grad_norm_(model.parameters(), 5.0)
            scaler.step(optimizer)
            scaler.update()
            for name, value in parts.items():
                sums[name] = sums.get(name, 0.0) + float(value.detach().cpu()) * len(batch)
            example_count += len(batch)
        scheduler.step()
        validation = evaluate(
            model, validation_indices, images, data["profiles"], data["targets"], data["masks"],
            data["eligibility"], schema_index, scan_ids, args.batch_size, device,
        )
        score = selection_score(validation)
        improved = joint_tape and score < best_score - 1e-5
        if improved:
            best_score = score
            best_epoch = epoch
            best_result = validation
            epochs_without_improvement = 0
            torch.save({
                "schemaVersion": "wear-waist-hip-checkpoint/v1",
                "jobId": args.job_id,
                "fold": fold,
                "epoch": epoch,
                "model": model.state_dict(),
                "strictPath": strict_path_contract(),
            }, best_checkpoint)
        else:
            epochs_without_improvement += 1
        history.append({
            "epoch": epoch,
            "phase": "joint-geometry-and-tape" if joint_tape else "geometry-only",
            "seconds": round(time.monotonic() - epoch_started, 3),
            "learningRate": optimizer.param_groups[0]["lr"],
            "trainLosses": {name: round(value / max(example_count, 1), 7) for name, value in sums.items()},
            "selectionScore": round(score, 7),
            "improved": improved,
            "validation": validation["metrics"],
        })
        state = {
            "schemaVersion": "wear-waist-hip-resume/v1",
            "jobId": args.job_id,
            "fold": fold,
            "epoch": epoch,
            "bestEpoch": best_epoch,
            "bestScore": best_score,
            "model": model.state_dict(),
            "optimizer": optimizer.state_dict(),
            "scheduler": scheduler.state_dict(),
            "history": history,
        }
        torch.save(state, last_checkpoint)
        progress = {
            "state": "training",
            "jobId": args.job_id,
            "fold": fold,
            "epoch": epoch,
            "epochs": args.epochs,
            "bestEpoch": best_epoch,
            "bestScore": round(best_score, 7),
            "trainPeople": len(train_people),
            "validationPeople": len(validation_people),
            "heldoutPeopleUsed": 0,
            "latestValidation": validation["metrics"],
        }
        write_json(fold_output / "progress.json", progress)
        print(json.dumps({
            "fold": fold,
            "epoch": epoch,
            "phase": history[-1]["phase"],
            "score": round(score, 5),
            "waistMae": validation["metrics"]["waist"]["finalTapeCm"]["mae"],
            "hipMae": validation["metrics"]["hips"]["finalTapeCm"]["mae"],
            "improved": improved,
        }), flush=True)
        if joint_tape and epoch >= args.geometry_warmup_epochs + 5 and epochs_without_improvement >= args.patience:
            break

    if not best_checkpoint.exists():
        raise RuntimeError("No best checkpoint was saved")
    saved = torch.load(best_checkpoint, map_location=device, weights_only=False)
    model.load_state_dict(saved["model"])
    best_result = evaluate(
        model, validation_indices, images, data["profiles"], data["targets"], data["masks"],
        data["eligibility"], schema_index, scan_ids, args.batch_size, device, include_people=True,
    )
    result = {
        "schemaVersion": "wear-waist-hip-fold-result/v1",
        "state": "completed",
        "jobId": args.job_id,
        "fold": fold,
        "freshInitialization": args.resume is None,
        "trainPeople": len(train_people),
        "trainViews": len(train_indices),
        "validationPeople": len(validation_people),
        "validationViews": len(validation_indices),
        "peopleOverlap": 0,
        "heldoutPeopleUsed": 0,
        "bestEpoch": best_epoch,
        "bestSelectionScore": round(best_score, 7),
        "elapsedMinutes": round((time.monotonic() - started) / 60.0, 4),
        "metrics": best_result["metrics"],
        "averageErrorRemovedCm": best_result["averageErrorRemovedCm"],
        "people": best_result["people"],
        "history": history,
        "strictPath": strict_path_contract(),
    }
    write_json(fold_output / "final-result.json", result)
    return result


def cross_validation_summary(results: list[dict[str, Any]], args: argparse.Namespace) -> dict[str, Any]:
    metrics: dict[str, Any] = {}
    for row in ROWS:
        tape_maes = [float(item["metrics"][row]["finalTapeCm"]["mae"]) for item in results]
        tape_p95 = [float(item["metrics"][row]["finalTapeCm"]["p95"]) for item in results]
        worst = [float(item["metrics"][row]["finalTapeCm"]["maximum"]) for item in results]
        metrics[row] = {
            "meanFoldMaeCm": round(statistics.fmean(tape_maes), 6),
            "meanFoldP95Cm": round(statistics.fmean(tape_p95), 6),
            "maximumFoldWorstCm": round(max(worst), 6),
            "foldMaeCm": tape_maes,
        }
    gates = {
        "waistMaeAtMost2_4cm": metrics["waist"]["meanFoldMaeCm"] <= 2.4,
        "hipMaeAtMost1_55cm": metrics["hips"]["meanFoldMaeCm"] <= 1.55,
        "waistP95AtMost6_5cm": metrics["waist"]["meanFoldP95Cm"] <= 6.5,
        "hipP95AtMost4cm": metrics["hips"]["meanFoldP95Cm"] <= 4.0,
        "allFiveFoldsCompleted": len(results) == 5,
    }
    return {
        "schemaVersion": "wear-waist-hip-cross-validation/v1",
        "state": "passed" if all(gates.values()) else "failed",
        "jobId": args.job_id,
        "createdAt": now(),
        "folds": len(results),
        "developmentPeople": 3_878,
        "heldoutPeopleUsed": 0,
        "metrics": metrics,
        "successGatesFrozenBeforeHeldout": gates,
        "suggestedFinalEpochs": round(statistics.median(item["bestEpoch"] for item in results)),
        "strictPath": strict_path_contract(),
    }


def main() -> int:
    args = parse_args()
    random.seed(args.seed)
    np.random.seed(args.seed)
    torch.manual_seed(args.seed)
    if args.device == "cuda" and not torch.cuda.is_available():
        raise RuntimeError("CUDA was requested but is unavailable")
    device = torch.device("cuda" if args.device == "cuda" or (args.device == "auto" and torch.cuda.is_available()) else "cpu")
    if device.type == "cuda":
        torch.backends.cudnn.benchmark = True
    torch.set_num_threads(max(1, min(os.cpu_count() or 1, 24)))
    output_dir = args.output_dir.resolve()
    output_dir.mkdir(parents=True, exist_ok=True)
    write_json(output_dir / "run-contract.json", {
        "schemaVersion": "wear-waist-hip-run-contract/v1",
        "jobId": args.job_id,
        "startedAt": now(),
        "mode": args.mode,
        "device": str(device),
        "pytorch": torch.__version__,
        "cuda": torch.version.cuda,
        "epochs": args.epochs,
        "geometryWarmupEpochs": args.geometry_warmup_epochs,
        "batchSize": args.batch_size,
        "learningRate": args.learning_rate,
        "heldoutPeopleUsed": 0,
        "strictPath": strict_path_contract(),
    })
    data = load_index(args.index)
    images = load_masks(data["s3_keys"], args.masks_dir.resolve(), args.decode_workers)
    if args.mode == "dry":
        args.epochs = min(args.epochs, 2)
        args.geometry_warmup_epochs = min(args.geometry_warmup_epochs, 1)
        args.max_subjects = args.max_subjects or 64
        result = train_fold(fold=args.fold, args=args, data=data, images=images, device=device, fold_output=output_dir / f"fold-{args.fold}")
        write_json(output_dir / "dry-run-result.json", {
            "state": "passed",
            "jobId": args.job_id,
            "device": str(device),
            "fold": args.fold,
            "trainPeople": result["trainPeople"],
            "validationPeople": result["validationPeople"],
            "epochs": len(result["history"]),
            "gradientUpdatesCompleted": True,
            "checkpointRestartWritten": (output_dir / f"fold-{args.fold}" / "last-checkpoint.pt").exists(),
            "reportsWritten": True,
            "heldoutPeopleUsed": 0,
            "strictPath": strict_path_contract(),
        })
        return 0
    if args.mode == "fold":
        train_fold(fold=args.fold, args=args, data=data, images=images, device=device, fold_output=output_dir / f"fold-{args.fold}")
        return 0
    if args.mode == "cv":
        results = [
            train_fold(fold=fold, args=args, data=data, images=images, device=device, fold_output=output_dir / f"fold-{fold}")
            for fold in range(5)
        ]
        summary = cross_validation_summary(results, args)
        write_json(output_dir / "cross-validation-summary.json", summary)
        print(json.dumps(summary, indent=2, sort_keys=True), flush=True)
        return 0 if summary["state"] == "passed" else 2
    raise RuntimeError("Final all-development fit is intentionally separate and needs the selected cross-validation epoch count")


if __name__ == "__main__":
    raise SystemExit(main())
