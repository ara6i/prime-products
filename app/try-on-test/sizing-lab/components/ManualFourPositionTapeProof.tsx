"use client";

import type { AppleFusedTapeTest } from "../lib/appleFusedTapeScale";
import type { TapeVisionHiddenInterval } from "../lib/tapeVision";
import { cmToIn } from "../lib/units";

interface Point {
  x: number;
  y: number;
}

interface Props {
  imageWidth: number;
  imageHeight: number;
  intervals: TapeVisionHiddenInterval[];
  coordinateStatus: "idle" | "loading" | "ready" | "error";
  coordinateError: string | null;
  coordinateElapsedMs: number;
  coordinateModel: string | null;
  tests: AppleFusedTapeTest[];
  calculationStatus: "idle" | "loading" | "ready" | "error";
  calculationError: string | null;
  calculationElapsedMs: number;
  intervalValue: number;
  unit: "cm" | "in";
  onRefreshCoordinates: () => void;
  onShowSegment: (start: Point, end: Point) => void;
}

export function ManualFourPositionTapeProof({
  imageWidth,
  imageHeight,
  intervals,
  coordinateStatus,
  coordinateError,
  coordinateElapsedMs,
  coordinateModel,
  tests,
  calculationStatus,
  calculationError,
  calculationElapsedMs,
  intervalValue,
  unit,
  onRefreshCoordinates,
  onShowSegment,
}: Props) {
  const expectedValue = Math.abs(intervalValue);
  const testById = new Map(tests.map((test) => [test.id, test]));
  const ordered = intervals.map((interval) => ({ interval, test: testById.get(interval.id) ?? null }));
  const withinOneCount = tests.filter((test) => Math.abs(test.errorPct) <= 1).length;
  const withinTwoCount = tests.filter((test) => Math.abs(test.errorPct) <= 2).length;
  const complete = intervals.length === 4 && tests.length === 4 && calculationStatus === "ready";
  const accepted = complete && withinTwoCount === 4;
  const acceptance = !complete
    ? null
    : withinOneCount === 4
      ? "Pass · 4/4 within 1%"
      : accepted
        ? "Pass · 4/4 within 2%"
        : `Needs work · ${withinTwoCount}/4 within 2%`;

  return (
    <section
      data-testid="exact-four-position-tape-proof"
      className="mb-3 rounded-xl border border-slate-200 bg-white p-3 text-slate-900"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="text-sm font-semibold">Tape scale check</div>
          <p className="mt-1 text-[11px] leading-4 text-slate-600">
            Apple places the tape marks. The camera + depth model must then independently return {formatExpected(expectedValue, unit)} at every position.
          </p>
        </div>
        <div className={`rounded-lg px-3 py-2 text-center ${accepted
          ? "bg-emerald-50 text-emerald-800"
          : complete
            ? "bg-rose-50 text-rose-800"
            : "bg-sky-50 text-sky-800"}`}
        >
          <div className="text-base font-semibold">{acceptance ?? `${intervals.length}/4 marks found`}</div>
          <div className="text-[10px]">Target: all four within 2%</div>
        </div>
      </div>

      {ordered.length ? (
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {ordered.map(({ interval, test }, index) => {
            const state = !test ? null : Math.abs(test.errorPct) <= 1 ? "PASS" : Math.abs(test.errorPct) <= 2 ? "CHECK" : "FAIL";
            return (
              <div
                key={interval.id}
                className={`min-w-0 rounded-lg border bg-slate-50/60 p-2 ${state === "PASS"
                  ? "border-emerald-200"
                  : state === "CHECK"
                    ? "border-amber-200"
                    : state === "FAIL"
                      ? "border-rose-200"
                      : "border-slate-200"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[11px] font-medium text-slate-700">
                      {positionLabel(index)} · {formatTapeValues(interval.startValue, interval.endValue, unit)}
                    </div>
                  </div>
                  {state ? <span className={`rounded px-1.5 py-0.5 text-[9px] font-medium ${state === "PASS" ? "bg-emerald-50 text-emerald-700" : state === "CHECK" ? "bg-amber-50 text-amber-700" : "bg-rose-50 text-rose-700"}`}>{state === "PASS" ? "Pass" : state === "CHECK" ? "Check" : "Fail"}</span> : null}
                </div>
                {test ? (
                  <div className="mt-1">
                    <div className="font-mono text-xl font-semibold text-slate-950">{formatDistance(test.predictedCm, unit)}</div>
                    <div className="font-mono text-[10px] text-slate-600">
                      expected {formatExpected(expectedValue, unit)} · error {formatError(test.errorCm, unit)} ({formatPct(test.errorPct)})
                    </div>
                  </div>
                ) : (
                  <div className="mt-1 text-[10px] text-sky-700">Waiting for the distance result…</div>
                )}
                <button
                  type="button"
                  onClick={() => onShowSegment(interval.start, interval.end)}
                  className="mt-2 w-full rounded border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-700 hover:bg-slate-50"
                >
                  Show these marks
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-2 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-4 text-center text-[11px] text-slate-600">
          Reading the four exact tape positions…
        </div>
      )}

      <button
        type="button"
        disabled={coordinateStatus === "loading" || calculationStatus === "loading"}
        onClick={onRefreshCoordinates}
        className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
      >
        Re-scan four positions with Apple Vision
      </button>

      <details className="mt-2 rounded-lg border border-slate-300 bg-white p-2 text-slate-800">
        <summary className="cursor-pointer text-[11px] font-medium text-slate-600">Technical tape details</summary>
        <div className="mt-2 grid gap-2 text-[10px] leading-4 sm:grid-cols-2">
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-2">
            <div className="font-medium">Mark placement</div>
            <div>{coordinateModel ?? "Apple Vision OCR"} · coordinates only</div>
            <div>
              {coordinateStatus === "loading"
                ? `reading · ${formatElapsed(coordinateElapsedMs)}`
                : coordinateStatus === "error"
                  ? `failed · ${coordinateError ?? "unknown error"}`
                  : intervals.length === 4
                    ? `ready · ${formatElapsed(coordinateElapsedMs)}`
                    : "waiting"}
            </div>
          </div>
          <div className="rounded-lg border border-violet-200 bg-violet-50 p-2">
            <div className="font-medium">Distance model</div>
            <div>Known height + Apple camera geometry + Depth Pro</div>
            <div>
              {calculationStatus === "loading"
                ? `calculating · ${formatElapsed(calculationElapsedMs)}`
                : calculationStatus === "error"
                  ? `failed · ${calculationError ?? "unknown error"}`
                  : tests.length === 4
                    ? `ready · ${formatElapsed(calculationElapsedMs)}`
                    : "waiting"}
            </div>
          </div>
        </div>
        <div className="mt-2 space-y-1 font-mono text-[9px]">
          {ordered.map(({ interval }, index) => {
            const freeCopy = translateBesideTape(interval.start, interval.end, imageWidth, imageHeight);
            return (
              <div key={`technical-${interval.id}`} className="flex flex-wrap items-center justify-between gap-2 rounded bg-slate-50 px-2 py-1">
                <span>
                  {positionLabel(index)} · {pixelSpan(interval.start, interval.end).toFixed(1)} px · ({Math.round(interval.start.x)}, {Math.round(interval.start.y)}) → ({Math.round(interval.end.x)}, {Math.round(interval.end.y)})
                </span>
                <button
                  type="button"
                  disabled={!accepted}
                  onClick={() => onShowSegment(freeCopy.start, freeCopy.end)}
                  className="rounded border border-slate-200 bg-white px-2 py-1 font-medium text-slate-700 disabled:opacity-40"
                >
                  Free ruler beside tape
                </button>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-[10px] text-slate-600">
          Tape numbers place the handles only. They never enter the physical distance calculation.
        </p>
      </details>
    </section>
  );
}

function translateBesideTape(start: Point, end: Point, imageWidth: number, imageHeight: number): { start: Point; end: Point } {
  const midpointX = (start.x + end.x) / 2;
  const preferredShift = midpointX <= imageWidth / 2 ? imageWidth * 0.16 : -imageWidth * 0.16;
  const minimumX = Math.min(start.x, end.x);
  const maximumX = Math.max(start.x, end.x);
  const minimumShift = 12 - minimumX;
  const maximumShift = imageWidth - 12 - maximumX;
  const shiftX = Math.max(minimumShift, Math.min(maximumShift, preferredShift));
  return {
    start: { x: start.x + shiftX, y: Math.max(0, Math.min(imageHeight - 1, start.y)) },
    end: { x: end.x + shiftX, y: Math.max(0, Math.min(imageHeight - 1, end.y)) },
  };
}

function positionLabel(index: number): string {
  return ["Top", "Middle", "Lower", "Bottom"][index] ?? `Position ${index + 1}`;
}

function pixelSpan(start: Point, end: Point): number {
  return Math.hypot(end.x - start.x, end.y - start.y);
}

function formatTapeValues(start: number, end: number, unit: "cm" | "in"): string {
  return `${formatTapeValue(start)}→${formatTapeValue(end)} ${unit}`;
}

function formatTapeValue(value: number): string {
  return Number.isInteger(value) ? value.toFixed(0) : value.toFixed(2);
}

function formatExpected(value: number, unit: "cm" | "in"): string {
  return `${formatTapeValue(value)} ${unit}`;
}

function formatDistance(valueCm: number, unit: "cm" | "in"): string {
  return unit === "in" ? `${cmToIn(valueCm).toFixed(3)} in` : `${valueCm.toFixed(3)} cm`;
}

function formatError(errorCm: number, unit: "cm" | "in"): string {
  const value = unit === "in" ? cmToIn(errorCm) : errorCm;
  return `${value >= 0 ? "+" : ""}${value.toFixed(3)} ${unit}`;
}

function formatPct(value: number): string {
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}%`;
}

function formatElapsed(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return "0.0 s";
  return `${(ms / 1000).toFixed(1)} s`;
}
