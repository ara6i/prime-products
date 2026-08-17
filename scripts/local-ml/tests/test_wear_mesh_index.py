from __future__ import annotations

import copy
import json
import sys
import unittest
from pathlib import Path


MODULE_DIR = Path(__file__).resolve().parents[1]
if str(MODULE_DIR) not in sys.path:
    sys.path.insert(0, str(MODULE_DIR))

from wear_mesh_index import (  # noqa: E402
    FEATURE_LAYOUT,
    SearchConfig,
    build_descriptor,
    fit_robust_scaler,
    make_index_entry,
    query_from_render_record,
    rank_candidates,
    strict_cohort,
)


def point(x: float, y: float) -> dict[str, object]:
    return {"visible": True, "x": x, "y": y}


def render_record(
    scan_id: str,
    *,
    gender: str = "female",
    height: float = 168.0,
    weight: float = 70.0,
    width_shift: float = 0.0,
) -> dict[str, object]:
    cx = 0.5
    landmarks = {
        "Sellion": point(cx, 0.10),
        "Lt. Infraorbitale": point(cx - 0.025, 0.12),
        "Rt. Infraorbitale": point(cx + 0.025, 0.12),
        "Lt. Tragion": point(cx - 0.04, 0.13),
        "Rt. Tragion": point(cx + 0.04, 0.13),
        "Supramenton": point(cx, 0.15),
        "Cervicale": point(cx, 0.18),
        "Nuchale": point(cx, 0.17),
        "Lt. Gonion": point(cx - 0.03, 0.15),
        "Rt. Gonion": point(cx + 0.03, 0.15),
        "Lt. Clavicale": point(cx - 0.055, 0.20),
        "Rt. Clavicale": point(cx + 0.055, 0.20),
        "Lt. Acromion": point(cx - 0.15 - width_shift, 0.22),
        "Rt. Acromion": point(cx + 0.15 + width_shift, 0.22),
        "Lt. Axilla, Ant": point(cx - 0.12 - width_shift, 0.27),
        "Rt. Axilla, Ant": point(cx + 0.12 + width_shift, 0.27),
        "Lt. Axilla, Post.": point(cx - 0.11, 0.27),
        "Rt. Axilla, Post.": point(cx + 0.11, 0.27),
        "Lt. Thelion/Bustpoint": point(cx - 0.08, 0.30),
        "Rt. Thelion/Bustpoint": point(cx + 0.08, 0.30),
        "Lt. 10th Rib": point(cx - 0.105 - width_shift, 0.38),
        "Rt. 10th Rib": point(cx + 0.105 + width_shift, 0.38),
        "Lt. Iliocristale": point(cx - 0.13 - width_shift, 0.46),
        "Rt. Iliocristale": point(cx + 0.13 + width_shift, 0.46),
        "Lt. ASIS": point(cx - 0.12 - width_shift, 0.48),
        "Rt. ASIS": point(cx + 0.12 + width_shift, 0.48),
        "Lt. Trochanterion": point(cx - 0.16 - width_shift, 0.52),
        "Rt. Trochanterion": point(cx + 0.16 + width_shift, 0.52),
        "Lt. Femoral Lateral Epicn": point(cx - 0.10, 0.68),
        "Rt. Femoral Lateral Epicn": point(cx + 0.10, 0.68),
        "Lt. Femoral Medial Epicn": point(cx - 0.06, 0.68),
        "Rt. Femoral Medial Epicn": point(cx + 0.06, 0.68),
        "Lt. Knee Crease": point(cx - 0.08, 0.69),
        "Rt. Knee Crease": point(cx + 0.08, 0.69),
        "Lt. Lateral Malleolus": point(cx - 0.08, 0.91),
        "Rt. Lateral Malleolus": point(cx + 0.08, 0.91),
        "Lt. Medial Malleolus": point(cx - 0.055, 0.91),
        "Rt. Medial Malleolus": point(cx + 0.055, 0.91),
        "Lt. Calcaneous, Post.": point(cx - 0.07, 0.94),
        "Rt. Calcaneous, Post.": point(cx + 0.07, 0.94),
        "Lt. Digit II": point(cx - 0.07, 0.96),
        "Rt. Digit II": point(cx + 0.07, 0.96),
    }
    rows = {}
    for name, y, half_width in (
        ("neck", 0.20, 0.07),
        ("chest", 0.31, 0.14 + width_shift),
        ("underbust", 0.35, 0.12 + width_shift),
        ("waist", 0.42, 0.11 + width_shift),
        ("hips", 0.51, 0.16 + width_shift),
    ):
        rows[name] = {
            "accepted": True,
            "geometry_target_valid": True,
            "left_x_norm": cx - half_width,
            "right_x_norm": cx + half_width,
            "y_norm": y,
            # Explicit forbidden leakage values must be ignored.
            "measurement_circumference_mm": 999999.0,
            "mesh_depth_mm": 999999.0,
            "contour_points_normalized": [[999.0, 999.0]],
        }
    segments = {
        "left_sleeve": [point(0.35, 0.22), point(0.30, 0.40), point(0.25, 0.55)],
        "right_sleeve": [point(0.65, 0.22), point(0.70, 0.40), point(0.75, 0.55)],
        "left_inseam": [point(0.47, 0.53), point(0.44, 0.91)],
        "right_inseam": [point(0.53, 0.53), point(0.56, 0.91)],
        "shoulders": [point(0.35, 0.22), point(0.65, 0.22)],
    }
    return {
        "scan_id": scan_id,
        "subject_id": scan_id.rsplit("-", 1)[0],
        "role": "train",
        "view_id": "front-50",
        "gender": gender,
        "height_cm": height,
        "weight_kg": weight,
        "bmi": weight / ((height / 100.0) ** 2),
        "training_pose_valid": True,
        "landmark_targets_valid": True,
        "landmarks_2d": landmarks,
        "rows": rows,
        "segments": segments,
        "measurements_mm": {"waist": 999999.0},
        "extracted_standing_mm": {"hip": 999999.0},
    }


def index_entry(record: dict[str, object]) -> dict[str, object]:
    return make_index_entry(record, record)


class WearMeshIndexTests(unittest.TestCase):
    def test_descriptor_passes_and_has_expected_geometry(self) -> None:
        descriptor = build_descriptor(render_record("A-1"))
        self.assertTrue(descriptor["quality"]["accepted"])
        self.assertGreater(descriptor["quality"]["weighted_coverage"], 0.8)
        self.assertIn("row.waist.width", descriptor["features"])
        self.assertIn("pair.shoulders.width", descriptor["features"])

    def test_forbidden_tape_depth_and_circumference_do_not_change_descriptor(self) -> None:
        original = render_record("A-1")
        changed = copy.deepcopy(original)
        changed["measurements_mm"] = {"waist": -123456789.0}
        changed["extracted_standing_mm"] = {"hip": -987654321.0}
        for row in changed["rows"].values():
            row["measurement_circumference_mm"] = -1.0
            row["mesh_depth_mm"] = 0.00000001
            row["contour_points_normalized"] = [[-99.0, 88.0]]
        self.assertEqual(build_descriptor(original), build_descriptor(changed))

    def test_query_strips_identity_and_forbidden_targets(self) -> None:
        query = query_from_render_record(render_record("PRIVATE-SCAN"))
        serialized = json.dumps(query, sort_keys=True).lower()
        self.assertNotIn("private-scan", serialized)
        self.assertNotIn("scan_id", serialized)
        self.assertNotIn("subject_id", serialized)
        self.assertNotIn("circumference", serialized)
        self.assertNotIn("mesh_depth", serialized)

    def test_index_entry_retains_no_measurement_or_depth_values(self) -> None:
        entry = index_entry(render_record("SAFE-SCAN"))
        serialized = json.dumps(entry, sort_keys=True).lower()
        self.assertNotIn("measurements_mm", serialized)
        self.assertNotIn("extracted_standing_mm", serialized)
        self.assertNotIn("measurement_circumference", serialized)
        self.assertNotIn("mesh_depth", serialized)

    def test_strict_cohort_is_same_gender_and_inclusive_one_unit_bounds(self) -> None:
        query_record = render_record("Q-1", height=168.0, weight=70.0)
        query = query_from_render_record(query_record)
        entries = [
            index_entry(render_record("IN-1", height=167.0, weight=69.0)),
            index_entry(render_record("IN-2", height=169.0, weight=71.0)),
            index_entry(render_record("OUT-H", height=169.01, weight=70.0)),
            index_entry(render_record("OUT-W", height=168.0, weight=71.01)),
            index_entry(render_record("OUT-G", gender="male", height=168.0, weight=70.0)),
        ]
        cohort = strict_cohort(query, entries)
        self.assertEqual({entry["scan_id"] for entry in cohort}, {"IN-1", "IN-2"})

    def test_exact_shape_ranking_recovers_matching_descriptor(self) -> None:
        records = [
            render_record("MATCH-A", width_shift=0.0),
            render_record("WIDE-B", width_shift=0.035),
            render_record("NARROW-C", width_shift=-0.025),
        ]
        entries = [index_entry(record) for record in records]
        for entry in entries:
            entry["role"] = "train"
        scaler = fit_robust_scaler(entries)
        query_record = render_record("HIDDEN-QUERY", width_shift=0.0)
        query = query_from_render_record(query_record)
        result = rank_candidates(query, entries, scaler)
        self.assertEqual(result["matches"][0]["scan_id"], "MATCH-A")
        self.assertEqual(result["matches"][0]["shape_score"], 0.0)

    def test_ranking_is_unchanged_when_forbidden_values_change(self) -> None:
        first = render_record("FIRST", width_shift=0.0)
        second = render_record("SECOND", width_shift=0.03)
        entries = [index_entry(first), index_entry(second)]
        scaler = fit_robust_scaler(entries)
        query_record = render_record("QUERY", width_shift=0.01)
        before = rank_candidates(query_from_render_record(query_record), entries, scaler)
        changed = copy.deepcopy(query_record)
        changed["measurements_mm"] = {"waist": 1e30}
        for row in changed["rows"].values():
            row["mesh_depth_mm"] = -1e30
            row["measurement_circumference_mm"] = 1e30
        after = rank_candidates(query_from_render_record(changed), entries, scaler)
        self.assertEqual(before, after)

    def test_missing_required_row_fails_quality_gate(self) -> None:
        record = render_record("BAD")
        del record["rows"]["waist"]
        descriptor = build_descriptor(record)
        self.assertFalse(descriptor["quality"]["accepted"])
        self.assertIn("missing_required_rows:waist", descriptor["quality"]["issues"])

    def test_ties_are_deterministic_by_scan_id(self) -> None:
        record_a = render_record("A-SCAN")
        record_b = render_record("B-SCAN")
        entries = [index_entry(record_b), index_entry(record_a)]
        scaler = fit_robust_scaler(entries)
        query = query_from_render_record(render_record("QUERY"))
        result = rank_candidates(query, entries, scaler)
        self.assertEqual(
            [match["scan_id"] for match in result["matches"]], ["A-SCAN", "B-SCAN"]
        )

    def test_feature_layout_contains_no_forbidden_names(self) -> None:
        names = " ".join(str(spec["name"]).lower() for spec in FEATURE_LAYOUT)
        for forbidden in ("circumference", "depth", "tape", "perimeter"):
            self.assertNotIn(forbidden, names)


if __name__ == "__main__":
    unittest.main()
