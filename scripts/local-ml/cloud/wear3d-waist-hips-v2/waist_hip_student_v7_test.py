from __future__ import annotations

import unittest
import numpy as np
import torch

import train_waist_hip_v2 as trainer
from waist_hip_student import IMAGE_HEIGHT, IMAGE_WIDTH, latent_schema
from waist_hip_student_v7 import (
    AUXILIARY_TARGET_COUNT,
    GEOMETRY_TEACHER_ROWS,
    WaistHipStudentV7,
)


class WaistHipStudentV7Test(unittest.TestCase):
    def test_primary_and_auxiliary_contracts(self) -> None:
        model = WaistHipStudentV7().eval()
        silhouette = torch.rand(2, 1, IMAGE_HEIGHT, IMAGE_WIDTH)
        profile = torch.rand(2, 5)
        with torch.no_grad():
            primary = model(silhouette, profile)
            primary_with_aux, auxiliary = model.forward_with_aux(silhouette, profile)
        self.assertEqual(tuple(primary.shape), (2, len(latent_schema())))
        self.assertEqual(tuple(auxiliary.shape), (2, AUXILIARY_TARGET_COUNT))
        self.assertTrue(torch.isfinite(primary).all())
        self.assertTrue(torch.isfinite(auxiliary).all())
        torch.testing.assert_close(primary, primary_with_aux)

    def test_tape_gradient_reaches_3d_supervised_representation(self) -> None:
        model = WaistHipStudentV7().train()
        silhouette = torch.rand(2, 1, IMAGE_HEIGHT, IMAGE_WIDTH)
        profile = torch.rand(2, 5)
        _, auxiliary = model.forward_with_aux(silhouette, profile)
        auxiliary[:, :5].sum().backward()
        self.assertTrue(any(parameter.grad is not None for parameter in model.geometry_encoder.parameters()))
        self.assertTrue(any(parameter.grad is not None for parameter in model.geometry_trunk.parameters()))
        self.assertTrue(
            any(
                parameter.grad is not None
                for row in GEOMETRY_TEACHER_ROWS
                for parameter in model.auxiliary_geometry_heads[row].parameters()
            )
        )
        self.assertTrue(any(parameter.grad is not None for parameter in model.tape_encoder.parameters()))

    def test_3d_teacher_gradient_reaches_shared_representation(self) -> None:
        model = WaistHipStudentV7().train()
        silhouette = torch.rand(2, 1, IMAGE_HEIGHT, IMAGE_WIDTH)
        profile = torch.rand(2, 5)
        _, auxiliary = model.forward_with_aux(silhouette, profile)
        auxiliary[:, 5:].sum().backward()
        self.assertTrue(any(parameter.grad is not None for parameter in model.geometry_encoder.parameters()))
        self.assertTrue(any(parameter.grad is not None for parameter in model.geometry_trunk.parameters()))

    def test_teacher_audit_rejects_geometry_by_subject_only(self) -> None:
        packed = {
            "scan_ids": np.asarray(["A", "A", "B", "B"]),
            "roles": np.asarray([0, 0, 1, 1], dtype=np.int8),
            "view_ids": np.asarray(["canonical", "yaw", "canonical", "yaw"]),
        }
        failures = {
            "A": {"waist": ["raw-ply-slice-open"], "hips": []},
            "B": {"waist": ["ply-perimeter-vs-tape-failed"], "hips": ["row-missing"]},
        }
        old_rows = trainer.GEOMETRY_QUALITY_ROWS
        old_reasons = trainer.GEOMETRY_REJECTION_REASONS
        try:
            trainer.GEOMETRY_QUALITY_ROWS = ("waist", "hips")
            trainer.GEOMETRY_REJECTION_REASONS = (
                "raw-ply-slice-open",
                "row-missing",
            )
            quality, counts = trainer.geometry_quality_from_failures(packed, failures)
        finally:
            trainer.GEOMETRY_QUALITY_ROWS = old_rows
            trainer.GEOMETRY_REJECTION_REASONS = old_reasons
        self.assertEqual(quality["waist"].tolist(), [False, False, True, True])
        self.assertEqual(quality["hips"].tolist(), [True, True, False, False])
        self.assertEqual(counts["waist"]["trainSubjectsAccepted"], 0)
        self.assertEqual(counts["hips"]["validationSubjectsAccepted"], 0)


if __name__ == "__main__":
    unittest.main()
