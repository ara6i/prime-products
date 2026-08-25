from __future__ import annotations

import importlib.util
import json
import tempfile
import unittest
from pathlib import Path

import numpy as np
import trimesh


REPO_ROOT = Path(__file__).resolve().parents[3]
MODULE_PATH = REPO_ROOT / "scripts/local-ml/build_wear_metric_line_assets.py"
SPEC = importlib.util.spec_from_file_location("wear_metric_line_assets", MODULE_PATH)
assert SPEC and SPEC.loader
METRIC = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(METRIC)


class WearMetricLineAssetsTest(unittest.TestCase):
    def test_parse_lnd_reads_named_mm_coordinates(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            path = Path(temp_dir) / "sample.lnd"
            path.write_text(
                "SUBJECT_ID = sample\n"
                " 1 0 1 24.03 14.73 18.98 576.00 Sellion\n"
                " 2 0 2 46.19 6.52 45.73 554.00 Rt. Infraorbitale\n"
            )
            result = METRIC.parse_lnd(path)
        np.testing.assert_allclose(result["Sellion"], [14.73, 18.98, 576.0])
        np.testing.assert_allclose(result["Rt. Infraorbitale"], [6.52, 45.73, 554.0])

    def test_scale_hypothesis_distinguishes_metres_and_millimetres(self) -> None:
        metres = np.asarray(
            [[0.0, 0.0, 0.0], [0.2, 0.0, 0.5], [-0.2, 0.0, 1.0], [0.0, 0.1, 1.7]],
            dtype=np.float64,
        )
        landmarks = {
            "a": metres[0] * 1000.0,
            "b": metres[1] * 1000.0,
            "c": metres[2] * 1000.0,
            "d": metres[3] * 1000.0,
        }
        metre_result = METRIC.scale_hypotheses(metres, landmarks, 170.0)
        millimetre_result = METRIC.scale_hypotheses(metres * 1000.0, landmarks, 170.0)
        self.assertEqual(metre_result["chosenRawUnit"], "metre")
        self.assertEqual(millimetre_result["chosenRawUnit"], "millimetre")
        self.assertFalse(metre_result["ambiguous"])
        self.assertFalse(millimetre_result["ambiguous"])

    def test_section_selects_central_closed_torso_not_separate_arms(self) -> None:
        torso = trimesh.creation.box(extents=[0.40, 0.25, 1.0])
        left_arm = trimesh.creation.box(extents=[0.10, 0.10, 0.8])
        right_arm = left_arm.copy()
        left_arm.apply_translation([0.38, 0.0, 0.0])
        right_arm.apply_translation([-0.38, 0.0, 0.0])
        mesh = trimesh.util.concatenate([torso, left_arm, right_arm])
        plane = METRIC.Plane(
            origin=np.zeros(3),
            normal=np.asarray([0.0, 0.0, 1.0]),
            lateral=np.asarray([1.0, 0.0, 0.0]),
            depth=np.asarray([0.0, 1.0, 0.0]),
        )
        components = METRIC.section_components(np.asarray(mesh.vertices), np.asarray(mesh.faces), plane)
        selected = METRIC.choose_torso_component(components, -0.23, 0.23)
        self.assertIsNotNone(selected)
        assert selected is not None
        self.assertTrue(selected["closed"])
        extent = np.ptp(selected["points"], axis=0)
        self.assertAlmostEqual(float(extent[0]), 0.40, places=5)
        self.assertAlmostEqual(float(extent[1]), 0.25, places=5)
        perimeter = np.linalg.norm(
            np.diff(np.vstack((selected["points"], selected["points"][0])), axis=0), axis=1
        ).sum()
        self.assertAlmostEqual(float(perimeter), 1.30, places=5)

    def test_open_torso_arcs_are_joined_without_lateral_arm_arcs(self) -> None:
        components = [
            {
                "points": np.asarray([[-0.15, -0.01], [0.0, -0.13], [0.15, -0.01]]),
                "closed": False,
            },
            {
                "points": np.asarray([[-0.14, 0.01], [0.0, 0.12], [0.14, 0.01]]),
                "closed": False,
            },
            {
                "points": np.asarray([[-0.31, -0.05], [-0.27, 0.0], [-0.30, 0.05]]),
                "closed": False,
            },
            {
                "points": np.asarray([[0.27, -0.05], [0.31, 0.0], [0.30, 0.05]]),
                "closed": False,
            },
        ]
        ring, evidence = METRIC.certified_central_torso_arc_ring(components, -0.18, 0.18)
        self.assertEqual(evidence["centralArcCount"], 2)
        self.assertTrue(evidence["certified"])
        self.assertIsNotNone(ring)
        assert ring is not None
        self.assertAlmostEqual(float(ring[:, 0].min()), -0.15, places=5)
        self.assertAlmostEqual(float(ring[:, 0].max()), 0.15, places=5)
        self.assertLess(evidence["bridgePerimeterRatio"], 0.08)

    def test_large_side_gaps_keep_observed_width_but_block_closed_shape(self) -> None:
        components = [
            {
                "points": np.asarray([[-0.15, -0.09], [0.0, -0.14], [0.15, -0.09]]),
                "closed": False,
            },
            {
                "points": np.asarray([[-0.15, 0.02], [0.0, 0.13], [0.15, 0.02]]),
                "closed": False,
            },
            {
                "points": np.asarray([[-0.31, -0.05], [-0.27, 0.0], [-0.30, 0.05]]),
                "closed": False,
            },
            {
                "points": np.asarray([[0.27, -0.05], [0.31, 0.0], [0.30, 0.05]]),
                "closed": False,
            },
        ]
        observed, evidence = METRIC.certified_central_torso_arc_ring(components, -0.18, 0.18)
        self.assertIsNotNone(observed)
        self.assertFalse(evidence["certified"])
        self.assertIn("side-seam-bridge-over-40mm", evidence["failures"])
        self.assertAlmostEqual(evidence["observedWidthMm"], 300.0, places=3)
        self.assertGreater(evidence["observedDepthMm"], 200.0)
        assert observed is not None
        self.assertAlmostEqual(float(observed[:, 0].min()), -0.15, places=5)
        self.assertAlmostEqual(float(observed[:, 0].max()), 0.15, places=5)

    def test_browser_projection_is_decimated_and_depth_free(self) -> None:
        mesh = trimesh.creation.icosphere(subdivisions=4, radius=0.5)
        vertices = np.asarray(mesh.vertices)
        vertices[:, 2] += 0.5
        projected, triangles, evidence = METRIC.browser_mesh_2d(vertices, np.asarray(mesh.faces), 500)
        self.assertGreater(len(projected), 0)
        self.assertGreater(len(triangles), 0)
        self.assertLess(abs(len(triangles) - 500), 200)
        self.assertFalse(evidence["depthUsed"])
        self.assertEqual(projected.shape[1], 2)

    def test_descriptor_is_depth_invariant_and_excludes_unsafe_segments_from_scoring(self) -> None:
        outline = np.asarray(
            [[-0.24, 0.0], [0.24, 0.0], [0.24, 1.80], [-0.24, 1.80]],
            dtype=np.float64,
        )
        landmarks = {
            "Lt. Acromion": np.asarray([0.19, 0.08, 1.48]),
            "Rt. Acromion": np.asarray([-0.19, 0.09, 1.48]),
            "Lt. Trochanterion": np.asarray([0.17, 0.04, 0.92]),
            "Rt. Trochanterion": np.asarray([-0.17, 0.05, 0.92]),
            "Lt. Humeral Lateral Epicn": np.asarray([0.30, 0.02, 1.12]),
            "Lt. Humeral Medial Epicn": np.asarray([0.28, 0.03, 1.12]),
            "Rt. Humeral Lateral Epicn": np.asarray([-0.30, 0.02, 1.12]),
            "Rt. Humeral Medial Epicn": np.asarray([-0.28, 0.03, 1.12]),
            "Lt. Radial Styloid": np.asarray([0.34, 0.01, 0.82]),
            "Lt. Ulnar Styloid": np.asarray([0.32, 0.01, 0.82]),
            "Rt. Radial Styloid": np.asarray([-0.34, 0.01, 0.82]),
            "Rt. Ulnar Styloid": np.asarray([-0.32, 0.01, 0.82]),
        }
        rows = {
            name: {
                "heightCm": height,
                "breadthCm": breadth,
                "frontProjectionCm": [[-breadth / 2.0, height], [breadth / 2.0, height]],
                "sourceQualityFlags": ["raw-central-closed-loop"],
            }
            for name, height, breadth in (
                ("chest", 135.0, 38.0),
                ("underbust", 124.0, 34.0),
                ("waist", 108.0, 32.0),
                ("hips", 92.0, 40.0),
            )
        }
        first = METRIC.build_leakage_safe_2d_descriptor(outline, landmarks, 180.0, rows)
        depth_shifted = {
            name: point + np.asarray([0.0, 1000.0 + index, 0.0])
            for index, (name, point) in enumerate(landmarks.items())
        }
        second = METRIC.build_leakage_safe_2d_descriptor(outline, depth_shifted, 180.0, rows)
        self.assertEqual(first["defaultRankingFeatureVector"], second["defaultRankingFeatureVector"])
        self.assertEqual(first["conditionalFeatureVector"], second["conditionalFeatureVector"])
        self.assertEqual(first["auditOnlyUnsafeFeatureVector"], second["auditOnlyUnsafeFeatureVector"])
        self.assertTrue(all(key.startswith("outline.fixed_height.") for key in first["defaultRankingFeatureVector"]))
        self.assertIn("section.semantic_row.waist.central_breadth", first["conditionalFeatureVector"])
        self.assertAlmostEqual(first["conditionalFeatureVector"]["section.semantic_row.waist.central_breadth"], 32.0 / 180.0)
        self.assertIn("landmark.shoulder_span.horizontal", first["conditionalFeatureVector"])
        self.assertNotIn("landmark.hip_span.horizontal", first["conditionalFeatureVector"])
        self.assertIn("landmark.hip_span.horizontal", first["auditOnlyUnsafeFeatureVector"])
        self.assertTrue(all(not key.startswith("segment.") for key in first["conditionalFeatureVector"]))
        self.assertTrue(any(key.startswith("segment.") for key in first["auditOnlyUnsafeFeatureVector"]))

    def test_one_real_scan_produces_provenance_rows_and_browser_mesh(self) -> None:
        source_dir = REPO_ROOT / ".local-ml/blender/delaram-similarity/sources"
        manifest = REPO_ROOT / ".local-ml/wear3d-v6-audit/source-manifest-standing-a.jsonl"
        if not (source_dir / "csr1591a.ply.gz").exists() or not manifest.exists():
            self.skipTest("Local WEAR proof sources are unavailable")
        profile = METRIC.load_profiles(manifest, {"NA-1591-A"})["NA-1591-A"]
        with tempfile.TemporaryDirectory() as temp_dir:
            output = Path(temp_dir)
            payload = METRIC.build_scan(
                "NA-1591-A", "csr1591a", profile, source_dir, manifest, output, 1_000
            )
            browser_path = output / payload["frontProjection"]["mesh2d"]["path"]
            browser = json.loads(browser_path.read_text())
            self.assertEqual(payload["scaleEvidence"]["chosenRawUnit"], "metre")
            self.assertTrue(payload["scaleEvidence"]["lndVsManifestAgreement"]["exactWithin0_01Mm"])
            self.assertEqual(set(payload["rows"]), set(METRIC.ROW_SPECS))
            self.assertGreater(len(payload["measurements"]), 80)
            self.assertGreater(len(browser["verticesCm"]), 0)
            self.assertGreater(len(browser["triangles"]), 0)
            self.assertFalse(browser["depthUsed"])
            self.assertTrue((output / payload["frontProjection"]["exactFullProjection"]["path"]).exists())
            audit = payload["canonicalProjectionAudit"]
            self.assertTrue(audit["frontProjectionValid"])
            self.assertAlmostEqual(audit["axisDeterminant"], -1.0, places=6)
            self.assertGreater(audit["meanAnteriorMinusPosteriorCm"], 0.0)
            self.assertFalse(audit["normalization"]["articulationNormalized"])
            descriptor = payload["leakageSafe2dDescriptor"]
            self.assertGreater(len(descriptor["defaultRankingFeatureVector"]), 0)
            self.assertIn("section.semantic_row.waist.central_breadth", descriptor["conditionalFeatureVector"])
            self.assertTrue(all(not key.startswith("segment.") for key in descriptor["conditionalFeatureVector"]))
            self.assertEqual(
                descriptor["sourceProvenance"]["localPlyGzSha256"],
                payload["provenance"]["localPlyGzSha256"],
            )

    def test_generated_nine_scan_index_obeys_leakage_and_projection_contract(self) -> None:
        output = REPO_ROOT / ".local-ml/wear-mesh-overlay/metric-lines"
        index_path = output / "index.json"
        if not index_path.exists():
            self.skipTest("Generated strict-cohort metric assets are unavailable")
        index = json.loads(index_path.read_text())
        self.assertEqual(index["schemaVersion"], 2)
        self.assertEqual(index["scanCount"], 9)
        audit_ref = index["leakageSafeDescriptorAudit"]
        self.assertFalse(audit_ref["rankingUsesDepth"])
        self.assertFalse(audit_ref["rankingUsesTapeOrCircumference"])
        self.assertFalse(audit_ref["articulationNormalized"])
        self.assertEqual(METRIC.sha256_file(output / audit_ref["path"]), audit_ref["sha256"])
        forbidden_key_fragments = ("depth", "circumference", "perimeter", "tape", "bmi", "weight")
        for entry in index["scans"]:
            scan_path = output / entry["path"]
            self.assertEqual(METRIC.sha256_file(scan_path), entry["sha256"])
            scan = json.loads(scan_path.read_text())
            self.assertTrue(scan["canonicalProjectionAudit"]["frontProjectionValid"])
            self.assertFalse(scan["canonicalProjectionAudit"]["normalization"]["articulationNormalized"])
            descriptor = scan["leakageSafe2dDescriptor"]
            scored = {
                **descriptor["defaultRankingFeatureVector"],
                **descriptor["conditionalFeatureVector"],
            }
            self.assertTrue(scored)
            self.assertTrue(
                all(not any(fragment in key.lower() for fragment in forbidden_key_fragments) for key in scored)
            )
            for row_name in ("chest", "underbust", "waist", "hips"):
                self.assertIn(f"section.semantic_row.{row_name}.central_breadth", descriptor["conditionalFeatureVector"])
            self.assertIn("landmark.shoulder_span.horizontal", descriptor["conditionalFeatureVector"])
            self.assertNotIn("landmark.hip_span.horizontal", descriptor["conditionalFeatureVector"])
            self.assertTrue(all(not key.startswith("segment.") for key in descriptor["conditionalFeatureVector"]))


if __name__ == "__main__":
    unittest.main()
