"use client";

import type { WaistTrace } from "../types";

interface Props {
  trace: WaistTrace | null;
}

/**
 * Step-by-step display of the waist computation. Pure read-only view —
 * every value comes from the trace returned by `computeTrouserWaist`.
 *
 * Each step shows the literal formula, the substituted values, and the
 * computed result so you can audit which input pushed which output.
 */
export function FormulaPanel({ trace }: Props) {
  if (!trace) {
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-text-primary mb-2">Lab formula trace</h3>
        <p className="text-sm text-text-secondary">Run analysis first to see the math.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-3 font-mono text-xs">
      <h3 className="font-sans text-sm font-semibold text-text-primary mb-2">Lab formula trace</h3>

      <Step
        n={1}
        title="BMI"
        formula="BMI = weight_kg / (height_cm / 100)²"
        sub={`${trace.weightKg} / (${trace.heightCm} / 100)² = ${trace.bmi}`}
      />

      <Step
        n={2}
        title="Pixel-to-cm scale"
        formula="cmPerPx = height_cm / (noseToAnklePx / 0.88)"
        sub={`noseToAnkleNormY=${trace.noseToAnkleNormY} → cmPerPx = ${trace.cmPerPx}`}
      />

      <Step
        n={3}
        title="Hip bone width (BlazePose landmarks)"
        formula="hipBoneCm = dist(leftHip, rightHip) × cmPerPx"
        sub={`L(${trace.hipLeftPx.x},${trace.hipLeftPx.y}) → R(${trace.hipRightPx.x},${trace.hipRightPx.y}) = ${trace.hipBoneCm} cm`}
      />

      <Step
        n={4}
        title="Hip silhouette width (segmentation mask)"
        formula="hipMaskWidthCm = scanMaskAtHipY × cmPerPx"
        sub={trace.hipMaskWidthCm > 0
          ? `${trace.hipMaskWidthPx} px → ${trace.hipMaskWidthCm} cm  (real outer-flesh width)`
          : `mask unavailable — falling back to hipBoneCm × 1.45`}
      />

      <Step
        n={5}
        title="Z-depth signal (BlazePose z)"
        formula="zDepthCm ≈ |shoulder.z − hip.z| × imageWidth × cmPerPx"
        sub={`shoulder.z=${trace.shoulderZ}, hip.z=${trace.hipZ}, Δ=${trace.zDepthDelta} → ${trace.zDepthCm} cm`}
      />

      <Step
        n={6}
        title="Trouser waist breadth"
        formula="trouserBreadth = max(mask, bone×1.45) × 0.92"
        sub={`${trace.trouserWaistBreadthCm} cm`}
      />

      <Step
        n={7}
        title="Continuous depth ratio (no BMI cliffs)"
        formula="β = clamp( 0.62 + 0.012 × (BMI − 18), 0.62, 0.95 )"
        sub={`BMI ${trace.bmi} → β = ${trace.depthRatio}`}
      />

      <Step
        n={8}
        title="Ramanujan ellipse perimeter"
        formula="C = π · (3(a+b) − √((3a+b)(a+3b))),  a = W/2,  b = (W·β)/2"
        sub={`W=${trace.trouserWaistBreadthCm}, D=${trace.trouserWaistDepthCm} → C = ${trace.trouserWaistCm} cm`}
      />

      <Step
        n={9}
        title="Direct weight lever (independent of BMI)"
        formula="bonus = 0.6 × (weight_kg − expectedWeight(height, gender))"
        sub={`expected ${trace.expectedWeightKg} kg, Δ ${trace.weightDeltaKg} kg → ${trace.directWeightBonusCm >= 0 ? "+" : ""}${trace.directWeightBonusCm} cm`}
      />

      <Step
        n={10}
        title="Final"
        formula="trouserWaist = C + bonus"
        sub={`${trace.trouserWaistCm} + (${trace.directWeightBonusCm >= 0 ? "+" : ""}${trace.directWeightBonusCm}) = ${trace.finalTrouserWaistCm} cm = ${trace.finalTrouserWaistIn} in`}
        highlight
      />
    </div>
  );
}

function Step({
  n,
  title,
  formula,
  sub,
  highlight,
}: {
  n: number;
  title: string;
  formula: string;
  sub: string;
  highlight?: boolean;
}) {
  return (
    <div className={`border-l-2 ${highlight ? "border-brand-blue bg-blue-50" : "border-gray-200"} pl-3 py-1.5 rounded-r`}>
      <div className="font-sans text-[11px] text-text-hint">
        <span className="text-brand-blue font-semibold">{n}.</span> {title}
      </div>
      <div className="text-[11.5px] text-text-primary mt-0.5">{formula}</div>
      <div className="text-[11px] text-text-secondary mt-1">↳ {sub}</div>
    </div>
  );
}
