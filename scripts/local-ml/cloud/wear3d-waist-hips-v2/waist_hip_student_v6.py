"""V6 WEAR student with authoritative tape and 3D teachers kept separate.

The public contract remains waist/hips only. During training, the tape branch
learns all five recorded WEAR tape measurements and their ratios. A separate
geometry branch learns all five 3D rows, shapes, and front ratios. No PLY row,
shape, walked perimeter, or camera prediction is ever fed into the tape path.
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


TEACHER_ROWS = ("neck", "chest", "underbust", "waist", "hips")
GEOMETRY_DIRECT_FIELDS = tuple(field for field in DIRECT_FIELDS if field != "tape_cm")
EXPLICIT_RATIO_FEATURES = 23
PROFILE_BASIS_FEATURES = 21
TAPE_EXPERTS = 4
AUXILIARY_ROW_TARGETS = 70
AUXILIARY_FRONT_RATIOS = 3
AUXILIARY_TARGET_COUNT = (
    len(TEACHER_ROWS)
    + len(TEACHER_ROWS) * AUXILIARY_ROW_TARGETS
    + AUXILIARY_FRONT_RATIOS
)


class WaistHipStudentV6(nn.Module):
    """Independent tape/geometry networks with all-five-row teacher heads."""

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
            nn.Conv2d(3, 32, 5, stride=2, padding=2, bias=False),
            nn.BatchNorm2d(32),
            nn.SiLU(inplace=True),
            ResidualBlock(32, 48, stride=2),
            ResidualBlock(48, 72, stride=2),
            ResidualBlock(72, 112, stride=2),
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
            nn.Linear(outline_size, 256),
            nn.LayerNorm(256),
            nn.SiLU(inplace=True),
            nn.Linear(256, 128),
            nn.SiLU(inplace=True),
        )
        self.geometry_profile = nn.Sequential(
            nn.Linear(PROFILE_BASIS_FEATURES, 96),
            nn.LayerNorm(96),
            nn.SiLU(inplace=True),
            nn.Linear(96, 64),
            nn.SiLU(inplace=True),
        )
        self.tape_profile = nn.Sequential(
            nn.Linear(PROFILE_BASIS_FEATURES, 160),
            nn.LayerNorm(160),
            nn.SiLU(inplace=True),
            nn.Linear(160, 128),
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
            nn.Linear(EXPLICIT_RATIO_FEATURES, 160),
            nn.LayerNorm(160),
            nn.SiLU(inplace=True),
            nn.Linear(160, 128),
            nn.SiLU(inplace=True),
        )

        self.geometry_trunk = nn.Sequential(
            nn.Linear(160 * 8 * 6 + 128 + 64 + 64, 896),
            nn.LayerNorm(896),
            nn.SiLU(inplace=True),
            nn.Dropout(0.05),
            nn.Linear(896, 448),
            nn.LayerNorm(448),
            nn.SiLU(inplace=True),
        )
        self.tape_trunk = nn.Sequential(
            nn.Linear(112 * 4 * 3 + 128 + 128 + 128, 640),
            nn.LayerNorm(640),
            nn.SiLU(inplace=True),
            nn.Dropout(0.06),
            nn.Linear(640, 384),
            nn.LayerNorm(384),
            nn.SiLU(inplace=True),
        )

        self.row_geometry_heads = nn.ModuleDict(
            {
                row: nn.Sequential(
                    nn.Linear(448, 320),
                    nn.SiLU(inplace=True),
                    nn.Dropout(0.03),
                    nn.Linear(320, len(GEOMETRY_DIRECT_FIELDS)),
                )
                for row in ROWS
            }
        )
        self.row_shape_heads = nn.ModuleDict(
            {
                row: nn.Sequential(
                    nn.Linear(448 + len(GEOMETRY_DIRECT_FIELDS), 384),
                    nn.LayerNorm(384),
                    nn.SiLU(inplace=True),
                    nn.Dropout(0.03),
                    nn.Linear(384, PCA_COMPONENTS),
                )
                for row in ROWS
            }
        )
        self.camera_head = nn.Sequential(
            nn.Linear(448, 160),
            nn.SiLU(inplace=True),
            nn.Linear(160, len(CAMERA_FIELDS)),
        )

        self.tape_pre = nn.ModuleDict(
            {
                row: nn.Sequential(
                    nn.Linear(384, 256),
                    nn.LayerNorm(256),
                    nn.SiLU(inplace=True),
                    nn.Dropout(0.04),
                )
                for row in TEACHER_ROWS
            }
        )
        self.tape_experts = nn.ModuleDict(
            {
                row: nn.ModuleList(
                    [
                        nn.Sequential(
                            nn.Linear(256, 160),
                            nn.SiLU(inplace=True),
                            nn.Linear(160, 1),
                        )
                        for _ in range(TAPE_EXPERTS)
                    ]
                )
                for row in TEACHER_ROWS
            }
        )
        self.tape_gates = nn.ModuleDict(
            {row: nn.Linear(256, TAPE_EXPERTS) for row in TEACHER_ROWS}
        )

        # These heads exist only during training. They teach one shared 3D
        # representation using neck/chest/under-bust/waist/hips, without ever
        # becoming an input to circumference prediction.
        self.auxiliary_geometry_heads = nn.ModuleDict(
            {
                row: nn.Sequential(
                    nn.Linear(448, 384),
                    nn.LayerNorm(384),
                    nn.SiLU(inplace=True),
                    nn.Linear(384, AUXILIARY_ROW_TARGETS),
                )
                for row in TEACHER_ROWS
            }
        )
        self.auxiliary_front_ratio_head = nn.Sequential(
            nn.Linear(448, 128),
            nn.SiLU(inplace=True),
            nn.Linear(128, AUXILIARY_FRONT_RATIOS),
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

    @staticmethod
    def _profile_basis(profile: torch.Tensor) -> torch.Tensor:
        physical = profile[:, :3]
        gender = profile[:, 3:5]
        height, weight, bmi = (physical[:, index:index + 1] for index in range(3))
        interactions = torch.cat((height * weight, height * bmi, weight * bmi), dim=1)
        gender_interactions = torch.cat(
            (height * gender, weight * gender, bmi * gender),
            dim=1,
        )
        bmi_hinges = torch.cat(
            tuple(torch.relu(bmi - threshold) for threshold in (0.125, 0.75, 1.375, 2.0)),
            dim=1,
        )
        return torch.cat(
            (profile, physical.square(), interactions, gender_interactions, bmi_hinges),
            dim=1,
        )

    def _features(
        self,
        silhouette: torch.Tensor,
        profile: torch.Tensor,
    ) -> tuple[torch.Tensor, torch.Tensor]:
        grid = self.coordinate_grid.expand(silhouette.shape[0], -1, -1, -1)
        spatial_input = torch.cat((silhouette, grid), dim=1)
        outline = self._outline_features(silhouette)
        explicit_ratios = self._explicit_ratio_features(silhouette)
        profile_basis = self._profile_basis(profile)
        geometry = self.geometry_trunk(
            torch.cat(
                (
                    self.geometry_encoder(spatial_input).flatten(1),
                    self.geometry_outline(outline),
                    self.geometry_profile(profile_basis),
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
                    self.tape_profile(profile_basis),
                    self.tape_ratios(explicit_ratios),
                ),
                dim=1,
            )
        )
        return geometry, tape

    def _tape_predictions(self, tape: torch.Tensor) -> dict[str, torch.Tensor]:
        predictions: dict[str, torch.Tensor] = {}
        for row in TEACHER_ROWS:
            hidden = self.tape_pre[row](tape)
            experts = torch.cat(tuple(expert(hidden) for expert in self.tape_experts[row]), dim=1)
            gates = torch.softmax(self.tape_gates[row](hidden), dim=1)
            predictions[row] = (experts * gates).sum(dim=1, keepdim=True)
        return predictions

    def _primary_prediction(
        self,
        geometry: torch.Tensor,
        tape_predictions: dict[str, torch.Tensor],
    ) -> torch.Tensor:
        rows: list[torch.Tensor] = []
        for row in ROWS:
            direct = self.row_geometry_heads[row](geometry)
            shape = self.row_shape_heads[row](torch.cat((geometry, direct), dim=1))
            rows.append(torch.cat((direct, tape_predictions[row], shape), dim=1))
        return torch.cat((*rows, self.camera_head(geometry)), dim=1)

    def forward(self, silhouette: torch.Tensor, profile: torch.Tensor) -> torch.Tensor:
        geometry, tape = self._features(silhouette, profile)
        return self._primary_prediction(geometry, self._tape_predictions(tape))

    def forward_with_aux(
        self,
        silhouette: torch.Tensor,
        profile: torch.Tensor,
    ) -> tuple[torch.Tensor, torch.Tensor]:
        geometry, tape = self._features(silhouette, profile)
        tape_predictions = self._tape_predictions(tape)
        primary = self._primary_prediction(geometry, tape_predictions)
        auxiliary = torch.cat(
            tuple(tape_predictions[row] for row in TEACHER_ROWS)
            + tuple(self.auxiliary_geometry_heads[row](geometry) for row in TEACHER_ROWS)
            + (self.auxiliary_front_ratio_head(geometry),),
            dim=1,
        )
        return primary, auxiliary

