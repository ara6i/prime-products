#!/usr/bin/env python3
"""Create one hash-stable accepted Apple anchor record per approved teacher."""

from __future__ import annotations

import argparse
import json
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input-list", type=Path, required=True)
    parser.add_argument("--base", type=Path, required=True)
    parser.add_argument("--corrections", type=Path, action="append", default=[])
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--expected", type=int, default=4_326)
    return parser.parse_args()


def records(path: Path):
    with path.open("r", encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, start=1):
            if not line.strip():
                continue
            try:
                value = json.loads(line)
            except json.JSONDecodeError as error:
                raise RuntimeError(f"{path}:{line_number}: {error}") from error
            if not isinstance(value, dict):
                raise RuntimeError(f"{path}:{line_number}: JSONL record is not an object")
            yield value


def main() -> None:
    args = parse_args()
    approved: list[dict] = list(records(args.input_list))
    approved_by_id = {str(record.get("scan_id") or ""): record for record in approved}
    if len(approved) != args.expected or len(approved_by_id) != args.expected or "" in approved_by_id:
        raise RuntimeError(
            f"Approved input list is not the exact {args.expected}-person set: "
            f"rows={len(approved)} unique={len(approved_by_id)}"
        )

    accepted: dict[str, dict] = {}
    ignored_retries = 0
    unexpected: set[str] = set()
    for source in (args.base, *args.corrections):
        for record in records(source):
            scan_id = str(record.get("scan_id") or "")
            if scan_id not in approved_by_id:
                unexpected.add(scan_id)
                continue
            if record.get("accepted") is not True:
                ignored_retries += 1
                continue
            if source != args.base or scan_id not in accepted:
                accepted[scan_id] = record

    missing = sorted(set(approved_by_id) - set(accepted))
    if unexpected or missing or len(accepted) != args.expected:
        raise RuntimeError(
            f"Cannot canonicalize Apple anchors: missing={missing[:10]} "
            f"unexpected={sorted(unexpected)[:10]} accepted={len(accepted)}"
        )

    args.output.parent.mkdir(parents=True, exist_ok=True)
    temporary = args.output.with_suffix(args.output.suffix + ".tmp")
    with temporary.open("w", encoding="utf-8") as handle:
        for approved_record in approved:
            scan_id = str(approved_record["scan_id"])
            record = accepted[scan_id]
            if str(record.get("image") or "") != str(approved_record.get("image") or ""):
                raise RuntimeError(f"Apple anchor image mismatch for {scan_id}")
            handle.write(json.dumps(record, separators=(",", ":"), sort_keys=True) + "\n")
    temporary.replace(args.output)
    print(json.dumps({
        "accepted": len(accepted),
        "expected": args.expected,
        "ignored_failed_retry_records": ignored_retries,
        "correction_files": len(args.corrections),
        "output": str(args.output),
    }))


if __name__ == "__main__":
    main()
