#!/usr/bin/env python3
"""Train V8 with fresh teacher masks instead of the stale V6 card audit."""

from __future__ import annotations

import train_waist_hip_v7_2  # noqa: F401 - installs the V7.2 loss contract.
import train_waist_hip_v2 as trainer
from waist_hip_student_v8 import WaistHipStudentV8


trainer.WaistHipStudent = WaistHipStudentV8
trainer.REQUIRED_TEACHER_AUDIT_SCHEMA = "wear3d-fresh-geometry-audit/v1"
trainer.REQUIRED_TEACHER_AUDIT_MODE = "source-target-masks"


if __name__ == "__main__":
    raise SystemExit(trainer.main())
