"""Two-stage observable waist/hip student.

The locator/camera stage is intentionally outside this model. This student
consumes the corrected front observations (including A-to-B) and keeps the 3D
geometry and recorded-tape tasks on separate trunks.
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np
import torch
from torch import nn


ROWS = ("waist", "hips")
PCA_COMPONENTS = 8
PROFILE_FIELDS = (
    "profile.height_cm",
    "profile.weight_kg",
    "profile.bmi",
    "profile.gender_female",
    "profile.gender_male",
)
OUTLINE_FIELDS = tuple(
    [f"outline.left.{index:02d}" for index in range(64)]
    + [f"outline.right.{index:02d}" for index in range(64)]
    + [f"outline.span.{index:02d}" for index in range(64)]
    + [f"outline.center.{index:02d}" for index in range(64)]
    + [f"outline.band_area.{index:02d}" for index in range(16)]
    + ["outline.total_area"]
)
EXACT_AB_FIELDS = (
    "row.waist.y_norm",
    "row.waist.left_x_norm",
    "row.waist.right_x_norm",
    "row.waist.width_cm",
    "row.hips.y_norm",
    "row.hips.left_x_norm",
    "row.hips.right_x_norm",
    "row.hips.width_cm",
    "ratio.front.shoulder_waist",
    "ratio.front.shoulder_hips",
)
UPPER_BODY_FIELDS = tuple(
    [
        f"row.{row}.{field}"
        for row in ("neck", "chest", "underbust")
        for field in ("y_norm", "left_x_norm", "right_x_norm", "width_cm")
    ]
    + [
        "ratio.front.neck_shoulder",
        "tape.neck.circumference_cm",
        "tape.chest.circumference_cm",
        "tape.underbust.circumference_cm",
    ]
)
CAMERA_FIELDS = (
    "camera.correction_yaw_deg",
    "camera.correction_pitch_deg",
    "camera.correction_roll_deg",
    "camera.correction_target_height_ratio",
    "camera.input_lens_ratio_to_50mm",
    "camera.input_distance_scale",
)
FEATURE_FIELDS = PROFILE_FIELDS + OUTLINE_FIELDS + EXACT_AB_FIELDS + UPPER_BODY_FIELDS + CAMERA_FIELDS


def latent_schema() -> list[str]:
    return [
        name
        for row in ROWS
        for name in (
            f"{row}.depth_cm",
            *(f"{row}.shape_pca.{component:02d}" for component in range(PCA_COMPONENTS)),
            f"{row}.tape_cm",
        )
    ]


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
    keys.extend(CAMERA_FIELDS)
    keys.extend(("ratio.front.waist_hips", "ratio.tape.waist_hips"))
    if len(keys) != 150 or len(keys) != len(set(keys)):
        raise RuntimeError(f"Observable student output contract changed: {len(keys)}")
    return keys


def deterministic_pca(values: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    if values.ndim != 2 or values.shape[1] != 64 or len(values) < PCA_COMPONENTS + 1:
        raise ValueError(f"Invalid PCA teacher matrix: {values.shape}")
    mean = values.mean(axis=0, dtype=np.float64)
    _, _, basis = np.linalg.svd(values.astype(np.float64) - mean, full_matrices=False)
    basis = basis[:PCA_COMPONENTS]
    for component in basis:
        anchor = int(np.argmax(np.abs(component)))
        if component[anchor] < 0:
            component *= -1
    return mean.astype(np.float32), basis.astype(np.float32)


class ResidualMlpBlock(nn.Module):
    def __init__(self, width: int, dropout: float) -> None:
        super().__init__()
        self.body = nn.Sequential(
            nn.Linear(width, width),
            nn.LayerNorm(width),
            nn.SiLU(inplace=True),
            nn.Dropout(dropout),
            nn.Linear(width, width),
        )
        self.activation = nn.SiLU(inplace=True)

    def forward(self, inputs: torch.Tensor) -> torch.Tensor:
        return self.activation(inputs + self.body(inputs))


class ObservableStudentV3(nn.Module):
    """Separate geometry and tape trunks prevent contradictory teacher tasks."""

    def __init__(self, feature_count: int = len(FEATURE_FIELDS), dropout: float = 0.08) -> None:
        super().__init__()
        input_count = feature_count * 2  # standardized values plus validity flags

        def trunk() -> nn.Sequential:
            return nn.Sequential(
                nn.Linear(input_count, 256),
                nn.LayerNorm(256),
                nn.SiLU(inplace=True),
                nn.Dropout(dropout),
                ResidualMlpBlock(256, dropout),
                nn.Linear(256, 128),
                nn.LayerNorm(128),
                nn.SiLU(inplace=True),
            )

        self.geometry_trunk = trunk()
        self.tape_trunk = trunk()
        self.waist_geometry = nn.Linear(128, 1 + PCA_COMPONENTS)
        self.hips_geometry = nn.Linear(128, 1 + PCA_COMPONENTS)
        self.waist_tape = nn.Linear(128, 1)
        self.hips_tape = nn.Linear(128, 1)

    def forward(self, prepared_features: torch.Tensor) -> torch.Tensor:
        geometry = self.geometry_trunk(prepared_features)
        tape = self.tape_trunk(prepared_features)
        return torch.cat(
            (
                self.waist_geometry(geometry),
                self.waist_tape(tape),
                self.hips_geometry(geometry),
                self.hips_tape(tape),
            ),
            dim=1,
        )


@dataclass(frozen=True)
class DecoderArrays:
    feature_means: np.ndarray
    feature_stds: np.ndarray
    latent_means: np.ndarray
    latent_stds: np.ndarray
    pca_means: np.ndarray
    pca_bases: np.ndarray


class ObservableExportModel(nn.Module):
    """Raw observable inputs to the same 150-field public contract as V2."""

    def __init__(self, student: ObservableStudentV3, arrays: DecoderArrays) -> None:
        super().__init__()
        self.student = student
        self.register_buffer("feature_means", torch.as_tensor(arrays.feature_means).view(1, -1))
        self.register_buffer("feature_stds", torch.as_tensor(arrays.feature_stds).view(1, -1))
        self.register_buffer("latent_means", torch.as_tensor(arrays.latent_means).view(1, -1))
        self.register_buffer("latent_stds", torch.as_tensor(arrays.latent_stds).view(1, -1))
        self.register_buffer("pca_means", torch.as_tensor(arrays.pca_means))
        self.register_buffer("pca_bases", torch.as_tensor(arrays.pca_bases))

    @staticmethod
    def _normalize_shape(shape: torch.Tensor) -> torch.Tensor:
        shaped = shape.view(shape.shape[0], 32, 2)
        minimum = shaped.amin(dim=1, keepdim=True)
        maximum = shaped.amax(dim=1, keepdim=True)
        center = (minimum + maximum) * 0.5
        radius = ((maximum - minimum) * 0.5).clamp_min(1e-4)
        return ((shaped - center) / radius).reshape(shape.shape[0], 64)

    def forward(self, observables: torch.Tensor, validity: torch.Tensor) -> torch.Tensor:
        validity = validity.clamp(0.0, 1.0)
        imputed = observables * validity + self.feature_means * (1.0 - validity)
        standardized = (imputed - self.feature_means) / self.feature_stds
        predicted_z = self.student(torch.cat((standardized, validity), dim=1))
        latent = predicted_z.clamp(-5.0, 5.0) * self.latent_stds + self.latent_means
        feature_index = {name: index for index, name in enumerate(FEATURE_FIELDS)}
        outputs: list[torch.Tensor] = []
        tapes: dict[str, torch.Tensor] = {}
        widths: dict[str, torch.Tensor] = {}
        cursor = 0
        for row_index, row in enumerate(ROWS):
            y = imputed[:, feature_index[f"row.{row}.y_norm"]].clamp(0.20, 0.75)
            left = imputed[:, feature_index[f"row.{row}.left_x_norm"]].clamp(0.02, 0.94)
            right = imputed[:, feature_index[f"row.{row}.right_x_norm"]].clamp(0.06, 0.98)
            width = imputed[:, feature_index[f"row.{row}.width_cm"]].clamp(15.0, 75.0)
            depth = latent[:, cursor].clamp(10.0, 75.0)
            coefficients = latent[:, cursor + 1:cursor + 1 + PCA_COMPONENTS]
            tape = latent[:, cursor + 1 + PCA_COMPONENTS].clamp(40.0, 220.0)
            cursor += 2 + PCA_COMPONENTS
            shape = self._normalize_shape(
                self.pca_means[row_index].view(1, 64)
                + coefficients @ self.pca_bases[row_index]
            )
            outputs.extend((y, left, right, width, depth, depth / width.clamp_min(1e-4)))
            outputs.extend(shape[:, index] for index in range(64))
            outputs.append(tape)
            widths[row] = width
            tapes[row] = tape
        outputs.extend(imputed[:, feature_index[field]] for field in CAMERA_FIELDS)
        outputs.append(widths["waist"] / widths["hips"].clamp_min(1e-4))
        outputs.append(tapes["waist"] / tapes["hips"].clamp_min(1e-4))
        return torch.stack(outputs, dim=1)
