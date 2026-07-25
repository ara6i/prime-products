import type { MeshShapePredictionRow } from "./meshShapeProviders";

export interface DepthProfileShapeExponentResult {
  exponent: number;
  exponentSigma: number;
  fitMaeCm: number;
  fitP90Cm: number;
  symmetryErrorPct: number;
  sampleCoverage: number;
  evidenceConfidence: number;
  confidenceLabel: "high" | "check" | "low";
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function quantile(values: number[], fraction: number): number {
  const ordered = [...values].sort((left, right) => left - right);
  if (!ordered.length) return Number.NaN;
  const position = (ordered.length - 1) * fraction;
  const lower = Math.floor(position);
  const upper = Math.min(ordered.length - 1, lower + 1);
  const weight = position - lower;
  return ordered[lower]! * (1 - weight) + ordered[upper]! * weight;
}

function solveBaseline(xs: number[], values: number[]): { intercept: number; slope: number } | null {
  if (xs.length !== values.length || xs.length < 8) return null;
  const meanX = xs.reduce((sum, value) => sum + value, 0) / xs.length;
  const meanY = values.reduce((sum, value) => sum + value, 0) / values.length;
  let varianceX = 0;
  let covariance = 0;
  for (let index = 0; index < xs.length; index += 1) {
    const centeredX = xs[index]! - meanX;
    varianceX += centeredX * centeredX;
    covariance += centeredX * (values[index]! - meanY);
  }
  if (varianceX <= 1e-9) return null;
  const slope = covariance / varianceX;
  return { slope, intercept: meanY - slope * meanX };
}

/**
 * Fit only the final outline number n. The red breadth and WEAR/manual depth
 * are fixed inputs. Depth Pro contributes the observed front-surface curve;
 * it never supplies a circumference or a target answer.
 */
export function predictDepthProfileShapeExponent(
  evidence: MeshShapePredictionRow["depthProfileEvidence"],
  depthCm: number,
): DepthProfileShapeExponentResult | null {
  if (
    !evidence
    || evidence.source !== "depth-pro-front-surface"
    || !Number.isFinite(depthCm)
    || depthCm <= 0
    || evidence.xNorm.length !== evidence.depthM.length
    || evidence.xNorm.length < 31
  ) return null;

  const points = evidence.xNorm.flatMap((x, index) => {
    const depthM = evidence.depthM[index];
    if (!Number.isFinite(x) || !Number.isFinite(depthM) || Math.abs(x) > 0.97 || depthM! <= 0) return [];
    return [{ x, depthM: depthM! }];
  });
  if (points.length < 25) return null;

  const halfDepthM = depthCm / 200;
  const xs = points.map((point) => point.x);
  const losses: Array<{ exponent: number; lossM: number; absoluteResidualsM: number[]; intercept: number; slope: number }> = [];
  for (let step = 0; step <= 280; step += 1) {
    const exponent = 1.2 + step * 0.01;
    const expectedFront = points.map((point) => (
      Math.max(0, 1 - Math.abs(point.x) ** exponent) ** (1 / exponent)
    ));
    const baselineTarget = points.map((point, index) => point.depthM + halfDepthM * expectedFront[index]!);
    const baseline = solveBaseline(xs, baselineTarget);
    if (!baseline) continue;
    const absoluteResidualsM = points.map((point, index) => Math.abs(
      point.depthM
      - (baseline.intercept + baseline.slope * point.x - halfDepthM * expectedFront[index]!),
    ));
    const trimmed = [...absoluteResidualsM].sort((left, right) => left - right)
      .slice(0, Math.max(8, Math.floor(absoluteResidualsM.length * 0.9)));
    losses.push({
      exponent,
      lossM: trimmed.reduce((sum, value) => sum + value, 0) / trimmed.length,
      absoluteResidualsM,
      ...baseline,
    });
  }
  if (!losses.length) return null;
  const best = losses.reduce((current, candidate) => candidate.lossM < current.lossM ? candidate : current);

  // A flat loss curve means the photo cannot distinguish round from boxy.
  // Keep an external floor because internal repeatability is not accuracy.
  const nearBestThresholdM = best.lossM + Math.max(0.0005, halfDepthM * 0.004);
  const nearBest = losses.filter((candidate) => candidate.lossM <= nearBestThresholdM);
  const fittedSpread = nearBest.length
    ? (nearBest.at(-1)!.exponent - nearBest[0]!.exponent) / 2
    : 1.2;
  const exponentSigma = clamp(Math.max(0.3, fittedSpread), 0.3, 1.2);

  const observedFrontByX = new Map<number, number>();
  for (const point of points) {
    observedFrontByX.set(
      Math.round(point.x * 100) / 100,
      (best.intercept + best.slope * point.x - point.depthM) / halfDepthM,
    );
  }
  const symmetryDifferences: number[] = [];
  for (const [x, value] of observedFrontByX) {
    if (x <= 0.08 || x >= 0.9) continue;
    const opposite = observedFrontByX.get(Math.round(-x * 100) / 100);
    if (opposite != null && Number.isFinite(opposite)) symmetryDifferences.push(Math.abs(value - opposite));
  }
  const symmetryErrorPct = symmetryDifferences.length ? quantile(symmetryDifferences, 0.5) * 100 : 100;
  const fitMaeCm = best.lossM * 100;
  const fitP90Cm = quantile(best.absoluteResidualsM, 0.9) * 100;
  const fitScore = Math.exp(-best.lossM / Math.max(0.001, halfDepthM * 0.04));
  const symmetryScore = Math.exp(-symmetryErrorPct / 18);
  const boundaryPenalty = best.exponent <= 1.22 || best.exponent >= 3.98 ? 0.55 : 1;
  const evidenceConfidence = clamp(
    evidence.sampleCoverage * fitScore * (0.55 + 0.45 * symmetryScore) * boundaryPenalty,
    0,
    1,
  );
  const confidenceLabel = evidenceConfidence >= 0.7
    ? "high"
    : evidenceConfidence >= 0.4
      ? "check"
      : "low";

  return {
    exponent: Math.round(best.exponent * 100) / 100,
    exponentSigma,
    fitMaeCm,
    fitP90Cm,
    symmetryErrorPct,
    sampleCoverage: evidence.sampleCoverage,
    evidenceConfidence,
    confidenceLabel,
  };
}
