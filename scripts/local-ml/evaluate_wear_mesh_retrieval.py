#!/usr/bin/env python3
"""Blind self-retrieval evaluation for the private WEAR semantic 2D index.

The query identity is retained only by this evaluator for scoring after search;
it is never passed into the search function.  Pinned mode uses 24 deterministic
test scans.  Full mode evaluates all 448 test scans across eight held-out views.
"""

from __future__ import annotations

import argparse
import json
import math
import os
import statistics
import tempfile
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Mapping

from wear_mesh_index import (
    EVALUATION_VIEWS,
    FORBIDDEN_LEAKAGE_FIELDS,
    evenly_spaced,
    load_index,
    normalize_gender,
    query_from_render_record,
    rank_candidates,
    select_pinned_test_scans,
)


ROOT = Path(__file__).resolve().parents[2]
DEFAULT_INDEX_MANIFEST = ROOT / ".local-ml/wear-mesh-index/index-manifest.json"
DEFAULT_RENDER_MANIFEST = ROOT / ".local-ml/v6r5-apple-pose/render-manifest-all.jsonl"
DEFAULT_PILOT_RENDER_MANIFEST = (
    ROOT / ".local-ml/wear3d-pilot/proof-100-v3/render-manifest.jsonl"
)
DEFAULT_SOURCE_MANIFEST = (
    ROOT / ".local-ml/wear3d-v6-audit/source-manifest-standing-a.jsonl"
)
DEFAULT_REPORT = ROOT / ".local-ml/wear-mesh-index/blind-retrieval-report.json"
REPORT_SCHEMA = "wear-blind-retrieval-report/v1"
POST_RANKING_MEASUREMENTS = {
    "neck_cm": "neck_base_circumference_mm",
    "chest_cm": "chest_circumference_mm",
    "underbust_cm": "underbust_circumference_mm",
    "waist_cm": "waist_circumference_mm",
    "hips_cm": "hip_circumference_mm",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--index-manifest", type=Path, default=DEFAULT_INDEX_MANIFEST)
    parser.add_argument("--render-manifest", type=Path, default=DEFAULT_RENDER_MANIFEST)
    parser.add_argument(
        "--pilot-render-manifest", type=Path, default=DEFAULT_PILOT_RENDER_MANIFEST
    )
    parser.add_argument("--source-manifest", type=Path, default=DEFAULT_SOURCE_MANIFEST)
    parser.add_argument("--report", type=Path, default=DEFAULT_REPORT)
    parser.add_argument(
        "--phase",
        choices=("pilot-front24", "pinned24", "full-test"),
        default="pilot-front24",
    )
    parser.add_argument("--pinned-count", type=int, default=24)
    parser.add_argument(
        "--max-queries",
        type=int,
        help="Smoke-test cap. A capped run is explicitly marked incomplete.",
    )
    parser.add_argument(
        "--allow-partial",
        action="store_true",
        help="Do not fail the expected 448x8/full or pinned count gate.",
    )
    return parser.parse_args()


def _rank_for(
    matches: list[Mapping[str, Any]],
    *,
    scan_id: str | None,
    subject_id: str | None,
    field: str,
) -> int | None:
    for match in matches:
        same_scan = bool(scan_id) and str(match.get("scan_id")) == scan_id
        same_subject = bool(subject_id) and str(match.get("subject_id")) == subject_id
        if same_scan or same_subject:
            value = match.get(field)
            return int(value) if value is not None else None
    return None


def _metric_summary(ranks: list[int]) -> dict[str, Any]:
    return {
        "count": len(ranks),
        "top1_rate": round(sum(rank <= 1 for rank in ranks) / len(ranks), 6)
        if ranks
        else None,
        "top5_rate": round(sum(rank <= 5 for rank in ranks) / len(ranks), 6)
        if ranks
        else None,
        "mean_reciprocal_rank": round(sum(1.0 / rank for rank in ranks) / len(ranks), 6)
        if ranks
        else None,
        "median_rank": float(statistics.median(ranks)) if ranks else None,
        "worst_rank": max(ranks) if ranks else None,
    }


def _percentile(values: list[float], fraction: float) -> float | None:
    if not values:
        return None
    ordered = sorted(values)
    if len(ordered) == 1:
        return ordered[0]
    position = fraction * (len(ordered) - 1)
    lower = math.floor(position)
    upper = math.ceil(position)
    if lower == upper:
        return ordered[lower]
    return ordered[lower] + (ordered[upper] - ordered[lower]) * (position - lower)


def load_post_ranking_labels(path: Path) -> tuple[dict[str, Any], dict[str, str]]:
    """Load labels into an evaluator-only store, separate from index/search."""

    by_scan: dict[str, Any] = {}
    subject_to_scan: dict[str, str] = {}
    with path.open("r", encoding="utf-8") as handle:
        for line in handle:
            if not line.strip():
                continue
            record = json.loads(line)
            scan_id = str(record.get("scan_id") or "")
            subject_id = str(record.get("subject_id") or "")
            measurements = record.get("measurements_mm")
            if not scan_id or not isinstance(measurements, Mapping):
                continue
            values: dict[str, float] = {}
            for public_name, source_name in POST_RANKING_MEASUREMENTS.items():
                raw = measurements.get(source_name)
                if isinstance(raw, (int, float)) and math.isfinite(float(raw)):
                    values[public_name] = float(raw) / 10.0
            by_scan[scan_id] = {"subject_id": subject_id, "measurements_cm": values}
            if subject_id:
                subject_to_scan[subject_id] = scan_id
    return by_scan, subject_to_scan


def _diverse_pilot_records(path: Path, count: int) -> list[dict[str, Any]]:
    records = [json.loads(line) for line in path.open("r", encoding="utf-8") if line.strip()]
    grouped: dict[str, list[dict[str, Any]]] = {"female": [], "male": []}
    for record in records:
        gender = normalize_gender(record.get("gender"))
        if gender in grouped:
            grouped[gender].append(record)
    female_count = count // 2 + count % 2
    male_count = count // 2
    chosen: list[dict[str, Any]] = []
    for gender, target in (("female", female_count), ("male", male_count)):
        ordered = sorted(
            grouped[gender],
            key=lambda record: (
                float(record.get("bmi") or -1.0),
                float(record.get("height_cm") or -1.0),
                float(record.get("weight_kg") or -1.0),
                str(record.get("subject_id")),
            ),
        )
        chosen.extend(evenly_spaced(ordered, min(target, len(ordered))))
    return sorted(chosen, key=lambda record: str(record.get("subject_id")))


def _measurement_summary(errors: Mapping[str, list[float]]) -> dict[str, Any]:
    per_measurement: dict[str, Any] = {}
    maes: list[float] = []
    for name in POST_RANKING_MEASUREMENTS:
        values = errors.get(name, [])
        if not values:
            per_measurement[name] = {"count": 0, "mae_cm": None}
            continue
        mae = sum(values) / len(values)
        maes.append(mae)
        per_measurement[name] = {
            "count": len(values),
            "mae_cm": round(mae, 4),
            "median_absolute_error_cm": round(float(statistics.median(values)), 4),
            "p90_absolute_error_cm": round(float(_percentile(values, 0.90)), 4),
            "within_2cm_rate": round(sum(value <= 2.0 for value in values) / len(values), 6),
            "within_5cm_rate": round(sum(value <= 5.0 for value in values) / len(values), 6),
        }
    return {
        "macro_mae_cm": round(sum(maes) / len(maes), 4) if maes else None,
        "per_measurement": per_measurement,
    }


def evaluate(args: argparse.Namespace) -> dict[str, Any]:
    manifest, entries = load_index(args.index_manifest)
    labels_by_scan, subject_to_scan = load_post_ranking_labels(args.source_manifest)
    test_scan_ids = sorted(str(entry["scan_id"]) for entry in entries if entry.get("role") == "test")
    pilot_records: list[dict[str, Any]] | None = None
    if args.phase == "pilot-front24":
        pilot_records = _diverse_pilot_records(args.pilot_render_manifest, args.pinned_count)
        selected = [str(record.get("subject_id")) for record in pilot_records]
        selected_set = set(selected)
        phase_key = "pilot_front24"
        expected_queries = len(selected)
        expected_people = args.pinned_count
        evidence_class = "oracle-geometry same-view front-only structural retrieval"
        evaluation_views = ("front-only-pilot",)
    elif args.phase == "pinned24":
        selected = select_pinned_test_scans(entries, args.pinned_count)
        selected_set = set(selected)
        phase_key = "pinned24"
        expected_queries = len(selected) * len(EVALUATION_VIEWS)
        expected_people = args.pinned_count
        evidence_class = "oracle-geometry alternate-view structural retrieval"
        evaluation_views = EVALUATION_VIEWS
    else:
        selected = test_scan_ids
        selected_set = set(selected)
        phase_key = "full_test_448x8"
        expected_queries = len(selected) * len(EVALUATION_VIEWS)
        expected_people = 448
        evidence_class = "oracle-geometry alternate-view structural retrieval"
        evaluation_views = EVALUATION_VIEWS
    if not args.allow_partial and len(selected) != expected_people:
        raise ValueError(
            f"{args.phase} expected {expected_people} people, selected {len(selected)}"
        )

    total_ranks: list[int] = []
    shape_ranks: list[int] = []
    profile_ranks: list[int] = []
    per_view_ranks: dict[str, list[int]] = defaultdict(list)
    cohorts: list[int] = []
    rejected: list[dict[str, Any]] = []
    target_missing: list[dict[str, Any]] = []
    neighbor_missing: dict[str, list[dict[str, Any]]] = defaultdict(list)
    neighbor_ranks: dict[str, list[int]] = defaultdict(list)
    measurement_errors: dict[str, dict[str, list[float]]] = {
        "combined": defaultdict(list),
        "shape_only": defaultdict(list),
        "profile_only": defaultdict(list),
    }
    seen_keys: set[tuple[str, str]] = set()
    processed = 0

    if pilot_records is not None:
        phase_records = pilot_records
    else:
        phase_records = (
            json.loads(line)
            for line in args.render_manifest.open("r", encoding="utf-8")
            if line.strip()
        )
    try:
        for record in phase_records:
            scan_id = str(record.get("scan_id") or "")
            subject_id = str(record.get("subject_id") or "")
            if pilot_records is not None:
                if subject_id not in selected_set:
                    continue
                target_scan_id = subject_to_scan.get(subject_id)
                view_id = "front-only-pilot"
            else:
                if scan_id not in selected_set:
                    continue
                target_scan_id = scan_id
                view_id = str(record.get("view_id") or "")
                if view_id not in EVALUATION_VIEWS:
                    continue
            if args.max_queries is not None and processed >= args.max_queries:
                break
            processed += 1
            seen_keys.add((target_scan_id or subject_id, view_id))
            query = query_from_render_record(record)
            if query["descriptor"]["quality"]["accepted"] is not True:
                rejected.append(
                    {
                        "scan_id": target_scan_id,
                        "subject_id": subject_id,
                        "view_id": view_id,
                        "issues": query["descriptor"]["quality"]["issues"],
                    }
                )
                continue
            # Deliberately pass only profile + descriptor. Ground-truth scan_id
            # stays in this evaluator and is inspected only after ranking.
            ranked = rank_candidates(query, entries, manifest["robust_scaler"])
            cohorts.append(int(ranked["cohort_count"]))
            matches = ranked["matches"]
            total_rank = _rank_for(
                matches,
                scan_id=target_scan_id,
                subject_id=subject_id,
                field="rank",
            )
            shape_rank = _rank_for(
                matches,
                scan_id=target_scan_id,
                subject_id=subject_id,
                field="shape_only_rank",
            )
            profile_rank = _rank_for(
                matches,
                scan_id=target_scan_id,
                subject_id=subject_id,
                field="profile_only_rank",
            )
            if total_rank is None or shape_rank is None or profile_rank is None:
                target_missing.append(
                    {
                        "scan_id": target_scan_id,
                        "subject_id": subject_id,
                        "view_id": view_id,
                        "cohort_count": ranked["cohort_count"],
                    }
                )
                continue
            total_ranks.append(total_rank)
            shape_ranks.append(shape_rank)
            profile_ranks.append(profile_rank)
            per_view_ranks[view_id].append(total_rank)

            # This is the useful non-trivial test: remove the true person after
            # ranking, choose the nearest other person, then compare held-out
            # WEAR measurements. Labels never enter the query or scorer.
            ranking_methods = {
                "combined": "rank",
                "shape_only": "shape_only_rank",
                "profile_only": "profile_only_rank",
            }
            for method, rank_field in ranking_methods.items():
                neighbor = next(
                    (
                        match
                        for match in sorted(
                            matches,
                            key=lambda item: (
                                int(item[rank_field]),
                                str(item.get("scan_id")),
                            ),
                        )
                        if str(match.get("subject_id") or "") != subject_id
                    ),
                    None,
                )
                if neighbor is None or target_scan_id is None:
                    neighbor_missing[method].append(
                        {
                            "scan_id": target_scan_id,
                            "subject_id": subject_id,
                            "view_id": view_id,
                            "reason": "strict cohort has no different person",
                        }
                    )
                    continue
                neighbor_scan_id = str(neighbor.get("scan_id") or "")
                target_labels = labels_by_scan.get(target_scan_id, {}).get(
                    "measurements_cm", {}
                )
                neighbor_labels = labels_by_scan.get(neighbor_scan_id, {}).get(
                    "measurements_cm", {}
                )
                if not target_labels or not neighbor_labels:
                    neighbor_missing[method].append(
                        {
                            "scan_id": target_scan_id,
                            "neighbor_scan_id": neighbor_scan_id,
                            "view_id": view_id,
                            "reason": "post-ranking measurement labels missing",
                        }
                    )
                    continue
                neighbor_ranks[method].append(int(neighbor[rank_field]))
                for name in POST_RANKING_MEASUREMENTS:
                    if name in target_labels and name in neighbor_labels:
                        measurement_errors[method][name].append(
                            abs(float(target_labels[name]) - float(neighbor_labels[name]))
                        )
    finally:
        close = getattr(phase_records, "close", None)
        if callable(close):
            close()

    incomplete = args.max_queries is not None or len(seen_keys) != expected_queries
    if not args.allow_partial and not incomplete and len(seen_keys) != expected_queries:
        raise ValueError(
            f"Expected {expected_queries} query renders, found {len(seen_keys)}"
        )
    if not args.allow_partial and args.max_queries is None and len(seen_keys) != expected_queries:
        raise ValueError(
            f"Query count gate failed: expected {expected_queries}, found {len(seen_keys)}"
        )

    phase = {
        "phase": phase_key,
        "evidence_class": evidence_class,
        "completed_at": datetime.now(timezone.utc).isoformat(),
        "complete": not incomplete,
        "selected_people": len(selected),
        "selected_scan_ids": selected,
        "views": list(evaluation_views),
        "expected_queries": expected_queries,
        "seen_queries": len(seen_keys),
        "scored_queries": len(total_ranks),
        "quality_rejected_queries": len(rejected),
        "target_missing_from_scored_cohort": len(target_missing),
        "ranking": {
            "combined_shape_plus_allowed_profile": _metric_summary(total_ranks),
            "shape_only": _metric_summary(shape_ranks),
            "profile_only_baseline": _metric_summary(profile_ranks),
        },
        "per_view_combined": {
            view: _metric_summary(per_view_ranks.get(view, []))
            for view in evaluation_views
        },
        "true_person_excluded_neighbor": {
            "selection": "first exact-ranked candidate with a different subject_id, independently for each ranking method",
            "labels_used_only_after_ranking": True,
            "methods": {
                method: {
                    "queries_with_scored_neighbor": len(neighbor_ranks[method]),
                    "queries_without_other_person_or_labels": len(
                        neighbor_missing[method]
                    ),
                    "selected_neighbor_rank": _metric_summary(neighbor_ranks[method]),
                    "measurement_error": _measurement_summary(
                        measurement_errors[method]
                    ),
                }
                for method in ("combined", "shape_only", "profile_only")
            },
        },
        "cohort_size": {
            "minimum": min(cohorts) if cohorts else None,
            "maximum": max(cohorts) if cohorts else None,
            "mean": round(sum(cohorts) / len(cohorts), 4) if cohorts else None,
            "median": float(statistics.median(cohorts)) if cohorts else None,
        },
        "failure_examples": {
            "quality_rejected": rejected[:25],
            "target_missing": target_missing[:25],
            "neighbor_missing": {
                method: examples[:25]
                for method, examples in sorted(neighbor_missing.items())
            },
        },
        "rgb_pipeline_used": False,
        "required_blind_gate_satisfied": False,
        "blockers": [
            "Queries use WEAR render-manifest teacher/oracle rows and landmarks; the RGB user-photo mesh extractor was not run.",
            "Current regional feature weights are hand-set, not selected on validation and frozen before test.",
            "Profile-only retrieval is unusually strong in strict, often unique height/weight cohorts and is not proof of shape benefit.",
        ],
        "profile_baseline_warning": (
            "Profile-only rank is reported separately. A perfect or near-perfect score in the "
            "strict cohort must not be credited to 2D shape."
        ),
        "interpretation_gate": {
            "candidate_for_release": False,
            "reason": "oracle structural diagnostic only; RGB and validation-frozen-weight gates are blocked",
        },
    }
    return phase


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
    manifest, _entries = load_index(args.index_manifest)
    phase = evaluate(args)
    if args.report.exists():
        report = json.loads(args.report.read_text(encoding="utf-8"))
        if (
            report.get("index_version") != manifest.get("index_version")
            or report.get("index_jsonl_sha256")
            != manifest.get("artifacts", {}).get("index_jsonl_sha256")
        ):
            report = {}
    else:
        report = {}
    report.update(
        {
            "schema_version": REPORT_SCHEMA,
            "index_version": manifest.get("index_version"),
            "index_jsonl_sha256": manifest.get("artifacts", {}).get(
                "index_jsonl_sha256"
            ),
            "index_manifest": str(args.index_manifest.resolve()),
            "render_manifest": str(args.render_manifest.resolve()),
            "status": "private-test-lab-only",
            "release_approved": False,
            "blindness_contract": {
                "query_identity_sent_to_search": False,
                "circumference_sent_to_search": False,
                "depth_sent_to_search": False,
                "tape_sent_to_search": False,
                "forbidden_fields": list(FORBIDDEN_LEAKAGE_FIELDS),
                "ground_truth_used_only_after_ranking": True,
                "post_ranking_measurements_used_for_neighbor_mae_only": True,
            },
            "validation_gates": {
                "oracle_geometry_structural_retrieval": "diagnostic-complete",
                "regional_weights_selected_on_validation_and_frozen": "blocked",
                "rgb_query_mesh_extractor": "blocked",
                "blind_rgb_test_set": "blocked",
                "release": "blocked",
            },
        }
    )
    runs = report.setdefault("runs", {})
    runs[phase["phase"]] = phase
    atomic_write(
        args.report,
        json.dumps(report, ensure_ascii=False, indent=2, sort_keys=True) + "\n",
    )
    print(
        json.dumps(
            {
                "report": str(args.report),
                "phase": phase["phase"],
                "complete": phase["complete"],
                "selected_people": phase["selected_people"],
                "seen_queries": phase["seen_queries"],
                "ranking": phase["ranking"],
                "release_approved": False,
            },
            indent=2,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
