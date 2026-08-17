"use client";

import { useMemo, useState } from "react";
import type { LocalMlNormalizedRowPrediction } from "../lib/localMlSizing";
import { cmToIn } from "../lib/units";

interface Point {
  x: number;
  y: number;
}

interface SavedSample {
  key: string;
  label: string;
  expectedCm: number;
  pixelSpan: number;
  withoutAppleCm: number;
  withAppleCm: number | null;
}

interface Props {
  proofKey: string;
  expectedCm: number;
  intervalValue: number;
  unit: "cm" | "in";
  imageUrl: string | null;
  imageWidth: number;
  imageHeight: number;
  start: Point;
  end: Point;
  pixelSpan: number;
  freeStart: Point;
  freeEnd: Point;
  freePixelSpan: number;
  freeRulerPurpose: "free" | "floor-height";
  freeExpectedCm: number;
  freeUnit: "cm" | "in";
  floorReferenceY: number | null;
  wearRowPredictions?: LocalMlNormalizedRowPrediction[];
  freeFlatCm: number | null;
  freeFusedCm: number | null;
  flatCm: number | null;
  fusedCm: number | null;
  fusedStatus: "idle" | "loading" | "ready" | "error";
  fusedError: string | null;
  fusedElapsedMs: number;
  fusedPathEvidence: "colour-mask" | "ocr-position-only" | null;
  tapeVisionCm: number | null;
  tapeVisionStartValue: number | null;
  tapeVisionEndValue: number | null;
  tapeVisionUnit: "cm" | "in";
  tapeVisionStatus: "idle" | "loading" | "ready" | "error";
  tapeVisionError: string | null;
  tapeVisionElapsedMs: number;
  tapeVisionModel: string | null;
  appleOnlyCm: number | null;
  appleOnlyAssumedDepthM: number | null;
  appleOnlyStartDepthM: number | null;
  appleOnlyEndDepthM: number | null;
  appleOnlyBodyPlaneTiltDeg: number | null;
  appleGeometryQuality: "pass" | "check" | "reject" | null;
  canSnapToTape: boolean;
  onSnapToTape: () => void;
  onRetryTapeVision: () => void;
  onRetryFused: () => void;
  onPlaceFreeRulerBesideTape: () => void;
  onFloorTargetCmChange: (valueCm: number) => void;
  onFloorUnitChange: (unit: "cm" | "in") => void;
  onPlaceFreeRulerFromFloor: (targetCm?: number) => void;
  applyAppleCorrection: boolean;
  onApplyAppleCorrectionChange: (checked: boolean) => void;
}

export function FullScreenGreenRulerComparison({
  proofKey,
  expectedCm,
  intervalValue,
  unit,
  imageUrl,
  imageWidth,
  imageHeight,
  start,
  end,
  pixelSpan,
  freeStart,
  freeEnd,
  freePixelSpan,
  freeRulerPurpose,
  freeExpectedCm,
  freeUnit,
  floorReferenceY,
  wearRowPredictions = [],
  freeFlatCm,
  freeFusedCm,
  flatCm,
  fusedCm,
  fusedStatus,
  fusedError,
  fusedElapsedMs,
  fusedPathEvidence,
  tapeVisionCm,
  tapeVisionStartValue,
  tapeVisionEndValue,
  tapeVisionUnit,
  tapeVisionStatus,
  tapeVisionError,
  tapeVisionElapsedMs,
  tapeVisionModel,
  appleOnlyCm,
  appleOnlyAssumedDepthM,
  appleOnlyStartDepthM,
  appleOnlyEndDepthM,
  appleOnlyBodyPlaneTiltDeg,
  appleGeometryQuality,
  canSnapToTape,
  onSnapToTape,
  onRetryTapeVision,
  onRetryFused,
  onPlaceFreeRulerBesideTape,
  onFloorTargetCmChange,
  onFloorUnitChange,
  onPlaceFreeRulerFromFloor,
  applyAppleCorrection,
  onApplyAppleCorrectionChange,
}: Props) {
  const [samples, setSamples] = useState<SavedSample[]>([]);
  const [confirmedManualSignature, setConfirmedManualSignature] = useState<string | null>(null);
  const tapeJudgeReady = tapeVisionCm != null
    && expectedCm > 0
    && Math.abs(tapeVisionCm - expectedCm) <= expectedCm * 0.005;
  const canSave = tapeJudgeReady
    && flatCm != null
    && (!applyAppleCorrection || fusedCm != null);
  const intervalLabel = `${formatInputValue(Math.abs(intervalValue))} ${unit}`;
  const manualSignature = `${proofKey}:${start.x.toFixed(2)}:${start.y.toFixed(2)}:${end.x.toFixed(2)}:${end.y.toFixed(2)}`;
  const manualIntervalConfirmed = confirmedManualSignature === manualSignature;
  const appleOnlyErrorCm = appleOnlyCm == null ? null : appleOnlyCm - expectedCm;
  const appleOnlyErrorPct = appleOnlyErrorCm == null || expectedCm <= 0
    ? null
    : appleOnlyErrorCm / expectedCm * 100;
  const appleOnlyPass = manualIntervalConfirmed
    && appleGeometryQuality === "pass"
    && appleOnlyErrorPct != null
    && Math.abs(appleOnlyErrorPct) <= 2;
  const appleOnlyVerdict = !manualIntervalConfirmed || appleOnlyCm == null
    ? "WAITING"
    : appleGeometryQuality === "reject"
      ? "INVALID"
      : appleOnlyErrorPct != null && Math.abs(appleOnlyErrorPct) <= 2
        ? appleGeometryQuality === "pass" ? "PASS" : "CHECK"
        : "FAIL";
  const freeIntervalLabel = `${formatInputValue(toDisplayUnit(freeExpectedCm, freeUnit))} ${freeUnit}`;
  const floorAnchorDeltaPx = floorReferenceY == null ? null : freeEnd.y - floorReferenceY;
  const floorAnchorReady = freeRulerPurpose !== "floor-height"
    || (floorAnchorDeltaPx != null && Math.abs(floorAnchorDeltaPx) <= 2);
  const wearFloorRows = (["hips", "trouserWaist", "waist"] as const).flatMap((kind) => {
    const row = wearRowPredictions.find((candidate) => candidate.kind === kind);
    return row?.heightFromFloorCm == null ? [] : [row];
  });

  const spreads = useMemo(() => {
    if (samples.length < 2) return null;
    const withAppleValues = samples.flatMap((sample) => sample.withAppleCm == null ? [] : [sample.withAppleCm]);
    return {
      withoutAppleCm: spread(samples.map((sample) => sample.withoutAppleCm)),
      withAppleCm: spread(withAppleValues),
    };
  }, [samples]);

  const saveCurrent = () => {
    if (!canSave || flatCm == null) return;
    const label = tapeVisionStartValue != null && tapeVisionEndValue != null
      ? `${formatInputValue(tapeVisionStartValue)}→${formatInputValue(tapeVisionEndValue)} ${tapeVisionUnit}`
      : `y ${Math.round(start.y)}→${Math.round(end.y)}`;
    const sample: SavedSample = {
      key: proofKey,
      label,
      expectedCm,
      pixelSpan,
      withoutAppleCm: flatCm,
      withAppleCm: fusedCm,
    };
    setSamples((current) => {
      const existingIndex = current.findIndex((candidate) => candidate.key === proofKey);
      if (existingIndex < 0) return [...current, sample];
      return current.map((candidate, index) => index === existingIndex ? sample : candidate);
    });
  };

  const snapLabel = tapeVisionStatus === "loading"
    ? `Reading tape marks · ${formatElapsed(tapeVisionElapsedMs)}`
    : tapeVisionStatus === "error"
      ? "Retry tape scan"
      : tapeVisionStatus === "ready" && canSnapToTape
        ? `Snap exact ${intervalLabel} to tape`
        : tapeVisionStatus === "ready"
          ? "Move A inside the readable tape"
          : "Find tape marks";
  const snapStatus = tapeVisionStatus === "loading"
    ? "Apple Vision is finding the printed marks."
    : tapeVisionStatus === "error"
      ? tapeVisionError ?? "The tape marks could not be read."
      : tapeVisionStartValue != null && tapeVisionEndValue != null
        ? `Ready near ${formatInputValue(tapeVisionStartValue)} → ${formatInputValue(tapeVisionEndValue)} ${tapeVisionUnit}`
        : "Move the green handles onto the visible tape, or use snap.";

  return (
    <section data-testid="full-screen-green-ruler-comparison" className="mb-3 rounded-xl border border-slate-200 bg-white p-3 text-slate-900">
      <div className="flex flex-wrap items-start gap-3">
        <div>
          <h3 className="text-sm font-black">Manual Apple-only · {intervalLabel} tape check</h3>
          <p className="mt-1 text-[11px] font-semibold leading-4 text-blue-900">
            Drag A and B yourself. Apple camera correction is automatic. Tape OCR and Depth Pro do not enter the Apple-only answer.
          </p>
        </div>
      </div>

      <details className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-2.5">
        <summary className="cursor-pointer text-[10px] font-semibold text-slate-600">
          Optional automatic tape reader · not used by Apple-only
        </summary>
        <button
          type="button"
          disabled={tapeVisionStatus === "loading" || (tapeVisionStatus === "ready" && !canSnapToTape)}
          onClick={tapeVisionStatus === "ready" ? onSnapToTape : onRetryTapeVision}
          className="mt-3 w-full rounded-lg bg-slate-900 px-3 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-45"
        >
          {snapLabel}
        </button>
        <div className={`mt-2 text-[10px] leading-4 ${tapeVisionStatus === "error" ? "text-rose-700" : "text-slate-500"}`}>
          {snapStatus}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2" data-testid="tape-handle-closeups">
          <TapeHandleCloseup
            label="A"
            imageUrl={imageUrl}
            imageWidth={imageWidth}
            imageHeight={imageHeight}
            point={start}
            tapeValue={tapeVisionStartValue}
            tapeUnit={tapeVisionUnit}
          />
          <TapeHandleCloseup
            label="B"
            imageUrl={imageUrl}
            imageWidth={imageWidth}
            imageHeight={imageHeight}
            point={end}
            tapeValue={tapeVisionEndValue}
            tapeUnit={tapeVisionUnit}
          />
        </div>

        {tapeJudgeReady && tapeVisionCm != null ? (
          <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11px] text-emerald-900">
            Tape snap confirmed: {formatTapeValue(tapeVisionStartValue)} → {formatTapeValue(tapeVisionEndValue)} {tapeVisionUnit} = {formatDistance(tapeVisionCm, unit)}.
            The scale results below are separate predictions and may still be wrong.
          </div>
        ) : tapeVisionCm != null ? (
          <div className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
            Current printed span is {formatDistance(tapeVisionCm, unit)}. Snap exact {intervalLabel} before judging or saving the result.
          </div>
        ) : null}
      </details>

      <section
        data-testid="apple-only-blind-tape-result"
        className={`mt-3 rounded-xl border-2 p-3 ${appleOnlyPass
          ? "border-emerald-400 bg-emerald-50"
          : appleOnlyVerdict === "WAITING"
            ? "border-slate-300 bg-slate-50"
            : appleOnlyVerdict === "CHECK"
              ? "border-amber-400 bg-amber-50"
              : "border-red-400 bg-red-50"}`}
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h4 className="text-sm font-black text-slate-950">Blind Apple-only tape test</h4>
            <p className="mt-1 text-[10px] leading-4 text-slate-700">
              Apple receives only this {pixelSpan.toFixed(0)} px line, known height, and Apple camera/body geometry. It does not receive 10 cm, printed tape numbers, Depth Pro, or WEAR.
            </p>
          </div>
          <span className={`rounded-full px-2 py-1 text-[10px] font-black ${appleOnlyPass
            ? "bg-emerald-600 text-white"
            : appleOnlyVerdict === "WAITING"
              ? "bg-slate-300 text-slate-700"
              : appleOnlyVerdict === "CHECK"
                ? "bg-amber-400 text-amber-950"
                : "bg-red-600 text-white"}`}
          >
            {appleOnlyVerdict}
          </span>
        </div>
        <div className="mt-3 rounded-lg border border-blue-300 bg-blue-50 p-2.5">
          <p className="text-[10px] font-semibold leading-4 text-blue-950">
            First drag A and B onto two printed marks exactly {intervalLabel} apart. You read the tape with your eyes; Apple does not.
          </p>
          <button
            type="button"
            onClick={() => setConfirmedManualSignature(manualSignature)}
            className="mt-2 w-full rounded-lg bg-blue-700 px-3 py-2 text-[11px] font-black text-white hover:bg-blue-800"
          >
            I placed A and B exactly {intervalLabel} apart
          </button>
          {manualIntervalConfirmed ? (
            <div className="mt-2 text-center text-[10px] font-black text-emerald-700">Manual 10 cm position confirmed</div>
          ) : (
            <div className="mt-2 text-center text-[10px] font-semibold text-slate-600">Waiting for your confirmation</div>
          )}
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg bg-white p-2">
            <div className="text-[9px] text-slate-500">Your tape truth</div>
            <div className="font-mono text-base font-black text-slate-950">{manualIntervalConfirmed ? `${expectedCm.toFixed(2)} cm` : "not scored"}</div>
          </div>
          <div className="rounded-lg bg-white p-2">
            <div className="text-[9px] text-slate-500">Apple-only answer</div>
            <div className="font-mono text-base font-black text-slate-950">{appleOnlyCm == null ? "—" : `${appleOnlyCm.toFixed(2)} cm`}</div>
          </div>
          <div className="rounded-lg bg-white p-2">
            <div className="text-[9px] text-slate-500">Error</div>
            <div className="font-mono text-base font-black text-slate-950">
              {!manualIntervalConfirmed || appleOnlyErrorCm == null ? "not scored" : `${appleOnlyErrorCm >= 0 ? "+" : ""}${appleOnlyErrorCm.toFixed(2)} cm`}
            </div>
          </div>
        </div>
        <p className="mt-2 text-[10px] font-semibold leading-4 text-slate-800">
          Camera check: {appleGeometryQuality ?? "waiting"}. Full Apple ray/plane correction is applied to both endpoints
          {appleOnlyStartDepthM == null || appleOnlyEndDepthM == null
            ? ""
            : ` at ${appleOnlyStartDepthM.toFixed(3)} m → ${appleOnlyEndDepthM.toFixed(3)} m`}
          {appleOnlyBodyPlaneTiltDeg == null ? "" : ` on a ${appleOnlyBodyPlaneTiltDeg.toFixed(1)}° body plane`}.
          {appleOnlyAssumedDepthM == null ? "" : ` Average depth ${appleOnlyAssumedDepthM.toFixed(3)} m.`}
        </p>
      </section>

      <details className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-2.5">
        <summary className="cursor-pointer text-[10px] font-semibold text-slate-600">
          Optional old comparison · includes Depth Pro when enabled
        </summary>
        <label className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[11px] text-slate-700">
          <input
            type="checkbox"
            checked={applyAppleCorrection}
            onChange={(event) => onApplyAppleCorrectionChange(event.currentTarget.checked)}
            aria-label="Apply legacy Apple and Depth Pro correction"
          />
          Add old Apple + Depth Pro comparison
        </label>
        <div className={`mt-3 grid gap-2 ${applyAppleCorrection ? "sm:grid-cols-2" : "grid-cols-1"}`}>
          <RulerModelResultCard
            title="Without Apple"
            description="One flat scale from the person’s height"
            valueCm={flatCm}
            expectedCm={expectedCm}
            unit={unit}
            judgeReady={tapeJudgeReady}
          />
          {applyAppleCorrection ? (
            <RulerModelResultCard
              title="Apple + Depth Pro · not Apple-only"
              description="Known height + Apple 3D + Depth Pro; printed tape values excluded"
              valueCm={fusedCm}
              expectedCm={expectedCm}
              unit={unit}
              judgeReady={tapeJudgeReady}
              status={fusedStatus}
              error={fusedError}
              elapsedMs={fusedElapsedMs}
              onRetry={onRetryFused}
            />
          ) : null}
        </div>
      </details>

      <section data-testid="free-ruler-result" className="mt-3 rounded-lg border border-sky-200 bg-sky-50/60 p-3">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h4 className="text-[11px] font-medium text-slate-800">
              {freeRulerPurpose === "floor-height" ? "Height from floor · blue C–D ruler" : "Free ruler · blue C–D line"}
            </h4>
            <p className="mt-1 text-[10px] leading-4 text-slate-600">
              {freeRulerPurpose === "floor-height"
                ? "D is the floor/sole-contact point. C is the height point. This uses the exact same without-Apple and with-Apple calculations as the normal blue free ruler."
                : `It never reads tape labels. Put it beside the tape on the same physical plane and see whether it measures the ${intervalLabel} target.`}
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => onPlaceFreeRulerFromFloor()}
              className="rounded-lg border border-cyan-300 bg-cyan-50 px-2.5 py-1.5 text-[10px] font-medium text-cyan-900 hover:bg-cyan-100"
            >
              Measure from floor
            </button>
            <button
              type="button"
              onClick={onPlaceFreeRulerBesideTape}
              className="rounded-lg border border-sky-300 bg-white px-2.5 py-1.5 text-[10px] font-medium text-sky-800 hover:bg-sky-100"
            >
              Place beside tape
            </button>
          </div>
        </div>
        {wearFloorRows.length ? (
          <div data-testid="wear-floor-ruler-shortcuts" className="mt-2 rounded-lg border-2 border-cyan-300 bg-cyan-50 p-2.5">
            <div className="text-[11px] font-semibold text-cyan-950">WEAR 1D · start at the feet and go up</div>
            <div className="mt-1 text-[10px] leading-4 text-cyan-900">
              Pick a body part. The blue ruler will start at the cyan floor and show the height WEAR expects.
            </div>
            <div className="mt-2 grid gap-1.5">
              {wearFloorRows.map((row, index) => {
                const heightFromFloorCm = row.heightFromFloorCm!;
                const active = freeRulerPurpose === "floor-height" && Math.abs(freeExpectedCm - heightFromFloorCm) < 0.05;
                const label = row.kind === "hips" ? "Hips" : row.kind === "trouserWaist" ? "Trouser waist" : "Natural waist";
                return (
                  <button
                    key={row.kind}
                    type="button"
                    onClick={() => {
                      onFloorTargetCmChange(heightFromFloorCm);
                      onPlaceFreeRulerFromFloor(heightFromFloorCm);
                    }}
                    className={`grid grid-cols-[1.25rem_minmax(0,1fr)_auto] items-center gap-2 rounded-lg border px-2.5 py-2 text-left ${active ? "border-cyan-600 bg-cyan-100" : "border-cyan-200 bg-white hover:bg-cyan-100"}`}
                  >
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-700 text-[10px] font-semibold text-white">{index + 1}</span>
                    <span>
                      <span className="block text-[11px] font-medium text-slate-900">{label}</span>
                      <span className="block text-[9px] text-slate-500">ML guess · historical test: 90% within {row.validationP90At170Cm?.toFixed(1) ?? "n/a"} cm</span>
                    </span>
                    <span className="text-right font-mono">
                      <span className="block text-base font-semibold text-slate-950">{heightFromFloorCm.toFixed(1)} cm</span>
                      <span className="block text-[9px] text-slate-500">{cmToIn(heightFromFloorCm).toFixed(1)} in</span>
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-2 text-[9px] leading-4 text-cyan-900">
              Row height only—not the red-line width and not body circumference.
            </p>
          </div>
        ) : null}
        {freeRulerPurpose === "floor-height" ? (
          <div className="mt-2 rounded-lg border border-cyan-200 bg-white p-2.5">
            <label className="flex items-center justify-between gap-3 text-[10px] text-slate-700">
              <span>Target height from floor</span>
              <span className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={freeUnit === "in" ? 0.04 : 0.1}
                  step={freeUnit === "in" ? 0.1 : 0.5}
                  value={toDisplayUnit(freeExpectedCm, freeUnit).toFixed(freeUnit === "in" ? 2 : 1)}
                  onChange={(event) => {
                    const next = Number(event.currentTarget.value);
                    if (!Number.isFinite(next) || next <= 0) return;
                    onFloorTargetCmChange(freeUnit === "in" ? next * 2.54 : next);
                  }}
                  aria-label={`Height from floor target (${freeUnit})`}
                  className="h-8 w-24 rounded-md border border-cyan-200 bg-white px-2 font-mono text-sm text-slate-900"
                />
                <span className="flex overflow-hidden rounded-md border border-cyan-200 bg-cyan-50">
                  {(["cm", "in"] as const).map((candidate) => (
                    <button
                      key={candidate}
                      type="button"
                      onClick={() => onFloorUnitChange(candidate)}
                      className={`px-2 py-1.5 font-mono text-[10px] ${freeUnit === candidate ? "bg-cyan-700 text-white" : "text-cyan-900 hover:bg-cyan-100"}`}
                    >
                      {candidate}
                    </button>
                  ))}
                </span>
              </span>
            </label>
            <button
              type="button"
              onClick={() => onPlaceFreeRulerFromFloor()}
              className="mt-2 w-full rounded-lg bg-cyan-700 px-3 py-2 text-[11px] font-medium text-white hover:bg-cyan-800"
            >
              Place blue ruler at {freeIntervalLabel} from floor
            </button>
            <p className="mt-2 rounded-md bg-sky-50 px-2 py-1.5 text-[10px] leading-4 text-sky-900">
              This button gives a starting position from the flat height scale. Keep D on the floor and drag only C until the result you trust—without Apple or with Apple—reads {freeIntervalLabel}.
            </p>
            <div className={`mt-2 text-[10px] leading-4 ${floorAnchorReady ? "text-emerald-700" : "text-rose-700"}`}>
              Floor is the cyan line at y {floorReferenceY == null ? "not available" : Math.round(floorReferenceY)}. Blue D is y {Math.round(freeEnd.y)}.
              {floorAnchorReady ? " Floor anchor matches." : " Put D on the cyan floor line before judging the result."}
            </div>
          </div>
        ) : (
          <p className="mt-2 rounded-lg border border-cyan-200 bg-cyan-50 px-2.5 py-2 text-[10px] leading-4 text-cyan-900">
            Need a body height such as 70 cm from the floor? Press “Measure from floor.”
          </p>
        )}
        <div className="mt-2 text-[10px] text-slate-500">
          C ({Math.round(freeStart.x)}, {Math.round(freeStart.y)}) → D ({Math.round(freeEnd.x)}, {Math.round(freeEnd.y)}) · {freePixelSpan.toFixed(2)} px
        </div>
        <div className={`mt-2 grid gap-2 ${applyAppleCorrection ? "sm:grid-cols-2" : "grid-cols-1"}`}>
          <RulerModelResultCard
            title={freeRulerPurpose === "floor-height" ? "Floor ruler · without Apple" : "Free ruler · without Apple"}
            description="One flat scale from the person’s height"
            valueCm={freeFlatCm}
            expectedCm={freeExpectedCm}
            unit={freeUnit}
            judgeReady={floorAnchorReady}
            notReadyMessage={freeRulerPurpose === "floor-height" ? "Place D on the cyan floor line before scoring." : undefined}
          />
          {applyAppleCorrection ? (
            <RulerModelResultCard
              title={freeRulerPurpose === "floor-height" ? "Floor ruler · with Apple" : "Free ruler · with Apple"}
              description="Known height + Apple 3D + Depth Pro; printed tape values excluded"
              valueCm={freeFusedCm}
              expectedCm={freeExpectedCm}
              unit={freeUnit}
              judgeReady={floorAnchorReady}
              status={fusedStatus}
              error={fusedError}
              elapsedMs={fusedElapsedMs}
              notReadyMessage={freeRulerPurpose === "floor-height" ? "Place D on the cyan floor line before scoring." : undefined}
            />
          ) : null}
        </div>
      </section>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!canSave}
          onClick={saveCurrent}
          className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Save this tape position
        </button>
        <button
          type="button"
          disabled={!samples.length}
          onClick={() => setSamples([])}
          className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Clear saved positions
        </button>
      </div>

      {samples.length ? (
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-[11px] font-medium text-slate-700">Saved positions · {samples.length}</div>
            {spreads ? (
              <div className="text-[10px] text-slate-500">
                Difference: without Apple {formatDistance(spreads.withoutAppleCm ?? 0, unit)}
                {applyAppleCorrection && spreads.withAppleCm != null
                  ? ` · with Apple ${formatDistance(spreads.withAppleCm, unit)}`
                  : ""}
              </div>
            ) : null}
          </div>
          <div className={`mt-2 grid gap-2 border-b border-slate-200 pb-1 text-[10px] text-slate-500 ${applyAppleCorrection ? "grid-cols-3" : "grid-cols-2"}`}>
            <span>Position</span>
            <span>Without Apple</span>
            {applyAppleCorrection ? <span>With Apple</span> : null}
          </div>
          <div className="divide-y divide-slate-200">
            {samples.map((sample, index) => (
              <div key={sample.key} className={`grid gap-2 py-2 text-[10px] ${applyAppleCorrection ? "grid-cols-3" : "grid-cols-2"}`}>
                <span className="min-w-0 break-words text-slate-600">
                  #{index + 1} {sample.label}<br />{sample.pixelSpan.toFixed(1)} px
                </span>
                <SavedResult valueCm={sample.withoutAppleCm} expectedCm={sample.expectedCm} unit={unit} />
                {applyAppleCorrection ? <SavedResult valueCm={sample.withAppleCm} expectedCm={sample.expectedCm} unit={unit} /> : null}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-3 text-[10px] leading-4 text-slate-500">
          Snap, save, move to another part of the tape, then snap and save again.
        </p>
      )}

      <details className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[10px] text-slate-600">
        <summary className="cursor-pointer font-medium">Technical details</summary>
        <div className="mt-2 grid gap-1 sm:grid-cols-2">
          <span>Green span: {pixelSpan.toFixed(2)} px</span>
          <span>A ({Math.round(start.x)}, {Math.round(start.y)})</span>
          <span>B ({Math.round(end.x)}, {Math.round(end.y)})</span>
          <span>Tape reader: {tapeVisionModel ?? tapeVisionStatus}</span>
          <span>
            Apple tape locator: {fusedPathEvidence === "ocr-position-only"
              ? "OCR box positions only; numbers excluded"
              : fusedPathEvidence === "colour-mask"
                ? "colour path; numbers excluded"
                : "waiting"}
          </span>
        </div>
      </details>
    </section>
  );
}

function TapeHandleCloseup({
  label,
  imageUrl,
  imageWidth,
  imageHeight,
  point,
  tapeValue,
  tapeUnit,
}: {
  label: "A" | "B";
  imageUrl: string | null;
  imageWidth: number;
  imageHeight: number;
  point: Point;
  tapeValue: number | null;
  tapeUnit: "cm" | "in";
}) {
  const scale = 1;
  return (
    <div className="min-w-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-950">
      <div className="flex items-center justify-between gap-1 bg-slate-100 px-2 py-1 text-[10px] text-slate-700">
        <span className="font-medium">{label} · {formatTapeValue(tapeValue)} {tapeUnit}</span>
        <span className="font-mono text-[9px] text-slate-500">{Math.round(point.x)}, {Math.round(point.y)}</span>
      </div>
      <div className="relative h-28 overflow-hidden" aria-label={`${label} tape mark close-up`}>
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt=""
            aria-hidden="true"
            className="pointer-events-none absolute max-w-none select-none"
            style={{
              width: imageWidth * scale,
              height: imageHeight * scale,
              left: `calc(50% - ${point.x * scale}px)`,
              top: `calc(50% - ${point.y * scale}px)`,
            }}
          />
        ) : null}
        <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-emerald-300" />
        <div className="pointer-events-none absolute inset-y-0 left-1/2 border-l border-emerald-300" />
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-emerald-200" />
      </div>
    </div>
  );
}

export function RulerModelResultCard({
  title,
  description,
  valueCm,
  expectedCm,
  unit,
  judgeReady,
  status,
  error,
  elapsedMs = 0,
  onRetry,
  notReadyMessage,
}: {
  title: string;
  description: string;
  valueCm: number | null;
  expectedCm: number;
  unit: "cm" | "in";
  judgeReady: boolean;
  status?: "idle" | "loading" | "ready" | "error";
  error?: string | null;
  elapsedMs?: number;
  onRetry?: () => void;
  notReadyMessage?: string;
}) {
  if (status === "loading") {
    return (
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
        <div className="text-[11px] font-medium">{title}</div>
        <div className="mt-1 text-sm text-slate-700">Calculating · {formatElapsed(elapsedMs)}</div>
        <div className="mt-1 text-[10px] text-slate-500">{description}</div>
      </div>
    );
  }
  if (status === "error") {
    return (
      <div className="rounded-lg border border-rose-200 bg-rose-50 p-3">
        <div className="text-[11px] font-medium">{title}</div>
        <div className="mt-1 text-sm text-rose-800">Could not calculate</div>
        <div className="mt-1 text-[10px] text-rose-700">{error ?? "Apple correction failed."}</div>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 rounded-md border border-rose-300 bg-white px-2 py-1 text-[10px] font-medium text-rose-800 hover:bg-rose-100"
          >
            Retry Apple correction
          </button>
        ) : null}
      </div>
    );
  }

  const errorPct = valueCm == null || expectedCm <= 0 ? null : ((valueCm / expectedCm) - 1) * 100;
  const statusInfo = judgeReady ? resultStatus(errorPct) : null;
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] font-medium">{title}</div>
        {statusInfo ? <span className={`rounded px-2 py-0.5 text-[9px] font-medium ${statusInfo.className}`}>{statusInfo.label}</span> : null}
      </div>
      <div className="mt-1 text-[10px] text-slate-500">{description}</div>
      <div className="mt-2 font-mono text-xl font-semibold text-slate-900">
        {valueCm == null ? "Waiting" : formatDistance(valueCm, unit)}
      </div>
      {valueCm != null && judgeReady ? (
        <div className="mt-1 font-mono text-[11px] text-slate-700">
          Error {formatDistanceError(valueCm, expectedCm, unit)} <span className="text-slate-500">({formatPct(errorPct)})</span>
        </div>
      ) : valueCm != null ? (
        <div className="mt-1 text-[10px] text-slate-500">{notReadyMessage ?? "Snap to exact marks before scoring."}</div>
      ) : null}
    </div>
  );
}

function SavedResult({ valueCm, expectedCm, unit }: { valueCm: number | null; expectedCm: number; unit: "cm" | "in" }) {
  if (valueCm == null) return <span className="text-slate-400">Not available</span>;
  const errorPct = expectedCm > 0 ? ((valueCm / expectedCm) - 1) * 100 : null;
  return (
    <span className="min-w-0 break-words font-mono text-slate-700">
      {formatDistance(valueCm, unit)}<br />
      error {formatDistanceError(valueCm, expectedCm, unit)} <span className="text-slate-500">({formatPct(errorPct)})</span>
    </span>
  );
}

function resultStatus(errorPct: number | null): { label: string; className: string } {
  if (errorPct == null) return { label: "Waiting", className: "bg-slate-200 text-slate-600" };
  const absolute = Math.abs(errorPct);
  if (absolute <= 1) return { label: "Pass", className: "bg-emerald-100 text-emerald-700" };
  if (absolute <= 2) return { label: "Check", className: "bg-amber-100 text-amber-800" };
  return { label: "Fail", className: "bg-rose-100 text-rose-700" };
}

function spread(values: number[]): number | null {
  if (values.length < 2) return null;
  return Math.max(...values) - Math.min(...values);
}

function formatInputValue(value: number): string {
  return Number.isInteger(value) ? value.toFixed(0) : value.toFixed(2);
}

function formatTapeValue(value: number | null): string {
  return value == null ? "unread" : formatInputValue(value);
}

function formatPct(value: number | null): string {
  return value == null ? "n/a" : `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function toDisplayUnit(valueCm: number, unit: "cm" | "in"): number {
  return unit === "in" ? cmToIn(valueCm) : valueCm;
}

function formatDistance(valueCm: number, unit: "cm" | "in"): string {
  return `${toDisplayUnit(valueCm, unit).toFixed(3)} ${unit}`;
}

function formatDistanceError(valueCm: number, expectedCm: number, unit: "cm" | "in"): string {
  const difference = toDisplayUnit(valueCm - expectedCm, unit);
  return `${difference > 0 ? "+" : ""}${difference.toFixed(3)} ${unit}`;
}

function formatElapsed(elapsedMs: number): string {
  const seconds = Math.max(0, elapsedMs) / 1000;
  return seconds < 60
    ? `${seconds.toFixed(1)} s`
    : `${Math.floor(seconds / 60)}:${(seconds % 60).toFixed(1).padStart(4, "0")}`;
}
