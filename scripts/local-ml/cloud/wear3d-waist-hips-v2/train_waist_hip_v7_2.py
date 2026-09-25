#!/usr/bin/env python3
"""Train V7.2 with direct pixel and physical-centimeter tail losses."""

from __future__ import annotations

import train_waist_hip_v7_1  # noqa: F401 - installs the V7.1 contract.
import train_waist_hip_v2 as trainer
from waist_hip_student_v7_2 import WaistHipStudentV72


trainer.WaistHipStudent = WaistHipStudentV72
trainer.LOSS_WEIGHTS.update(
    {
        "geometry": 6.0,
        "geometry_cm": 8.0,
        "geometry_tail": 8.0,
        "geometry_maximum": 2.0,
    }
)


if __name__ == "__main__":
    raise SystemExit(trainer.main())

