"use client";

import type {
  LocalMlModelStage,
  LocalMlNormalizedRowPrediction,
} from "../lib/localMlSizing";
import { cmToIn } from "../lib/units";

interface Props {
  rows: LocalMlNormalizedRowPrediction[];
  modelStage: LocalMlModelStage | null;
  depthReady: boolean;
  endpointSource: "local-ml" | "mediapipe-visible-mask" | null;
  imageWidth: number;
  imageHeight: number;
  gender: "male" | "female";
}

const LABELS: Record<LocalMlNormalizedRowPrediction["kind"], string> = {
  waist: "Natural waist",
  trouserWaist: "Trouser waist",
  hips: "Hips",
};

const FLOOR_ORDER: LocalMlNormalizedRowPrediction["kind"][] = ["hips", "trouserWaist", "waist"];

export function LocalMlRowEvidencePanel({
  rows,
  modelStage,
  depthReady,
  endpointSource,
  imageWidth,
  imageHeight,
  gender,
}: Props) {
  if (!rows.length || !modelStage) return null;
  const rowOnly = modelStage === "wear-1d-row-prior";
  const floorRows = FLOOR_ORDER.flatMap((kind) => {
    const row = rows.find((candidate) => candidate.kind === kind);
    return row?.heightFromFloorCm == null ? [] : [row];
  });

  return (
    <section data-testid="local-ml-row-evidence" className="rounded-xl border border-violet-200 bg-white p-4 text-slate-800">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h4 className="text-sm font-medium text-slate-950">WEAR 1D row prediction</h4>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-600">
            The model chooses how far down the body each red line belongs. The current endpoints come from the visible MediaPipe person mask.
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${depthReady ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
          {depthReady ? "Rows + learned depth ready" : "Rows ready · Manual calculator"}
        </span>
      </div>

      {floorRows.length ? (
        <div data-testid="wear-floor-height-guide" className="mt-3 rounded-xl border-2 border-cyan-300 bg-cyan-50 p-3">
          <h5 className="text-sm font-semibold text-cyan-950">Start at the floor. How far do I go up?</h5>
          <p className="mt-1 text-[11px] leading-4 text-cyan-900">
            Put the bottom of the blue ruler at the feet. Go upward by the number below. That is where WEAR 1D expects each red row.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {floorRows.map((row, index) => (
              <div key={row.kind} className="rounded-lg border border-cyan-200 bg-white p-3">
                <div className="text-[10px] font-medium uppercase tracking-wide text-cyan-700">Step {index + 1}</div>
                <div className="mt-1 text-xs font-medium text-slate-800">{LABELS[row.kind]}</div>
                <div className="mt-1 font-mono text-2xl font-semibold text-slate-950">{row.heightFromFloorCm!.toFixed(1)} cm</div>
                <div className="font-mono text-[11px] text-slate-500">{cmToIn(row.heightFromFloorCm!).toFixed(1)} in from the floor</div>
                <div className="mt-2 text-[10px] leading-4 text-slate-500">
                  WEAR 90% range: approximately ±{row.validationP90At170Cm?.toFixed(1) ?? "n/a"} cm
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[10px] leading-4 text-cyan-900">
            This chooses row height only. It does not measure circumference and it does not use the person&apos;s saved answer.
          </p>
        </div>
      ) : null}

      <div className="mt-3 grid gap-2 text-[11px] leading-4 md:grid-cols-3">
        <div className="rounded-lg bg-violet-50 p-2.5">
          <span className="text-violet-600">1 · WEAR 1D</span>
          <div className="mt-1 text-slate-800">Predicts the vertical Y position.</div>
        </div>
        <div className="rounded-lg bg-blue-50 p-2.5">
          <span className="text-blue-600">2 · MEDIAPIPE MASK</span>
          <div className="mt-1 text-slate-800">Finds temporary visible left and right edges.</div>
        </div>
        <div className="rounded-lg bg-emerald-50 p-2.5">
          <span className="text-emerald-700">3 · MANUAL CALCULATOR</span>
          <div className="mt-1 text-slate-800">Uses the same Apple/Depth scale, depth sliders and circumference formula as Manual Coordinate.</div>
        </div>
      </div>

      <div className="mt-3 grid gap-2">
        {rows.map((row) => {
          const yPx = Math.round(row.yNorm * imageHeight);
          const leftXPx = Math.round(row.leftXNorm * imageWidth);
          const rightXPx = Math.round(row.rightXNorm * imageWidth);
          const representedGenderSamples = row.trainingGenderCounts?.[gender] ?? 0;
          const genderWarning = representedGenderSamples === 0;
          return (
            <div key={row.kind} className="rounded-lg border border-slate-200 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="text-xs font-medium text-slate-950">{LABELS[row.kind]}</div>
                  <div className="mt-0.5 text-[10px] leading-4 text-slate-500">{row.definition}</div>
                </div>
                <div className="font-mono text-sm text-slate-950">row y {yPx}px</div>
              </div>
              <div className="mt-2 grid gap-1 text-[10px] leading-4 text-slate-600 sm:grid-cols-3">
                <span>temporary mask edges {leftXPx} → {rightXPx}px</span>
                <span>
                  {row.trainingSamples?.toLocaleString() ?? "n/a"} people · {row.trainingSurveys ?? "n/a"} {row.trainingSurveys === 1 ? "survey file" : "survey files"}
                </span>
                <span>validation average ±{row.validationMaeAt170Cm?.toFixed(1) ?? "n/a"}cm · 90% ±{row.validationP90At170Cm?.toFixed(1) ?? "n/a"}cm</span>
              </div>
              {genderWarning ? (
                <div className="mt-2 rounded bg-amber-50 px-2 py-1 text-[10px] leading-4 text-amber-900">
                  Warning: this row had no {gender} examples in the usable WEAR files, so this prediction is an extrapolation.
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {rowOnly ? (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-4 text-amber-900">
          Only the red-row placement is learned today. The circumference shown below comes from the existing Manual Coordinate calculator, not from trained 3D depth. A dataset&apos;s saved depth sliders may be copied into this isolated calculator, but they are never Local ML predictions. Future 3D training can replace endpoints and depth without changing or retraining this calculator.
        </div>
      ) : null}
      <div className="mt-2 text-[10px] text-slate-500">
        Endpoint source: {endpointSource === "mediapipe-visible-mask" ? "MediaPipe visible person mask" : "trained local model"}.
      </div>
    </section>
  );
}
