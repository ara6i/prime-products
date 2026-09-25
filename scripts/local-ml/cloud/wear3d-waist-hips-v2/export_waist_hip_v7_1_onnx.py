#!/usr/bin/env python3
"""Export V7.1 through the stable 150-field physical-output decoder."""

from __future__ import annotations

import export_waist_hip_v2_onnx as exporter
from waist_hip_student_v7_1 import WaistHipStudentV71


exporter.WaistHipStudent = WaistHipStudentV71


if __name__ == "__main__":
    raise SystemExit(exporter.main())

