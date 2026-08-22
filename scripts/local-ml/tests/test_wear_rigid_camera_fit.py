from __future__ import annotations

import importlib.util
import json
import math
import unittest
from pathlib import Path

import numpy as np


REPO_ROOT = Path(__file__).resolve().parents[3]
SCRIPT = REPO_ROOT / "scripts/local-ml/build_wear_rigid_camera_fit.py"
REPORT = REPO_ROOT / ".local-ml/wear-mesh-overlay/rigid-camera-fit/index.json"


def load_script():
    spec = importlib.util.spec_from_file_location("wear_rigid_camera_fit", SCRIPT)
    if spec is None or spec.loader is None:
        raise RuntimeError("Could not load rigid camera fit script.")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class WearRigidCameraFitTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.module = load_script()
        cls.report = json.loads(REPORT.read_text())

    def test_similarity_fit_recovers_known_rigid_rotation(self):
        yaw = math.radians(17.0)
        rotation = np.asarray([
            [math.cos(yaw), 0.0, math.sin(yaw)],
            [0.0, 1.0, 0.0],
            [-math.sin(yaw), 0.0, math.cos(yaw)],
        ])
        source = np.asarray([
            [-1.0, -0.3, 0.0], [1.0, -0.3, 0.0],
            [-0.7, 0.2, 1.0], [0.7, 0.2, 1.0],
            [-0.5, 0.1, 2.0], [0.5, 0.1, 2.0],
        ])
        target = 1.3 * source @ rotation + np.asarray([0.2, -0.4, 1.1])
        scale, recovered, translation = self.module.similarity_fit(source, target)
        np.testing.assert_allclose(scale * source @ recovered + translation, target, atol=1e-9)
        self.assertAlmostEqual(scale, 1.3, places=8)
        np.testing.assert_allclose(recovered, rotation, atol=1e-9)

    def test_report_uses_only_rigid_camera_transform(self):
        transform = self.report["transform"]
        self.assertFalse(transform["localVertexWarpUsed"])
        self.assertFalse(transform["nonUniformStretchUsed"])
        self.assertFalse(transform["meshVerticesModified"])

    def test_report_excludes_answer_and_room_inputs(self):
        inputs = self.report["inputs"]
        for key in (
            "delaramTapeUsed", "wearTapeUsed", "circumferenceUsedForFit",
            "wallsOrDoorsUsed", "depthProUsed", "appleUsed", "gpuUsed",
        ):
            self.assertFalse(inputs[key], key)

    def test_angle_and_shape_have_separate_honest_statuses(self):
        self.assertEqual(self.report["angleValidation"]["status"], "accepted")
        self.assertEqual(self.report["shapeValidation"]["status"], "rejected")
        self.assertLessEqual(self.report["angleValidation"]["maximumReferenceYawStdDeg"], 2.0)
        self.assertLessEqual(self.report["angleValidation"]["frontSideOrthogonalityErrorDeg"], 3.0)

    def test_all_nine_references_and_four_holdouts_exist(self):
        for view in self.report["angleValidation"]["views"].values():
            self.assertEqual(len(view["references"]), 9)
            for reference in view["references"]:
                self.assertEqual(len(reference["heldOutPairs"]), 4)


if __name__ == "__main__":
    unittest.main()
