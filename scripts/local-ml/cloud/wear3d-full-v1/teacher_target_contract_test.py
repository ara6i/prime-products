from __future__ import annotations

import unittest

from teacher_target_contract import build_ratio_targets, include_measurement_target


class TeacherTargetContractTest(unittest.TestCase):
    def test_accepts_recorded_tape_when_same_row_geometry_is_certified(self) -> None:
        rows = {
            "waist": {
                "accepted": True,
                "geometry_target_valid": True,
                "shape_target_valid": True,
                "tape_target_valid": True,
                "tape_teacher_rejection_reasons": [],
            }
        }
        self.assertTrue(include_measurement_target(
            "measurements_mm", "waist_circumference_mm", rows
        ))

    def test_keeps_tape_when_geometry_is_missing_or_rejected(self) -> None:
        self.assertTrue(include_measurement_target(
            "measurements_mm", "chest_circumference_mm", {}
        ))
        self.assertTrue(include_measurement_target(
            "measurements_mm",
            "neck_base_circumference_mm",
            {"neck": {"accepted": False, "tape_target_valid": True}},
        ))

    def test_keeps_measurements_that_are_not_geometry_coupled_tape(self) -> None:
        self.assertTrue(include_measurement_target(
            "measurements_mm", "shoulder_breadth_mm", {}
        ))
        self.assertTrue(include_measurement_target(
            "extracted_standing_mm", "biacromial_breadth_mm", {}
        ))

    def test_builds_only_ratios_with_certified_width_inputs(self) -> None:
        accepted = {
            "accepted": True,
            "geometry_target_valid": True,
        }
        targets = build_ratio_targets({
            "measurements_mm": {"shoulder_breadth_mm": 400.0},
            "rows": {
                "neck": {**accepted, "mesh_width_mm": 160.0},
                "chest": {**accepted, "mesh_width_mm": 300.0},
                "underbust": {"accepted": False, "geometry_target_valid": False, "mesh_width_mm": 280.0},
                "waist": {**accepted, "mesh_width_mm": 250.0},
                "hips": {**accepted, "mesh_width_mm": 350.0},
            },
        })
        self.assertAlmostEqual(targets["ratio.shoulder_waist"], 1.6)
        self.assertAlmostEqual(targets["ratio.neck_shoulder"], 0.4)
        self.assertNotIn("ratio.underbust_waist", targets)
        self.assertNotIn("ratio.underbust_hips", targets)

    def test_partial_row_width_can_teach_ratios_without_unlocking_tape(self) -> None:
        partial_chest = {
            "accepted": False,
            "geometry_target_valid": False,
            "edge_teacher_accepted": True,
            "edge_target_valid": True,
            "shape_target_valid": False,
            "tape_target_valid": False,
            "mesh_width_mm": 320.0,
        }
        waist = {
            "accepted": True,
            "geometry_target_valid": True,
            "edge_teacher_accepted": True,
            "edge_target_valid": True,
            "shape_target_valid": True,
            "tape_target_valid": True,
            "tape_teacher_rejection_reasons": [],
            "mesh_width_mm": 256.0,
        }
        rows = {"chest": partial_chest, "waist": waist}
        targets = build_ratio_targets({"rows": rows})
        self.assertAlmostEqual(targets["ratio.chest_waist"], 1.25)
        self.assertTrue(include_measurement_target(
            "measurements_mm", "chest_circumference_mm", rows
        ))


if __name__ == "__main__":
    unittest.main()
