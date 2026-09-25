#!/usr/bin/env python3
"""Tests for the named geometry-to-tape contract."""

from __future__ import annotations

import unittest

import torch

from model import CAUSES, ExplainableWaistHipModel, MAX_TAPE_CORRECTION_CM, output_schema, ring_perimeter_cm


class ExplainableModelContractTest(unittest.TestCase):
    def test_output_schema_is_named_and_stable(self) -> None:
        schema = output_schema()
        self.assertEqual(306, len(schema))
        self.assertIn("waist.ring_cm", schema)
        self.assertIn("hips.tape_correction_cm", schema)
        self.assertIn("waist.base.ring_cm", schema)
        self.assertIn("waist.issue_probability.front_to_back_depth", schema)
        self.assertIn("ratios.waist_to_hip_width", schema)
        self.assertNotIn("waist.hidden_tape", schema)

    def test_final_tape_is_only_ring_plus_visible_correction(self) -> None:
        torch.manual_seed(3)
        model = ExplainableWaistHipModel().eval()
        with torch.no_grad():
            output = model(torch.ones(2, 1, 128, 96), torch.zeros(2, 5))
        for row in ("waist", "hips"):
            self.assertTrue(torch.allclose(
                output[row]["final_tape_cm"],
                output[row]["ring_cm"] + output[row]["tape_correction_cm"],
                atol=1e-6,
                rtol=0,
            ))
            self.assertLessEqual(float(output[row]["tape_correction_cm"].abs().max()), MAX_TAPE_CORRECTION_CM)
            self.assertTrue(torch.allclose(output[row]["issue_probabilities"].sum(1), torch.ones(2), atol=1e-6))
            self.assertEqual(len(CAUSES), output[row]["issue_probabilities"].shape[1])

    def test_first_answer_and_named_refinement_are_both_visible(self) -> None:
        model = ExplainableWaistHipModel().eval()
        with torch.no_grad():
            output = model(torch.ones(1, 1, 128, 96), torch.zeros(1, 5))
        for row in ("waist", "hips"):
            self.assertIn("base", output[row])
            self.assertIn("issue_logits", output[row])
            self.assertIn("width_cm", output[row]["base"])
        self.assertIn("waist_to_hip_width", output["ratios"])

    def test_ring_is_derived_from_width_depth_and_shape(self) -> None:
        width = torch.tensor([40.0])
        depth = torch.tensor([20.0])
        shape = torch.tensor([[[-1.0, -1.0], [1.0, -1.0], [1.0, 1.0], [-1.0, 1.0]]])
        self.assertTrue(torch.allclose(ring_perimeter_cm(width, depth, shape), torch.tensor([120.0])))


if __name__ == "__main__":
    unittest.main()
