"""V7 WEAR student: official tape labels on a 3D-supervised representation.

The student still receives only a normalized front silhouette plus the public
profile vector. Certified 3D waist/hip rows supervise a shared representation
and predicted geometry context. Recorded WEAR tape remains the only target for
circumference; a walked PLY perimeter is never an input or label.
"""

from __future__ import annotations

import torch
from torch import nn

from waist_hip_student import ROWS
from waist_hip_student_v6 import (
    AUXILIARY_ROW_TARGETS,
    TEACHER_ROWS,
    WaistHipStudentV6,
)


GEOMETRY_TEACHER_ROWS = ROWS
AUXILIARY_FRONT_RATIOS = len(ROWS)
AUXILIARY_TARGET_COUNT = (
    len(TEACHER_ROWS)
    + len(GEOMETRY_TEACHER_ROWS) * AUXILIARY_ROW_TARGETS
    + AUXILIARY_FRONT_RATIOS
)
GEOMETRY_CONTEXT_COUNT = (
    len(GEOMETRY_TEACHER_ROWS) * AUXILIARY_ROW_TARGETS
    + AUXILIARY_FRONT_RATIOS
)


class WaistHipStudentV7(WaistHipStudentV6):
    """Fuse certified predicted 3D context into the official-tape branch."""

    def __init__(self) -> None:
        super().__init__()
        for row in tuple(self.auxiliary_geometry_heads):
            if row not in GEOMETRY_TEACHER_ROWS:
                del self.auxiliary_geometry_heads[row]
        self.auxiliary_front_ratio_head[-1] = nn.Linear(128, AUXILIARY_FRONT_RATIOS)
        self.tape_fusion = nn.Sequential(
            nn.Linear(448 + 384 + GEOMETRY_CONTEXT_COUNT, 768),
            nn.LayerNorm(768),
            nn.SiLU(inplace=True),
            nn.Dropout(0.05),
            nn.Linear(768, 384),
            nn.LayerNorm(384),
            nn.SiLU(inplace=True),
        )

    def _geometry_teacher_predictions(
        self,
        geometry: torch.Tensor,
    ) -> tuple[dict[str, torch.Tensor], torch.Tensor]:
        rows = {
            row: self.auxiliary_geometry_heads[row](geometry)
            for row in GEOMETRY_TEACHER_ROWS
        }
        front_ratios = self.auxiliary_front_ratio_head(geometry)
        return rows, front_ratios

    def _fused_tape_predictions(
        self,
        geometry: torch.Tensor,
        private_tape: torch.Tensor,
        geometry_rows: dict[str, torch.Tensor],
        front_ratios: torch.Tensor,
    ) -> dict[str, torch.Tensor]:
        geometry_context = torch.cat(
            tuple(geometry_rows[row] for row in GEOMETRY_TEACHER_ROWS)
            + (front_ratios,),
            dim=1,
        )
        fused = self.tape_fusion(
            torch.cat((geometry, private_tape, geometry_context), dim=1)
        )
        return super()._tape_predictions(fused)

    def _all_predictions(
        self,
        silhouette: torch.Tensor,
        profile: torch.Tensor,
    ) -> tuple[
        torch.Tensor,
        dict[str, torch.Tensor],
        dict[str, torch.Tensor],
        torch.Tensor,
    ]:
        geometry, private_tape = self._features(silhouette, profile)
        geometry_rows, front_ratios = self._geometry_teacher_predictions(geometry)
        tape_predictions = self._fused_tape_predictions(
            geometry,
            private_tape,
            geometry_rows,
            front_ratios,
        )
        primary = self._primary_prediction(geometry, tape_predictions)
        return primary, tape_predictions, geometry_rows, front_ratios

    def forward(self, silhouette: torch.Tensor, profile: torch.Tensor) -> torch.Tensor:
        primary, _, _, _ = self._all_predictions(silhouette, profile)
        return primary

    def forward_with_aux(
        self,
        silhouette: torch.Tensor,
        profile: torch.Tensor,
    ) -> tuple[torch.Tensor, torch.Tensor]:
        primary, tape_predictions, geometry_rows, front_ratios = self._all_predictions(
            silhouette,
            profile,
        )
        auxiliary = torch.cat(
            tuple(tape_predictions[row] for row in TEACHER_ROWS)
            + tuple(geometry_rows[row] for row in GEOMETRY_TEACHER_ROWS)
            + (front_ratios,),
            dim=1,
        )
        return primary, auxiliary
