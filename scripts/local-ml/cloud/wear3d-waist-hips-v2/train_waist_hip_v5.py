#!/usr/bin/env python3
"""Run the immutable-data trainer with the V5 authoritative-tape student."""

from __future__ import annotations

import train_waist_hip_v2 as trainer
from waist_hip_student_v5 import WaistHipStudentV5


trainer.WaistHipStudent = WaistHipStudentV5


if __name__ == "__main__":
    raise SystemExit(trainer.main())

