#!/usr/bin/env python3
"""Preserve an in-flight deleted manifest and merge a numeric-only repair."""

from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
import time


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--pid", type=int, required=True)
    parser.add_argument("--fd", type=int, required=True)
    parser.add_argument("--chunk-dir", type=Path, required=True)
    parser.add_argument("--subject-id", required=True)
    return parser.parse_args()


def read_jsonl_bytes(payload: bytes) -> list[dict]:
    return [json.loads(line) for line in payload.decode("utf-8").splitlines() if line.strip()]


def read_jsonl(path: Path) -> list[dict]:
    return read_jsonl_bytes(path.read_bytes())


def main() -> None:
    args = parse_args()
    proc_fd = Path(f"/proc/{args.pid}/fd/{args.fd}")
    proc_root = Path(f"/proc/{args.pid}")
    if not proc_fd.exists():
        raise RuntimeError(f"in-flight manifest descriptor is unavailable: {proc_fd}")
    chunk_dir = args.chunk_dir.resolve()
    manifest_path = chunk_dir / "render" / "render-manifest.jsonl"

    # Holding this descriptor open preserves the unlinked inode after Blender
    # closes its writer. Read only after the renderer exits so buffered final
    # records are included.
    with proc_fd.open("rb") as original_handle:
        while proc_root.exists():
            time.sleep(0.1)
        original_handle.seek(0)
        original_payload = original_handle.read()

    original = read_jsonl_bytes(original_payload)
    replacement = [
        record
        for record in read_jsonl(manifest_path)
        if record.get("subject_id") == args.subject_id and not record.get("error")
    ]
    source = read_jsonl(chunk_dir / "source.jsonl")
    expected_subjects = {str(record["subject_id"]) for record in source}
    if len(replacement) != 9:
        raise RuntimeError(f"replacement count={len(replacement)} expected=9")
    if len(original) != len(source) * 9:
        raise RuntimeError(f"preserved manifest count={len(original)} expected={len(source) * 9}")

    repaired: list[dict] = []
    inserted = False
    for record in original:
        if record.get("subject_id") == args.subject_id:
            if not inserted:
                repaired.extend(replacement)
                inserted = True
            continue
        repaired.append(record)
    counts = {
        subject_id: sum(str(record.get("subject_id")) == subject_id for record in repaired)
        for subject_id in expected_subjects
    }
    if set(str(record.get("subject_id")) for record in repaired) != expected_subjects:
        raise RuntimeError("repaired subject identity set differs from source chunk")
    if any(count != 9 for count in counts.values()):
        raise RuntimeError(f"repaired view counts are invalid: {counts}")
    if any(record.get("error") for record in repaired):
        raise RuntimeError("repaired manifest still contains errors")

    temporary = manifest_path.with_suffix(".jsonl.finalizing")
    temporary.write_text(
        "".join(json.dumps(record, sort_keys=True) + "\n" for record in repaired),
        encoding="utf-8",
    )
    temporary.replace(manifest_path)
    (chunk_dir / "chunk-success.json").unlink(missing_ok=True)
    print(json.dumps({
        "finalized": True,
        "subjectId": args.subject_id,
        "records": len(repaired),
        "subjectViewCounts": counts,
        "manifest": str(manifest_path),
    }))


if __name__ == "__main__":
    main()
