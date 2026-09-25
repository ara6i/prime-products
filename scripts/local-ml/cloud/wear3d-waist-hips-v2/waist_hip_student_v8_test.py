from __future__ import annotations

import unittest

import torch

import train_waist_hip_v2 as trainer
import train_waist_hip_v8  # noqa: F401 - installs the V8 teacher contract.
from waist_hip_student import IMAGE_HEIGHT, IMAGE_WIDTH, latent_schema
from waist_hip_student_v7 import AUXILIARY_TARGET_COUNT
from waist_hip_student_v8 import WaistHipStudentV8


class WaistHipStudentV8Test(unittest.TestCase):
    def test_model_and_fresh_teacher_contract(self) -> None:
        model = WaistHipStudentV8().eval()
        silhouette = torch.rand(1, 1, IMAGE_HEIGHT, IMAGE_WIDTH)
        profile = torch.rand(1, 5)
        with torch.no_grad():
            primary, auxiliary = model.forward_with_aux(silhouette, profile)
        self.assertEqual(tuple(primary.shape), (1, len(latent_schema())))
        self.assertEqual(tuple(auxiliary.shape), (1, AUXILIARY_TARGET_COUNT))
        self.assertTrue(torch.isfinite(primary).all())
        self.assertTrue(torch.isfinite(auxiliary).all())
        self.assertEqual(
            trainer.REQUIRED_TEACHER_AUDIT_SCHEMA,
            "wear3d-fresh-geometry-audit/v1",
        )
        self.assertEqual(trainer.REQUIRED_TEACHER_AUDIT_MODE, "source-target-masks")


if __name__ == "__main__":
    unittest.main()
