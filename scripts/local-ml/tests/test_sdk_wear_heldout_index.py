import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
INDEX_PATH = ROOT / ".local-ml" / "wear-sdk-heldout" / "index.json"


class SdkWearHeldoutIndexTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.index = json.loads(INDEX_PATH.read_text())

    def test_exactly_448_test_people(self):
        people = self.index["people"]
        self.assertEqual(self.index["personCount"], 448)
        self.assertEqual(self.index["expectedPersonCount"], 448)
        self.assertEqual(len(people), 448)
        self.assertTrue(all(person["role"] == "test" for person in people))
        self.assertTrue(all(person["viewId"] == "front-50" for person in people))

    def test_every_person_has_a_local_front_render(self):
        for person in self.index["people"]:
            image_path = ROOT / person["imagePath"]
            self.assertTrue(image_path.is_file(), person["scanId"])

    def test_ranking_fields_do_not_include_reveal_measurements(self):
        for person in self.index["people"]:
            self.assertIn("rows", person)
            self.assertIn("revealOnly", person)
            # The ranking payload is the profile + visible row geometry. Tape and
            # circumference live only below the explicit revealOnly boundary.
            for row in person["rows"].values():
                if row is not None:
                    self.assertNotIn("tape", row)
                    self.assertNotIn("circumference", row)

    def test_rows_keep_exact_mesh_endpoints_and_honest_height_units(self):
        for person in self.index["people"]:
            for part, row in person["rows"].items():
                if row is None:
                    continue
                self.assertGreaterEqual(row["leftXNorm"], 0, (person["scanId"], part))
                self.assertLess(row["leftXNorm"], row["rightXNorm"], (person["scanId"], part))
                self.assertLessEqual(row["rightXNorm"], 1, (person["scanId"], part))
                self.assertGreaterEqual(row["yNorm"], 0, (person["scanId"], part))
                self.assertLessEqual(row["yNorm"], 1, (person["scanId"], part))
                expected_fraction = row["heightFromFloorCm"] / person["heightCm"]
                self.assertAlmostEqual(
                    row["heightFractionFromFeet"],
                    expected_fraction,
                    places=5,
                    msg=(person["scanId"], part),
                )


if __name__ == "__main__":
    unittest.main()
