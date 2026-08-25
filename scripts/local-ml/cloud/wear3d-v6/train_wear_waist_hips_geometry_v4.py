#!/usr/bin/env python3
"""Train the v8 CPU-only WEAR waist/hip geometry candidate.

Architecture changes from the rejected v3/v4 candidates:

* all 73 projected WEAR landmarks remain explicit auxiliary supervision, but
  noisy predicted landmarks are never fed back into waist/hip inference;
* each anatomical row has its own full-height visual/profile tower instead of
  sharing one head conditioned by 146 noisy landmark coordinates;
* left/right endpoints are calculated from the central visible mesh component
  at that row, never learned;
* geometry has a separate image encoder and sees a multi-row band around the
  selected row plus the whole outline profile; it never tries to infer a 3D
  section from one thin feature row;
* the 32-point section is represented by a training-only PCA basis instead of
  64 independent coordinates that regress toward an average body;
* training is step-based and staged: landmarks/rows, then geometry at the
  exact teacher row, then geometry-only adaptation at predicted rows;
* the best checkpoint is selected by the real inference-path gate metrics, not
  by incomparable teacher-row/adapt losses or simply by choosing the last
  training stage.

Recorded tape and walked PLY circumference are not read or predicted here.
"""

from __future__ import annotations

import argparse
from dataclasses import dataclass
import json
import math
import os
from pathlib import Path
import random
from typing import Any

import numpy as np
from PIL import Image, ImageDraw, ImageFont
import torch
from torch import nn
from torch.nn import functional as F
from torch.utils.data import DataLoader, Dataset


ROWS = ("waist", "hips")
ROW_COLORS = ("#22d3ee", "#34d399")
TRUTH_COLOR = "#fb923c"
HEIGHT = 256
WIDTH = 192
POINTS = 32
PCA_COMPONENTS = 16
PROFILE_FIELDS = ("height_cm", "weight_kg", "bmi", "female")
LANDMARK_COUNT = 73
SEED = 20260824


@dataclass
class Record:
    scan_id: str
    role: str
    mesh_path: Path
    mask_path: Path
    profile: np.ndarray
    edges: np.ndarray
    geometry: np.ndarray
    row_mask: np.ndarray
    landmarks: np.ndarray
    landmark_mask: np.ndarray


@dataclass
class GeometryStats:
    profile_mean: np.ndarray
    profile_std: np.ndarray
    target_mean: np.ndarray
    target_std: np.ndarray
    shape_mean: np.ndarray
    shape_components: np.ndarray


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path)
    parser.add_argument("--output-dir", type=Path)
    parser.add_argument("--batch-size", type=int, default=32)
    parser.add_argument("--threads", type=int, default=min(12, os.cpu_count() or 4))
    parser.add_argument("--spatial-steps", type=int, default=600)
    parser.add_argument("--geometry-steps", type=int, default=700)
    parser.add_argument("--adapt-steps", type=int, default=700)
    parser.add_argument("--eval-every", type=int, default=50)
    parser.add_argument("--train-limit", type=int, default=0)
    parser.add_argument("--validation-limit", type=int, default=0)
    parser.add_argument("--startup-smoke", action="store_true")
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
        rendered_index = max(index for index, part in enumerate(path.parts) if part == "rendered")
        rendered_candidate = manifest.parent / "rendered" / Path(*path.parts[rendered_index + 1 :])
    for candidate in (path, Path.cwd() / path, rendered_candidate, manifest.parent / path.name):
        if candidate is None:
            continue
        if candidate.exists():
            return candidate.resolve()
    raise FileNotFoundError(raw)


def read_records(
    manifest: Path,
    allowed_roles: tuple[str, ...] = ("train", "validation"),
) -> list[Record]:
    records: list[Record] = []
    identities: dict[str, str] = {}
    landmark_names: tuple[str, ...] | None = None
    for line in manifest.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        source = json.loads(line)
        role = str(source.get("role") or "")
        if role not in set(allowed_roles):
            continue
        subject_id = str(source.get("subject_id") or "")
        previous = identities.setdefault(subject_id, role)
        if previous != role:
            raise RuntimeError(f"Subject leakage for {subject_id}: {previous}/{role}")
        if source.get("view_id") != "front-50" or source.get("error"):
            continue
        height = finite(source.get("height_cm"))
        weight = finite(source.get("weight_kg"))
        bmi = finite(source.get("bmi"))
        gender = str(source.get("gender") or "").lower()
        if None in (height, weight, bmi) or gender not in {"female", "male"}:
            continue
        landmark_source = source.get("landmarks_2d") or {}
        current_landmark_names = tuple(sorted(landmark_source))
        if landmark_names is None:
            landmark_names = current_landmark_names
        if current_landmark_names != landmark_names or len(current_landmark_names) != LANDMARK_COUNT:
            raise RuntimeError(f"{source.get('scan_id')} does not use the canonical {LANDMARK_COUNT}-landmark order")
        landmarks = np.zeros((LANDMARK_COUNT, 2), dtype=np.float32)
        landmark_mask = np.zeros(LANDMARK_COUNT, dtype=np.float32)
        for landmark_index, landmark_name in enumerate(landmark_names):
            point = landmark_source[landmark_name]
            x, y = finite(point.get("x")), finite(point.get("y"))
            if x is None or y is None:
                continue
            landmarks[landmark_index] = (x, y)
            landmark_mask[landmark_index] = 1.0
        edges = np.zeros((2, 3), dtype=np.float32)
        geometry = np.zeros((2, 2 + POINTS * 2), dtype=np.float32)
        row_mask = np.zeros(2, dtype=np.float32)
        for row_index, row_name in enumerate(ROWS):
            row = (source.get("rows") or {}).get(row_name) or {}
            contour = np.asarray(row.get("contour_points_normalized") or [], dtype=np.float32)
            values = (
                finite(row.get("y_norm")),
                finite(row.get("wear_edge_left_x_norm")),
                finite(row.get("wear_edge_right_x_norm")),
                finite(row.get("mesh_width_mm")),
                finite(row.get("mesh_depth_mm")),
            )
            ready = (
                all(row.get(flag) is True for flag in ("accepted", "edge_target_valid", "depth_target_valid", "shape_target_valid"))
                and None not in values
                and contour.shape == (POINTS, 2)
                and np.isfinite(contour).all()
            )
            if not ready:
                continue
            y, left, right, breadth_mm, depth_mm = values
            assert None not in (y, left, right, breadth_mm, depth_mm)
            edges[row_index] = (y, left, right)
            geometry[row_index, 0] = breadth_mm / 10.0
            geometry[row_index, 1] = depth_mm / 10.0
            geometry[row_index, 2:] = contour.reshape(-1)
            row_mask[row_index] = 1.0
        records.append(
            Record(
                scan_id=str(source["scan_id"]),
                role=role,
                mesh_path=resolve_artifact(str(source["mesh_image"]), manifest),
                mask_path=resolve_artifact(str(source["mask"]), manifest),
                profile=np.asarray((height, weight, bmi, 1.0 if gender == "female" else 0.0), dtype=np.float32),
                edges=edges,
                geometry=geometry,
                row_mask=row_mask,
                landmarks=landmarks,
                landmark_mask=landmark_mask,
            )
        )
    if not records:
        raise RuntimeError(f"No records found for roles: {allowed_roles}")
    for required_role in allowed_roles:
        if not any(record.role == required_role for record in records):
            raise RuntimeError(f"No {required_role} records found")
    train_ids = {record.scan_id.rsplit("-", 1)[0] for record in records if record.role == "train"}
    validation_ids = {record.scan_id.rsplit("-", 1)[0] for record in records if record.role == "validation"}
    if train_ids & validation_ids:
        raise RuntimeError("Train/validation identity leakage")
    return records


def runs(row: np.ndarray) -> list[tuple[int, int]]:
    padded = np.pad(row.astype(np.int8), (1, 1))
    changes = np.diff(padded)
    return [
        (int(left), int(right - 1))
        for left, right in zip(np.flatnonzero(changes == 1), np.flatnonzero(changes == -1))
    ]


def central_run_profiles(silhouette: np.ndarray) -> np.ndarray:
    height, width = silhouette.shape
    center = (width - 1) * 0.5
    output = np.zeros((height, 2), dtype=np.float32)
    previous = np.asarray((center, center), dtype=np.float32)
    for y in range(height):
        candidates = []
        for left, right in runs(silhouette[y]):
            if right - left + 1 < width * 0.025:
                continue
            contains = left <= center <= right
            distance = 0.0 if contains else min(abs(center - left), abs(center - right))
            score = (0.0 if contains else 1_000.0) + distance - (right - left) * 0.01
            candidates.append((score, left, right))
        if candidates:
            _, left, right = min(candidates)
            previous = np.asarray((left / (width - 1), right / (width - 1)), dtype=np.float32)
        output[y] = previous
    return output


def load_inputs(mesh_path: Path, mask_path: Path) -> tuple[np.ndarray, np.ndarray]:
    resampling = getattr(Image, "Resampling", Image)
    with Image.open(mesh_path) as image:
        mesh = np.asarray(image.convert("RGB").resize((WIDTH, HEIGHT), resampling.BILINEAR), dtype=np.uint8)
    with Image.open(mask_path) as image:
        mask = np.asarray(image.convert("RGBA").resize((WIDTH, HEIGHT), resampling.NEAREST), dtype=np.uint8)
    silhouette = ((mask[..., 3] > 127) & (mask[..., :3].max(axis=2) > 127)).astype(np.float32)
    padded = np.pad(silhouette, 1)
    neighbors = [padded[dy : dy + HEIGHT, dx : dx + WIDTH] for dy in range(3) for dx in range(3)]
    boundary = (np.maximum.reduce(neighbors) - np.minimum.reduce(neighbors)).astype(np.float32)
    luma = mesh.max(axis=2).astype(np.float32)
    background_values = luma[silhouette < 0.5]
    background = float(np.median(background_values)) if background_values.size else 0.0
    mesh_lines = np.clip((luma - background) / max(255.0 - background, 1.0), 0.0, 1.0) * silhouette
    x = np.broadcast_to(np.linspace(-1.0, 1.0, WIDTH, dtype=np.float32), (HEIGHT, WIDTH))
    y = np.broadcast_to(np.linspace(-1.0, 1.0, HEIGHT, dtype=np.float32)[:, None], (HEIGHT, WIDTH))
    channels = np.stack((silhouette, boundary, mesh_lines, x, y), axis=0).astype(np.float32)
    return channels, central_run_profiles(silhouette)


def shape_basis(records: list[Record]) -> tuple[np.ndarray, np.ndarray]:
    means = np.zeros((2, POINTS * 2), dtype=np.float32)
    components = np.zeros((2, PCA_COMPONENTS, POINTS * 2), dtype=np.float32)
    for row in range(2):
        matrix = np.stack(
            [record.geometry[row, 2:] for record in records if record.role == "train" and record.row_mask[row] > 0.5]
        ).astype(np.float64)
        mean = matrix.mean(0)
        _, _, vt = np.linalg.svd(matrix - mean, full_matrices=False)
        count = min(PCA_COMPONENTS, len(vt))
        means[row] = mean.astype(np.float32)
        components[row, :count] = vt[:count].astype(np.float32)
    return means, components


def compute_stats(records: list[Record], cached: dict[str, tuple[np.ndarray, np.ndarray]]) -> GeometryStats:
    train = [record for record in records if record.role == "train"]
    profiles = np.stack([record.profile for record in train])
    shape_mean, shape_components = shape_basis(records)
    targets: list[list[np.ndarray]] = [[], []]
    for record in train:
        _, run_profiles = cached[record.scan_id]
        for row in range(2):
            if record.row_mask[row] <= 0.5:
                continue
            row_index = int(np.clip(round(record.edges[row, 0] * (HEIGHT - 1)), 0, HEIGHT - 1))
            span = max(float(run_profiles[row_index, 1] - run_profiles[row_index, 0]), 1e-5)
            scale = float(record.geometry[row, 0]) / span
            depth = float(record.geometry[row, 1])
            centered = record.geometry[row, 2:] - shape_mean[row]
            coefficients = shape_components[row] @ centered
            targets[row].append(np.concatenate(([scale, depth], coefficients)).astype(np.float32))
    target_mean = np.stack([np.stack(values).mean(0) for values in targets]).astype(np.float32)
    target_std = np.stack([np.maximum(np.stack(values).std(0), 1e-4) for values in targets]).astype(np.float32)
    return GeometryStats(
        profile_mean=profiles.mean(0).astype(np.float32),
        profile_std=np.maximum(profiles.std(0), 1e-4).astype(np.float32),
        target_mean=target_mean,
        target_std=target_std,
        shape_mean=shape_mean,
        shape_components=shape_components,
    )


class GeometryDataset(Dataset):
    def __init__(
        self,
        records: list[Record],
        stats: GeometryStats | None = None,
        cached: dict[str, tuple[np.ndarray, np.ndarray]] | None = None,
    ) -> None:
        self.records = records
        self.cached = cached or {record.scan_id: load_inputs(record.mesh_path, record.mask_path) for record in records}
        self.stats = stats or compute_stats(records, self.cached)
        self.targets = np.zeros((len(records), 2, 2 + PCA_COMPONENTS), dtype=np.float32)
        self.row_indexes = np.zeros((len(records), 2), dtype=np.int64)
        for index, record in enumerate(records):
            _, run_profiles = self.cached[record.scan_id]
            for row in range(2):
                row_index = int(np.clip(round(record.edges[row, 0] * (HEIGHT - 1)), 0, HEIGHT - 1))
                self.row_indexes[index, row] = row_index
                if record.row_mask[row] <= 0.5:
                    continue
                span = max(float(run_profiles[row_index, 1] - run_profiles[row_index, 0]), 1e-5)
                scale = float(record.geometry[row, 0]) / span
                depth = float(record.geometry[row, 1])
                coefficients = self.stats.shape_components[row] @ (
                    record.geometry[row, 2:] - self.stats.shape_mean[row]
                )
                raw = np.concatenate(([scale, depth], coefficients)).astype(np.float32)
                self.targets[index, row] = (raw - self.stats.target_mean[row]) / self.stats.target_std[row]

    def __len__(self) -> int:
        return len(self.records)

    def __getitem__(self, index: int):
        record = self.records[index]
        channels, run_profiles = self.cached[record.scan_id]
        profile = (record.profile - self.stats.profile_mean) / self.stats.profile_std
        values = (
            channels,
            profile.astype(np.float32),
            run_profiles,
            self.row_indexes[index],
            record.edges,
            record.geometry,
            self.targets[index],
            record.row_mask,
            record.landmarks,
            record.landmark_mask,
        )
        return tuple(torch.from_numpy(np.asarray(value)) for value in values)


class ConvBlock(nn.Module):
    def __init__(self, inputs: int, outputs: int) -> None:
        super().__init__()
        groups = max(1, outputs // 8)
        self.layers = nn.Sequential(
            nn.Conv2d(inputs, outputs, 3, padding=1),
            nn.GroupNorm(groups, outputs),
            nn.SiLU(),
            nn.Conv2d(outputs, outputs, 3, padding=1),
            nn.GroupNorm(groups, outputs),
            nn.SiLU(),
        )

    def forward(self, value: torch.Tensor) -> torch.Tensor:
        return self.layers(value)


class RowResidualBlock(nn.Module):
    def __init__(self, channels: int, dilation: int) -> None:
        super().__init__()
        self.layers = nn.Sequential(
            nn.Conv1d(channels, channels, 5, padding=2 * dilation, dilation=dilation),
            nn.GroupNorm(16, channels),
            nn.SiLU(),
            nn.Conv1d(channels, channels, 3, padding=dilation, dilation=dilation),
            nn.GroupNorm(16, channels),
        )

    def forward(self, value: torch.Tensor) -> torch.Tensor:
        return F.silu(value + self.layers(value))


class GeometryHead(nn.Module):
    def __init__(self, inputs: int) -> None:
        super().__init__()
        self.trunk = nn.Sequential(
            nn.Linear(inputs, 640),
            nn.LayerNorm(640),
            nn.SiLU(),
            nn.Dropout(0.04),
            nn.Linear(640, 320),
            nn.LayerNorm(320),
            nn.SiLU(),
        )
        self.scale = nn.Sequential(nn.Linear(320, 96), nn.SiLU(), nn.Linear(96, 1))
        self.depth = nn.Sequential(nn.Linear(320, 128), nn.SiLU(), nn.Linear(128, 1))
        self.shape = nn.Sequential(nn.Linear(320, 256), nn.SiLU(), nn.Linear(256, PCA_COMPONENTS))

    def forward(self, value: torch.Tensor) -> torch.Tensor:
        features = self.trunk(value)
        return torch.cat((self.scale(features), self.depth(features), self.shape(features)), -1)


class WaistHipGeometryV8(nn.Module):
    def __init__(self, stats: GeometryStats) -> None:
        super().__init__()
        # This branch preserves all 256 vertical positions. Width is reduced,
        # because the target is a horizontal anatomical row, never a point.
        self.row_visual = nn.Sequential(
            nn.Conv2d(5, 32, (5, 7), stride=(1, 2), padding=(2, 3)),
            nn.GroupNorm(4, 32),
            nn.SiLU(),
            nn.Conv2d(32, 32, 5, padding=2, groups=32),
            nn.Conv2d(32, 48, 1),
            nn.GroupNorm(8, 48),
            nn.SiLU(),
            nn.Conv2d(48, 48, 5, padding=2, groups=48),
            nn.Conv2d(48, 48, 1),
            nn.GroupNorm(8, 48),
            nn.SiLU(),
        )
        self.profile = nn.Sequential(nn.Linear(4, 32), nn.SiLU(), nn.Linear(32, 24), nn.SiLU())
        self.row_profile = nn.Sequential(nn.Linear(24, 48), nn.SiLU(), nn.Linear(48, 32), nn.SiLU())
        self.landmark_head = nn.Sequential(
            nn.Conv2d(48, 64, 3, padding=1),
            nn.SiLU(),
            nn.Conv2d(64, LANDMARK_COUNT, 1),
        )
        row_inputs = 48 * 2 + 7 + 32
        self.row_towers = nn.ModuleList([
            nn.Sequential(
                nn.Conv1d(row_inputs, 160, 7, padding=3),
                nn.GroupNorm(16, 160),
                nn.SiLU(),
                RowResidualBlock(160, 1),
                RowResidualBlock(160, 2),
                RowResidualBlock(160, 4),
                RowResidualBlock(160, 8),
                nn.Conv1d(160, 96, 3, padding=1),
                nn.GroupNorm(16, 96),
                nn.SiLU(),
                nn.Conv1d(96, 1, 1),
            )
            for _ in ROWS
        ])

        # Geometry is deliberately independent from the row/landmark branch.
        # A local 2D band preserves mesh triangles and neighbouring outline
        # curvature; a global vector preserves the complete body context.
        self.geometry_encoder = nn.Sequential(
            nn.Conv2d(5, 32, 5, stride=2, padding=2),
            nn.GroupNorm(4, 32),
            nn.SiLU(),
            ConvBlock(32, 48),
            nn.AvgPool2d(2),
            ConvBlock(48, 64),
        )
        self.geometry_global = nn.Sequential(
            nn.AvgPool2d(2),
            ConvBlock(64, 96),
        )
        self.geometry_reduce = nn.Sequential(
            nn.Conv2d(64, 32, 1),
            nn.GroupNorm(4, 32),
            nn.SiLU(),
        )
        geometry_inputs = 32 * 9 * 16 + 96 + 4 * 33 + 24 + 4
        self.geometry_heads = nn.ModuleList([GeometryHead(geometry_inputs) for _ in ROWS])
        self.register_buffer("target_mean", torch.from_numpy(stats.target_mean))
        self.register_buffer("target_std", torch.from_numpy(stats.target_std))
        self.register_buffer("shape_mean", torch.from_numpy(stats.shape_mean))
        self.register_buffer("shape_components", torch.from_numpy(stats.shape_components))
        self.register_buffer("landmark_x_grid", torch.linspace(0.0, 1.0, WIDTH // 8))
        self.register_buffer("landmark_y_grid", torch.linspace(0.0, 1.0, HEIGHT // 4))
        self.register_buffer("row_grid", torch.linspace(0.0, 1.0, HEIGHT))
        allowed = torch.zeros(2, HEIGHT, dtype=torch.bool)
        allowed[0] = (self.row_grid >= 0.30) & (self.row_grid <= 0.55)
        allowed[1] = (self.row_grid >= 0.37) & (self.row_grid <= 0.65)
        self.register_buffer("row_allowed", allowed)

    def predict_landmarks(self, features: torch.Tensor) -> tuple[torch.Tensor, torch.Tensor]:
        logits = self.landmark_head(F.avg_pool2d(features, 4))
        probability = torch.softmax(logits.flatten(2), -1).reshape_as(logits)
        x = (probability.sum(-2) * self.landmark_x_grid.view(1, 1, -1)).sum(-1)
        y = (probability.sum(-1) * self.landmark_y_grid.view(1, 1, -1)).sum(-1)
        return torch.stack((x, y), -1), logits

    def predict_rows(
        self,
        features: torch.Tensor,
        profile_features: torch.Tensor,
        run_profiles: torch.Tensor,
    ) -> tuple[torch.Tensor, torch.Tensor]:
        mean_features = features.mean(-1)
        max_features = features.amax(-1)
        runs = run_profiles.permute(0, 2, 1)
        spans = runs[:, 1:2] - runs[:, 0:1]
        centers = (runs[:, 1:2] + runs[:, 0:1]) * 0.5
        span_delta = F.pad(spans[..., 1:] - spans[..., :-1], (1, 0))
        center_delta = F.pad(centers[..., 1:] - centers[..., :-1], (1, 0))
        y_channel = self.row_grid.view(1, 1, -1).expand(len(features), -1, -1)
        condition = self.row_profile(profile_features).unsqueeze(-1).expand(-1, -1, HEIGHT)
        row_input = torch.cat(
            (mean_features, max_features, runs, spans, centers, span_delta, center_delta, y_channel, condition), 1
        )
        logits = torch.cat([tower(row_input) for tower in self.row_towers], 1)
        logits = logits.masked_fill(~self.row_allowed.unsqueeze(0), -10_000.0)
        probability = torch.softmax(logits, -1)
        rows = (probability * self.row_grid.view(1, 1, -1)).sum(-1)
        return rows, logits

    def spatial_forward(self, inputs: torch.Tensor, profile: torch.Tensor, run_profiles: torch.Tensor):
        features = self.row_visual(inputs)
        profile_features = self.profile(profile)
        landmarks, landmark_logits = self.predict_landmarks(features)
        rows, row_logits = self.predict_rows(features, profile_features, run_profiles)
        return rows, row_logits, landmarks, landmark_logits, profile_features

    @staticmethod
    def sample_visual_bands(features: torch.Tensor, rows: torch.Tensor) -> torch.Tensor:
        batch, channels, _, _ = features.shape
        repeated = features.repeat_interleave(len(ROWS), 0)
        offsets = torch.linspace(-0.075, 0.075, 17, device=features.device, dtype=features.dtype)
        x = torch.linspace(-1.0, 1.0, 32, device=features.device, dtype=features.dtype)
        y = (rows.reshape(-1, 1) + offsets.view(1, -1)).clamp(0.0, 1.0) * 2.0 - 1.0
        grid_x = x.view(1, 1, -1).expand(batch * len(ROWS), len(offsets), -1)
        grid_y = y.unsqueeze(-1).expand(-1, -1, len(x))
        grid = torch.stack((grid_x, grid_y), -1)
        sampled = F.grid_sample(repeated, grid, mode="bilinear", padding_mode="border", align_corners=True)
        pooled = F.adaptive_avg_pool2d(sampled, (9, 16))
        return pooled.reshape(batch, len(ROWS), channels * 9 * 16)

    @staticmethod
    def sample_run_bands(run_profiles: torch.Tensor, rows: torch.Tensor) -> torch.Tensor:
        indexes = torch.round(rows * (HEIGHT - 1)).long()
        offsets = torch.arange(-16, 17, device=rows.device).view(1, 1, -1)
        indexes = (indexes.unsqueeze(-1) + offsets).clamp(0, HEIGHT - 1)
        runs = run_profiles.unsqueeze(1).expand(-1, len(ROWS), -1, -1)
        selected = runs.gather(2, indexes.unsqueeze(-1).expand(-1, -1, -1, 2))
        spans = selected[..., 1:2] - selected[..., 0:1]
        centers = (selected[..., 1:2] + selected[..., 0:1]) * 0.5
        return torch.cat((selected, spans, centers), -1).flatten(2)

    def geometry_at_rows(
        self,
        local_features: torch.Tensor,
        global_features: torch.Tensor,
        profile_features: torch.Tensor,
        run_profiles: torch.Tensor,
        rows: torch.Tensor,
    ) -> tuple[torch.Tensor, torch.Tensor, torch.Tensor, torch.Tensor, torch.Tensor]:
        pooled = self.sample_visual_bands(local_features, rows)
        run_bands = self.sample_run_bands(run_profiles, rows)
        row_indexes = torch.round(rows * (HEIGHT - 1)).long().clamp(0, HEIGHT - 1)
        selected_runs = run_profiles.gather(1, row_indexes.unsqueeze(-1).expand(-1, -1, 2))
        spans = (selected_runs[..., 1] - selected_runs[..., 0]).clamp_min(1e-4)
        raw_z = []
        for row, head in enumerate(self.geometry_heads):
            raw_z.append(
                head(
                    torch.cat(
                        (
                            pooled[:, row],
                            global_features,
                            run_bands[:, row],
                            profile_features,
                            rows[:, row : row + 1],
                            selected_runs[:, row],
                            spans[:, row : row + 1],
                        ),
                        -1,
                    )
                )
            )
        predicted_z = torch.stack(raw_z, 1)
        raw = predicted_z * self.target_std.unsqueeze(0) + self.target_mean.unsqueeze(0)
        scale = raw[..., 0].clamp_min(1.0)
        depth = raw[..., 1].clamp_min(1.0)
        coefficients = raw[..., 2:]
        shape = self.shape_mean.unsqueeze(0) + torch.einsum("brk,rkd->brd", coefficients, self.shape_components)
        shape = shape.reshape(-1, 2, POINTS, 2)
        breadth = spans * scale
        edges = torch.cat((rows.unsqueeze(-1), selected_runs), -1)
        return edges, breadth, depth, shape, predicted_z

    def forward_train(
        self,
        inputs: torch.Tensor,
        profile: torch.Tensor,
        run_profiles: torch.Tensor,
        teacher_rows: torch.Tensor,
        geometry_use_predicted_rows: bool = False,
    ):
        with torch.no_grad():
            rows, _, _, _, profile_features = self.spatial_forward(inputs, profile, run_profiles)
        geometry_rows = teacher_rows.float() / (HEIGHT - 1)
        if geometry_use_predicted_rows:
            geometry_rows = rows.detach()
        encoded = self.geometry_encoder(inputs)
        local_features = self.geometry_reduce(encoded)
        global_features = F.adaptive_avg_pool2d(self.geometry_global(encoded), 1).flatten(1)
        geometry = self.geometry_at_rows(
            local_features, global_features, profile_features.detach(), run_profiles, geometry_rows
        )
        return geometry

    def forward(self, inputs: torch.Tensor, profile: torch.Tensor, run_profiles: torch.Tensor):
        rows, _, landmarks, _, profile_features = self.spatial_forward(inputs, profile, run_profiles)
        encoded = self.geometry_encoder(inputs)
        local_features = self.geometry_reduce(encoded)
        global_features = F.adaptive_avg_pool2d(self.geometry_global(encoded), 1).flatten(1)
        edges, breadth, depth, shape, predicted_z = self.geometry_at_rows(
            local_features, global_features, profile_features, run_profiles, rows
        )
        return edges, breadth, depth, depth / breadth.clamp_min(1e-4), shape, landmarks


def masked_mean(values: torch.Tensor, mask: torch.Tensor) -> torch.Tensor:
    while mask.ndim < values.ndim:
        mask = mask.unsqueeze(-1)
    return (values * mask).sum() / mask.expand_as(values).sum().clamp_min(1.0)


def batch_loss(
    model: WaistHipGeometryV8,
    batch,
    device: torch.device,
    stage: str = "joint",
) -> tuple[torch.Tensor, dict[str, float]]:
    (
        inputs, profile, runs_in, row_indexes, edge_truth, geometry_truth,
        target_z, row_mask, landmark_truth, landmark_mask,
    ) = [value.to(device) for value in batch]
    if stage == "spatial":
        rows, row_logits, landmarks, landmark_logits, _ = model.spatial_forward(inputs, profile, runs_in)
        truth_y = row_indexes.float() / (HEIGHT - 1)
        row_distance = masked_mean(
            F.smooth_l1_loss((rows - truth_y) * HEIGHT, torch.zeros_like(rows), reduction="none"),
            row_mask,
        )
        pixel_grid = torch.arange(HEIGHT, device=device, dtype=rows.dtype).view(1, 1, -1)
        soft_truth = torch.exp(-0.5 * ((pixel_grid - row_indexes.unsqueeze(-1)) / 1.25) ** 2)
        soft_truth = soft_truth / soft_truth.sum(-1, keepdim=True).clamp_min(1e-8)
        row_classification = masked_mean(
            -(soft_truth * F.log_softmax(row_logits, -1)).sum(-1),
            row_mask,
        )
        landmark_scale = landmarks.new_tensor((WIDTH, HEIGHT)).view(1, 1, 2)
        landmark_distance = masked_mean(
            F.smooth_l1_loss(
                (landmarks - landmark_truth) * landmark_scale,
                torch.zeros_like(landmarks),
                reduction="none",
            ),
            landmark_mask,
        )
        heatmap_height, heatmap_width = landmark_logits.shape[-2:]
        landmark_x = torch.round(landmark_truth[..., 0] * (heatmap_width - 1)).long().clamp(0, heatmap_width - 1)
        landmark_y = torch.round(landmark_truth[..., 1] * (heatmap_height - 1)).long().clamp(0, heatmap_height - 1)
        landmark_indexes = landmark_y * heatmap_width + landmark_x
        landmark_classification = masked_mean(
            F.cross_entropy(
                landmark_logits.reshape(-1, heatmap_height * heatmap_width),
                landmark_indexes.reshape(-1),
                reduction="none",
            ).reshape(-1, LANDMARK_COUNT),
            landmark_mask,
        )
        total = (
            row_distance * 5.0
            + row_classification * 1.0
            + landmark_distance * 0.12
            + landmark_classification * 0.04
        )
        return total, {
            "rowDistance": float(row_distance.detach()),
            "rowClassification": float(row_classification.detach()),
            "landmarkDistance": float(landmark_distance.detach()),
            "landmarkClassification": float(landmark_classification.detach()),
        }

    edges, breadth, depth, shape, predicted_z = model.forward_train(
        inputs,
        profile,
        runs_in,
        row_indexes,
        geometry_use_predicted_rows=stage == "adapt",
    )
    target_loss = masked_mean(F.smooth_l1_loss(predicted_z, target_z, reduction="none"), row_mask)
    breadth_loss = masked_mean(
        F.smooth_l1_loss((breadth - geometry_truth[..., 0]) / 0.35, torch.zeros_like(breadth), reduction="none"),
        row_mask,
    )
    depth_loss = masked_mean(
        F.smooth_l1_loss((depth - geometry_truth[..., 1]) / 0.75, torch.zeros_like(depth), reduction="none"),
        row_mask,
    )
    truth_shape = geometry_truth[..., 2:].reshape(-1, 2, POINTS, 2)
    shape_loss = masked_mean(F.smooth_l1_loss((shape - truth_shape) / 0.02, torch.zeros_like(shape), reduction="none"), row_mask)
    shape_edge_loss = masked_mean(
        F.smooth_l1_loss(
            (torch.roll(shape, -1, 2) - shape) / 0.02,
            (torch.roll(truth_shape, -1, 2) - truth_shape) / 0.02,
            reduction="none",
        ),
        row_mask,
    )
    geometry_total = (
        target_loss
        + breadth_loss * 1.5
        + depth_loss
        + shape_loss * 1.5
        + shape_edge_loss * 0.25
    )
    if stage == "geometry":
        total = geometry_total
    elif stage == "adapt":
        # The spatial model is frozen during this stage.  Only the geometry
        # heads learn to consume the rows/landmarks that inference will use.
        total = geometry_total
    else:
        raise ValueError(f"Unknown training stage: {stage}")
    return total, {
        "target": float(target_loss.detach()),
        "breadth": float(breadth_loss.detach()),
        "depth": float(depth_loss.detach()),
        "shape": float(shape_loss.detach()),
        "shapeEdge": float(shape_edge_loss.detach()),
    }


@torch.no_grad()
def evaluate_loss(
    model: WaistHipGeometryV8,
    loader: DataLoader,
    device: torch.device,
    stage: str = "joint",
) -> float:
    model.eval()
    losses = [float(batch_loss(model, batch, device, stage)[0]) for batch in loader]
    return float(np.mean(losses)) if losses else float("inf")


@torch.no_grad()
def predict(model: WaistHipGeometryV8, dataset: GeometryDataset, device: torch.device, batch_size: int):
    model.eval()
    outputs = []
    loader = DataLoader(dataset, batch_size=batch_size, shuffle=False, num_workers=0)
    for batch in loader:
        inputs, profile, runs_in = [value.to(device) for value in batch[:3]]
        result = model(inputs, profile, runs_in)[:5]
        arrays = [value.cpu().numpy() for value in result]
        for offset in range(len(inputs)):
            outputs.append(tuple(array[offset] for array in arrays))
    return outputs


def metric(values: list[float], limit: float) -> dict[str, float | int]:
    array = np.asarray(values, dtype=np.float64)
    return {
        "count": int(len(array)),
        "mae": round(float(array.mean()), 6),
        "p95": round(float(np.quantile(array, 0.95)), 6),
        "withinRatePct": round(float(np.mean(array <= limit) * 100.0), 4),
        "limit": limit,
    }


def report(records: list[Record], predictions) -> dict[str, Any]:
    limits = {"rowYpx": 1.0, "leftPx": 1.0, "rightPx": 1.0, "breadthCm": 0.5, "depthCm": 1.0, "shape32": 0.02}
    errors = {row: {key: [] for key in limits} for row in ROWS}
    for record, output in zip(records, predictions):
        edges, breadth, depth, _, shape = output
        for row, row_name in enumerate(ROWS):
            if record.row_mask[row] <= 0.5:
                continue
            errors[row_name]["rowYpx"].append(abs(float(edges[row, 0] - record.edges[row, 0])) * (HEIGHT - 1))
            errors[row_name]["leftPx"].append(abs(float(edges[row, 1] - record.edges[row, 1])) * (WIDTH - 1))
            errors[row_name]["rightPx"].append(abs(float(edges[row, 2] - record.edges[row, 2])) * (WIDTH - 1))
            errors[row_name]["breadthCm"].append(abs(float(breadth[row] - record.geometry[row, 0])))
            errors[row_name]["depthCm"].append(abs(float(depth[row] - record.geometry[row, 1])))
            errors[row_name]["shape32"].append(float(np.abs(shape[row] - record.geometry[row, 2:].reshape(POINTS, 2)).mean()))
    rows = {row: {key: metric(values, limits[key]) for key, values in row_errors.items()} for row, row_errors in errors.items()}
    failures = [f"{row}.{key}" for row in ROWS for key, value in rows[row].items() if float(value["mae"]) > limits[key]]
    return {
        "schemaVersion": "wear-waist-hips-geometry-v8-multiband/v1",
        "subjects": len(records),
        "rows": rows,
        "failures": failures,
        "passed": not failures,
        "sealed448Opened": False,
        "recordedTapeUsed": False,
        "walkedPlyCircumferenceUsed": False,
        "endpointPath": "deterministic central mesh boundary at predicted row",
        "rowPath": "separate full-height waist/hip visual towers with soft 256-row supervision",
        "geometryPath": "separate mesh encoder plus local multi-row visual/outline bands and full-body context",
        "shapePath": f"separate shape head predicts {PCA_COMPONENTS} training-only PCA coefficients reconstructed to 32 points",
    }


def inference_score(metrics: dict[str, Any], stage: str) -> float:
    keys = ("rowYpx", "leftPx", "rightPx") if stage == "spatial" else (
        "rowYpx", "leftPx", "rightPx", "breadthCm", "depthCm", "shape32"
    )
    score = 0.0
    for row_name in ROWS:
        for key in keys:
            value = metrics["rows"][row_name][key]
            limit = max(float(value["limit"]), 1e-8)
            score += float(value["mae"]) / limit
            score += 0.05 * min(float(value["p95"]) / limit, 20.0)
    return score


def draw_shape(draw: ImageDraw.ImageDraw, points: np.ndarray, box, color: str, width: int) -> None:
    x0, y0, x1, y1 = box
    center = np.asarray(((x0 + x1) * 0.5, (y0 + y1) * 0.5))
    scale = np.asarray(((x1 - x0) * 0.44, (y1 - y0) * 0.44))
    coords = center + points * scale
    loop = [tuple(map(float, point)) for point in coords] + [tuple(map(float, coords[0]))]
    draw.line(loop, fill=color, width=width, joint="curve")


def contact_sheet(records: list[Record], predictions, output: Path) -> None:
    chosen = list(range(min(24, len(records))))
    card_w, card_h, columns = 520, 390, 4
    sheet = Image.new("RGB", (card_w * columns, card_h * math.ceil(len(chosen) / columns)), "#050b18")
    font = ImageFont.load_default()
    resampling = getattr(Image, "Resampling", Image)
    for position, index in enumerate(chosen):
        record = records[index]
        edges, breadth, depth, _, shape = predictions[index]
        card = Image.new("RGB", (card_w, card_h), "#0c1729")
        draw = ImageDraw.Draw(card)
        with Image.open(record.mesh_path) as source:
            body = source.convert("RGB")
        body.thumbnail((235, 325), resampling.LANCZOS)
        bx, by = 8, 46
        card.paste(body, (bx, by))
        for row in range(2):
            truth = record.edges[row]
            prediction = edges[row]
            ty = by + truth[0] * body.height
            py = by + prediction[0] * body.height
            draw.line((bx + truth[1] * body.width, ty, bx + truth[2] * body.width, ty), fill=TRUTH_COLOR, width=4)
            draw.line((bx + prediction[1] * body.width, py, bx + prediction[2] * body.width, py), fill=ROW_COLORS[row], width=2)
        draw.text((8, 8), f"{record.scan_id} · unseen validation", fill="white", font=font)
        draw.text((8, 24), "orange teacher · cyan/green v8", fill="#9fb0c8", font=font)
        tx = 250
        for row, name in enumerate(ROWS):
            top = 48 + row * 165
            truth_shape = record.geometry[row, 2:].reshape(POINTS, 2)
            draw.text((tx, top), name.upper(), fill=ROW_COLORS[row], font=font)
            draw.text((tx, top + 15), f"A-B {breadth[row]:.2f}/{record.geometry[row,0]:.2f} cm", fill="white", font=font)
            draw.text((tx, top + 29), f"C-D {depth[row]:.2f}/{record.geometry[row,1]:.2f} cm", fill="white", font=font)
            draw.text((tx, top + 43), f"row {abs(edges[row,0]-record.edges[row,0])*(HEIGHT-1):.2f} px", fill="white", font=font)
            draw.text((tx, top + 57), f"shape {np.abs(shape[row]-truth_shape).mean():.5f}", fill="#c4b5fd", font=font)
            draw_shape(draw, truth_shape, (tx, top + 76, tx + 245, top + 155), TRUTH_COLOR, 3)
            draw_shape(draw, shape[row], (tx, top + 76, tx + 245, top + 155), ROW_COLORS[row], 2)
        sheet.paste(card, ((position % columns) * card_w, (position // columns) * card_h))
    output.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output, quality=94)


def smoke() -> None:
    stats = GeometryStats(
        np.zeros(4, np.float32),
        np.ones(4, np.float32),
        np.zeros((2, 2 + PCA_COMPONENTS), np.float32),
        np.ones((2, 2 + PCA_COMPONENTS), np.float32),
        np.zeros((2, POINTS * 2), np.float32),
        np.zeros((2, PCA_COMPONENTS, POINTS * 2), np.float32),
    )
    model = WaistHipGeometryV8(stats)
    output = model(
        torch.zeros(2, 5, HEIGHT, WIDTH),
        torch.zeros(2, 4),
        torch.tensor([[[0.4, 0.6]]] * HEIGHT * 2).reshape(2, HEIGHT, 2),
    )
    print(json.dumps({"startupSmoke": "passed", "shapes": [list(value.shape) for value in output[:5]]}))


def main() -> None:
    args = parse_args()
    if args.startup_smoke:
        smoke()
        return
    if args.manifest is None or args.output_dir is None:
        raise RuntimeError("--manifest and --output-dir are required")
    random.seed(SEED)
    np.random.seed(SEED)
    torch.manual_seed(SEED)
    torch.set_num_threads(max(1, args.threads))
    torch.set_num_interop_threads(min(4, max(1, args.threads // 2)))
    records = read_records(args.manifest)
    if args.train_limit > 0 or args.validation_limit > 0:
        limited: list[Record] = []
        for role, limit in (("train", args.train_limit), ("validation", args.validation_limit)):
            role_records = [record for record in records if record.role == role]
            limited.extend(role_records[:limit] if limit > 0 else role_records)
        records = limited
    cached = {record.scan_id: load_inputs(record.mesh_path, record.mask_path) for record in records}
    stats = compute_stats(records, cached)
    by_role = {role: [record for record in records if record.role == role] for role in ("train", "validation")}
    datasets = {role: GeometryDataset(values, stats, cached) for role, values in by_role.items()}
    train_loader = DataLoader(datasets["train"], batch_size=args.batch_size, shuffle=True, num_workers=0)
    validation_loader = DataLoader(
        datasets["validation"], batch_size=max(args.batch_size * 2, 64), shuffle=False, num_workers=0
    )
    model = WaistHipGeometryV8(stats)
    device = torch.device("cpu")
    history = []
    global_step = 0
    stages = (
        ("spatial", args.spatial_steps, 8e-4),
        ("geometry", args.geometry_steps, 1e-3),
        ("adapt", args.adapt_steps, 2.5e-4),
    )
    stage_best_losses: dict[str, float] = {}
    stage_best_scores: dict[str, float] = {}
    stage_best_metrics: dict[str, dict[str, Any]] = {}
    stage_best_states: dict[str, dict[str, torch.Tensor]] = {}
    for stage, stage_steps, learning_rate in stages:
        if stage_steps <= 0:
            continue
        for name, parameter in model.named_parameters():
            if stage == "spatial":
                parameter.requires_grad = not name.startswith("geometry_")
            else:
                parameter.requires_grad = name.startswith("geometry_")
        trainable = [parameter for parameter in model.parameters() if parameter.requires_grad]
        optimizer = torch.optim.AdamW(trainable, lr=learning_rate, weight_decay=1e-4)
        scheduler = torch.optim.lr_scheduler.CosineAnnealingLR(
            optimizer, T_max=max(stage_steps, 1), eta_min=learning_rate * 0.05
        )
        iterator = iter(train_loader)
        window_losses: list[float] = []
        part_values: dict[str, list[float]] = {}
        for stage_step in range(1, stage_steps + 1):
            try:
                batch = next(iterator)
            except StopIteration:
                iterator = iter(train_loader)
                batch = next(iterator)
            model.train()
            optimizer.zero_grad(set_to_none=True)
            loss, parts = batch_loss(model, batch, device, stage)
            loss.backward()
            torch.nn.utils.clip_grad_norm_(trainable, 8.0)
            optimizer.step()
            scheduler.step()
            global_step += 1
            window_losses.append(float(loss.detach()))
            for key, value in parts.items():
                part_values.setdefault(key, []).append(value)
            if stage_step % args.eval_every != 0 and stage_step != stage_steps:
                continue
            validation_loss = evaluate_loss(model, validation_loader, device, stage)
            inference_metrics = report(
                by_role["validation"],
                predict(model, datasets["validation"], device, max(args.batch_size * 2, 64)),
            )
            checkpoint_score = inference_score(inference_metrics, stage)
            item = {
                "stage": stage,
                "stageStep": stage_step,
                "globalStep": global_step,
                "trainLoss": round(float(np.mean(window_losses)), 6),
                "validationLoss": round(validation_loss, 6),
                "inferenceScore": round(checkpoint_score, 6),
                "inferenceFailures": inference_metrics["failures"],
                "inferenceRowMaePx": {
                    row_name: inference_metrics["rows"][row_name]["rowYpx"]["mae"] for row_name in ROWS
                },
                "learningRate": round(float(scheduler.get_last_lr()[0]), 9),
                "parts": {key: round(float(np.mean(values)), 6) for key, values in part_values.items()},
            }
            history.append(item)
            print(json.dumps(item), flush=True)
            window_losses = []
            part_values = {}
            previous_score = stage_best_scores.get(stage, float("inf"))
            previous_loss = stage_best_losses.get(stage, float("inf"))
            if checkpoint_score + 1e-7 < previous_score or (
                abs(checkpoint_score - previous_score) <= 1e-7 and validation_loss < previous_loss
            ):
                stage_best_scores[stage] = checkpoint_score
                stage_best_losses[stage] = validation_loss
                stage_best_metrics[stage] = inference_metrics
                stage_best_states[stage] = {
                    key: value.detach().cpu().clone() for key, value in model.state_dict().items()
                }
        if stage not in stage_best_states:
            raise RuntimeError(f"No v8 {stage} checkpoint")
        # Never carry a worse end-of-stage state into the next stage.
        model.load_state_dict(stage_best_states[stage])
    final_candidates = [stage for stage in ("geometry", "adapt") if stage in stage_best_states]
    if not final_candidates:
        raise RuntimeError("No v8 inference checkpoint")
    final_stage = min(final_candidates, key=lambda stage: stage_best_scores[stage])
    best = stage_best_states[final_stage]
    best_loss = stage_best_losses[final_stage]
    model.load_state_dict(best)
    train_predictions = predict(model, datasets["train"], device, max(args.batch_size * 2, 64))
    predictions = predict(model, datasets["validation"], device, max(args.batch_size * 2, 64))
    metrics = report(by_role["validation"], predictions)
    metrics["bestValidationLoss"] = round(best_loss, 6)
    metrics["trainSubjects"] = len(by_role["train"])
    metrics["trainGeometry"] = report(by_role["train"], train_predictions)["rows"]
    metrics["optimizerSteps"] = global_step
    metrics["checkpointStage"] = final_stage
    metrics["bestValidationLossByStage"] = {
        stage: round(loss, 6) for stage, loss in stage_best_losses.items()
    }
    metrics["bestInferenceScoreByStage"] = {
        stage: round(score, 6) for stage, score in stage_best_scores.items()
    }
    metrics["checkpointSelection"] = "lowest real inference-path normalized gate score"
    metrics["trainingStages"] = [
        {"name": stage, "steps": steps, "learningRate": learning_rate}
        for stage, steps, learning_rate in stages
    ]
    args.output_dir.mkdir(parents=True, exist_ok=True)
    (args.output_dir / "validation-metrics.json").write_text(json.dumps(metrics, indent=2) + "\n", encoding="utf-8")
    (args.output_dir / "training-history.json").write_text(json.dumps(history, indent=2) + "\n", encoding="utf-8")
    torch.save(
        {
            "stateDict": best,
            "stats": {
                "profileMean": stats.profile_mean.tolist(),
                "profileStd": stats.profile_std.tolist(),
                "targetMean": stats.target_mean.tolist(),
                "targetStd": stats.target_std.tolist(),
                "shapeMean": stats.shape_mean.tolist(),
                "shapeComponents": stats.shape_components.tolist(),
            },
            "geometryOnly": True,
            "schemaVersion": "wear-waist-hips-geometry-v8-multiband/v1",
            "sealed448Opened": False,
        },
        args.output_dir / "model.pt",
    )
    contact_sheet(by_role["validation"], predictions, args.output_dir / "validation-contact-sheet.jpg")
    print(json.dumps(metrics, indent=2))


if __name__ == "__main__":
    main()
