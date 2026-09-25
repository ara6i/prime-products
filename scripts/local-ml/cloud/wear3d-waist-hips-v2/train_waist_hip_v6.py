#!/usr/bin/env python3
"""Train V6 with recorded tape and 3D geometry as separate teacher tasks."""

from __future__ import annotations

import train_waist_hip_v2 as trainer
from waist_hip_student import source_shape_keys
from waist_hip_student_v6 import (
    AUXILIARY_TARGET_COUNT,
    TEACHER_ROWS,
    WaistHipStudentV6,
)


SOURCE_DIRECT_FIELDS = (
    "y_norm",
    "left_x_norm",
    "right_x_norm",
    "width_cm",
    "depth_cm",
    "depth_width_ratio",
)
TAPE_TARGET_KEYS = tuple(f"tape.{row}.circumference_cm" for row in TEACHER_ROWS)
GEOMETRY_TARGET_KEYS = tuple(
    key
    for row in TEACHER_ROWS
    for key in (
        *(f"row.{row}.{field}" for field in SOURCE_DIRECT_FIELDS),
        *source_shape_keys(row),
    )
)
FRONT_RATIO_TARGET_KEYS = (
    "ratio.front.shoulder_waist",
    "ratio.front.shoulder_hips",
    "ratio.front.neck_shoulder",
)
AUXILIARY_TARGET_KEYS = (
    *TAPE_TARGET_KEYS,
    *GEOMETRY_TARGET_KEYS,
    *FRONT_RATIO_TARGET_KEYS,
)
TAPE_RATIO_PAIRS = (
    ("chest", "underbust"),
    ("chest", "waist"),
    ("chest", "hips"),
    ("neck", "waist"),
    ("waist", "hips"),
    ("underbust", "waist"),
    ("underbust", "hips"),
)

if len(AUXILIARY_TARGET_KEYS) != AUXILIARY_TARGET_COUNT:
    raise RuntimeError(
        f"V6 auxiliary schema changed: {len(AUXILIARY_TARGET_KEYS)} != {AUXILIARY_TARGET_COUNT}"
    )

trainer.WaistHipStudent = WaistHipStudentV6
trainer.AUXILIARY_TARGET_KEYS = AUXILIARY_TARGET_KEYS
trainer.AUXILIARY_TAPE_ROWS = TEACHER_ROWS
trainer.AUXILIARY_TAPE_RATIO_PAIRS = TAPE_RATIO_PAIRS
trainer.LOSS_WEIGHTS.update(
    {
        "tape": 12.0,
        "tape_cm": 10.0,
        "tape_tail": 7.0,
        "tape_consistency": 3.0,
        "shape_pca": 1.5,
        "shape_coordinate": 8.0,
        "shape_concordance": 6.0,
        "ratio": 1.5,
        "auxiliary": 2.0,
        "auxiliary_tape_cm": 5.0,
        "auxiliary_tape_ratio": 2.5,
    }
)


if __name__ == "__main__":
    raise SystemExit(trainer.main())

