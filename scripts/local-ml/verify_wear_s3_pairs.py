#!/usr/bin/env python3
"""Read-only verification that all indexed WEAR PLY/LND teacher pairs exist in S3.

This lists keys only. It does not download any PLY data and performs no AWS
mutation. The report is private Test Lab evidence, not a release approval.
"""

from __future__ import annotations

import argparse
import json
import os
import posixpath
import subprocess
import tempfile
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from wear_mesh_index import sha256_file


ROOT = Path(__file__).resolve().parents[2]
DEFAULT_SOURCE_MANIFEST = (
    ROOT / ".local-ml/wear3d-v6-audit/source-manifest-standing-a.jsonl"
)
DEFAULT_OUTPUT = ROOT / ".local-ml/wear-mesh-index/s3-source-verification.json"
DEFAULT_BUCKET = "primestyleai-wear3d-921049726279-us-east-1"
LOCAL_RAW_PREFIX = "/opt/primestyle/wear3d/raw/WEAR3DDATA/"
S3_RAW_PREFIX = "raw/WEAR3DDATA/"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-manifest", type=Path, default=DEFAULT_SOURCE_MANIFEST)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--profile", default="primestyle-wear")
    parser.add_argument("--region", default="us-east-1")
    parser.add_argument("--bucket", default=DEFAULT_BUCKET)
    return parser.parse_args()


def aws_json(args: argparse.Namespace, command: list[str]) -> Any:
    completed = subprocess.run(
        ["aws", *command, "--profile", args.profile, "--region", args.region, "--output", "json"],
        check=True,
        capture_output=True,
        text=True,
    )
    return json.loads(completed.stdout)


def to_s3_key(path: Any) -> str:
    value = str(path or "")
    if not value.startswith(LOCAL_RAW_PREFIX):
        raise ValueError(f"Unexpected WEAR raw path prefix: {value}")
    return S3_RAW_PREFIX + value[len(LOCAL_RAW_PREFIX) :]


def atomic_write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary = tempfile.mkstemp(prefix=path.name + ".", dir=path.parent)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
            handle.write(content)
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temporary, path)
    except BaseException:
        try:
            os.unlink(temporary)
        except FileNotFoundError:
            pass
        raise


def main() -> int:
    args = parse_args()
    expected_by_prefix: dict[str, set[str]] = defaultdict(set)
    scan_count = 0
    with args.source_manifest.open("r", encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, 1):
            if not line.strip():
                continue
            record = json.loads(line)
            source = record.get("source")
            if not isinstance(source, dict):
                raise ValueError(f"Missing source paths at line {line_number}")
            mesh_key = to_s3_key(source.get("mesh"))
            landmark_key = to_s3_key(source.get("landmarks"))
            expected_by_prefix[posixpath.dirname(mesh_key) + "/"].add(mesh_key)
            expected_by_prefix[posixpath.dirname(landmark_key) + "/"].add(landmark_key)
            scan_count += 1

    identity = aws_json(args, ["sts", "get-caller-identity"])
    missing: list[str] = []
    prefix_results: dict[str, Any] = {}
    accessible_expected = 0
    for prefix in sorted(expected_by_prefix):
        remote_keys = set(
            aws_json(
                args,
                [
                    "s3api",
                    "list-objects-v2",
                    "--bucket",
                    args.bucket,
                    "--prefix",
                    prefix,
                    "--query",
                    "Contents[].Key",
                ],
            )
            or []
        )
        expected = expected_by_prefix[prefix]
        prefix_missing = sorted(expected - remote_keys)
        missing.extend(prefix_missing)
        accessible_expected += len(expected & remote_keys)
        prefix_results[prefix] = {
            "expected_pair_objects": len(expected),
            "accessible_expected_objects": len(expected & remote_keys),
            "remote_objects_listed": len(remote_keys),
            "missing_expected_objects": len(prefix_missing),
        }

    report = {
        "schema_version": "wear-s3-pair-verification/v1",
        "checked_at": datetime.now(timezone.utc).isoformat(),
        "operation": "read-only-list-objects",
        "downloaded_raw_bytes": 0,
        "aws": {
            "account": identity.get("Account"),
            "caller_arn": identity.get("Arn"),
            "region": args.region,
            "bucket": args.bucket,
        },
        "source_manifest": {
            "path": str(args.source_manifest.resolve()),
            "sha256": sha256_file(args.source_manifest),
            "standing_scans": scan_count,
        },
        "expected": {
            "ply_objects": scan_count,
            "lnd_objects": scan_count,
            "pair_objects": scan_count * 2,
        },
        "accessible_expected_objects": accessible_expected,
        "missing_expected_objects": len(missing),
        "all_4326_ply_lnd_pairs_accessible": scan_count == 4326 and not missing,
        "prefixes": prefix_results,
        "missing_examples": missing[:50],
        "release_approved": False,
    }
    atomic_write(args.output, json.dumps(report, indent=2, sort_keys=True) + "\n")
    print(json.dumps({"report": str(args.output), **report}, indent=2, sort_keys=True))
    return 0 if not missing else 2


if __name__ == "__main__":
    raise SystemExit(main())
