#!/usr/bin/env python3
"""Run the complete CPU-only anatomical 2D mesh pilot automatically."""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import subprocess
import sys


REPO_ROOT = Path(__file__).resolve().parents[2]
SCRIPTS = [
    "build_rgb_mhr_topology.py",
    "run_sapiens2_anatomy.py",
    "build_anatomical_mhr_overlay.py",
]


def run_step(script: str, photo_id: str) -> dict:
    environment = os.environ.copy()
    environment["PRIMESTYLE_SAM3D_DEVICE"] = "cpu"
    completed = subprocess.run(
        [sys.executable, str(REPO_ROOT / "scripts/local-ml" / script), "--photo", photo_id],
        cwd=REPO_ROOT,
        env=environment,
        check=True,
        capture_output=True,
        text=True,
    )
    output = completed.stdout.strip()
    start = output.rfind("\n{")
    json_text = output[start + 1 :] if start >= 0 else output
    return json.loads(json_text)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--photo", choices=["delaram", "delaram-2", "both"], default="both")
    args = parser.parse_args()
    photo_ids = ["delaram", "delaram-2"] if args.photo == "both" else [args.photo]
    results = []
    for photo_id in photo_ids:
        record = {"photoId": photo_id, "steps": []}
        for script in SCRIPTS:
            record["steps"].append({"script": script, "result": run_step(script, photo_id)})
        results.append(record)
    print(json.dumps({"device": "cpu", "models": results}, indent=2), flush=True)


if __name__ == "__main__":
    main()
