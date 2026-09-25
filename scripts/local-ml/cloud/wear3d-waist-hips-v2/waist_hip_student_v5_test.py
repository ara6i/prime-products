from __future__ import annotations

import unittest

import torch

from waist_hip_student import IMAGE_HEIGHT, IMAGE_WIDTH, ROWS, latent_schema
from waist_hip_student_v5 import EXPLICIT_RATIO_FEATURES, WaistHipStudentV5


class WaistHipStudentV5Test(unittest.TestCase):
    def test_forward_contract_and_tape_gradient_isolation(self) -> None:
        model = WaistHipStudentV5().train()
        silhouette = torch.rand(4, 1, IMAGE_HEIGHT, IMAGE_WIDTH)
        profile = torch.rand(4, 5)
        output = model(silhouette, profile)
        self.assertEqual(tuple(output.shape), (4, len(latent_schema())))
        self.assertTrue(torch.isfinite(output).all())

        schema = latent_schema()
        tape_indices = torch.tensor([schema.index(f"{row}.tape_cm") for row in ROWS])
        output.index_select(1, tape_indices).sum().backward()
        geometry_parameters = list(model.geometry_encoder.parameters()) + list(model.geometry_trunk.parameters())
        # torch.cat may materialize an all-zero gradient for unselected output
        # slices. Isolation means no non-zero tape gradient reaches geometry.
        self.assertTrue(
            all(
                parameter.grad is None or bool(torch.count_nonzero(parameter.grad) == 0)
                for parameter in geometry_parameters
            )
        )
        self.assertTrue(any(parameter.grad is not None for parameter in model.tape_trunk.parameters()))

    def test_explicit_ratio_contract(self) -> None:
        model = WaistHipStudentV5().eval()
        features = model._explicit_ratio_features(torch.rand(3, 1, IMAGE_HEIGHT, IMAGE_WIDTH))
        self.assertEqual(tuple(features.shape), (3, EXPLICIT_RATIO_FEATURES))
        self.assertTrue(torch.isfinite(features).all())


if __name__ == "__main__":
    unittest.main()
