"use client";

import { cmToIn } from "../lib/units";
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
  applyAppleCorrection: boolean;
  tapeJudgeCm: number | null;
  tapeStartValue: number | null;
  tapeEndValue: number | null;
  tapeUnit: "cm" | "in";
  onSelectKind: (kind: RedLineVerticalProofKind) => void;
  onPlaceBesideTape: () => void;
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
  applyAppleCorrection,
  tapeJudgeCm,
  tapeStartValue,
  tapeEndValue,
  tapeUnit,
  onSelectKind,
  onPlaceBesideTape,
  onApplyAppleCorrectionChange,
  onRetryFused,
}: Props) {
  const samePixelLength = Math.abs(verticalPixelSpan - sourcePixelSpan) <= 0.5;
  const tapeJudgeReady = samePixelLength && tapeJudgeCm != null && tapeJudgeCm > 0;
  const selectedLabel = ROWS.find((row) => row.kind === selectedKind)?.label ?? "Red line";

  return (
    <section data-testid="red-line-vertical-proof" className="mb-3 rounded-xl border border-orange-200 bg-white p-3 text-slate-900">
      <div>
        <h3 className="text-sm font-semibold">Red-line clone · same as the free ruler</h3>
        <p className="mt-1 text-[11px] leading-4 text-slate-600">
          The orange clone uses the exact same flat and Apple-corrected calculations as the blue C–D free-hand ruler. The printed tape only judges them.
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

function formatDistance(valueCm: number | null, unit: "cm" | "in"): string {
  if (valueCm == null || !Number.isFinite(valueCm)) return "Not ready";
  return unit === "in" ? `${cmToIn(valueCm).toFixed(2)} in` : `${valueCm.toFixed(2)} cm`;
}

function formatTapeValue(value: number): string {
  return Number.isInteger(value) ? value.toFixed(0) : value.toFixed(2);
}
