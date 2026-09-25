from __future__ import annotations

import unittest

import torch

import train_waist_hip_v2 as trainer
from waist_hip_student import IMAGE_HEIGHT, IMAGE_WIDTH, latent_schema
from waist_hip_student_v7 import AUXILIARY_TARGET_COUNT
from waist_hip_student_v7_2 import WaistHipStudentV72


class WaistHipStudentV72Test(unittest.TestCase):
    def test_primary_and_auxiliary_contracts(self) -> None:
        model = WaistHipStudentV72().eval()
        silhouette = torch.rand(1, 1, IMAGE_HEIGHT, IMAGE_WIDTH)
        profile = torch.rand(1, 5)
        with torch.no_grad():
            primary, auxiliary = model.forward_with_aux(silhouette, profile)
        self.assertEqual(tuple(primary.shape), (1, len(latent_schema())))
        self.assertEqual(tuple(auxiliary.shape), (1, AUXILIARY_TARGET_COUNT))
        self.assertTrue(torch.isfinite(primary).all())
        self.assertTrue(torch.isfinite(auxiliary).all())

    def test_geometry_loss_exposes_the_worst_cm_outlier(self) -> None:
        prediction = torch.tensor(
            [[0.2, -0.4], [0.0, 1.1]],
            dtype=torch.float32,
            requires_grad=True,
        )
        expected = torch.zeros_like(prediction)
        mask = torch.ones_like(prediction, dtype=torch.bool)
        mean_loss, tail_loss, maximum_loss = trainer.masked_geometry_cm_losses(
            prediction,
            expected,
            mask,
        )
        self.assertGreater(float(mean_loss.detach()), 0.0)
        self.assertAlmostEqual(float(tail_loss.detach()), 1.1, places=5)
        self.assertAlmostEqual(float(maximum_loss.detach()), 1.1, places=5)
        (mean_loss + tail_loss + maximum_loss).backward()
        self.assertGreater(float(prediction.grad[1, 1].abs()), 0.0)


if __name__ == "__main__":
    unittest.main()

