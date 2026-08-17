#!/usr/bin/env python3
"""Strict numerical and visual audit for the full WEAR v6 render set."""

from __future__ import annotations

import argparse
from collections import defaultdict
import hashlib
import json
import math
from pathlib import Path
import statistics
from typing import Any

from PIL import Image, ImageDraw, ImageFont


# Chest and waist are mandatory per person. Hip is mandatory whenever its
# recorded WEAR tape-plane height exists; six records lack only that redundant
# height, so their tape values remain trainable while ambiguous hip geometry is
# masked. Neck is independently masked when its tilted source plane is corrupt.
CORE_ROWS = ("chest", "waist", "hips")
ROW_ORDER = ("neck", "chest", "underbust", "waist", "hips")
COLORS = {"neck": "#a855f7", "chest": "#ef4444", "underbust": "#f59e0b", "waist": "#06b6d4", "hips": "#22c55e"}
SOURCE_ROW_MASK_REASONS = {
    "underbust": "source-underbust-plane-not-below-chest",
    "waist": "source-waist-plane-not-above-hips",
}
SOURCE_ROW_REFERENCE = {"underbust": "chest", "waist": "hips"}
SOURCE_ROW_TAPE_KEYS = {
    "underbust": "underbust_circumference_mm",
    "waist": "waist_circumference_mm",
}
MIN_UNDERBUST_CHEST_SEPARATION_MM = 10.0
SOURCE_ROW_HEIGHT_EPSILON_MM = 0.01
RECOVERY_VISUAL_SUBJECTS = (
    "NL-5419",
    "NL-6289",
    "NL-5512",
    "NA-1939",
    "NA-0056",
    "NL-6476",
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--contact-sheet-samples", type=int, default=24)
    parser.add_argument("--expected-underbust-mask-subjects", type=int, required=True)
    parser.add_argument("--expected-waist-mask-subjects", type=int, required=True)
    parser.add_argument("--strict", action="store_true")
    return parser.parse_args()


def finite(value: Any) -> float | None:
    try:
        result = float(value)
    except (TypeError, ValueError):
        return None
    return result if math.isfinite(result) else None


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def record_errors(record: dict[str, Any]) -> list[str]:
    if record.get("error"):
        return [f"pipeline-error:{record['error']}"]
    errors = []
    rows = record.get("rows") or {}
    raw_masked_rows = record.get("masked_rows") or {}
    approved_masks: set[str] = set()
    if not isinstance(raw_masked_rows, dict):
        errors.append("bad-masked-rows")
        raw_masked_rows = {}
    row_sources = {**record.get("measurements_mm", {}), **record.get("extracted_standing_mm", {})}
    for name, payload in raw_masked_rows.items():
        if name not in SOURCE_ROW_MASK_REASONS or not isinstance(payload, dict):
            errors.append(f"unapproved-{name}-mask")
            continue
        source_height = finite(payload.get("source_slice_height_mm"))
        reference_height = finite(payload.get("reference_slice_height_mm"))
        tape = finite(row_sources.get(SOURCE_ROW_TAPE_KEYS[name]))
        relation_is_invalid = (
            source_height is not None
            and reference_height is not None
            and (
                source_height + SOURCE_ROW_HEIGHT_EPSILON_MM
                >= reference_height - MIN_UNDERBUST_CHEST_SEPARATION_MM
                if name == "underbust"
                else source_height <= reference_height + SOURCE_ROW_HEIGHT_EPSILON_MM
            )
        )
        if (
            payload.get("reason") != SOURCE_ROW_MASK_REASONS[name]
            or payload.get("reference_row") != SOURCE_ROW_REFERENCE[name]
            or payload.get("tape_circumference_preserved") is not True
            or tape is None
            or tape <= 0.0
            or not relation_is_invalid
            or (rows.get(name) or {}).get("accepted") is True
        ):
            errors.append(f"invalid-{name}-source-mask")
            continue
        approved_masks.add(name)

    required_rows = ["chest", "waist"]
    if finite(row_sources.get("hip_max_height_mm")) is not None:
        required_rows.append("hips")
    for name in required_rows:
        if name in approved_masks:
            continue
        if not (rows.get(name) or {}).get("accepted"):
            errors.append(f"missing-{name}")
    ordered = []
    for name in ROW_ORDER:
        row = rows.get(name) or {}
        if not row.get("accepted"):
            continue
        y = finite(row.get("y_norm"))
        left = finite(row.get("wear_edge_left_x_norm"))
        right = finite(row.get("wear_edge_right_x_norm"))
        projected_left = finite(row.get("left_x_norm"))
        projected_right = finite(row.get("right_x_norm"))
        if y is None or not 0.0 <= y <= 1.0:
            errors.append(f"bad-{name}-y")
            continue
        ordered.append(y)
        if left is None or right is None or not 0.0 <= left < right <= 1.0:
            errors.append(f"bad-{name}-edges")
        if projected_left is not None and projected_right is not None and left is not None and right is not None:
            projected_span = projected_right - projected_left
            ratio = (right - left) / projected_span if projected_span > 1e-8 else 0.0
            if not 0.74 <= ratio <= 1.26:
                errors.append(f"bad-{name}-edge-span-ratio")
        contour = row.get("contour_points_normalized")
        if (
            row.get("shape_target_valid") is not True
            or not isinstance(contour, list)
            or len(contour) != 32
            or any(
                not isinstance(point, list)
                or len(point) != 2
                or any(finite(value) is None for value in point)
                for point in (contour if isinstance(contour, list) else [])
            )
        ):
            errors.append(f"bad-{name}-shape")
        if not row.get("measurement_protocol") or not row.get("mesh_plane_protocol") or not row.get("perimeter_comparison"):
            errors.append(f"missing-{name}-protocol")
        if name in {"chest", "underbust"}:
            if row.get("arm_exclusion_method") != "WEAR-landmark-bounded-torso-crop":
                errors.append(f"missing-{name}-arm-exclusion")
            if row.get("edge_within_anatomy_bounds") is not True:
                errors.append(f"bad-{name}-anatomy-bounds")
    if ordered != sorted(ordered):
        errors.append("row-order")
    return errors


def diverse_visual_records(records: list[dict[str, Any]], count: int) -> list[dict[str, Any]]:
    """Choose deterministic, subject-diverse visual proof instead of file order."""
    candidates = [record for record in records if not record.get("error") and record.get("image")]
    selected: list[dict[str, Any]] = []
    selected_subjects: set[str] = set()

    def add(record: dict[str, Any] | None) -> None:
        if record is None or len(selected) >= count:
            return
        subject = str(record.get("subject_id", record.get("sample_id", "")))
        if not subject or subject in selected_subjects:
            return
        selected.append(record)
        selected_subjects.add(subject)

    def extremes(value_for) -> None:
        valid = [(value_for(record), record) for record in candidates]
        valid = [(value, record) for value, record in valid if value is not None]
        if not valid:
            return
        valid.sort(key=lambda item: float(item[0]))
        add(valid[0][1])
        add(valid[-1][1])

    # Always show the known first-pass recovery cases and source-invalid masks
    # in the human contact sheet. They deserve more scrutiny than another
    # random clean person, and make the recovery visually falsifiable.
    for subject_id in RECOVERY_VISUAL_SUBJECTS:
        add(next((record for record in candidates if str(record.get("subject_id")) == subject_id), None))
    for row_name in SOURCE_ROW_MASK_REASONS:
        add(next((record for record in candidates if row_name in (record.get("masked_rows") or {})), None))

    for key in ("bmi", "height_cm", "weight_kg"):
        extremes(lambda record, field=key: finite(record.get(field)))
    for row_name in ("chest", "waist", "hips"):
        extremes(
            lambda record, name=row_name: finite(
                ((record.get("rows") or {}).get(name) or {}).get("apple_corrected_width_cm")
            )
        )

    grouped: dict[tuple[str, str, str, str], list[dict[str, Any]]] = defaultdict(list)
    for record in candidates:
        grouped[(
            str(record.get("role", "unknown")),
            str(record.get("gender", "unknown")),
            str(record.get("region", "unknown")),
            str(record.get("view_id", "unknown")),
        )].append(record)
    for key in sorted(grouped):
        rows = sorted(
            grouped[key],
            key=lambda record: hashlib.sha256(str(record.get("sample_id", "")).encode()).hexdigest(),
        )
        add(next((record for record in rows if str(record.get("subject_id")) not in selected_subjects), None))
        if len(selected) >= count:
            return selected

    for record in sorted(
        candidates,
        key=lambda row: hashlib.sha256(str(row.get("sample_id", "")).encode()).hexdigest(),
    ):
        add(record)
        if len(selected) >= count:
            break
    return selected


def overlay(record: dict[str, Any], width: int = 384, height: int = 512) -> Image.Image:
    image = Image.open(record["image"]).convert("RGB").resize((width, height))
    tile = Image.new("RGB", (width + 220, height), "#0b1020")
    tile.paste(image, (0, 0))
    draw = ImageDraw.Draw(tile)
    font = ImageFont.load_default()
    for name in ROW_ORDER:
        row = (record.get("rows") or {}).get(name) or {}
        if not row.get("accepted"):
            continue
        y = round(float(row["y_norm"]) * (height - 1))
        left = round(float(row["wear_edge_left_x_norm"]) * (width - 1))
        right = round(float(row["wear_edge_right_x_norm"]) * (width - 1))
        draw.line((left, y, right, y), fill="white", width=5)
        draw.line((left, y, right, y), fill=COLORS[name], width=3)
        draw.text((left, max(2, y - 13)), name, fill=COLORS[name], font=font)
    draw.text((width + 10, 12), str(record.get("sample_id")), fill="white", font=font)
    text_y = 38
    for name in ROW_ORDER:
        row = (record.get("rows") or {}).get(name) or {}
        if not row.get("accepted"):
            continue
        tape = finite(row.get("measurement_circumference_mm"))
        depth = finite(row.get("mesh_depth_mm"))
        delta = finite(row.get("perimeter_delta_to_measurement_pct"))
        comparison = str(row.get("perimeter_comparison") or "unknown")
        draw.text((width + 10, text_y), name, fill=COLORS[name], font=font)
        tape_text = f"{tape / 10:.1f}" if tape is not None else "n/a"
        depth_text = f"{depth / 10:.1f}" if depth is not None else "n/a"
        delta_text = f"{delta:.1f}%" if delta is not None else "n/a"
        draw.text((width + 10, text_y + 14), f"tape {tape_text} depth {depth_text} cm", fill="#e2e8f0", font=font)
        direct = comparison == "direct"
        draw.text(
            (width + 10, text_y + 28),
            f"mesh/tape {'gate' if direct else 'diagnostic'} {delta_text}",
            fill=("#fca5a5" if delta is not None and delta > 12 else "#86efac") if direct else "#cbd5e1",
            font=font,
        )
        text_y += 58
    for name, payload in (record.get("masked_rows") or {}).items():
        reason = str((payload or {}).get("reason", "unapproved-mask"))
        draw.text((width + 10, text_y), f"{name} geometry masked", fill="#fde047", font=font)
        draw.text((width + 10, text_y + 14), reason[:30], fill="#fef3c7", font=font)
        text_y += 36
    return tile


def main() -> None:
    args = parse_args()
    records = [json.loads(line) for line in args.manifest.read_text(encoding="utf-8").splitlines() if line.strip()]
    successful = [record for record in records if not record.get("error")]
    pipeline_failures = {
        str(record.get("subject_id", record.get("sample_id", "unknown"))): str(record.get("error"))
        for record in records
        if record.get("error")
    }
    label_errors = {
        record.get("sample_id", record.get("subject_id", "unknown")): record_errors(record)
        for record in successful
    }
    label_errors = {key: value for key, value in label_errors.items() if value}
    roles_by_subject: dict[str, set[str]] = defaultdict(set)
    views_by_subject: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for record in successful:
        roles_by_subject[str(record["subject_id"])].add(str(record["role"]))
        views_by_subject[str(record["subject_id"])].append(record)
    split_leaks = sorted(subject for subject, roles in roles_by_subject.items() if len(roles) > 1)

    camera_cvs = []
    for views in views_by_subject.values():
        for name in ROW_ORDER:
            values = [finite((record.get("rows", {}).get(name) or {}).get("apple_corrected_width_cm")) for record in views]
            values = [value for value in values if value is not None and value > 0]
            if len(values) >= 2:
                camera_cvs.append(statistics.pstdev(values) / statistics.mean(values))
    camera_p95 = sorted(camera_cvs)[min(len(camera_cvs) - 1, math.floor(len(camera_cvs) * 0.95))] if camera_cvs else None

    row_totals = {}
    for name in ROW_ORDER:
        accepted = [(record.get("rows", {}).get(name) or {}) for record in successful]
        accepted = [row for row in accepted if row.get("accepted")]
        direct = [row for row in accepted if row.get("perimeter_comparison") == "direct"]
        mask_span_ratios = []
        for row in accepted:
            left = finite(row.get("wear_edge_left_x_norm"))
            right = finite(row.get("wear_edge_right_x_norm"))
            mask_left = finite(row.get("visible_mask_left_x_norm"))
            mask_right = finite(row.get("visible_mask_right_x_norm"))
            if None not in (left, right, mask_left, mask_right) and mask_right > mask_left:
                mask_span_ratios.append((right - left) / (mask_right - mask_left))
        row_totals[name] = {
            "accepted": len(accepted),
            "depth_targets": sum(bool(row.get("geometry_target_valid")) for row in accepted),
            "shape_targets": sum(bool(row.get("shape_target_valid")) for row in accepted),
            "protocol_annotated": sum(
                bool(row.get("measurement_protocol") and row.get("mesh_plane_protocol") and row.get("perimeter_comparison"))
                for row in accepted
            ),
            "perimeter_consistent": sum(bool(row.get("perimeter_consistent_with_tape")) for row in accepted),
            "direct_perimeter_comparisons": len(direct),
            "direct_perimeter_consistent": sum(bool(row.get("perimeter_consistent_with_tape")) for row in direct),
            "arm_exclusion_records": sum(
                row.get("arm_exclusion_method") == "WEAR-landmark-bounded-torso-crop"
                and row.get("edge_within_anatomy_bounds") is True
                for row in accepted
            ),
            "visible_mask_span_checks": len(mask_span_ratios),
            "visible_mask_arm_safe": sum(0.55 <= ratio <= 1.10 for ratio in mask_span_ratios),
            "visible_mask_span_ratio_min": min(mask_span_ratios) if mask_span_ratios else None,
            "visible_mask_span_ratio_max": max(mask_span_ratios) if mask_span_ratios else None,
        }

    source_row_masks = {}
    for name, reason in SOURCE_ROW_MASK_REASONS.items():
        matches = [
            record
            for record in successful
            if ((record.get("masked_rows") or {}).get(name) or {}).get("reason") == reason
        ]
        source_row_masks[name] = {
            "records": len(matches),
            "subjects": len({str(record.get("subject_id")) for record in matches}),
            "reason": reason,
            "tape_targets_preserved": sum(
                ((record.get("masked_rows") or {}).get(name) or {}).get("tape_circumference_preserved") is True
                for record in matches
            ),
        }
    all_mask_entries = sum(
        len(record.get("masked_rows") or {})
        for record in successful
        if isinstance(record.get("masked_rows") or {}, dict)
    )
    approved_mask_entries = sum(source_row_masks[name]["records"] for name in SOURCE_ROW_MASK_REASONS)

    gates = {
        "render_success_at_least_98_pct": len(successful) / max(len(records), 1) >= 0.98,
        "no_label_errors": not label_errors,
        "no_subject_split_leaks": not split_leaks,
        "camera_width_cv_p95_at_most_8_pct": camera_p95 is not None and camera_p95 <= 0.08,
        "all_row_protocols_annotated": all(
            row_totals[name]["protocol_annotated"] == row_totals[name]["accepted"]
            for name in ROW_ORDER
        ),
        "all_core_shape_targets_present": all(
            row_totals[name]["shape_targets"] / max(row_totals[name]["accepted"], 1) >= 0.95
            for name in CORE_ROWS
        ),
        "hip_row_coverage_at_least_99_pct": row_totals["hips"]["accepted"] / max(len(successful), 1) >= 0.99,
        "neck_row_coverage_at_least_90_pct": row_totals["neck"]["accepted"] / max(len(successful), 1) >= 0.90,
        "neck_shape_targets_at_least_90_pct": row_totals["neck"]["shape_targets"] / max(row_totals["neck"]["accepted"], 1) >= 0.90,
        "underbust_shape_targets_at_least_90_pct": row_totals["underbust"]["shape_targets"] / max(row_totals["underbust"]["accepted"], 1) >= 0.90,
        "chest_arm_exclusion_evidence_at_least_98_pct": row_totals["chest"]["arm_exclusion_records"] / max(row_totals["chest"]["accepted"], 1) >= 0.98,
        "underbust_arm_exclusion_evidence_at_least_98_pct": row_totals["underbust"]["arm_exclusion_records"] / max(row_totals["underbust"]["accepted"], 1) >= 0.98,
        "chest_visible_mask_safety_at_least_90_pct": row_totals["chest"]["visible_mask_arm_safe"] / max(row_totals["chest"]["visible_mask_span_checks"], 1) >= 0.90,
        "underbust_visible_mask_safety_at_least_90_pct": row_totals["underbust"]["visible_mask_arm_safe"] / max(row_totals["underbust"]["visible_mask_span_checks"], 1) >= 0.90,
        "hip_direct_perimeter_consistency_at_least_90_pct": row_totals["hips"]["direct_perimeter_consistent"] / max(row_totals["hips"]["direct_perimeter_comparisons"], 1) >= 0.90,
        "waist_direct_perimeter_consistency_at_least_75_pct": row_totals["waist"]["direct_perimeter_consistent"] / max(row_totals["waist"]["direct_perimeter_comparisons"], 1) >= 0.75,
        "neck_raw_depth_coverage_at_least_90_pct": row_totals["neck"]["depth_targets"] / max(row_totals["neck"]["accepted"], 1) >= 0.90,
        "chest_raw_depth_coverage_at_least_95_pct": row_totals["chest"]["depth_targets"] / max(row_totals["chest"]["accepted"], 1) >= 0.95,
        "waist_raw_depth_coverage_at_least_95_pct": row_totals["waist"]["depth_targets"] / max(row_totals["waist"]["accepted"], 1) >= 0.95,
        "hip_raw_depth_coverage_at_least_95_pct": row_totals["hips"]["depth_targets"] / max(row_totals["hips"]["accepted"], 1) >= 0.95,
        "only_approved_source_row_masks": all_mask_entries == approved_mask_entries,
        "masked_tape_targets_preserved": all(
            details["records"] == details["tape_targets_preserved"]
            for details in source_row_masks.values()
        ),
        "underbust_source_order_masks_match_source_pre_audit": (
            source_row_masks["underbust"]["subjects"] == args.expected_underbust_mask_subjects
        ),
        "waist_source_order_masks_match_source_pre_audit": (
            source_row_masks["waist"]["subjects"] == args.expected_waist_mask_subjects
        ),
    }
    args.output_dir.mkdir(parents=True, exist_ok=True)
    chosen = diverse_visual_records(successful, max(1, args.contact_sheet_samples))
    if not chosen:
        raise RuntimeError("No successful v6 records are available for the visual audit")
    tiles = [overlay(record) for record in chosen]
    columns = min(3, len(tiles))
    rows = math.ceil(len(tiles) / columns)
    sheet = Image.new("RGB", (tiles[0].width * columns, tiles[0].height * rows), "#020617")
    for index, tile in enumerate(tiles):
        sheet.paste(tile, ((index % columns) * tile.width, (index // columns) * tile.height))
    sheet_path = args.output_dir / "label-contact-sheet.jpg"
    sheet.save(sheet_path, quality=92)
    summary = {
        "schema_version": 2,
        "audit_protocol": "WEAR-v6-protocol-aware-label-gate",
        "records": len(records),
        "successful": len(successful),
        "failed_records": len(records) - len(successful),
        "failed_subjects": len(pipeline_failures),
        "subjects": len(views_by_subject),
        "roles": {role: sum(role in roles for roles in roles_by_subject.values()) for role in ("train", "validation", "test")},
        "sample_errors": label_errors,
        "pipeline_failures": pipeline_failures,
        "split_leaks": split_leaks,
        "row_totals": row_totals,
        "source_row_masks": source_row_masks,
        "expected_source_row_masks": {
            "underbust_subjects": args.expected_underbust_mask_subjects,
            "waist_subjects": args.expected_waist_mask_subjects,
        },
        "camera_width_cv_p95": camera_p95,
        "gates": gates,
        "contact_sheet": str(sheet_path),
        "manifest_sha256": sha256_file(args.manifest),
        "contact_sheet_sha256": sha256_file(sheet_path),
        "visual_review_required": True,
        "visual_review_note": "A human must inspect the saved diverse contact sheet before GPU training.",
        "passed": all(gates.values()),
    }
    (args.output_dir / "audit-summary.json").write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(summary, indent=2))
    if args.strict and not summary["passed"]:
        raise SystemExit(2)


if __name__ == "__main__":
    main()
