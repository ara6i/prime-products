#!/usr/bin/env python3

from __future__ import annotations

import unittest

import numpy as np
import torch

from waist_hip_student import (
    CAMERA_FIELDS,
    DIRECT_FIELDS,
    PCA_COMPONENTS,
    ROWS,
    DecoderArrays,
    WaistHipDecoder,
    WaistHipStudent,
    WaistHipStudentLarge,
    latent_schema,
    output_schema,
)


class WaistHipStudentContractTest(unittest.TestCase):
    def arrays(self) -> DecoderArrays:
        latent_count = len(latent_schema())
        means = np.zeros(latent_count, dtype=np.float32)
        stds = np.ones(latent_count, dtype=np.float32)
        pca_means = np.stack([
            np.asarray([
                coordinate
                for angle in np.linspace(0, 2 * np.pi, 32, endpoint=False)
                for coordinate in (np.cos(angle), np.sin(angle))
            ], dtype=np.float32)
            for _ in ROWS
        ])
        pca_bases = np.zeros((len(ROWS), PCA_COMPONENTS, 64), dtype=np.float32)
        return DecoderArrays(means, stds, pca_means, pca_bases)

    def test_contract_sizes_and_forward_shape(self) -> None:
        expected_latents = len(ROWS) * (len(DIRECT_FIELDS) + PCA_COMPONENTS) + len(CAMERA_FIELDS)
        self.assertEqual(len(latent_schema()), expected_latents)
        self.assertEqual(len(output_schema()), 150)
        model = WaistHipStudent().eval()
        large_model = WaistHipStudentLarge().eval()
        with torch.no_grad():
            output = model(torch.zeros(3, 1, 128, 96), torch.zeros(3, 5))
            large_output = large_model(torch.zeros(3, 1, 128, 96), torch.zeros(3, 5))
        self.assertEqual(tuple(output.shape), (3, expected_latents))
        self.assertEqual(tuple(large_output.shape), (3, expected_latents))
        self.assertTrue(bool(torch.isfinite(output).all()))
        self.assertTrue(bool(torch.isfinite(large_output).all()))

    def test_decoder_enforces_ring_and_scalar_consistency(self) -> None:
        decoder = WaistHipDecoder(self.arrays()).eval()
        with torch.no_grad():
            output = decoder(torch.randn(4, len(latent_schema())) * 20)
        schema = output_schema()
        index = {key: position for position, key in enumerate(schema)}
        self.assertTrue(bool(torch.isfinite(output).all()))
        for row in ROWS:
            left = output[:, index[f"row.{row}.left_x_norm"]]
            right = output[:, index[f"row.{row}.right_x_norm"]]
            self.assertTrue(bool((left < right).all()))
            width = output[:, index[f"row.{row}.width_cm"]]
            depth = output[:, index[f"row.{row}.depth_cm"]]
            ratio = output[:, index[f"row.{row}.depth_width_ratio"]]
            self.assertTrue(torch.allclose(ratio, depth / width, atol=1e-6))
            shape = torch.stack([
                output[:, index[f"row.{row}.shape.{point:02d}.{axis}"]]
                for point in range(32)
                for axis in ("x", "depth")
            ], dim=1).reshape(4, 32, 2)
            self.assertTrue(torch.allclose(shape.amin(dim=1), torch.full((4, 2), -1.0), atol=1e-5))
            self.assertTrue(torch.allclose(shape.amax(dim=1), torch.full((4, 2), 1.0), atol=1e-5))


if __name__ == "__main__":
    unittest.main()
