#!/usr/bin/env python3
"""Train V7.1 with direct pixel/tail supervision for waist and hip lines."""

from __future__ import annotations

import train_waist_hip_v7  # noqa: F401 - installs the V7 teacher/tape contract.
import train_waist_hip_v2 as trainer
from waist_hip_student_v7_1 import WaistHipStudentV71


trainer.WaistHipStudent = WaistHipStudentV71
trainer.LOSS_WEIGHTS.update(
    {
        "position": 5.0,
        "position_pixel": 6.0,
        "position_tail": 6.0,
        "position_maximum": 1.5,
    }
)


if __name__ == "__main__":
    raise SystemExit(trainer.main())

