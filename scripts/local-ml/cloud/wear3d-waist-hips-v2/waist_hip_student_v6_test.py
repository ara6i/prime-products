from __future__ import annotations

import unittest

import torch

from waist_hip_student import IMAGE_HEIGHT, IMAGE_WIDTH, ROWS, latent_schema
from waist_hip_student_v6 import (
    AUXILIARY_TARGET_COUNT,
    EXPLICIT_RATIO_FEATURES,
    PROFILE_BASIS_FEATURES,
    TEACHER_ROWS,
    WaistHipStudentV6,
)


class WaistHipStudentV6Test(unittest.TestCase):
    def test_primary_and_auxiliary_contracts(self) -> None:
        model = WaistHipStudentV6().eval()
        silhouette = torch.rand(3, 1, IMAGE_HEIGHT, IMAGE_WIDTH)
        profile = torch.rand(3, 5)
        with torch.no_grad():
            primary = model(silhouette, profile)
            primary_with_aux, auxiliary = model.forward_with_aux(silhouette, profile)
        self.assertEqual(tuple(primary.shape), (3, len(latent_schema())))
        self.assertEqual(tuple(auxiliary.shape), (3, AUXILIARY_TARGET_COUNT))
        self.assertTrue(torch.isfinite(primary).all())
        self.assertTrue(torch.isfinite(auxiliary).all())
        torch.testing.assert_close(primary, primary_with_aux)

        schema = latent_schema()
        for row in ROWS:
            primary_position = schema.index(f"{row}.tape_cm")
            auxiliary_position = TEACHER_ROWS.index(row)
            torch.testing.assert_close(
                primary[:, primary_position],
                auxiliary[:, auxiliary_position],
            )

    def test_tape_gradients_cannot_reach_3d_geometry(self) -> None:
        model = WaistHipStudentV6().train()
        silhouette = torch.rand(4, 1, IMAGE_HEIGHT, IMAGE_WIDTH)
        profile = torch.rand(4, 5)
        _, auxiliary = model.forward_with_aux(silhouette, profile)
        auxiliary[:, :len(TEACHER_ROWS)].sum().backward()
        geometry_parameters = (
            list(model.geometry_encoder.parameters())
            + list(model.geometry_trunk.parameters())
            + list(model.row_geometry_heads.parameters())
            + list(model.row_shape_heads.parameters())
        )
        self.assertTrue(
            all(
                parameter.grad is None or bool(torch.count_nonzero(parameter.grad) == 0)
                for parameter in geometry_parameters
            )
        )
        self.assertTrue(any(parameter.grad is not None for parameter in model.tape_trunk.parameters()))

    def test_engineered_feature_contracts(self) -> None:
        model = WaistHipStudentV6().eval()
        silhouette = torch.rand(2, 1, IMAGE_HEIGHT, IMAGE_WIDTH)
        profile = torch.rand(2, 5)
        ratio_features = model._explicit_ratio_features(silhouette)
        profile_basis = model._profile_basis(profile)
        self.assertEqual(tuple(ratio_features.shape), (2, EXPLICIT_RATIO_FEATURES))
        self.assertEqual(tuple(profile_basis.shape), (2, PROFILE_BASIS_FEATURES))
        self.assertTrue(torch.isfinite(ratio_features).all())
        self.assertTrue(torch.isfinite(profile_basis).all())


if __name__ == "__main__":
    unittest.main()

