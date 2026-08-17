from __future__ import annotations

import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

import cv2
import numpy as np


SCRIPT = Path(__file__).resolve().parents[1] / "honest_mesh_validation.py"
SPEC = importlib.util.spec_from_file_location("honest_mesh_validation", SCRIPT)
assert SPEC is not None and SPEC.loader is not None
validation = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(validation)


class HonestMeshValidationTests(unittest.TestCase):
    def setUp(self) -> None:
        self.temporary = tempfile.TemporaryDirectory()
        self.root = Path(self.temporary.name)

    def tearDown(self) -> None:
        self.temporary.cleanup()

    def write_json(self, name: str, value: dict) -> Path:
        path = self.root / name
        path.write_text(json.dumps(value))
        return path

    def build_reference(self, photo_id: str) -> dict:
        mask = np.zeros((121, 101), dtype=np.uint8)
        mask[20:101, 30:71] = 255
        mask_path = self.root / f"{photo_id}-reference.png"
        cv2.imwrite(str(mask_path), mask)

        region_mask = np.zeros_like(mask)
        boundaries = np.linspace(20, 101, len(validation.REGIONS) + 1, dtype=int)
        for index, name in enumerate(validation.REGIONS):
            region_mask[boundaries[index] : boundaries[index + 1], 30:71] = validation.REGION_IDS[name]
        region_path = self.root / f"{photo_id}-regions.png"
        cv2.imwrite(str(region_path), region_mask)
        return {
            "photoId": photo_id,
            "maskPath": str(mask_path),
            "regionMaskPath": str(region_path),
            "regionLabels": validation.REGION_IDS,
            "evidenceId": f"heldout:{photo_id}",
            "keypoints": {
                "left_shoulder": [35, 35],
                "right_shoulder": [65, 35],
                "left_hip": [38, 65],
                "right_hip": [62, 65],
                "left_ankle": [40, 95],
                "right_ankle": [60, 95],
            },
            "provenance": {
                "heldOut": True,
                "createdWithoutCandidate": True,
                "hairExcluded": True,
                "backgroundExcluded": True,
                "visibleTightClothingTruth": True,
                "annotator": "independent-test-fixture",
            },
        }

    def build_mesh(self, name: str, *, x_shift: float = 0.0) -> Path:
        vertices = np.asarray(
            [[30 + x_shift, 20], [70 + x_shift, 20], [70 + x_shift, 100], [30 + x_shift, 100]],
            dtype=float,
        )
        return self.write_json(
            name,
            {
                "imageWidth": 101,
                "imageHeight": 121,
                "vertices": vertices.reshape(-1).tolist(),
                "triangles": [0, 1, 2, 0, 2, 3],
            },
        )

    def candidate(self, photo_id: str, mesh_path: Path) -> dict:
        return {
            "photoId": photo_id,
            "meshPath": str(mesh_path),
            "canonicalMeshPath": str(mesh_path),
            "coordinateSpace": "pixels",
            "fitEvidenceIds": [],
            "fitEvidenceSha256": [],
            "isTopologyBaseline": True,
            "keypoints": {
                "left_shoulder": [35, 35],
                "right_shoulder": [65, 35],
                "left_hip": [38, 65],
                "right_hip": [62, 65],
                "left_ankle": [40, 95],
                "right_ankle": [60, 95],
            },
        }

    def test_perfect_independent_two_photo_method_passes(self) -> None:
        mesh = self.build_mesh("mesh.json")
        references = [self.build_reference("one"), self.build_reference("two")]
        manifest = {
            "schemaVersion": 1,
            "references": references,
            "methods": [
                {
                    "id": "perfect",
                    "candidates": [self.candidate("one", mesh), self.candidate("two", mesh)],
                }
            ],
        }
        report = validation.build_report(manifest, self.root / "manifest.json")
        for required in ("schemaVersion", "generatedAt", "photos", "methods", "gates", "statuses"):
            self.assertIn(required, report)
        method = report["methods"][0]
        self.assertEqual(method["status"], "Passed")
        self.assertEqual(method["photos"][0]["metrics"]["silhouetteIou"], 1.0)
        self.assertTrue(method["crossPhotoCanonicalConsistency"]["passes"])
        self.assertEqual(report["statuses"]["Passed"], 1)

    def test_same_fit_mask_can_never_be_independent_proof(self) -> None:
        mesh = self.build_mesh("mesh.json")
        reference = self.build_reference("one")
        candidate = self.candidate("one", mesh)
        candidate["fitEvidenceIds"] = [reference["evidenceId"]]
        report = validation.build_report(
            {
                "schemaVersion": 1,
                "references": [reference],
                "methods": [{"id": "leaked", "candidates": [candidate]}],
            },
            self.root / "manifest.json",
        )
        photo = report["methods"][0]["photos"][0]
        self.assertFalse(photo["proofEligible"])
        self.assertEqual(report["methods"][0]["status"], "Candidate")
        self.assertTrue(
            any("reference evidence ID was used to fit this candidate" in reason for reason in photo["reasons"])
        )

    def test_same_reference_bytes_under_another_name_are_still_leakage(self) -> None:
        mesh = self.build_mesh("mesh.json")
        reference = self.build_reference("one")
        reference_path = Path(reference["maskPath"])
        candidate = self.candidate("one", mesh)
        candidate["fitEvidenceIds"] = ["renamed-input-mask"]
        candidate["fitEvidenceSha256"] = [validation.sha256_file(reference_path)]
        report = validation.build_report(
            {
                "schemaVersion": 1,
                "references": [reference],
                "methods": [{"id": "renamed-leak", "candidates": [candidate]}],
            },
            self.root / "manifest.json",
        )
        photo = report["methods"][0]["photos"][0]
        self.assertFalse(photo["proofEligible"])
        self.assertIn("reference bytes were used to fit this candidate", photo["reasons"])

    def test_polygon_reference_outline_is_ingested(self) -> None:
        outline = self.write_json(
            "outline.json",
            {
                "imageWidth": 101,
                "imageHeight": 121,
                "polygons": [[[30, 20], [70, 20], [70, 100], [30, 100]]],
            },
        )
        region_mask = np.zeros((121, 101), dtype=np.uint8)
        boundaries = np.linspace(20, 101, len(validation.REGIONS) + 1, dtype=int)
        for index, name in enumerate(validation.REGIONS):
            region_mask[boundaries[index] : boundaries[index + 1], 30:71] = validation.REGION_IDS[name]
        region_path = self.root / "outline-regions.png"
        cv2.imwrite(str(region_path), region_mask)
        loaded = validation.load_reference(
            {
                "photoId": "polygon",
                "outlinePath": str(outline),
                "regionMaskPath": str(region_path),
                "regionLabels": validation.REGION_IDS,
                "keypoints": {"left_hip": [38, 65], "right_hip": [62, 65]},
                "provenance": {
                    "heldOut": True,
                    "createdWithoutCandidate": True,
                    "hairExcluded": True,
                    "backgroundExcluded": True,
                    "visibleTightClothingTruth": True,
                },
            },
            self.root / "manifest.json",
        )
        self.assertTrue(loaded["baseProofEligible"])
        self.assertGreater(int(loaded["mask"].sum()), 3000)
        self.assertEqual(len(loaded["evidenceSha256"]), 3)

    def test_wrong_outline_is_rejected_with_valid_truth(self) -> None:
        shifted_mesh = self.build_mesh("shifted.json", x_shift=12)
        reference = self.build_reference("one")
        candidate = self.candidate("one", shifted_mesh)
        report = validation.build_report(
            {
                "schemaVersion": 1,
                "references": [reference],
                "methods": [{"id": "wrong", "candidates": [candidate]}],
            },
            self.root / "manifest.json",
        )
        method = report["methods"][0]
        self.assertEqual(method["status"], "Rejected")
        self.assertLess(method["photos"][0]["metrics"]["silhouetteIou"], 0.97)

    def test_missing_hair_exclusion_blocks_proof(self) -> None:
        mesh = self.build_mesh("mesh.json")
        reference = self.build_reference("one")
        reference["provenance"]["hairExcluded"] = False
        report = validation.build_report(
            {
                "schemaVersion": 1,
                "references": [reference],
                "methods": [{"id": "blocked", "candidates": [self.candidate("one", mesh)]}],
            },
            self.root / "manifest.json",
        )
        method = report["methods"][0]
        self.assertEqual(method["status"], "Candidate")
        self.assertIn("hair is not excluded from visible-body truth", method["photos"][0]["reasons"])

    def test_intrinsic_triangle_flip_rejects_even_with_diagnostic_outline(self) -> None:
        baseline = [[30, 20], [70, 20], [70, 100], [30, 100]]
        candidate_vertices = [[30, 20], [30, 100], [70, 100], [70, 20]]
        mesh = self.write_json(
            "flipped-mesh.json",
            {
                "imageWidth": 101,
                "imageHeight": 121,
                "vertices": np.asarray(candidate_vertices).reshape(-1).tolist(),
                "rawVertices": np.asarray(baseline).reshape(-1).tolist(),
                "triangles": [0, 1, 2, 0, 2, 3],
            },
        )
        reference = self.build_reference("one")
        reference["provenance"]["hairExcluded"] = False
        candidate = self.candidate("one", mesh)
        candidate["isTopologyBaseline"] = False
        report = validation.build_report(
            {
                "schemaVersion": 1,
                "references": [reference],
                "methods": [{"id": "intrinsic-flip", "candidates": [candidate]}],
            },
            self.root / "manifest.json",
        )
        method = report["methods"][0]
        self.assertEqual(method["status"], "Rejected")
        self.assertGreater(method["photos"][0]["topology"]["flippedTriangleCount"], 0)

    def test_unexecuted_upstream_method_remains_blocked(self) -> None:
        reference = self.build_reference("one")
        report = validation.build_report(
            {
                "schemaVersion": 1,
                "references": [reference],
                "methods": [
                    {
                        "id": "gpu-fallback",
                        "status": "Blocked",
                        "executionStatus": "not-started",
                        "blockerReasons": ["fresh GPU approval required"],
                        "candidates": [],
                    }
                ],
            },
            self.root / "manifest.json",
        )
        method = report["methods"][0]
        self.assertEqual(method["status"], "Blocked")
        self.assertEqual(method["photos"], [])
        self.assertEqual(report["statuses"]["Blocked"], 1)

    def test_triangle_flip_and_broken_topology_are_counted(self) -> None:
        baseline = np.asarray([[0.0, 0.0], [10.0, 0.0], [0.0, 10.0]])
        flipped = np.asarray([[0.0, 0.0], [0.0, 10.0], [10.0, 0.0]])
        triangles = np.asarray([[0, 1, 2], [0, 0, 1], [0, 1, 99]])
        result = validation.topology_metrics(
            flipped,
            triangles,
            trailing_triangle_values=1,
            baseline_vertices=baseline,
            is_topology_baseline=False,
        )
        self.assertEqual(result["flippedTriangleCount"], 1)
        self.assertGreaterEqual(result["brokenTopologyCount"], 3)
        self.assertEqual(result["invalidIndexTriangleCount"], 1)
        self.assertEqual(result["repeatedVertexTriangleCount"], 1)


if __name__ == "__main__":
    unittest.main()
