#!/usr/bin/env python3
"""Apply the strict ten-person physical gate to the V8 student."""

from __future__ import annotations

import verify_overfit_v7 as verifier


verifier.EXPECTED_MODEL = "WaistHipStudentV8"


if __name__ == "__main__":
    raise SystemExit(verifier.main())
