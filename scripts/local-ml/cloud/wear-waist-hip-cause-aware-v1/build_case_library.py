#!/usr/bin/env python3
"""Build an auditable case library from the approved waist/hip teachers."""

from __future__ import annotations

import argparse
import hashlib
import json
import tarfile
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

from features import extract_named_features, feature_groups, feature_schema


EXPECTED_RECORDS = 34_902
EXPECTED_PEOPLE = 3_878


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--training-index", required=True, type=Path)
    parser.add_argument("--mask-archive", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--metadata-output", required=True, type=Path)
    parser.add_argument("--limit", type=int, default=0)
    return parser.parse_args()


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(8 * 1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def main() -> int:
    args = parse_args()
    with np.load(args.training_index, allow_pickle=False) as archive:
        data = {key: archive[key] for key in archive.files}
    if len(data["sample_ids"]) != EXPECTED_RECORDS or len(set(data["scan_ids"].tolist())) != EXPECTED_PEOPLE:
        raise RuntimeError("Frozen development index count changed")
    count = min(args.limit, EXPECTED_RECORDS) if args.limit else EXPECTED_RECORDS
    features = np.empty((count, len(feature_schema())), dtype=np.float32)
    with tarfile.open(args.mask_archive, "r:gz") as masks:
        members = {Path(item.name).name: item for item in masks if item.isfile() and item.name.startswith("masks/")}
        if len(members) != EXPECTED_RECORDS:
            raise RuntimeError(f"Expected {EXPECTED_RECORDS} masks, found {len(members)}")
        for index in range(count):
            name = Path(str(data["s3_keys"][index])).name
            handle = masks.extractfile(members[name])
            if handle is None:
                raise RuntimeError(f"Could not read {name}")
            features[index] = extract_named_features(handle, data["profiles"][index])
            if index and index % 2000 == 0:
                print(json.dumps({"state": "extracting", "records": index, "total": count}), flush=True)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    np.savez_compressed(
        args.output,
        features=features,
        feature_schema=np.asarray(feature_schema(), dtype="U96"),
        sample_ids=data["sample_ids"][:count],
        scan_ids=data["scan_ids"][:count],
        view_ids=data["view_ids"][:count],
        fold_ids=data["fold_ids"][:count],
        targets=data["targets"][:count],
        target_masks=data["masks"][:count],
        target_schema=data["target_schema"],
    )
    metadata = {
        "schemaVersion": "wear-waist-hip-case-library/v1",
        "createdAt": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "records": count,
        "people": len(set(data["scan_ids"][:count].tolist())),
        "heldoutPeopleUsed": 0,
        "learningMethod": "audited case matching with named measurements",
        "pytorchUsed": False,
        "adamwUsed": False,
        "gradientTrainingUsed": False,
        "neuralWeightsUsed": False,
        "features": feature_schema(),
        "featureGroups": feature_groups(),
        "sourceSha256": {
            "trainingIndex": sha256(args.training_index),
            "maskArchive": sha256(args.mask_archive),
        },
        "outputSha256": sha256(args.output),
    }
    args.metadata_output.parent.mkdir(parents=True, exist_ok=True)
    args.metadata_output.write_text(json.dumps(metadata, indent=2, sort_keys=True) + "\n")
    print(json.dumps({key: metadata[key] for key in ("records", "people", "heldoutPeopleUsed", "pytorchUsed", "adamwUsed", "outputSha256")}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
