#!/usr/bin/env python3
"""Train the local front-photo line + depth-ratio model.

The JSONL manifest deliberately assigns each subject to train, validation, or
test. Never place one subject in more than one role. Manual photo labels may
omit depth_ratio; 3D-derived renders should provide it.
"""

from __future__ import annotations

import argparse
import json
import math
import random
from pathlib import Path
from typing import Any

import torch
import torch.nn as nn
import torch.nn.functional as F
from PIL import Image
from torch.utils.data import DataLoader, Dataset
from torchvision.models import MobileNet_V3_Small_Weights, mobilenet_v3_small
from torchvision.transforms import InterpolationMode
from torchvision.transforms import functional as TF


ROWS = ("waist", "trouserWaist", "hips")
INPUT_SIZE = 384
STRUCTURED_SIZE = 33 * 3 + 4
RGB_MEAN = (0.485, 0.456, 0.406)
RGB_STD = (0.229, 0.224, 0.225)
MEDIAPIPE_MIRROR_INDEX = (
    0, 4, 5, 6, 1, 2, 3, 8, 7, 10, 9,
    12, 11, 14, 13, 16, 15, 18, 17, 20, 19, 22, 21,
    24, 23, 26, 25, 28, 27, 30, 29, 32, 31,
)


def read_manifest(path: Path) -> list[dict[str, Any]]:
    samples: list[dict[str, Any]] = []
    subject_roles: dict[str, str] = {}
    for line_number, raw in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        if not raw.strip() or raw.lstrip().startswith("#"):
            continue
        sample = json.loads(raw)
        role = sample.get("role")
        subject_id = str(sample.get("subject_id", ""))
        if role not in {"train", "validation", "test"} or not subject_id:
            raise ValueError(f"line {line_number}: role and subject_id are required")
        previous = subject_roles.setdefault(subject_id, role)
        if previous != role:
            raise ValueError(f"subject {subject_id!r} appears in both {previous!r} and {role!r}")
        sample["_manifest_dir"] = str(path.parent)
        samples.append(sample)
    return samples


def resolve_sample_path(sample: dict[str, Any], key: str) -> Path:
    value = sample.get(key)
    if not isinstance(value, str) or not value:
        raise ValueError(f"{key} is required for subject {sample.get('subject_id')}")
    path = Path(value)
    return path if path.is_absolute() else Path(sample["_manifest_dir"]) / path


class FrontSizingDataset(Dataset):
    def __init__(self, samples: list[dict[str, Any]], role: str, augment: bool):
        self.samples = [sample for sample in samples if sample["role"] == role]
        self.augment = augment

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, index: int) -> dict[str, torch.Tensor]:
        sample = self.samples[index]
        image = Image.open(resolve_sample_path(sample, "image")).convert("RGB")
        mask = Image.open(resolve_sample_path(sample, "mask")).convert("L")
        image = TF.resize(image, [INPUT_SIZE, INPUT_SIZE], InterpolationMode.BILINEAR)
        mask = TF.resize(mask, [INPUT_SIZE, INPUT_SIZE], InterpolationMode.NEAREST)
        image_tensor = TF.pil_to_tensor(image).float() / 255.0
        mask_tensor = TF.pil_to_tensor(mask).float() / 255.0
        for channel in range(3):
            image_tensor[channel] = (image_tensor[channel] - RGB_MEAN[channel]) / RGB_STD[channel]

        rows = sample.get("rows", {})
        coordinates: list[float] = []
        depth_ratios: list[float] = []
        row_valid: list[float] = []
        for row_name in ROWS:
            row = rows.get(row_name) or {}
            accepted = bool(row.get("accepted", True))
            coordinate_values = [row.get("y_norm"), row.get("left_x_norm"), row.get("right_x_norm")]
            coordinate_valid = accepted and all(isinstance(value, (int, float)) for value in coordinate_values)
            coordinates.extend(float(value) if coordinate_valid else 0.0 for value in coordinate_values)
            depth = row.get("depth_ratio")
            depth_ratios.append(float(depth) if accepted and isinstance(depth, (int, float)) else math.nan)
            row_valid.append(1.0 if coordinate_valid else 0.0)

        landmarks = sample.get("landmarks")
        if not isinstance(landmarks, list) or len(landmarks) != 33:
            raise ValueError(f"subject {sample.get('subject_id')}: exactly 33 landmarks are required")
        structured: list[float] = []
        for landmark in landmarks:
            structured.extend([
                float(landmark.get("x", 0.0)),
                float(landmark.get("y", 0.0)),
                float(landmark.get("visibility", 0.0)),
            ])
        height_cm = float(sample["height_cm"])
        weight_kg = float(sample["weight_kg"])
        bmi = weight_kg / ((height_cm / 100.0) ** 2)
        structured.extend([
            height_cm / 200.0,
            weight_kg / 150.0,
            bmi / 50.0,
            1.0 if sample.get("gender") == "male" else 0.0,
        ])

        if self.augment and random.random() < 0.5:
            image_tensor = torch.flip(image_tensor, dims=[2])
            mask_tensor = torch.flip(mask_tensor, dims=[2])
            for row_index in range(3):
                left_index = row_index * 3 + 1
                right_index = row_index * 3 + 2
                left = coordinates[left_index]
                right = coordinates[right_index]
                coordinates[left_index] = 1.0 - right
                coordinates[right_index] = 1.0 - left
            original_landmarks = structured[: 33 * 3].copy()
            for landmark_index, source_index in enumerate(MEDIAPIPE_MIRROR_INDEX):
                structured[landmark_index * 3] = 1.0 - original_landmarks[source_index * 3]
                structured[landmark_index * 3 + 1] = original_landmarks[source_index * 3 + 1]
                structured[landmark_index * 3 + 2] = original_landmarks[source_index * 3 + 2]

        depth_tensor = torch.tensor(depth_ratios, dtype=torch.float32)
        return {
            "image": torch.cat([image_tensor, mask_tensor], dim=0),
            "structured": torch.tensor(structured, dtype=torch.float32),
            "coordinates": torch.tensor(coordinates, dtype=torch.float32),
            "depth_ratios": torch.nan_to_num(depth_tensor),
            "depth_valid": torch.isfinite(depth_tensor).float(),
            "row_valid": torch.tensor(row_valid, dtype=torch.float32),
        }


class FrontMultiTaskModel(nn.Module):
    def __init__(self, pretrained: bool):
        super().__init__()
        weights = MobileNet_V3_Small_Weights.DEFAULT if pretrained else None
        backbone = mobilenet_v3_small(weights=weights)
        original = backbone.features[0][0]
        replacement = nn.Conv2d(
            4,
            original.out_channels,
            kernel_size=original.kernel_size,
            stride=original.stride,
            padding=original.padding,
            bias=False,
        )
        with torch.no_grad():
            replacement.weight[:, :3] = original.weight
            replacement.weight[:, 3:4] = original.weight.mean(dim=1, keepdim=True)
        backbone.features[0][0] = replacement
        backbone.classifier = nn.Identity()
        self.backbone = backbone
        self.structured = nn.Sequential(
            nn.Linear(STRUCTURED_SIZE, 128),
            nn.ReLU(),
            nn.Dropout(0.15),
        )
        self.head = nn.Sequential(
            nn.Linear(576 + 128, 256),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(256, 15),
        )

    def forward(self, image: torch.Tensor, structured: torch.Tensor) -> torch.Tensor:
        features = torch.cat([self.backbone(image), self.structured(structured)], dim=1)
        raw = self.head(features)
        coordinates = torch.sigmoid(raw[:, :9])
        depth_ratios = 0.35 + 0.75 * torch.sigmoid(raw[:, 9:12])
        confidence = torch.sigmoid(raw[:, 12:15])
        return torch.cat([coordinates, depth_ratios, confidence], dim=1)


def masked_mean(values: torch.Tensor, mask: torch.Tensor) -> torch.Tensor:
    return (values * mask).sum() / mask.sum().clamp_min(1.0)


def batch_loss(prediction: torch.Tensor, batch: dict[str, torch.Tensor]) -> tuple[torch.Tensor, dict[str, float]]:
    predicted_coordinates = prediction[:, :9].view(-1, 3, 3)
    target_coordinates = batch["coordinates"].view(-1, 3, 3)
    row_valid = batch["row_valid"]
    coordinate_loss = masked_mean(
        F.smooth_l1_loss(predicted_coordinates, target_coordinates, reduction="none").mean(dim=2),
        row_valid,
    )
    depth_loss = masked_mean(
        F.smooth_l1_loss(prediction[:, 9:12], batch["depth_ratios"], reduction="none"),
        batch["depth_valid"],
    )
    confidence_loss = F.binary_cross_entropy(prediction[:, 12:15], row_valid)
    row_y = predicted_coordinates[:, :, 0]
    row_order_loss = (
        F.relu(row_y[:, 0] - row_y[:, 1] + 0.01)
        + F.relu(row_y[:, 1] - row_y[:, 2] + 0.01)
    ).mean()
    span_loss = F.relu(predicted_coordinates[:, :, 1] - predicted_coordinates[:, :, 2] + 0.03).mean()
    total = coordinate_loss + 1.5 * depth_loss + 0.25 * confidence_loss + 0.2 * row_order_loss + 0.2 * span_loss
    return total, {
        "coordinate": float(coordinate_loss.detach()),
        "depth": float(depth_loss.detach()),
        "confidence": float(confidence_loss.detach()),
        "row_order": float(row_order_loss.detach()),
        "span": float(span_loss.detach()),
    }


def run_epoch(model: nn.Module, loader: DataLoader, device: torch.device, optimizer=None) -> float:
    training = optimizer is not None
    model.train(training)
    total = 0.0
    for batch in loader:
        batch = {key: value.to(device) for key, value in batch.items()}
        with torch.set_grad_enabled(training):
            prediction = model(batch["image"], batch["structured"])
            loss, _ = batch_loss(prediction, batch)
        if training:
            optimizer.zero_grad(set_to_none=True)
            loss.backward()
            optimizer.step()
        total += float(loss.detach()) * batch["image"].shape[0]
    return total / max(1, len(loader.dataset))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--epochs", type=int, default=40)
    parser.add_argument("--batch-size", type=int, default=16)
    parser.add_argument("--pretrained", action="store_true")
    args = parser.parse_args()

    torch.manual_seed(42)
    random.seed(42)
    samples = read_manifest(args.manifest)
    train_data = FrontSizingDataset(samples, "train", augment=True)
    validation_data = FrontSizingDataset(samples, "validation", augment=False)
    if not train_data or not validation_data:
        raise SystemExit("Manifest needs subject-separated train and validation samples.")

    device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")
    model = FrontMultiTaskModel(args.pretrained).to(device)
    optimizer = torch.optim.AdamW(model.parameters(), lr=2e-4, weight_decay=1e-4)
    train_loader = DataLoader(train_data, batch_size=args.batch_size, shuffle=True, num_workers=0)
    validation_loader = DataLoader(validation_data, batch_size=args.batch_size, shuffle=False, num_workers=0)
    best_validation = float("inf")
    best_state = None

    for epoch in range(1, args.epochs + 1):
        train_loss = run_epoch(model, train_loader, device, optimizer)
        validation_loss = run_epoch(model, validation_loader, device)
        print(f"epoch={epoch:03d} train={train_loss:.5f} validation={validation_loss:.5f}")
        if validation_loss < best_validation:
            best_validation = validation_loss
            best_state = {key: value.detach().cpu() for key, value in model.state_dict().items()}

    if best_state is None:
        raise SystemExit("Training produced no checkpoint.")
    model.load_state_dict(best_state)
    model.cpu().eval()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    torch.onnx.export(
        model,
        (torch.zeros(1, 4, INPUT_SIZE, INPUT_SIZE), torch.zeros(1, STRUCTURED_SIZE)),
        args.output,
        input_names=["image", "structured"],
        output_names=["prediction"],
        dynamic_axes={"image": {0: "batch"}, "structured": {0: "batch"}, "prediction": {0: "batch"}},
        opset_version=17,
        dynamo=False,
    )
    print(f"saved={args.output} validation={best_validation:.5f}")


if __name__ == "__main__":
    main()
