import { calculateCircumferenceCm } from "./circumferenceMethods";
import type {
  LocalMlWearShapeExponentModel,
  LocalMlWearShapeExponentResult,
} from "./localMlSizing";
import type { MeshShapePredictionRow } from "./meshShapeProviders";
import type { DepthProfileShapeExponentResult } from "./depthProfileShapeExponent";

export interface FusedShapeExponentResult {
  exponent: number;
  metaExponent: number;
  wearExponent: number;
  metaWeight: number;
  wearWeight: number;
  depthProExponent?: number;
  depthProWeight: number;
  depthProUsed: boolean;
  metaSigma: number;
  wearSigma: number;
  depthProSigma?: number;
  agreement: number;
  evidenceConfidence: number;
  confidenceLabel: "high" | "check" | "low";
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

/**
 * Fuse independent shape evidence without reading a named person's dataset
 * circumference. Apple camera intrinsics align Meta's canonical body mesh;
 * Meta supplies repeatability across nearby slices; WEAR supplies a population
 * prior and its held-out circumference error. Depth Pro is only an optional,
 * capped front-surface check.
 */
export function predictFusedShapeExponent(args: {
  meshRow: MeshShapePredictionRow | null;
  wearPrediction: LocalMlWearShapeExponentResult | null;
  wearModel: LocalMlWearShapeExponentModel | null;
  depthProfilePrediction?: DepthProfileShapeExponentResult | null;
  breadthCm: number;
  depthCm: number;
  gender: "male" | "female";
  appleCameraAligned: boolean;
}): FusedShapeExponentResult | null {
  const {
    meshRow,
    wearPrediction,
    wearModel,
    depthProfilePrediction,
    breadthCm,
    depthCm,
    gender,
    appleCameraAligned,
  } = args;
  const evidence = meshRow?.shapeEvidence;
  if (
    !meshRow
    || !evidence
    || evidence.source !== "canonical-neutral-nearby-slices"
    || !wearPrediction
    || !wearModel
    || !Number.isFinite(breadthCm)
    || breadthCm <= 0
    || !Number.isFinite(depthCm)
    || depthCm <= 0
  ) return null;

  const metaExponent = meshRow.superellipseExponent;
  const wearExponent = wearPrediction.exponent;
  const metaStability = clamp(evidence.stability, 0.15, 1);
  const metaSigma = clamp(
    clamp(
      Math.max(0.06, evidence.exponentSpread, evidence.medianFitError * 2.5) / metaStability,
      0.18,
      1.5,
    ) * (appleCameraAligned ? 1 : 1.4),
    0.18,
    2,
  );

  const derivativeStep = 0.05;
  const lowExponent = clamp(wearExponent - derivativeStep, wearModel.minimumExponent, wearModel.maximumExponent);
  const highExponent = clamp(wearExponent + derivativeStep, wearModel.minimumExponent, wearModel.maximumExponent);
  const lowCircumference = calculateCircumferenceCm(breadthCm, depthCm, "superellipse", lowExponent);
  const highCircumference = calculateCircumferenceCm(breadthCm, depthCm, "superellipse", highExponent);
  if (lowCircumference == null || highCircumference == null || highExponent <= lowExponent) return null;
  const circumferencePerExponent = Math.abs(highCircumference - lowCircumference) / (highExponent - lowExponent);
  const featurePenalty = clamp(1 + wearPrediction.outsideTypicalFeatures.length * 0.16, 1, 2.4);
  const coveragePenalty = 1 / Math.sqrt(clamp(wearModel.coveragePct / 100, 0.2, 1));
  const sameGenderMae = gender === "female"
    ? wearModel.validationFemaleMaeCm
    : wearModel.validationMaleMaeCm;
  const validationMaeCm = sameGenderMae ?? wearModel.validationMaeCm;
  const wearSigma = clamp(
    (validationMaeCm / Math.max(0.25, circumferencePerExponent)) * featurePenalty * coveragePenalty,
    0.12,
    2,
  );

  const metaPrecision = 1 / (metaSigma * metaSigma);
  const wearPrecision = 1 / (wearSigma * wearSigma);
  const depthProSigma = depthProfilePrediction
    ? clamp(
        depthProfilePrediction.exponentSigma / clamp(depthProfilePrediction.evidenceConfidence, 0.25, 1),
        0.3,
        2,
      )
    : null;
  const rawDepthProPrecision = depthProSigma == null || (depthProfilePrediction?.evidenceConfidence ?? 0) < 0.55
    ? 0
    : 1 / (depthProSigma * depthProSigma);
  // Depth Pro is useful as a surface-curve check, but Apple camera geometry is
  // more reliable in this lab. Never let this unvalidated signal own >15%.
  const depthProPrecision = Math.min(rawDepthProPrecision, (metaPrecision + wearPrecision) * (0.15 / 0.85));
  const depthProUsed = depthProPrecision > 0;
  const totalPrecision = metaPrecision + wearPrecision + depthProPrecision;
  const metaWeight = metaPrecision / totalPrecision;
  const wearWeight = wearPrecision / totalPrecision;
  const depthProWeight = depthProPrecision / totalPrecision;
  const exponent = clamp(
    metaExponent * metaWeight
      + wearExponent * wearWeight
      + (depthProfilePrediction?.exponent ?? 0) * depthProWeight,
    Math.max(1.2, wearModel.minimumExponent),
    Math.min(4, wearModel.maximumExponent),
  );
  const sourceExponents = [metaExponent, wearExponent];
  if (depthProfilePrediction && depthProUsed) sourceExponents.push(depthProfilePrediction.exponent);
  const agreement = Math.max(...sourceExponents) - Math.min(...sourceExponents);
  const expectedDisagreement = Math.max(
    0.15,
    Math.sqrt(metaSigma * metaSigma + wearSigma * wearSigma + (depthProUsed ? depthProSigma ?? 0 : 0) ** 2),
  );
  const agreementScore = Math.exp(-0.5 * (agreement / expectedDisagreement) ** 2);
  const wearSupport = 1 / featurePenalty;
  const sourceStability = metaStability * metaWeight
    + wearSupport * wearWeight
    + (depthProfilePrediction?.evidenceConfidence ?? 0) * depthProWeight;
  const evidenceConfidence = clamp(sourceStability * 0.7 + agreementScore * 0.3, 0, 1);
  const confidenceLabel = evidenceConfidence >= 0.72
    ? "high"
    : evidenceConfidence >= 0.45
      ? "check"
      : "low";

  return {
    exponent,
    metaExponent,
    wearExponent,
    metaWeight,
    wearWeight,
    depthProExponent: depthProfilePrediction?.exponent,
    depthProWeight,
    depthProUsed,
    metaSigma,
    wearSigma,
    depthProSigma: depthProSigma ?? undefined,
    agreement,
    evidenceConfidence,
    confidenceLabel,
  };
}
