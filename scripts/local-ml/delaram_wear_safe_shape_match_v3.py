#!/usr/bin/env python3
"""Leakage-safe Delaram-to-WEAR visible-front matcher, version 3.

Version 2 proved that raw pointwise/full-silhouette comparison is confounded by
the different arm and leg articulation in the photo and WEAR A-pose.  Version 3
therefore ranks only geometry that the final descriptor audit marked safe:

* central visible-outline widths at fixed known-height fractions; and
* exact PLY front-projection A-B breadth at independently located waist/hip
  rows.

Raw whole-silhouette IoU, landmark spans, and limb segments remain in the
artifact as diagnostic-only evidence.  They never affect the ranking.  Query
time inputs are limited to the RGB-derived visible 2D mesh plus user-provided
height, weight, and gender.  No depth, tape, circumference, BMI, saved line, or
prior WEAR answer is read by the scorer.
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import math
import statistics
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Mapping, Sequence


ROOT = Path(__file__).resolve().parents[2]
V2_PATH = ROOT / "scripts/local-ml/delaram_wear_wholemesh_match_v2.py"
SPEC = importlib.util.spec_from_file_location("wear_wholemesh_match_v2", V2_PATH)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError(f"Cannot load v2 geometry helpers from {V2_PATH}")
V2 = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(V2)

METRIC_INDEX = ROOT / ".local-ml/wear-mesh-overlay/metric-lines/index.json"
METRIC_AUDIT = (
    ROOT / ".local-ml/wear-mesh-overlay/metric-lines/leakage-safe-descriptor-audit.json"
)
OUTPUT_DIR = ROOT / ".local-ml/wear-mesh-overlay/matches-v3"
PROOF_DIR = ROOT / ".local-ml/wear-mesh-proof/delaram-wear-match-v3"

SCHEMA_VERSION = "delaram-wear-safe-shape-match/v3"
DESCRIPTOR_SCHEMA = "wear-leakage-safe-front2d/v1"
PHOTO_IDS = V2.PHOTO_IDS
EXPECTED_COHORT = V2.EXPECTED_COHORT
QUERY_HEIGHT_CM = V2.QUERY_HEIGHT_CM

DEFAULT_PREFIX = "outline.fixed_height."
SCORED_ROWS = ("waist", "hips")
DIAGNOSTIC_ROWS = ("chest", "underbust")

# Both scored components are direct front-shape evidence.  Full pointwise mesh
# overlap is intentionally not weighted until WEAR articulation is normalized.
FINAL_WEIGHTS = {
    "fixedHeightCentralOutline": 0.55,
    "anatomicalRowBreadth": 0.30,
    "shoulderSpan": 0.15,
}
SIMILARITY_SCALES = {
    "fixedHeightCentralOutlineMaeBodyHeight": 0.08,
    "anatomicalRowBreadthMaeBodyHeight": 0.08,
    "shoulderSpanAbsoluteResidualBodyHeight": 0.08,
}
CLOSE_GATES = {
    "fixedHeightCentralOutlineMaeBodyHeight": ("<=", 0.020),
    "waistBreadthAbsoluteResidualBodyHeight": ("<=", 0.020),
    "hipsBreadthAbsoluteResidualBodyHeight": ("<=", 0.020),
    "shoulderSpanAbsoluteResidualBodyHeight": ("<=", 0.025),
}


def rounded(value: float, places: int = 6) -> float:
    return round(float(value), places)


def mean(values: Sequence[float]) -> float:
    if not values:
        raise ValueError("Cannot average an empty sequence")
    return sum(float(value) for value in values) / len(values)


def file_sha(path: Path) -> str:
    return V2.GEOMETRY.sha256(path)


def similarity_from_error(value: float, scale: float) -> float:
    return max(0.0, 1.0 - float(value) / float(scale))


def central_width(profile: Sequence[Sequence[tuple[float, float]]], body_y: float) -> float:
    index = min(len(profile) - 1, max(0, round(body_y * (len(profile) - 1))))
    interval = V2.GEOMETRY.central_interval(profile[index])
    if interval is None:
        raise RuntimeError(f"No central visible run at body y={body_y:.6f}")
    return float(interval[1] - interval[0])


def smoothed_central_width(
    profile: Sequence[Sequence[tuple[float, float]]], index: int, radius: int = 2
) -> float | None:
    widths: list[float] = []
    for offset in range(-radius, radius + 1):
        row_index = min(len(profile) - 1, max(0, index + offset))
        interval = V2.GEOMETRY.central_interval(profile[row_index])
        if interval is not None:
            widths.append(float(interval[1] - interval[0]))
    return statistics.median(widths) if widths else None


def locate_query_rows(query: Mapping[str, Any]) -> dict[str, dict[str, Any]]:
    """Locate semantic rows from the RGB outline/pose, never from WEAR/tape."""
    profile = query["profile"]
    shoulder_y = float(query["features"]["levels"]["shoulder"])
    hip_joint_y = float(query["features"]["levels"]["hip"])
    torso_span = hip_joint_y - shoulder_y
    if torso_span <= 0.12:
        raise RuntimeError("Invalid RGB-derived shoulder-to-hip ordering")

    def extrema(start: float, end: float, choose: str) -> tuple[float, float]:
        start_index = max(0, math.ceil(start * (len(profile) - 1)))
        end_index = min(len(profile) - 1, math.floor(end * (len(profile) - 1)))
        candidates: list[tuple[float, int]] = []
        for index in range(start_index, end_index + 1):
            width = smoothed_central_width(profile, index)
            if width is not None:
                candidates.append((width, index))
        if not candidates:
            raise RuntimeError(f"No RGB central outline in semantic band {start:.3f}-{end:.3f}")
        width, index = (min(candidates) if choose == "min" else max(candidates))
        return index / (len(profile) - 1), width

    # The waist is the narrowest central visible torso run after the arms clear
    # the torso and before the RGB hip joint.  The hip is the widest pelvis run
    # from the RGB hip joint to the upper-thigh/crotch transition.
    waist_y, waist_width = extrema(
        shoulder_y + 0.34 * torso_span,
        shoulder_y + 0.90 * torso_span,
        "min",
    )
    hips_y, hips_width = extrema(
        hip_joint_y,
        min(0.60, hip_joint_y + 0.085),
        "max",
    )

    # Chest and under-bust are deliberately approximate/diagnostic.  A single
    # front outline cannot guarantee that merged upper arms were excluded.
    chest_y = shoulder_y + 0.26 * torso_span
    underbust_y = shoulder_y + 0.43 * torso_span
    rows = {
        "waist": {
            "bodyYTopDown": waist_y,
            "widthBodyHeight": waist_width,
            "method": "minimum smoothed central RGB outline in independently defined lower-torso band",
            "usedInScore": True,
            "safety": "conditional-safe-tight-clothing-visible-outline",
        },
        "hips": {
            "bodyYTopDown": hips_y,
            "widthBodyHeight": hips_width,
            "method": "maximum smoothed central RGB outline from Sapiens hip level to upper-thigh transition",
            "usedInScore": True,
            "safety": "conditional-safe-tight-clothing-visible-outline",
        },
        "chest": {
            "bodyYTopDown": chest_y,
            "widthBodyHeight": central_width(profile, chest_y),
            "method": "heuristic RGB shoulder-to-hip fraction",
            "usedInScore": False,
            "safety": "diagnostic-unsafe",
            "notScoredReason": "upper arms can merge with the torso and the semantic plane is not independently certified",
        },
        "underbust": {
            "bodyYTopDown": underbust_y,
            "widthBodyHeight": central_width(profile, underbust_y),
            "method": "heuristic RGB shoulder-to-hip fraction",
            "usedInScore": False,
            "safety": "diagnostic-unsafe",
            "notScoredReason": "upper arms can merge with the torso and the semantic plane is not independently certified",
        },
    }
    for row in rows.values():
        row["heightFractionFromFeet"] = rounded(1.0 - float(row["bodyYTopDown"]))
        row["bodyYTopDown"] = rounded(row["bodyYTopDown"])
        row["widthBodyHeight"] = rounded(row["widthBodyHeight"])
        row["queryCmEquivalentFromKnownHeight"] = rounded(
            float(row["widthBodyHeight"]) * QUERY_HEIGHT_CM, 3
        )
    return rows


def query_default_vector(query: Mapping[str, Any], feature_ids: Sequence[str]) -> dict[str, float]:
    vector: dict[str, float] = {}
    for feature_id in feature_ids:
        if not feature_id.startswith(DEFAULT_PREFIX) or not feature_id.endswith(
            ".central_width"
        ):
            raise RuntimeError(f"Unexpected default descriptor feature: {feature_id}")
        fraction_text = feature_id[len(DEFAULT_PREFIX) : -len(".central_width")]
        height_fraction_from_feet = float(fraction_text)
        body_y = 1.0 - height_fraction_from_feet
        vector[feature_id] = rounded(central_width(query["profile"], body_y))
    return vector


def load_metric_descriptors() -> tuple[dict[str, dict[str, Any]], dict[str, Any]]:
    manifest = json.loads(METRIC_INDEX.read_text())
    audit = json.loads(METRIC_AUDIT.read_text())
    if manifest.get("schemaVersion") != 2:
        raise RuntimeError(f"Unexpected metric manifest schema: {manifest.get('schemaVersion')}")
    if audit.get("schemaVersion") != "wear-leakage-safe-front2d-audit/v1":
        raise RuntimeError(f"Unexpected descriptor audit schema: {audit.get('schemaVersion')}")
    contract = audit.get("canonicalProjectionContract", {})
    if contract.get("pointwiseOverlaySafeForRanking") is not False:
        raise RuntimeError("Descriptor audit unexpectedly authorizes raw pointwise ranking")
    result: dict[str, dict[str, Any]] = {}
    base = METRIC_INDEX.parent
    for item in manifest.get("scans", []):
        scan_id = str(item["scanId"])
        path = base / str(item["path"])
        if file_sha(path) != str(item["sha256"]):
            raise RuntimeError(f"Metric descriptor hash mismatch: {path}")
        raw = json.loads(path.read_text())
        descriptor = raw.get("leakageSafe2dDescriptor", {})
        if descriptor.get("schemaVersion") != DESCRIPTOR_SCHEMA:
            raise RuntimeError(f"Unexpected descriptor schema for {scan_id}")
        default_vector = {
            str(key): float(value)
            for key, value in descriptor.get("defaultRankingFeatureVector", {}).items()
        }
        conditional_vector = {
            str(key): float(value)
            for key, value in descriptor.get("conditionalFeatureVector", {}).items()
        }
        unsafe_vector = descriptor.get("auditOnlyUnsafeFeatureVector", {})
        if not default_vector or unsafe_vector is None:
            raise RuntimeError(f"Incomplete safe descriptor for {scan_id}")
        feature_by_id = {
            str(feature["id"]): feature for feature in descriptor.get("features", [])
        }
        shoulder_id = "landmark.shoulder_span.horizontal"
        shoulder_feature = feature_by_id.get(shoulder_id)
        if shoulder_feature is None or shoulder_id not in conditional_vector:
            raise RuntimeError(f"Missing conditional shoulder span for {scan_id}")
        rows: dict[str, dict[str, Any]] = {}
        for row_id in (*SCORED_ROWS, *DIAGNOSTIC_ROWS):
            feature_id = f"section.semantic_row.{row_id}.central_breadth"
            feature = feature_by_id.get(feature_id)
            raw_row = raw.get("rows", {}).get(row_id)
            if feature is None or raw_row is None:
                raise RuntimeError(f"Missing exact {row_id} breadth for {scan_id}")
            exact_cm = float(raw_row["breadthCm"])
            ab_cm = float(raw_row["abBreadth"]["valueCm"])
            normalized = float(conditional_vector[feature_id])
            if abs(exact_cm - ab_cm) > 1e-5:
                raise RuntimeError(f"A-B/breadth mismatch for {scan_id} {row_id}")
            if abs(normalized - exact_cm / float(raw["profile"]["heightCm"])) > 1e-6:
                raise RuntimeError(f"Normalized breadth mismatch for {scan_id} {row_id}")
            rows[row_id] = {
                "featureId": feature_id,
                "exactPlyAbBreadthCm": rounded(exact_cm, 5),
                "normalizedByWearKnownHeight": rounded(normalized, 9),
                "wearPlaneHeightCm": rounded(float(raw_row["plane"]["heightCm"]), 3),
                "frontProjectionEndpointsCm": feature.get("frontProjectionCm"),
                "qualityFlags": list(raw_row.get("qualityFlags", [])),
                "source": feature.get("source"),
                "sourceAsset": str(path.relative_to(ROOT)),
                "sourceAssetSha256": file_sha(path),
            }
        result[scan_id] = {
            "scanId": scan_id,
            "defaultVector": default_vector,
            "rows": rows,
            "shoulderSpan": {
                "featureId": shoulder_id,
                "normalizedByWearKnownHeight": rounded(
                    conditional_vector[shoulder_id], 9
                ),
                "exactWearLandmarkSpanCm": rounded(
                    float(shoulder_feature["valueCm"]), 5
                ),
                "wearDefinitions": list(shoulder_feature.get("wearDefinitions", [])),
                "queryEquivalents": list(
                    shoulder_feature.get("queryEquivalents", [])
                ),
                "sourcePointsCm": shoulder_feature.get("pointsCm"),
                "rankingStatus": shoulder_feature.get("rankingStatus"),
                "queryRequirement": shoulder_feature.get("queryRequirement"),
            },
            "descriptorEvidence": {
                "path": str(path.relative_to(ROOT)),
                "sha256": file_sha(path),
                "schemaVersion": descriptor.get("schemaVersion"),
                "coordinateSystem": descriptor.get("coordinateSystem"),
                "articulationNormalized": raw.get("canonicalProjectionAudit", {})
                .get("normalization", {})
                .get("articulationNormalized", False),
            },
        }
    if tuple(sorted(result)) != tuple(sorted(EXPECTED_COHORT)):
        raise RuntimeError(f"Metric descriptor cohort changed: {tuple(sorted(result))}")
    return result, {
        "manifestPath": str(METRIC_INDEX.relative_to(ROOT)),
        "manifestSha256": file_sha(METRIC_INDEX),
        "auditPath": str(METRIC_AUDIT.relative_to(ROOT)),
        "auditSha256": file_sha(METRIC_AUDIT),
        "auditContract": audit["rankingContract"],
    }


def vector_error(
    query: Mapping[str, float], candidate: Mapping[str, float]
) -> dict[str, Any]:
    common = sorted(set(query) & set(candidate))
    if len(common) < 5:
        raise RuntimeError(f"Too few common safe fixed-height features: {common}")
    differences = {
        feature_id: abs(float(query[feature_id]) - float(candidate[feature_id]))
        for feature_id in common
    }
    return {
        "featureCount": len(common),
        "meanAbsoluteBodyHeight": rounded(mean(list(differences.values()))),
        "rootMeanSquareBodyHeight": rounded(
            math.sqrt(mean([value * value for value in differences.values()]))
        ),
        "absoluteDifferencesBodyHeight": {
            feature_id: rounded(value) for feature_id, value in differences.items()
        },
        "queryValuesBodyHeight": {feature_id: rounded(query[feature_id]) for feature_id in common},
        "wearValuesBodyHeight": {
            feature_id: rounded(candidate[feature_id]) for feature_id in common
        },
        "queryCmEquivalentFromKnownHeight": {
            feature_id: rounded(query[feature_id] * QUERY_HEIGHT_CM, 3)
            for feature_id in common
        },
    }


def row_comparison(
    query_rows: Mapping[str, Mapping[str, Any]],
    metric: Mapping[str, Any],
) -> dict[str, Any]:
    rows: dict[str, dict[str, Any]] = {}
    scored_errors: list[float] = []
    for row_id in (*SCORED_ROWS, *DIAGNOSTIC_ROWS):
        query = query_rows[row_id]
        wear = metric["rows"][row_id]
        query_normalized = float(query["widthBodyHeight"])
        wear_normalized = float(wear["normalizedByWearKnownHeight"])
        signed_normalized = query_normalized - wear_normalized
        signed_cm = query_normalized * QUERY_HEIGHT_CM - float(wear["exactPlyAbBreadthCm"])
        used = row_id in SCORED_ROWS
        if used:
            scored_errors.append(abs(signed_normalized))
        rows[row_id] = {
            "usedInScore": used,
            "queryRow": dict(query),
            "exactWearPlyAb": wear,
            "signedResidualBodyHeight": rounded(signed_normalized),
            "absoluteResidualBodyHeight": rounded(abs(signed_normalized)),
            "signedResidualCmEquivalent": rounded(signed_cm, 3),
            "absoluteResidualCmEquivalent": rounded(abs(signed_cm), 3),
            "notScoredReason": (
                None
                if used
                else "query semantic plane/arm exclusion is not independently certified"
            ),
        }
    return {
        "scoredRows": list(SCORED_ROWS),
        "diagnosticUnsafeRows": list(DIAGNOSTIC_ROWS),
        "meanAbsoluteBodyHeight": rounded(mean(scored_errors)),
        "meanAbsoluteCmEquivalent": rounded(mean(scored_errors) * QUERY_HEIGHT_CM, 3),
        "rows": rows,
    }


def shoulder_comparison(
    query: Mapping[str, Any], metric: Mapping[str, Any]
) -> dict[str, Any]:
    left = query["point"]("left-shoulder")
    right = query["point"]("right-shoulder")
    query_span = abs(float(left[0]) - float(right[0]))
    wear = metric["shoulderSpan"]
    wear_span = float(wear["normalizedByWearKnownHeight"])
    signed = query_span - wear_span
    return {
        "usedInScore": True,
        "mapping": "Sapiens left/right shoulder endpoints to WEAR Lt./Rt. Acromion",
        "querySpanBodyHeight": rounded(query_span),
        "queryCmEquivalentFromKnownHeight": rounded(query_span * QUERY_HEIGHT_CM, 3),
        "exactWearLandmarkSpanCm": wear["exactWearLandmarkSpanCm"],
        "wearSpanNormalizedByKnownHeight": wear["normalizedByWearKnownHeight"],
        "signedResidualBodyHeight": rounded(signed),
        "absoluteResidualBodyHeight": rounded(abs(signed)),
        "signedResidualCmEquivalent": rounded(
            query_span * QUERY_HEIGHT_CM - float(wear["exactWearLandmarkSpanCm"]), 3
        ),
        "wearEvidence": wear,
        "calibrationBoundary": "conditional cross-system landmark mapping; no limb lengths or Trochanterion span are scored",
    }


def gate_failures(metrics: Mapping[str, float]) -> list[dict[str, Any]]:
    failures: list[dict[str, Any]] = []
    for name, (operation, threshold) in CLOSE_GATES.items():
        value = float(metrics[name])
        passed = value <= threshold
        if not passed:
            failures.append(
                {
                    "metric": name,
                    "value": rounded(value),
                    "required": f"{operation} {threshold}",
                }
            )
    return failures


def diagnostic_raw_overlay(query: Mapping[str, Any], wear: Mapping[str, Any]) -> dict[str, Any]:
    full_iou = V2.silhouette_iou(query["profile"], wear["profile"])
    torso_iou = V2.silhouette_iou(
        query["profile"], wear["profile"], start=0.12, end=0.52, central_only=True
    )
    lower_iou = V2.silhouette_iou(
        query["profile"], wear["profile"], start=0.52, end=0.98
    )
    boundary = V2.symmetric_boundary_distance(query["profile"], wear["profile"])
    return {
        "usedInScore": False,
        "unsafeReason": "WEAR articulation is not normalized; raw pointwise/full-silhouette overlay mixes body shape with pose",
        "fullSilhouetteIoU": rounded(full_iou),
        "centralTorsoIoU": rounded(torso_iou),
        "lowerBodyIoU": rounded(lower_iou),
        "boundaryMeanBodyHeight": boundary["meanBodyHeight"],
        "boundaryP95BodyHeight": boundary["p95BodyHeight"],
    }


def compare(
    query: Mapping[str, Any],
    wear: Mapping[str, Any],
    metric: Mapping[str, Any],
    all_default_feature_ids: Sequence[str],
) -> dict[str, Any]:
    query_vector = query_default_vector(query, all_default_feature_ids)
    outline = vector_error(query_vector, metric["defaultVector"])
    rows = row_comparison(query["semanticRows"], metric)
    shoulder = shoulder_comparison(query, metric)
    outline_similarity = similarity_from_error(
        outline["meanAbsoluteBodyHeight"],
        SIMILARITY_SCALES["fixedHeightCentralOutlineMaeBodyHeight"],
    )
    row_similarity = similarity_from_error(
        rows["meanAbsoluteBodyHeight"],
        SIMILARITY_SCALES["anatomicalRowBreadthMaeBodyHeight"],
    )
    shoulder_similarity = similarity_from_error(
        shoulder["absoluteResidualBodyHeight"],
        SIMILARITY_SCALES["shoulderSpanAbsoluteResidualBodyHeight"],
    )
    final_similarity = (
        FINAL_WEIGHTS["fixedHeightCentralOutline"] * outline_similarity
        + FINAL_WEIGHTS["anatomicalRowBreadth"] * row_similarity
        + FINAL_WEIGHTS["shoulderSpan"] * shoulder_similarity
    )
    gate_metrics = {
        "fixedHeightCentralOutlineMaeBodyHeight": outline["meanAbsoluteBodyHeight"],
        "waistBreadthAbsoluteResidualBodyHeight": rows["rows"]["waist"][
            "absoluteResidualBodyHeight"
        ],
        "hipsBreadthAbsoluteResidualBodyHeight": rows["rows"]["hips"][
            "absoluteResidualBodyHeight"
        ],
        "shoulderSpanAbsoluteResidualBodyHeight": shoulder[
            "absoluteResidualBodyHeight"
        ],
    }
    failures = gate_failures(gate_metrics)
    genuinely_close = not failures
    return {
        "scanId": wear["scanId"],
        "score": rounded(final_similarity * 100.0, 2),
        "genuinelyClose": genuinely_close,
        "measurementTransferAllowed": False,
        "scoreComponents": {
            "fixedHeightCentralOutline": outline,
            "anatomicalRowBreadth": rows,
            "shoulderSpan": shoulder,
            "componentSimilarities": {
                "fixedHeightCentralOutline": rounded(outline_similarity),
                "anatomicalRowBreadth": rounded(row_similarity),
                "shoulderSpan": rounded(shoulder_similarity),
            },
        },
        "diagnosticOnly": {
            "rawWholeMeshOverlay": diagnostic_raw_overlay(query, wear),
            "landmarkAndLimbSegments": {
                "usedInScore": False,
                "unsafeReason": "cross-system hip landmarks are not equivalent and projected limbs are pose-sensitive before articulation normalization",
                "queryFeatures": query["features"],
                "wearFeatures": wear["features"],
            },
        },
        "closeGateMetrics": {key: rounded(value) for key, value in gate_metrics.items()},
        "closeGateFailures": failures,
        "profile": wear["profileData"],
        "wearEvidence": {
            "metricDescriptor": metric["descriptorEvidence"],
            "diagnosticGlbAndLnd": wear["evidence"],
        },
    }


def write_comparison_evidence(
    query: Mapping[str, Any], result: Mapping[str, Any]
) -> str:
    directory = OUTPUT_DIR / "comparisons"
    directory.mkdir(parents=True, exist_ok=True)
    path = directory / f"{query['photoId']}--{str(result['scanId']).lower()}.json"
    payload = {
        "schemaVersion": SCHEMA_VERSION,
        "photoId": query["photoId"],
        "scanId": result["scanId"],
        "score": result["score"],
        "genuinelyClose": result["genuinelyClose"],
        "measurementTransferAllowed": False,
        "scoreComponents": result["scoreComponents"],
        "diagnosticOnly": result["diagnosticOnly"],
        "closeGateMetrics": result["closeGateMetrics"],
        "closeGateFailures": result["closeGateFailures"],
    }
    path.write_text(json.dumps(payload, indent=2) + "\n")
    return str(path.relative_to(ROOT))


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", type=Path, default=OUTPUT_DIR / "index.json")
    args = parser.parse_args()

    models = V2.load_strict_models()
    metrics, metric_evidence = load_metric_descriptors()
    queries = {photo_id: V2.build_query(photo_id) for photo_id in PHOTO_IDS}
    for query in queries.values():
        query["semanticRows"] = locate_query_rows(query)
    wear = {scan_id: V2.build_wear(models[scan_id]) for scan_id in sorted(models)}
    all_default_feature_ids = sorted(
        {
            feature_id
            for metric in metrics.values()
            for feature_id in metric["defaultVector"]
        }
    )

    photos: list[dict[str, Any]] = []
    by_photo: dict[str, dict[str, dict[str, Any]]] = {}
    for photo_id in PHOTO_IDS:
        query = queries[photo_id]
        candidates = [
            compare(query, wear[scan_id], metrics[scan_id], all_default_feature_ids)
            for scan_id in sorted(wear)
        ]
        candidates.sort(key=lambda item: (-float(item["score"]), str(item["scanId"])))
        for rank, result in enumerate(candidates, 1):
            result["rank"] = rank
            result["comparisonEvidence"] = write_comparison_evidence(query, result)
        by_photo[photo_id] = {str(item["scanId"]): item for item in candidates}
        photos.append(
            {
                "photoId": photo_id,
                "queryQuality": query["quality"],
                "queryEvidence": query["evidence"],
                "querySemanticRows": query["semanticRows"],
                "queryDefaultSafeVector": query_default_vector(
                    query, all_default_feature_ids
                ),
                "candidates": candidates,
            }
        )

    eligible_photo_ids = [
        photo_id
        for photo_id in PHOTO_IDS
        if queries[photo_id]["quality"]["eligibleForCanonicalRanking"]
    ]
    if not eligible_photo_ids:
        raise RuntimeError("No query photo passed the canonical quality gate")
    canonical: list[dict[str, Any]] = []
    for scan_id in sorted(wear):
        source_results = [by_photo[photo_id][scan_id] for photo_id in eligible_photo_ids]
        score = mean([float(item["score"]) for item in source_results])
        genuinely_close = all(bool(item["genuinelyClose"]) for item in source_results)
        canonical.append(
            {
                "scanId": scan_id,
                "score": rounded(score, 2),
                "genuinelyClose": genuinely_close,
                "measurementTransferAllowed": False,
                "eligiblePhotoRanks": {
                    photo_id: by_photo[photo_id][scan_id]["rank"]
                    for photo_id in eligible_photo_ids
                },
                "scoreComponents": {
                    photo_id: by_photo[photo_id][scan_id]["scoreComponents"]
                    for photo_id in eligible_photo_ids
                },
                "closeGateFailures": {
                    photo_id: by_photo[photo_id][scan_id]["closeGateFailures"]
                    for photo_id in eligible_photo_ids
                },
                "profile": wear[scan_id]["profileData"],
            }
        )
    canonical.sort(key=lambda item: (-float(item["score"]), str(item["scanId"])))
    for rank, item in enumerate(canonical, 1):
        item["rank"] = rank

    any_close = any(bool(item["genuinelyClose"]) for item in canonical)
    output = {
        "schemaVersion": SCHEMA_VERSION,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "status": "candidate-evidence-only" if any_close else "rejected-no-genuine-close-match",
        "releaseAllowed": False,
        "device": "cpu",
        "canonicalArtifact": str(args.output.relative_to(ROOT)),
        "queryInputs": {
            "frontRgbDerivedMesh": True,
            "heightCm": QUERY_HEIGHT_CM,
            "weightKg": V2.QUERY_WEIGHT_KG,
            "gender": V2.QUERY_GENDER,
        },
        "rankingInputs": [
            "RGB-derived central visible-outline widths at fixed known-height fractions",
            "RGB-outline independently located waist and hip visible widths",
            "exact real-PLY front-projection A-B breadth at WEAR waist and hip rows",
            "mapped RGB Sapiens shoulder span versus exact WEAR Acromion span",
            "gender and strict height/weight cohort filter",
        ],
        "forbiddenRankingInputs": [
            "tape",
            "circumference",
            "depth",
            "BMI",
            "saved measurement lines",
            "old semantic similarity score",
            "raw pointwise mesh overlay before articulation normalization",
            "limb segment lengths before pose equivalence",
            "Trochanterion-to-Sapiens hip span",
        ],
        "oldSemanticScoreUsed": False,
        "piecewiseLandmarkWarpUsed": False,
        "rawPointwiseOverlayUsedInRanking": False,
        "unsafeLimbSegmentsUsedInRanking": False,
        "scoreDefinition": {
            "finalWeights": FINAL_WEIGHTS,
            "errorSimilarityScales": SIMILARITY_SCALES,
            "closeGates": {
                key: f"{operation} {value}"
                for key, (operation, value) in CLOSE_GATES.items()
            },
        },
        "canonicalRankingPhotoIds": eligible_photo_ids,
        "excludedPhotos": {
            photo_id: queries[photo_id]["quality"]["reasons"]
            for photo_id in PHOTO_IDS
            if photo_id not in eligible_photo_ids
        },
        "cohort": {
            "count": len(models),
            "scanIds": sorted(models),
            "sameGender": True,
            "heightToleranceCm": V2.HEIGHT_TOLERANCE_CM,
            "weightToleranceKg": V2.WEIGHT_TOLERANCE_KG,
        },
        "photos": photos,
        "canonicalRanking": canonical,
        "conclusion": {
            "anyGenuinelyClose": any_close,
            "nearestVisibleFrontCandidate": canonical[0]["scanId"],
            "nearestCandidateScore": canonical[0]["score"],
            "measurementTransferAllowed": False,
            "reason": (
                "A strict candidate passed every safe front-shape gate, but circumference transfer still requires a separate held-out validation gate."
                if any_close
                else "No strict candidate passed all safe central-outline plus exact waist/hip breadth gates; nearest does not mean genuinely close."
            ),
        },
        "evidence": {
            "metricDescriptors": metric_evidence,
            "v2GeometryHelper": str(V2_PATH.relative_to(ROOT)),
            "v2GeometryHelperSha256": file_sha(V2_PATH),
            "profileSamples": V2.PROFILE_SAMPLES,
        },
        "caveats": [
            "Delaram's source is a tight-clothing visible RGB outline, not hidden naked anatomy.",
            "Query centimetres are known-height equivalents from the full visible-body scale, not tape or camera-calibrated ground truth.",
            "WEAR articulation is not normalized, so raw whole-mesh IoU and limb segments are diagnostic only.",
            "Chest and under-bust are diagnostic only because a front outline can merge upper arms into the torso.",
            "A single front view cannot prove front-to-back depth or circumference.",
            "Delaram 2 remains diagnostic-only because the mesh touches the crop and one arm is raised.",
        ],
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(output, indent=2) + "\n")
    PROOF_DIR.mkdir(parents=True, exist_ok=True)
    summary = {
        "schemaVersion": SCHEMA_VERSION,
        "index": str(args.output.relative_to(ROOT)),
        "status": output["status"],
        "canonicalRankingPhotoIds": eligible_photo_ids,
        "canonicalRanking": canonical,
        "conclusion": output["conclusion"],
    }
    (PROOF_DIR / "summary.json").write_text(json.dumps(summary, indent=2) + "\n")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
