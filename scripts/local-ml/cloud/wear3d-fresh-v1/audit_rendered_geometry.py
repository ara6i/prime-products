#!/usr/bin/env python3
"""Hard-audit fresh WEAR 3D teacher manifests without filling missing labels."""

from __future__ import annotations

import argparse
from collections import Counter, defaultdict
from datetime import datetime, timezone
import hashlib
import json
import math
from pathlib import Path
from typing import Any

from teacher_contract import ROW_NAMES, extract_targets


PIPELINE_ID = "wear3d-fresh-teacher-v1"
VIEW_SPECS = {
    "canonical": (50.0, 0.0, 0.0, 0.0, 1.00, 0.00),
    "yaw-left-12": (50.0, -12.0, 0.0, 0.0, 1.00, 0.00),
    "yaw-right-12": (50.0, 12.0, 0.0, 0.0, 1.00, 0.00),
    "pitch-up-6": (50.0, 0.0, 6.0, 0.0, 1.00, 0.00),
    "pitch-down-6": (50.0, 0.0, -6.0, 0.0, 1.00, 0.00),
    "roll-left-3": (50.0, 0.0, 0.0, -3.0, 1.00, 0.00),
    "roll-right-3": (50.0, 0.0, 0.0, 3.0, 1.00, 0.00),
    "wide-35": (35.0, 0.0, 0.0, 0.0, 1.00, 0.00),
    "tele-70": (70.0, 0.0, 0.0, 0.0, 1.08, 0.00),
}
CAMERA_FIELDS = (
    "lens_mm",
    "yaw_deg",
    "pitch_deg",
    "roll_deg",
    "distance_scale",
    "target_height_offset_ratio",
)
CAMERA_TARGETS = (
    "camera.correction_yaw_deg",
    "camera.correction_pitch_deg",
    "camera.correction_roll_deg",
    "camera.correction_target_height_ratio",
    "camera.input_lens_ratio_to_50mm",
    "camera.input_distance_scale",
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path, action="append", required=True)
    parser.add_argument("--expected-subjects", type=int, required=True)
    parser.add_argument("--expected-role", action="append", default=[])
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--contact-sheet", type=Path)
    parser.add_argument("--contact-sheet-samples", type=int, default=16)
    return parser.parse_args()


def now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def finite(value: Any) -> float | None:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if math.isfinite(number) else None


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def load_records(paths: list[Path]) -> list[dict[str, Any]]:
    records: list[dict[str, Any]] = []
    for path in paths:
        with path.open(encoding="utf-8") as handle:
            for line_number, line in enumerate(handle, 1):
                if not line.strip():
                    continue
                try:
                    record = json.loads(line)
                except json.JSONDecodeError as error:
                    raise RuntimeError(f"{path}:{line_number}: invalid JSON: {error}") from error
                record["__manifest"] = str(path)
                record["__line"] = line_number
                records.append(record)
    return records


def close(left: Any, right: float, tolerance: float = 1e-6) -> bool:
    value = finite(left)
    return value is not None and abs(value - right) <= tolerance


def camera_failure(record: dict[str, Any], targets: dict[str, float]) -> str | None:
    view_id = str(record.get("view_id"))
    expected = VIEW_SPECS.get(view_id)
    if expected is None:
        return f"unexpected view {view_id}"
    camera = record.get("camera") or {}
    for field, value in zip(CAMERA_FIELDS, expected):
        if not close(camera.get(field), value):
            return f"{view_id} {field}={camera.get(field)!r} expected={value}"
    expected_targets = {
        "camera.correction_yaw_deg": -expected[1],
        "camera.correction_pitch_deg": -expected[2],
        "camera.correction_roll_deg": -expected[3],
        "camera.correction_target_height_ratio": -expected[5],
        "camera.input_lens_ratio_to_50mm": expected[0] / 50.0,
        "camera.input_distance_scale": expected[4],
    }
    for key, value in expected_targets.items():
        if not close(targets.get(key), value):
            return f"{view_id} {key}={targets.get(key)!r} expected={value}"
    return None


def tape_available(record: dict[str, Any], row_name: str) -> bool:
    target = f"tape.{row_name}.circumference_cm"
    return target in extract_targets(record)


def coverage_entry(eligible: int, applicable: int) -> dict[str, Any]:
    return {
        "eligible": eligible,
        "applicable": applicable,
        "coveragePct": round(100.0 * eligible / applicable, 3) if applicable else None,
    }


def select_evenly(records: list[dict[str, Any]], count: int) -> list[dict[str, Any]]:
    ordered = sorted(
        records,
        key=lambda record: (
            str(record.get("role")),
            str(record.get("region")),
            str(record.get("gender")),
            finite(record.get("bmi")) or 0.0,
            str(record.get("scan_id")),
        ),
    )
    if len(ordered) <= count:
        return ordered
    indexes = [round(index * (len(ordered) - 1) / (count - 1)) for index in range(count)]
    return [ordered[index] for index in indexes]


def build_contact_sheet(
    canonical: list[dict[str, Any]],
    output: Path,
    sample_count: int,
) -> dict[str, Any]:
    from PIL import Image, ImageDraw, ImageFont

    available = [record for record in canonical if Path(str(record.get("mesh_image", ""))).is_file()]
    selected = select_evenly(available, max(1, sample_count))
    if not selected:
        raise RuntimeError("No local canonical mesh cards are available for the visual audit")
    columns = 4
    card_width, card_height = 288, 430
    rows = math.ceil(len(selected) / columns)
    sheet = Image.new("RGB", (columns * card_width, rows * card_height), (8, 13, 22))
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.load_default()
    colors = {
        "neck": (255, 110, 200),
        "chest": (70, 220, 255),
        "underbust": (255, 190, 70),
        "waist": (110, 255, 140),
        "hips": (185, 130, 255),
    }
    selected_ids = []
    for index, record in enumerate(selected):
        x0 = (index % columns) * card_width
        y0 = (index // columns) * card_height
        source = Image.open(str(record["mesh_image"])).convert("RGB")
        # Ubuntu's packaged Pillow may predate the Resampling enum while still
        # exposing the equivalent top-level LANCZOS constant.
        resampling = getattr(Image, "Resampling", Image)
        source.thumbnail((270, 360), resampling.LANCZOS)
        image_x = x0 + (card_width - source.width) // 2
        image_y = y0 + 38
        sheet.paste(source, (image_x, image_y))
        subject_id = str(record.get("subject_id"))
        selected_ids.append(subject_id)
        draw.text((x0 + 8, y0 + 8), f"{subject_id}  {record.get('role')}  BMI {record.get('bmi')}", fill=(235, 240, 248), font=font)
        rows_data = record.get("rows") or {}
        for row_name, color in colors.items():
            row = rows_data.get(row_name) or {}
            y_norm = finite(row.get("y_norm"))
            left = finite(row.get("left_x_norm"))
            right = finite(row.get("right_x_norm"))
            if y_norm is None or left is None or right is None:
                continue
            px_y = image_y + round(y_norm * max(source.height - 1, 1))
            px_left = image_x + round(left * max(source.width - 1, 1))
            px_right = image_x + round(right * max(source.width - 1, 1))
            width = 3 if row.get("shape_teacher_accepted") is True else 2
            draw.line((px_left, px_y, px_right, px_y), fill=color, width=width)
            draw.ellipse((px_left - 2, px_y - 2, px_left + 2, px_y + 2), fill=color)
            draw.ellipse((px_right - 2, px_y - 2, px_right + 2, px_y + 2), fill=color)
        masked = ",".join(sorted((record.get("masked_rows") or {}).keys())) or "none"
        draw.text((x0 + 8, y0 + 404), f"masked: {masked}", fill=(175, 188, 205), font=font)
    output.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output, quality=92, optimize=True)
    return {"samples": len(selected), "subjectIds": selected_ids, "sha256": sha256(output)}


def main() -> None:
    args = parse_args()
    expected_roles = set(args.expected_role or ("train", "validation"))
    records = load_records(args.manifest)
    failures: list[str] = []
    error_records = [record for record in records if record.get("error")]
    successful = [record for record in records if not record.get("error")]
    if len(records) != args.expected_subjects * len(VIEW_SPECS):
        failures.append(
            f"record-count={len(records)} expected={args.expected_subjects * len(VIEW_SPECS)}"
        )
    unexpected_pipelines = Counter(str(record.get("pipeline_id")) for record in records if record.get("pipeline_id") != PIPELINE_ID)
    if unexpected_pipelines:
        failures.append(f"unexpected-pipelines={dict(unexpected_pipelines)}")
    provenance_values = (
        str(record.get(key, "")).lower()
        for record in records
        for key in (
            "pipeline_id",
            "fresh_job_id",
            "fresh_shard_id",
            "image",
            "mesh_image",
            "mask",
            "s3_mesh_image",
            "s3_mask",
        )
    )
    if any("v9" in value for value in provenance_values):
        failures.append("v9-reference-detected")
    unexpected_roles = Counter(str(record.get("role")) for record in records if record.get("role") not in expected_roles)
    if unexpected_roles:
        failures.append(f"unexpected-roles={dict(unexpected_roles)}")
    duplicate_samples = [sample for sample, count in Counter(str(record.get("sample_id")) for record in records).items() if count != 1]
    if duplicate_samples:
        failures.append(f"duplicate-sample-ids={duplicate_samples[:10]}")

    by_subject: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for record in records:
        by_subject[str(record.get("subject_id"))].append(record)
    if len(by_subject) != args.expected_subjects:
        failures.append(f"subject-count={len(by_subject)} expected={args.expected_subjects}")
    subject_view_failures = []
    expected_views = set(VIEW_SPECS)
    for subject_id, subject_records in by_subject.items():
        views = [str(record.get("view_id")) for record in subject_records]
        if len(views) != len(expected_views) or set(views) != expected_views:
            subject_view_failures.append({"subjectId": subject_id, "views": views})
    if subject_view_failures:
        failures.append(f"subjects-with-invalid-view-set={len(subject_view_failures)}")

    camera_failures = []
    unsafe_shape_leaks = []
    geometry_mask_failures = []
    for record in successful:
        targets = extract_targets(record)
        camera_error = camera_failure(record, targets)
        if camera_error:
            camera_failures.append(f"{record.get('sample_id')}: {camera_error}")
        for row_name, row in (record.get("rows") or {}).items():
            shape_keys = [key for key in targets if key.startswith(f"row.{row_name}.shape.")]
            if row.get("shape_teacher_accepted") is not True and shape_keys:
                unsafe_shape_leaks.append(str(record.get("sample_id")) + ":" + row_name)
        eligibility = record.get("teacher_eligibility") or {}
        if eligibility.get("geometry_rows") is False:
            if record.get("rows"):
                geometry_mask_failures.append(
                    f"{record.get('sample_id')}: geometry_rows=false-but-rows-present"
                )
            if eligibility.get("all_geometry_rows_masked") is not True:
                geometry_mask_failures.append(
                    f"{record.get('sample_id')}: numeric-only-sample-not-explicitly-masked"
                )
            if any(key.startswith("row.") for key in targets):
                geometry_mask_failures.append(
                    f"{record.get('sample_id')}: masked-geometry-target-leak"
                )
    if camera_failures:
        failures.append(f"camera-contract-failures={len(camera_failures)}")
    if unsafe_shape_leaks:
        failures.append(f"unsafe-shape-target-leaks={len(unsafe_shape_leaks)}")
    if geometry_mask_failures:
        failures.append(f"numeric-only-mask-contract-failures={len(geometry_mask_failures)}")
    if error_records:
        failures.append(f"render-error-records={len(error_records)}")

    canonical = [record for record in successful if record.get("view_id") == "canonical"]
    row_coverage: dict[str, Any] = {}
    for row_name in ROW_NAMES:
        applicable = len(canonical)
        tape_applicable = sum(tape_available(record, row_name) for record in canonical)
        edge = depth = shape = tape = 0
        for record in canonical:
            targets = extract_targets(record)
            edge += all(
                key in targets
                for key in (
                    f"row.{row_name}.y_norm",
                    f"row.{row_name}.left_x_norm",
                    f"row.{row_name}.right_x_norm",
                    f"row.{row_name}.width_cm",
                )
            )
            depth += all(
                key in targets
                for key in (
                    f"row.{row_name}.depth_cm",
                    f"row.{row_name}.depth_width_ratio",
                )
            )
            shape += sum(key.startswith(f"row.{row_name}.shape.") for key in targets) == 64
            tape += f"tape.{row_name}.circumference_cm" in targets
        row_coverage[row_name] = {
            "edgeAB": coverage_entry(edge, applicable),
            "depthCD": coverage_entry(depth, applicable),
            "closedShape32": coverage_entry(shape, applicable),
            "recordedTape": coverage_entry(tape, tape_applicable),
        }

    ratio_names = sorted(
        {
            key
            for record in canonical
            for key in extract_targets(record)
            if key.startswith("ratio.")
        }
    )
    ratio_coverage = {
        name: coverage_entry(
            sum(name in extract_targets(record) for record in canonical),
            len(canonical),
        )
        for name in ratio_names
    }
    head_counts = {
        "rowEdgeSubjects": sum(
            sum(key.startswith("row.") and key.endswith(".width_cm") for key in extract_targets(record))
            for record in canonical
        ),
        "rowDepthSubjects": sum(
            sum(key.startswith("row.") and key.endswith(".depth_cm") for key in extract_targets(record))
            for record in canonical
        ),
        "closedShapes": sum(
            sum(key.startswith("row.") and key.endswith(".shape.00.x") for key in extract_targets(record))
            for record in canonical
        ),
        "tapeTargets": sum(
            sum(key.startswith("tape.") for key in extract_targets(record))
            for record in canonical
        ),
        "ratioTargets": sum(
            sum(key.startswith("ratio.") for key in extract_targets(record))
            for record in canonical
        ),
    }
    for name, count in head_counts.items():
        if count == 0:
            failures.append(f"empty-target-head={name}")

    contact_sheet = None
    if args.contact_sheet:
        try:
            contact_sheet = build_contact_sheet(canonical, args.contact_sheet, args.contact_sheet_samples)
        except Exception as error:
            failures.append(f"contact-sheet={type(error).__name__}: {error}")

    passed = not failures
    report = {
        "schemaVersion": "wear3d-fresh-render-audit/v1",
        "generatedAt": now(),
        "pipelineId": PIPELINE_ID,
        "v9ArtifactUsed": False,
        "previousProcessedArtifactRead": False,
        "manifests": [
            {"path": str(path), "sha256": sha256(path)}
            for path in args.manifest
        ],
        "expected": {
            "subjects": args.expected_subjects,
            "viewsPerSubject": len(VIEW_SPECS),
            "roles": sorted(expected_roles),
            "viewIds": list(VIEW_SPECS),
        },
        "actual": {
            "subjects": len(by_subject),
            "records": len(records),
            "successfulRecords": len(successful),
            "errorRecords": len(error_records),
            "roles": dict(Counter(str(record.get("role")) for record in records)),
        },
        "camera": {
            "recordsChecked": len(successful),
            "failures": len(camera_failures),
            "failureExamples": camera_failures[:20],
            "targets": list(CAMERA_TARGETS),
        },
        "rowCoverage": row_coverage,
        "ratioCoverage": ratio_coverage,
        "targetCounts": head_counts,
        "maskSafety": {
            "unsafeShapeTargetLeaks": len(unsafe_shape_leaks),
            "examples": unsafe_shape_leaks[:20],
            "numericOnlyMaskContractFailures": len(geometry_mask_failures),
            "numericOnlyMaskFailureExamples": geometry_mask_failures[:20],
            "missingOrUnsafeRowsAreMaskedInsteadOfFilled": (
                len(unsafe_shape_leaks) == 0 and len(geometry_mask_failures) == 0
            ),
        },
        "teacherModes": {
            "geometryEligibleSubjects": sum(
                (record.get("teacher_eligibility") or {}).get("geometry_rows") is not False
                for record in canonical
            ),
            "numericOnlySubjects": sum(
                (record.get("teacher_eligibility") or {}).get("geometry_rows") is False
                for record in canonical
            ),
        },
        "renderErrors": [
            {
                "sampleId": record.get("sample_id"),
                "subjectId": record.get("subject_id"),
                "error": record.get("error"),
            }
            for record in error_records[:100]
        ],
        "subjectViewFailures": subject_view_failures[:100],
        "contactSheet": contact_sheet,
        "failures": failures,
        "teacherDatasetStructurallyValid": passed,
        "freshGeometryReadyForModelFitting": passed,
        "sealedTestSubjectsUsed": 0,
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "passed": passed,
        "subjects": len(by_subject),
        "records": len(records),
        "errors": len(error_records),
        "output": str(args.output),
    }))
    raise SystemExit(0 if passed else 2)


if __name__ == "__main__":
    main()
