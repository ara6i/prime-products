"""Fresh dual-branch front-silhouette to 3D waist/hip student.

Geometry and recorded tape are different supervised tasks. They see the same
front silhouette and profile, but tape gradients cannot distort row position,
width, depth, or 3D-shape features. Tape may use detached geometry estimates as
context while remaining free to disagree with the walked 3D contour.
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


class WaistHipStudentV4(nn.Module):
    """Independent geometry and tape encoders with a stable V2 latent contract."""

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

        self.geometry_trunk = nn.Sequential(
            nn.Linear(160 * 8 * 6 + 128 + 64, 768),
            nn.LayerNorm(768),
            nn.SiLU(inplace=True),
            nn.Dropout(0.05),
            nn.Linear(768, 384),
            nn.LayerNorm(384),
            nn.SiLU(inplace=True),
        )
        self.tape_trunk = nn.Sequential(
            nn.Linear(96 * 4 * 3 + 96 + 96, 384),
            nn.LayerNorm(384),
            nn.SiLU(inplace=True),
            nn.Dropout(0.05),
            nn.Linear(384, 256),
            nn.LayerNorm(256),
            nn.SiLU(inplace=True),
        )

        self.row_geometry_heads = nn.ModuleDict(
            {
                row: nn.Sequential(
                    nn.Linear(384, 256),
                    nn.SiLU(inplace=True),
                    nn.Dropout(0.03),
                    nn.Linear(256, len(GEOMETRY_DIRECT_FIELDS)),
                )
                for row in ROWS
            }
        )
        self.row_shape_heads = nn.ModuleDict(
            {
                row: nn.Sequential(
                    nn.Linear(384 + len(GEOMETRY_DIRECT_FIELDS), 256),
                    nn.LayerNorm(256),
                    nn.SiLU(inplace=True),
                    nn.Linear(256, PCA_COMPONENTS),
                )
                for row in ROWS
            }
        )
        detached_geometry_size = len(ROWS) * len(GEOMETRY_DIRECT_FIELDS)
        self.row_tape_heads = nn.ModuleDict(
            {
                row: nn.Sequential(
                    nn.Linear(256 + detached_geometry_size, 192),
                    nn.LayerNorm(192),
                    nn.SiLU(inplace=True),
                    nn.Linear(192, 1),
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
        spatial_input = torch.cat((silhouette, grid), dim=1)
        outline = self._outline_features(silhouette)
        geometry = self.geometry_trunk(
            torch.cat(
                (
                    self.geometry_encoder(spatial_input).flatten(1),
                    self.geometry_outline(outline),
                    self.geometry_profile(profile),
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
                ),
                dim=1,
            )
        )

        geometry_direct = {row: self.row_geometry_heads[row](geometry) for row in ROWS}
        detached_context = torch.cat(tuple(geometry_direct[row].detach() for row in ROWS), dim=1)
        rows: list[torch.Tensor] = []
        for row in ROWS:
            direct = geometry_direct[row]
            tape_value = self.row_tape_heads[row](torch.cat((tape, detached_context), dim=1))
            shape = self.row_shape_heads[row](torch.cat((geometry, direct), dim=1))
            # Preserve the immutable latent order: five geometry values, tape,
            # then the PCA coefficients.
            rows.append(torch.cat((direct, tape_value, shape), dim=1))
        return torch.cat((*rows, self.camera_head(geometry)), dim=1)

