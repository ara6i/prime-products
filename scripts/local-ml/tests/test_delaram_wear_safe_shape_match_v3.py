import json
import subprocess
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
SCRIPT = ROOT / "scripts/local-ml/delaram_wear_safe_shape_match_v3.py"
INDEX = ROOT / ".local-ml/wear-mesh-overlay/matches-v3/index.json"
METRIC_DIR = ROOT / ".local-ml/wear-mesh-overlay/metric-lines"


class DelaramWearSafeShapeMatchV3Tests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        subprocess.run(["python3", str(SCRIPT)], cwd=ROOT, check=True, capture_output=True)
        cls.payload = json.loads(INDEX.read_text())

    def test_artifact_is_cpu_only_blocked_and_versioned(self) -> None:
        self.assertEqual(
            self.payload["schemaVersion"], "delaram-wear-safe-shape-match/v3"
        )
        self.assertEqual(self.payload["device"], "cpu")
        self.assertFalse(self.payload["releaseAllowed"])
        self.assertEqual(
            self.payload["status"], "rejected-no-genuine-close-match"
        )

    def test_exact_strict_cohort_is_present(self) -> None:
        self.assertEqual(self.payload["cohort"]["count"], 9)
        self.assertEqual(len(self.payload["canonicalRanking"]), 9)
        self.assertEqual(
            set(self.payload["cohort"]["scanIds"]),
            {
                "NA-0087-A",
                "NA-0252-A",
                "NA-1220-A",
                "NA-1420-A",
                "NA-1591-A",
                "NA-3013-A",
                "NL-1344-A",
                "NL-5934-A",
                "NL-6759-A",
            },
        )

    def test_query_inputs_and_forbidden_inputs_are_explicit(self) -> None:
        self.assertEqual(
            set(self.payload["queryInputs"]),
            {"frontRgbDerivedMesh", "heightCm", "weightKg", "gender"},
        )
        forbidden = set(self.payload["forbiddenRankingInputs"])
        for expected in (
            "tape",
            "circumference",
            "depth",
            "BMI",
            "saved measurement lines",
            "old semantic similarity score",
        ):
            self.assertIn(expected, forbidden)
        self.assertFalse(self.payload["oldSemanticScoreUsed"])
        self.assertFalse(self.payload["piecewiseLandmarkWarpUsed"])

    def test_only_safe_components_are_weighted(self) -> None:
        weights = self.payload["scoreDefinition"]["finalWeights"]
        self.assertEqual(
            set(weights),
            {"fixedHeightCentralOutline", "anatomicalRowBreadth", "shoulderSpan"},
        )
        self.assertAlmostEqual(sum(weights.values()), 1.0, places=12)
        self.assertFalse(self.payload["rawPointwiseOverlayUsedInRanking"])
        self.assertFalse(self.payload["unsafeLimbSegmentsUsedInRanking"])

    def test_raw_whole_mesh_evidence_is_kept_but_not_scored(self) -> None:
        result = self.payload["photos"][0]["candidates"][0]
        raw = result["diagnosticOnly"]["rawWholeMeshOverlay"]
        self.assertFalse(raw["usedInScore"])
        for key in ("fullSilhouetteIoU", "centralTorsoIoU", "lowerBodyIoU"):
            self.assertGreaterEqual(raw[key], 0.0)
            self.assertLessEqual(raw[key], 1.0)
        limbs = result["diagnosticOnly"]["landmarkAndLimbSegments"]
        self.assertFalse(limbs["usedInScore"])

    def test_waist_hips_scored_chest_underbust_diagnostic(self) -> None:
        for candidate in self.payload["photos"][0]["candidates"]:
            rows = candidate["scoreComponents"]["anatomicalRowBreadth"]["rows"]
            self.assertTrue(rows["waist"]["usedInScore"])
            self.assertTrue(rows["hips"]["usedInScore"])
            self.assertFalse(rows["chest"]["usedInScore"])
            self.assertFalse(rows["underbust"]["usedInScore"])

    def test_exact_na1591_ply_breadths_are_preserved(self) -> None:
        candidate = next(
            item
            for item in self.payload["photos"][0]["candidates"]
            if item["scanId"] == "NA-1591-A"
        )
        rows = candidate["scoreComponents"]["anatomicalRowBreadth"]["rows"]
        self.assertAlmostEqual(
            rows["waist"]["exactWearPlyAb"]["exactPlyAbBreadthCm"],
            28.96964,
            places=5,
        )
        self.assertAlmostEqual(
            rows["hips"]["exactWearPlyAb"]["exactPlyAbBreadthCm"],
            41.16969,
            places=5,
        )

    def test_score_recomputes_from_published_components(self) -> None:
        weights = self.payload["scoreDefinition"]["finalWeights"]
        for candidate in self.payload["photos"][0]["candidates"]:
            similarities = candidate["scoreComponents"]["componentSimilarities"]
            expected = 100.0 * sum(
                weights[name] * similarities[name] for name in weights
            )
            self.assertAlmostEqual(candidate["score"], expected, delta=0.01)

    def test_no_candidate_is_called_close_or_transferable(self) -> None:
        self.assertFalse(self.payload["conclusion"]["anyGenuinelyClose"])
        self.assertFalse(self.payload["conclusion"]["measurementTransferAllowed"])
        for candidate in self.payload["canonicalRanking"]:
            self.assertFalse(candidate["genuinelyClose"])
            self.assertFalse(candidate["measurementTransferAllowed"])
            self.assertTrue(candidate["closeGateFailures"]["delaram"])

    def test_canonical_order_is_deterministic(self) -> None:
        self.assertEqual(
            [item["scanId"] for item in self.payload["canonicalRanking"]],
            [
                "NL-6759-A",
                "NL-5934-A",
                "NA-1591-A",
                "NA-0252-A",
                "NL-1344-A",
                "NA-0087-A",
                "NA-1220-A",
                "NA-3013-A",
                "NA-1420-A",
            ],
        )

    def test_delaram2_is_not_used_for_canonical_ranking(self) -> None:
        self.assertEqual(self.payload["canonicalRankingPhotoIds"], ["delaram"])
        reasons = self.payload["excludedPhotos"]["delaram-2"]
        self.assertTrue(any("crop" in reason for reason in reasons))
        self.assertTrue(any("raised" in reason for reason in reasons))

    def test_metric_evidence_hashes_and_comparison_files_exist(self) -> None:
        evidence = self.payload["evidence"]["metricDescriptors"]
        for key in ("manifestPath", "auditPath"):
            self.assertTrue((ROOT / evidence[key]).exists())
        for photo in self.payload["photos"]:
            for candidate in photo["candidates"]:
                self.assertTrue((ROOT / candidate["comparisonEvidence"]).exists())


if __name__ == "__main__":
    unittest.main()
