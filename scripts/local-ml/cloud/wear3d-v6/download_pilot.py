#!/usr/bin/env python3
"""Download a small, stratified WEAR standing pilot without copying 33.5 GB."""

from __future__ import annotations

import argparse
from collections import defaultdict, deque
from concurrent.futures import ThreadPoolExecutor
import copy
import json
import os
from pathlib import Path
import subprocess
from typing import Any

try:
    import boto3
except ModuleNotFoundError:  # The Mac can use its already-authenticated AWS CLI.
    boto3 = None


RAW_MARKER = "/raw/"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--bucket", required=True)
    parser.add_argument("--source-manifest", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--count", type=int, default=24)
    parser.add_argument("--offset", type=int)
    parser.add_argument("--subject-id", action="append", default=[])
    parser.add_argument("--workers", type=int, default=8)
    return parser.parse_args()


def source_key(source_path: str) -> str:
    if RAW_MARKER not in source_path:
        raise ValueError(f"Source path does not contain {RAW_MARKER!r}: {source_path}")
    return f"raw/{source_path.split(RAW_MARKER, 1)[1]}"


def stratified(records: list[dict[str, Any]], count: int) -> list[dict[str, Any]]:
    groups: dict[tuple[str, str, str], deque[dict[str, Any]]] = defaultdict(deque)
    for record in records:
        groups[(str(record.get("gender")), str(record.get("region")), str(record.get("role")))].append(record)
    selected = []
    keys = sorted(groups)
    while len(selected) < count and keys:
        next_keys = []
        for key in keys:
            if groups[key] and len(selected) < count:
                selected.append(groups[key].popleft())
            if groups[key]:
                next_keys.append(key)
        keys = next_keys
    return selected


def main() -> None:
    args = parse_args()
    records = [json.loads(line) for line in args.source_manifest.read_text(encoding="utf-8").splitlines() if line.strip()]
    if args.subject_id:
        requested = set(args.subject_id)
        chosen = [record for record in records if str(record.get("subject_id")) in requested]
        missing = sorted(requested - {str(record.get("subject_id")) for record in chosen})
        if missing:
            raise RuntimeError(f"Requested pilot subjects are missing: {missing}")
    else:
        chosen = (
            records[args.offset : args.offset + args.count]
            if args.offset is not None
            else stratified(records, args.count)
        )
    args.output_dir.mkdir(parents=True, exist_ok=True)
    s3 = boto3.client("s3") if boto3 is not None else None
    downloads: list[tuple[str, Path]] = []
    rewritten = []
    for original in chosen:
        record = copy.deepcopy(original)
        for field in ("mesh", "landmarks"):
            remote_path = str(record["source"][field])
            key = source_key(remote_path)
            local_path = args.output_dir / key
            record["source"][field] = str(local_path)
            downloads.append((key, local_path))
        rewritten.append(record)

    def download(item: tuple[str, Path]) -> None:
        key, destination = item
        destination.parent.mkdir(parents=True, exist_ok=True)
        if destination.exists() and destination.stat().st_size > 0:
            return
        if s3 is not None:
            s3.download_file(args.bucket, key, str(destination))
            return
        environment = os.environ.copy()
        subprocess.run(
            ["aws", "s3", "cp", f"s3://{args.bucket}/{key}", str(destination), "--only-show-errors"],
            check=True,
            env=environment,
        )

    with ThreadPoolExecutor(max_workers=args.workers) as executor:
        list(executor.map(download, downloads))
    manifest_path = args.output_dir / "pilot-manifest.jsonl"
    manifest_path.write_text("".join(json.dumps(record, separators=(",", ":")) + "\n" for record in rewritten), encoding="utf-8")
    print(json.dumps({"subjects": len(rewritten), "files": len(downloads), "manifest": str(manifest_path)}, indent=2))


if __name__ == "__main__":
    main()
