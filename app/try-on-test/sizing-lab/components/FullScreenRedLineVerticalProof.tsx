"use client";

import { cmToIn } from "../lib/units";
import type { AppleFusedTapeTargetProjection } from "../lib/appleFusedTapeScale";
import { RulerModelResultCard } from "./FullScreenGreenRulerComparison";

export type RedLineVerticalProofKind = "waist" | "trouserWaist" | "hips";

interface Props {
  selectedKind: RedLineVerticalProofKind;
  resultUnit: "cm" | "in";
  sourcePixelSpan: number;
  verticalPixelSpan: number;
  flatCm: number | null;
  fusedCm: number | null;
  fusedStatus: "idle" | "loading" | "ready" | "error";
  fusedError: string | null;
  fusedElapsedMs: number;
  bodyWidthCm: number | null;
  bodyWidthSource: string;
  independentBodyWidthCm: number | null;
  independentBodyConfidence: "high" | "medium" | "low" | null;
  independentBodyStatus: "idle" | "loading" | "ready" | "error";
  tapeControlPassCount: number;
  tapeControlTotal: number;
  blindProjection: AppleFusedTapeTargetProjection | null;
  blindProjectionError: string | null;
  blindProjectionApplied: boolean;
  applyAppleCorrection: boolean;
  tapeJudgeCm: number | null;
  tapeStartValue: number | null;
  tapeEndValue: number | null;
  tapeUnit: "cm" | "in";
  onSelectKind: (kind: RedLineVerticalProofKind) => void;
  onPlaceBesideTape: () => void;
  onApplyBlindProjection: () => void;
  onApplyAppleCorrectionChange: (checked: boolean) => void;
  onRetryFused: () => void;
}

const ROWS: Array<{ kind: RedLineVerticalProofKind; label: string }> = [
  { kind: "waist", label: "Waist" },
  { kind: "trouserWaist", label: "Trouser" },
  { kind: "hips", label: "Hips" },
];

export function FullScreenRedLineVerticalProof({
  selectedKind,
  resultUnit,
  sourcePixelSpan,
  verticalPixelSpan,
  flatCm,
  fusedCm,
  fusedStatus,
  fusedError,
  fusedElapsedMs,
  bodyWidthCm,
  bodyWidthSource,
  independentBodyWidthCm,
  independentBodyConfidence,
  independentBodyStatus,
  tapeControlPassCount,
  tapeControlTotal,
  blindProjection,
  blindProjectionError,
  blindProjectionApplied,
  applyAppleCorrection,
  tapeJudgeCm,
  tapeStartValue,
  tapeEndValue,
  tapeUnit,
  onSelectKind,
  onPlaceBesideTape,
  onApplyBlindProjection,
  onApplyAppleCorrectionChange,
  onRetryFused,
}: Props) {
  const samePixelLength = Math.abs(verticalPixelSpan - sourcePixelSpan) <= 0.5;
  const tapeJudgeReady = samePixelLength && tapeJudgeCm != null && tapeJudgeCm > 0;
  const selectedLabel = ROWS.find((row) => row.kind === selectedKind)?.label ?? "Red line";
  const blindTargetCm = blindProjection?.targetCm ?? bodyWidthCm;
  const independentDifferenceCm = bodyWidthCm != null && independentBodyWidthCm != null
    ? independentBodyWidthCm - bodyWidthCm
    : null;
  const independentDifferencePct = independentDifferenceCm != null && bodyWidthCm && bodyWidthCm > 0
    ? (independentDifferenceCm / bodyWidthCm) * 100
    : null;
  const independentBodyReady = Boolean(
    independentBodyWidthCm
    && independentBodyWidthCm > 0
    && independentBodyConfidence
    && independentBodyConfidence !== "low",
  );
  const tapeControlPassed = tapeControlTotal === 4 && tapeControlPassCount === 4;
  const bodyMethodAgrees = independentDifferencePct != null && Math.abs(independentDifferencePct) <= 2;
  const bodyWidthProven = independentBodyReady && tapeControlPassed && bodyMethodAgrees;
  const blindJudgeReady = Boolean(
    blindProjectionApplied
    && blindTargetCm
    && blindTargetCm > 0
    && tapeJudgeCm
    && tapeJudgeCm > 0,
  );
  const blindErrorCm = blindJudgeReady && blindTargetCm && tapeJudgeCm != null
    ? tapeJudgeCm - blindTargetCm
    : null;
  const blindErrorPct = blindErrorCm != null && blindTargetCm
    ? (blindErrorCm / blindTargetCm) * 100
    : null;
  const blindPassed = blindErrorPct != null && Math.abs(blindErrorPct) <= 2;

  return (
    <section data-testid="red-line-vertical-proof" className="mb-3 rounded-xl border border-orange-200 bg-white p-3 text-slate-900">
      <div aria-hidden="true" className={`hidden rounded-xl border-2 p-3 ${independentBodyReady
        ? bodyWidthProven
          ? "border-emerald-500 bg-emerald-50"
          : "border-red-500 bg-red-50"
        : "border-blue-500 bg-blue-50"}`}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <h3 className="text-sm font-black">Blind {selectedLabel.toLowerCase()}-width proof</h3>
            <p className="mt-1 text-[11px] leading-4 text-slate-700">
              The original body line is measured twice: Apple body geometry and a separate Depth Pro body-surface measurement. Tape intervals only check whether the camera/depth scale is trustworthy.
            </p>
          </div>
          <span className={`rounded-full px-2 py-1 text-[10px] font-black ${independentBodyReady
            ? bodyWidthProven ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
            : "bg-blue-600 text-white"}`}>
            {independentBodyReady ? bodyWidthProven ? "PROVEN ≤2%" : "REJECTED" : "WAITING"}
          </span>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          <ProofValue
            label="1 · Apple body width"
            value={formatDistance(bodyWidthCm, resultUnit)}
            detail={bodyWidthSource}
          />
          <ProofValue
            label="2 · Independent body width"
            value={formatDistance(independentBodyWidthCm, resultUnit)}
            detail={independentBodyStatus === "loading" ? "Depth Pro is measuring the original body endpoints" : `Depth Pro body surface · ${independentBodyConfidence ?? "not ready"} confidence`}
          />
          <ProofValue
            label="3 · Difference"
            value={independentDifferenceCm == null ? "Not ready" : `${independentDifferenceCm >= 0 ? "+" : ""}${independentDifferenceCm.toFixed(2)} cm`}
            detail={`${independentDifferencePct == null ? "No comparison" : `${independentDifferencePct >= 0 ? "+" : ""}${independentDifferencePct.toFixed(2)}%`} · tape controls ${tapeControlPassCount}/${Math.max(4, tapeControlTotal)}`}
          />
        </div>

        {independentBodyReady ? (
          <p className={`mt-2 rounded-lg px-2 py-1.5 text-[11px] font-black ${bodyWidthProven ? "bg-emerald-100 text-emerald-900" : "bg-red-100 text-red-900"}`}>
            {bodyWidthProven
              ? `PROVEN: both body methods agree and all 4 tape controls pass.`
              : `DO NOT TRUST ${formatDistance(bodyWidthCm, resultUnit)}: ${bodyMethodAgrees ? "body methods agree, but the tape controls failed" : `the independent body measurement disagrees by ${Math.abs(independentDifferencePct ?? 0).toFixed(2)}%`}.`}
          </p>
        ) : null}

        <div className="mt-3 border-t border-blue-200 pt-3">
          <div className="text-[10px] font-black uppercase tracking-wide text-blue-900">Optional visual check · does not change the verdict above</div>
          <p className="mt-1 text-[10px] leading-4 text-slate-600">
            Draw Apple&apos;s requested width beside the tape. This checks only whether the tape-plane projector can draw that length.
          </p>

        <button
          type="button"
          onClick={onApplyBlindProjection}
          disabled={!blindProjection || !blindTargetCm}
          className="mt-3 w-full rounded-lg bg-blue-700 px-3 py-2.5 text-xs font-black text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {blindProjectionApplied
            ? `Redraw visual ${formatDistance(blindTargetCm, resultUnit)} line`
            : blindProjection
              ? `Draw ${formatDistance(blindTargetCm, resultUnit)} beside tape · visual only`
              : fusedStatus === "loading" ? "Preparing blind line…" : "Waiting for body width + camera depth"}
        </button>

        {blindProjectionError ? (
          <p className="mt-2 rounded-lg bg-red-100 px-2 py-1.5 text-[10px] font-bold text-red-900">{blindProjectionError}</p>
        ) : null}
        {blindErrorCm != null && blindErrorPct != null ? (
          <p className="mt-2 rounded-lg bg-slate-100 px-2 py-1.5 text-[11px] font-black text-slate-800">
            Visual tape-plane check: {blindPassed ? "matches" : "does not match"} · difference {blindErrorCm >= 0 ? "+" : ""}{blindErrorCm.toFixed(2)} cm ({blindErrorPct >= 0 ? "+" : ""}{blindErrorPct.toFixed(2)}%). This is not the body verdict.
          </p>
        ) : null}
        </div>
      </div>

      <div className="mt-4 border-t border-orange-200 pt-3">
        <h3 className="text-sm font-semibold">Same-pixel comparison · not body-width proof</h3>
        <p className="mt-1 text-[11px] leading-4 text-slate-600">
          This section copies the exact pixel length only. It checks the tape-plane calculator, not the body width above.
        </p>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-1.5" role="group" aria-label="Choose red line for vertical proof">
        {ROWS.map((row) => (
          <button
            key={row.kind}
            type="button"
            aria-pressed={selectedKind === row.kind}
            onClick={() => onSelectKind(row.kind)}
            className={`rounded-lg border px-2 py-2 text-[10px] font-medium ${selectedKind === row.kind
              ? "border-orange-500 bg-orange-50 text-orange-900 ring-1 ring-orange-200"
              : "border-slate-200 bg-slate-50 text-slate-600 hover:border-orange-300"}`}
          >
            {row.label}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onPlaceBesideTape}
        className="mt-2 w-full rounded-lg border border-orange-300 bg-orange-50 px-3 py-2 text-xs font-medium text-orange-900 hover:bg-orange-100"
      >
        Put {selectedLabel.toLowerCase()} copy beside tape
      </button>

      <div className="mt-3 grid gap-2">
        <StepCard
          step="1"
          title={`${selectedLabel} red line`}
          value={`${sourcePixelSpan.toFixed(0)} px`}
          detail="Original horizontal line"
        />
        <StepCard
          step="2"
          title="Vertical orange clone"
          value={`${verticalPixelSpan.toFixed(0)} px`}
          detail={samePixelLength ? "Exact same pixel length" : "Pixel length does not match"}
        />
        <StepCard
          step="3"
          title="What the clone covers on the tape"
          value={formatDistance(tapeJudgeCm, resultUnit)}
          detail={tapeStartValue == null || tapeEndValue == null
            ? "Move the orange line so both ends sit on the readable tape"
            : `${formatTapeValue(tapeStartValue)} → ${formatTapeValue(tapeEndValue)} ${tapeUnit} · read from printed tape`}
        />
      </div>

      <label className="mt-3 flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 text-[11px] text-slate-700">
        <input
          type="checkbox"
          checked={applyAppleCorrection}
          onChange={(event) => onApplyAppleCorrectionChange(event.currentTarget.checked)}
          aria-label="Apply Apple correction to red-line clone"
        />
        Apply Apple correction
      </label>

      <div className={`mt-2 grid gap-2 ${applyAppleCorrection ? "sm:grid-cols-2" : "grid-cols-1"}`}>
        <RulerModelResultCard
          title="Clone · without Apple"
          description="Same flat known-height scale as the blue free ruler"
          valueCm={flatCm}
          expectedCm={tapeJudgeCm ?? 0}
          unit={resultUnit}
          judgeReady={tapeJudgeReady}
        />
        {applyAppleCorrection ? (
          <RulerModelResultCard
            title="Clone · with Apple"
            description="Same Apple 3D + Depth Pro tape path as the blue free ruler"
            valueCm={fusedCm}
            expectedCm={tapeJudgeCm ?? 0}
            unit={resultUnit}
            judgeReady={tapeJudgeReady}
            status={fusedStatus}
            error={fusedError}
            elapsedMs={fusedElapsedMs}
            onRetry={onRetryFused}
          />
        ) : null}
      </div>

      <div className="mt-2 rounded-lg bg-blue-50 px-2.5 py-2 text-[10px] leading-4 text-blue-900">
        {samePixelLength
          ? `Same pixel length confirmed: ${sourcePixelSpan.toFixed(0)} px.`
          : `Warning: the copy differs by ${(verticalPixelSpan - sourcePixelSpan).toFixed(1)} px.`}
        {" "}This is the free-ruler calculation applied to the cloned red line; circumference and depth-ratio formulas are not used.
      </div>
    </section>
  );
}

function StepCard({ step, title, value, detail }: { step: string; title: string; value: string; detail: string }) {
  return (
    <div className="grid grid-cols-[24px_1fr] gap-2 rounded-lg border border-slate-200 bg-slate-50 p-2.5">
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white text-[10px] font-medium text-slate-600">{step}</span>
      <div className="min-w-0">
        <div className="text-[10px] text-slate-500">{title}</div>
        <div className="font-mono text-lg font-semibold text-slate-950">{value}</div>
        <div className="mt-0.5 text-[9px] leading-3 text-slate-500">{detail}</div>
      </div>
    </div>
  );
}

function ProofValue({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-lg border border-blue-200 bg-white p-2.5">
      <div className="text-[10px] font-bold text-blue-900">{label}</div>
      <div className="mt-0.5 font-mono text-lg font-black text-slate-950">{value}</div>
      <div className="mt-0.5 text-[9px] leading-3 text-slate-500">{detail}</div>
    </div>
  );
}

function formatDistance(valueCm: number | null, unit: "cm" | "in"): string {
  if (valueCm == null || !Number.isFinite(valueCm)) return "Not ready";
  return unit === "in" ? `${cmToIn(valueCm).toFixed(2)} in` : `${valueCm.toFixed(2)} cm`;
}

function formatTapeValue(value: number): string {
  return Number.isInteger(value) ? value.toFixed(0) : value.toFixed(2);
}
