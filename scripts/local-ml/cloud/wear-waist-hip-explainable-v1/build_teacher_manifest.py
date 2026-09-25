#!/usr/bin/env python3
"""Freeze the explainable waist/hip teacher and person-level fold manifests.

The script reads only the 3,878 development subjects.  The 448-person file is
used for identity separation and hashing; none of its measurements enter the
teacher output.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
import statistics
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable


ROWS = ("waist", "hips")
DEVELOPMENT_ROLES = {"train", "validation"}
EXPECTED_DEVELOPMENT_PEOPLE = 3_878
EXPECTED_HELDOUT_PEOPLE = 448
EXPECTED_DECISIONS = EXPECTED_DEVELOPMENT_PEOPLE * len(ROWS)
GREEN_MAX_ABS_CONFLICT_CM = 7.0
RED_MIN_ABS_CONFLICT_CM = 12.0
FOLD_COUNT = 5
FOLD_SEED = "prime-waist-hip-explainable-v1-folds-20260904"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser()
    parser.add_argument("--training-index", required=True, type=Path)
    parser.add_argument("--source-manifest", required=True, type=Path)
    parser.add_argument("--render-root", required=True, type=Path)
    parser.add_argument("--heldout-index", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("--s3-inventory", type=Path)
    return parser.parse_args()


def now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def canonical_json(value: Any) -> bytes:
    return json.dumps(value, sort_keys=True, separators=(",", ":")).encode()


def sha256_bytes(value: bytes) -> str:
    return hashlib.sha256(value).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(8 * 1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def json_lines(path: Path) -> Iterable[tuple[int, dict[str, Any], str]]:
    with path.open(encoding="utf-8") as handle:
        for line_number, line in enumerate(handle, 1):
            if not line.strip():
                continue
            yield line_number, json.loads(line), sha256_bytes(line.rstrip("\n").encode())


def finite(value: Any) -> float | None:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    return number if math.isfinite(number) else None


def plausible_tape_cm(row_name: str, value: float | None) -> bool:
    if value is None:
        return False
    bounds = {"waist": (45.0, 200.0), "hips": (55.0, 220.0)}
    low, high = bounds[row_name]
    return low <= value <= high


def ring_perimeter_cm(points: Any) -> float | None:
    if not isinstance(points, list) or len(points) < 16:
        return None
    parsed: list[tuple[float, float]] = []
    for point in points:
        if not isinstance(point, list) or len(point) < 2:
            return None
        x = finite(point[0])
        depth = finite(point[1])
        if x is None or depth is None:
            return None
        parsed.append((x, depth))
    perimeter_mm = sum(
        math.dist(parsed[index], parsed[(index + 1) % len(parsed)])
        for index in range(len(parsed))
    )
    return perimeter_mm / 10.0 if perimeter_mm > 0 else None


def normalized_shape_valid(points: Any) -> bool:
    if not isinstance(points, list) or len(points) != 32:
        return False
    for point in points:
        if not isinstance(point, list) or len(point) < 2:
            return False
        if finite(point[0]) is None or finite(point[1]) is None:
            return False
    return True


def fold_for(scan_id: str, stratum: str, position: int) -> int:
    rotation = int(hashlib.sha256(f"{FOLD_SEED}|{stratum}".encode()).hexdigest()[:8], 16)
    return (position + rotation) % FOLD_COUNT


def bmi_band(value: Any) -> str:
    bmi = finite(value)
    if bmi is None:
        return "unknown"
    if bmi < 18.5:
        return "underweight"
    if bmi < 25:
        return "healthy"
    if bmi < 30:
        return "overweight"
    return "obesity"


def source_object(path: Any, inventory: dict[str, dict[str, Any]]) -> dict[str, Any]:
    local_path = str(path or "")
    marker = "/raw/WEAR3DDATA/"
    if marker not in local_path:
        return {"workerPath": local_path or None, "s3": None, "inventoryProof": None}
    key = "raw/WEAR3DDATA/" + local_path.split(marker, 1)[1]
    return {
        "workerPath": local_path,
        "s3": f"s3://primestyleai-wear3d-921049726279-us-east-1/{key}",
        "inventoryProof": inventory.get(key),
    }


def main() -> int:
    args = parse_args()
    output_dir = args.output_dir.resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    source_rows: dict[str, dict[str, Any]] = {}
    source_hashes: dict[str, str] = {}
    for _, record, record_hash in json_lines(args.source_manifest):
        scan_id = str(record.get("scan_id") or "")
        if not scan_id or scan_id in source_rows:
            raise RuntimeError(f"Missing or duplicate source scan ID: {scan_id!r}")
        source_rows[scan_id] = record
        source_hashes[scan_id] = record_hash

    development_ids = {
        scan_id for scan_id, record in source_rows.items()
        if record.get("role") in DEVELOPMENT_ROLES
    }
    source_test_ids = {
        scan_id for scan_id, record in source_rows.items() if record.get("role") == "test"
    }
    heldout_payload = json.loads(args.heldout_index.read_text())
    heldout_people = heldout_payload.get("people") or []
    heldout_ids = {str(person.get("scanId") or "") for person in heldout_people}
    if len(development_ids) != EXPECTED_DEVELOPMENT_PEOPLE:
        raise RuntimeError(f"Development count changed: {len(development_ids)}")
    if len(heldout_ids) != EXPECTED_HELDOUT_PEOPLE or heldout_ids != source_test_ids:
        raise RuntimeError("The held-out identity list does not match the frozen source test role")
    overlap = development_ids & heldout_ids
    if overlap:
        raise RuntimeError(f"Development/test overlap: {sorted(overlap)[:10]}")

    inventory: dict[str, dict[str, Any]] = {}
    if args.s3_inventory and args.s3_inventory.exists():
        items = json.loads(args.s3_inventory.read_text())
        inventory = {str(item["Key"]): item for item in items if item.get("Key")}

    render_paths = sorted(args.render_root.glob("cpu-32-*/render-manifest.jsonl"))
    if len(render_paths) != 8:
        raise RuntimeError(f"Expected eight consolidated render manifests, found {len(render_paths)}")
    canonical: dict[str, tuple[dict[str, Any], Path, int, str]] = {}
    render_hashes: dict[str, str] = {}
    for path in render_paths:
        render_hashes[str(path.relative_to(args.render_root))] = sha256_file(path)
        for line_number, record, record_hash in json_lines(path):
            if record.get("view_id") != "canonical":
                continue
            scan_id = str(record.get("scan_id") or "")
            if scan_id in canonical:
                raise RuntimeError(f"Duplicate canonical render for {scan_id}")
            canonical[scan_id] = (record, path, line_number, record_hash)
    if set(canonical) != development_ids:
        missing = sorted(development_ids - set(canonical))
        extra = sorted(set(canonical) - development_ids)
        raise RuntimeError(f"Canonical identity mismatch: missing={missing[:5]} extra={extra[:5]}")

    strata: dict[str, list[str]] = defaultdict(list)
    for scan_id in development_ids:
        source = source_rows[scan_id]
        stratum = "|".join((
            str(source.get("gender") or "unknown"),
            str(source.get("region") or "unknown"),
            bmi_band(source.get("bmi")),
        ))
        strata[stratum].append(scan_id)
    folds: dict[str, int] = {}
    for stratum, ids in sorted(strata.items()):
        ordered = sorted(
            ids,
            key=lambda scan_id: hashlib.sha256(f"{FOLD_SEED}|{scan_id}".encode()).hexdigest(),
        )
        for position, scan_id in enumerate(ordered):
            folds[scan_id] = fold_for(scan_id, stratum, position)

    decision_path = output_dir / "teacher-decisions.jsonl"
    subject_path = output_dir / "development-subjects.jsonl"
    status_counts: dict[str, Counter[str]] = {row: Counter() for row in ROWS}
    mask_counts: Counter[str] = Counter()
    conflicts: dict[str, list[float]] = {row: [] for row in ROWS}
    suspicious: list[dict[str, Any]] = []
    with decision_path.open("w", encoding="utf-8") as decision_handle, subject_path.open("w", encoding="utf-8") as subject_handle:
        for scan_id in sorted(development_ids):
            source = source_rows[scan_id]
            render, render_path, line_number, render_hash = canonical[scan_id]
            subject_decisions: dict[str, Any] = {}
            for row_name in ROWS:
                row = (render.get("rows") or {}).get(row_name) or {}
                tape_mm = finite(row.get("measurement_circumference_mm"))
                tape_cm = tape_mm / 10.0 if tape_mm is not None else None
                ring_cm = ring_perimeter_cm(row.get("contour_world_points_mm"))
                conflict_cm = tape_cm - ring_cm if tape_cm is not None and ring_cm is not None else None
                tape_valid = bool(row.get("tape_target_valid") is True and plausible_tape_cm(row_name, tape_cm))
                geometry_valid = bool(
                    row.get("accepted") is True
                    and row.get("certified_section") is True
                    and row.get("edge_teacher_accepted") is True
                    and row.get("depth_teacher_accepted") is True
                    and row.get("shape_teacher_accepted") is True
                    and row.get("surface_attachment_valid") is True
                    and finite(row.get("mesh_width_mm")) is not None
                    and finite(row.get("mesh_depth_mm")) is not None
                    and normalized_shape_valid(row.get("contour_points_normalized"))
                    and ring_cm is not None
                )
                reasons: list[str] = []
                repair_action = "none-required"
                if render.get("pose") != "standing_neutral" or source.get("training_pose_valid") is not True:
                    reasons.append("pose-not-approved")
                if render.get("gender") != source.get("gender"):
                    reasons.append("identity-gender-conflict")
                if not tape_valid:
                    reasons.append("tape-missing-or-implausible")
                if not geometry_valid:
                    reasons.append("geometry-incomplete-or-rejected")

                if reasons and any(reason.startswith(("pose", "identity")) for reason in reasons):
                    status = "red"
                    geometry_mask = False
                    tape_correction_mask = False
                elif tape_valid and geometry_valid and conflict_cm is not None:
                    absolute_conflict = abs(conflict_cm)
                    conflicts[row_name].append(absolute_conflict)
                    if absolute_conflict <= GREEN_MAX_ABS_CONFLICT_CM:
                        status = "green"
                        geometry_mask = True
                        tape_correction_mask = True
                    elif absolute_conflict <= RED_MIN_ABS_CONFLICT_CM:
                        status = "yellow"
                        geometry_mask = True
                        tape_correction_mask = False
                        repair_action = "keep-independent-verified-PLY-geometry; mask-unresolved-tape-correction"
                        reasons.append("tape-versus-ring-conflict-over-7cm")
                    else:
                        status = "red"
                        # A tape-versus-ring conflict does not prove that the
                        # independently certified PLY ring is bad. Preserve the
                        # real 3D line/width/depth/shape teacher, but never let
                        # the unresolved tape value teach the correction.
                        geometry_mask = True
                        tape_correction_mask = False
                        repair_action = "keep-independent-verified-PLY-geometry; quarantine-conflicting-tape-correction"
                        reasons.append("unresolved-tape-versus-ring-conflict-over-12cm")
                elif geometry_valid:
                    status = "yellow"
                    geometry_mask = True
                    tape_correction_mask = False
                    repair_action = "keep-independent-verified-PLY-geometry; tape-is-unavailable"
                else:
                    status = "red"
                    geometry_mask = False
                    tape_correction_mask = False
                    repair_action = "quarantine-target-until-source-is-repaired-or-remeasured"

                source_info = source.get("source") or {}
                decision = {
                    "schemaVersion": "wear-waist-hip-teacher-decision/v1",
                    "scanId": scan_id,
                    "subjectId": source.get("subject_id"),
                    "target": row_name,
                    "developmentRoleBeforeMerge": source.get("role"),
                    "fold": folds[scan_id],
                    "identity": {
                        "gender": source.get("gender"),
                        "region": source.get("region"),
                        "heightCm": source.get("height_cm"),
                        "weightKg": source.get("weight_kg"),
                        "bmi": source.get("bmi"),
                    },
                    "sourceProof": {
                        "sourceManifestRecordSha256": source_hashes[scan_id],
                        "renderManifest": str(render_path),
                        "renderManifestLine": line_number,
                        "renderRecordSha256": render_hash,
                        "teacherJobId": render.get("fresh_job_id"),
                        "demographics": source_object(source_info.get("demographics"), inventory),
                        "mesh": source_object(source_info.get("mesh"), inventory),
                        "landmarks": source_object(source_info.get("landmarks"), inventory),
                        "mask": render.get("s3_mask"),
                        "meshCard": render.get("s3_mesh_image"),
                    },
                    "tape": {
                        "valueCm": round(tape_cm, 6) if tape_cm is not None else None,
                        "valid": tape_valid,
                        "protocol": row.get("measurement_protocol"),
                        "targetSource": row.get("circumference_target_source"),
                    },
                    "bodyLevel": {
                        "sliceHeightMm": row.get("slice_height_mm"),
                        "heightMethod": row.get("height_method"),
                        "meshPlaneProtocol": row.get("mesh_plane_protocol"),
                        "alignmentWarning": row.get("recorded_protocol_alignment_warning"),
                    },
                    "geometry": {
                        "valid": geometry_valid,
                        "leftXNorm": row.get("left_x_norm"),
                        "rightXNorm": row.get("right_x_norm"),
                        "yNorm": row.get("y_norm"),
                        "widthCm": round(float(row["mesh_width_mm"]) / 10.0, 6) if finite(row.get("mesh_width_mm")) is not None else None,
                        "depthCm": round(float(row["mesh_depth_mm"]) / 10.0, 6) if finite(row.get("mesh_depth_mm")) is not None else None,
                        "ringCircumferenceCm": round(ring_cm, 6) if ring_cm is not None else None,
                        "closedShapePoints": len(row.get("contour_points_normalized") or []),
                        "sliceMethod": row.get("slice_method"),
                        "surfaceAttachment": row.get("surface_attachment"),
                    },
                    "conflict": {
                        "tapeMinusRingCm": round(conflict_cm, 6) if conflict_cm is not None else None,
                        "absoluteCm": round(abs(conflict_cm), 6) if conflict_cm is not None else None,
                        "rule": "green<=7cm; yellow=7..12cm; red>12cm; correction trains only on green",
                    },
                    "decision": {
                        "status": status,
                        "reasons": reasons or ["all-required-checks-passed"],
                        "repairAction": repair_action,
                        "trainingMask": {
                            "rowPosition": geometry_mask,
                            "edgesAB": geometry_mask,
                            "width": geometry_mask,
                            "depth": geometry_mask,
                            "shape32": geometry_mask,
                            "ring": geometry_mask,
                            "tapeProtocolCorrection": tape_correction_mask,
                            "finalTape": tape_correction_mask,
                        },
                    },
                }
                decision_handle.write(json.dumps(decision, sort_keys=True) + "\n")
                subject_decisions[row_name] = {
                    "status": status,
                    "geometryMask": geometry_mask,
                    "tapeCorrectionMask": tape_correction_mask,
                    "tapeCm": decision["tape"]["valueCm"],
                    "ringCm": decision["geometry"]["ringCircumferenceCm"],
                    "correctionCm": decision["conflict"]["tapeMinusRingCm"],
                }
                status_counts[row_name][status] += 1
                mask_counts[f"{row_name}.geometry"] += int(geometry_mask)
                mask_counts[f"{row_name}.tapeCorrection"] += int(tape_correction_mask)
                if status != "green":
                    suspicious.append({
                        "scanId": scan_id,
                        "target": row_name,
                        "status": status,
                        "absoluteConflictCm": decision["conflict"]["absoluteCm"],
                        "reasons": decision["decision"]["reasons"],
                    })
            subject_handle.write(json.dumps({
                "scanId": scan_id,
                "fold": folds[scan_id],
                "gender": source.get("gender"),
                "region": source.get("region"),
                "bmiBand": bmi_band(source.get("bmi")),
                "targets": subject_decisions,
            }, sort_keys=True) + "\n")

    def conflict_summary(row: str) -> dict[str, Any]:
        values = sorted(conflicts[row])
        if not values:
            return {"count": 0}
        def quantile(fraction: float) -> float:
            return values[round((len(values) - 1) * fraction)]
        return {
            "count": len(values),
            "medianAbsCm": round(statistics.median(values), 6),
            "p90AbsCm": round(quantile(0.9), 6),
            "p95AbsCm": round(quantile(0.95), 6),
            "p99AbsCm": round(quantile(0.99), 6),
            "maximumAbsCm": round(max(values), 6),
        }

    fold_counts = Counter(folds.values())
    summary = {
        "schemaVersion": "wear-waist-hip-teacher-audit/v1",
        "createdAt": now(),
        "state": "passed" if sum(sum(counts.values()) for counts in status_counts.values()) == EXPECTED_DECISIONS else "failed",
        "scope": ["waist", "hips"],
        "people": EXPECTED_DEVELOPMENT_PEOPLE,
        "possibleTeacherDecisions": EXPECTED_DECISIONS,
        "decisionsWritten": sum(sum(counts.values()) for counts in status_counts.values()),
        "statusCounts": {row: dict(status_counts[row]) for row in ROWS},
        "trainingMaskCounts": dict(mask_counts),
        "tapeRingConflict": {row: conflict_summary(row) for row in ROWS},
        "suspiciousCount": len(suspicious),
        "suspiciousCases": sorted(
            suspicious,
            key=lambda item: (item["status"] != "red", -(item["absoluteConflictCm"] or -1), item["scanId"]),
        ),
        "conflictRule": {
            "greenMaximumAbsoluteCm": GREEN_MAX_ABS_CONFLICT_CM,
            "redMinimumAbsoluteCm": RED_MIN_ABS_CONFLICT_CM,
            "yellowTrainingUse": "geometry only; tape protocol correction is masked",
            "redTrainingUse": "certified independent PLY geometry remains usable; conflicting tape correction is masked; invalid geometry remains fully masked",
        },
        "folds": {str(fold): fold_counts[fold] for fold in range(FOLD_COUNT)},
        "separation": {
            "developmentPeople": len(development_ids),
            "heldoutPeople": len(heldout_ids),
            "overlap": 0,
            "heldoutMeasurementsRead": False,
        },
        "sourceHashes": {
            "trainingIndexSha256": sha256_file(args.training_index),
            "sourceManifestSha256": sha256_file(args.source_manifest),
            "heldoutIndexSha256": sha256_file(args.heldout_index),
            "renderManifestsSha256": render_hashes,
        },
        "outputHashes": {
            "teacherDecisionsSha256": sha256_file(decision_path),
            "developmentSubjectsSha256": sha256_file(subject_path),
        },
        "sourceProofLimit": (
            "S3 object ETag and size are recorded when inventory is supplied. "
            "The previous source manifest does not contain SHA-256 hashes for each raw PLY/LND/XLS object."
        ),
        "freshInitialization": True,
        "previousWeightsUsed": False,
        "heldoutPeopleUsedForTraining": 0,
    }
    summary_path = output_dir / "teacher-audit-summary.json"
    summary_path.write_text(json.dumps(summary, indent=2, sort_keys=True) + "\n")

    split = {
        "schemaVersion": "wear-waist-hip-person-splits/v1",
        "createdAt": summary["createdAt"],
        "foldSeed": FOLD_SEED,
        "foldCount": FOLD_COUNT,
        "developmentPeople": sorted(
            ({"scanId": scan_id, "fold": folds[scan_id]} for scan_id in development_ids),
            key=lambda item: item["scanId"],
        ),
        "heldoutPeople": sorted(heldout_ids),
        "overlap": 0,
        "heldoutMeasurementsRead": False,
        "sourceHashes": summary["sourceHashes"],
    }
    split_path = output_dir / "frozen-splits.json"
    split_path.write_text(json.dumps(split, indent=2, sort_keys=True) + "\n")
    summary["outputHashes"]["frozenSplitsSha256"] = sha256_file(split_path)
    summary_path.write_text(json.dumps(summary, indent=2, sort_keys=True) + "\n")
    print(json.dumps({
        "state": summary["state"],
        "people": summary["people"],
        "decisions": summary["decisionsWritten"],
        "statusCounts": summary["statusCounts"],
        "trainingMaskCounts": summary["trainingMaskCounts"],
        "folds": summary["folds"],
        "overlap": 0,
        "outputDir": str(output_dir),
    }, indent=2, sort_keys=True))
    return 0 if summary["state"] == "passed" else 1


if __name__ == "__main__":
    raise SystemExit(main())
