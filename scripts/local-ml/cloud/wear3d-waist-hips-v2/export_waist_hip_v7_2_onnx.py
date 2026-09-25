#!/usr/bin/env python3
"""Export V7.2 through the stable 150-field physical-output decoder."""

from __future__ import annotations

import export_waist_hip_v2_onnx as exporter
from waist_hip_student_v7_2 import WaistHipStudentV72


exporter.WaistHipStudent = WaistHipStudentV72


if __name__ == "__main__":
    raise SystemExit(exporter.main())

