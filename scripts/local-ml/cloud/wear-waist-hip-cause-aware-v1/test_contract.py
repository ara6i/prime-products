#!/usr/bin/env python3

from __future__ import annotations

import unittest

import numpy as np

from case_model import GROUP_IMPORTANCE, ring_perimeter_cm
from features import extract_named_features, feature_groups, feature_schema


class CauseAwareContractTest(unittest.TestCase):
    def test_features_are_named_and_complete(self) -> None:
        self.assertEqual(len(feature_schema()), len(set(feature_schema())))
        self.assertEqual(set(GROUP_IMPORTANCE), set(feature_groups()))
        self.assertAlmostEqual(sum(GROUP_IMPORTANCE.values()), 1.0)

    def test_visible_silhouette_changes_visible_features(self) -> None:
        from PIL import Image
        import io

        first = np.zeros((128, 96), dtype=np.uint8)
        second = np.zeros((128, 96), dtype=np.uint8)
        first[10:120, 30:66] = 255
        second[10:120, 25:71] = 255
        def encoded(values: np.ndarray) -> bytes:
            buffer = io.BytesIO()
            Image.fromarray(values).save(buffer, format="PNG")
            return buffer.getvalue()
        profile = np.zeros(5, dtype=np.float32)
        a = extract_named_features(encoded(first), profile)
        b = extract_named_features(encoded(second), profile)
        self.assertFalse(np.array_equal(a, b))

    def test_ring_is_a_physical_walk_of_named_shape(self) -> None:
        shape = np.asarray(((-1, -1), (1, -1), (1, 1), (-1, 1)), dtype=np.float32)
        self.assertAlmostEqual(ring_perimeter_cm(40.0, 20.0, shape), 120.0, places=5)


if __name__ == "__main__":
    unittest.main()
