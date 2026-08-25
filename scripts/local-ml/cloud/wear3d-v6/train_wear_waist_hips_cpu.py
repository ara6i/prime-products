#!/usr/bin/env python3
"""Train and audit the private waist/hips WEAR mesh model on CPU.

The input is the standardized Blender 2D mesh card plus height, weight, BMI,
and gender.  The 448 test people are never used for fitting normalization,
weights, early stopping, or model selection.

For each row the network predicts one connected path:

    y/left/right -> A-B breadth + C-D depth + 32-point shape
                 -> walked circumference -> recorded WEAR tape loss

There is no independent circumference head and no RGB/tape/Apple input.
"""

from __future__ import annotations

import argparse
from collections import Counter
from dataclasses import dataclass
from datetime import datetime, timezone
import hashlib
import json
import math
import os
from pathlib import Path
import random
from typing import Any

import boto3
import numpy as np
import onnx
from PIL import Image, ImageDraw, ImageFont
import torch
from torch import nn
from torch.nn import functional as F
from torch.utils.data import DataLoader, Dataset


ROW_NAMES = ("waist", "hips")
ROW_COLORS = {"waist": "#22d3ee", "hips": "#34d399"}
TRUTH_COLOR = "#fb923c"
CONTOUR_POINTS = 32
IMAGE_WIDTH = 128
IMAGE_HEIGHT = 192
PROFILE_FIELDS = ("height_cm", "weight_kg", "bmi", "female")
EDGE_FIELDS = ("y_norm", "left_x_norm", "right_x_norm")
GEOMETRY_FIELDS = 2 + CONTOUR_POINTS * 2
HALF_INCH_CM = 1.27
EXPECTED_TEST_SUBJECTS = 448
EXPECTED_ALL_SUBJECTS = 4_326
RANDOM_SEED = 20260823


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path)
    parser.add_argument("--audit", type=Path)
    parser.add_argument("--rendered-root", type=Path)
    parser.add_argument("--output-dir", type=Path)
    parser.add_argument("--pipeline-id", default="wear3d-waist-hips-onnx-cpu-v1-20260823")
    parser.add_argument("--epochs", type=int, default=30)
    parser.add_argument("--batch-size", type=int, default=128)
    parser.add_argument("--threads", type=int, default=min(64, os.cpu_count() or 8))
    parser.add_argument("--status-bucket")
    parser.add_argument("--status-key")
    parser.add_argument("--startup-smoke", action="store_true")
    return parser.parse_args()


def now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def finite(value: Any) -> float | None:
    try:
        result = float(value)
    except (TypeError, ValueError):
        return None
    return result if math.isfinite(result) else None


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def update_status(bucket: str | None, key: str | None, **updates: Any) -> None:
    if not bucket or not key:
        return
    s3 = boto3.client("s3")
    payload = json.loads(s3.get_object(Bucket=bucket, Key=key)["Body"].read())
    payload.update(updates)
    payload["updatedAt"] = now()
    s3.put_object(
        Bucket=bucket,
        Key=key,
        Body=(json.dumps(payload, indent=2) + "\n").encode(),
        ContentType="application/json",
        ServerSideEncryption="AES256",
    )


@dataclass
class Record:
    scan_id: str
    subject_id: str
    role: str
    mesh_path: Path
    mask_path: Path
    profile: np.ndarray
    edges: np.ndarray
    geometry: np.ndarray
    tape: np.ndarray
    row_mask: np.ndarray


@dataclass
class Normalization:
    profile_mean: np.ndarray
    profile_std: np.ndarray
    geometry_mean: np.ndarray
    geometry_std: np.ndarray


def artifact_path(raw: str, rendered_root: Path) -> Path:
    path = Path(raw)
    if path.exists():
        return path
    marker = "/rendered/"
    if marker not in raw:
        raise RuntimeError(f"Teacher artifact does not contain /rendered/: {raw}")
    candidate = rendered_root / raw.split(marker, 1)[1]
    if not candidate.exists():
        raise FileNotFoundError(candidate)
    return candidate


def read_records(
    manifest: Path,
    rendered_root: Path,
    include_roles: set[str] | None = None,
    *,
    require_tape: bool = True,
) -> list[Record]:
    records: list[Record] = []
    seen: set[str] = set()
    roles = Counter()
    subjects_by_role: dict[str, set[str]] = {role: set() for role in ("train", "validation", "test")}
    for line_number, line in enumerate(manifest.open(encoding="utf-8"), start=1):
        if not line.strip():
            continue
        source = json.loads(line)
        scan_id = str(source.get("scan_id") or "")
        role = str(source.get("role") or "")
        if not scan_id or role not in {"train", "validation", "test"}:
            raise RuntimeError(f"Invalid identity/split on manifest line {line_number}")
        if scan_id in seen:
            raise RuntimeError(f"Duplicate canonical card for {scan_id}")
        seen.add(scan_id)
        roles[role] += 1
        subject_id = str(source.get("subject_id") or scan_id.removesuffix("-A"))
        subjects_by_role[role].add(subject_id)
        # This allows a replacement trainer to keep the sealed test labels and
        # images unopened until validation has passed.  Identity/split counts
        # are still audited for the full manifest.
        if include_roles is not None and role not in include_roles:
            continue
        if source.get("error"):
            # Preserve subject accounting but no image exists for a corrupt PLY.
            continue
        if source.get("view_id") != "front-50":
            raise RuntimeError(f"Unexpected non-canonical view for {scan_id}")

        height = finite(source.get("height_cm"))
        weight = finite(source.get("weight_kg"))
        bmi = finite(source.get("bmi"))
        gender = str(source.get("gender") or "").lower()
        if None in (height, weight, bmi) or gender not in {"female", "male"}:
            raise RuntimeError(f"Invalid profile for {scan_id}")
        profile = np.asarray((height, weight, bmi, 1.0 if gender == "female" else 0.0), dtype=np.float32)

        edges = np.zeros((len(ROW_NAMES), len(EDGE_FIELDS)), dtype=np.float32)
        geometry = np.zeros((len(ROW_NAMES), GEOMETRY_FIELDS), dtype=np.float32)
        tape = np.zeros(len(ROW_NAMES), dtype=np.float32)
        row_mask = np.zeros(len(ROW_NAMES), dtype=np.float32)
        for row_index, row_name in enumerate(ROW_NAMES):
            row = (source.get("rows") or {}).get(row_name) or {}
            y = finite(row.get("y_norm"))
            left = finite(row.get("wear_edge_left_x_norm"))
            right = finite(row.get("wear_edge_right_x_norm"))
            breadth = finite(row.get("mesh_width_mm"))
            depth = finite(row.get("mesh_depth_mm"))
            circumference = finite(row.get("measurement_circumference_mm"))
            contour = row.get("contour_points_normalized")
            fully_connected = (
                row.get("accepted") is True
                and row.get("edge_target_valid") is True
                and row.get("depth_target_valid") is True
                and row.get("shape_target_valid") is True
                and (not require_tape or row.get("tape_target_valid") is True)
                and None not in (y, left, right, breadth, depth)
                and (not require_tape or circumference is not None)
                and isinstance(contour, list)
                and len(contour) == CONTOUR_POINTS
                and 0.0 <= left < right <= 1.0
                and 0.0 <= y <= 1.0
                and breadth > 0
                and depth > 0
                and (not require_tape or circumference > 0)
            )
            if not fully_connected:
                continue
            contour_array = np.asarray(contour, dtype=np.float32)
            if contour_array.shape != (CONTOUR_POINTS, 2) or not np.isfinite(contour_array).all():
                continue
            edges[row_index] = (y, left, right)
            geometry[row_index, 0] = breadth / 10.0
            geometry[row_index, 1] = depth / 10.0
            geometry[row_index, 2:] = contour_array.reshape(-1)
            tape[row_index] = (circumference or 0.0) / 10.0
            row_mask[row_index] = 1.0

        records.append(Record(
            scan_id=scan_id,
            subject_id=subject_id,
            role=role,
            mesh_path=artifact_path(str(source.get("mesh_image") or ""), rendered_root),
            mask_path=artifact_path(str(source.get("mask") or ""), rendered_root),
            profile=profile,
            edges=edges,
            geometry=geometry,
            tape=tape,
            row_mask=row_mask,
        ))

    if sum(roles.values()) != EXPECTED_ALL_SUBJECTS:
        raise RuntimeError(f"Manifest subject accounting {dict(roles)} != {EXPECTED_ALL_SUBJECTS}")
    if roles["test"] != EXPECTED_TEST_SUBJECTS:
        raise RuntimeError(f"Held-out test count {roles['test']} != {EXPECTED_TEST_SUBJECTS}")
    if len(subjects_by_role["test"]) != EXPECTED_TEST_SUBJECTS:
        raise RuntimeError("All 448 held-out people must have unique identities")
    split_sets = subjects_by_role
    if any(split_sets[a] & split_sets[b] for a, b in (("train", "validation"), ("train", "test"), ("validation", "test"))):
        raise RuntimeError("Subject leakage across train/validation/test")
    return records


def compute_normalization(records: list[Record]) -> Normalization:
    train = [record for record in records if record.role == "train"]
    profiles = np.stack([record.profile for record in train])
    geometry_mean = np.zeros((len(ROW_NAMES), GEOMETRY_FIELDS), dtype=np.float32)
    geometry_std = np.ones((len(ROW_NAMES), GEOMETRY_FIELDS), dtype=np.float32)
    for row_index in range(len(ROW_NAMES)):
        values = np.stack([
            record.geometry[row_index]
            for record in train
            if record.row_mask[row_index] > 0.5
        ])
        geometry_mean[row_index] = values.mean(axis=0)
        geometry_std[row_index] = np.maximum(values.std(axis=0), 1e-4)
    return Normalization(
        profile_mean=profiles.mean(axis=0),
        profile_std=np.maximum(profiles.std(axis=0), 1e-5),
        geometry_mean=geometry_mean,
        geometry_std=geometry_std,
    )


def load_channels(mesh_path: Path, mask_path: Path) -> np.ndarray:
    resampling = getattr(Image, "Resampling", Image)
    with Image.open(mesh_path) as image:
        mesh = np.asarray(
            image.convert("RGB").resize((IMAGE_WIDTH, IMAGE_HEIGHT), resampling.BILINEAR),
            dtype=np.uint8,
        )
    with Image.open(mask_path) as image:
        mask = np.asarray(
            image.convert("RGBA").resize((IMAGE_WIDTH, IMAGE_HEIGHT), resampling.NEAREST),
            dtype=np.uint8,
        )
    silhouette = ((mask[..., 3] > 127) & (mask[..., :3].max(axis=2) > 127)).astype(np.uint8)
    padded = np.pad(silhouette, 1)
    neighbors = [
        padded[dy:dy + IMAGE_HEIGHT, dx:dx + IMAGE_WIDTH]
        for dy in range(3)
        for dx in range(3)
    ]
    boundary = (np.maximum.reduce(neighbors) - np.minimum.reduce(neighbors)).astype(np.uint8)
    luma = mesh.max(axis=2)
    background_values = luma[silhouette == 0]
    background = int(np.median(background_values)) if background_values.size else 0
    mesh_lines = np.clip((luma.astype(np.int16) - background) * 255 // max(255 - background, 1), 0, 255).astype(np.uint8)
    mesh_lines *= silhouette
    return np.stack((silhouette * 255, boundary * 255, mesh_lines), axis=0)


class MeshDataset(Dataset):
    def __init__(self, records: list[Record], normalization: Normalization) -> None:
        self.records = records
        self.normalization = normalization
        self.channels = np.empty((len(records), 3, IMAGE_HEIGHT, IMAGE_WIDTH), dtype=np.uint8)
        for index, record in enumerate(records):
            self.channels[index] = load_channels(record.mesh_path, record.mask_path)
            if index and index % 500 == 0:
                print(f"cached_meshes={index}/{len(records)}", flush=True)

    def __len__(self) -> int:
        return len(self.records)

    def __getitem__(self, index: int):
        record = self.records[index]
        channels = self.channels[index].astype(np.float32) / 127.5 - 1.0
        profile = (record.profile - self.normalization.profile_mean) / self.normalization.profile_std
        geometry_z = (record.geometry - self.normalization.geometry_mean) / self.normalization.geometry_std
        return (
            torch.from_numpy(channels),
            torch.from_numpy(profile.astype(np.float32)),
            torch.from_numpy(record.edges),
            torch.from_numpy(geometry_z.astype(np.float32)),
            torch.from_numpy(record.geometry),
            torch.from_numpy(record.tape),
            torch.from_numpy(record.row_mask),
        )


def walk_shape(shape: torch.Tensor, breadth: torch.Tensor, depth: torch.Tensor) -> torch.Tensor:
    x = shape[..., 0]
    y = shape[..., 1]
    x_center = (x.amax(dim=-1) + x.amin(dim=-1)) * 0.5
    y_center = (y.amax(dim=-1) + y.amin(dim=-1)) * 0.5
    x_half = ((x.amax(dim=-1) - x.amin(dim=-1)) * 0.5).clamp_min(1e-4)
    y_half = ((y.amax(dim=-1) - y.amin(dim=-1)) * 0.5).clamp_min(1e-4)
    x_cm = (x - x_center.unsqueeze(-1)) / x_half.unsqueeze(-1) * breadth.unsqueeze(-1) * 0.5
    y_cm = (y - y_center.unsqueeze(-1)) / y_half.unsqueeze(-1) * depth.unsqueeze(-1) * 0.5
    return torch.sqrt(
        (torch.roll(x_cm, -1, dims=-1) - x_cm).square()
        + (torch.roll(y_cm, -1, dims=-1) - y_cm).square()
        + 1e-8
    ).sum(dim=-1)


class WaistHipMeshNet(nn.Module):
    def __init__(self, normalization: Normalization) -> None:
        super().__init__()
        self.vision = nn.Sequential(
            nn.Conv2d(3, 16, 5, 2, 2), nn.GroupNorm(4, 16), nn.SiLU(),
            nn.Conv2d(16, 32, 3, 2, 1), nn.GroupNorm(8, 32), nn.SiLU(),
            nn.Conv2d(32, 64, 3, 2, 1), nn.GroupNorm(8, 64), nn.SiLU(),
            nn.Conv2d(64, 96, 3, 2, 1), nn.GroupNorm(12, 96), nn.SiLU(),
            nn.Conv2d(96, 128, 3, 2, 1), nn.GroupNorm(16, 128), nn.SiLU(),
            # The final feature map is 6x4 for the fixed 192x128 input. Keep
            # the pooled size as an exact factor so the TorchScript ONNX
            # exporter can lower AdaptiveAvgPool2d without an unsupported op.
            nn.AdaptiveAvgPool2d((3, 2)),
        )
        self.profile = nn.Sequential(nn.Linear(len(PROFILE_FIELDS), 32), nn.SiLU(), nn.Linear(32, 32), nn.SiLU())
        self.shared = nn.Sequential(nn.Linear(128 * 3 * 2 + 32, 256), nn.SiLU(), nn.Dropout(0.10), nn.Linear(256, 160), nn.SiLU())
        self.edge_heads = nn.ModuleList([
            nn.Sequential(nn.Linear(160, 64), nn.SiLU(), nn.Linear(64, len(EDGE_FIELDS)))
            for _ in ROW_NAMES
        ])
        self.geometry_heads = nn.ModuleList([
            nn.Sequential(nn.Linear(160 + len(EDGE_FIELDS), 128), nn.SiLU(), nn.Linear(128, GEOMETRY_FIELDS))
            for _ in ROW_NAMES
        ])
        self.register_buffer("geometry_mean", torch.from_numpy(normalization.geometry_mean))
        self.register_buffer("geometry_std", torch.from_numpy(normalization.geometry_std))

    def forward(self, mesh: torch.Tensor, profile: torch.Tensor):
        visual = self.vision(mesh).flatten(1)
        shared = self.shared(torch.cat((visual, self.profile(profile)), dim=1))
        edges = torch.stack([torch.sigmoid(head(shared)) for head in self.edge_heads], dim=1)
        geometry_z = torch.stack([
            head(torch.cat((shared, edges[:, row_index]), dim=1))
            for row_index, head in enumerate(self.geometry_heads)
        ], dim=1)
        geometry = geometry_z * self.geometry_std.unsqueeze(0) + self.geometry_mean.unsqueeze(0)
        breadth = geometry[..., 0].clamp_min(1.0)
        depth = geometry[..., 1].clamp_min(1.0)
        shape = geometry[..., 2:].reshape(-1, len(ROW_NAMES), CONTOUR_POINTS, 2)
        ratio = depth / breadth.clamp_min(1e-4)
        circumference = walk_shape(shape, breadth, depth)
        return edges, breadth, depth, ratio, shape, circumference


def masked_mean(values: torch.Tensor, mask: torch.Tensor) -> torch.Tensor:
    while mask.ndim < values.ndim:
        mask = mask.unsqueeze(-1)
    return (values * mask).sum() / mask.expand_as(values).sum().clamp_min(1.0)


def batch_loss(model: WaistHipMeshNet, batch, device: torch.device) -> tuple[torch.Tensor, dict[str, float]]:
    mesh, profile, edge_target, geometry_z_target, geometry_target, tape_target, row_mask = [value.to(device) for value in batch]
    edges, breadth, depth, ratio, shape, circumference = model(mesh, profile)
    edge_loss = masked_mean(F.smooth_l1_loss(edges, edge_target, reduction="none"), row_mask)
    predicted_geometry = torch.cat((breadth.unsqueeze(-1), depth.unsqueeze(-1), shape.flatten(2)), dim=-1)
    predicted_z = (predicted_geometry - model.geometry_mean.unsqueeze(0)) / model.geometry_std.unsqueeze(0)
    bd_loss = masked_mean(F.smooth_l1_loss(predicted_z[..., :2], geometry_z_target[..., :2], reduction="none"), row_mask)
    shape_loss = masked_mean(F.smooth_l1_loss(predicted_z[..., 2:], geometry_z_target[..., 2:], reduction="none"), row_mask)
    target_ratio = geometry_target[..., 1] / geometry_target[..., 0].clamp_min(1e-4)
    ratio_loss = masked_mean(F.smooth_l1_loss(ratio, target_ratio, reduction="none"), row_mask)
    tape_loss = masked_mean(F.smooth_l1_loss(circumference / 10.0, tape_target / 10.0, reduction="none"), row_mask)
    loss = edge_loss * 5.0 + bd_loss * 1.5 + shape_loss + ratio_loss + tape_loss * 2.0
    return loss, {
        "edge": float(edge_loss.detach()),
        "breadth_depth": float(bd_loss.detach()),
        "shape": float(shape_loss.detach()),
        "ratio": float(ratio_loss.detach()),
        "tape": float(tape_loss.detach()),
    }


@torch.no_grad()
def evaluate_loss(model: WaistHipMeshNet, loader: DataLoader, device: torch.device) -> float:
    model.eval()
    losses = [float(batch_loss(model, batch, device)[0]) for batch in loader]
    return float(np.mean(losses)) if losses else float("inf")


@torch.no_grad()
def predict(model: WaistHipMeshNet, dataset: MeshDataset, device: torch.device, batch_size: int):
    model.eval()
    outputs = []
    for start in range(0, len(dataset), batch_size):
        end = min(start + batch_size, len(dataset))
        mesh = torch.from_numpy(dataset.channels[start:end].astype(np.float32) / 127.5 - 1.0).to(device)
        profiles = np.stack([
            (record.profile - dataset.normalization.profile_mean) / dataset.normalization.profile_std
            for record in dataset.records[start:end]
        ]).astype(np.float32)
        edges, breadth, depth, ratio, shape, circumference = model(mesh, torch.from_numpy(profiles).to(device))
        arrays = [value.cpu().numpy() for value in (edges, breadth, depth, ratio, shape, circumference)]
        for offset in range(end - start):
            outputs.append(tuple(array[offset] for array in arrays))
    return outputs


def metric_summary(values: list[float], *, limit: float | None = None) -> dict[str, Any]:
    if not values:
        return {"count": 0, "mae": None, "p95": None, "withinLimitRate": None}
    array = np.asarray(values, dtype=np.float64)
    result = {
        "count": int(array.size),
        "mae": round(float(array.mean()), 5),
        "p95": round(float(np.quantile(array, 0.95)), 5),
    }
    if limit is not None:
        result["limit"] = limit
        result["withinLimitRate"] = round(float((array <= limit).mean()), 6)
    return result


def build_report(records: list[Record], predictions, pipeline_id: str) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    row_errors: dict[str, dict[str, list[float]]] = {
        name: {key: [] for key in ("row_y_px", "left_px", "right_px", "breadth_cm", "depth_cm", "ratio", "shape", "circumference_cm")}
        for name in ROW_NAMES
    }
    prediction_rows: list[dict[str, Any]] = []
    for record, output in zip(records, predictions):
        edges, breadth, depth, ratio, shape, circumference = output
        item: dict[str, Any] = {
            "scanId": record.scan_id,
            "subjectId": record.subject_id,
            "role": record.role,
            "profile": dict(zip(PROFILE_FIELDS, [round(float(value), 5) for value in record.profile])),
            "rows": {},
        }
        for row_index, row_name in enumerate(ROW_NAMES):
            predicted = {
                "yNorm": round(float(edges[row_index, 0]), 7),
                "leftXNorm": round(float(edges[row_index, 1]), 7),
                "rightXNorm": round(float(edges[row_index, 2]), 7),
                "breadthCm": round(float(breadth[row_index]), 5),
                "depthCm": round(float(depth[row_index]), 5),
                "depthRatio": round(float(ratio[row_index]), 7),
                "shape32": np.round(shape[row_index], 7).tolist(),
                "circumferenceCm": round(float(circumference[row_index]), 5),
            }
            truth = None
            if record.row_mask[row_index] > 0.5:
                true_ratio = float(record.geometry[row_index, 1] / record.geometry[row_index, 0])
                truth = {
                    "yNorm": round(float(record.edges[row_index, 0]), 7),
                    "leftXNorm": round(float(record.edges[row_index, 1]), 7),
                    "rightXNorm": round(float(record.edges[row_index, 2]), 7),
                    "breadthCm": round(float(record.geometry[row_index, 0]), 5),
                    "depthCm": round(float(record.geometry[row_index, 1]), 5),
                    "depthRatio": round(true_ratio, 7),
                    "shape32": np.round(record.geometry[row_index, 2:].reshape(CONTOUR_POINTS, 2), 7).tolist(),
                    "tapeCm": round(float(record.tape[row_index]), 5),
                }
                errors = row_errors[row_name]
                errors["row_y_px"].append(abs(predicted["yNorm"] - truth["yNorm"]) * IMAGE_HEIGHT)
                errors["left_px"].append(abs(predicted["leftXNorm"] - truth["leftXNorm"]) * IMAGE_WIDTH)
                errors["right_px"].append(abs(predicted["rightXNorm"] - truth["rightXNorm"]) * IMAGE_WIDTH)
                errors["breadth_cm"].append(abs(predicted["breadthCm"] - truth["breadthCm"]))
                errors["depth_cm"].append(abs(predicted["depthCm"] - truth["depthCm"]))
                errors["ratio"].append(abs(predicted["depthRatio"] - truth["depthRatio"]))
                errors["shape"].append(float(np.abs(np.asarray(predicted["shape32"]) - np.asarray(truth["shape32"])).mean()))
                errors["circumference_cm"].append(abs(predicted["circumferenceCm"] - truth["tapeCm"]))
            item["rows"][row_name] = {"predicted": predicted, "truth": truth, "scored": truth is not None}
        prediction_rows.append(item)

    rows_report: dict[str, Any] = {}
    failures: list[str] = []
    for row_name, errors in row_errors.items():
        report = {
            "targetCoverage": len(errors["breadth_cm"]),
            "rowY": metric_summary(errors["row_y_px"], limit=IMAGE_HEIGHT * 0.01),
            "leftEndpoint": metric_summary(errors["left_px"], limit=IMAGE_WIDTH * 0.01),
            "rightEndpoint": metric_summary(errors["right_px"], limit=IMAGE_WIDTH * 0.01),
            "breadth": metric_summary(errors["breadth_cm"], limit=HALF_INCH_CM),
            "depth": metric_summary(errors["depth_cm"], limit=HALF_INCH_CM),
            "depthRatio": metric_summary(errors["ratio"]),
            "shape32": metric_summary(errors["shape"], limit=0.15),
            "connectedCircumferenceVsTape": metric_summary(errors["circumference_cm"], limit=HALF_INCH_CM),
        }
        rows_report[row_name] = report
        for key in ("breadth", "depth", "connectedCircumferenceVsTape"):
            rate = report[key].get("withinLimitRate")
            if rate is None or rate < 0.97:
                failures.append(f"{row_name}.{key} half-inch rate {rate} < 0.97")
        if report["rowY"].get("mae") is None or report["rowY"]["mae"] > IMAGE_HEIGHT * 0.01:
            failures.append(f"{row_name}.rowY MAE exceeds 1% body-card height")
        if report["shape32"].get("mae") is None or report["shape32"]["mae"] > 0.15:
            failures.append(f"{row_name}.shape32 MAE exceeds 0.15 normalized units")

    report = {
        "schemaVersion": "wear-waist-hips-cpu-test/v1",
        "pipelineId": pipeline_id,
        "generatedAt": now(),
        "subjectSplits": Counter(record.role for record in records),
        "heldOutSubjectsSeenByOptimizer": 0,
        "heldOutTestSubjects": len(records),
        "rows": rows_report,
        "requiredHalfInchRate": 0.97,
        "failures": failures,
        "candidatePassed": not failures and len(records) == EXPECTED_TEST_SUBJECTS,
        "releaseApproved": False,
        "sdkReady": False,
    }
    return report, prediction_rows


def draw_shape(draw: ImageDraw.ImageDraw, points: np.ndarray, box: tuple[int, int, int, int], color: str, width: int) -> None:
    x0, y0, x1, y1 = box
    center = np.asarray(((x0 + x1) / 2, (y0 + y1) / 2))
    scale = np.asarray(((x1 - x0) * 0.44, (y1 - y0) * 0.44))
    coords = center + points * scale
    loop = [tuple(map(float, point)) for point in coords] + [tuple(map(float, coords[0]))]
    draw.line(loop, fill=color, width=width, joint="curve")


def make_contact_sheet(records: list[Record], predictions, output: Path) -> None:
    randomizer = random.Random(RANDOM_SEED)
    eligible = [index for index, record in enumerate(records) if record.row_mask.sum() == len(ROW_NAMES)]
    selected = sorted(randomizer.sample(eligible, min(24, len(eligible))))
    card_width, card_height, columns = 430, 360, 4
    rows = math.ceil(len(selected) / columns)
    sheet = Image.new("RGB", (card_width * columns, card_height * rows), "#07111f")
    font = ImageFont.load_default()
    resampling = getattr(Image, "Resampling", Image)
    for position, record_index in enumerate(selected):
        record = records[record_index]
        edges, breadth, depth, ratio, shape, circumference = predictions[record_index]
        card = Image.new("RGB", (card_width, card_height), "#0f1b2e")
        draw = ImageDraw.Draw(card)
        with Image.open(record.mesh_path) as source:
            body = source.convert("RGB")
        body.thumbnail((220, 292), resampling.LANCZOS)
        body_x, body_y = 8, 44
        card.paste(body, (body_x, body_y))
        sx, sy = body.width, body.height
        for row_index, row_name in enumerate(ROW_NAMES):
            truth = record.edges[row_index]
            pred = edges[row_index]
            ty = body_y + truth[0] * sy
            py = body_y + pred[0] * sy
            draw.line((body_x + truth[1] * sx, ty, body_x + truth[2] * sx, ty), fill=TRUTH_COLOR, width=3)
            draw.line((body_x + pred[1] * sx, py, body_x + pred[2] * sx, py), fill=ROW_COLORS[row_name], width=2)
        draw.text((8, 8), f"{record.scan_id} · unseen test", fill="white", font=font)
        draw.text((8, 24), "orange truth · cyan/green ONNX", fill="#9fb0c8", font=font)
        text_x = 238
        for row_index, row_name in enumerate(ROW_NAMES):
            top = 52 + row_index * 150
            truth_b = record.geometry[row_index, 0]
            truth_d = record.geometry[row_index, 1]
            truth_t = record.tape[row_index]
            draw.text((text_x, top), row_name.upper(), fill=ROW_COLORS[row_name], font=font)
            draw.text((text_x, top + 16), f"A-B {breadth[row_index]:.1f}/{truth_b:.1f} cm", fill="white", font=font)
            draw.text((text_x, top + 30), f"C-D {depth[row_index]:.1f}/{truth_d:.1f} cm", fill="white", font=font)
            draw.text((text_x, top + 44), f"ratio {ratio[row_index]:.3f}", fill="white", font=font)
            draw.text((text_x, top + 58), f"walk/tape {circumference[row_index]:.1f}/{truth_t:.1f}", fill="white", font=font)
            truth_shape = record.geometry[row_index, 2:].reshape(CONTOUR_POINTS, 2)
            draw_shape(draw, truth_shape, (text_x, top + 75, text_x + 170, top + 140), TRUTH_COLOR, 2)
            draw_shape(draw, shape[row_index], (text_x, top + 75, text_x + 170, top + 140), ROW_COLORS[row_name], 2)
        sheet.paste(card, ((position % columns) * card_width, (position // columns) * card_height))
    output.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output, quality=92)


def export_onnx(model: WaistHipMeshNet, output: Path) -> None:
    model.eval().cpu()
    mesh = torch.zeros(1, 3, IMAGE_HEIGHT, IMAGE_WIDTH, dtype=torch.float32)
    profile = torch.zeros(1, len(PROFILE_FIELDS), dtype=torch.float32)
    torch.onnx.export(
        model,
        (mesh, profile),
        output,
        input_names=["mesh_channels", "profile"],
        output_names=["rows", "breadth_cm", "depth_cm", "depth_ratio", "shape32", "circumference_cm"],
        dynamic_axes={name: {0: "batch"} for name in (
            "mesh_channels", "profile", "rows", "breadth_cm", "depth_cm", "depth_ratio", "shape32", "circumference_cm"
        )},
        opset_version=18,
        dynamo=False,
    )
    model_proto = onnx.load(output)
    onnx.checker.check_model(model_proto)


def startup_smoke() -> None:
    normalization = Normalization(
        np.zeros(len(PROFILE_FIELDS), dtype=np.float32),
        np.ones(len(PROFILE_FIELDS), dtype=np.float32),
        np.zeros((len(ROW_NAMES), GEOMETRY_FIELDS), dtype=np.float32),
        np.ones((len(ROW_NAMES), GEOMETRY_FIELDS), dtype=np.float32),
    )
    model = WaistHipMeshNet(normalization)
    outputs = model(torch.zeros(2, 3, IMAGE_HEIGHT, IMAGE_WIDTH), torch.zeros(2, len(PROFILE_FIELDS)))
    expected = ((2, 2, 3), (2, 2), (2, 2), (2, 2), (2, 2, 32, 2), (2, 2))
    actual = tuple(tuple(value.shape) for value in outputs)
    if actual != expected:
        raise RuntimeError(f"Startup output contract {actual} != {expected}")
    smoke_path = Path("/tmp/wear-waist-hips-smoke.onnx")
    export_onnx(model, smoke_path)
    print(json.dumps({"startupSmoke": "passed", "outputs": actual, "onnxBytes": smoke_path.stat().st_size}))


def main() -> None:
    args = parse_args()
    if args.startup_smoke:
        startup_smoke()
        return
    required = (args.manifest, args.audit, args.rendered_root, args.output_dir)
    if any(value is None for value in required):
        raise RuntimeError("--manifest, --audit, --rendered-root and --output-dir are required")
    args.output_dir.mkdir(parents=True, exist_ok=True)
    torch.manual_seed(RANDOM_SEED)
    np.random.seed(RANDOM_SEED)
    random.seed(RANDOM_SEED)
    torch.set_num_threads(max(1, args.threads))
    torch.set_num_interop_threads(min(8, max(1, args.threads // 4)))

    audit = json.loads(args.audit.read_text(encoding="utf-8"))
    audit_summary = audit.get("summary") or {}
    if audit_summary.get("trainingAllowed") is not True:
        raise RuntimeError("Waist/hips teacher audit does not permit training")
    if audit_summary.get("renderManifestSha256") != sha256(args.manifest):
        raise RuntimeError("Teacher manifest hash does not match the approved audit")

    update_status(
        args.status_bucket, args.status_key,
        state="running", overallPercent=78, currentStage="train-waist-hips-cpu",
        currentStageLabel="Loading audited Blender waist/hips teachers",
        detail="The 448 test people stay unseen. CPU is caching topology-safe Blender mesh channels; no RGB photo or tape is an input.",
    )
    records = read_records(args.manifest, args.rendered_root)
    normalization = compute_normalization(records)
    by_role = {role: [record for record in records if record.role == role] for role in ("train", "validation", "test")}
    datasets = {role: MeshDataset(split, normalization) for role, split in by_role.items()}
    train_loader = DataLoader(datasets["train"], batch_size=args.batch_size, shuffle=True, num_workers=0)
    validation_loader = DataLoader(datasets["validation"], batch_size=args.batch_size * 2, shuffle=False, num_workers=0)

    device = torch.device("cpu")
    model = WaistHipMeshNet(normalization).to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=7e-4, weight_decay=1e-4)
    scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(optimizer, T_max=max(args.epochs, 1), eta_min=5e-5)
    best_state = None
    best_validation = float("inf")
    history: list[dict[str, Any]] = []
    patience = 7
    stale = 0
    update_status(
        args.status_bucket, args.status_key,
        state="running", overallPercent=82, currentStage="train-waist-hips-cpu",
        currentStageLabel="Training connected waist/hips geometry on CPU",
        detail=f"{len(by_role['train']):,} training inputs; {len(by_role['validation']):,} validation inputs; 448 test people remain sealed.",
    )
    for epoch in range(1, args.epochs + 1):
        model.train()
        train_losses = []
        parts: dict[str, list[float]] = {name: [] for name in ("edge", "breadth_depth", "shape", "ratio", "tape")}
        for batch in train_loader:
            optimizer.zero_grad(set_to_none=True)
            loss, values = batch_loss(model, batch, device)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(model.parameters(), 5.0)
            optimizer.step()
            train_losses.append(float(loss.detach()))
            for name, value in values.items():
                parts[name].append(value)
        validation_loss = evaluate_loss(model, validation_loader, device)
        scheduler.step()
        epoch_report = {
            "epoch": epoch,
            "trainLoss": round(float(np.mean(train_losses)), 7),
            "validationLoss": round(validation_loss, 7),
            "learningRate": optimizer.param_groups[0]["lr"],
            "parts": {name: round(float(np.mean(values)), 7) for name, values in parts.items()},
        }
        history.append(epoch_report)
        print(json.dumps(epoch_report), flush=True)
        if validation_loss + 1e-5 < best_validation:
            best_validation = validation_loss
            best_state = {name: value.detach().cpu().clone() for name, value in model.state_dict().items()}
            stale = 0
        else:
            stale += 1
        if stale >= patience:
            break

    if best_state is None:
        raise RuntimeError("CPU training produced no checkpoint")
    model.load_state_dict(best_state)
    model_path = args.output_dir / "model.pt"
    torch.save({
        "pipelineId": args.pipeline_id,
        "stateDict": best_state,
        "normalization": {
            "profileMean": normalization.profile_mean.tolist(),
            "profileStd": normalization.profile_std.tolist(),
            "geometryMean": normalization.geometry_mean.tolist(),
            "geometryStd": normalization.geometry_std.tolist(),
        },
        "rowNames": ROW_NAMES,
    }, model_path)

    update_status(
        args.status_bucket, args.status_key,
        state="running", overallPercent=93, currentStage="evaluate-waist-hips-cpu",
        currentStageLabel="Testing all 448 unseen WEAR people",
        detail="Weights are frozen. Tape is now revealed only for scoring the connected walked shape.",
    )
    test_predictions = predict(model, datasets["test"], device, args.batch_size * 2)
    report, prediction_rows = build_report(by_role["test"], test_predictions, args.pipeline_id)
    report["teacherManifestSha256"] = sha256(args.manifest)
    report["modelStateSha256"] = sha256(model_path)
    report["training"] = {
        "device": "cpu",
        "epochsCompleted": len(history),
        "bestValidationLoss": round(best_validation, 7),
        "input": "Blender 2D mesh channels plus height, weight, BMI and gender",
        "circumferenceHead": False,
        "circumferencePath": "walk(predicted 32-point shape resized by predicted A-B and C-D)",
    }
    (args.output_dir / "test-metrics.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    with (args.output_dir / "test-predictions.jsonl").open("w", encoding="utf-8") as handle:
        for item in prediction_rows:
            handle.write(json.dumps(item, separators=(",", ":")) + "\n")
    (args.output_dir / "training-history.json").write_text(json.dumps(history, indent=2) + "\n", encoding="utf-8")
    runtime = {
        "schemaVersion": "wear-waist-hips-onnx-runtime/v1",
        "pipelineId": args.pipeline_id,
        "private": True,
        "published": False,
        "sdkReady": False,
        "rowNames": ROW_NAMES,
        "profileFields": PROFILE_FIELDS,
        "image": {"width": IMAGE_WIDTH, "height": IMAGE_HEIGHT, "channels": ("silhouette", "boundary", "mesh-lines")},
        "outputs": ("rows", "breadth_cm", "depth_cm", "depth_ratio", "shape32", "circumference_cm"),
        "cameraNormalization": "not-in-this-canonical-front-50-candidate",
        "normalization": {
            "profileMean": normalization.profile_mean.tolist(),
            "profileStd": normalization.profile_std.tolist(),
        },
    }
    (args.output_dir / "runtime.json").write_text(json.dumps(runtime, indent=2) + "\n", encoding="utf-8")
    onnx_path = args.output_dir / "model.onnx"
    export_onnx(model, onnx_path)
    report["modelOnnxSha256"] = sha256(onnx_path)
    (args.output_dir / "test-metrics.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    make_contact_sheet(by_role["test"], test_predictions, args.output_dir / "test-contact-sheet.jpg")

    update_status(
        args.status_bucket, args.status_key,
        state="waiting", overallPercent=100, currentStage="review-waist-hips-cpu",
        currentStageLabel="New waist/hips ONNX tested on 448 unseen people",
        detail=(
            "Candidate passed the strict private gates; real-photo camera normalization is still required before use."
            if report["candidatePassed"] else
            "Candidate artifacts are preserved for diagnosis; it failed one or more strict held-out gates and is not installed."
        ),
        model={
            "syntheticCandidatePassed": report["candidatePassed"],
            "sdkReady": False,
            "heldOutTestSubjects": EXPECTED_TEST_SUBJECTS,
            "artifactPrefix": f"s3://{args.status_bucket}/models/{args.pipeline_id}/" if args.status_bucket else None,
            "failures": report["failures"],
        },
    )
    print(json.dumps({
        "pipelineId": args.pipeline_id,
        "candidatePassed": report["candidatePassed"],
        "testSubjects": EXPECTED_TEST_SUBJECTS,
        "failures": report["failures"],
        "output": str(args.output_dir),
    }, indent=2))


if __name__ == "__main__":
    main()
