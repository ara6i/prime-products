"""Explainable waist/hip student with a strict geometry-to-tape path."""

from __future__ import annotations

import math
from typing import Any

import torch
from torch import nn
from torch.nn import functional as F


ROWS = ("waist", "hips")
CAUSES = (
    "row_position",
    "a_to_b_width",
    "front_to_back_depth",
    "cross_section_shape",
    "waist_to_hip_ratio",
    "tape_protocol_correction",
)
IMAGE_HEIGHT = 128
IMAGE_WIDTH = 96
PROFILE_FIELDS = ("height_cm", "weight_kg", "bmi", "gender_female", "gender_male")
SHAPE_POINTS = 32
MAX_TAPE_CORRECTION_CM = 7.0


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


def ring_points_cm(width_cm: torch.Tensor, depth_cm: torch.Tensor, shape: torch.Tensor) -> torch.Tensor:
    """Convert visible normalized shape points into physical centimetre points."""
    scales = torch.stack((width_cm / 2.0, depth_cm / 2.0), dim=-1).unsqueeze(1)
    return shape * scales


def ring_perimeter_cm(width_cm: torch.Tensor, depth_cm: torch.Tensor, shape: torch.Tensor) -> torch.Tensor:
    points = ring_points_cm(width_cm, depth_cm, shape)
    return torch.linalg.vector_norm(torch.roll(points, shifts=-1, dims=1) - points, dim=-1).sum(dim=1)


class ExplainableWaistHipModel(nn.Module):
    """Predict named geometry, then compute tape from that geometry plus one correction."""

    def __init__(self) -> None:
        super().__init__()
        x_axis = torch.linspace(-1.0, 1.0, IMAGE_WIDTH).view(1, 1, 1, IMAGE_WIDTH)
        y_axis = torch.linspace(-1.0, 1.0, IMAGE_HEIGHT).view(1, 1, IMAGE_HEIGHT, 1)
        self.register_buffer(
            "coordinate_grid",
            torch.cat((
                x_axis.expand(1, 1, IMAGE_HEIGHT, IMAGE_WIDTH),
                y_axis.expand(1, 1, IMAGE_HEIGHT, IMAGE_WIDTH),
            ), dim=1),
            persistent=True,
        )
        theta = torch.linspace(0.0, 2.0 * math.pi, SHAPE_POINTS + 1)[:-1]
        self.register_buffer(
            "base_shape",
            torch.stack((-torch.cos(theta), -torch.sin(theta)), dim=-1),
            persistent=True,
        )
        self.encoder = nn.Sequential(
            nn.Conv2d(3, 32, 5, stride=2, padding=2, bias=False),
            nn.BatchNorm2d(32),
            nn.SiLU(inplace=True),
            ResidualBlock(32, 32),
            ResidualBlock(32, 64, stride=2),
            ResidualBlock(64, 64),
            ResidualBlock(64, 96, stride=2),
            ResidualBlock(96, 96),
            ResidualBlock(96, 128, stride=2),
            ResidualBlock(128, 128),
        )
        self.profile_encoder = nn.Sequential(
            nn.Linear(len(PROFILE_FIELDS), 32),
            nn.SiLU(inplace=True),
            nn.Linear(32, 32),
            nn.SiLU(inplace=True),
        )
        self.shared = nn.Sequential(
            nn.Linear(128 * 8 * 6 + 32, 768),
            nn.LayerNorm(768),
            nn.SiLU(inplace=True),
            nn.Dropout(0.08),
            nn.Linear(768, 384),
            nn.LayerNorm(384),
            nn.SiLU(inplace=True),
        )
        # y, center-x, pixel span, physical width, physical depth, 64 shape values.
        self.geometry_heads = nn.ModuleDict({row: nn.Linear(384, 5 + SHAPE_POINTS * 2) for row in ROWS})
        # The correction is named, bounded and reported. It cannot replace the geometry ring.
        self.correction_heads = nn.ModuleDict({
            row: nn.Sequential(
                nn.Linear(384 + 2 + SHAPE_POINTS * 2, 192),
                nn.SiLU(inplace=True),
                nn.Linear(192, 1),
            )
            for row in ROWS
        })
        self.confidence_heads = nn.ModuleDict({row: nn.Linear(384, 1) for row in ROWS})
        # The trainer gives this head a named reason for the current error.
        # At customer time it predicts which part of the first answer is most
        # likely to need correction.
        issue_input_size = 384 + 5 + SHAPE_POINTS * 2 + 1
        self.issue_heads = nn.ModuleDict({
            row: nn.Sequential(
                nn.Linear(issue_input_size, 192),
                nn.SiLU(inplace=True),
                nn.Linear(192, len(CAUSES)),
            )
            for row in ROWS
        })
        # Each output has one public physical meaning. The issue probabilities
        # gate these adjustments; there is no hidden direct circumference head.
        self.refiner_heads = nn.ModuleDict({
            row: nn.Sequential(
                nn.Linear(issue_input_size, 192),
                nn.SiLU(inplace=True),
                nn.Linear(192, 6 + SHAPE_POINTS * 2),
            )
            for row in ROWS
        })

    def _features(self, silhouette: torch.Tensor, profile: torch.Tensor) -> torch.Tensor:
        grid = self.coordinate_grid.expand(silhouette.shape[0], -1, -1, -1)
        image = self.encoder(torch.cat((silhouette, grid), dim=1)).flatten(1)
        profile_features = self.profile_encoder(profile)
        return self.shared(torch.cat((image, profile_features), dim=1))

    def _row(self, shared: torch.Tensor, row_name: str) -> dict[str, Any]:
        raw = self.geometry_heads[row_name](shared)
        base_y_norm = torch.sigmoid(raw[:, 0])
        center_x = torch.sigmoid(raw[:, 1])
        span_norm = 0.05 + 0.55 * torch.sigmoid(raw[:, 2])
        base_left_x = torch.clamp(center_x - span_norm / 2.0, 0.0, 1.0)
        base_right_x = torch.clamp(center_x + span_norm / 2.0, 0.0, 1.0)
        base_width_cm = 20.0 + 12.0 * F.softplus(raw[:, 3])
        base_depth_cm = 12.0 + 10.0 * F.softplus(raw[:, 4])
        residual = torch.tanh(raw[:, 5:].reshape(-1, SHAPE_POINTS, 2)) * 0.35
        base_shape = self.base_shape.unsqueeze(0) + residual
        base_ring_cm = ring_perimeter_cm(base_width_cm, base_depth_cm, base_shape)
        correction_inputs = torch.cat((
            shared,
            base_width_cm.unsqueeze(1) / 50.0,
            base_depth_cm.unsqueeze(1) / 35.0,
            base_shape.flatten(1),
        ), dim=1)
        base_correction_cm = torch.tanh(self.correction_heads[row_name](correction_inputs).squeeze(1)) * MAX_TAPE_CORRECTION_CM
        base_final_tape_cm = base_ring_cm + base_correction_cm
        issue_inputs = torch.cat((
            shared,
            base_y_norm.unsqueeze(1),
            base_left_x.unsqueeze(1),
            base_right_x.unsqueeze(1),
            base_width_cm.unsqueeze(1) / 50.0,
            base_depth_cm.unsqueeze(1) / 35.0,
            base_shape.flatten(1),
            base_correction_cm.unsqueeze(1) / MAX_TAPE_CORRECTION_CM,
        ), dim=1)
        issue_logits = self.issue_heads[row_name](issue_inputs)
        issue_probabilities = torch.softmax(issue_logits, dim=1)
        adjustment = self.refiner_heads[row_name](issue_inputs)
        row_gate = issue_probabilities[:, CAUSES.index("row_position")]
        width_gate = issue_probabilities[:, CAUSES.index("a_to_b_width")]
        depth_gate = issue_probabilities[:, CAUSES.index("front_to_back_depth")]
        shape_gate = issue_probabilities[:, CAUSES.index("cross_section_shape")]
        ratio_gate = issue_probabilities[:, CAUSES.index("waist_to_hip_ratio")]
        correction_gate = issue_probabilities[:, CAUSES.index("tape_protocol_correction")]
        y_norm = torch.clamp(base_y_norm + torch.tanh(adjustment[:, 0]) * 0.05 * row_gate, 0.0, 1.0)
        left_x = torch.clamp(base_left_x + torch.tanh(adjustment[:, 1]) * 0.05 * width_gate, 0.0, 1.0)
        right_x = torch.clamp(base_right_x + torch.tanh(adjustment[:, 2]) * 0.05 * width_gate, 0.0, 1.0)
        ordered_left = torch.minimum(left_x, right_x - 0.01)
        ordered_right = torch.maximum(right_x, ordered_left + 0.01)
        left_x = torch.clamp(ordered_left, 0.0, 0.99)
        right_x = torch.clamp(ordered_right, 0.01, 1.0)
        width_cm = torch.clamp(
            base_width_cm + torch.tanh(adjustment[:, 3]) * 6.0 * torch.clamp(width_gate + 0.5 * ratio_gate, max=1.0),
            15.0,
            100.0,
        )
        depth_cm = torch.clamp(
            base_depth_cm + torch.tanh(adjustment[:, 4]) * 5.0 * torch.clamp(depth_gate + 0.5 * ratio_gate, max=1.0),
            10.0,
            80.0,
        )
        shape_adjustment = torch.tanh(adjustment[:, 5:5 + SHAPE_POINTS * 2].reshape(-1, SHAPE_POINTS, 2))
        shape = base_shape + shape_adjustment * 0.18 * shape_gate[:, None, None]
        ring_cm = ring_perimeter_cm(width_cm, depth_cm, shape)
        correction_delta = torch.tanh(adjustment[:, -1]) * 2.5 * correction_gate
        correction_cm = torch.clamp(
            base_correction_cm + correction_delta,
            -MAX_TAPE_CORRECTION_CM,
            MAX_TAPE_CORRECTION_CM,
        )
        final_tape_cm = ring_cm + correction_cm
        return {
            "base": {
                "y_norm": base_y_norm,
                "left_x_norm": base_left_x,
                "right_x_norm": base_right_x,
                "width_cm": base_width_cm,
                "depth_cm": base_depth_cm,
                "shape": base_shape,
                "ring_cm": base_ring_cm,
                "tape_correction_cm": base_correction_cm,
                "final_tape_cm": base_final_tape_cm,
            },
            "y_norm": y_norm,
            "left_x_norm": left_x,
            "right_x_norm": right_x,
            "width_cm": width_cm,
            "depth_cm": depth_cm,
            "shape": shape,
            "ring_cm": ring_cm,
            "tape_correction_cm": correction_cm,
            "final_tape_cm": final_tape_cm,
            "confidence": torch.sigmoid(self.confidence_heads[row_name](shared).squeeze(1)),
            "issue_logits": issue_logits,
            "issue_probabilities": issue_probabilities,
        }

    def forward(self, silhouette: torch.Tensor, profile: torch.Tensor) -> dict[str, Any]:
        shared = self._features(silhouette, profile)
        rows = {row: self._row(shared, row) for row in ROWS}
        rows["ratios"] = {
            "base_waist_to_hip_width": rows["waist"]["base"]["width_cm"] / rows["hips"]["base"]["width_cm"].clamp_min(1e-5),
            "base_waist_to_hip_depth": rows["waist"]["base"]["depth_cm"] / rows["hips"]["base"]["depth_cm"].clamp_min(1e-5),
            "waist_to_hip_width": rows["waist"]["width_cm"] / rows["hips"]["width_cm"].clamp_min(1e-5),
            "waist_to_hip_depth": rows["waist"]["depth_cm"] / rows["hips"]["depth_cm"].clamp_min(1e-5),
        }
        return rows

    @staticmethod
    def flat_named_outputs(outputs: dict[str, Any]) -> torch.Tensor:
        """Stable tensor export whose columns all have public names."""
        values = []
        for row in ROWS:
            item = outputs[row]
            base = item["base"]
            values.extend((
                base["y_norm"].unsqueeze(1),
                base["left_x_norm"].unsqueeze(1),
                base["right_x_norm"].unsqueeze(1),
                base["width_cm"].unsqueeze(1),
                base["depth_cm"].unsqueeze(1),
                base["shape"].flatten(1),
                base["ring_cm"].unsqueeze(1),
                base["tape_correction_cm"].unsqueeze(1),
                base["final_tape_cm"].unsqueeze(1),
                item["y_norm"].unsqueeze(1),
                item["left_x_norm"].unsqueeze(1),
                item["right_x_norm"].unsqueeze(1),
                item["width_cm"].unsqueeze(1),
                item["depth_cm"].unsqueeze(1),
                item["shape"].flatten(1),
                item["ring_cm"].unsqueeze(1),
                item["tape_correction_cm"].unsqueeze(1),
                item["final_tape_cm"].unsqueeze(1),
                item["confidence"].unsqueeze(1),
                item["issue_probabilities"],
            ))
        values.extend(outputs["ratios"][name].unsqueeze(1) for name in (
            "base_waist_to_hip_width",
            "base_waist_to_hip_depth",
            "waist_to_hip_width",
            "waist_to_hip_depth",
        ))
        return torch.cat(values, dim=1)


def output_schema() -> list[str]:
    fields: list[str] = []
    for row in ROWS:
        fields.extend((
            f"{row}.base.y_norm",
            f"{row}.base.left_x_norm",
            f"{row}.base.right_x_norm",
            f"{row}.base.width_cm",
            f"{row}.base.depth_cm",
        ))
        for point in range(SHAPE_POINTS):
            fields.extend((f"{row}.base.shape.{point:02d}.x", f"{row}.base.shape.{point:02d}.depth"))
        fields.extend((
            f"{row}.base.ring_cm",
            f"{row}.base.tape_correction_cm",
            f"{row}.base.final_tape_cm",
        ))
        fields.extend((
            f"{row}.y_norm",
            f"{row}.left_x_norm",
            f"{row}.right_x_norm",
            f"{row}.width_cm",
            f"{row}.depth_cm",
        ))
        for point in range(SHAPE_POINTS):
            fields.extend((f"{row}.shape.{point:02d}.x", f"{row}.shape.{point:02d}.depth"))
        fields.extend((
            f"{row}.ring_cm",
            f"{row}.tape_correction_cm",
            f"{row}.final_tape_cm",
            f"{row}.confidence",
        ))
        fields.extend(f"{row}.issue_probability.{cause}" for cause in CAUSES)
    fields.extend((
        "ratios.base_waist_to_hip_width",
        "ratios.base_waist_to_hip_depth",
        "ratios.waist_to_hip_width",
        "ratios.waist_to_hip_depth",
    ))
    if len(fields) != 306 or len(fields) != len(set(fields)):
        raise RuntimeError(f"Output schema changed unexpectedly: {len(fields)}")
    return fields


def strict_path_contract() -> dict[str, Any]:
    return {
        "schemaVersion": "wear-waist-hip-strict-path/v1",
        "customerInputs": ["front silhouette", *PROFILE_FIELDS],
        "teacherOnlyInputs": ["PLY", "LND", "recorded WEAR waist tape", "recorded WEAR hip tape"],
        "finalTapeFormula": "ring_perimeter(width_cm, depth_cm, shape32) + tape_correction_cm",
        "maximumAbsoluteTapeCorrectionCm": MAX_TAPE_CORRECTION_CM,
        "directHiddenTapeHead": False,
        "trainerCauseClasses": list(CAUSES),
        "firstAnswerAndNamedRefinementVisible": True,
        "waistToHipRatiosVisible": True,
        "outputSchema": output_schema(),
    }


__all__ = [
    "ExplainableWaistHipModel",
    "CAUSES",
    "IMAGE_HEIGHT",
    "IMAGE_WIDTH",
    "MAX_TAPE_CORRECTION_CM",
    "PROFILE_FIELDS",
    "ROWS",
    "SHAPE_POINTS",
    "output_schema",
    "ring_perimeter_cm",
    "ring_points_cm",
    "strict_path_contract",
]
