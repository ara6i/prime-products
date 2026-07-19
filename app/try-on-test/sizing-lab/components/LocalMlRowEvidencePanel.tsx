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
  heightCm: number;
  weightKg: number;
  profileLabel: string;
}

const LABELS: Record<LocalMlNormalizedRowPrediction["kind"], string> = {
  waist: "Natural waist",
  trouserWaist: "Trouser waist",
  hips: "Hips",
};

const FLOOR_ORDER: LocalMlNormalizedRowPrediction["kind"][] = ["hips", "trouserWaist", "waist"];

const WEAR_COLUMN_TRANSLATIONS: Record<LocalMlNormalizedRowPrediction["kind"], string> = {
  waist: "How high the person’s natural-waist measuring level was above the floor.",
  trouserWaist: "How high the most forward part of the abdomen was above the floor. We use this only as a rough trouser-waist stand-in.",
  hips: "How high the buttock measuring level was above the floor. We use this only as a rough fullest-hip stand-in.",
};

const WEAR_COLUMN_GLOSSARY = [
  ["STATURE", "Total standing height: floor to the top of the head."],
  ["WAIST HEIGHT", "Floor to the natural-waist measuring level."],
  ["ABDOMINAL EXT HGT", "Floor to the level where the abdomen projects forward most."],
  ["TROCHANTERIC HGHT", "Floor to the bony point at the upper outside of the thigh/hip."],
  ["BUTTOCK HEIGHT", "Floor to the buttock measuring level used as our hip-row stand-in."],
  ["GLUTEAL FURROW HGT", "Floor to the crease directly underneath the buttock."],
  ["CROTCH HEIGHT", "Floor to the crotch level while standing."],
  ["HIP BREADTH", "Straight side-to-side hip width; this is not circumference."],
  ["BUTTOCK DEPTH", "Front-to-back thickness at the buttock level."],
  ["HIP C-7\" BLW WAIST", "Hip circumference measured seven inches below the waist."],
  ["HIP C-9\" BLW WAIST", "Hip circumference measured nine inches below the waist."],
] as const;

export function LocalMlRowEvidencePanel({
  rows,
  modelStage,
  depthReady,
  endpointSource,
  imageWidth,
  imageHeight,
  gender,
  heightCm,
  weightKg,
  profileLabel,
}: Props) {
  if (!rows.length || !modelStage) return null;
  const rowOnly = modelStage === "wear-1d-row-prior";
  const floorRows = FLOOR_ORDER.flatMap((kind) => {
    const row = rows.find((candidate) => candidate.kind === kind);
    return row?.heightFromFloorCm == null ? [] : [row];
  });
  const bmi = heightCm > 0 && weightKg > 0 ? weightKg / ((heightCm / 100) ** 2) : null;

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
                  Historical test: 90% were within {row.validationP90At170Cm?.toFixed(1) ?? "n/a"} cm
                </div>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[10px] leading-4 text-cyan-900">
            This chooses row height only. It does not measure circumference and it does not use the person&apos;s saved answer.
          </p>
        </div>
      ) : null}

      {floorRows.length ? (
        <details data-testid="wear-column-translation" className="mt-3 rounded-xl border border-indigo-200 bg-indigo-50/60 p-3" open>
          <summary className="cursor-pointer list-none text-sm font-medium text-indigo-950">
            Real WEAR columns, translated into simple English
            <span className="mt-1 block text-[11px] font-normal leading-4 text-indigo-800">
              {profileLabel}: {gender} · {heightCm.toFixed(1)} cm · {weightKg.toFixed(1)} kg{bmi != null ? ` · BMI ${bmi.toFixed(1)}` : ""}
            </span>
          </summary>

          <div className="mt-3 grid gap-3 lg:grid-cols-3">
            {floorRows.map((row) => {
              const cohort = row.referenceCohort;
              return (
                <article key={row.kind} className="rounded-xl border border-indigo-100 bg-white p-3 text-[11px] leading-4 text-slate-700">
                  <h5 className="text-sm font-medium text-slate-950">{LABELS[row.kind]}</h5>

                  <div className="mt-3 text-[10px] uppercase tracking-wide text-slate-500">Original WEAR column</div>
                  <div className="mt-1 rounded-md bg-slate-100 px-2 py-1.5 font-mono text-xs text-slate-900">
                    {cohort?.sourceColumn ?? "Column unavailable"}
                  </div>

                  <div className="mt-3 text-[10px] uppercase tracking-wide text-slate-500">Plain-English translation</div>
                  <p className="mt-1 text-xs leading-5 text-slate-800">{WEAR_COLUMN_TRANSLATIONS[row.kind]}</p>

                  {cohort ? (
                    <>
                      <div className="mt-3 text-[10px] uppercase tracking-wide text-slate-500">Closest anonymous WEAR group</div>
                      <p className="mt-1">
                        {cohort.gender} · average height {cohort.averageHeightCm.toFixed(1)} cm · BMI {cohort.averageBmi.toFixed(1)} · {cohort.sampleCount} people
                      </p>
                      {!cohort.genderMatched ? (
                        <p className="mt-2 rounded-md bg-amber-50 px-2 py-1.5 text-amber-900">
                          No {gender} group exists for this column. This closest example is {cohort.gender}.
                        </p>
                      ) : null}
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <div className="rounded-lg bg-slate-50 p-2">
                          <div className="text-[10px] text-slate-500">Group’s real median</div>
                          <div className="mt-1 font-mono text-base text-slate-950">{cohort.measuredHeightFromFloorCm.toFixed(1)} cm</div>
                          <div className="text-[10px] text-slate-500">above the floor</div>
                        </div>
                        <div className="rounded-lg bg-cyan-50 p-2">
                          <div className="text-[10px] text-cyan-800">ML guess for {profileLabel}</div>
                          <div className="mt-1 font-mono text-base text-slate-950">{row.heightFromFloorCm!.toFixed(1)} cm</div>
                          <div className="text-[10px] text-cyan-800">above the floor</div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <p className="mt-3 rounded-md bg-amber-50 px-2 py-1.5 text-amber-900">
                      No safe anonymous comparison group is available for this column.
                    </p>
                  )}
                </article>
              );
            })}
          </div>

          <p className="mt-3 text-[10px] leading-4 text-indigo-900">
            The closest group is explanation evidence only. It never changes or calibrates the ML prediction for {profileLabel}.
          </p>

          <details className="mt-3 rounded-lg border border-indigo-100 bg-white p-3">
            <summary className="cursor-pointer text-xs font-medium text-slate-900">Translate the other old WEAR column names</summary>
            <div className="mt-3 grid gap-x-5 gap-y-2 md:grid-cols-2">
              {WEAR_COLUMN_GLOSSARY.map(([column, translation]) => (
                <div key={column} className="grid gap-1 border-b border-slate-100 pb-2 text-[11px] leading-4 sm:grid-cols-[145px_1fr]">
                  <code className="text-slate-900">{column}</code>
                  <span className="text-slate-600">{translation}</span>
                </div>
              ))}
            </div>
          </details>
        </details>
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
                <span>average test error {row.validationMaeAt170Cm?.toFixed(1) ?? "n/a"}cm · 90% within {row.validationP90At170Cm?.toFixed(1) ?? "n/a"}cm</span>
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
