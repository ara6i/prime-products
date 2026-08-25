#!/usr/bin/env python3
"""Create a reproducible, non-held-out WEAR teacher proof sample.

Selection is made before geometry extraction.  The sampler never looks at tape
values, row acceptance, contour closure, or model predictions, so failures stay
visible instead of being cherry-picked away.
"""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import random
import subprocess
from typing import Any


PROJECT_ROOT = Path(__file__).resolve().parents[2]
BUCKET = "primestyleai-wear3d-921049726279-us-east-1"
SOURCE_PREFIX = "/opt/primestyle/wear3d/"
DEFAULT_MANIFEST = PROJECT_ROOT / ".local-ml/wear3d-v6-audit/source-manifest-standing-a.jsonl"
DEFAULT_OUTPUT = PROJECT_ROOT / ".local-ml/wear3d-fresh-teacher-proof/random10-seed-20260824-v1"
DEFAULT_SOURCE_CACHE = PROJECT_ROOT / ".local-ml/wear-mesh-overlay/dynamic-sources"
DEFAULT_RENDERER = PROJECT_ROOT / "scripts/local-ml/cloud/wear3d-v6/render_wear3d_multiview.py"
DEFAULT_BLENDER = Path("/Applications/Blender.app/Contents/MacOS/Blender")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--source-cache", type=Path, default=DEFAULT_SOURCE_CACHE)
    parser.add_argument("--seed", type=int, default=20260824)
    parser.add_argument("--count", type=int, default=10)
    parser.add_argument("--profile", default="primestyle-wear")
    parser.add_argument("--render", action="store_true")
    parser.add_argument("--blender", type=Path, default=DEFAULT_BLENDER)
    return parser.parse_args()


def read_manifest(path: Path) -> list[dict[str, Any]]:
    return [
        json.loads(line)
        for line in path.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]


def eligible(record: dict[str, Any]) -> bool:
    source = record.get("source") or {}
    return (
        record.get("role") == "train"
        and record.get("training_pose_valid") is True
        and record.get("pose") == "standing_neutral"
        and isinstance(record.get("scan_id"), str)
        and isinstance(source.get("mesh"), str)
        and isinstance(source.get("landmarks"), str)
    )


def s3_key(source_path: str) -> str:
    if not source_path.startswith(SOURCE_PREFIX):
        raise RuntimeError(f"WEAR source pointer is outside the verified archive: {source_path}")
    return source_path[len(SOURCE_PREFIX) :]


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


def ensure_source(source_path: str, destination: Path, environment: dict[str, str]) -> bool:
    if destination.is_file() and destination.stat().st_size > 0:
        return False
    destination.parent.mkdir(parents=True, exist_ok=True)
    partial = destination.with_name(f"{destination.name}.part")
    partial.unlink(missing_ok=True)
    try:
        subprocess.run(
            [
                "aws",
                "s3",
                "cp",
                f"s3://{BUCKET}/{s3_key(source_path)}",
                str(partial),
                "--only-show-errors",
            ],
            check=True,
            cwd=PROJECT_ROOT,
            env=environment,
        )
        if not partial.is_file() or partial.stat().st_size <= 0:
            raise RuntimeError(f"AWS returned an empty WEAR source: {source_path}")
        partial.replace(destination)
    except Exception:
        partial.unlink(missing_ok=True)
        raise
    return True


def localize_record(
    record: dict[str, Any],
    source_cache: Path,
    environment: dict[str, str],
) -> tuple[dict[str, Any], int]:
    scan_id = str(record["scan_id"])
    source = dict(record["source"])
    directory = source_cache / scan_id.lower()
    mesh_path = directory / Path(str(source["mesh"])).name
    landmark_path = directory / Path(str(source["landmarks"])).name
    downloaded = int(ensure_source(str(source["mesh"]), mesh_path, environment))
    downloaded += int(ensure_source(str(source["landmarks"]), landmark_path, environment))
    source.update(
        {
            "mesh": str(mesh_path.resolve()),
            "landmarks": str(landmark_path.resolve()),
        }
    )
    return {**record, "source": source}, downloaded


def write_jsonl(path: Path, records: list[dict[str, Any]]) -> None:
    path.write_text(
        "".join(json.dumps(record, separators=(",", ":"), sort_keys=True) + "\n" for record in records),
        encoding="utf-8",
    )


def render(args: argparse.Namespace, source_manifest: Path) -> None:
    if not args.blender.is_file():
        raise FileNotFoundError(f"Blender is unavailable: {args.blender}")
    subprocess.run(
        [
            str(args.blender),
            "--background",
            "--factory-startup",
            "--python",
            str(DEFAULT_RENDERER),
            "--",
            "--manifest",
            str(source_manifest),
            "--output-dir",
            str(args.output_dir),
            "--views-per-subject",
            "1",
            "--mask-only",
        ],
        check=True,
        cwd=PROJECT_ROOT,
    )


def main() -> None:
    args = parse_args()
    if args.count < 1:
        raise ValueError("count must be positive")
    records = sorted(
        (record for record in read_manifest(args.manifest) if eligible(record)),
        key=lambda record: str(record["scan_id"]),
    )
    if len(records) < args.count:
        raise RuntimeError(f"Only {len(records)} eligible non-held-out training scans are available")

    selected = random.Random(args.seed).sample(records, args.count)
    environment = aws_environment(args.profile)
    args.output_dir.mkdir(parents=True, exist_ok=True)
    localized: list[dict[str, Any]] = []
    downloaded_files = 0
    for index, record in enumerate(selected, 1):
        localized_record, downloaded = localize_record(record, args.source_cache, environment)
        localized.append(localized_record)
        downloaded_files += downloaded
        print(
            f"[{index}/{len(selected)}] {record['scan_id']} source={'downloaded' if downloaded else 'cached'}",
            flush=True,
        )

    source_manifest = args.output_dir / "source-manifest.jsonl"
    write_jsonl(source_manifest, localized)
    selection = {
        "schemaVersion": 1,
        "purpose": "fresh-model-3d-teacher-proof",
        "seed": args.seed,
        "count": args.count,
        "populationCount": len(records),
        "population": "role=train, standing_neutral, training_pose_valid, verified PLY+LND pointers",
        "heldOutRolesSelected": 0,
        "geometryUsedForSelection": False,
        "tapeUsedForSelection": False,
        "modelPredictionUsedForSelection": False,
        "v9ArtifactUsed": False,
        "selectedScanIds": [str(record["scan_id"]) for record in selected],
        "sourceManifest": str(source_manifest.resolve()),
        "downloadedFiles": downloaded_files,
    }
    (args.output_dir / "selection.json").write_text(
        json.dumps(selection, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(selection, indent=2), flush=True)
    if args.render:
        render(args, source_manifest)


if __name__ == "__main__":
    main()
