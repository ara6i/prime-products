from __future__ import annotations

import importlib.util
from pathlib import Path
import unittest

import cv2
import numpy as np


ROOT = Path(__file__).resolve().parents[3]
MODULE_PATH = ROOT / "scripts/local-ml/build_visible_mask_mesh.py"
SPEC = importlib.util.spec_from_file_location("visible_mask_mesh", MODULE_PATH)
assert SPEC is not None and SPEC.loader is not None
MESH = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MESH)


class VisibleMaskMeshTest(unittest.TestCase):
    def test_mesh_triangles_stay_inside_concave_mask(self):
        mask = np.zeros((180, 120), dtype=np.uint8)
        cv2.circle(mask, (60, 25), 18, 1, -1)
        cv2.rectangle(mask, (42, 42), (78, 110), 1, -1)
        cv2.line(mask, (43, 52), (17, 105), 1, 13)
        cv2.line(mask, (77, 52), (103, 105), 1, 13)
        cv2.line(mask, (52, 108), (43, 169), 1, 15)
        cv2.line(mask, (68, 108), (77, 169), 1, 15)

        points, triangles, outline = MESH.build_mesh(mask, grid_step=9, boundary_step=5)
        centers = points[triangles].mean(axis=1)

        self.assertGreater(len(points), 100)
        self.assertGreater(len(triangles), 100)
        self.assertGreater(len(outline), 40)
        self.assertTrue(MESH.mask_contains(mask, centers).all())
        self.assertTrue(all(MESH.triangle_is_inside(mask, points[value]) for value in triangles))

    def test_largest_component_discards_noise(self):
        mask = np.zeros((50, 50), dtype=np.uint8)
        mask[8:44, 18:34] = 255
        mask[2:4, 2:4] = 255
        cleaned = MESH.largest_component(mask)
        self.assertEqual(int(cleaned[2, 2]), 0)
        self.assertEqual(int(cleaned[20, 20]), 1)


if __name__ == "__main__":
    unittest.main()
