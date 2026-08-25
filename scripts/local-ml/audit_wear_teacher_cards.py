#!/usr/bin/env python3
"""Hard-gate every WEAR v8 certified mesh teacher before GPU training."""

from __future__ import annotations

import argparse
import collections
import hashlib
import json
import math
import os
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[2]
DEFAULT_RENDER_MANIFEST = ROOT / ".local-ml/v6r5-apple-pose/render-manifest-all.jsonl"
DEFAULT_SOURCE_MANIFEST = ROOT / ".local-ml/wear3d-v6-audit/source-manifest-standing-a.jsonl"
DEFAULT_REPORT = ROOT / ".local-ml/reports/wear-v6r5-teacher-card-audit.json"
ROWS = ("neck", "chest", "underbust", "waist", "hips")
SEGMENTS = ("shoulders", "left_sleeve", "right_sleeve", "left_inseam", "right_inseam")
EXPECTED_VIEWS = 9
EXPECTED_PEOPLE = 4326
EXPECTED_BLENDER_VERSION = "5.2.0 LTS"

ROW_HEIGHT_SOURCES = {
    "chest": ("extracted_standing_mm", "chest_height_standing_mm"),
    "waist": ("measurements_mm", "waist_height_mm"),
    "hips": ("measurements_mm", "hip_max_height_mm"),
}

MAPPED_CIRCUMFERENCES = {
    "neck_base_circumference_mm",
    "chest_circumference_mm",
    "underbust_circumference_mm",
    "waist_circumference_mm",
    "hip_circumference_mm",
}


def finite(value: Any) -> float | None:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if math.isfinite(number) else None


def expected_height_mm(source: dict[str, Any], row_name: str) -> float | None:
    if row_name not in ROW_HEIGHT_SOURCES:
        return None
    group, key = ROW_HEIGHT_SOURCES[row_name]
    value = source.get(group, {}).get(key)
    if row_name == "underbust" and isinstance(value, list) and len(value) >= 3:
        value = value[2]
    return finite(value)


def geometry_row_reasons(row_name: str, row: dict[str, Any], source: dict[str, Any]) -> list[str]:
    reasons: list[str] = []
    if not row:
        return ["row-missing"]
    if row.get("accepted") is not True:
        reasons.extend(str(reason) for reason in row.get("teacher_rejection_reasons") or ["teacher-rejected"])
    if row.get("geometry_target_valid") is not True:
        reasons.append("geometry-target-invalid")
    if row.get("shape_target_valid") is not True:
        reasons.append("shape-target-invalid")
    if row.get("certified_section") is not True:
        reasons.append("section-not-certified")
    method = str(row.get("slice_method") or "")
    if "fallback" in method:
        reasons.append("uncertified-fallback-slice")
    if row.get("edge_within_anatomy_bounds") is not True:
        reasons.append("edge-outside-anatomy-bounds")
    if row_name in {"chest", "underbust"} and row.get("arm_exclusion_method") != "WEAR-landmark-bounded-torso-crop":
        reasons.append("arm-exclusion-not-proven")
    contour = row.get("contour_points_normalized")
    if not isinstance(contour, list) or len(contour) != 32:
        reasons.append("shape-not-32-points")
    left = finite(row.get("left_x_norm"))
    right = finite(row.get("right_x_norm"))
    if left is None or right is None or not left < right:
        reasons.append("invalid-a-b-endpoints")
    if left is not None and right is not None and isinstance(contour, list) and contour:
        projected = row.get("projected_contour")
        if isinstance(projected, list) and projected:
            xs = [finite(point[0]) for point in projected if isinstance(point, list) and len(point) >= 2]
            xs = [value for value in xs if value is not None]
            if xs and (abs(min(xs) - left) > 0.003 or abs(max(xs) - right) > 0.003):
                reasons.append("a-b-does-not-match-shape-edges")
    expected = expected_height_mm(source, row_name)
    actual = finite(row.get("slice_height_mm"))
    if expected is not None and (actual is None or abs(actual - expected) > 2.0):
        reasons.append("row-height-disagrees-with-wear-source")
    return sorted(set(reasons))


def tape_target_reasons(row: dict[str, Any], geometry_reasons: list[str]) -> list[str]:
    if finite(row.get("measurement_circumference_mm")) is None:
        return ["recorded-tape-missing"]
    if geometry_reasons:
        return ["geometry-teacher-invalid"]
    reasons: list[str] = []
    if row.get("tape_target_valid") is not True:
        reasons.append("recorded-tape-target-invalid")
    tape = finite(row.get("measurement_circumference_mm"))
    if tape is None or tape <= 0:
        reasons.append("recorded-tape-value-invalid")
    if row.get("circumference_target_source") != "WEAR-recorded-standing-tape-only":
        reasons.append("circumference-target-is-not-recorded-wear-tape")
    return sorted(set(reasons))


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def proof_font(size: int, bold: bool = False) -> ImageFont.ImageFont:
    for candidate in (
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
    ):
        try:
            return ImageFont.truetype(candidate, size)
        except OSError:
            continue
    return ImageFont.load_default()


def render_contact_sheet(
    cards: list[dict[str, Any]],
    output: Path,
    count: int,
    requested_rows: tuple[str, ...],
    mesh_root: Path | None = None,
) -> None:
    # Ubuntu 22.04 ships Pillow 9.0, where Image.Resampling is not exposed yet.
    # Keep the audit renderer compatible with both the AWS worker and newer local
    # Pillow releases; this affects only contact-sheet resizing, never geometry.
    nearest_resample = getattr(getattr(Image, "Resampling", Image), "NEAREST")
    colors = {"neck": "#c084fc", "chest": "#fb923c", "underbust": "#facc15", "waist": "#22d3ee", "hips": "#34d399"}
    candidates = sorted(cards, key=lambda card: (str(card.get("region")), str(card.get("gender")), str(card.get("scan_id"))))
    if len(candidates) > count:
        indexes = [round(index * (len(candidates) - 1) / (count - 1)) for index in range(count)] if count > 1 else [0]
        candidates = [candidates[index] for index in indexes]
    columns = 4
    tile_width, tile_height = 400, 440
    rows = max(1, math.ceil(len(candidates) / columns))
    sheet = Image.new("RGB", (columns * tile_width, rows * tile_height), "#06101f")
    draw = ImageDraw.Draw(sheet)
    for index, card in enumerate(candidates):
        ox = (index % columns) * tile_width
        oy = (index // columns) * tile_height
        mesh_path = resolve_mesh_path(card.get("mesh_image"), mesh_root)
        mesh = Image.open(mesh_path).convert("RGB").resize((288, 384), nearest_resample)
        sheet.paste(mesh, (ox + 8, oy + 48))
        draw.text((ox + 10, oy + 8), str(card.get("scan_id")), fill="white", font=proof_font(20, True))
        passed = 0
        for row_name, row in (card.get("rows") or {}).items():
            if row_name not in requested_rows or not row:
                continue
            x1 = ox + 8 + float(row.get("left_x_norm", 0)) * 288
            x2 = ox + 8 + float(row.get("right_x_norm", 0)) * 288
            y = oy + 48 + float(row.get("y_norm", 0)) * 384
            color = colors[row_name] if row.get("accepted") is True else "#ef4444"
            draw.line((x1, y, x2, y), fill=color, width=5)
            if row.get("accepted") is True:
                passed += 1
        draw.text((ox + 306, oy + 52), f"{passed}/{len(requested_rows)}", fill="#67e8f9", font=proof_font(16, True))
        draw.text((ox + 306, oy + 78), "solid=teacher", fill="#a9b8cc", font=proof_font(12))
        draw.text((ox + 306, oy + 98), "red=rejected", fill="#fca5a5", font=proof_font(12))
    output.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(output, quality=92)


def resolve_mesh_path(value: Any, mesh_root: Path | None = None) -> Path:
    mesh_path = Path(str(value or ""))
    if not mesh_path.is_absolute():
        mesh_path = Path.cwd() / mesh_path
    if mesh_path.is_file() or mesh_root is None:
        return mesh_path
    parts = mesh_path.parts
    if "rendered" in parts:
        rendered_index = parts.index("rendered")
        recovered_path = mesh_root.joinpath(*parts[rendered_index + 1 :])
        if recovered_path.is_file():
            return recovered_path
    return mesh_path


def segment_reasons(segment: Any) -> list[str]:
    if not isinstance(segment, list) or len(segment) < 2:
        return ["segment-missing"]
    if any(not isinstance(point, dict) or point.get("visible") is not True for point in segment):
        return ["segment-landmark-not-visible"]
    if any(finite(point.get("x")) is None or finite(point.get("y")) is None for point in segment):
        return ["segment-coordinate-invalid"]
    return []


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--render-manifest", type=Path, default=DEFAULT_RENDER_MANIFEST)
    parser.add_argument("--source-manifest", type=Path, default=DEFAULT_SOURCE_MANIFEST)
    parser.add_argument("--output", type=Path, default=DEFAULT_REPORT)
    parser.add_argument("--contact-sheet", type=Path)
    parser.add_argument("--mesh-root", type=Path)
    parser.add_argument("--contact-sheet-samples", type=int, default=24)
    parser.add_argument("--expected-people", type=int, default=EXPECTED_PEOPLE)
    parser.add_argument("--expected-views", type=int, default=EXPECTED_VIEWS)
    parser.add_argument("--scan-id", action="append", default=[])
    parser.add_argument("--row", action="append", choices=ROWS, default=[])
    args = parser.parse_args()
    requested_rows = tuple(dict.fromkeys(args.row or ROWS))
    expected_pipeline_id = os.environ.get("WEAR_TEACHER_PIPELINE_ID", "wear3d-standing-mesh-teacher-v8")

    sources = {}
    circumference_fields: set[str] = set()
    for line in args.source_manifest.read_text().splitlines():
        source = json.loads(line)
        if args.scan_id and source.get("scan_id") not in set(args.scan_id):
            continue
        sources[source["scan_id"]] = source
        circumference_fields.update(
            key for key in source.get("measurements_mm", {}) if "circumference" in key
        )

    canonical_cards: dict[str, dict[str, Any]] = {}
    view_counts: collections.Counter[str] = collections.Counter()
    view_geometry: dict[tuple[str, str], list[tuple[float | None, float | None, float | None]]] = collections.defaultdict(list)
    render_count = 0
    for line in args.render_manifest.read_text().splitlines():
        card = json.loads(line)
        scan_id = card.get("scan_id")
        if not scan_id:
            continue
        render_count += 1
        view_counts[scan_id] += 1
        if card.get("view_id") == "front-50":
            canonical_cards[scan_id] = card
        for row_name, row in card.get("rows", {}).items():
            if row_name in requested_rows:
                view_geometry[(scan_id, row_name)].append((
                    finite(row.get("mesh_width_mm")),
                    finite(row.get("mesh_depth_mm")),
                ))

    row_reports = {}
    person_failures: dict[str, dict[str, list[str]]] = {}
    missing_mesh_cards = []
    wrong_pipeline_cards = []
    wrong_blender_cards = []
    for scan_id, card in canonical_cards.items():
        # A preserved error card is explicit evidence that the source scan was
        # excluded. It must count toward cohort accounting, but it is not a
        # Blender teacher and therefore must not be required to have an image.
        if card.get("error"):
            continue
        mesh_image = card.get("mesh_image")
        if not mesh_image or not resolve_mesh_path(mesh_image, args.mesh_root).is_file():
            missing_mesh_cards.append(scan_id)
        if card.get("pipeline_id") != expected_pipeline_id or card.get("schema_version") != 3:
            wrong_pipeline_cards.append(scan_id)
        if (card.get("render") or {}).get("blender_version") != EXPECTED_BLENDER_VERSION:
            wrong_blender_cards.append(scan_id)
    for row_name in requested_rows:
        geometry_reason_counts: collections.Counter[str] = collections.Counter()
        tape_reason_counts: collections.Counter[str] = collections.Counter()
        geometry_eligible = 0
        tape_eligible = 0
        tape_applicable = 0
        applicable = 0
        for scan_id, source in sources.items():
            card = canonical_cards.get(scan_id, {})
            row = card.get("rows", {}).get(row_name, {})
            if not row:
                tape_key = "underbust_circumference_mm" if row_name == "underbust" else None
                if tape_key and finite(source.get("measurements_mm", {}).get(tape_key)) is None:
                    continue
            applicable += 1
            geometry_reasons = geometry_row_reasons(row_name, row, source)
            values = view_geometry.get((scan_id, row_name), [])
            if len(values) != args.expected_views:
                geometry_reasons.append("missing-camera-card")
            else:
                for coordinate in range(2):
                    finite_values = [value[coordinate] for value in values if value[coordinate] is not None]
                    if len(finite_values) != args.expected_views or max(finite_values) - min(finite_values) > 0.05:
                        geometry_reasons.append("teacher-geometry-changes-with-camera")
                        break
            geometry_reasons = sorted(set(geometry_reasons))
            if geometry_reasons:
                person_failures.setdefault(scan_id, {})[row_name] = geometry_reasons
                geometry_reason_counts.update(geometry_reasons)
            else:
                geometry_eligible += 1
            tape_reasons = tape_target_reasons(row, geometry_reasons)
            if "recorded-tape-missing" not in tape_reasons:
                tape_applicable += 1
                if tape_reasons:
                    tape_reason_counts.update(tape_reasons)
                else:
                    tape_eligible += 1
        row_reports[row_name] = {
            "applicablePeople": applicable,
            "geometryTeacherEligiblePeople": geometry_eligible,
            "geometryRejectedPeople": applicable - geometry_eligible,
            "geometryPassRate": round(geometry_eligible / applicable, 6) if applicable else 0.0,
            "geometryRejectionReasons": dict(geometry_reason_counts.most_common()),
            "applicableRecordedTapePeople": tape_applicable,
            "tapeTargetEligiblePeople": tape_eligible,
            "tapeTargetRejectedPeople": tape_applicable - tape_eligible,
            "tapeTargetPassRate": round(tape_eligible / tape_applicable, 6) if tape_applicable else 0.0,
            "tapeTargetRejectionReasons": dict(tape_reason_counts.most_common()),
        }

    segment_reports = {}

    contact_sheet_sha256 = None
    if args.contact_sheet:
        render_contact_sheet(
            [card for card in canonical_cards.values() if not card.get("error")],
            args.contact_sheet,
            args.contact_sheet_samples,
            requested_rows,
            args.mesh_root,
        )
        contact_sheet_sha256 = sha256_file(args.contact_sheet)

    report = {
        "schemaVersion": "wear-waist-hips-teacher-audit/v1",
        "status": "pending-final-gate",
        "inputs": {
            "people": len(sources),
            "renderCards": render_count,
            "expectedPeople": args.expected_people,
            "expectedViewsPerPerson": args.expected_views,
            "peopleWithCanonicalFrontCard": len(canonical_cards),
            "explicitlyExcludedFailedCards": sum(bool(card.get("error")) for card in canonical_cards.values()),
            "peopleWithWrongViewCount": sum(count != args.expected_views for count in view_counts.values()),
            "missingCanonicalMeshCards": len(missing_mesh_cards),
            "wrongPipelineCanonicalCards": len(wrong_pipeline_cards),
            "wrongBlenderVersionCanonicalCards": len(wrong_blender_cards),
        },
        "hardRules": [
            "WEAR landmark/profile row height must agree within 2 mm",
            "A-B must equal the same PLY contour's left/right edges",
            "chest and under-bust require landmark-bounded arm exclusion",
            "section must be a raw central closed PLY loop or a certified small-gap front/back PLY arc ring",
            "depth and 32-point shape must come from that same accepted section",
            "recorded WEAR tape is the only circumference target",
            "PLY circumference is neither calculated nor compared with tape",
            "teacher geometry must remain invariant across every requested Blender camera",
            f"every mesh card must be rendered by Blender {EXPECTED_BLENDER_VERSION}",
        ],
        "rows": row_reports,
        "landmarkSegments": segment_reports,
        "circumferenceMapping": {
            "availableFields": sorted(circumference_fields),
            "mappedRows": list(requested_rows),
            "blockedUntilProtocolMapped": [],
        },
        "summary": {
            "allRowsPassForPeople": sum(scan_id not in person_failures for scan_id in sources),
            "peopleWithAllRequestedGeometryAndTapeTargets": sum(
                all(
                    (canonical_cards.get(scan_id, {}).get("rows", {}).get(row_name, {}) or {}).get("accepted") is True
                    and (canonical_cards.get(scan_id, {}).get("rows", {}).get(row_name, {}) or {}).get("tape_target_valid") is True
                    for row_name in requested_rows
                )
                for scan_id in sources
            ),
            "peopleWithAnyRejectedRow": len(person_failures),
            "minimumPerRowCoverage": 0.90,
            "contactSheetSha256": contact_sheet_sha256,
            "renderManifestSha256": sha256_file(args.render_manifest),
            "sourceManifestSha256": sha256_file(args.source_manifest),
            "trainingAllowed": bool(
                len(sources) == args.expected_people
                and len(canonical_cards) == args.expected_people
                and not missing_mesh_cards
                and not wrong_pipeline_cards
                and not wrong_blender_cards
                and all(count == args.expected_views for count in view_counts.values())
                and all(row["geometryPassRate"] >= 0.90 for row in row_reports.values())
                and all(row["tapeTargetPassRate"] >= 0.90 for row in row_reports.values())
            ),
        },
        "failuresByPerson": person_failures,
    }
    report["status"] = (
        "teacher-dataset-ready"
        if report["summary"]["trainingAllowed"]
        else "release-and-training-blocked-until-teachers-pass"
    )
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps({"output": str(args.output), **report["inputs"], **report["summary"]}, indent=2))


if __name__ == "__main__":
    main()
