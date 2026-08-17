from __future__ import annotations

import importlib.util
from pathlib import Path
import unittest

import numpy as np


ROOT = Path(__file__).resolve().parents[3]


def load(name: str, relative: str):
    path = ROOT / relative
    spec = importlib.util.spec_from_file_location(name, path)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


ARAP = load("test_delaram_arap", "scripts/local-ml/delaram_arap_residual_fit.py")
SWEEP = load("test_delaram_crop", "scripts/local-ml/delaram_meta_crop_sweep.py")


class DelaramSpecialistTest(unittest.TestCase):
    def test_mask_box_margin_is_clamped(self):
        mask = np.zeros((20, 30), dtype=np.uint8)
        mask[2:19, 3:28] = 1
        self.assertEqual(SWEEP.mask_box(mask, 0.5), [0.0, 0.0, 29.0, 19.0])

    def test_topology_line_search_rejects_a_flip(self):
        original = np.asarray([[0.0, 0.0], [2.0, 0.0], [0.0, 2.0]])
        proposed = np.asarray([[0.0, 0.0], [-2.0, 0.0], [0.0, 2.0]])
        triangles = np.asarray([[0, 1, 2]], dtype=np.int64)
        alpha, flips = ARAP.topology_safe_alpha(original, proposed, triangles)
        self.assertLess(alpha, 0.5)
        self.assertEqual(flips, 0)
        candidate = original + alpha * (proposed - original)
        self.assertGreater(ARAP.signed_areas(candidate, triangles)[0], 0.0)

    def test_laplacian_keeps_isolated_vertex_finite(self):
        triangles = np.asarray([[0, 1, 2]], dtype=np.int64)
        matrix = ARAP.build_laplacian(4, triangles)
        self.assertEqual(matrix.shape, (4, 4))
        self.assertTrue(np.isfinite(matrix.toarray()).all())


if __name__ == "__main__":
    unittest.main()
