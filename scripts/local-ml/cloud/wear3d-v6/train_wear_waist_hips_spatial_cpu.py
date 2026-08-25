#!/usr/bin/env python3
"""Train the geometry-only spatial WEAR waist/hips model.

The model keeps the 192x128 mesh layout through a U-Net style decoder.  It
predicts row and endpoint heatmaps, constrains endpoints to the visible body
boundary, derives breadth from those endpoints and a learned image scale, and
then predicts depth and the exact normalized 32-point PLY section. Recorded
WEAR tape, walked PLY circumference, and protocol deltas are deliberately
excluded. This stage proves geometry before any circumference learner exists.
"""

from __future__ import annotations

import argparse
from collections import Counter
from datetime import datetime, timezone
import hashlib
import json
import math
import os
from pathlib import Path
import random
from typing import Any

import numpy as np
import onnx
from PIL import Image, ImageDraw, ImageFont
import torch
from torch import nn
from torch.nn import functional as F
from torch.utils.data import DataLoader, Dataset

from prove_wear_waist_hips_spatial_10 import (
    GEOMETRY_FIELDS,
    HEIGHT,
    POINTS,
    PROFILE_FIELDS,
    ROWS,
    ROW_COLORS,
    TRUTH_COLOR,
    WIDTH,
    SpatialWaistHipNet,
    Stats,
    load_channels,
)
from train_wear_waist_hips_cpu import (
    EXPECTED_TEST_SUBJECTS,
    Record,
    metric_summary,
    read_records,
    sha256,
    update_status,
)


SEED = 20260823
def now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path)
    parser.add_argument("--audit", type=Path)
    parser.add_argument("--rendered-root", type=Path)
    parser.add_argument("--output-dir", type=Path)
    parser.add_argument("--pipeline-id", default="wear3d-waist-hips-geometry-cpu-v3-20260823")
    parser.add_argument("--epochs", type=int, default=45)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--threads", type=int, default=min(96, os.cpu_count() or 8))
    parser.add_argument("--status-bucket")
    parser.add_argument("--status-key")
    parser.add_argument("--startup-smoke", action="store_true")
    return parser.parse_args()


def compute_stats(records: list[Record]) -> Stats:
    train = [record for record in records if record.role == "train"]
    profiles = np.stack([record.profile for record in train]).astype(np.float32)
    geometry_mean = np.zeros((2, GEOMETRY_FIELDS), dtype=np.float32)
    geometry_std = np.ones((2, GEOMETRY_FIELDS), dtype=np.float32)
    for row in range(2):
        valid = [record for record in train if record.row_mask[row] > 0.5]
        if not valid:
            raise RuntimeError(f"No training teachers for {ROWS[row]}")
        learned_geometry = []
        for record in valid:
            value = record.geometry[row].copy()
            span = max(float(record.edges[row, 2] - record.edges[row, 1]), 1e-5)
            value[0] = value[0] / span
            learned_geometry.append(value)
        matrix = np.stack(learned_geometry).astype(np.float32)
        geometry_mean[row] = matrix.mean(0)
        geometry_std[row] = np.maximum(matrix.std(0), 1e-4)
    return Stats(
        profile_mean=profiles.mean(0),
        profile_std=np.maximum(profiles.std(0), 1e-4),
        geometry_mean=geometry_mean,
        geometry_std=geometry_std,
        delta_mean=np.zeros(2, dtype=np.float32),
        delta_std=np.ones(2, dtype=np.float32),
    )


class SpatialDataset(Dataset):
    def __init__(self, records: list[Record], stats: Stats) -> None:
        self.records = records
        self.stats = stats
        self.channels = np.empty((len(records), 3, HEIGHT, WIDTH), dtype=np.float32)
        self.geometry_z = np.zeros((len(records), 2, GEOMETRY_FIELDS), dtype=np.float32)
        for index, record in enumerate(records):
            self.channels[index] = load_channels(record.mesh_path, record.mask_path)
            for row in range(2):
                if record.row_mask[row] <= 0.5:
                    continue
                learned = record.geometry[row].copy()
                span = max(float(record.edges[row, 2] - record.edges[row, 1]), 1e-5)
                learned[0] = learned[0] / span
                self.geometry_z[index, row] = (learned - stats.geometry_mean[row]) / stats.geometry_std[row]
            if index and index % 500 == 0:
                print(f"cached_meshes={index}/{len(records)}", flush=True)

    def __len__(self) -> int:
        return len(self.records)

    def __getitem__(self, index: int):
        record = self.records[index]
        profile = (record.profile - self.stats.profile_mean) / self.stats.profile_std
        return tuple(torch.from_numpy(value.astype(np.float32)) for value in (
            self.channels[index],
            profile,
            record.edges,
            record.geometry,
            self.geometry_z[index],
            record.row_mask,
        ))


def masked_mean(values: torch.Tensor, mask: torch.Tensor) -> torch.Tensor:
    while mask.ndim < values.ndim:
        mask = mask.unsqueeze(-1)
    return (values * mask).sum() / mask.expand_as(values).sum().clamp_min(1.0)


def class_targets(edges: torch.Tensor) -> tuple[torch.Tensor, torch.Tensor]:
    row_y = torch.round(edges[..., 0] * (HEIGHT - 1)).long().clamp(0, HEIGHT - 1)
    endpoint_y = row_y.unsqueeze(-1).expand(-1, -1, 2)
    endpoint_x = torch.round(edges[..., 1:] * (WIDTH - 1)).long().clamp(0, WIDTH - 1)
    return row_y, endpoint_y * WIDTH + endpoint_x


def batch_loss(model: SpatialWaistHipNet, batch, device: torch.device) -> tuple[torch.Tensor, dict[str, float]]:
    mesh, profile, edge_target, geometry_target, geometry_z_target, row_mask = [
        value.to(device) for value in batch
    ]
    edges, breadth, depth, _, shape, row_logits, endpoint_logits = model.forward_geometry(mesh, profile)
    row_index, endpoint_index = class_targets(edge_target)
    row_scores = torch.logsumexp(row_logits, dim=-1) - math.log(WIDTH)
    row_ce = masked_mean(
        F.cross_entropy(row_scores.reshape(-1, HEIGHT), row_index.reshape(-1), reduction="none").reshape(-1, 2),
        row_mask,
    )
    endpoint_ce = masked_mean(
        F.cross_entropy(
            endpoint_logits.reshape(-1, HEIGHT * WIDTH), endpoint_index.reshape(-1), reduction="none"
        ).reshape(-1, 2, 2),
        row_mask,
    )
    edge_px = torch.stack((
        (edges[..., 0] - edge_target[..., 0]) * HEIGHT,
        (edges[..., 1] - edge_target[..., 1]) * WIDTH,
        (edges[..., 2] - edge_target[..., 2]) * WIDTH,
    ), -1)
    edge_loss = masked_mean(F.smooth_l1_loss(edge_px, torch.zeros_like(edge_px), reduction="none"), row_mask)
    predicted_scale = breadth / (edges[..., 2] - edges[..., 1]).clamp_min(1e-4)
    predicted_geometry = torch.cat((predicted_scale.unsqueeze(-1), depth.unsqueeze(-1), shape.flatten(2)), -1)
    predicted_z = (predicted_geometry - model.geometry_mean.unsqueeze(0)) / model.geometry_std.unsqueeze(0)
    breadth_depth = masked_mean(
        F.smooth_l1_loss(predicted_z[..., :2], geometry_z_target[..., :2], reduction="none"), row_mask
    )
    breadth_cm_loss = masked_mean(
        F.smooth_l1_loss(
            (breadth - geometry_target[..., 0]) / 0.50,
            torch.zeros_like(breadth),
            reduction="none",
        ),
        row_mask,
    )
    depth_cm_loss = masked_mean(
        F.smooth_l1_loss(
            (depth - geometry_target[..., 1]) / 1.00,
            torch.zeros_like(depth),
            reduction="none",
        ),
        row_mask,
    )
    shape_loss = masked_mean(
        F.smooth_l1_loss(predicted_z[..., 2:], geometry_z_target[..., 2:], reduction="none"), row_mask
    )
    truth_shape = geometry_target[..., 2:].reshape(-1, 2, POINTS, 2)
    shape_edge = masked_mean(
        F.smooth_l1_loss(
            torch.roll(shape, -1, 2) - shape,
            torch.roll(truth_shape, -1, 2) - truth_shape,
            reduction="none",
        ),
        row_mask,
    )
    total = (
        row_ce
        + endpoint_ce
        + edge_loss * 2.0
        + breadth_depth * 0.25
        + breadth_cm_loss * 2.0
        + depth_cm_loss * 2.0
        + shape_loss * 2.0
        + shape_edge
    )
    return total, {
        "rowCE": float(row_ce.detach()),
        "endpointCE": float(endpoint_ce.detach()),
        "edge": float(edge_loss.detach()),
        "breadthDepth": float(breadth_depth.detach()),
        "breadthCm": float(breadth_cm_loss.detach()),
        "depthCm": float(depth_cm_loss.detach()),
        "shape": float(shape_loss.detach()),
        "shapeEdge": float(shape_edge.detach()),
        "circumferenceLossEnabled": False,
    }


@torch.no_grad()
def evaluate_loss(model: SpatialWaistHipNet, loader: DataLoader, device: torch.device) -> float:
    model.eval()
    values = [float(batch_loss(model, batch, device)[0]) for batch in loader]
    return float(np.mean(values)) if values else float("inf")


@torch.no_grad()
def predict(model: SpatialWaistHipNet, dataset: SpatialDataset, device: torch.device, batch_size: int):
    model.eval()
    outputs = []
    for start in range(0, len(dataset), batch_size):
        end = min(start + batch_size, len(dataset))
        mesh = torch.from_numpy(dataset.channels[start:end]).to(device)
        profile = np.stack([
            (record.profile - dataset.stats.profile_mean) / dataset.stats.profile_std
            for record in dataset.records[start:end]
        ]).astype(np.float32)
        result = model.forward_geometry(mesh, torch.from_numpy(profile).to(device))[:5]
        arrays = [value.cpu().numpy() for value in result]
        for offset in range(end - start):
            outputs.append(tuple(array[offset] for array in arrays))
    return outputs


def build_report(records: list[Record], predictions, split: str, pipeline_id: str) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    errors = {
        row_name: {key: [] for key in (
            "rowYpx", "leftPx", "rightPx", "breadthCm", "depthCm", "shape32"
        )}
        for row_name in ROWS
    }
    rows = []
    for record, output in zip(records, predictions):
        edge, breadth, depth, ratio, shape = output
        item = {"scanId": record.scan_id, "role": record.role, "rows": {}}
        for row_index, row_name in enumerate(ROWS):
            if record.row_mask[row_index] <= 0.5:
                item["rows"][row_name] = {"scored": False}
                continue
            truth_shape = record.geometry[row_index, 2:].reshape(POINTS, 2)
            metric = errors[row_name]
            metric["rowYpx"].append(abs(float(edge[row_index, 0] - record.edges[row_index, 0])) * HEIGHT)
            metric["leftPx"].append(abs(float(edge[row_index, 1] - record.edges[row_index, 1])) * WIDTH)
            metric["rightPx"].append(abs(float(edge[row_index, 2] - record.edges[row_index, 2])) * WIDTH)
            metric["breadthCm"].append(abs(float(breadth[row_index] - record.geometry[row_index, 0])))
            metric["depthCm"].append(abs(float(depth[row_index] - record.geometry[row_index, 1])))
            metric["shape32"].append(float(np.abs(shape[row_index] - truth_shape).mean()))
            item["rows"][row_name] = {
                "scored": True,
                "predicted": {
                    "row": np.round(edge[row_index], 7).tolist(),
                    "breadthCm": round(float(breadth[row_index]), 5),
                    "depthCm": round(float(depth[row_index]), 5),
                    "depthRatio": round(float(ratio[row_index]), 7),
                    "shape32": np.round(shape[row_index], 7).tolist(),
                },
                "truth": {
                    "row": np.round(record.edges[row_index], 7).tolist(),
                    "breadthCm": round(float(record.geometry[row_index, 0]), 5),
                    "depthCm": round(float(record.geometry[row_index, 1]), 5),
                    "shape32": np.round(truth_shape, 7).tolist(),
                },
            }
        rows.append(item)

    gates = {
        "rowYpx": 1.0,
        "leftPx": 1.0,
        "rightPx": 1.0,
        "breadthCm": 0.50,
        "depthCm": 1.00,
        "shape32": 0.020,
    }
    report_rows = {}
    failures = []
    for row_name in ROWS:
        report_rows[row_name] = {}
        for key, values in errors[row_name].items():
            summary = metric_summary(values, limit=gates[key])
            report_rows[row_name][key] = summary
            if summary.get("mae") is None or float(summary["mae"]) > gates[key]:
                failures.append(f"{row_name}.{key} MAE exceeds {gates[key]}")
    report = {
        "schemaVersion": "wear-waist-hips-geometry-evaluation/v3",
        "pipelineId": pipeline_id,
        "split": split,
        "subjects": len(records),
        "generatedAt": now(),
        "rows": report_rows,
        "gates": gates,
        "failures": failures,
        "passed": not failures,
        "geometryOnly": True,
        "recordedTapeUsed": False,
        "walkedPlyCircumferenceUsed": False,
        "breadthPath": "(right endpoint - left endpoint) multiplied by predicted canonical image scale",
        "circumferencePath": None,
        "published": False,
        "sdkReady": False,
    }
    return report, rows


def draw_shape(draw: ImageDraw.ImageDraw, points: np.ndarray, box, color: str, width: int) -> None:
    x0, y0, x1, y1 = box
    center = np.asarray(((x0 + x1) * 0.5, (y0 + y1) * 0.5))
    scale = np.asarray(((x1 - x0) * 0.44, (y1 - y0) * 0.44))
    coords = center + points * scale
    loop = [tuple(map(float, point)) for point in coords] + [tuple(map(float, coords[0]))]
    draw.line(loop, fill=color, width=width, joint="curve")


def contact_sheet(records: list[Record], predictions, output: Path, split: str, count: int = 24) -> None:
    eligible = [index for index, record in enumerate(records) if record.row_mask.sum() == 2]
    chosen = sorted(random.Random(SEED).sample(eligible, min(count, len(eligible))))
    card_w, card_h, columns = 520, 390, 4
    sheet = Image.new("RGB", (card_w * columns, card_h * math.ceil(len(chosen) / columns)), "#050b18")
    font = ImageFont.load_default()
    resampling = getattr(Image, "Resampling", Image)
    for position, index in enumerate(chosen):
        record = records[index]
        edge, breadth, depth, _, shape = predictions[index]
        card = Image.new("RGB", (card_w, card_h), "#0c1729")
        draw = ImageDraw.Draw(card)
        with Image.open(record.mesh_path) as source:
            body = source.convert("RGB")
        body.thumbnail((235, 325), resampling.LANCZOS)
        bx, by = 8, 46
        card.paste(body, (bx, by))
        for row in range(2):
            truth = record.edges[row]
            prediction = edge[row]
            ty = by + truth[0] * body.height
            py = by + prediction[0] * body.height
            draw.line((bx + truth[1] * body.width, ty, bx + truth[2] * body.width, ty), fill=TRUTH_COLOR, width=4)
            draw.line((bx + prediction[1] * body.width, py, bx + prediction[2] * body.width, py), fill=ROW_COLORS[row], width=2)
        draw.text((8, 8), f"{record.scan_id} · {split}", fill="white", font=font)
        draw.text((8, 24), "orange teacher · cyan/green spatial model", fill="#9fb0c8", font=font)
        tx = 250
        for row, name in enumerate(ROWS):
            top = 48 + row * 165
            truth_shape = record.geometry[row, 2:].reshape(POINTS, 2)
            draw.text((tx, top), name.upper(), fill=ROW_COLORS[row], font=font)
            draw.text((tx, top + 15), f"A-B {breadth[row]:.2f}/{record.geometry[row,0]:.2f} cm", fill="white", font=font)
            draw.text((tx, top + 29), f"C-D {depth[row]:.2f}/{record.geometry[row,1]:.2f} cm", fill="white", font=font)
            shape_error = float(np.abs(shape[row] - truth_shape).mean())
            draw.text((tx, top + 43), f"shape MAE {shape_error:.5f}", fill="#c4b5fd", font=font)
            draw.text((tx, top + 57), "geometry only · tape/PLY circumference excluded", fill="#9fb0c8", font=font)
            draw_shape(draw, truth_shape, (tx, top + 76, tx + 245, top + 155), TRUTH_COLOR, 3)
            draw_shape(draw, shape[row], (tx, top + 76, tx + 245, top + 155), ROW_COLORS[row], 2)
        sheet.paste(card, ((position % columns) * card_w, (position // columns) * card_h))
    output.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output, quality=94)


class RuntimeModel(nn.Module):
    def __init__(self, model: SpatialWaistHipNet) -> None:
        super().__init__()
        self.model = model

    def forward(self, mesh: torch.Tensor, profile: torch.Tensor):
        return self.model.forward_geometry(mesh, profile)[:5]


def export_onnx(model: SpatialWaistHipNet, output: Path) -> None:
    runtime = RuntimeModel(model.eval().cpu())
    torch.onnx.export(
        runtime,
        (torch.zeros(1, 3, HEIGHT, WIDTH), torch.zeros(1, len(PROFILE_FIELDS))),
        output,
        input_names=["mesh_channels", "profile"],
        output_names=["rows", "breadth_cm", "depth_cm", "depth_ratio", "shape32"],
        dynamic_axes={name: {0: "batch"} for name in (
            "mesh_channels", "profile", "rows", "breadth_cm", "depth_cm", "depth_ratio",
            "shape32",
        )},
        opset_version=18,
        dynamo=False,
    )
    onnx.checker.check_model(onnx.load(output))


def smoke() -> None:
    stats = Stats(
        np.zeros(4, np.float32), np.ones(4, np.float32),
        np.zeros((2, GEOMETRY_FIELDS), np.float32), np.ones((2, GEOMETRY_FIELDS), np.float32),
        np.zeros(2, np.float32), np.ones(2, np.float32),
    )
    model = SpatialWaistHipNet(stats)
    output = model.forward_geometry(torch.zeros(2, 3, HEIGHT, WIDTH), torch.zeros(2, 4))[:5]
    expected = ((2, 2, 3), (2, 2), (2, 2), (2, 2), (2, 2, POINTS, 2))
    actual = tuple(tuple(value.shape) for value in output)
    if actual != expected:
        raise RuntimeError(f"Output contract {actual} != {expected}")
    path = Path("/tmp/wear-waist-hips-spatial-smoke.onnx")
    export_onnx(model, path)
    print(json.dumps({"startupSmoke": "passed", "outputs": actual, "onnxBytes": path.stat().st_size}))


def main() -> None:
    args = parse_args()
    if args.startup_smoke:
        smoke()
        return
    if any(value is None for value in (args.manifest, args.audit, args.rendered_root, args.output_dir)):
        raise RuntimeError("--manifest, --audit, --rendered-root and --output-dir are required")
    args.output_dir.mkdir(parents=True, exist_ok=True)
    random.seed(SEED)
    np.random.seed(SEED)
    torch.manual_seed(SEED)
    torch.set_num_threads(max(1, args.threads))
    torch.set_num_interop_threads(min(8, max(1, args.threads // 8)))
    audit = json.loads(args.audit.read_text(encoding="utf-8"))
    if (audit.get("summary") or {}).get("trainingAllowed") is not True:
        raise RuntimeError("Teacher audit does not permit training")
    if (audit.get("summary") or {}).get("renderManifestSha256") != sha256(args.manifest):
        raise RuntimeError("Teacher manifest hash mismatch")

    update_status(
        args.status_bucket, args.status_key,
        state="running", currentStage="geometry-train", overallPercent=80,
        currentStageLabel="Training waist/hips geometry only",
        detail="The sealed 448 is unopened. Tape, PLY circumference, and protocol delta are excluded.",
    )
    train_validation = read_records(
        args.manifest, args.rendered_root, {"train", "validation"}, require_tape=False
    )
    stats = compute_stats(train_validation)
    by_role = {role: [record for record in train_validation if record.role == role] for role in ("train", "validation")}
    datasets = {role: SpatialDataset(records, stats) for role, records in by_role.items()}
    train_loader = DataLoader(datasets["train"], batch_size=args.batch_size, shuffle=True, num_workers=0)
    validation_loader = DataLoader(datasets["validation"], batch_size=args.batch_size * 2, shuffle=False, num_workers=0)
    device = torch.device("cpu")
    model = SpatialWaistHipNet(stats).to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=8e-4, weight_decay=5e-5)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=max(args.epochs, 1), eta_min=4e-5)
    best_state = None
    best_validation = float("inf")
    history = []
    stale = 0
    for epoch in range(1, args.epochs + 1):
        model.train()
        train_losses = []
        part_values: dict[str, list[float]] = {}
        for batch in train_loader:
            optimizer.zero_grad(set_to_none=True)
            loss, parts = batch_loss(model, batch, device)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 8.0)
            optimizer.step()
            train_losses.append(float(loss.detach()))
            for key, value in parts.items():
                part_values.setdefault(key, []).append(value)
        validation_loss = evaluate_loss(model, validation_loader, device)
        scheduler.step()
        epoch_item = {
            "epoch": epoch,
            "trainLoss": round(float(np.mean(train_losses)), 7),
            "validationLoss": round(validation_loss, 7),
            "learningRate": optimizer.param_groups[0]["lr"],
            "parts": {key: round(float(np.mean(values)), 7) for key, values in part_values.items()},
        }
        history.append(epoch_item)
        print(json.dumps(epoch_item), flush=True)
        if validation_loss + 1e-5 < best_validation:
            best_validation = validation_loss
            best_state = {key: value.detach().cpu().clone() for key, value in model.state_dict().items()}
            stale = 0
        else:
            stale += 1
        if stale >= 8:
            break
    if best_state is None:
        raise RuntimeError("No checkpoint was produced")
    model.load_state_dict(best_state)
    (args.output_dir / "training-history.json").write_text(json.dumps(history, indent=2) + "\n")
    model_path = args.output_dir / "model.pt"
    torch.save({
        "pipelineId": args.pipeline_id,
        "stateDict": best_state,
        "stats": {
            "profileMean": stats.profile_mean.tolist(), "profileStd": stats.profile_std.tolist(),
            "geometryMean": stats.geometry_mean.tolist(), "geometryStd": stats.geometry_std.tolist(),
        },
        "geometryOnly": True,
        "recordedTapeUsed": False,
        "walkedPlyCircumferenceUsed": False,
    }, model_path)

    validation_predictions = predict(model, datasets["validation"], device, args.batch_size * 2)
    validation_report, validation_rows = build_report(by_role["validation"], validation_predictions, "validation", args.pipeline_id)
    validation_report["bestValidationLoss"] = round(best_validation, 7)
    (args.output_dir / "validation-metrics.json").write_text(json.dumps(validation_report, indent=2) + "\n")
    with (args.output_dir / "validation-predictions.jsonl").open("w") as handle:
        for item in validation_rows:
            handle.write(json.dumps(item, separators=(",", ":")) + "\n")
    contact_sheet(by_role["validation"], validation_predictions, args.output_dir / "validation-contact-sheet.jpg", "validation")

    if not validation_report["passed"]:
        update_status(
            args.status_bucket, args.status_key,
            state="waiting", currentStage="geometry-validation", overallPercent=94,
            currentStageLabel="Geometry model failed validation; sealed 448 remains unopened",
            detail="Artifacts are preserved for diagnosis. Nothing was installed or published.",
            model={"validationPassed": False, "sealed448Opened": False, "sdkReady": False},
        )
        print(json.dumps({
            "pipelineId": args.pipeline_id, "validationPassed": False,
            "sealed448Opened": False, "failures": validation_report["failures"],
        }, indent=2))
        return

    # Validation passed: now and only now materialize the sealed test images
    # and labels.  Weights remain frozen from this point onward.
    update_status(
        args.status_bucket, args.status_key,
        state="running", currentStage="geometry-test", overallPercent=96,
        currentStageLabel="Validation passed; testing 448 sealed people once",
        detail="Weights are frozen. The 448 held-out labels are opened only for this final score.",
    )
    test_records = read_records(args.manifest, args.rendered_root, {"test"}, require_tape=False)
    test_dataset = SpatialDataset(test_records, stats)
    test_predictions = predict(model, test_dataset, device, args.batch_size * 2)
    test_report, test_rows = build_report(test_records, test_predictions, "sealed-test", args.pipeline_id)
    test_report["validationPassedBeforeTest"] = True
    test_report["modelStateSha256"] = sha256(model_path)
    (args.output_dir / "test-metrics.json").write_text(json.dumps(test_report, indent=2) + "\n")
    with (args.output_dir / "test-predictions.jsonl").open("w") as handle:
        for item in test_rows:
            handle.write(json.dumps(item, separators=(",", ":")) + "\n")
    contact_sheet(test_records, test_predictions, args.output_dir / "test-contact-sheet.jpg", "sealed test")
    onnx_path = args.output_dir / "model.onnx"
    export_onnx(model, onnx_path)
    runtime = {
        "schemaVersion": "wear-waist-hips-geometry-runtime/v3",
        "pipelineId": args.pipeline_id,
        "private": True,
        "published": False,
        "sdkReady": False,
        "inputs": ["canonical Blender mesh silhouette", "boundary", "mesh lines", *PROFILE_FIELDS],
        "outputs": ["rows", "breadth_cm", "depth_cm", "depth_ratio", "shape32"],
        "breadthConnectedToEndpoints": True,
        "geometryOnly": True,
        "recordedTapeUsed": False,
        "walkedPlyCircumferenceUsed": False,
    }
    (args.output_dir / "runtime.json").write_text(json.dumps(runtime, indent=2) + "\n")
    update_status(
        args.status_bucket, args.status_key,
        state="waiting", currentStage="geometry-review", overallPercent=100,
        currentStageLabel="Waist/hips geometry model finished private evaluation",
        detail="Nothing was installed or published. Review the validation and sealed-test visual cards.",
        model={
            "validationPassed": True, "sealed448Opened": True,
            "sealedTestPassed": test_report["passed"], "sdkReady": False,
        },
    )
    print(json.dumps({
        "pipelineId": args.pipeline_id, "validationPassed": True,
        "sealed448Opened": True, "sealedTestPassed": test_report["passed"],
        "testFailures": test_report["failures"],
    }, indent=2))


if __name__ == "__main__":
    main()
