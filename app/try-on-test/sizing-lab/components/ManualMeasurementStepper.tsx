"use client";

import { useState } from "react";
import { AppleVisionSkeleton3D } from "./AppleVisionSkeleton3D";
import type { AppleFusedBodyScaleApiResult } from "../lib/appleFusedBodyScale";
import type { AppleVisionBodyScaleResult, AppleVisionBodyRowName } from "../lib/appleVisionBodyScale";
import type { GeminiGuideMeasurement } from "../lib/geminiGuide";

type StepId = "input" | "mediapipe" | "red-lines" | "apple-3d" | "scale" | "depth-pro" | "depth-ratio" | "result";

interface RedRow {
  name: AppleVisionBodyRowName;
  y: number;
  leftX: number;
  rightX: number;
}

interface Props {
  imageWidth: number;
  imageHeight: number;
  heightCm?: number;
  bodySpanPx?: number | null;
  redRows: RedRow[];
  personMaskReady: boolean;
  appleResult: AppleVisionBodyScaleResult | null;
  bodySurfaceResult: AppleFusedBodyScaleApiResult | null;
  measurement: GeminiGuideMeasurement | null;
  targetNaturalWaistCm?: number;
  targetTrouserWaistCm?: number;
  targetHipsCm?: number;
}

const STEPS: Array<{ id: StepId; title: string; tool: string; evidence: "provided" | "measured" | "model" | "estimated" }> = [
  { id: "input", title: "Photo + height", tool: "User input", evidence: "provided" },
  { id: "mediapipe", title: "Find body", tool: "Google MediaPipe", evidence: "model" },
  { id: "red-lines", title: "Select widths", tool: "Manual red lines", evidence: "measured" },
  { id: "apple-3d", title: "Build skeleton", tool: "Apple Vision 3D", evidence: "model" },
  { id: "scale", title: "Camera proposal", tool: "Apple Vision 3D", evidence: "model" },
  { id: "depth-pro", title: "Body scale gate", tool: "Depth Pro + person mask", evidence: "model" },
  { id: "depth-ratio", title: "Estimate thickness", tool: "Depth-ratio prior", evidence: "estimated" },
  { id: "result", title: "Circumference", tool: "Ellipse formula", evidence: "estimated" },
];

export function ManualMeasurementStepper({
  imageWidth,
  imageHeight,
  heightCm,
  bodySpanPx,
  redRows,
  personMaskReady,
  appleResult,
  bodySurfaceResult,
  measurement,
  targetNaturalWaistCm,
  targetTrouserWaistCm,
  targetHipsCm,
}: Props) {
  const [activeStepId, setActiveStepId] = useState<StepId>("apple-3d");
  const activeIndex = Math.max(0, STEPS.findIndex((step) => step.id === activeStepId));
  const activeStep = STEPS[activeIndex]!;
  const targetFor = (name: AppleVisionBodyRowName): number | undefined => name === "waist"
    ? targetNaturalWaistCm
    : name === "trouserWaist"
      ? targetTrouserWaistCm
      : targetHipsCm;

  return (
    <section data-testid="manual-measurement-stepper" className="rounded-xl border border-blue-200 bg-white p-3 text-text-primary shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold">How this measurement is calculated</h4>
          <p className="mt-1 text-xs text-text-secondary">Choose a step to see the tool, real numbers, and whether the value is measured or estimated.</p>
        </div>
        <EvidenceBadge value={activeStep.evidence} />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-1 md:grid-cols-4 xl:grid-cols-8" aria-label="Measurement calculation steps">
        {STEPS.map((step, index) => {
          const selected = step.id === activeStepId;
          return (
            <button
              key={step.id}
              type="button"
              aria-pressed={selected}
              onClick={() => setActiveStepId(step.id)}
              className={`min-h-16 rounded-lg border px-2 py-2 text-left transition-colors ${selected ? "border-brand-blue bg-blue-50 text-blue-950" : "border-gray-200 bg-slate-50 text-text-secondary hover:bg-slate-100"}`}
            >
              <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold ${selected ? "bg-brand-blue text-white" : "bg-slate-200 text-slate-700"}`}>{index + 1}</span>
              <span className="mt-1 block text-[11px] font-semibold leading-tight">{step.title}</span>
              <span className="mt-0.5 block text-[9px] leading-tight opacity-80">{step.tool}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 rounded-xl border border-gray-200 bg-slate-50 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 pb-2">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-text-hint">Step {activeIndex + 1} · Tool</div>
            <div className="text-base font-semibold">{activeStep.tool}</div>
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              disabled={activeIndex === 0}
              onClick={() => setActiveStepId(STEPS[activeIndex - 1]!.id)}
              className="rounded border border-gray-300 bg-white px-2 py-1 text-xs font-semibold disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={activeIndex === STEPS.length - 1}
              onClick={() => setActiveStepId(STEPS[activeIndex + 1]!.id)}
              className="rounded border border-brand-blue bg-brand-blue px-2 py-1 text-xs font-semibold text-white disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
        <div className="mt-3">
          {activeStepId === "input" ? (
            <ValueGrid values={[
              { label: "Photo", value: `${imageWidth} × ${imageHeight} px` },
              { label: "Known height", value: heightCm ? `${heightCm.toFixed(2)} cm` : "Not provided" },
              { label: "Visible body span", value: bodySpanPx ? `${bodySpanPx.toFixed(0)} px` : "Waiting for mask" },
              { label: "Scale use", value: "Height anchors Apple’s reference skeleton" },
            ]} />
          ) : null}

          {activeStepId === "mediapipe" ? (
            <ValueGrid values={[
              { label: "Pose", value: personMaskReady ? "33 landmarks found" : "Run Analyze" },
              { label: "Mask", value: personMaskReady ? `${imageWidth} × ${imageHeight} person mask` : "Waiting" },
              { label: "Purpose", value: "Find body, rows, and visible edges" },
              { label: "Does it produce cm?", value: "No" },
            ]} />
          ) : null}

          {activeStepId === "red-lines" ? (
            redRows.length ? (
              <div className="grid gap-2 md:grid-cols-3">
                {redRows.map((row) => (
                  <div key={row.name} className="rounded-lg border border-red-200 bg-white p-3">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-red-700">{rowName(row.name)}</div>
                    <div className="mt-1 font-mono text-2xl font-semibold">{Math.abs(row.rightX - row.leftX).toFixed(0)} px</div>
                    <div className="mt-1 font-mono text-[10px] text-text-secondary">x {row.leftX.toFixed(0)} → {row.rightX.toFixed(0)} · y {row.y.toFixed(0)}</div>
                  </div>
                ))}
              </div>
            ) : <Pending text="Run Analyze to create the red rows." />
          ) : null}

          {activeStepId === "apple-3d" ? (
            appleResult ? (
              <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.85fr)]">
                <AppleVisionSkeleton3D joints={appleResult.joints} bodyDistanceM={appleResult.bodyDistanceM} />
                <ValueGrid values={[
                  { label: "3D output", value: `${appleResult.jointCount} skeleton joints` },
                  { label: "Height rescale", value: `${(appleResult.referenceBodyHeightM * 100).toFixed(1)} → ${appleResult.inputHeightCm.toFixed(2)} cm` },
                  { label: "Body distance", value: `${appleResult.bodyDistanceM.toFixed(3)} m · model estimate` },
                  { label: "Focal X", value: `${appleResult.estimatedFocalXPx.toFixed(0)} px · solved estimate` },
                  { label: "Projection fit", value: `±${appleResult.reprojectionRmseXPx.toFixed(1)} px X · ±${appleResult.reprojectionRmseYPx.toFixed(1)} px Y` },
                  { label: "Geometry gate", value: appleResult.geometryQuality.toUpperCase() },
                ]} />
              </div>
            ) : <Pending text="Apple Vision is calculating the 17-joint skeleton." />
          ) : null}

          {activeStepId === "scale" ? (
            appleResult ? (
              <div>
                <div className="mb-2 rounded-lg border border-violet-200 bg-violet-50 px-3 py-2 font-mono text-xs text-violet-950">
                  Apple proposes camera geometry and row depth. This proposal is not active until the person-mask Depth Pro surface agrees at all three rows.
                </div>
                <div className="grid gap-2 md:grid-cols-3">
                  {appleResult.rows.map((row) => (
                    <div key={row.name} className="rounded-lg border border-violet-200 bg-white p-3">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-violet-700">{rowName(row.name)}</div>
                      <div className="mt-1 font-mono text-2xl font-semibold">{row.frontPlaneWidthCm.toFixed(2)} cm</div>
                      <div className="mt-1 font-mono text-[10px] text-text-secondary">{row.pixelSpan.toFixed(0)} px × {row.cmPerPx.toFixed(6)} cm/px</div>
                      <div className="mt-1 text-[10px] text-text-secondary">body depth {row.bodyDepthM.toFixed(3)} m</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : <Pending text="Apple body scale is not ready." />
          ) : null}

          {activeStepId === "depth-pro" ? (
            bodySurfaceResult && appleResult ? (
              <div>
                <div className="grid gap-2 md:grid-cols-3">
                  {appleResult.rows.map((appleRow) => {
                    const depthRow = bodySurfaceResult.rows.find((row) => row.name === appleRow.name);
                    const agreement = depthRow?.valid ? ((depthRow.predictedWidthCm / appleRow.frontPlaneWidthCm) - 1) * 100 : null;
                    const accepted = Boolean(depthRow?.valid && agreement != null && Math.abs(agreement) <= 2);
                    return (
                      <div key={appleRow.name} className={`rounded-lg border-2 bg-white p-3 ${accepted ? "border-emerald-300" : "border-red-300"}`}>
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-blue-700">{rowName(appleRow.name)}</div>
                        <div className="mt-1 font-mono text-lg font-semibold">{depthRow?.valid ? `${depthRow.predictedWidthCm.toFixed(2)} cm` : "REJECTED"}</div>
                        <div className="mt-1 text-[10px] text-text-secondary">Apple proposal {appleRow.frontPlaneWidthCm.toFixed(2)} cm</div>
                        <div className="mt-1 font-mono text-[10px]">agreement {agreement == null ? "n/a" : `${agreement > 0 ? "+" : ""}${agreement.toFixed(2)}%`} · {accepted ? "PASS" : "FAIL"}</div>
                        <div className="mt-1 font-mono text-[9px] text-text-secondary">
                          mask {depthRow ? `${depthRow.bodyMaskCoveragePct.toFixed(0)}%` : "n/a"} · spread {depthRow ? `${depthRow.depthSpreadPct.toFixed(1)}%` : "n/a"} · L/R {depthRow ? `${depthRow.edgeDepthAsymmetryPct.toFixed(1)}%` : "n/a"}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-2 text-xs font-semibold text-text-secondary">This reads only person-mask pixels near each red edge. It still does not reveal the back of the body.</div>
              </div>
            ) : <Pending text="Depth Pro is reading the person-mask surfaces. Tape handles are not used for this body result." />
          ) : null}

          {activeStepId === "depth-ratio" ? (
            measurement ? (
              <div>
                <div className="grid gap-2 md:grid-cols-3">
                  {measurement.rows.map((row) => (
                    <div key={row.kind} className="rounded-lg border border-amber-200 bg-white p-3">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-amber-800">{rowName(row.kind)}</div>
                      <div className="mt-1 font-mono text-2xl font-semibold">{row.depthRatio.toFixed(3)}</div>
                      <div className="mt-1 font-mono text-[10px] text-text-secondary">{row.formulaWidthCm.toFixed(1)} cm width → {row.depthCm.toFixed(1)} cm estimated depth</div>
                      <div className="mt-1 text-[10px] text-text-secondary">source: {row.depthSource}</div>
                    </div>
                  ))}
                </div>
                <div className="mt-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-950">This is the uncertain step. A front photo cannot see body thickness or the back surface.</div>
              </div>
            ) : <Pending text="LOCKED · body front-width scale must pass before thickness is estimated." />
          ) : null}

          {activeStepId === "result" ? (
            measurement ? (
              <div className="grid gap-2 md:grid-cols-3">
                {measurement.rows.map((row) => {
                  const target = targetFor(row.kind);
                  const difference = target == null ? null : row.guidedCm - target;
                  return (
                    <div key={row.kind} className="rounded-lg border border-emerald-200 bg-white p-3">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-emerald-800">{rowName(row.kind)}</div>
                      <div className="mt-1 font-mono text-3xl font-semibold">{row.guidedCm.toFixed(1)} cm</div>
                      <div className="mt-1 text-xs text-text-secondary">ellipse(width {row.formulaWidthCm.toFixed(1)}, estimated depth {row.depthCm.toFixed(1)})</div>
                      {target == null ? null : (
                        <div className="mt-2 rounded bg-slate-50 px-2 py-1 font-mono text-xs">known {target.toFixed(2)} cm · diff {formatSigned(difference!)}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : <Pending text="LOCKED · no circumference output until the body scale passes." />
          ) : null}
        </div>
      </div>
    </section>
  );
}

function ValueGrid({ values }: { values: Array<{ label: string; value: string }> }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {values.map((item) => (
        <div key={item.label} className="rounded-lg border border-gray-200 bg-white p-3">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-text-hint">{item.label}</div>
          <div className="mt-1 font-mono text-sm font-semibold text-text-primary">{item.value}</div>
        </div>
      ))}
    </div>
  );
}

function EvidenceBadge({ value }: { value: "provided" | "measured" | "model" | "estimated" }) {
  const label = value === "provided" ? "Provided fact" : value === "measured" ? "Pixel measurement" : value === "model" ? "Model estimate" : "Statistical estimate";
  const className = value === "provided"
    ? "border-slate-300 bg-slate-100 text-slate-800"
    : value === "measured"
      ? "border-red-200 bg-red-50 text-red-800"
      : value === "model"
        ? "border-violet-200 bg-violet-50 text-violet-800"
        : "border-amber-200 bg-amber-50 text-amber-900";
  return <span className={`rounded-full border px-2 py-1 text-[10px] font-semibold ${className}`}>{label}</span>;
}

function Pending({ text }: { text: string }) {
  return <div className="rounded-lg border border-dashed border-gray-300 bg-white px-3 py-8 text-center text-sm text-text-secondary">{text}</div>;
}

function rowName(name: AppleVisionBodyRowName): string {
  return name === "waist" ? "Natural waist" : name === "trouserWaist" ? "Trouser waist" : "Hips";
}

function formatSigned(value: number): string {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)} cm`;
}
