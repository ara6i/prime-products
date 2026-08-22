import json
import unittest
from pathlib import Path

import numpy as np


ROOT = Path(__file__).resolve().parents[3]
OVERLAY = ROOT / ".local-ml/wear-mesh-overlay"


class WearCameraCorrectedMeshTests(unittest.TestCase):
    def test_reference_is_answer_free_and_strict(self):
        index = json.loads((OVERLAY / "camera-corrected/index.json").read_text())
        self.assertFalse(index["answerLabelsUsed"])
        self.assertEqual(index["reference"]["pairs"]["shoulder"]["scanCount"], 9)
        self.assertEqual(index["reference"]["pairs"]["hip"]["scanCount"], 9)
        self.assertLess(abs(index["frontBackgroundRollDeg"]), 3)
        self.assertLess(abs(index["sideBackgroundRollDeg"]), 3)
        self.assertLess(index["estimatedResidualYawMagnitudeDeg"], 15)

    def test_camera_transform_preserves_topology_and_is_global(self):
        for photo_id in ("delaram", "delaram-side"):
            raw = json.loads((OVERLAY / f"blender-mesh/{photo_id}.json").read_text())
            corrected = json.loads((OVERLAY / f"camera-corrected/{photo_id}.json").read_text())
            self.assertEqual(raw["triangles"], corrected["triangles"])
            self.assertEqual(len(raw["vertices"]), len(corrected["vertices"]))
            evidence = corrected["cameraCorrection"]
            self.assertFalse(evidence["localVertexWarpUsed"])
            self.assertFalse(evidence["bodyMeasurementsUsed"])
            self.assertFalse(evidence["tapeUsed"])
            self.assertFalse(evidence["circumferenceUsed"])
            self.assertFalse(evidence["depthLabelUsed"])

            source = np.asarray(raw["vertices"], dtype=np.float64).reshape(-1, 2)
            target = np.asarray(corrected["vertices"], dtype=np.float64).reshape(-1, 2)
            design = np.column_stack((source, np.ones(source.shape[0])))
            transform, *_ = np.linalg.lstsq(design, target, rcond=None)
            residual = np.max(np.abs(design @ transform - target))
            self.assertLess(residual, 2e-7)


if __name__ == "__main__":
    unittest.main()
