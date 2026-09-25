#!/usr/bin/env python3
"""Train V7 with certified 3D waist/hip supervision and official tape labels."""

from __future__ import annotations

import train_waist_hip_v2 as trainer
from waist_hip_student import source_shape_keys
from waist_hip_student_v7 import (
    AUXILIARY_TARGET_COUNT,
    GEOMETRY_TEACHER_ROWS,
    TEACHER_ROWS,
    WaistHipStudentV7,
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
    for row in GEOMETRY_TEACHER_ROWS
    for key in (
        *(f"row.{row}.{field}" for field in SOURCE_DIRECT_FIELDS),
        *source_shape_keys(row),
    )
)
FRONT_RATIO_TARGET_KEYS = (
    "ratio.front.shoulder_waist",
    "ratio.front.shoulder_hips",
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

# These reasons describe an unusable or unstable geometry row. A PLY-perimeter
# versus tape disagreement is deliberately absent: WEAR tape is authoritative
# and remains valid even when it disagrees with a mesh walk.
GEOMETRY_REJECTION_REASONS = (
    "raw-ply-slice-open",
    "reconstructed-or-fallback-slice",
    "section-closure-over-2pct",
    "row-height-disagrees-with-wear-source",
    "row-missing",
    "geometry-target-invalid",
    "teacher-geometry-changes-with-camera",
    "missing-camera-card",
)

if len(AUXILIARY_TARGET_KEYS) != AUXILIARY_TARGET_COUNT:
    raise RuntimeError(
        f"V7 auxiliary schema changed: {len(AUXILIARY_TARGET_KEYS)} != {AUXILIARY_TARGET_COUNT}"
    )

trainer.WaistHipStudent = WaistHipStudentV7
trainer.AUXILIARY_TARGET_KEYS = AUXILIARY_TARGET_KEYS
trainer.AUXILIARY_TAPE_ROWS = TEACHER_ROWS
trainer.AUXILIARY_TAPE_RATIO_PAIRS = TAPE_RATIO_PAIRS
trainer.GEOMETRY_QUALITY_ROWS = GEOMETRY_TEACHER_ROWS
trainer.GEOMETRY_REJECTION_REASONS = GEOMETRY_REJECTION_REASONS
trainer.VALIDATION_CANONICAL_ONLY = True
trainer.THREE_DIMENSIONAL_GEOMETRY_SUPERVISES_TAPE_REPRESENTATION = True
trainer.LOSS_WEIGHTS.update(
    {
        "tape": 14.0,
        "tape_cm": 12.0,
        "tape_tail": 8.0,
        "tape_consistency": 3.0,
        "shape_pca": 1.5,
        "shape_coordinate": 7.0,
        "shape_concordance": 5.0,
        "ratio": 1.5,
        "auxiliary": 2.0,
        "auxiliary_tape_cm": 5.0,
        "auxiliary_tape_ratio": 2.5,
    }
)


if __name__ == "__main__":
    raise SystemExit(trainer.main())

