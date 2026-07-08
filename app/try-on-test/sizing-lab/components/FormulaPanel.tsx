"use client";

import type { WaistTrace } from "../types";
import type { SdkBackendTrace } from "../lib/sdkBackendRequest";

interface Props {
  trace: WaistTrace | null;
  backendTrace?: SdkBackendTrace | null;
}

/**
 * Step-by-step display of the waist computation. Pure read-only view —
 * every value comes from the trace returned by `computeTrouserWaist`.
 *
 * Each step shows the literal formula, the substituted values, and the
 * computed result so you can audit which input pushed which output.
 */
export function FormulaPanel({ trace, backendTrace }: Props) {
  if (!trace) {
    if (backendTrace) {
      return <BackendFormulaPanel trace={backendTrace} />;
    }
    return (
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="text-sm font-semibold text-text-primary mb-2">Lab formula trace</h3>
        <p className="text-sm text-text-secondary">Run analysis first to see the math.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {backendTrace ? <BackendFormulaPanel trace={backendTrace} /> : null}

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-3 font-mono text-xs">
        <h3 className="font-sans text-sm font-semibold text-text-primary mb-2">Lab visual formula trace</h3>

      <Step
        n={1}
        title="BMI"
        formula="BMI = weight_kg / (height_cm / 100)²"
        sub={`${trace.weightKg} / (${trace.heightCm} / 100)² = ${trace.bmi}`}
      />

      <Step
        n={2}
        title="Pixel-to-cm scale"
        formula="cmPerPx = height_cm / detectedFullBodyPx"
        sub={
          trace.sideCmPerPx
            ? `front noseToAnkleNormY=${trace.noseToAnkleNormY} → cmPerPx=${trace.cmPerPx}; side ${trace.sideImageWidth}×${trace.sideImageHeight}, noseToAnkleNormY=${trace.sideNoseToAnkleNormY} → sideCmPerPx=${trace.sideCmPerPx}`
            : `noseToAnkleNormY=${trace.noseToAnkleNormY} → cmPerPx = ${trace.cmPerPx}`
        }
      />

      <Step
        n={3}
        title="Hip bone width (BlazePose landmarks)"
        formula="hipBoneCm = dist(leftHip, rightHip) × cmPerPx"
        sub={`L(${trace.hipLeftPx.x},${trace.hipLeftPx.y}) → R(${trace.hipRightPx.x},${trace.hipRightPx.y}) = ${trace.hipBoneCm} cm`}
      />

      <Step
        n={4}
        title="Front mask scan bands"
        formula="natural: shoulderY + 58–78% torsoSpan; trouser: shoulderY + 76–98% torsoSpan"
        sub={`Y ${trace.torsoScanStartYNorm ?? "—"} → ${trace.torsoScanEndYNorm ?? "—"}, threshold=${trace.maskThreshold || "—"}, centerX=hip midpoint`}
      />

      <Step
        n={5}
        title="Natural waist row"
        formula="naturalWaistWidth = narrowest valid front mask row inside natural-waist band"
        sub={`${trace.naturalWaistMaskWidthPx} px → ${trace.naturalWaistMaskWidthCm} cm at y=${trace.naturalWaistYNorm ?? "—"}`}
      />

      <Step
        n={6}
        title="Natural waist depth"
        formula="if valid side photo exists: rawSideRatio = sideWidth/frontWidth, then use projection-corrected depth ratio; else front-only estimate"
        sub={
          trace.naturalWaistDepthSource === "side-mask"
            ? `raw side ${trace.sideNaturalWaistDepthPx} px × ${trace.sideCmPerPx ?? "?"} = ${trace.sideNaturalWaistDepthCm} cm; raw ratio=${trace.sideNaturalWaistRawDepthRatio ?? "?"}, leak=${trace.sideNaturalWaistProjectionLeakRatio ?? "?"}, corrected ratio=${trace.sideNaturalWaistCorrectedDepthRatio ?? "?"}, D=${trace.naturalWaistDepthCm} cm`
            : `front-only βn=${trace.naturalWaistDepthRatio}, depth=${trace.naturalWaistDepthCm} cm`
        }
      />

      <Step
        n={7}
        title="Natural waist ellipse"
        formula="C = π · (3(a+b) − √((3a+b)(a+3b))), a = width/2, b = depth/2"
        sub={`W=${trace.naturalWaistMaskWidthCm}, D=${trace.naturalWaistDepthCm} → C=${trace.naturalWaistCm} cm = ${trace.naturalWaistIn} in`}
      />

      <Step
        n={8}
        title="Trouser waist row"
        formula="trouserWidth = narrowest valid front mask row inside lower trouser-waist band"
        sub={`${trace.trouserWaistMaskWidthPx} px → ${trace.trouserWaistMaskWidthCm} cm at y=${trace.trouserWaistYNorm ?? "—"}`}
      />

      <Step
        n={9}
        title="Trouser waist depth + ellipse"
        formula="if valid side photo exists: rawSideRatio = sideWidth/frontWidth, then use projection-corrected depth ratio; else front-only estimate"
        sub={
          trace.trouserWaistDepthSource === "side-mask"
            ? `W=${trace.trouserWaistBreadthCm}, raw side=${trace.sideTrouserWaistDepthCm} cm, raw ratio=${trace.sideTrouserWaistRawDepthRatio ?? "?"}, leak=${trace.sideTrouserWaistProjectionLeakRatio ?? "?"}, corrected ratio=${trace.sideTrouserWaistCorrectedDepthRatio ?? "?"}, D=${trace.trouserWaistDepthCm} cm → C=${trace.trouserWaistCm} cm`
            : `W=${trace.trouserWaistBreadthCm}, front-only βt=${trace.depthRatio}, D=${trace.trouserWaistDepthCm} → C=${trace.trouserWaistCm} cm`
        }
      />

      <Step
        n={10}
        title="Final shown value"
        formula="shown waist = natural waist, not trouser waist"
        sub={`natural=${trace.finalNaturalWaistCm} cm / ${trace.finalNaturalWaistIn} in; trouser debug=${trace.finalTrouserWaistCm} cm / ${trace.finalTrouserWaistIn} in`}
        highlight
      />
      </div>
    </div>
  );
}

function BackendFormulaPanel({ trace }: { trace: SdkBackendTrace }) {
  const estimates = trace.recommend?.estimates ?? trace.estimate?.estimates ?? {};
  const primary = [
    ["Recommended", trace.recommend?.recommendedSize],
    ["Chest", estimates.chest ?? estimates.bust],
    ["Waist", estimates.waist],
    ["Hips", estimates.hips],
    ["Shoulder", estimates.shoulderWidth],
    ["Inseam", estimates.inseam],
  ];
  const formulaRows = buildBackendFormulaRows(trace);

  return (
    <div className="rounded-2xl border border-slate-300 bg-slate-950 p-5 shadow-sm text-slate-100">
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold">SDK/backend result</h3>
        <p className="text-xs text-slate-300">
          Exact path: original image {"->"} MediaPipe landmarks {"->"} backend /api/v1/sizing/recommend. No Gemini, no prompt, no Segmenter, no side-photo depth.
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-6">
        {primary.map(([label, value]) => (
          <div key={label} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2">
            <div className="text-[10px] uppercase tracking-wider text-slate-400">{label}</div>
            <div className="mt-1 font-mono text-sm tabular-nums">
              {typeof value === "number" ? `${value} cm` : value || "n/a"}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-2 md:grid-cols-2">
        <Info label="Backend" value={trace.baseUrl} />
        <Info label="Request fields" value={trace.requestSummary.fields.join(", ")} />
        <Info label="MediaPipe landmarks sent" value={`${trace.requestSummary.landmarkCount} landmarks, image ${trace.requestSummary.imageWidth}x${trace.requestSummary.imageHeight}`} />
        <Info
          label="User inputs sent"
          value={`height ${trace.requestSummary.heightCm} cm (${trace.requestSummary.sdkHeightIn ?? "?"} in), weight ${trace.requestSummary.weightKg} kg (${trace.requestSummary.sdkWeightLb ?? "?"} lbs), gender ${trace.requestSummary.gender}${trace.requestSummary.braSize ? `, bra ${trace.requestSummary.braSize}` : ""}`}
        />
        {trace.stages.map((stage) => (
          <div key={stage.name} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs">
            <div className="font-semibold text-slate-200">{stage.name}</div>
            <div className="mt-1 text-slate-400">
              {stage.status} · {stage.latencyMs} ms · {stage.detail}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 space-y-2 font-mono text-[11px]">
        {formulaRows.map((item, index) => (
          <div key={`${item.label}-${index}`} className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2">
            <div className="font-sans text-[11px] font-semibold text-slate-200">
              {index + 1}. {item.label}
            </div>
            <div className="mt-1 text-slate-300">{item.formula}</div>
            <div className="mt-1 text-emerald-300">= {item.result}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs">
      <div className="font-semibold text-slate-200">{label}</div>
      <div className="mt-1 text-slate-400">{value}</div>
    </div>
  );
}

function buildBackendFormulaRows(trace: SdkBackendTrace): Array<{ label: string; formula: string; result: string }> {
  const estimates = trace.recommend?.estimates ?? trace.estimate?.estimates ?? {};
  return [
    {
      label: "Pixel anchors",
      formula: "SDK sends MediaPipe bodyLandmarks with imageWidth/imageHeight. Backend /sizing/recommend passes those anchors into estimateWithVision(...).",
      result: `${trace.requestSummary.landmarkCount} landmarks sent from ${trace.requestSummary.imageWidth}x${trace.requestSummary.imageHeight} image`,
    },
    {
      label: "BMI",
      formula: "SDK payload quickEstimate uses inches/lbs. Backend converts to cm/kg, then BMI = weight_kg / (height_cm / 100)^2.",
      result: `${trace.requestSummary.weightKg} / (${trace.requestSummary.heightCm} / 100)^2; SDK sent ${trace.requestSummary.sdkHeightIn ?? "?"} in and ${trace.requestSummary.sdkWeightLb ?? "?"} lbs`,
    },
    {
      label: "Chest/Bust",
      formula: "If bra size is supplied, backend converts bra size to bust. Otherwise chest = ellipse(shoulder landmark breadth x BMI chest width ratio, depth x BMI chest depth ratio).",
      result: valueCm(estimates.chest ?? estimates.bust),
    },
    {
      label: "Waist",
      formula: "Backend computes waist from shoulder landmark breadth, BMI waist width/depth ratios, ellipse circumference, and female height/BMI floor guards when needed.",
      result: valueCm(estimates.waist),
    },
    {
      label: "Hips",
      formula: "Backend computes hips from hip-bone landmarks. Male path uses hip bone expansion plus tissue pad. Female path uses k_b, BMI tissue, ellipse depth, and female floor/compressed-width guard.",
      result: valueCm(estimates.hips),
    },
    {
      label: "Shoulder",
      formula: "Backend garment shoulderWidth = MediaPipe shoulder bone width x 1.18.",
      result: valueCm(estimates.shoulderWidth),
    },
    {
      label: "Sleeve",
      formula: "Backend sleeveLength = arm length + garment shoulder / 2 + 3.",
      result: valueCm(estimates.sleeveLength),
    },
    {
      label: "Inseam",
      formula: "Backend uses MediaPipe leg span when plausible; otherwise population fallback is height x 0.46 male or x 0.44 female.",
      result: valueCm(estimates.inseam),
    },
    {
      label: "Size recommendation",
      formula: "Same /sizing/recommend call sends estimated fields into deterministic size-guide matching, then returns recommendedSize and matchDetails.",
      result: trace.recommend?.recommendedSize ?? "n/a",
    },
  ];
}

function valueCm(value: unknown): string {
  return typeof value === "number" ? `${value} cm` : "backend did not return this field";
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
