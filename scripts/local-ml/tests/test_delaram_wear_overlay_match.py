from __future__ import annotations

import importlib.util
import json
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[3]
MODULE_PATH = ROOT / "scripts/local-ml/delaram_wear_overlay_match.py"
SPEC = importlib.util.spec_from_file_location("delaram_wear_overlay_match", MODULE_PATH)
assert SPEC and SPEC.loader
MATCHER = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(MATCHER)


class DelaramWearOverlayUnitTests(unittest.TestCase):
    def test_polygon_scanline_keeps_separate_components(self) -> None:
        # One concave polygon shaped like two legs joined at the top.
        polygon = [
            (0.0, 0.0),
            (3.0, 0.0),
            (3.0, 3.0),
            (2.0, 3.0),
            (2.0, 1.0),
            (1.0, 1.0),
            (1.0, 3.0),
            (0.0, 3.0),
        ]
        self.assertEqual(MATCHER.polygon_intervals(polygon, 2.0), [(0.0, 1.0), (2.0, 3.0)])

    def test_piecewise_anchor_map(self) -> None:
        result = MATCHER.piecewise_map(0.3, [0.0, 0.2, 1.0], [0.0, 0.4, 1.0])
        self.assertAlmostEqual(result, 0.475)

    def test_strict_cohort_is_exactly_nine(self) -> None:
        cohort = MATCHER.load_semantic_cohort()
        self.assertEqual(set(cohort), set(MATCHER.EXPECTED_COHORT))
        self.assertEqual(len(cohort), 9)

    def test_real_glb_parser_reads_triangle_mesh(self) -> None:
        vertices, faces = MATCHER.read_glb_mesh(
            ROOT / ".local-ml/wear-mesh-overlay/models/na-0087-a.glb"
        )
        self.assertGreater(len(vertices), 10_000)
        self.assertGreater(len(faces), 17_000)
        self.assertTrue(all(len(face) == 3 for face in faces[:100]))

    def test_semantic_fallback_applies_render_aspect(self) -> None:
        profile = [[(-0.15, 0.15)] for _ in range(MATCHER.PROFILE_SAMPLES)]
        semantic = {
            "descriptor": {
                "features": {
                    **{f"row.{name}.width": 0.4 for name in MATCHER.ROW_NAMES},
                    **{f"row.{name}.y": 0.3 for name in MATCHER.ROW_NAMES},
                }
            }
        }
        rows = MATCHER.named_row_differences(
            profile,
            profile,
            semantic,
            None,
            {name: 0.3 for name in MATCHER.ROW_NAMES},
        )
        self.assertAlmostEqual(rows["waist"]["wearVisibleWidthBodyHeight"], 0.3)
        self.assertAlmostEqual(rows["waist"]["wearMinusPhotoBodyHeight"], 0.0)


class DelaramWearOverlayArtifactTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls) -> None:
        cls.path = ROOT / ".local-ml/wear-mesh-overlay/matches/index.json"
        if not cls.path.is_file():
            raise unittest.SkipTest("Run delaram_wear_overlay_match.py first")
        cls.payload = json.loads(cls.path.read_text())

    def test_artifact_is_private_candidate_only(self) -> None:
        self.assertEqual(cls_payload := self.payload["status"], "candidate-evidence-only")
        self.assertFalse(self.payload["releaseAllowed"])
        self.assertEqual(self.payload["device"], "cpu")

    def test_artifact_has_two_photos_and_nine_candidates(self) -> None:
        self.assertEqual({photo["photoId"] for photo in self.payload["photos"]}, set(MATCHER.PHOTO_IDS))
        for photo in self.payload["photos"]:
            self.assertEqual(len(photo["candidates"]), 9)
            self.assertEqual(
                {item["scanId"] for item in photo["candidates"]},
                set(MATCHER.EXPECTED_COHORT),
            )

    def test_ranking_scopes_are_explicit(self) -> None:
        scopes = self.payload["rankingScopes"]
        self.assertEqual(scopes["perPhoto"]["path"], "photos[].candidates")
        self.assertEqual(
            scopes["twoPhotoConsensus"]["path"], "consensusRanking"
        )
        self.assertTrue(
            scopes["twoPhotoConsensus"]["defaultForCrossPhotoBodySearch"]
        )

    def test_ranking_inputs_exclude_measurements(self) -> None:
        joined = " ".join(self.payload["rankingInputs"]).lower()
        for forbidden in ("circumference", "tape", "depth", "bmi"):
            self.assertNotIn(forbidden, joined)
        self.assertEqual(set(self.payload["forbiddenInputs"]), set(MATCHER.FORBIDDEN_RANKING_INPUTS))

    def test_every_match_has_regions_and_rows(self) -> None:
        for photo in self.payload["photos"]:
            for match in photo["candidates"]:
                self.assertEqual(set(match["regionalScores"]), set(MATCHER.REGIONS))
                self.assertEqual(set(match["rowDifferences"]), set(MATCHER.ROW_NAMES))
                self.assertFalse(match["topology"]["sharedVertexIds"])

    def test_all_rows_use_exact_metric_breadth_and_plane_height(self) -> None:
        self.assertEqual(
            self.payload["metricLineAssetStatus"],
            "wear-metric-lines/v1 9/9 scans",
        )
        for photo in self.payload["photos"]:
            self.assertEqual(set(photo["rowWidths"]), set(MATCHER.ROW_NAMES))
            for match in photo["candidates"]:
                for row in match["rowDifferences"].values():
                    self.assertEqual(
                        row["wearWidthSource"],
                        "wear-metric-lines/v1 exact PLY/LND A-B breadth",
                    )
                    self.assertIsNotNone(row["wearExactPlyBreadthCm"])
                    self.assertIsNotNone(row["wearPlaneHeightCm"])
                    self.assertEqual(
                        row["positionSource"],
                        "exact PLY/LND plane height normalized by exact front-projection bounds",
                    )

    def test_na1591_exact_width_regression(self) -> None:
        for photo in self.payload["photos"]:
            match = next(
                item for item in photo["candidates"] if item["scanId"] == "NA-1591-A"
            )
            self.assertAlmostEqual(
                match["rowDifferences"]["waist"]["wearExactPlyBreadthCm"],
                28.96964,
                places=5,
            )
            self.assertAlmostEqual(
                match["rowDifferences"]["hips"]["wearExactPlyBreadthCm"],
                41.16969,
                places=5,
            )


if __name__ == "__main__":
    unittest.main()
