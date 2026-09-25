#!/usr/bin/env python3
"""Run the existing immutable-data trainer with the fresh V4 architecture."""

from __future__ import annotations

import train_waist_hip_v2 as trainer
from waist_hip_student_v4 import WaistHipStudentV4


trainer.WaistHipStudent = WaistHipStudentV4


if __name__ == "__main__":
    raise SystemExit(trainer.main())

