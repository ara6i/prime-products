import assert from "node:assert/strict";
import test from "node:test";
import type { LocalMlWearShapeExponentModel } from "./localMlSizing";
import type { MeshShapePredictionRow } from "./meshShapeProviders";
import {
  analyzePhotoSilhouette,
  predictPhotoBodyShapeExponent,
} from "./photoBodyShapeExponent";
import type { PoseResult } from "../types";

function makeHourglassPose(width: number, height: number): PoseResult {
  const mask = new Uint8ClampedArray(width * height);
  const widthAtY = (y: number): number => {
    if (y < 30 || y > 280) return 0;
    if (y <= 80) return 108;
    if (y <= 120) return 108 + (78 - 108) * ((y - 80) / 40);
    if (y <= 200) return 78 + (110 - 78) * ((y - 120) / 80);
    return 110 - (110 - 72) * ((y - 200) / 80);
  };
  for (let y = 0; y < height; y += 1) {
    const rowWidth = widthAtY(y);
    const left = Math.round((width - rowWidth) / 2);
    const right = Math.round((width + rowWidth) / 2);
    for (let x = left; x <= right; x += 1) mask[y * width + x] = 255;
  }
  const landmarks = Array.from({ length: 33 }, () => ({
    x: 0.5,
    y: 0.5,
    z: 0,
    visibility: 1,
  }));
  landmarks[11] = { x: 0.32, y: 0.24, z: 0, visibility: 1 };
  landmarks[12] = { x: 0.68, y: 0.24, z: 0, visibility: 1 };
  return { landmarks, mask, maskWidth: width, maskHeight: height, maskSource: "pose" };
}

const rows = [
  { kind: "waist" as const, y: 120, leftX: 61, rightX: 139 },
  { kind: "trouserWaist" as const, y: 160, leftX: 53, rightX: 147 },
  { kind: "hips" as const, y: 200, leftX: 45, rightX: 155 },
];

test("front silhouette reports a clean hourglass-like outline without reading circumference", () => {
  const evidence = analyzePhotoSilhouette({
    pose: makeHourglassPose(200, 300),
    imageWidth: 200,
    imageHeight: 300,
    rows,
  });
  assert.ok(evidence);
  assert.equal(evidence.detectedBodyType, "hourglass");
  assert.ok(evidence.maskQuality > 0.65);
  assert.ok(evidence.waistToHipRatio < 0.75);
});

test("large Meta-WEAR disagreement is rejected until visible shape evidence supports one source", () => {
  const silhouette = analyzePhotoSilhouette({
    pose: makeHourglassPose(200, 300),
    imageWidth: 200,
    imageHeight: 300,
    rows,
  });
  assert.ok(silhouette);
  const meshRow: MeshShapePredictionRow = {
    kind: "waist",
    superellipseExponent: 2.1,
    meshPerimeterCm: 90,
    meshBreadthCm: 34,
    meshDepthCm: 24,
    slicePointCount: 100,
    sliceHeightFromFloorCm: 100,
    sliceLoopM: [],
    shapeEvidence: {
      source: "canonical-neutral-nearby-slices",
      offsetsCm: [-2, -1, 0, 1, 2],
      exponents: [2.08, 2.09, 2.1, 2.11, 2.12],
      acceptedExponents: [2.08, 2.09, 2.1, 2.11, 2.12],
      exponentSpread: 0.04,
      medianFitError: 0.02,
      stability: 0.92,
    },
  };
  const wearModel = {
    coveragePct: 82,
  } as LocalMlWearShapeExponentModel;
  const wearPrediction = {
    exponent: 3.1,
    normalizedPosition: 0.7,
    targetCircumferenceCm: 95,
    outsideTypicalFeatures: [],
  };
  const automatic = predictPhotoBodyShapeExponent({
    kind: "waist",
    silhouette,
    meshRow,
    wearPrediction,
    wearModel,
    selectedBodyType: "auto",
    crossSectionHint: "auto",
  });
  assert.ok(automatic);
  assert.equal(automatic.accepted, false);
  assert.ok(automatic.wearWeight <= 0.350001);

  const ovalSupported = predictPhotoBodyShapeExponent({
    kind: "waist",
    silhouette,
    meshRow,
    wearPrediction,
    wearModel,
    selectedBodyType: "hourglass",
    crossSectionHint: "oval",
  });
  assert.ok(ovalSupported);
  assert.equal(ovalSupported.accepted, true);
  assert.ok(ovalSupported.exponent >= 2 && ovalSupported.exponent < 2.3);
  assert.ok(ovalSupported.wearWeight < ovalSupported.metaWeight);
  assert.ok(ovalSupported.wearWeight <= 0.350001);
});
