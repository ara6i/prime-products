"""V5 front-silhouette student with explicit ratios and full-shape tape fusion.

WEAR tape values are the only circumference targets. PLY-derived geometry is
auxiliary supervision for row position, A-to-B width, hidden depth, and ring
shape. Geometry is detached before entering the tape branch so tape gradients
can never rewrite the 3D teacher.
"""

from __future__ import annotations

import torch
from torch import nn

from waist_hip_student import (
    CAMERA_FIELDS,
    DIRECT_FIELDS,
    IMAGE_HEIGHT,
    IMAGE_WIDTH,
    PCA_COMPONENTS,
    PROFILE_FIELDS,
    ROWS,
    ResidualBlock,
)


GEOMETRY_DIRECT_FIELDS = tuple(field for field in DIRECT_FIELDS if field != "tape_cm")
EXPLICIT_RATIO_FEATURES = 23
TAPE_EXPERTS = 4


class WaistHipStudentV5(nn.Module):
    """Independent 3D and WEAR-tape paths with explicit body-ratio features."""

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

        self.geometry_encoder = nn.Sequential(
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
        self.tape_encoder = nn.Sequential(
            nn.Conv2d(3, 24, 5, stride=2, padding=2, bias=False),
            nn.BatchNorm2d(24),
            nn.SiLU(inplace=True),
            ResidualBlock(24, 40, stride=2),
            ResidualBlock(40, 64, stride=2),
            ResidualBlock(64, 96, stride=2),
            nn.AdaptiveAvgPool2d((4, 3)),
        )

        outline_size = IMAGE_HEIGHT * 2 + IMAGE_WIDTH
        self.geometry_outline = nn.Sequential(
            nn.Linear(outline_size, 256),
            nn.LayerNorm(256),
            nn.SiLU(inplace=True),
            nn.Linear(256, 128),
            nn.SiLU(inplace=True),
        )
        self.tape_outline = nn.Sequential(
            nn.Linear(outline_size, 192),
            nn.LayerNorm(192),
            nn.SiLU(inplace=True),
            nn.Linear(192, 96),
            nn.SiLU(inplace=True),
        )
        self.geometry_profile = nn.Sequential(
            nn.Linear(len(PROFILE_FIELDS), 64),
            nn.LayerNorm(64),
            nn.SiLU(inplace=True),
            nn.Linear(64, 64),
            nn.SiLU(inplace=True),
        )
        self.tape_profile = nn.Sequential(
            nn.Linear(len(PROFILE_FIELDS), 96),
            nn.LayerNorm(96),
            nn.SiLU(inplace=True),
            nn.Linear(96, 96),
            nn.SiLU(inplace=True),
        )
        self.geometry_ratios = nn.Sequential(
            nn.Linear(EXPLICIT_RATIO_FEATURES, 96),
            nn.LayerNorm(96),
            nn.SiLU(inplace=True),
            nn.Linear(96, 64),
            nn.SiLU(inplace=True),
        )
        self.tape_ratios = nn.Sequential(
            nn.Linear(EXPLICIT_RATIO_FEATURES, 128),
            nn.LayerNorm(128),
            nn.SiLU(inplace=True),
            nn.Linear(128, 96),
            nn.SiLU(inplace=True),
        )

        self.geometry_trunk = nn.Sequential(
            nn.Linear(160 * 8 * 6 + 128 + 64 + 64, 768),
            nn.LayerNorm(768),
            nn.SiLU(inplace=True),
            nn.Dropout(0.12),
            nn.Linear(768, 384),
            nn.LayerNorm(384),
            nn.SiLU(inplace=True),
        )
        self.tape_trunk = nn.Sequential(
            nn.Linear(96 * 4 * 3 + 96 + 96 + 96, 448),
            nn.LayerNorm(448),
            nn.SiLU(inplace=True),
            nn.Dropout(0.12),
            nn.Linear(448, 288),
            nn.LayerNorm(288),
            nn.SiLU(inplace=True),
        )

        self.row_geometry_heads = nn.ModuleDict(
            {
                row: nn.Sequential(
                    nn.Linear(384, 256),
                    nn.SiLU(inplace=True),
                    nn.Dropout(0.08),
                    nn.Linear(256, len(GEOMETRY_DIRECT_FIELDS)),
                )
                for row in ROWS
            }
        )
        self.row_shape_heads = nn.ModuleDict(
            {
                row: nn.Sequential(
                    nn.Linear(384 + len(GEOMETRY_DIRECT_FIELDS), 320),
                    nn.LayerNorm(320),
                    nn.SiLU(inplace=True),
                    nn.Dropout(0.08),
                    nn.Linear(320, PCA_COMPONENTS),
                )
                for row in ROWS
            }
        )
        self.camera_head = nn.Sequential(
            nn.Linear(384, 128),
            nn.SiLU(inplace=True),
            nn.Linear(128, len(CAMERA_FIELDS)),
        )

        detached_geometry_size = len(ROWS) * (len(GEOMETRY_DIRECT_FIELDS) + PCA_COMPONENTS)
        tape_input_size = 288 + detached_geometry_size + len(CAMERA_FIELDS)
        self.row_tape_pre = nn.ModuleDict(
            {
                row: nn.Sequential(
                    nn.Linear(tape_input_size, 256),
                    nn.LayerNorm(256),
                    nn.SiLU(inplace=True),
                    nn.Dropout(0.08),
                )
                for row in ROWS
            }
        )
        self.row_tape_experts = nn.ModuleDict(
            {
                row: nn.ModuleList(
                    [
                        nn.Sequential(
                            nn.Linear(256, 128),
                            nn.SiLU(inplace=True),
                            nn.Linear(128, 1),
                        )
                        for _ in range(TAPE_EXPERTS)
                    ]
                )
                for row in ROWS
            }
        )
        self.row_tape_gates = nn.ModuleDict(
            {row: nn.Linear(256, TAPE_EXPERTS) for row in ROWS}
        )

    def _outline_features(self, silhouette: torch.Tensor) -> torch.Tensor:
        row_mass = silhouette.mean(dim=3).squeeze(1)
        column_mass = silhouette.mean(dim=2).squeeze(1)
        numerator = (silhouette * self.x_axis).sum(dim=3).squeeze(1)
        denominator = silhouette.sum(dim=3).squeeze(1).clamp_min(1e-4)
        row_center = numerator / denominator
        return torch.cat((row_mass, row_center, column_mass), dim=1)

    @staticmethod
    def _band(row_mass: torch.Tensor, start: float, end: float) -> torch.Tensor:
        first = int(round(start * IMAGE_HEIGHT))
        last = max(first + 1, int(round(end * IMAGE_HEIGHT)))
        values = row_mass[:, first:last]
        return torch.stack((values.mean(dim=1), values.amax(dim=1), values.amin(dim=1)), dim=1)

    def _explicit_ratio_features(self, silhouette: torch.Tensor) -> torch.Tensor:
        """Runtime-available A-to-B proxies and ratios from the front mask."""
        row_mass = silhouette.mean(dim=3).squeeze(1)
        neck = self._band(row_mass, 0.08, 0.19)
        shoulder = self._band(row_mass, 0.15, 0.30)
        chest = self._band(row_mass, 0.25, 0.40)
        waist = self._band(row_mass, 0.34, 0.49)
        hips = self._band(row_mass, 0.43, 0.60)

        neck_width = neck[:, 0].clamp_min(1e-3)
        shoulder_width = shoulder[:, 1].clamp_min(1e-3)
        chest_width = chest[:, 0].clamp_min(1e-3)
        waist_width = waist[:, 2].clamp_min(1e-3)
        hip_width = hips[:, 1].clamp_min(1e-3)
        ratios = torch.stack(
            (
                shoulder_width / waist_width,
                shoulder_width / hip_width,
                chest_width / waist_width,
                chest_width / hip_width,
                neck_width / shoulder_width,
                neck_width / waist_width,
                waist_width / hip_width,
                hip_width / waist_width,
            ),
            dim=1,
        ).clamp(0.0, 8.0)
        return torch.cat((neck, shoulder, chest, waist, hips, ratios), dim=1)

    def _tape_value(self, row: str, features: torch.Tensor) -> torch.Tensor:
        hidden = self.row_tape_pre[row](features)
        experts = torch.cat(tuple(expert(hidden) for expert in self.row_tape_experts[row]), dim=1)
        gates = torch.softmax(self.row_tape_gates[row](hidden), dim=1)
        return (experts * gates).sum(dim=1, keepdim=True)

    def forward(self, silhouette: torch.Tensor, profile: torch.Tensor) -> torch.Tensor:
        grid = self.coordinate_grid.expand(silhouette.shape[0], -1, -1, -1)
        spatial_input = torch.cat((silhouette, grid), dim=1)
        outline = self._outline_features(silhouette)
        explicit_ratios = self._explicit_ratio_features(silhouette)

        geometry = self.geometry_trunk(
            torch.cat(
                (
                    self.geometry_encoder(spatial_input).flatten(1),
                    self.geometry_outline(outline),
                    self.geometry_profile(profile),
                    self.geometry_ratios(explicit_ratios),
                ),
                dim=1,
            )
        )
        tape = self.tape_trunk(
            torch.cat(
                (
                    self.tape_encoder(spatial_input).flatten(1),
                    self.tape_outline(outline),
                    self.tape_profile(profile),
                    self.tape_ratios(explicit_ratios),
                ),
                dim=1,
            )
        )

        geometry_direct = {row: self.row_geometry_heads[row](geometry) for row in ROWS}
        geometry_shape = {
            row: self.row_shape_heads[row](torch.cat((geometry, geometry_direct[row]), dim=1))
            for row in ROWS
        }
        camera = self.camera_head(geometry)
        detached_context = torch.cat(
            tuple(
                value.detach()
                for row in ROWS
                for value in (geometry_direct[row], geometry_shape[row])
            )
            + (camera.detach(),),
            dim=1,
        )

        rows: list[torch.Tensor] = []
        for row in ROWS:
            tape_value = self._tape_value(row, torch.cat((tape, detached_context), dim=1))
            rows.append(torch.cat((geometry_direct[row], tape_value, geometry_shape[row]), dim=1))
        return torch.cat((*rows, camera), dim=1)

