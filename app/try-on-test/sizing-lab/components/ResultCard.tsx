"use client";

import type { WaistTrace } from "../types";
import type { GeminiCalibrationRow } from "../lib/geminiMaskCalibration";
import type { GeminiGuideMeasurementRow } from "../lib/geminiGuide";

interface Props {
  trace: WaistTrace | null;
  actualWaistCm?: number;
  actualTrouserWaistCm?: number;
  calibration?: GeminiCalibrationRow | null;
  trouserCalibration?: GeminiCalibrationRow | null;
  guide?: GeminiGuideMeasurementRow | null;
  trouserGuide?: GeminiGuideMeasurementRow | null;
}

export function ResultCard({ trace, actualWaistCm, actualTrouserWaistCm, calibration, trouserCalibration, guide, trouserGuide }: Props) {
  const displayedWaistCm = trace ? guide?.guidedCm ?? calibration?.calibratedCm ?? trace.finalNaturalWaistCm : 0;
  const displayedTrouserCm = trace ? trouserGuide?.guidedCm ?? trouserCalibration?.calibratedCm ?? trace.finalTrouserWaistCm : 0;
  const naturalDiffCm = trace && actualWaistCm ? displayedWaistCm - actualWaistCm : null;
  const trouserDiffCm = trace && actualTrouserWaistCm ? displayedTrouserCm - actualTrouserWaistCm : null;
  const guideMeasurementSource = guide ? formatGuideEndpointSource(guide) : "";
  const trouserGuideMeasurementSource = trouserGuide ? formatGuideEndpointSource(trouserGuide) : "";
  const hasCoordinateGuide = Boolean(guide || trouserGuide);
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-text-primary mb-3">
        Waist results · {hasCoordinateGuide ? "coordinate guide" : "mask trace"}
      </h3>
      {!trace ? (
        <p className="text-sm text-text-secondary">Upload a photo and enter metrics to compute.</p>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <ResultValue label="Natural waist" valueCm={displayedWaistCm} accent="blue" />
            <ResultValue label="Trouser waist" valueCm={displayedTrouserCm} accent="emerald" />
          </div>
          {actualWaistCm || actualTrouserWaistCm ? (
            <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
              {actualWaistCm ? (
                <>
                  <Stat label="Natural target" value={formatCmIn(actualWaistCm)} />
                  <Stat label="Natural diff" value={formatSignedCmIn(naturalDiffCm ?? 0)} />
                </>
              ) : null}
              {actualTrouserWaistCm ? (
                <>
                  <Stat label="Trouser target" value={formatCmIn(actualTrouserWaistCm)} />
                  <Stat label="Trouser diff" value={formatSignedCmIn(trouserDiffCm ?? 0)} />
                </>
              ) : null}
            </div>
          ) : null}
          <details className="rounded-lg border border-gray-100 bg-gray-50/60 px-3 py-2">
            <summary className="cursor-pointer text-xs font-semibold text-text-secondary">
              Natural waist details
            </summary>
            <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
              <Stat label="Result source" value={guide ? "coordinate guide" : calibration ? "Gemini calibrated" : "raw lab formula"} />
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
              {calibration ? (
                <>
                  <Stat label="Raw Gemini waist" value={`${calibration.rawCm.toFixed(1)} cm`} />
                  <Stat label="Gemini waist width" value={`${calibration.geminiWidthCm.toFixed(1)} cm`} />
                  <Stat label="Original clean width" value={`${calibration.originalCleanWidthCm.toFixed(1)} cm`} />
                  <Stat label="Calibrated waist" value={`${calibration.calibratedCm.toFixed(1)} cm`} />
                </>
              ) : null}
              <Stat label="Natural mask width" value={trace.naturalWaistMaskWidthCm > 0 ? `${trace.naturalWaistMaskWidthCm} cm` : "—"} />
              <Stat label="Natural ellipse" value={`${trace.naturalWaistCm} cm`} />
            </div>
          </details>
          <details className="rounded-lg border border-gray-100 bg-gray-50/60 px-3 py-2">
            <summary className="cursor-pointer text-xs font-semibold text-text-secondary">
              Trouser waist details
            </summary>
            <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
              <Stat label="Result source" value={trouserGuide ? "coordinate guide" : trouserCalibration ? "Gemini calibrated" : "raw lab formula"} />
              {trouserGuide ? (
                <>
                  <Stat label="Row source" value={formatGuideRowSource(trouserGuide.rowSource)} />
                  <Stat label="Trouser guide source" value={trouserGuideMeasurementSource} />
                  <Stat label="Trouser formula width" value={`${trouserGuide.formulaWidthCm.toFixed(1)} cm`} />
                  <Stat label={formatRawGuideWidthLabel(trouserGuide)} value={`${trouserGuide.geminiWidthCm.toFixed(1)} cm`} />
                  <Stat label="Trouser depth source" value={formatGuideDepthSource(trouserGuide.depthSource)} />
                  <Stat label="Trouser guide depth ratio" value={trouserGuide.depthRatio.toFixed(3)} />
                  <Stat label="Trouser guide depth" value={`${trouserGuide.depthCm.toFixed(1)} cm`} />
                  <Stat label="Trouser curve horizontal" value={`${trouserGuide.curveHorizontalCm.toFixed(1)} cm`} />
                  <Stat label="Trouser curve arc" value={`${trouserGuide.curveArcCm.toFixed(1)} cm`} />
                  <Stat label="Trouser arc adds" value={formatSignedCm(trouserGuide.curveArcDeltaCm)} />
                  <Stat label="MediaPipe mask width at row" value={trouserGuide.maskWidthCm == null ? "—" : `${trouserGuide.maskWidthCm.toFixed(1)} cm`} />
                  <Stat label="Trouser guide confidence" value={trouserGuide.confidence.toFixed(2)} />
                  <Stat label="Trouser guide correction" value={formatSignedCm(trouserGuide.circumferenceDeltaCm)} />
                </>
              ) : null}
              {trouserCalibration ? (
                <>
                  <Stat label="Raw Gemini trouser" value={`${trouserCalibration.rawCm.toFixed(1)} cm`} />
                  <Stat label="Calibrated trouser" value={`${trouserCalibration.calibratedCm.toFixed(1)} cm`} />
                  <Stat label="Trouser correction" value={formatSignedCm(trouserCalibration.circumferenceDeltaCm)} />
                </>
              ) : null}
              <Stat label="Trouser mask width" value={trace.trouserWaistMaskWidthCm > 0 ? `${trace.trouserWaistMaskWidthCm} cm` : "—"} />
              <Stat label="Raw lab trouser formula" value={`${trace.finalTrouserWaistIn} in / ${trace.finalTrouserWaistCm} cm`} />
            </div>
          </details>
          <details className="rounded-lg border border-gray-100 bg-gray-50/60 px-3 py-2">
            <summary className="cursor-pointer text-xs font-semibold text-text-secondary">
              Lab trace
            </summary>
            <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
              <Stat label="Mask path" value={trace.maskMode === "ignore-arms" ? "row cleanup (arms/hair ignored)" : "raw silhouette"} />
              <Stat label="Front scale source" value={trace.scaleSource ?? "pose-landmarks"} />
              <Stat label="Hip bone width" value={`${trace.hipBoneCm} cm`} />
              <Stat label="Mask threshold" value={trace.maskThreshold ? String(trace.maskThreshold) : "—"} />
              <Stat label="Depth source" value={trace.naturalWaistDepthSource === "side-mask" ? "side ratio" : "front estimate"} />
              <Stat label="Side scale source" value={trace.sideScaleSource ?? "—"} />
              <Stat label="Side cm/px" value={trace.sideCmPerPx ? `${trace.sideCmPerPx}` : "—"} />
              <Stat label="Side body span" value={trace.sideNoseToAnkleNormY ? `${trace.sideNoseToAnkleNormY} of ${trace.sideImageHeight}px` : "—"} />
              <Stat label="Raw side waist depth" value={trace.sideNaturalWaistDepthCm > 0 ? `${trace.sideNaturalWaistDepthCm} cm` : "—"} />
              <Stat label="Corrected waist depth" value={trace.sideNaturalWaistCorrectedDepthCm ? `${trace.sideNaturalWaistCorrectedDepthCm} cm` : "—"} />
              <Stat label="Raw side waist ratio" value={trace.sideNaturalWaistRawDepthRatio != null ? trace.sideNaturalWaistRawDepthRatio.toFixed(3) : "—"} />
              <Stat label="Corrected waist ratio" value={trace.sideNaturalWaistCorrectedDepthRatio != null ? trace.sideNaturalWaistCorrectedDepthRatio.toFixed(3) : "—"} />
              <Stat label="Raw side trouser depth" value={trace.sideTrouserWaistDepthCm > 0 ? `${trace.sideTrouserWaistDepthCm} cm` : "—"} />
              <Stat label="Corrected trouser depth" value={trace.sideTrouserWaistCorrectedDepthCm ? `${trace.sideTrouserWaistCorrectedDepthCm} cm` : "—"} />
              <Stat label="Projection leak" value={trace.sideNaturalWaistProjectionLeakRatio != null ? trace.sideNaturalWaistProjectionLeakRatio.toFixed(3) : "—"} />
              <Stat label="Natural depth ratio" value={trace.naturalWaistDepthRatio.toFixed(3)} />
              <Stat label="Natural depth" value={`${trace.naturalWaistDepthCm} cm`} />
              <Stat label="Z-depth" value={`ignored (${trace.zDepthCm} cm raw)`} />
            </div>
          </details>
        </div>
      )}
    </div>
  );
}

function formatSignedCm(value: number): string {
  return `${value > 0 ? "+" : ""}${value.toFixed(1)} cm`;
}

function formatCmIn(value: number): string {
  return `${value.toFixed(1)} cm / ${(value / 2.54).toFixed(1)} in`;
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
  if (row.formulaWidthSource === "local-ml-v1") return "Local ML endpoints";
  if (row.formulaWidthSource === "fallback-line") return "fallback line endpoints";
  return "model JSON curve";
}

function formatRawGuideWidthLabel(row: GeminiGuideMeasurementRow): string {
  if (row.formulaWidthSource === "gemini-red-line") return "Detected red-line width";
  if (row.formulaWidthSource === "manual-coordinates") return "Manual endpoint width";
  if (row.formulaWidthSource === "local-ml-v1") return "Local ML endpoint width";
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
  if (source === "wear-depth-ratio-formula") return "WEAR depth-ratio formula";
  return "front formula";
}

function formatSignedCmIn(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)} cm / ${sign}${(value / 2.54).toFixed(1)} in`;
}

function ResultValue({ label, valueCm, accent }: { label: string; valueCm: number; accent: "blue" | "emerald" }) {
  const color = accent === "emerald" ? "text-emerald-600" : "text-brand-blue";
  return (
    <div className="rounded-xl bg-gray-50 px-3 py-3">
      <div className="text-[10px] uppercase tracking-wider text-text-hint">{label}</div>
      <div className={`mt-1 text-3xl font-bold tabular-nums ${color}`}>
        {(valueCm / 2.54).toFixed(1)} in
      </div>
      <div className="font-mono text-sm text-text-secondary">{valueCm.toFixed(1)} cm</div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg px-3 py-2">
      <div className="text-text-hint text-[10px] uppercase tracking-wider">{label}</div>
      <div className="text-text-primary font-mono text-sm tabular-nums whitespace-nowrap">{value}</div>
    </div>
  );
}
