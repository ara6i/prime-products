#!/usr/bin/env python3
"""Build the private, versioned WEAR semantic 2D search index."""

from __future__ import annotations

import argparse
import json
import os
import tempfile
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from wear_mesh_index import (
    ALLOWED_PROFILE_FIELDS,
    ALLOWED_RENDER_GEOMETRY_FIELDS,
    CANONICAL_VIEW,
    DESCRIPTOR_SCHEMA_VERSION,
    FEATURE_LAYOUT,
    FORBIDDEN_LEAKAGE_FIELDS,
    INDEX_SCHEMA_VERSION,
    INDEX_VERSION,
    compact_json,
    fit_robust_scaler,
    gender_counts,
    make_index_entry,
    role_counts,
    sha256_file,
    summarize_quality,
)


ROOT = Path(__file__).resolve().parents[2]
DEFAULT_SOURCE_MANIFEST = (
    ROOT / ".local-ml/wear3d-v6-audit/source-manifest-standing-a.jsonl"
)
DEFAULT_RENDER_MANIFEST = ROOT / ".local-ml/v6r5-apple-pose/render-manifest-all.jsonl"
DEFAULT_OUTPUT_DIR = ROOT / ".local-ml/wear-mesh-index"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-manifest", type=Path, default=DEFAULT_SOURCE_MANIFEST)
    parser.add_argument("--render-manifest", type=Path, default=DEFAULT_RENDER_MANIFEST)
    parser.add_argument("--output-dir", type=Path, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--index-version", default=INDEX_VERSION)
    parser.add_argument("--canonical-view", default=CANONICAL_VIEW)
    parser.add_argument("--expected-records", type=int, default=4326)
    parser.add_argument(
        "--allow-partial",
        action="store_true",
        help="Allow fixture/smoke manifests whose count is not 4,326.",
    )
    return parser.parse_args()


def load_sources(path: Path) -> tuple[dict[str, dict[str, Any]], Counter[str]]:
    sources: dict[str, dict[str, Any]] = {}
    roles: Counter[str] = Counter()
    with path.open("r", encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, 1):
            if not line.strip():
                continue
            record = json.loads(line)
            scan_id = str(record.get("scan_id") or "")
            if not scan_id:
                raise ValueError(f"Missing scan_id in {path}:{line_number}")
            if scan_id in sources:
                raise ValueError(f"Duplicate scan_id {scan_id} in {path}:{line_number}")
            # Explicit allowlist prevents measurements_mm/extracted_standing_mm
            # from being retained by the builder.
            sources[scan_id] = {
                key: record.get(key) for key in ALLOWED_PROFILE_FIELDS if key in record
            }
            roles[str(record.get("role") or "missing")] += 1
    return sources, roles


def build(args: argparse.Namespace) -> tuple[dict[str, Any], list[dict[str, Any]]]:
    if not args.source_manifest.is_file():
        raise FileNotFoundError(args.source_manifest)
    if not args.render_manifest.is_file():
        raise FileNotFoundError(args.render_manifest)

    sources, source_roles = load_sources(args.source_manifest)
    entries: list[dict[str, Any]] = []
    seen: set[str] = set()
    view_counts: Counter[str] = Counter()
    render_records = 0
    duplicate_canonical: list[str] = []
    missing_source: list[str] = []

    with args.render_manifest.open("r", encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, 1):
            if not line.strip():
                continue
            render_records += 1
            record = json.loads(line)
            view_id = str(record.get("view_id") or "missing")
            view_counts[view_id] += 1
            if view_id != args.canonical_view:
                continue
            scan_id = str(record.get("scan_id") or "")
            if scan_id in seen:
                duplicate_canonical.append(scan_id)
                continue
            source = sources.get(scan_id)
            if source is None:
                missing_source.append(scan_id)
                continue
            entry = make_index_entry(source, record, index_version=args.index_version)
            entries.append(entry)
            seen.add(scan_id)

    missing_canonical = sorted(set(sources) - seen)
    problems = []
    if duplicate_canonical:
        problems.append(f"duplicate canonical renders={len(duplicate_canonical)}")
    if missing_source:
        problems.append(f"canonical renders missing source={len(missing_source)}")
    if missing_canonical:
        problems.append(f"sources missing canonical render={len(missing_canonical)}")
    if not args.allow_partial and len(entries) != args.expected_records:
        problems.append(
            f"indexed record count={len(entries)} expected={args.expected_records}"
        )
    if problems:
        raise ValueError("Index integrity gate failed: " + "; ".join(problems))

    entries.sort(key=lambda entry: str(entry["scan_id"]))
    scaler = fit_robust_scaler(entries)
    source_sha = sha256_file(args.source_manifest)
    render_sha = sha256_file(args.render_manifest)
    artifact_name = f"{args.index_version}.jsonl"
    quality = summarize_quality(entries)
    manifest: dict[str, Any] = {
        "schema_version": INDEX_SCHEMA_VERSION,
        "index_version": args.index_version,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "status": "private-test-lab-only",
        "release_approved": False,
        "implementation_contract": {
            "index_kind": "semantic-teacher-geometry-candidate-index",
            "teacher_geometry_source": "WEAR render-manifest projected rows, landmarks, and segments",
            "per_scan_fixed_topology_mhr_registration_complete": False,
            "shared_mhr_vertex_ids_preserved_across_all_4326": False,
            "shared_mhr_triangles_preserved_across_all_4326": False,
            "rgb_user_photo_query_pipeline_used": False,
            "required_blind_rgb_gate_satisfied": False,
            "honesty_note": (
                "This is an auditable semantic 2D retrieval candidate. It is not the "
                "planned full per-scan fixed-topology MHR registration."
            ),
        },
        "search": {
            "method": "exact-direct-scan",
            "approximate_index": False,
            "strict_same_gender": True,
            "height_tolerance_cm": 1.0,
            "weight_tolerance_kg": 1.0,
            "silent_fallback": False,
        },
        "descriptor": {
            "schema_version": DESCRIPTOR_SCHEMA_VERSION,
            "canonical_view": args.canonical_view,
            "coordinate_system": "translation-and-image-body-span-normalized-2d",
            "feature_layout": list(FEATURE_LAYOUT),
            "allowed_profile_fields": list(ALLOWED_PROFILE_FIELDS),
            "allowed_render_geometry_fields": list(ALLOWED_RENDER_GEOMETRY_FIELDS),
            "forbidden_leakage_fields": list(FORBIDDEN_LEAKAGE_FIELDS),
            "uses_circumference": False,
            "uses_depth": False,
            "uses_tape": False,
            "uses_hidden_3d_contour": False,
            "regional_weights": {
                "non_negative": True,
                "source": "hand-set-candidate",
                "selected_on_validation": False,
                "frozen_before_test": False,
                "status": "blocked-pending-validation-selection",
            },
        },
        "sources": {
            "standing_manifest": {
                "path": str(args.source_manifest.resolve()),
                "sha256": source_sha,
                "records": len(sources),
                "roles": dict(sorted(source_roles.items())),
            },
            "render_manifest": {
                "path": str(args.render_manifest.resolve()),
                "sha256": render_sha,
                "records": render_records,
                "views": dict(sorted(view_counts.items())),
            },
        },
        "counts": {
            "indexed_records": len(entries),
            "roles": role_counts(entries),
            "genders": gender_counts(entries),
        },
        "quality": quality,
        "robust_scaler": scaler,
        "integrity": {
            "duplicate_canonical_scan_ids": sorted(set(duplicate_canonical)),
            "canonical_renders_missing_source": sorted(set(missing_source)),
            "sources_missing_canonical_render": missing_canonical,
            "passed": not problems,
        },
        "validation_gates": {
            "source_manifest_integrity": {
                "status": "passed" if not problems else "failed",
                "required": True,
            },
            "no_circumference_depth_tape_leakage": {
                "status": "passed",
                "required": True,
            },
            "regional_weights_selected_on_validation_and_frozen": {
                "status": "blocked",
                "required": True,
                "reason": "Current non-negative feature weights are hand-set candidates.",
            },
            "rgb_query_mesh_extractor_passed": {
                "status": "blocked",
                "required": True,
                "reason": "The RGB user-photo extractor has not produced the query descriptors used by this index audit.",
            },
            "blind_rgb_test_set_passed": {
                "status": "blocked",
                "required": True,
                "reason": "Render-manifest rows and landmarks are WEAR teacher/oracle geometry, not RGB predictions.",
            },
            "release": {
                "status": "blocked",
                "required": True,
            },
        },
        "artifacts": {
            "index_jsonl": artifact_name,
            "index_manifest": "index-manifest.json",
            "blind_retrieval_report": "blind-retrieval-report.json",
            "s3_source_verification": "s3-source-verification.json",
        },
    }
    return manifest, entries


def atomic_write_text(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    descriptor, temporary = tempfile.mkstemp(prefix=path.name + ".", dir=path.parent)
    try:
        with os.fdopen(descriptor, "w", encoding="utf-8") as handle:
            handle.write(text)
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
    manifest, entries = build(args)
    artifact = args.output_dir / manifest["artifacts"]["index_jsonl"]
    manifest_path = args.output_dir / "index-manifest.json"
    index_text = "".join(compact_json(entry) + "\n" for entry in entries)
    atomic_write_text(artifact, index_text)
    manifest["artifacts"]["index_jsonl_sha256"] = sha256_file(artifact)
    manifest["artifacts"]["index_jsonl_bytes"] = artifact.stat().st_size
    atomic_write_text(
        manifest_path,
        json.dumps(manifest, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
    )
    print(
        json.dumps(
            {
                "manifest": str(manifest_path),
                "index": str(artifact),
                "records": len(entries),
                "quality": manifest["quality"],
                "release_approved": False,
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
