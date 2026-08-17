#!/usr/bin/env python3
"""Run one exact, leakage-safe query against the private WEAR 2D index."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from wear_mesh_index import (
    load_index,
    query_from_render_record,
    search_index,
)


ROOT = Path(__file__).resolve().parents[2]
DEFAULT_INDEX_MANIFEST = ROOT / ".local-ml/wear-mesh-index/index-manifest.json"
DEFAULT_RENDER_MANIFEST = ROOT / ".local-ml/v6r5-apple-pose/render-manifest-all.jsonl"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--index-manifest", type=Path, default=DEFAULT_INDEX_MANIFEST)
    source = parser.add_mutually_exclusive_group(required=True)
    source.add_argument(
        "--query-json",
        type=Path,
        help="JSON containing gender/height_cm/weight_kg and projected 2D geometry.",
    )
    source.add_argument(
        "--sample-id",
        help="Private Test Lab convenience: locate one render by sample_id, then strip identity.",
    )
    parser.add_argument("--render-manifest", type=Path, default=DEFAULT_RENDER_MANIFEST)
    parser.add_argument("--top-k", type=int, default=10)
    parser.add_argument("--output", type=Path)
    return parser.parse_args()


def find_sample(path: Path, sample_id: str) -> dict[str, Any]:
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            if not line.strip():
                continue
            record = json.loads(line)
            if record.get("sample_id") == sample_id:
                return record
    raise ValueError(f"sample_id {sample_id!r} was not found in {path}")


def main() -> int:
    args = parse_args()
    manifest, entries = load_index(args.index_manifest)
    if args.query_json:
        raw_query = json.loads(args.query_json.read_text(encoding="utf-8"))
    else:
        raw_query = find_sample(args.render_manifest, args.sample_id)
    query = query_from_render_record(raw_query)
    result = search_index(query, manifest, entries, top_k=args.top_k)
    output = json.dumps(result, ensure_ascii=False, indent=2, sort_keys=True) + "\n"
    if args.output:
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_text(output, encoding="utf-8")
    else:
        print(output, end="")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
