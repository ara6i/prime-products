#!/usr/bin/env python3
"""Download only PLY files needed for unresolved waist/hip teacher review."""

from __future__ import annotations

import argparse
import json
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

import boto3


BUCKET = "primestyleai-wear3d-921049726279-us-east-1"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--teacher-decisions", required=True, type=Path)
    parser.add_argument("--output-root", required=True, type=Path)
    parser.add_argument("--worklist-output", required=True, type=Path)
    parser.add_argument("--profile", default="primestyle-wear")
    parser.add_argument("--workers", type=int, default=20)
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    people: dict[str, dict] = {}
    unresolved: dict[str, list[dict]] = {}
    with args.teacher_decisions.open(encoding="utf-8") as handle:
        for line in handle:
            record = json.loads(line)
            action = str(record["decision"].get("repairAction") or "")
            if action == "none-required":
                continue
            scan_id = str(record["scanId"])
            people[scan_id] = record["sourceProof"]["mesh"]
            unresolved.setdefault(scan_id, []).append({
                "target": record["target"],
                "status": record["decision"]["status"],
                "reasons": record["decision"]["reasons"],
                "currentAction": action,
                "currentTapeCm": record["tape"]["valueCm"],
                "currentRingCm": record["geometry"]["ringCircumferenceCm"],
            })
    worklist = []
    for scan_id in sorted(people):
        proof = people[scan_id]
        inventory = proof.get("inventoryProof") or {}
        key = str(inventory.get("Key") or "")
        if not key:
            raise RuntimeError(f"Missing S3 mesh proof for {scan_id}")
        destination = args.output_root / scan_id.lower() / Path(key).name
        worklist.append({
            "scanId": scan_id,
            "meshS3": f"s3://{BUCKET}/{key}",
            "meshKey": key,
            "meshBytes": int(inventory.get("Size") or 0),
            "destination": str(destination.resolve()),
            "targets": unresolved[scan_id],
        })
    args.worklist_output.parent.mkdir(parents=True, exist_ok=True)
    args.worklist_output.write_text("\n".join(json.dumps(item, sort_keys=True) for item in worklist) + "\n")
    session = boto3.Session(profile_name=args.profile, region_name="us-east-1")
    s3 = session.client("s3")

    def download(item: dict) -> str:
        destination = Path(item["destination"])
        destination.parent.mkdir(parents=True, exist_ok=True)
        if destination.is_file() and destination.stat().st_size == item["meshBytes"]:
            return "reused"
        temporary = destination.with_suffix(destination.suffix + ".partial")
        s3.download_file(BUCKET, item["meshKey"], str(temporary))
        if temporary.stat().st_size != item["meshBytes"]:
            raise RuntimeError(f"Size mismatch for {item['scanId']}")
        temporary.replace(destination)
        return "downloaded"

    counts = {"downloaded": 0, "reused": 0}
    with ThreadPoolExecutor(max_workers=max(1, args.workers)) as executor:
        futures = {executor.submit(download, item): item for item in worklist}
        for completed, future in enumerate(as_completed(futures), 1):
            counts[future.result()] += 1
            if completed % 50 == 0:
                print(json.dumps({"state": "downloading", "completed": completed, "total": len(worklist)}), flush=True)
    print(json.dumps({
        "state": "completed",
        "people": len(worklist),
        "targets": sum(len(item["targets"]) for item in worklist),
        "bytes": sum(item["meshBytes"] for item in worklist),
        **counts,
    }, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
