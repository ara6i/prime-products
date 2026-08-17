#!/usr/bin/env python3
"""Hash-lock a bounded Apple-on-WEAR contact-sheet visual review."""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--audit", type=Path, required=True)
    parser.add_argument("--contact-sheet", type=Path, required=True)
    parser.add_argument("--pipeline-id", required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--approved", action="store_true")
    parser.add_argument("--note", default="")
    return parser.parse_args()


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def main() -> None:
    args = parse_args()
    audit = json.loads(args.audit.read_text(encoding="utf-8"))
    contact_hash = sha256(args.contact_sheet)
    if audit.get("schema_version") != 1 or audit.get("passed") is not True:
        raise RuntimeError("The complete numerical Apple anchor audit has not passed")
    if int(audit.get("accepted_scans", 0)) != 4_326:
        raise RuntimeError("The visual review must cover a 4,326/4,326 accepted anchor set")
    if audit.get("contact_sheet_sha256") != contact_hash:
        raise RuntimeError("The contact sheet changed after the numerical audit")
    if not args.approved:
        raise RuntimeError("Use --approved only after visually reviewing the bounded contact sheet")
    result = {
        "schemaVersion": 1,
        "pipelineId": args.pipeline_id,
        "approved": True,
        "reviewedAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "reviewer": "Codex bounded visual audit",
        "anchorsSha256": audit["anchors_sha256"],
        "teacherManifestSha256": audit.get("teacher_manifest_sha256"),
        "contactSheetSha256": contact_hash,
        "sampleScanIds": audit.get("contact_sheet_samples") or [],
        "note": args.note or "Cyan Apple shoulder/hip joints sit on the body across the diverse sample; yellow WEAR rows remain anatomically ordered and arm-excluded.",
        "releaseAuthorized": False,
        "publishAuthorized": False,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"approved": True, "output": str(args.output), "contactSheetSha256": contact_hash}))


if __name__ == "__main__":
    main()
