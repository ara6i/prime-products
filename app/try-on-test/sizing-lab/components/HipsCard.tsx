"use client";

import type { HipsTrace } from "../lib/hipsFormula";
import type { GeminiCalibrationRow } from "../lib/geminiMaskCalibration";
import type { GeminiGuideMeasurementRow } from "../lib/geminiGuide";

interface Props {
  trace: HipsTrace | null;
  actualHipsCm?: number;
  calibration?: GeminiCalibrationRow | null;
  guide?: GeminiGuideMeasurementRow | null;
}

export function HipsCard({ trace, actualHipsCm, calibration, guide }: Props) {
  const displayedHipsCm = trace ? guide?.guidedCm ?? calibration?.calibratedCm ?? trace.hipsCm : 0;
  const diffCm = trace && actualHipsCm ? displayedHipsCm - actualHipsCm : null;
  const guideMeasurementSource = guide ? formatGuideEndpointSource(guide) : "";
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-text-primary mb-3">
        Hips <span className="text-text-hint text-xs font-normal">· {guide ? "coordinate guide" : "lab trace"}{trace ? ` (${trace.gender})` : ""}</span>
      </h3>
      {!trace ? (
        <p className="text-sm text-text-secondary">Run Analyze to compute.</p>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl bg-gray-50 px-3 py-3">
            <div className="text-[10px] uppercase tracking-wider text-text-hint">Hips</div>
            <div className={`mt-1 text-3xl font-bold tabular-nums ${trace.gender === "female" ? "text-pink-600" : "text-brand-blue"}`}>
              {(displayedHipsCm / 2.54).toFixed(1)} in
            </div>
            <div className="font-mono text-sm text-text-secondary">{displayedHipsCm.toFixed(1)} cm</div>
          </div>
          {actualHipsCm ? (
            <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
              <Stat label="Dataset hips" value={`${actualHipsCm.toFixed(1)} cm / ${(actualHipsCm / 2.54).toFixed(1)} in`} />
              <Stat label="Hips diff" value={formatSignedCmIn(diffCm ?? 0)} />
            </div>
          ) : null}
          {guide ? (
            <div className="grid grid-cols-2 gap-3 text-xs">
              <Stat label="Row source" value={formatGuideRowSource(guide.rowSource)} />
              <Stat label="Endpoint source" value={guideMeasurementSource} />
              <Stat label="Confidence" value={guide.confidence.toFixed(2)} />
              <Stat label="Width" value={`${guide.formulaWidthCm.toFixed(1)} cm`} />
              <Stat label="Depth source" value={formatGuideDepthSource(guide.depthSource)} />
              <Stat label="Correction" value={formatSignedCm(guide.circumferenceDeltaCm)} />
            </div>
          ) : null}
          {!actualHipsCm ? (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
              No dataset hips target exists for this person, so this card can show the coordinate-guide result but not a hips diff.
            </p>
          ) : null}
          <details className="rounded-lg border border-gray-100 bg-gray-50/60 px-3 py-2">
            <summary className="cursor-pointer text-xs font-semibold text-text-secondary">
              Hips details
            </summary>
            <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
              <Stat label="Result source" value={guide ? "coordinate guide" : calibration ? "Gemini calibrated" : "raw lab formula"} />
              <Stat label="BMI" value={trace.bmi.toFixed(2)} />
              <Stat
                label="Method"
                value={
                  trace.method === "front-side-mask"
                    ? "front + side mask"
                    : trace.method === "front-only-estimate"
                      ? "front-only estimate"
                      : "landmark fallback"
                }
              />
              <Stat label="Hip bone (landmark)" value={`${trace.hipBoneCm} cm`} />
              <Stat label="Hip mask width" value={trace.hipMaskWidthCm > 0 ? `${trace.hipMaskWidthCm} cm` : "—"} />
              {calibration ? (
                <>
                  <Stat label="Raw Gemini hips" value={`${calibration.rawCm.toFixed(1)} cm`} />
                  <Stat label="Gemini hip width" value={`${calibration.geminiWidthCm.toFixed(1)} cm`} />
                  <Stat label="Original clean width" value={`${calibration.originalCleanWidthCm.toFixed(1)} cm`} />
                  <Stat label="Width correction" value={formatSignedCm(calibration.widthDeltaCm)} />
                  <Stat label="Calibrated hips" value={`${calibration.calibratedCm.toFixed(1)} cm`} />
                  <Stat label="Hip correction" value={formatSignedCm(calibration.circumferenceDeltaCm)} />
                </>
              ) : null}
              {guide ? (
                <>
                  <Stat label="Row source" value={formatGuideRowSource(guide.rowSource)} />
                  <Stat label="Measurement source" value={guideMeasurementSource} />
                  <Stat label="Formula width" value={`${guide.formulaWidthCm.toFixed(1)} cm`} />
                  <Stat label={formatRawGuideWidthLabel(guide)} value={`${guide.geminiWidthCm.toFixed(1)} cm`} />
                  <Stat label="Guide depth source" value={formatGuideDepthSource(guide.depthSource)} />
                  <Stat label="Guide depth ratio" value={guide.depthRatio.toFixed(3)} />
                  <Stat label="Guide depth" value={`${guide.depthCm.toFixed(1)} cm`} />
                  <Stat label="Curve horizontal" value={`${guide.curveHorizontalCm.toFixed(1)} cm`} />
                  <Stat label="Curve arc" value={`${guide.curveArcCm.toFixed(1)} cm`} />
                  <Stat label="Arc adds" value={formatSignedCm(guide.curveArcDeltaCm)} />
                  <Stat label="MediaPipe mask width at row" value={guide.maskWidthCm == null ? "—" : `${guide.maskWidthCm.toFixed(1)} cm`} />
                  <Stat label="Guide confidence" value={guide.confidence.toFixed(2)} />
                  <Stat label="Guide correction" value={formatSignedCm(guide.circumferenceDeltaCm)} />
                </>
              ) : null}
              <Stat label="Side hip depth" value={trace.sideHipDepthCm > 0 ? `${trace.sideHipDepthCm} cm` : "—"} />
              <Stat label="Mask threshold" value={trace.maskThreshold ? String(trace.maskThreshold) : "—"} />
              {trace.details.map((d) => (
                <Stat key={d.label} label={d.label} value={d.value} />
              ))}
              <Stat label="Hip breadth" value={`${trace.hipBreadthCm} cm`} />
              <Stat label="Hip depth" value={`${trace.hipDepthCm} cm`} />
              <Stat label="Raw lab hip formula" value={`${trace.hipsCm} cm`} />
            </div>
          </details>
          <details className="rounded-lg border border-gray-100 bg-gray-50/60 px-3 py-2">
            <summary className="cursor-pointer text-xs font-semibold text-text-secondary">Formula</summary>
            <pre className="mt-2 font-mono text-[11px] text-text-primary whitespace-pre-wrap">
{trace.formula}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}

function formatSignedCm(value: number): string {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)} cm`;
}

function formatSignedCmIn(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)} cm / ${sign}${(value / 2.54).toFixed(1)} in`;
}

function formatGuideRowSource(source: GeminiGuideMeasurementRow["rowSource"]): string {
  if (source === "red-pixel-detector") return "red-pixel detector";
  if (source === "manual-coordinate") return "manual coordinate";
  if (source === "manual-adjusted-coordinate") return "manual adjusted";
  if (source === "pose-mask-fallback") return "pose/mask fallback";
  return "model JSON";
}

function formatGuideEndpointSource(row: GeminiGuideMeasurementRow): string {
  if (row.formulaWidthSource === "gemini-red-line") return "detected red pixels";
  if (row.formulaWidthSource === "manual-coordinates") return "manual endpoints";
  if (row.formulaWidthSource === "fallback-line") return "fallback line endpoints";
  return "model JSON curve";
}

function formatRawGuideWidthLabel(row: GeminiGuideMeasurementRow): string {
  if (row.formulaWidthSource === "gemini-red-line") return "Detected red-line width";
  if (row.formulaWidthSource === "manual-coordinates") return "Manual endpoint width";
  if (row.formulaWidthSource === "fallback-line") return "Fallback endpoint width";
  return "JSON curve width";
}

function formatGuideDepthSource(source: GeminiGuideMeasurementRow["depthSource"]): string {
  if (source === "side-mask-at-guide-row") return "side photo";
  if (source === "side-guide-red-pixel") return "side guide red pixels";
  if (source === "side-guide-json") return "side guide JSON";
  if (source === "side-guide-manual-coordinate") return "side guide manual coordinate";
  if (source === "manual-tape-front-formula") return "manual tape front formula";
  if (source === "manual-depth-ratio") return "manual depth ratio";
  return "front formula";
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg px-3 py-2">
      <div className="text-text-hint text-[10px] uppercase tracking-wider">{label}</div>
      <div className="text-text-primary font-mono text-sm tabular-nums whitespace-nowrap">{value}</div>
    </div>
  );
}
