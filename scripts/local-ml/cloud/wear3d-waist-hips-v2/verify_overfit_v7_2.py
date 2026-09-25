#!/usr/bin/env python3
"""Apply the unchanged strict V7 limits to the V7.2 student."""

from __future__ import annotations

import verify_overfit_v7 as verifier


verifier.EXPECTED_MODEL = "WaistHipStudentV72"


if __name__ == "__main__":
    raise SystemExit(verifier.main())

