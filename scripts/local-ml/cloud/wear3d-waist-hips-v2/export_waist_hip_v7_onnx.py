#!/usr/bin/env python3
"""Export V7 through the stable 150-field physical-output decoder."""

from __future__ import annotations

import export_waist_hip_v2_onnx as exporter
from waist_hip_student_v7 import WaistHipStudentV7


exporter.WaistHipStudent = WaistHipStudentV7


if __name__ == "__main__":
    raise SystemExit(exporter.main())

