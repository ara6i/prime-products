import type { FreshGeometryPrediction } from "./freshGeometryTypes";
import { aiadLines, type AiadCameraSnapshot } from "./aiadWorkbenchGeometry";
import { AIAD_GUIDE_SOURCE, AIAD_HEIGHT_FRACTIONS, AIAD_LEVELS } from "./aiadPreprocessing";

export function workbenchFixture(): FreshGeometryPrediction {
  const rowValues = [
    ["neck", "Neck", 15, 12, 36, .18],
    ["chest", "Chest", 34, 25, 100, .32],
    ["underbust", "Under-bust", 31, 24, 91, .4],
    ["waist", "Waist", 30, 24, 85, .5],
    ["hips", "Hips", 38, 27, 105, .62],
  ] as const;
  const box = { left: 0, top: 0, right: 192, bottom: 256, width: 192, height: 256 };
  const prediction: FreshGeometryPrediction = {
    ok: true,
    model: { version: "aiad-fixture", sha256: "fixture-sha", targetCount: 34, bestEpoch: null, bestValidationLoss: null, train: null, validation: null, qualityGates: {}, syntheticWearValidated: false, realPhotoValidated: false, sealedTestSubjectsUsed: 0, sdkReady: false, importantLimit: "Test fixture" },
    inputContract: { usedByOnnx: ["silhouette", "profile"], usedBeforeOnnx: [], notUsedByOnnx: ["edited lines"], cameraHandling: "separate" },
    profile: { heightCm: 170, weightKg: 70, bmi: 24.2, gender: "female" },
    preprocessing: { rawMaskSize: [1200, 1600], canonicalMaskSize: [192, 256], modelInputSize: [192, 256], sourceBodyBox: box, canonicalBodyBox: box, removedForegroundPixels: 0, warnings: [], quality: "transfer-test" },
    canonicalMaskDataUrl: "data:image/png;base64,AA==",
    rows: rowValues.map(([kind, label, widthCm, depthCm, tapeCm, y]) => ({
      kind, label, color: "#087e82", yNorm: y, leftXNorm: .35, rightXNorm: .65,
      line: { canonical: { left: { x: .35, y }, right: { x: .65, y } }, photo: { left: { x: .35, y }, right: { x: .65, y } } },
      widthCm, depthCm, depthWidthRatio: depthCm / widthCm, tapeCm, shape: [], syntheticValidation: null,
    })),
    ratios: [], camera: {}, timing: { inferenceMs: 10, totalMs: 15 },
    aiad: { ensembleSize: 4, segmentation: "aiad-rembg-photo", lineSource: "height-fraction-guide", maskFill: .3, measurements: rowValues.map(([kind, , , , valueCm]) => ({ kind, valueCm, sigmaCm: 2 })), shoulder: { widthCm: 40, depthCm: 20 }, shapeCode: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  };
  prediction.aiad!.guideSource = AIAD_GUIDE_SOURCE;
  prediction.aiad!.levels = AIAD_LEVELS.map((kind) => {
    const existing = prediction.rows.find((row) => row.kind === kind);
    const y = existing?.line?.canonical.left.y ?? .25;
    return {
      ...(existing ?? { kind, label: "Shoulder", color: "#0e7490", widthCm: 40, depthCm: 20, depthWidthRatio: .5, tapeCm: null,
        line: { canonical: { left: { x: .35, y }, right: { x: .65, y } }, photo: { left: { x: .35, y }, right: { x: .65, y } } } }),
      kind,
      endpoints: { row_px: Math.round(y * 256), A_px: 67, B_px: 125, row_cm_from_floor: AIAD_HEIGHT_FRACTIONS[kind] * 170, width_image_cm: 38.5, full_extent_cm: 62 },
    };
  });
  return prediction;
}

export function cameraFixture(appleWidth = 33, depthWidth: number | null = 32): AiadCameraSnapshot {
  const prediction = workbenchFixture();
  prediction.cameraFusion = {
    state: "applied", method: "apple-vision-depth-pro-post-onnx-v1",
    appleVision: { geometryQuality: "pass", focalMismatchPct: 2, estimatedCameraPitchDeg: 4, estimatedCameraRollDeg: 1, estimatedCameraYawDeg: 2 },
    depthPro: { modelVersion: "fixture", validRows: depthWidth == null ? 0 : 5, totalRows: 5, scaleFactor: 1 },
    rows: prediction.rows.map((row) => ({ kind: row.kind, rawWidthCm: row.widthCm, rawDepthCm: row.depthCm, appleVisionWidthCm: appleWidth, depthProWidthCm: depthWidth, fusedWidthCm: depthWidth ?? appleWidth, fusedDepthCm: null, learnedDepthWidthRatio: row.depthWidthRatio, directTapeCm: row.tapeCm, rawGeometryCircumferenceCm: null, cameraGeometryCircumferenceCm: null, widthSource: depthWidth == null ? "apple-vision" : "apple-depth", confidence: "high", widthChangePct: 5 })),
    rowPositionSource: "manual", manuallyEditedRows: [], warnings: [], tapeHandling: "direct-fresh-head-unchanged", importantLimit: "Tape is unchanged",
  };
  return { prediction, lines: aiadLines(prediction) };
}
