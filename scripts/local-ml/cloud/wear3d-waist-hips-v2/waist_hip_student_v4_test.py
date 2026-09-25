from __future__ import annotations

import unittest

import torch

from waist_hip_student import IMAGE_HEIGHT, IMAGE_WIDTH, latent_schema
from waist_hip_student_v4 import WaistHipStudentV4


class WaistHipStudentV4Test(unittest.TestCase):
    def test_forward_contract_and_independent_tape_branch(self) -> None:
        model = WaistHipStudentV4().eval()
        silhouette = torch.rand(3, 1, IMAGE_HEIGHT, IMAGE_WIDTH)
        profile = torch.rand(3, 5)
        with torch.no_grad():
            output = model(silhouette, profile)
        self.assertEqual(tuple(output.shape), (3, len(latent_schema())))
        self.assertTrue(torch.isfinite(output).all())
        geometry_parameters = {id(parameter) for parameter in model.geometry_trunk.parameters()}
        tape_parameters = {id(parameter) for parameter in model.tape_trunk.parameters()}
        self.assertFalse(geometry_parameters & tape_parameters)


if __name__ == "__main__":
    unittest.main()

