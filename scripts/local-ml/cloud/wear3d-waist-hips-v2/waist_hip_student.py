"""Constrained waist/hip-only WEAR student and export contract.

The student predicts a compact latent representation. 32-point rings are
decoded from a fixed PCA basis learned only from accepted training shapes, so
the network cannot emit unrelated or self-crossing point clouds.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import numpy as np
import torch
from torch import nn


IMAGE_WIDTH = 96
IMAGE_HEIGHT = 128
ROWS = ("waist", "hips")
# Eight components left an irreducible hip-ring reconstruction error above the
# mandatory overfit gate. Sixteen preserves a compact latent while representing
# the accepted 32-point teacher rings accurately; the public 150-field output
# contract remains unchanged.
PCA_COMPONENTS = 16
PROFILE_FIELDS = (
    "height_cm",
    "weight_kg",
    "bmi",
    "gender_female",
    "gender_male",
)
DIRECT_FIELDS = (
    "y_norm",
    "center_norm",
    "span_norm",
    "width_cm",
    "depth_cm",
    "tape_cm",
)
CAMERA_FIELDS = (
    "correction_yaw_deg",
    "correction_pitch_deg",
    "correction_roll_deg",
    "correction_target_height_ratio",
    "input_lens_ratio_to_50mm",
    "input_distance_scale",
)


def latent_schema() -> list[str]:
    keys: list[str] = []
    for row in ROWS:
        keys.extend(f"{row}.{field}" for field in DIRECT_FIELDS)
        keys.extend(f"{row}.shape_pca.{index:02d}" for index in range(PCA_COMPONENTS))
    keys.extend(f"camera.{field}" for field in CAMERA_FIELDS)
    expected = len(ROWS) * (len(DIRECT_FIELDS) + PCA_COMPONENTS) + len(CAMERA_FIELDS)
    if len(keys) != expected or len(keys) != len(set(keys)):
        raise RuntimeError(f"Waist/hip latent schema changed: {len(keys)}")
    return keys


def output_schema() -> list[str]:
    keys: list[str] = []
    for row in ROWS:
        keys.extend(
            f"row.{row}.{field}"
            for field in (
                "y_norm",
                "left_x_norm",
                "right_x_norm",
                "width_cm",
                "depth_cm",
                "depth_width_ratio",
            )
        )
        for point in range(32):
            keys.append(f"row.{row}.shape.{point:02d}.x")
            keys.append(f"row.{row}.shape.{point:02d}.depth")
        keys.append(f"tape.{row}.circumference_cm")
    keys.extend(f"camera.{field}" for field in CAMERA_FIELDS)
    keys.extend(("ratio.front.waist_hips", "ratio.tape.waist_hips"))
    if len(keys) != 150 or len(keys) != len(set(keys)):
        raise RuntimeError(f"Waist/hip output schema changed: {len(keys)}")
    return keys


def source_shape_keys(row: str) -> list[str]:
    return [
        f"row.{row}.shape.{point:02d}.{axis}"
        for point in range(32)
        for axis in ("x", "depth")
    ]


def profile_vector(record: dict[str, Any]) -> list[float]:
    height = float(record.get("height_cm") or 170.0)
    weight = float(record.get("weight_kg") or 70.0)
    bmi = float(record.get("bmi") or (weight / ((height / 100.0) ** 2)))
    gender = str(record.get("gender") or "unknown").lower()
    return [
        (height - 170.0) / 20.0,
        (weight - 70.0) / 25.0,
        (bmi - 24.0) / 8.0,
        1.0 if gender == "female" else 0.0,
        1.0 if gender == "male" else 0.0,
    ]


def deterministic_pca(values: np.ndarray, components: int = PCA_COMPONENTS) -> tuple[np.ndarray, np.ndarray]:
    """Return a deterministic mean and row-major PCA basis."""
    if values.ndim != 2 or values.shape[1] != 64 or len(values) < components + 1:
        raise ValueError(f"Invalid shape matrix for PCA: {values.shape}")
    mean = values.mean(axis=0, dtype=np.float64)
    _, _, basis = np.linalg.svd(values.astype(np.float64) - mean, full_matrices=False)
    basis = basis[:components]
    for index in range(len(basis)):
        anchor = int(np.argmax(np.abs(basis[index])))
        if basis[index, anchor] < 0:
            basis[index] *= -1
    return mean.astype(np.float32), basis.astype(np.float32)


class ResidualBlock(nn.Module):
    def __init__(self, input_channels: int, output_channels: int, stride: int = 1) -> None:
        super().__init__()
        self.body = nn.Sequential(
            nn.Conv2d(input_channels, output_channels, 3, stride=stride, padding=1, bias=False),
            nn.BatchNorm2d(output_channels),
            nn.SiLU(inplace=True),
            nn.Conv2d(output_channels, output_channels, 3, padding=1, bias=False),
            nn.BatchNorm2d(output_channels),
        )
        self.skip = (
            nn.Identity()
            if stride == 1 and input_channels == output_channels
            else nn.Sequential(
                nn.Conv2d(input_channels, output_channels, 1, stride=stride, bias=False),
                nn.BatchNorm2d(output_channels),
            )
        )
        self.activation = nn.SiLU(inplace=True)

    def forward(self, inputs: torch.Tensor) -> torch.Tensor:
        return self.activation(self.body(inputs) + self.skip(inputs))


class WaistHipStudent(nn.Module):
    """Spatial CNN plus explicit silhouette-outline and profile branches."""

    def __init__(self) -> None:
        super().__init__()
        x_axis = torch.linspace(-1.0, 1.0, IMAGE_WIDTH).view(1, 1, 1, IMAGE_WIDTH)
        y_axis = torch.linspace(-1.0, 1.0, IMAGE_HEIGHT).view(1, 1, IMAGE_HEIGHT, 1)
        self.register_buffer(
            "coordinate_grid",
            torch.cat(
                (
                    x_axis.expand(1, 1, IMAGE_HEIGHT, IMAGE_WIDTH),
                    y_axis.expand(1, 1, IMAGE_HEIGHT, IMAGE_WIDTH),
                ),
                dim=1,
            ),
            persistent=True,
        )
        self.register_buffer("x_axis", x_axis, persistent=True)
        self.encoder = nn.Sequential(
            nn.Conv2d(3, 24, 5, stride=2, padding=2, bias=False),
            nn.BatchNorm2d(24),
            nn.SiLU(inplace=True),
            ResidualBlock(24, 24),
            ResidualBlock(24, 40, stride=2),
            ResidualBlock(40, 40),
            ResidualBlock(40, 64, stride=2),
            ResidualBlock(64, 64),
            ResidualBlock(64, 96, stride=2),
            ResidualBlock(96, 96),
            nn.AdaptiveAvgPool2d((4, 3)),
        )
        outline_size = IMAGE_HEIGHT * 2 + IMAGE_WIDTH
        self.outline_encoder = nn.Sequential(
            nn.Linear(outline_size, 192),
            nn.LayerNorm(192),
            nn.SiLU(inplace=True),
            nn.Dropout(0.08),
            nn.Linear(192, 96),
            nn.SiLU(inplace=True),
        )
        self.profile_encoder = nn.Sequential(
            nn.Linear(len(PROFILE_FIELDS), 64),
            nn.LayerNorm(64),
            nn.SiLU(inplace=True),
            nn.Linear(64, 64),
            nn.SiLU(inplace=True),
        )
        self.shared = nn.Sequential(
            nn.Linear(96 * 4 * 3 + 96 + 64, 512),
            nn.LayerNorm(512),
            nn.SiLU(inplace=True),
            nn.Dropout(0.20),
            nn.Linear(512, 256),
            nn.LayerNorm(256),
            nn.SiLU(inplace=True),
            nn.Dropout(0.10),
        )
        self.row_direct_heads = nn.ModuleDict(
            {
                row: nn.Sequential(
                    nn.Linear(256, 128),
                    nn.SiLU(inplace=True),
                    nn.Dropout(0.10),
                    nn.Linear(128, len(DIRECT_FIELDS)),
                )
                for row in ROWS
            }
        )
        self.row_shape_heads = nn.ModuleDict(
            {
                row: nn.Sequential(
                    nn.Linear(256 + len(DIRECT_FIELDS), 128),
                    nn.LayerNorm(128),
                    nn.SiLU(inplace=True),
                    nn.Dropout(0.10),
                    nn.Linear(128, PCA_COMPONENTS),
                )
                for row in ROWS
            }
        )
        self.camera_head = nn.Sequential(
            nn.Linear(256, 96),
            nn.SiLU(inplace=True),
            nn.Linear(96, len(CAMERA_FIELDS)),
        )

    def _outline_features(self, silhouette: torch.Tensor) -> torch.Tensor:
        row_mass = silhouette.mean(dim=3).squeeze(1)
        column_mass = silhouette.mean(dim=2).squeeze(1)
        numerator = (silhouette * self.x_axis).sum(dim=3).squeeze(1)
        denominator = silhouette.sum(dim=3).squeeze(1).clamp_min(1e-4)
        row_center = numerator / denominator
        return torch.cat((row_mass, row_center, column_mass), dim=1)

    def forward(self, silhouette: torch.Tensor, profile: torch.Tensor) -> torch.Tensor:
        grid = self.coordinate_grid.expand(silhouette.shape[0], -1, -1, -1)
        spatial = self.encoder(torch.cat((silhouette, grid), dim=1)).flatten(1)
        outline = self.outline_encoder(self._outline_features(silhouette))
        profile_features = self.profile_encoder(profile)
        shared = self.shared(torch.cat((spatial, outline, profile_features), dim=1))
        rows = []
        for row in ROWS:
            direct = self.row_direct_heads[row](shared)
            shape = self.row_shape_heads[row](torch.cat((shared, direct), dim=1))
            rows.append(torch.cat((direct, shape), dim=1))
        return torch.cat((*rows, self.camera_head(shared)), dim=1)


class WaistHipStudentLarge(nn.Module):
    """The independent large fresh candidate used by the final ensemble."""

    def __init__(self) -> None:
        super().__init__()
        x_axis = torch.linspace(-1.0, 1.0, IMAGE_WIDTH).view(1, 1, 1, IMAGE_WIDTH)
        y_axis = torch.linspace(-1.0, 1.0, IMAGE_HEIGHT).view(1, 1, IMAGE_HEIGHT, 1)
        self.register_buffer(
            "coordinate_grid",
            torch.cat(
                (
                    x_axis.expand(1, 1, IMAGE_HEIGHT, IMAGE_WIDTH),
                    y_axis.expand(1, 1, IMAGE_HEIGHT, IMAGE_WIDTH),
                ),
                dim=1,
            ),
            persistent=True,
        )
        self.register_buffer("x_axis", x_axis, persistent=True)
        self.encoder = nn.Sequential(
            nn.Conv2d(3, 32, 5, stride=2, padding=2, bias=False),
            nn.BatchNorm2d(32),
            nn.SiLU(inplace=True),
            ResidualBlock(32, 32),
            ResidualBlock(32, 64, stride=2),
            ResidualBlock(64, 64),
            ResidualBlock(64, 112, stride=2),
            ResidualBlock(112, 112),
            ResidualBlock(112, 160, stride=2),
            ResidualBlock(160, 160),
        )
        outline_size = IMAGE_HEIGHT * 2 + IMAGE_WIDTH
        self.outline_encoder = nn.Sequential(
            nn.Linear(outline_size, 256),
            nn.LayerNorm(256),
            nn.SiLU(inplace=True),
            nn.Linear(256, 128),
            nn.SiLU(inplace=True),
        )
        self.profile_encoder = nn.Sequential(
            nn.Linear(len(PROFILE_FIELDS), 64),
            nn.LayerNorm(64),
            nn.SiLU(inplace=True),
            nn.Linear(64, 64),
            nn.SiLU(inplace=True),
        )
        self.shared = nn.Sequential(
            nn.Linear(160 * 8 * 6 + 128 + 64, 768),
            nn.LayerNorm(768),
            nn.SiLU(inplace=True),
            nn.Dropout(0.08),
            nn.Linear(768, 384),
            nn.LayerNorm(384),
            nn.SiLU(inplace=True),
        )
        self.row_direct_heads = nn.ModuleDict(
            {
                row: nn.Sequential(
                    nn.Linear(384, 256),
                    nn.SiLU(inplace=True),
                    nn.Dropout(0.04),
                    nn.Linear(256, len(DIRECT_FIELDS)),
                )
                for row in ROWS
            }
        )
        self.row_shape_heads = nn.ModuleDict(
            {
                row: nn.Sequential(
                    nn.Linear(384 + len(DIRECT_FIELDS), 256),
                    nn.LayerNorm(256),
                    nn.SiLU(inplace=True),
                    nn.Dropout(0.04),
                    nn.Linear(256, PCA_COMPONENTS),
                )
                for row in ROWS
            }
        )
        self.camera_head = nn.Sequential(
            nn.Linear(384, 128),
            nn.SiLU(inplace=True),
            nn.Linear(128, len(CAMERA_FIELDS)),
        )

    def _outline_features(self, silhouette: torch.Tensor) -> torch.Tensor:
        row_mass = silhouette.mean(dim=3).squeeze(1)
        column_mass = silhouette.mean(dim=2).squeeze(1)
        numerator = (silhouette * self.x_axis).sum(dim=3).squeeze(1)
        denominator = silhouette.sum(dim=3).squeeze(1).clamp_min(1e-4)
        row_center = numerator / denominator
        return torch.cat((row_mass, row_center, column_mass), dim=1)

    def forward(self, silhouette: torch.Tensor, profile: torch.Tensor) -> torch.Tensor:
        grid = self.coordinate_grid.expand(silhouette.shape[0], -1, -1, -1)
        spatial = self.encoder(torch.cat((silhouette, grid), dim=1)).flatten(1)
        outline = self.outline_encoder(self._outline_features(silhouette))
        profile_features = self.profile_encoder(profile)
        shared = self.shared(torch.cat((spatial, outline, profile_features), dim=1))
        rows = []
        for row in ROWS:
            direct = self.row_direct_heads[row](shared)
            shape = self.row_shape_heads[row](torch.cat((shared, direct), dim=1))
            rows.append(torch.cat((direct, shape), dim=1))
        return torch.cat((*rows, self.camera_head(shared)), dim=1)


@dataclass(frozen=True)
class DecoderArrays:
    latent_means: np.ndarray
    latent_stds: np.ndarray
    pca_means: np.ndarray
    pca_bases: np.ndarray


class WaistHipDecoder(nn.Module):
    """Decode standardized latents into physically consistent public outputs."""

    def __init__(self, arrays: DecoderArrays) -> None:
        super().__init__()
        self.register_buffer("latent_means", torch.as_tensor(arrays.latent_means, dtype=torch.float32).view(1, -1))
        self.register_buffer("latent_stds", torch.as_tensor(arrays.latent_stds, dtype=torch.float32).view(1, -1))
        self.register_buffer("pca_means", torch.as_tensor(arrays.pca_means, dtype=torch.float32))
        self.register_buffer("pca_bases", torch.as_tensor(arrays.pca_bases, dtype=torch.float32))

    @staticmethod
    def _normalize_shape(shape: torch.Tensor) -> torch.Tensor:
        shaped = shape.view(shape.shape[0], 32, 2)
        minimum = shaped.amin(dim=1, keepdim=True)
        maximum = shaped.amax(dim=1, keepdim=True)
        center = (minimum + maximum) * 0.5
        radius = ((maximum - minimum) * 0.5).clamp_min(1e-4)
        return ((shaped - center) / radius).reshape(shape.shape[0], 64)

    def forward(self, standardized: torch.Tensor) -> torch.Tensor:
        # Keep every inferred latent inside the range represented by the
        # accepted training population. This prevents extreme PCA rings on
        # unusual inputs while preserving more than 99.99% of a normal target.
        raw = standardized.clamp(-5.0, 5.0) * self.latent_stds + self.latent_means
        outputs: list[torch.Tensor] = []
        row_values: dict[str, dict[str, torch.Tensor]] = {}
        cursor = 0
        for row_index, row in enumerate(ROWS):
            direct = raw[:, cursor:cursor + len(DIRECT_FIELDS)]
            cursor += len(DIRECT_FIELDS)
            coefficients = raw[:, cursor:cursor + PCA_COMPONENTS]
            cursor += PCA_COMPONENTS
            y = direct[:, 0].clamp(0.20, 0.75)
            center = direct[:, 1].clamp(0.20, 0.80)
            span = direct[:, 2].clamp(0.06, 0.70)
            left = (center - span * 0.5).clamp(0.02, 0.94)
            right = (center + span * 0.5).clamp(0.06, 0.98)
            width = direct[:, 3].clamp(15.0, 75.0)
            depth = direct[:, 4].clamp(10.0, 75.0)
            tape = direct[:, 5].clamp(40.0, 220.0)
            shape = self._normalize_shape(
                self.pca_means[row_index].view(1, 64)
                + coefficients @ self.pca_bases[row_index]
            )
            ratio = depth / width.clamp_min(1e-4)
            outputs.extend((y, left, right, width, depth, ratio))
            outputs.extend(shape[:, index] for index in range(64))
            outputs.append(tape)
            row_values[row] = {"width": width, "tape": tape}
        outputs.extend(raw[:, cursor + index] for index in range(len(CAMERA_FIELDS)))
        outputs.append(row_values["waist"]["width"] / row_values["hips"]["width"].clamp_min(1e-4))
        outputs.append(row_values["waist"]["tape"] / row_values["hips"]["tape"].clamp_min(1e-4))
        return torch.stack(outputs, dim=1)


class WaistHipExportModel(nn.Module):
    def __init__(self, student: WaistHipStudent, decoder: WaistHipDecoder) -> None:
        super().__init__()
        self.student = student
        self.decoder = decoder

    def forward(self, silhouette: torch.Tensor, profile: torch.Tensor) -> torch.Tensor:
        return self.decoder(self.student(silhouette, profile))


class WaistHipEnsembleExportModel(nn.Module):
    """Average two independently trained fresh latent predictors, then decode."""

    def __init__(
        self,
        large_student: WaistHipStudentLarge,
        compact_student: WaistHipStudent,
        decoder: WaistHipDecoder,
        compact_weight: float = 0.5,
    ) -> None:
        super().__init__()
        self.large_student = large_student
        self.compact_student = compact_student
        self.decoder = decoder
        self.compact_weight = float(compact_weight)

    def forward(self, silhouette: torch.Tensor, profile: torch.Tensor) -> torch.Tensor:
        large = self.large_student(silhouette, profile)
        compact = self.compact_student(silhouette, profile)
        blended = large * (1.0 - self.compact_weight) + compact * self.compact_weight
        return self.decoder(blended)
