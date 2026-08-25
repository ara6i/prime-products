#!/usr/bin/env python3
"""Rerender one explicitly geometry-masked subject and repair its chunk.

This is intentionally narrow: it preserves all other records in the completed
chunk and accepts the replacement only when the renderer emits nine clean
camera/silhouette/tape records with no geometry-row targets.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
import shutil
import subprocess


VIEWS_PER_SUBJECT = 9


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--chunk-dir", type=Path, required=True)
    parser.add_argument("--subject-id", required=True)
    parser.add_argument("--renderer", type=Path, required=True)
    parser.add_argument("--blender", default="blender")
    return parser.parse_args()


def read_jsonl(path: Path) -> list[dict]:
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def main() -> None:
    args = parse_args()
    chunk_dir = args.chunk_dir.resolve()
    source_path = chunk_dir / "source.jsonl"
    render_dir = chunk_dir / "render"
    manifest_path = render_dir / "render-manifest.jsonl"
    source_records = read_jsonl(source_path)
    selected = [record for record in source_records if record.get("subject_id") == args.subject_id]
    if len(selected) != 1:
        raise RuntimeError(f"expected one source record for {args.subject_id}, found {len(selected)}")

    original = read_jsonl(manifest_path)
    if sum(record.get("subject_id") == args.subject_id for record in original) != VIEWS_PER_SUBJECT:
        raise RuntimeError("original chunk does not contain exactly nine subject records")

    repair_root = chunk_dir / f"repair-{args.subject_id}"
    if repair_root.exists():
        shutil.rmtree(repair_root)
    repair_render = repair_root / "render"
    repair_render.mkdir(parents=True)
    repair_source = repair_root / "source.jsonl"
    repair_source.write_text(json.dumps(selected[0], sort_keys=True) + "\n", encoding="utf-8")
    log_path = repair_root / "blender.log"
    command = [
        "xvfb-run",
        "--auto-servernum",
        "--server-args=-screen 0 1280x1024x24 -nolisten tcp",
        args.blender,
        "--background",
        "--factory-startup",
        "--python",
        str(args.renderer),
        "--",
        "--manifest",
        str(repair_source),
        "--output-dir",
        str(repair_render),
        "--views-per-subject",
        str(VIEWS_PER_SUBJECT),
        "--mask-only",
    ]
    with log_path.open("w", encoding="utf-8") as log:
        completed = subprocess.run(command, stdout=log, stderr=subprocess.STDOUT, check=False)

    replacement_manifest = repair_render / "render-manifest.jsonl"
    if not replacement_manifest.is_file():
        raise RuntimeError(f"rerender produced no manifest; blender exit={completed.returncode}")
    replacement = read_jsonl(replacement_manifest)
    if len(replacement) != VIEWS_PER_SUBJECT:
        raise RuntimeError(f"rerender record count={len(replacement)} expected={VIEWS_PER_SUBJECT}")
    for record in replacement:
        if record.get("subject_id") != args.subject_id or record.get("error"):
            raise RuntimeError(f"invalid replacement record: {record.get('sample_id')} {record.get('error')}")
        eligibility = record.get("teacher_eligibility") or {}
        if eligibility.get("geometry_rows") is not False:
            raise RuntimeError("replacement unexpectedly exposes geometry rows")
        if eligibility.get("all_geometry_rows_masked") is not True:
            raise RuntimeError("replacement does not explicitly mask all geometry rows")
        if record.get("rows"):
            raise RuntimeError("replacement leaks geometry row payloads")
        if not record.get("masked_rows"):
            raise RuntimeError("replacement contains no explicit masked-row reasons")

        for field in ("image", "mesh_image", "mask"):
            source = Path(str(record[field]))
            if not source.is_file():
                raise RuntimeError(f"replacement artifact missing: {source}")
            destination = render_dir / source.name
            shutil.copy2(source, destination)
            record[field] = str(destination)

    repaired: list[dict] = []
    inserted = False
    for record in original:
        if record.get("subject_id") == args.subject_id:
            if not inserted:
                repaired.extend(replacement)
                inserted = True
            continue
        repaired.append(record)
    if len(repaired) != len(original):
        raise RuntimeError(f"repaired chunk count changed: {len(repaired)} != {len(original)}")
    if any(record.get("error") for record in repaired):
        raise RuntimeError("repaired chunk still contains render errors")

    temporary = manifest_path.with_suffix(".jsonl.repairing")
    temporary.write_text(
        "".join(json.dumps(record, sort_keys=True) + "\n" for record in repaired),
        encoding="utf-8",
    )
    temporary.replace(manifest_path)
    (chunk_dir / "chunk-success.json").unlink(missing_ok=True)
    print(json.dumps({
        "repaired": True,
        "subjectId": args.subject_id,
        "records": len(replacement),
        "chunkRecords": len(repaired),
        "blenderExit": completed.returncode,
        "manifest": str(manifest_path),
        "log": str(log_path),
    }))


if __name__ == "__main__":
    main()
