from __future__ import annotations

import unittest

from fresh_student_contract import profile_vector, target_groups, target_schema


class FreshStudentContractTest(unittest.TestCase):
    def test_schema_and_groups_are_stable(self) -> None:
        schema = target_schema()
        self.assertEqual(len(schema), 371)
        self.assertEqual(
            {name: len(indices) for name, indices in target_groups(schema).items()},
            {"row": 30, "shape": 320, "tape": 5, "ratio": 10, "camera": 6},
        )

    def test_profile_uses_only_allowed_photo_time_metadata(self) -> None:
        vector = profile_vector({
            "height_cm": 170,
            "weight_kg": 70,
            "bmi": 24,
            "gender": "female",
            "measurements_mm": {"waist_circumference_mm": 9999},
        })
        self.assertEqual(vector, [0.0, 0.0, 0.0, 1.0, 0.0])


if __name__ == "__main__":
    unittest.main()
