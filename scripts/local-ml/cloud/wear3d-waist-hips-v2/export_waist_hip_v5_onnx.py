#!/usr/bin/env python3
"""Export V5 through the stable 150-field physical-output decoder."""

from __future__ import annotations

import export_waist_hip_v2_onnx as exporter
from waist_hip_student_v5 import WaistHipStudentV5


exporter.WaistHipStudent = WaistHipStudentV5


if __name__ == "__main__":
    raise SystemExit(exporter.main())

