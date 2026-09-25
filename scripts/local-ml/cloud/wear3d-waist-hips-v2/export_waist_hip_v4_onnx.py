#!/usr/bin/env python3
"""Export a V4 checkpoint through the stable physical-output decoder."""

from __future__ import annotations

import export_waist_hip_v2_onnx as exporter
from waist_hip_student_v4 import WaistHipStudentV4


exporter.WaistHipStudent = WaistHipStudentV4


if __name__ == "__main__":
    raise SystemExit(exporter.main())

