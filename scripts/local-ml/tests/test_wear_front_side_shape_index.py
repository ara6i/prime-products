import importlib.util
import json
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
SCRIPT = ROOT / "scripts/local-ml/build_wear_front_side_shape_index.py"
SPEC = importlib.util.spec_from_file_location("wear_shape_index", SCRIPT)
MODULE = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(MODULE)


class WearFrontSideShapeIndexTest(unittest.TestCase):
    def test_tape_is_separate_from_ranking_inputs(self):
        row = {
            "accepted": True,
            "mesh_width_mm": 300,
            "mesh_depth_mm": 220,
            "measurement_circumference_mm": 790,
            "contour_points_normalized": [[i / 16 - 1, i / 16 - 1] for i in range(32)],
        }
        record = {
            "view_id": "front-50",
            "scan_id": "NA-0001-A",
            "subject_id": "NA-0001",
            "gender": "female",
            "height_cm": 168,
            "weight_kg": 70.8,
            "rows": {"waist": row, "hips": row},
        }
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "source.jsonl"
            source.write_text(json.dumps(record) + "\n")
            payload = MODULE.build(source)
        self.assertEqual(payload["personCount"], 1)
        self.assertNotIn("recorded tape", payload["rankingInputs"])
        self.assertEqual(
            payload["people"][0]["rows"]["waist"]["revealedAfterRank"]["recordedTapeCm"],
            79.0,
        )


if __name__ == "__main__":
    unittest.main()
