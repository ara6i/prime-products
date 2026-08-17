#!/usr/bin/env python3
"""Create the exact 4,326-image Apple Vision input list from WEAR teachers."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--teacher-manifest", type=Path, required=True)
    parser.add_argument("--rendered-root", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--expected", type=int, default=4_326)
    return parser.parse_args()


def relative_render_path(raw_path: str) -> Path:
    marker = "/rendered/"
    if marker not in raw_path:
        raise ValueError(f"Teacher image is not below rendered/: {raw_path}")
    return Path(raw_path.split(marker, 1)[1])


def main() -> None:
    args = parse_args()
    records: dict[str, dict[str, str]] = {}
    with args.teacher_manifest.open("r", encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, start=1):
            if not line.strip():
                continue
            record = json.loads(line)
            if record.get("error"):
                continue
            view_id = str(record.get("view_id") or (record.get("camera") or {}).get("view_id") or "")
            if view_id != "front-50":
                continue
            scan_id = str(record.get("scan_id") or "")
            if not scan_id:
                raise RuntimeError(f"Front teacher on line {line_number} has no scan_id")
            if scan_id in records:
                raise RuntimeError(f"Duplicate approved front teacher for {scan_id}")
            relative = relative_render_path(str(record.get("image") or ""))
            local_path = args.rendered_root / relative
            if not local_path.is_file() or local_path.stat().st_size == 0:
                raise RuntimeError(f"Approved front teacher is missing locally: {local_path}")
            records[scan_id] = {
                "scan_id": scan_id,
                "view_id": "front-50",
                "image": relative.as_posix(),
            }
    if len(records) != args.expected:
        raise RuntimeError(f"Approved front teacher count {len(records)} != required {args.expected}")
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", encoding="utf-8") as handle:
        for scan_id in sorted(records):
            handle.write(json.dumps(records[scan_id], separators=(",", ":")) + "\n")
    print(json.dumps({"front_teachers": len(records), "output": str(args.output)}))


if __name__ == "__main__":
    main()
