#!/usr/bin/env python3
"""Download a tiny subject-disjoint WEAR train/validation geometry canary.

The 80 MB master manifest is streamed from S3 and never stored on the nearly
full Mac disk.  Only the selected mesh-card and mask files are downloaded.
Held-out test people are never selected.
"""

from __future__ import annotations

import argparse
from concurrent.futures import ThreadPoolExecutor
import json
import os
from pathlib import Path
import random
import subprocess
from typing import Any


BUCKET = "primestyleai-wear3d-921049726279-us-east-1"
PIPELINE_ID = "wear3d-waist-hips-teacher-v1-20260823"
MASTER_KEY = f"processed/{PIPELINE_ID}/render-manifest-all.jsonl"
RENDERED_PREFIX = f"processed/{PIPELINE_ID}/rendered"
REMOTE_RENDERED_ROOT = "/opt/primestyle/v6/rendered/"
ROWS = ("waist", "hips")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--train", type=int, default=256)
    parser.add_argument("--validation", type=int, default=64)
    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path(".local-ml/wear3d-spatial-canary-v1"),
    )
    parser.add_argument("--profile", default="primestyle-wear")
    parser.add_argument("--seed", type=int, default=20260824)
    return parser.parse_args()


def aws_environment(profile: str) -> dict[str, str]:
    environment = os.environ.copy()
    environment.update(
        {
            "AWS_PROFILE": profile,
            "AWS_REGION": "us-east-1",
            "AWS_DEFAULT_REGION": "us-east-1",
            "AWS_PAGER": "",
        }
    )
    return environment


def geometry_ready(source: dict[str, Any]) -> bool:
    if source.get("view_id") != "front-50" or source.get("error"):
        return False
    for row_name in ROWS:
        row = (source.get("rows") or {}).get(row_name) or {}
        if not all(
            row.get(flag) is True
            for flag in ("accepted", "edge_target_valid", "depth_target_valid", "shape_target_valid")
        ):
            return False
        if len(row.get("contour_points_normalized") or []) != 32:
            return False
    return True


def relative_artifact(raw: str) -> str:
    if not raw.startswith(REMOTE_RENDERED_ROOT):
        raise RuntimeError(f"Unexpected remote artifact path: {raw}")
    return raw[len(REMOTE_RENDERED_ROOT) :]


def stream_selection(
    train_count: int,
    validation_count: int,
    environment: dict[str, str],
    seed: int,
) -> list[dict[str, Any]]:
    wanted = {"train": train_count, "validation": validation_count}
    selected: dict[str, list[dict[str, Any]]] = {"train": [], "validation": []}
    seen = {"train": 0, "validation": 0}
    generator = random.Random(seed)
    process = subprocess.Popen(
        [
            "aws",
            "s3",
            "cp",
            f"s3://{BUCKET}/{MASTER_KEY}",
            "-",
            "--only-show-errors",
        ],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        env=environment,
    )
    assert process.stdout is not None
    try:
        for line in process.stdout:
            if not line.strip():
                continue
            source = json.loads(line)
            role = str(source.get("role") or "")
            if role not in wanted or len(selected[role]) >= wanted[role]:
                if role not in wanted:
                    continue
            if not geometry_ready(source):
                continue
            seen[role] += 1
            if len(selected[role]) < wanted[role]:
                selected[role].append(source)
            else:
                replacement = generator.randrange(seen[role])
                if replacement < wanted[role]:
                    selected[role][replacement] = source
    finally:
        if process.poll() is None:
            process.terminate()
        process.wait(timeout=10)
    for role, count in wanted.items():
        if len(selected[role]) != count:
            raise RuntimeError(f"Selected {len(selected[role])}/{count} {role} cards")
    return selected["train"] + selected["validation"]


def download_artifact(relative: str, output_dir: Path, environment: dict[str, str]) -> Path:
    destination = output_dir / "rendered" / relative
    if destination.exists() and destination.stat().st_size > 0:
        return destination
    destination.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [
            "aws",
            "s3",
            "cp",
            f"s3://{BUCKET}/{RENDERED_PREFIX}/{relative}",
            str(destination),
            "--only-show-errors",
        ],
        check=True,
        env=environment,
    )
    return destination


def main() -> None:
    args = parse_args()
    environment = aws_environment(args.profile)
    args.output_dir.mkdir(parents=True, exist_ok=True)
    selected = stream_selection(args.train, args.validation, environment, args.seed)
    output_records = [dict(source) for source in selected]
    jobs: list[tuple[int, str, str]] = []
    for index, source in enumerate(output_records):
        for field in ("mesh_image", "mask"):
            jobs.append((index, field, relative_artifact(str(source[field]))))

    def run_job(job: tuple[int, str, str]) -> tuple[int, str, Path]:
        index, field, relative = job
        return index, field, download_artifact(relative, args.output_dir, environment)

    with ThreadPoolExecutor(max_workers=16) as executor:
        for completed, (index, field, destination) in enumerate(executor.map(run_job, jobs), start=1):
            output_records[index][field] = str(destination.resolve())
            if completed % 80 == 0 or completed == len(jobs):
                print(f"downloaded_artifacts={completed}/{len(jobs)}", flush=True)
    manifest = args.output_dir / "render-manifest.jsonl"
    manifest.write_text(
        "".join(json.dumps(record, separators=(",", ":")) + "\n" for record in output_records),
        encoding="utf-8",
    )
    summary = {
        "manifest": str(manifest.resolve()),
        "train": args.train,
        "validation": args.validation,
        "test": 0,
        "sealed448Opened": False,
        "tapeUsedForSelection": False,
    }
    (args.output_dir / "summary.json").write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
