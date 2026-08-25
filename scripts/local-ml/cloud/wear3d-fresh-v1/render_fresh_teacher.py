"""Run the verified WEAR geometry extractor with the fresh camera contract."""

from __future__ import annotations

import importlib.util
import os
from pathlib import Path
import sys


RENDERER_CANDIDATES = (
    Path(__file__).with_name("render_wear3d_multiview.py"),
    Path(__file__).resolve().parents[1] / "wear3d-v6" / "render_wear3d_multiview.py",
)
RENDERER = next((path for path in RENDERER_CANDIDATES if path.is_file()), None)
if RENDERER is None:
    raise RuntimeError(f"Could not find the verified WEAR renderer: {RENDERER_CANDIDATES}")
spec = importlib.util.spec_from_file_location("wear3d_fresh_renderer", RENDERER)
if spec is None or spec.loader is None:
    raise RuntimeError(f"Could not load the verified WEAR renderer: {RENDERER}")
renderer = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = renderer
spec.loader.exec_module(renderer)

os.environ["WEAR_TEACHER_PIPELINE_ID"] = "wear3d-fresh-teacher-v1"
renderer.DEFAULT_VIEWS = (
    renderer.ViewSpec("canonical", 50.0, 0.0, 0.0, 1.00, 0.00, 0.0),
    renderer.ViewSpec("yaw-left-12", 50.0, -12.0, 0.0, 1.00, 0.00, 0.0),
    renderer.ViewSpec("yaw-right-12", 50.0, 12.0, 0.0, 1.00, 0.00, 0.0),
    renderer.ViewSpec("pitch-up-6", 50.0, 0.0, 6.0, 1.00, 0.00, 0.0),
    renderer.ViewSpec("pitch-down-6", 50.0, 0.0, -6.0, 1.00, 0.00, 0.0),
    renderer.ViewSpec("roll-left-3", 50.0, 0.0, 0.0, 1.00, 0.00, -3.0),
    renderer.ViewSpec("roll-right-3", 50.0, 0.0, 0.0, 1.00, 0.00, 3.0),
    renderer.ViewSpec("wide-35", 35.0, 0.0, 0.0, 1.00, 0.00, 0.0),
    renderer.ViewSpec("tele-70", 70.0, 0.0, 0.0, 1.08, 0.00, 0.0),
)


if __name__ == "__main__":
    renderer.main()
