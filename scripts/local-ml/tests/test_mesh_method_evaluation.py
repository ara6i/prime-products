#!/usr/bin/env python3
"""Tests for the CPU-safe 2D MHR method framework."""

from __future__ import annotations

from pathlib import Path
import sys
import unittest


REPO_ROOT = Path(__file__).resolve().parents[3]
LOCAL_ML = REPO_ROOT / "scripts/local-ml"
sys.path.insert(0, str(LOCAL_ML))

from mesh_method_registry import build_registry
import run_mesh_method_evaluation as runner
import run_prompted_mhr_topology as prompted


class MeshMethodRegistryTests(unittest.TestCase):
    def setUp(self) -> None:
        self.registry = {
            item.id: item
            for item in build_registry(REPO_ROOT, runner.PYTHON)
        }

    def test_all_approved_methods_and_rejected_rbf_are_explicit(self) -> None:
        self.assertEqual(
            set(self.registry),
            {
                "raw-meta-vith",
                "prompted-meta-vith",
                "prompted-meta-dinov3",
                "dense-constrained-mhr",
                "wear-trained-fallback",
                "legacy-meta-sapiens-rbf",
            },
        )
        self.assertEqual(self.registry["legacy-meta-sapiens-rbf"].status, "rejected")
        self.assertFalse(self.registry["legacy-meta-sapiens-rbf"].executable)

    def test_installed_vith_prompt_contract_is_limited_to_two_clicks(self) -> None:
        method = self.registry["prompted-meta-vith"]
        contract = method.exact_prompt_contract
        self.assertTrue(contract["maskPrompt"])
        self.assertEqual(contract["maximumKeypointPrompts"], 2)
        self.assertIn("RBF", method.forbidden_postprocesses)

    def test_unavailable_methods_are_blocked_not_fake_candidates(self) -> None:
        self.assertEqual(self.registry["prompted-meta-dinov3"].status, "blocked")
        self.assertEqual(self.registry["dense-constrained-mhr"].status, "blocked")
        self.assertEqual(self.registry["wear-trained-fallback"].status, "blocked")
        self.assertTrue(
            self.registry["wear-trained-fallback"].requires_fresh_gpu_approval
        )


class MeshMethodReportTests(unittest.TestCase):
    def test_audit_only_report_never_declares_passed(self) -> None:
        report = runner.build_report(
            [
                "raw-meta-vith",
                "prompted-meta-vith",
                "prompted-meta-dinov3",
                "dense-constrained-mhr",
                "wear-trained-fallback",
                "legacy-meta-sapiens-rbf",
            ],
            ["delaram"],
            execute=False,
            refresh_evidence=False,
        )
        self.assertFalse(report["safety"]["gpuUsed"])
        self.assertFalse(report["safety"]["rbfCandidateAllowed"])
        self.assertEqual(report["candidates"], [])
        self.assertNotIn("Passed", {method["status"] for method in report["methods"]})
        self.assertIn("Ready", {method["status"] for method in report["methods"]})

    def test_existing_raw_artifact_normalizes_to_validation_contract(self) -> None:
        source = runner.RAW_SOURCE_DIR / "delaram-mhr-rgb.json"
        if not source.is_file():
            self.skipTest("No existing raw Meta artifact")
        candidate = runner._normalize_raw_candidate("delaram")
        self.assertEqual(candidate["status"], "Candidate")
        self.assertTrue(candidate["isTopologyBaseline"])
        mesh_path = Path(candidate["meshPath"])
        payload = __import__("json").loads(mesh_path.read_text())
        self.assertEqual(payload["coordinateSpace"], "normalized-image-xy")
        self.assertFalse(payload["rbfUsed"])
        self.assertEqual(payload["postprocesses"], [])
        self.assertEqual(len(payload["vertices"]), payload["vertexCount"] * 2)
        self.assertEqual(len(payload["triangles"]), payload["triangleCount"] * 3)

    def test_prompted_executor_uses_official_path_and_has_no_rbf_import(self) -> None:
        source = (LOCAL_ML / "run_prompted_mhr_topology.py").read_text()
        self.assertIn("run_keypoint_prompt", source)
        self.assertIn("prepare_batch", source)
        self.assertNotIn("RBFInterpolator", source)

    def test_prompt_selection_scores_full_image_pixels_but_sends_crop_01(self) -> None:
        try:
            import numpy as np
            import torch
        except ImportError:
            self.skipTest("torch/numpy unavailable")

        class FakeModel:
            body_batch_idx = None

            @staticmethod
            def _full_to_crop(_batch, points, _batch_idx):
                # Test affine: full-image pixels -> crop [-0.5, 0.5].
                return points / 100.0 - 0.5

        target = torch.zeros((1, 70, 2), dtype=torch.float32)
        predicted = target.clone()
        target[0, 5] = torch.tensor([20.0, 30.0])
        target[0, 6] = torch.tensor([60.0, 70.0])
        predicted[0, 5] = torch.tensor([10.0, 30.0])  # 10 px error
        predicted[0, 6] = torch.tensor([35.0, 70.0])  # 25 px error
        scores = np.ones(70, dtype=np.float32)

        index, point, error_px, crop_xy = prompted._select_prompt(
            FakeModel(),
            {},
            {"mhr": {"pred_keypoints_2d": predicted}},
            target,
            scores,
            set(),
        )

        self.assertEqual(index, 6)
        self.assertAlmostEqual(error_px, 25.0)
        np.testing.assert_allclose(crop_xy, [0.6, 0.7], atol=1e-6)
        np.testing.assert_allclose(point[0, 0, :2].numpy(), [0.6, 0.7], atol=1e-6)
        self.assertEqual(int(point[0, 0, 2].item()), 6)


if __name__ == "__main__":
    unittest.main()
