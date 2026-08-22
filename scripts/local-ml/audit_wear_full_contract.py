#!/usr/bin/env python3
"""Fail-closed preflight for the complete standing WEAR training contract.

This audit is intentionally cheap: it reads the source JSONL and the current
renderer/trainer source without rendering PLY files.  A paid CPU batch must not
start until this report says ``trainingAllowed: true`` and a separate visual
PLY canary passes.
"""

from __future__ import annotations

import argparse
import collections
import importlib.util
import json
import math
from pathlib import Path
from typing import Any


ROOT = Path(__file__).resolve().parents[2]
DEFAULT_MANIFEST = ROOT / ".local-ml/wear3d-v6-audit/source-manifest-standing-a.jsonl"
DEFAULT_RENDERER = ROOT / "scripts/local-ml/cloud/wear3d-v6/render_wear3d_multiview.py"
DEFAULT_TRAINER = ROOT / "scripts/local-ml/cloud/wear3d-v6/train_wear3d_v6.py"
DEFAULT_OUTPUT = ROOT / ".local-ml/reports/wear-full-contract-preflight.json"
def load_contract():
    source = Path(__file__).with_name("wear_full_contract.py")
    spec = importlib.util.spec_from_file_location("wear_full_contract", source)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not import WEAR contract from {source}")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


CONTRACT = load_contract()
EXPECTED_PEOPLE = CONTRACT.EXPECTED_PEOPLE

EXPECTED_RECORDED_FIELDS = {
    "acromial_height_sitting_mm", "ankle_circumference_mm",
    "arm_length_shoulder_to_elbow_mm", "arm_length_shoulder_to_wrist_mm",
    "arm_length_spine_to_wrist_mm", "armscye_circumference_mm",
    "bizygomatic_breadth_mm", "buttock_knee_length_mm",
    "chest_circumference_mm", "chest_scye_circumference_mm",
    "crotch_height_mm", "elbow_height_sitting_mm", "eye_height_sitting_mm",
    "face_length_mm", "foot_length_mm", "hand_circumference_mm",
    "hand_length_mm", "head_breadth_mm", "head_circumference_mm",
    "head_length_mm", "hip_breadth_sitting_mm", "hip_circumference_mm",
    "hip_max_height_mm", "knee_height_mm", "neck_base_circumference_mm",
    "shoulder_breadth_mm", "sitting_height_mm", "spine_to_elbow_mm",
    "spine_to_shoulder_mm", "stature_mm", "subscapular_skinfold_mm",
    "thigh_circumference_max_sitting_mm", "thigh_circumference_mm",
    "thumb_tip_reach_1_mm", "thumb_tip_reach_2_mm", "thumb_tip_reach_3_mm",
    "thumb_tip_reach_mm", "total_crotch_length_mm", "triceps_skinfold_mm",
    "underbust_circumference_mm", "vertical_trunk_circumference_mm",
    "waist_circumference_mm", "waist_front_length_mm", "waist_height_mm",
    "weight_kg",
}

EXPECTED_EXTRACTED_FIELDS = {
    "acromial_height_standing_left_mm", "acromial_height_standing_right_mm",
    "acromion_radiale_length_left_mm", "acromion_radiale_length_right_mm",
    "ankle_height_lateral_malleolus_left_mm", "ankle_height_lateral_malleolus_right_mm",
    "arm_inseam_left_mm", "arm_inseam_right_mm", "axilla_height_left_mm",
    "axilla_height_right_mm", "biacromial_breadth_mm", "bicristale_breadth_mm",
    "bigonial_breadth_mm", "bispinous_breadth_mm", "bitragion_breadth_mm",
    "bitrochanteric_breadth_mm", "bustpoint_breadth_mm", "cervicale_height_mm",
    "chest_height_standing_mm", "elbow_height_standing_left_mm",
    "elbow_height_standing_right_mm", "foot_breadth_left_mm",
    "foot_breadth_right_mm", "infraorbitale_height_standing_left_mm",
    "infraorbitale_height_standing_right_mm", "interpupillary_distance_mm",
    "interscye_distance_standing_mm", "knee_height_standing_left_mm",
    "knee_height_standing_right_mm", "malleolus_medial_left_mm",
    "malleolus_medial_right_mm", "neck_height_mm",
    "radiale_stylion_length_left_mm", "radiale_stylion_length_right_mm",
    "sellion_supramenton_length_mm", "sleeve_outseam_left_mm",
    "sleeve_outseam_right_mm", "sphyrion_height_left_mm",
    "sphyrion_height_right_mm", "suprasternale_height_mm",
    "trochanterion_height_left_mm", "trochanterion_height_right_mm",
    "waist_back_mm",
}

CANONICAL_LANDMARKS = {
    "10th Rib Midspine", "Cervicale", "Crotch", "Lt. 10th Rib", "Lt. ASIS",
    "Lt. Acromion", "Lt. Axilla, Ant", "Lt. Axilla, Post.",
    "Lt. Calcaneous, Post.", "Lt. Clavicale", "Lt. Dactylion", "Lt. Digit II",
    "Lt. Femoral Lateral Epicn", "Lt. Femoral Medial Epicn", "Lt. Gonion",
    "Lt. Humeral Lateral Epicn", "Lt. Humeral Medial Epicn", "Lt. Iliocristale",
    "Lt. Infraorbitale", "Lt. Knee Crease", "Lt. Lateral Malleolus",
    "Lt. Medial Malleolus", "Lt. Metacarpal-Phal. II",
    "Lt. Metacarpal-Phal. V", "Lt. Metatarsal-Phal. I",
    "Lt. Metatarsal-Phal. V", "Lt. Olecranon", "Lt. PSIS",
    "Lt. Radial Styloid", "Lt. Radiale", "Lt. Sphyrion",
    "Lt. Thelion/Bustpoint", "Lt. Tragion", "Lt. Trochanterion",
    "Lt. Ulnar Styloid", "Nuchale", "Rt. 10th Rib", "Rt. ASIS",
    "Rt. Acromion", "Rt. Axilla, Ant", "Rt. Axilla, Post.",
    "Rt. Calcaneous, Post.", "Rt. Clavicale", "Rt. Dactylion", "Rt. Digit II",
    "Rt. Femoral Lateral Epicn", "Rt. Femoral Medial Epicn", "Rt. Gonion",
    "Rt. Humeral Lateral Epicn", "Rt. Humeral Medial Epicn", "Rt. Iliocristale",
    "Rt. Infraorbitale", "Rt. Knee Crease", "Rt. Lateral Malleolus",
    "Rt. Medial Malleolus", "Rt. Metacarpal Phal. II",
    "Rt. Metacarpal-Phal. V", "Rt. Metatarsal-Phal. I",
    "Rt. Metatarsal-Phal. V", "Rt. Olecranon", "Rt. PSIS",
    "Rt. Radial Styloid", "Rt. Radiale", "Rt. Sphyrion",
    "Rt. Thelion/Bustpoint", "Rt. Tragion", "Rt. Trochanterion",
    "Rt. Ulnar Styloid", "Sellion", "Substernale", "Supramenton",
    "Suprasternale", "Waist, Preferred, Post.",
}

CONNECTED_CIRCUMFERENCES = set(CONTRACT.connected_standing_circumferences())

SITTING_FIELDS = {
    "acromial_height_sitting_mm", "buttock_knee_length_mm",
    "elbow_height_sitting_mm", "eye_height_sitting_mm",
    "hip_breadth_sitting_mm", "knee_height_mm", "sitting_height_mm",
    "thigh_circumference_max_sitting_mm",
}

PROFILE_FIELDS = {"stature_mm", "weight_kg"}
MALFORMED_LANDMARK = "Rt. Femoral Lateral Epicn #Rt. Femoral Medial Epicn"

# Keep the executable audit aligned with the shared renderer/trainer contract.
# The literal declarations above remain readable audit documentation, while
# these assignments make schema drift impossible at runtime.
EXPECTED_RECORDED_FIELDS = set(CONTRACT.EXPECTED_RECORDED_FIELDS)
EXPECTED_EXTRACTED_FIELDS = set(CONTRACT.EXPECTED_EXTRACTED_FIELDS)
CANONICAL_LANDMARKS = set(CONTRACT.CANONICAL_LANDMARKS)
SITTING_FIELDS = set(CONTRACT.SITTING_FIELDS)
PROFILE_FIELDS = set(CONTRACT.PROFILE_FIELDS)
MALFORMED_LANDMARK = CONTRACT.MALFORMED_LANDMARK


def valid_point(value: Any) -> bool:
    return (
        isinstance(value, list)
        and len(value) == 3
        and all(isinstance(item, (int, float)) and math.isfinite(float(item)) for item in value)
        and any(abs(float(item)) > 1e-9 for item in value)
    )


def pct(part: int, whole: int) -> float:
    return round(part / whole, 6) if whole else 0.0


def audit(manifest: Path, renderer: Path, trainer: Path) -> dict[str, Any]:
    people = 0
    genders: collections.Counter[str] = collections.Counter()
    roles: collections.Counter[str] = collections.Counter()
    recorded_counts: collections.Counter[str] = collections.Counter()
    extracted_counts: collections.Counter[str] = collections.Counter()
    recorded_per_person: collections.Counter[int] = collections.Counter()
    extracted_per_person: collections.Counter[int] = collections.Counter()
    exact_canonical_people = 0
    people_with_extras = 0
    people_missing_canonical = 0
    people_with_invalid_points = 0
    malformed_people: list[str] = []
    extra_names: collections.Counter[str] = collections.Counter()
    missing_names: collections.Counter[str] = collections.Counter()

    with manifest.open("r", encoding="utf-8") as handle:
        for line in handle:
            if not line.strip():
                continue
            record = json.loads(line)
            people += 1
            genders[str(record.get("gender") or "unknown")] += 1
            roles[str(record.get("role") or "unknown")] += 1
            recorded = record.get("measurements_mm") or {}
            extracted = record.get("extracted_standing_mm") or {}
            landmarks = record.get("landmarks_3d_mm") or {}
            recorded_counts.update(recorded)
            extracted_counts.update(extracted)
            recorded_per_person[len(recorded)] += 1
            extracted_per_person[len(extracted)] += 1
            names = set(landmarks)
            extras = names - CANONICAL_LANDMARKS
            missing = CANONICAL_LANDMARKS - names
            if not extras and not missing:
                exact_canonical_people += 1
            if extras:
                people_with_extras += 1
                extra_names.update(extras)
            if missing:
                people_missing_canonical += 1
                missing_names.update(missing)
            if any(not valid_point(value) for value in landmarks.values()):
                people_with_invalid_points += 1
            if MALFORMED_LANDMARK in landmarks:
                malformed_people.append(str(record.get("scan_id") or record.get("subject_id") or "unknown"))

    recorded_fields = set(recorded_counts)
    extracted_fields = set(extracted_counts)
    circumference_fields = {name for name in recorded_fields if "circumference" in name}
    blocked_standing_circumferences = circumference_fields - CONNECTED_CIRCUMFERENCES - SITTING_FIELDS
    excluded_sitting_circumferences = circumference_fields & SITTING_FIELDS
    renderer_source = renderer.read_text(encoding="utf-8")
    trainer_source = trainer.read_text(encoding="utf-8")
    renderer_enforces_canonical = (
        "CANONICAL_LANDMARKS" in renderer_source
        and "canonicalize_landmarks" in renderer_source
        and "missing_landmark_mask" in renderer_source
        and "LANDMARK_ALIASES" in renderer_source
    )
    trainer_has_full_contract_gate = (
        "--source-contract-report" in trainer_source
        and "--teacher-audit-report" in trainer_source
    )

    blockers: list[str] = []
    if people != EXPECTED_PEOPLE:
        blockers.append(f"source people {people} != {EXPECTED_PEOPLE}")
    missing_recorded = EXPECTED_RECORDED_FIELDS - recorded_fields
    unexpected_recorded = recorded_fields - EXPECTED_RECORDED_FIELDS
    missing_extracted = EXPECTED_EXTRACTED_FIELDS - extracted_fields
    unexpected_extracted = extracted_fields - EXPECTED_EXTRACTED_FIELDS
    if missing_recorded or unexpected_recorded:
        blockers.append("recorded 45-field schema drift")
    if missing_extracted or unexpected_extracted:
        blockers.append("extracted 43-field schema drift")
    if not renderer_enforces_canonical:
        blockers.append("renderer does not canonicalize aliases/extras and mask missing landmarks")
    if blocked_standing_circumferences:
        blockers.append("standing circumference protocols remain geometry-unmapped")
    if not trainer_has_full_contract_gate:
        blockers.append("trainer does not require the full-contract preflight")

    numeric_standing_fields = (
        recorded_fields
        - PROFILE_FIELDS
        - SITTING_FIELDS
        - circumference_fields
    ) | extracted_fields
    return {
        "schemaVersion": "wear-full-contract-preflight/v1",
        "status": "blocked" if blockers else "ready-for-visual-canary",
        "source": {
            "people": people,
            "expectedPeople": EXPECTED_PEOPLE,
            "genders": dict(sorted(genders.items())),
            "roles": dict(sorted(roles.items())),
            "recordedFieldCount": len(recorded_fields),
            "extractedFieldCount": len(extracted_fields),
            "recordedValuesPerPerson": {str(k): v for k, v in sorted(recorded_per_person.items())},
            "extractedValuesPerPerson": {str(k): v for k, v in sorted(extracted_per_person.items())},
        },
        "schema": {
            "missingRecordedFields": sorted(missing_recorded),
            "unexpectedRecordedFields": sorted(unexpected_recorded),
            "missingExtractedFields": sorted(missing_extracted),
            "unexpectedExtractedFields": sorted(unexpected_extracted),
        },
        "landmarks": {
            "canonicalFieldCount": len(CANONICAL_LANDMARKS),
            "exactCanonicalPeople": exact_canonical_people,
            "exactCanonicalRate": pct(exact_canonical_people, people),
            "peopleWithExtraNames": people_with_extras,
            "peopleMissingCanonicalNames": people_missing_canonical,
            "peopleWithInvalidCoordinates": people_with_invalid_points,
            "malformedPeople": malformed_people,
            "extraNames": dict(extra_names.most_common()),
            "missingNames": dict(missing_names.most_common()),
            "rendererEnforcesCanonical73": renderer_enforces_canonical,
            "sourceAnomaliesAreMaskedNotInvented": renderer_enforces_canonical,
        },
        "targets": {
            "recorded": len(recorded_fields),
            "extractedStanding": len(extracted_fields),
            "canonicalLandmarks": len(CANONICAL_LANDMARKS),
            "profileInputs": sorted(PROFILE_FIELDS),
            "connectedCircumferences": sorted(CONNECTED_CIRCUMFERENCES),
            "blockedStandingCircumferences": sorted(blocked_standing_circumferences),
            "excludedSittingCircumferences": sorted(excluded_sitting_circumferences),
            "excludedSittingFields": sorted(SITTING_FIELDS),
            "numericStandingTargetCount": len(numeric_standing_fields),
            "numericStandingTargets": sorted(numeric_standing_fields),
            "circumferenceProtocols": CONTRACT.CIRCUMFERENCE_PROTOCOLS,
        },
        "pipeline": {
            "rendererEnforcesCanonical73": renderer_enforces_canonical,
            "trainerRequiresFullContractPreflight": trainer_has_full_contract_gate,
            "visualCanaryRequiredAfterPreflight": True,
            "digitalOceanAllowed": False,
            "gpuTrainingAllowed": False,
        },
        "blockers": blockers,
        "trainingAllowed": False if blockers else False,
        "nextGate": (
            "fix contract blockers, then run a tiny local visual PLY canary"
            if blockers
            else "run a tiny local visual PLY canary; paid bulk work still requires explicit approval"
        ),
    }


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    parser.add_argument("--renderer", type=Path, default=DEFAULT_RENDERER)
    parser.add_argument("--trainer", type=Path, default=DEFAULT_TRAINER)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--require-ready", action="store_true")
    args = parser.parse_args()
    report = audit(args.manifest, args.renderer, args.trainer)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({
        "output": str(args.output),
        "status": report["status"],
        "people": report["source"]["people"],
        "recorded": report["targets"]["recorded"],
        "extracted": report["targets"]["extractedStanding"],
        "landmarks": report["targets"]["canonicalLandmarks"],
        "blockers": report["blockers"],
        "trainingAllowed": report["trainingAllowed"],
    }, indent=2))
    if args.require_ready and report["status"] != "ready-for-visual-canary":
        raise SystemExit(2)


if __name__ == "__main__":
    main()
