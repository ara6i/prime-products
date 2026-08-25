#!/usr/bin/env python3
"""Prove the replacement spatial waist/hips geometry on ten gold WEAR cards.

This is deliberately not the full trainer.  It must first prove that a model
can reproduce ten visually approved Blender/PLY teachers before any sealed
validation or held-out test is opened.

This proof intentionally stops before circumference:

    Blender mesh channels
      -> spatial row heatmaps
      -> boundary-constrained left/right endpoint heatmaps
      -> row-conditioned breadth, depth, and 32-point PLY shape

Recorded tape, walked PLY circumference, and any correction between them are
excluded from both the loss and the acceptance gate.  The purpose of this
stage is only to prove that the spatial model can place the row, touch the
correct left/right body boundaries, recover metric A-B/C-D, and reproduce the
32-point section.  Circumference training must remain blocked until this proof
passes and is visually approved.
"""

from __future__ import annotations

import argparse
from dataclasses import dataclass
import json
import math
from pathlib import Path
import random

import numpy as np
from PIL import Image, ImageDraw, ImageFont
import torch
from torch import nn
from torch.nn import functional as F


ROWS = ("waist", "hips")
ROW_COLORS = ("#22d3ee", "#34d399")
TRUTH_COLOR = "#fb923c"
WIDTH = 128
HEIGHT = 192
POINTS = 32
PROFILE_FIELDS = ("height_cm", "weight_kg", "bmi", "female")
GEOMETRY_FIELDS = 2 + POINTS * 2
SEED = 20260823


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--manifest",
        type=Path,
        default=Path(".local-ml/wear3d-v8-teacher-canary/ten-final-v2/render-manifest.jsonl"),
    )
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path(".local-ml/reports/wear3d-waist-hips-geometry-proof10-v2"),
    )
    parser.add_argument("--epochs", type=int, default=800)
    parser.add_argument("--threads", type=int, default=8)
    return parser.parse_args()


@dataclass
class GoldCard:
    scan_id: str
    mesh_path: Path
    mask_path: Path
    profile: np.ndarray
    edges: np.ndarray
    geometry: np.ndarray
    tape: np.ndarray


@dataclass
class Stats:
    profile_mean: np.ndarray
    profile_std: np.ndarray
    geometry_mean: np.ndarray
    geometry_std: np.ndarray
    delta_mean: np.ndarray
    delta_std: np.ndarray


def resolve_artifact(raw: str, manifest: Path) -> Path:
    path = Path(raw)
    candidates = (path, Path.cwd() / path, manifest.parent / path.name)
    for candidate in candidates:
        if candidate.exists():
            return candidate.resolve()
    raise FileNotFoundError(raw)


def walk_shape_numpy(shape: np.ndarray, breadth: float, depth: float) -> float:
    x = shape[:, 0]
    y = shape[:, 1]
    x = (x - (x.max() + x.min()) * 0.5) / max((x.max() - x.min()) * 0.5, 1e-6) * breadth * 0.5
    y = (y - (y.max() + y.min()) * 0.5) / max((y.max() - y.min()) * 0.5, 1e-6) * depth * 0.5
    return float(np.sqrt(np.square(np.roll(x, -1) - x) + np.square(np.roll(y, -1) - y)).sum())


def read_gold_cards(manifest: Path) -> list[GoldCard]:
    cards: list[GoldCard] = []
    for line in manifest.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        source = json.loads(line)
        if source.get("error"):
            raise RuntimeError(f"Gold card contains an error: {source.get('scan_id')}: {source.get('error')}")
        if source.get("view_id") != "front-50":
            raise RuntimeError(f"Gold card is not canonical front-50: {source.get('scan_id')}")
        geometry = np.zeros((2, GEOMETRY_FIELDS), dtype=np.float32)
        edges = np.zeros((2, 3), dtype=np.float32)
        tape = np.zeros(2, dtype=np.float32)
        for row_index, row_name in enumerate(ROWS):
            row = source["rows"][row_name]
            required_flags = (
                "accepted",
                "edge_target_valid",
                "depth_target_valid",
                "shape_target_valid",
            )
            if any(row.get(flag) is not True for flag in required_flags):
                raise RuntimeError(f"{source['scan_id']} {row_name} is not a fully approved gold teacher")
            contour = np.asarray(row["contour_points_normalized"], dtype=np.float32)
            if contour.shape != (POINTS, 2) or not np.isfinite(contour).all():
                raise RuntimeError(f"{source['scan_id']} {row_name} has an invalid 32-point shape")
            edges[row_index] = (
                float(row["y_norm"]),
                float(row["wear_edge_left_x_norm"]),
                float(row["wear_edge_right_x_norm"]),
            )
            geometry[row_index, 0] = float(row["mesh_width_mm"]) / 10.0
            geometry[row_index, 1] = float(row["mesh_depth_mm"]) / 10.0
            geometry[row_index, 2:] = contour.reshape(-1)
            # Kept only for backward-compatible serialization.  It is never
            # read by the geometry proof loss, metrics, or visual acceptance.
            tape[row_index] = 0.0
        gender = str(source["gender"]).lower()
        profile = np.asarray(
            (
                float(source["height_cm"]),
                float(source["weight_kg"]),
                float(source["bmi"]),
                1.0 if gender == "female" else 0.0,
            ),
            dtype=np.float32,
        )
        cards.append(
            GoldCard(
                scan_id=source["scan_id"],
                mesh_path=resolve_artifact(source["mesh_image"], manifest),
                mask_path=resolve_artifact(source["mask"], manifest),
                profile=profile,
                edges=edges,
                geometry=geometry,
                tape=tape,
            )
        )
    if len(cards) != 10 or len({card.scan_id for card in cards}) != 10:
        raise RuntimeError(f"The proof requires exactly ten unique cards, found {len(cards)}")
    return cards


def load_channels(mesh_path: Path, mask_path: Path) -> np.ndarray:
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
    return np.stack((silhouette, boundary, mesh_lines), axis=0).astype(np.float32)


def compute_stats(cards: list[GoldCard]) -> Stats:
    profiles = np.stack([card.profile for card in cards])
    geometry = np.stack([card.geometry for card in cards])
    # The first learned geometry value is not an independent breadth.  It is
    # the centimetres-per-normalized-image-X scale.  Runtime breadth is always
    # derived from the predicted visible endpoints, so a correct centimetre
    # result cannot bypass a bad A-B line.
    edge_spans = np.stack([card.edges[:, 2] - card.edges[:, 1] for card in cards])
    geometry[:, :, 0] = geometry[:, :, 0] / np.maximum(edge_spans, 1e-5)
    return Stats(
        profile_mean=profiles.mean(0),
        profile_std=np.maximum(profiles.std(0), 1e-4),
        geometry_mean=geometry.mean(0),
        geometry_std=np.maximum(geometry.std(0), 1e-4),
        # Compatibility buffers only.  Circumference is not part of this
        # proof and these values receive no supervision.
        delta_mean=np.zeros(2, dtype=np.float32),
        delta_std=np.ones(2, dtype=np.float32),
    )


def walk_shape(shape: torch.Tensor, breadth: torch.Tensor, depth: torch.Tensor) -> torch.Tensor:
    x = shape[..., 0]
    y = shape[..., 1]
    x_center = (x.amax(-1) + x.amin(-1)) * 0.5
    y_center = (y.amax(-1) + y.amin(-1)) * 0.5
    x_half = ((x.amax(-1) - x.amin(-1)) * 0.5).clamp_min(1e-4)
    y_half = ((y.amax(-1) - y.amin(-1)) * 0.5).clamp_min(1e-4)
    x_cm = (x - x_center.unsqueeze(-1)) / x_half.unsqueeze(-1) * breadth.unsqueeze(-1) * 0.5
    y_cm = (y - y_center.unsqueeze(-1)) / y_half.unsqueeze(-1) * depth.unsqueeze(-1) * 0.5
    return torch.sqrt(
        (torch.roll(x_cm, -1, -1) - x_cm).square()
        + (torch.roll(y_cm, -1, -1) - y_cm).square()
        + 1e-8
    ).sum(-1)


class ConvBlock(nn.Module):
    def __init__(self, input_channels: int, output_channels: int) -> None:
        super().__init__()
        groups = max(1, output_channels // 8)
        self.layers = nn.Sequential(
            nn.Conv2d(input_channels, output_channels, 3, padding=1),
            nn.GroupNorm(groups, output_channels),
            nn.SiLU(),
            nn.Conv2d(output_channels, output_channels, 3, padding=1),
            nn.GroupNorm(groups, output_channels),
            nn.SiLU(),
        )

    def forward(self, value: torch.Tensor) -> torch.Tensor:
        return self.layers(value)


class SpatialWaistHipNet(nn.Module):
    def __init__(self, stats: Stats) -> None:
        super().__init__()
        self.enc1 = ConvBlock(3, 24)
        self.enc2 = ConvBlock(24, 48)
        self.enc3 = ConvBlock(48, 80)
        self.enc4 = ConvBlock(80, 128)
        self.dec3 = ConvBlock(128 + 80, 80)
        self.dec2 = ConvBlock(80 + 48, 48)
        self.dec1 = ConvBlock(48 + 24, 32)
        self.row_head = nn.Conv2d(32, 2, 1)
        self.endpoint_head = nn.Conv2d(32, 4, 1)
        self.profile = nn.Sequential(nn.Linear(4, 24), nn.SiLU(), nn.Linear(24, 24), nn.SiLU())
        self.geometry_heads = nn.ModuleList(
            [
                nn.Sequential(
                    nn.Linear(32 * 32 + 24 + 3, 384),
                    nn.SiLU(),
                    nn.Linear(384, 192),
                    nn.SiLU(),
                    nn.Linear(192, GEOMETRY_FIELDS + 1),
                )
                for _ in ROWS
            ]
        )
        self.register_buffer("geometry_mean", torch.from_numpy(stats.geometry_mean))
        self.register_buffer("geometry_std", torch.from_numpy(stats.geometry_std))
        self.register_buffer("delta_mean", torch.from_numpy(stats.delta_mean))
        self.register_buffer("delta_std", torch.from_numpy(stats.delta_std))
        self.register_buffer("x_grid", torch.linspace(0.0, 1.0, WIDTH))
        self.register_buffer("y_grid", torch.linspace(0.0, 1.0, HEIGHT))

    def decode(self, mesh: torch.Tensor) -> torch.Tensor:
        e1 = self.enc1(mesh)
        e2 = self.enc2(F.avg_pool2d(e1, 2))
        e3 = self.enc3(F.avg_pool2d(e2, 2))
        e4 = self.enc4(F.avg_pool2d(e3, 2))
        d3 = self.dec3(torch.cat((F.interpolate(e4, size=e3.shape[-2:], mode="bilinear", align_corners=False), e3), 1))
        d2 = self.dec2(torch.cat((F.interpolate(d3, size=e2.shape[-2:], mode="bilinear", align_corners=False), e2), 1))
        return self.dec1(torch.cat((F.interpolate(d2, size=e1.shape[-2:], mode="bilinear", align_corners=False), e1), 1))

    def spatial_edges(
        self, features: torch.Tensor, mesh: torch.Tensor
    ) -> tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        row_logits = self.row_head(features)
        endpoint_logits = self.endpoint_head(features).reshape(-1, 2, 2, HEIGHT, WIDTH)
        row_scores = torch.logsumexp(row_logits, dim=-1) - math.log(WIDTH)
        row_prob = torch.softmax(row_scores, dim=-1)
        y = (row_prob * self.y_grid.view(1, 1, HEIGHT)).sum(-1)

        boundary = mesh[:, 1:2].unsqueeze(1) > 0.5
        y_distance = self.y_grid.view(1, 1, 1, HEIGHT, 1) - y.unsqueeze(-1).unsqueeze(-1).unsqueeze(-1)
        row_band = -0.5 * (y_distance / (2.5 / HEIGHT)).square()
        constrained = torch.where(boundary, endpoint_logits + row_band, torch.full_like(endpoint_logits, -1e4))
        x_scores = torch.logsumexp(constrained, dim=-2)
        x_prob = torch.softmax(x_scores, dim=-1)
        x = (x_prob * self.x_grid.view(1, 1, 1, WIDTH)).sum(-1)
        left = torch.minimum(x[:, :, 0], x[:, :, 1])
        right = torch.maximum(x[:, :, 0], x[:, :, 1])
        return torch.stack((y, left, right), -1), row_logits, endpoint_logits

    def forward_geometry(self, mesh: torch.Tensor, profile: torch.Tensor):
        features = self.decode(mesh)
        edges, row_logits, endpoint_logits = self.spatial_edges(features, mesh)
        row_scores = torch.logsumexp(row_logits, dim=-1) - math.log(WIDTH)
        row_prob = torch.softmax(row_scores, dim=-1)
        row_features = torch.einsum("bchw,brh->brcw", features, row_prob)
        # WIDTH is fixed by the runtime contract.  A fixed factor pool exports
        # cleanly to ONNX while preserving the same 32 horizontal bins.
        pooled = F.avg_pool1d(
            row_features.reshape(-1, 32, WIDTH),
            kernel_size=WIDTH // 32,
            stride=WIDTH // 32,
        ).flatten(1)
        pooled = pooled.reshape(mesh.shape[0], 2, -1)
        profile_features = self.profile(profile)
        outputs = []
        for row_index, head in enumerate(self.geometry_heads):
            outputs.append(head(torch.cat((pooled[:, row_index], profile_features, edges[:, row_index]), -1)))
        output = torch.stack(outputs, 1)
        geometry_z = output[..., :GEOMETRY_FIELDS]
        geometry = geometry_z * self.geometry_std.unsqueeze(0) + self.geometry_mean.unsqueeze(0)
        image_scale_cm = geometry[..., 0].clamp_min(1.0)
        breadth = ((edges[..., 2] - edges[..., 1]).clamp_min(1e-4) * image_scale_cm).clamp_min(1.0)
        depth = geometry[..., 1].clamp_min(1.0)
        shape = geometry[..., 2:].reshape(-1, 2, POINTS, 2)
        return edges, breadth, depth, depth / breadth.clamp_min(1e-4), shape, row_logits, endpoint_logits

    def forward(self, mesh: torch.Tensor, profile: torch.Tensor):
        # Backward-compatible diagnostic path. Geometry-only training and ONNX
        # export call forward_geometry(), so neither walked circumference nor
        # protocol delta can enter their loss or runtime contract.
        edges, breadth, depth, ratio, shape, row_logits, endpoint_logits = self.forward_geometry(mesh, profile)
        features = self.decode(mesh)
        row_scores = torch.logsumexp(self.row_head(features), dim=-1) - math.log(WIDTH)
        row_prob = torch.softmax(row_scores, dim=-1)
        row_features = torch.einsum("bchw,brh->brcw", features, row_prob)
        pooled = F.avg_pool1d(
            row_features.reshape(-1, 32, WIDTH),
            kernel_size=WIDTH // 32,
            stride=WIDTH // 32,
        ).flatten(1).reshape(mesh.shape[0], 2, -1)
        profile_features = self.profile(profile)
        raw = torch.stack([
            head(torch.cat((pooled[:, row_index], profile_features, edges[:, row_index]), -1))
            for row_index, head in enumerate(self.geometry_heads)
        ], 1)
        protocol_delta = raw[..., -1] * self.delta_std.unsqueeze(0) + self.delta_mean.unsqueeze(0)
        mesh_circumference = walk_shape(shape, breadth, depth)
        tape = mesh_circumference + protocol_delta
        return edges, breadth, depth, ratio, shape, mesh_circumference, protocol_delta, tape, row_logits, endpoint_logits


def targets(cards: list[GoldCard], stats: Stats):
    channels = np.stack([load_channels(card.mesh_path, card.mask_path) for card in cards])
    profiles = np.stack([(card.profile - stats.profile_mean) / stats.profile_std for card in cards]).astype(np.float32)
    edges = np.stack([card.edges for card in cards]).astype(np.float32)
    geometry = np.stack([card.geometry for card in cards]).astype(np.float32)
    learned_geometry = geometry.copy()
    learned_geometry[:, :, 0] = learned_geometry[:, :, 0] / np.maximum(edges[:, :, 2] - edges[:, :, 1], 1e-5)
    geometry_z = ((learned_geometry - stats.geometry_mean) / stats.geometry_std).astype(np.float32)
    # Compatibility placeholders.  Neither participates in this proof.
    tape = np.zeros((len(cards), 2), dtype=np.float32)
    delta_z = np.zeros((len(cards), 2), dtype=np.float32)
    return tuple(torch.from_numpy(value) for value in (channels, profiles, edges, geometry, geometry_z, tape, delta_z))


def spatial_class_targets(edges: torch.Tensor) -> tuple[torch.Tensor, torch.Tensor]:
    row_index = torch.round(edges[..., 0] * (HEIGHT - 1)).long().clamp(0, HEIGHT - 1)
    endpoint_y = row_index.unsqueeze(-1).expand(-1, -1, 2)
    endpoint_x = torch.round(edges[..., 1:] * (WIDTH - 1)).long().clamp(0, WIDTH - 1)
    endpoint_index = endpoint_y * WIDTH + endpoint_x
    return row_index, endpoint_index


def loss_parts(model: SpatialWaistHipNet, tensors) -> tuple[torch.Tensor, dict[str, float]]:
    mesh, profile, edge_target, geometry_target, geometry_z_target, tape_target, delta_z_target = tensors
    edges, breadth, depth, _, shape, row_logits, endpoint_logits = model.forward_geometry(mesh, profile)
    row_index, endpoint_index = spatial_class_targets(edge_target)
    row_scores = torch.logsumexp(row_logits, dim=-1) - math.log(WIDTH)
    row_ce = F.cross_entropy(row_scores.reshape(-1, HEIGHT), row_index.reshape(-1))
    endpoint_ce = F.cross_entropy(endpoint_logits.reshape(-1, HEIGHT * WIDTH), endpoint_index.reshape(-1))
    edge_px = torch.stack(
        (
            (edges[..., 0] - edge_target[..., 0]) * HEIGHT,
            (edges[..., 1] - edge_target[..., 1]) * WIDTH,
            (edges[..., 2] - edge_target[..., 2]) * WIDTH,
        ),
        -1,
    )
    edge_loss = F.smooth_l1_loss(edge_px, torch.zeros_like(edge_px))
    predicted_scale = breadth / (edges[..., 2] - edges[..., 1]).clamp_min(1e-4)
    predicted_geometry = torch.cat((predicted_scale.unsqueeze(-1), depth.unsqueeze(-1), shape.flatten(2)), -1)
    predicted_z = (predicted_geometry - model.geometry_mean.unsqueeze(0)) / model.geometry_std.unsqueeze(0)
    geometry_loss = F.smooth_l1_loss(predicted_z[..., :2], geometry_z_target[..., :2])
    # This loss is on the actual endpoint-derived centimetre breadth, not on a
    # second breadth head.  It forces the scale estimate to compensate the
    # sub-pixel endpoint position instead of allowing tape loss to hide a bad
    # A-B width.
    breadth_cm_loss = F.smooth_l1_loss(
        (breadth - geometry_target[..., 0]) / 0.20,
        torch.zeros_like(breadth),
    )
    depth_cm_loss = F.smooth_l1_loss(
        (depth - geometry_target[..., 1]) / 0.20,
        torch.zeros_like(depth),
    )
    shape_loss = F.smooth_l1_loss(predicted_z[..., 2:], geometry_z_target[..., 2:])
    shape_edge_loss = F.smooth_l1_loss(
        torch.roll(shape, -1, 2) - shape,
        torch.roll(geometry_target[..., 2:].reshape(-1, 2, POINTS, 2), -1, 2) - geometry_target[..., 2:].reshape(-1, 2, POINTS, 2),
    )
    total = (
        row_ce + endpoint_ce + edge_loss * 2.0
        + geometry_loss * 0.25 + breadth_cm_loss * 2.0 + depth_cm_loss * 2.0
        + shape_loss * 2.0 + shape_edge_loss
    )
    return total, {
        "rowCE": float(row_ce.detach()),
        "endpointCE": float(endpoint_ce.detach()),
        "edge": float(edge_loss.detach()),
        "geometry": float(geometry_loss.detach()),
        "breadthCm": float(breadth_cm_loss.detach()),
        "depthCm": float(depth_cm_loss.detach()),
        "shape": float(shape_loss.detach()),
        "shapeEdge": float(shape_edge_loss.detach()),
        "circumferenceLossEnabled": False,
    }


@torch.no_grad()
def metrics(model: SpatialWaistHipNet, tensors) -> tuple[dict, tuple[np.ndarray, ...]]:
    model.eval()
    mesh, profile, edge_target, geometry_target, _, tape_target, _ = tensors
    output = model.forward_geometry(mesh, profile)
    arrays = tuple(value.detach().cpu().numpy() for value in output[:5])
    edges, breadth, depth, ratio, shape = arrays
    edge_truth = edge_target.cpu().numpy()
    geometry_truth = geometry_target.cpu().numpy()
    errors = {
        "rowYpxMAE": float(np.abs(edges[..., 0] - edge_truth[..., 0]).mean() * HEIGHT),
        "leftPxMAE": float(np.abs(edges[..., 1] - edge_truth[..., 1]).mean() * WIDTH),
        "rightPxMAE": float(np.abs(edges[..., 2] - edge_truth[..., 2]).mean() * WIDTH),
        "breadthCmMAE": float(np.abs(breadth - geometry_truth[..., 0]).mean()),
        "depthCmMAE": float(np.abs(depth - geometry_truth[..., 1]).mean()),
        "shape32MAE": float(np.abs(shape - geometry_truth[..., 2:].reshape(-1, 2, POINTS, 2)).mean()),
    }
    gates = {
        "rowYpxMAE": 0.50,
        "leftPxMAE": 0.75,
        "rightPxMAE": 0.75,
        "breadthCmMAE": 0.20,
        "depthCmMAE": 0.20,
        "shape32MAE": 0.015,
    }
    return {
        "schemaVersion": "wear-waist-hips-geometry-proof10/v2",
        "cards": 10,
        "trainingOnlyProof": True,
        "sealedValidationOpened": False,
        "sealed448Opened": False,
        "errors": {key: round(value, 6) for key, value in errors.items()},
        "gates": gates,
        "passed": all(errors[key] <= limit for key, limit in gates.items()),
        "geometryOnly": True,
        "recordedTapeUsedByProof": False,
        "walkedPlyCircumferenceUsedByProof": False,
        "circumferenceTrainingBlocked": True,
    }, arrays


def draw_shape(draw: ImageDraw.ImageDraw, points: np.ndarray, box, color: str, width: int) -> None:
    x0, y0, x1, y1 = box
    center = np.asarray(((x0 + x1) * 0.5, (y0 + y1) * 0.5))
    scale = np.asarray(((x1 - x0) * 0.44, (y1 - y0) * 0.44))
    coords = center + points * scale
    loop = [tuple(map(float, point)) for point in coords] + [tuple(map(float, coords[0]))]
    draw.line(loop, fill=color, width=width, joint="curve")


def contact_sheet(cards: list[GoldCard], arrays, output: Path) -> None:
    edges, breadth, depth, ratio, shape = arrays
    font = ImageFont.load_default()
    card_w, card_h, columns = 640, 410, 2
    sheet = Image.new("RGB", (card_w * columns, card_h * 5), "#050b18")
    resampling = getattr(Image, "Resampling", Image)
    for index, card in enumerate(cards):
        canvas = Image.new("RGB", (card_w, card_h), "#0c1729")
        draw = ImageDraw.Draw(canvas)
        with Image.open(card.mesh_path) as image:
            body = image.convert("RGB")
        body.thumbnail((285, 360), resampling.LANCZOS)
        bx, by = 10, 38
        canvas.paste(body, (bx, by))
        for row in range(2):
            truth = card.edges[row]
            prediction = edges[index, row]
            ty = by + truth[0] * body.height
            py = by + prediction[0] * body.height
            draw.line((bx + truth[1] * body.width, ty, bx + truth[2] * body.width, ty), fill=TRUTH_COLOR, width=4)
            draw.line((bx + prediction[1] * body.width, py, bx + prediction[2] * body.width, py), fill=ROW_COLORS[row], width=2)
        draw.text((10, 10), f"{card.scan_id} · orange teacher · cyan/green spatial model", fill="white", font=font)
        tx = 310
        for row, row_name in enumerate(ROWS):
            top = 48 + row * 172
            truth_shape = card.geometry[row, 2:].reshape(POINTS, 2)
            draw.text((tx, top), row_name.upper(), fill=ROW_COLORS[row], font=font)
            draw.text((tx, top + 16), f"A-B {breadth[index,row]:.2f} / {card.geometry[row,0]:.2f} cm", fill="white", font=font)
            draw.text((tx, top + 30), f"C-D {depth[index,row]:.2f} / {card.geometry[row,1]:.2f} cm", fill="white", font=font)
            shape_error = float(np.abs(shape[index, row] - truth_shape).mean())
            truth_edge = card.edges[row]
            predicted_edge = edges[index, row]
            draw.text((tx, top + 44), f"row error {abs(predicted_edge[0]-truth_edge[0])*HEIGHT:.3f} px", fill="white", font=font)
            draw.text((tx, top + 58), f"left/right error {abs(predicted_edge[1]-truth_edge[1])*WIDTH:.3f} / {abs(predicted_edge[2]-truth_edge[2])*WIDTH:.3f} px", fill="white", font=font)
            draw.text((tx, top + 72), f"32-point shape MAE {shape_error:.5f}", fill="#c4b5fd", font=font)
            draw_shape(draw, truth_shape, (tx, top + 88, tx + 250, top + 160), TRUTH_COLOR, 3)
            draw_shape(draw, shape[index, row], (tx, top + 88, tx + 250, top + 160), ROW_COLORS[row], 2)
        sheet.paste(canvas, ((index % columns) * card_w, (index // columns) * card_h))
    output.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output, quality=94)


def main() -> None:
    args = parse_args()
    random.seed(SEED)
    np.random.seed(SEED)
    torch.manual_seed(SEED)
    torch.set_num_threads(max(1, args.threads))
    torch.set_num_interop_threads(min(4, max(1, args.threads // 2)))
    cards = read_gold_cards(args.manifest)
    stats = compute_stats(cards)
    tensors = tuple(value.float() for value in targets(cards, stats))
    model = SpatialWaistHipNet(stats)
    optimizer = torch.optim.AdamW(model.parameters(), lr=2e-3, weight_decay=1e-6)
    best = None
    best_loss = float("inf")
    history = []
    for epoch in range(1, args.epochs + 1):
        model.train()
        optimizer.zero_grad(set_to_none=True)
        loss, parts = loss_parts(model, tensors)
        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), 10.0)
        optimizer.step()
        value = float(loss.detach())
        if value < best_loss:
            best_loss = value
            best = {name: tensor.detach().cpu().clone() for name, tensor in model.state_dict().items()}
        if epoch == 1 or epoch % 25 == 0:
            history.append({"epoch": epoch, "loss": round(value, 7), **{key: round(item, 7) for key, item in parts.items()}})
            print(json.dumps(history[-1]), flush=True)
        if epoch >= 100 and value < 2e-4:
            break
    if best is None:
        raise RuntimeError("No proof checkpoint was produced")
    model.load_state_dict(best)
    report, arrays = metrics(model, tensors)
    report["epochsCompleted"] = epoch
    report["bestTrainingLoss"] = round(best_loss, 8)
    args.output_dir.mkdir(parents=True, exist_ok=True)
    (args.output_dir / "proof-metrics.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    (args.output_dir / "history.json").write_text(json.dumps(history, indent=2) + "\n", encoding="utf-8")
    torch.save(
        {
            "stateDict": best,
            "stats": {
                "profileMean": stats.profile_mean.tolist(),
                "profileStd": stats.profile_std.tolist(),
                "geometryMean": stats.geometry_mean.tolist(),
                "geometryStd": stats.geometry_std.tolist(),
            "deltaMean": stats.delta_mean.tolist(),
            "deltaStd": stats.delta_std.tolist(),
            },
            "trainingOnlyProof": True,
            "geometryOnly": True,
            "circumferenceTrainingBlocked": True,
        },
        args.output_dir / "proof-model.pt",
    )
    contact_sheet(cards, arrays, args.output_dir / "proof-contact-sheet.jpg")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
