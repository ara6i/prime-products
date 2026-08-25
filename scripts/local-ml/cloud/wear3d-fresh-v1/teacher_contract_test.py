from __future__ import annotations

import unittest

from teacher_contract import extract_targets


class FreshTeacherContractTest(unittest.TestCase):
    def test_partial_chest_keeps_width_depth_and_tape_but_masks_shape(self) -> None:
        record = {
            "measurements_mm": {
                "chest_circumference_mm": 960.0,
                "underbust_circumference_mm": 800.0,
                "waist_circumference_mm": 760.0,
            },
            "rows": {
                "chest": {
                    "accepted": False,
                    "edge_teacher_accepted": True,
                    "depth_teacher_accepted": True,
                    "shape_teacher_accepted": False,
                    "mesh_width_mm": 340.0,
                    "mesh_depth_mm": 250.0,
                    "contour_points_normalized": [[0.0, 0.0]] * 32,
                }
            },
        }
        targets = extract_targets(record)
        self.assertEqual(targets["row.chest.width_cm"], 34.0)
        self.assertEqual(targets["row.chest.depth_cm"], 25.0)
        self.assertEqual(targets["tape.chest.circumference_cm"], 96.0)
        self.assertAlmostEqual(targets["ratio.tape.chest_underbust"], 1.2)
        self.assertFalse(any("row.chest.shape" in key for key in targets))

    def test_tape_only_underbust_still_teaches_numeric_ratios(self) -> None:
        targets = extract_targets({
            "measurements_mm": {
                "chest_circumference_mm": 1000.0,
                "underbust_circumference_mm": 840.0,
                "waist_circumference_mm": 800.0,
                "hip_circumference_mm": 1040.0,
            },
            "rows": {},
        })
        self.assertAlmostEqual(targets["ratio.tape.chest_underbust"], 100.0 / 84.0)
        self.assertAlmostEqual(targets["ratio.tape.underbust_waist"], 84.0 / 80.0)
        self.assertNotIn("row.underbust.width_cm", targets)

    def test_certified_shape_emits_exactly_64_coordinates(self) -> None:
        contour = [[index / 31.0, -index / 31.0] for index in range(32)]
        targets = extract_targets({
            "rows": {
                "waist": {
                    "accepted": True,
                    "edge_teacher_accepted": True,
                    "depth_teacher_accepted": True,
                    "shape_teacher_accepted": True,
                    "mesh_width_mm": 300.0,
                    "mesh_depth_mm": 240.0,
                    "contour_points_normalized": contour,
                }
            }
        })
        self.assertEqual(sum("row.waist.shape" in key for key in targets), 64)

    def test_camera_targets_are_exact_inverse_labels(self) -> None:
        targets = extract_targets({
            "camera": {
                "yaw_deg": -12.0,
                "pitch_deg": 6.0,
                "roll_deg": 3.0,
                "lens_mm": 35.0,
                "distance_scale": 1.1,
                "target_height_offset_ratio": 0.04,
            }
        })
        self.assertEqual(targets["camera.correction_yaw_deg"], 12.0)
        self.assertEqual(targets["camera.correction_pitch_deg"], -6.0)
        self.assertEqual(targets["camera.correction_roll_deg"], -3.0)
        self.assertAlmostEqual(targets["camera.input_lens_ratio_to_50mm"], 0.7)


if __name__ == "__main__":
    unittest.main()
