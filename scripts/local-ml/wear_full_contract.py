#!/usr/bin/env python3
"""Single source of truth for the complete standing WEAR/CAESAR contract.

Recorded tape values never define a drawable line.  A circumference can enter
connected-shape training only when its protocol has independently certified PLY
geometry.  Protocols that are paths on the body surface must not be replaced by
a convenient horizontal section.
"""

from __future__ import annotations


EXPECTED_PEOPLE = 4_326

EXPECTED_RECORDED_FIELDS = frozenset({
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
})

EXPECTED_EXTRACTED_FIELDS = frozenset({
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
})

CANONICAL_LANDMARKS = frozenset({
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
})

MALFORMED_LANDMARK = "Rt. Femoral Lateral Epicn #Rt. Femoral Medial Epicn"
LANDMARK_ALIASES = {MALFORMED_LANDMARK: "Rt. Femoral Lateral Epicn"}

SITTING_FIELDS = frozenset({
    "acromial_height_sitting_mm", "buttock_knee_length_mm",
    "elbow_height_sitting_mm", "eye_height_sitting_mm",
    "hip_breadth_sitting_mm", "knee_height_mm", "sitting_height_mm",
    "thigh_circumference_max_sitting_mm",
})

PROFILE_FIELDS = frozenset({"stature_mm", "weight_kg"})


# `geometry_status` is deliberately fail-closed.  Only `implemented-certified`
# protocols may supply connected circumference supervision to the GPU.
CIRCUMFERENCE_PROTOCOLS = {
    "neck": {
        "source_key": "neck_base_circumference_mm",
        "pose": "sitting-recorded-vs-standing-mesh",
        "geometry_type": "closed-surface-chain",
        "definition": "beaded chain at the neck base crossing cervicale",
        "required_landmarks": ["Cervicale", "Rt. Clavicale", "Lt. Clavicale", "Suprasternale"],
        "geometry_status": "protocol-pose-mismatch-not-certified",
        "manual_page": 56,
        "teacher_rule": "a tilted plane is diagnostic only; certify the neck-base chain and pose equivalence before tape loss",
    },
    "chest": {
        "source_key": "chest_circumference_mm",
        "pose": "standing-arms-down-recorded-vs-A-pose-mesh",
        "geometry_type": "horizontal-torso-section",
        "definition": "horizontal chest/bust girth at nipple level",
        "required_landmarks": ["Rt. Axilla, Ant", "Lt. Axilla, Ant", "Rt. Thelion/Bustpoint", "Lt. Thelion/Bustpoint"],
        "geometry_status": "protocol-pose-mismatch-not-certified",
        "manual_page": 44,
        "teacher_rule": "PLY ring may teach row/shape, but tape loss is blocked until arms-down versus A-pose equivalence is proven",
    },
    "underbust": {
        "source_key": "underbust_circumference_mm",
        "pose": "standing-female-arms-down-recorded-vs-A-pose-mesh",
        "geometry_type": "horizontal-torso-section",
        "definition": "horizontal torso girth immediately below the bra cups",
        "required_landmarks": ["Substernale", "Rt. 10th Rib", "Lt. 10th Rib"],
        "geometry_status": "protocol-pose-and-clothing-mismatch-not-certified",
        "manual_page": 45,
        "teacher_rule": "PLY ring may teach row/shape, but tape loss is blocked until bra/clothing and pose equivalence is proven",
    },
    "waist": {
        "source_key": "waist_circumference_mm",
        "pose": "standing",
        "geometry_type": "horizontal-torso-section",
        "definition": "subject preferred natural waist",
        "required_landmarks": ["Waist, Preferred, Post.", "Rt. Iliocristale", "Lt. Iliocristale"],
        "geometry_status": "implemented-certified",
        "manual_page": 64,
        "teacher_rule": "use recorded preferred-waist height and the independently closed PLY ring; tape supervises only that same ring",
    },
    "hips": {
        "source_key": "hip_circumference_mm",
        "pose": "standing",
        "geometry_type": "horizontal-body-section",
        "definition": "maximum horizontal hip girth",
        "required_landmarks": ["Rt. Trochanterion", "Lt. Trochanterion"],
        "geometry_status": "implemented-certified",
        "manual_page": 53,
        "teacher_rule": "search the recorded maximum-hip height and use the independently closed PLY ring at that level",
    },
    "chest_scye": {
        "source_key": "chest_scye_circumference_mm",
        "pose": "standing",
        "geometry_type": "horizontal-torso-section-at-axilla",
        "definition": "horizontal chest girth at scye/axilla level",
        "required_landmarks": ["Rt. Axilla, Ant", "Rt. Axilla, Post.", "Lt. Axilla, Ant", "Lt. Axilla, Post."],
        "geometry_status": "protocol-defined-not-implemented",
        "manual_page": 46,
        "teacher_rule": "maximum horizontal upper-chest ring over shoulder blades and under arms; do not replace with an axilla landmark geodesic",
    },
    "ankle": {
        "source_key": "ankle_circumference_mm",
        "pose": "standing-right",
        "geometry_type": "horizontal-right-leg-section",
        "definition": "leg circumference through the centre of the ankle bones",
        "required_landmarks": ["Rt. Lateral Malleolus", "Rt. Medial Malleolus"],
        "geometry_status": "protocol-defined-not-implemented",
        "manual_page": 40,
        "teacher_rule": "right ankle ring must cross both malleoli",
    },
    "hand": {
        "source_key": "hand_circumference_mm",
        "pose": "right-hand-palm-down-fingers-together-thumb-away",
        "geometry_type": "local-metacarpal-section",
        "definition": "maximum girth over metacarpals of the open hand, thumb excluded",
        "required_landmarks": ["Rt. Metacarpal Phal. II", "Rt. Metacarpal-Phal. V", "Rt. Dactylion", "Rt. Radial Styloid", "Rt. Ulnar Styloid"],
        "geometry_status": "protocol-defined-not-implemented",
        "manual_page": 50,
        "teacher_rule": "ring must cross the greatest protrusion of index and little-finger knuckles in the recorded hand pose",
    },
    "head": {
        "source_key": "head_circumference_mm",
        "pose": "standing",
        "geometry_type": "maximum-horizontal-head-section",
        "definition": "maximum horizontal head girth above the ears",
        "required_landmarks": ["Rt. Tragion", "Lt. Tragion", "Nuchale", "Sellion"],
        "geometry_status": "protocol-defined-not-implemented",
        "manual_page": 52,
        "teacher_rule": "maximum approximately horizontal ring above glabella and through the rearmost skull point; recorded protocol includes hair",
    },
    "thigh": {
        "source_key": "thigh_circumference_mm",
        "pose": "standing-right",
        "geometry_type": "highest-right-thigh-section",
        "definition": "maximum right-thigh girth found by a one-centimetre vertical search",
        "required_landmarks": ["Crotch", "Rt. Trochanterion", "Rt. Knee Crease"],
        "geometry_status": "protocol-defined-not-implemented",
        "manual_page": 59,
        "teacher_rule": "search from the thigh/buttock junction downward; do not assume the crotch or gluteal-furrow row is the maximum",
    },
    "armscye": {
        "source_key": "armscye_circumference_mm",
        "pose": "standing-right",
        "geometry_type": "closed-surface-path",
        "definition": "surface path from acromion through front-break, armpit and back-break to acromion",
        "required_landmarks": ["Rt. Acromion", "Rt. Axilla, Ant", "Rt. Axilla, Post."],
        "geometry_status": "protocol-defined-not-implemented",
        "manual_page": 43,
        "teacher_rule": "train a closed 3D surface path, never a horizontal A-B/C-D ring",
    },
    "vertical_trunk": {
        "source_key": "vertical_trunk_circumference_mm",
        "pose": "standing-right",
        "geometry_type": "closed-surface-path",
        "definition": "right shoulder line down the back, between the legs, and up the front over the right breast",
        "required_landmarks": ["Rt. Acromion", "Crotch", "Rt. Thelion/Bustpoint", "Waist, Preferred, Post."],
        "geometry_status": "protocol-defined-not-implemented",
        "manual_page": 63,
        "teacher_rule": "train the defined shoulder-back-crotch-front-bust 3D surface path, never a planar 32-point ring",
    },
    "thigh_sitting": {
        "source_key": "thigh_circumference_max_sitting_mm",
        "pose": "sitting",
        "geometry_type": "sitting-right-thigh-section",
        "definition": "maximum thigh girth in the sitting capture protocol",
        "required_landmarks": [],
        "geometry_status": "excluded-from-standing-model",
    },
}


def connected_standing_circumferences() -> frozenset[str]:
    return frozenset(
        protocol["source_key"]
        for protocol in CIRCUMFERENCE_PROTOCOLS.values()
        if protocol["pose"].startswith("standing")
        and protocol["geometry_status"] == "implemented-certified"
    )


def blocked_standing_protocols() -> dict[str, dict]:
    return {
        name: protocol
        for name, protocol in CIRCUMFERENCE_PROTOCOLS.items()
        if protocol["pose"].startswith("standing")
        and protocol["geometry_status"] != "implemented-certified"
    }
