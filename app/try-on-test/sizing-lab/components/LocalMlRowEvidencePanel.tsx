"use client";

import {
  predictWearAbsoluteDepthCm,
  type LocalMlDepthMethod,
  type LocalMlModelStage,
  type LocalMlNormalizedRowPrediction,
} from "../lib/localMlSizing";
import type { GeminiGuideDepthRatioOverrides, GeminiGuideMeasurement } from "../lib/geminiGuide";
import { cmToIn } from "../lib/units";

interface Props {
  rows: LocalMlNormalizedRowPrediction[];
  modelStage: LocalMlModelStage | null;
  depthReady: boolean;
  endpointSource: "local-ml" | "mediapipe-visible-mask" | "mediapipe-central-torso-mask" | null;
  imageWidth: number;
  imageHeight: number;
  gender: "male" | "female";
  heightCm: number;
  weightKg: number;
  profileLabel: string;
  knownDepthRatioAnswers?: GeminiGuideDepthRatioOverrides;
  measurement: GeminiGuideMeasurement | null;
  depthMethod: LocalMlDepthMethod;
  onDepthMethodChange: (method: LocalMlDepthMethod) => void;
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

const WEAR_COLUMN_TRANSLATIONS_FA: Record<LocalMlNormalizedRowPrediction["kind"], string> = {
  waist: "ارتفاع کمر طبیعی: فاصله کف زمین تا سطحی که دور کمر طبیعی اندازه‌گیری می‌شود.",
  trouserWaist: "ارتفاع برجسته‌ترین قسمت شکم: فاصله کف زمین تا سطحی که شکم بیشترین جلوآمدگی را دارد. این فقط یک جایگزین تقریبی برای خط کمر شلوار است.",
  hips: "ارتفاع باسن: فاصله کف زمین تا سطح اندازه‌گیری باسن. این فقط یک جایگزین تقریبی برای خط پُرترین قسمت باسن است.",
};

const WEAR_COLUMN_GLOSSARY = [
  ["STATURE", "Total standing height: floor to the top of the head.", "قد ایستاده: فاصله کف زمین تا بالاترین نقطه سر."],
  ["WAIST HEIGHT", "Floor to the natural-waist measuring level.", "ارتفاع کمر طبیعی: فاصله کف زمین تا سطح اندازه‌گیری کمر طبیعی."],
  ["ABDOMINAL EXT HGT", "Floor to the level where the abdomen projects forward most.", "ارتفاع برجسته‌ترین قسمت شکم: فاصله کف زمین تا سطحی که شکم بیشترین جلوآمدگی را دارد."],
  ["TROCHANTERIC HGHT", "Floor to the bony point at the upper outside of the thigh/hip.", "ارتفاع تروکانتر: فاصله کف زمین تا برجستگی استخوانی بخش بیرونی بالای ران یا لگن."],
  ["BUTTOCK HEIGHT", "Floor to the buttock measuring level used as our hip-row stand-in.", "ارتفاع باسن: فاصله کف زمین تا سطح اندازه‌گیری باسن که فعلاً به‌عنوان جای تقریبی خط باسن استفاده می‌شود."],
  ["GLUTEAL FURROW HGT", "Floor to the crease directly underneath the buttock.", "ارتفاع چین زیر باسن: فاصله کف زمین تا چین مستقیم زیر باسن."],
  ["CROTCH HEIGHT", "Floor to the crotch level while standing.", "ارتفاع فاق: فاصله کف زمین تا سطح فاق در حالت ایستاده."],
  ["HIP BREADTH", "Straight side-to-side hip width; this is not circumference.", "عرض باسن: فاصله مستقیم از چپ تا راست باسن؛ این عدد دور باسن نیست."],
  ["BUTTOCK DEPTH", "Front-to-back thickness at the buttock level.", "عمق باسن: ضخامت بدن از جلو تا عقب در سطح باسن."],
  ["HIP C-7\" BLW WAIST", "Hip circumference measured seven inches below the waist.", "دور باسن که ۷ اینچ پایین‌تر از کمر اندازه‌گیری شده است."],
  ["HIP C-9\" BLW WAIST", "Hip circumference measured nine inches below the waist.", "دور باسن که ۹ اینچ پایین‌تر از کمر اندازه‌گیری شده است."],
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
  knownDepthRatioAnswers,
  measurement,
  depthMethod,
  onDepthMethodChange,
}: Props) {
  if (!rows.length || !modelStage) return null;
  const rowOnly = modelStage === "wear-1d-row-prior";
  const floorRows = FLOOR_ORDER.flatMap((kind) => {
    const row = rows.find((candidate) => candidate.kind === kind);
    return row?.heightFromFloorCm == null ? [] : [row];
  });
  const bmi = heightCm > 0 && weightKg > 0 ? weightKg / ((heightCm / 100) ** 2) : null;
  const directDepthReady = rows.every((row) => row.wearDepthCohort != null);
  const absoluteDepthReady = rows.every((row) => row.wearAbsoluteDepthModel != null);
  const reviewedRowsActive = rows.some((row) => row.reviewedCoordinateOverride != null);

  return (
    <section data-testid="local-ml-row-evidence" className="rounded-xl border border-violet-200 bg-white p-4 text-slate-800">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h4 className="text-sm font-medium text-slate-950">
            {reviewedRowsActive ? "Saved reviewed red lines are active" : "WEAR 1D row prediction"}
          </h4>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-600">
            {reviewedRowsActive
              ? "The current calculation uses the saved reviewed row and endpoints. WEAR's original row prediction stays below for comparison only; this run does not count as Local ML row accuracy."
              : "The model chooses how far down the body each red line belongs. The current endpoints come from the visible MediaPipe person mask."}
          </p>
        </div>
        <span className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${depthReady || directDepthReady ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
          {depthReady
            ? "Rows + learned 3D depth"
            : depthMethod === "wear-absolute-depth" && absoluteDepthReady
              ? "Rows + photo width/WEAR depth"
              : directDepthReady ? "Rows + photo width/WEAR ratio" : "WEAR group unavailable"}
        </span>
      </div>

      {floorRows.length ? (
        <div data-testid="wear-floor-height-guide" className="mt-3 rounded-xl border-2 border-cyan-300 bg-cyan-50 p-3">
          <h5 className="text-sm font-semibold text-cyan-950">Start at the floor. How far do I go up?</h5>
          <p className="mt-1 text-[11px] leading-4 text-cyan-900">
            Put the bottom of the blue ruler at the feet. Go upward by the number below. That is where WEAR 1D expects each red row.{reviewedRowsActive ? " These are comparison predictions; the saved reviewed lines remain active." : ""}
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

      {rowOnly ? (
        <section data-testid="wear-depth-method-selector" className="mt-3 rounded-xl border border-violet-200 bg-violet-50 p-3">
          <h5 className="text-sm font-semibold text-violet-950">How should Local ML get front-to-back depth?</h5>
          <p className="mt-1 text-[11px] leading-4 text-violet-900">Pick one. The photo red line owns width in both methods.</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              aria-pressed={depthMethod === "wear-ratio"}
              onClick={() => onDepthMethodChange("wear-ratio")}
              className={`rounded-lg border p-3 text-left ${depthMethod === "wear-ratio" ? "border-violet-600 bg-white ring-2 ring-violet-200" : "border-violet-200 bg-violet-50"}`}
            >
              <span className="block text-xs font-semibold text-slate-950">Photo red width + WEAR ratio</span>
              <span className="mt-1 block text-[10px] leading-4 text-slate-600">Breadth comes from the photo. Depth = that breadth × the WEAR group ratio.</span>
            </button>
            <button
              type="button"
              aria-pressed={depthMethod === "wear-absolute-depth"}
              disabled={!absoluteDepthReady}
              onClick={() => onDepthMethodChange("wear-absolute-depth")}
              className={`rounded-lg border p-3 text-left disabled:cursor-not-allowed disabled:opacity-50 ${depthMethod === "wear-absolute-depth" ? "border-emerald-600 bg-white ring-2 ring-emerald-200" : "border-emerald-200 bg-emerald-50"}`}
            >
              <span className="block text-xs font-semibold text-slate-950">Photo red width + WEAR depth cm</span>
              <span className="mt-1 block text-[10px] leading-4 text-slate-600">Depth is predicted directly in cm from red width, BMI, height and sex.</span>
            </button>
          </div>
        </section>
      ) : null}

      {rowOnly && depthMethod === "wear-ratio" ? (
        <section data-testid="wear-direct-depth-cohorts" className="mt-3 rounded-xl border-2 border-emerald-300 bg-emerald-50 p-3">
          <h5 className="text-sm font-semibold text-emerald-950">Body depth · what measured WEAR people say</h5>
          <p className="mt-1 text-[11px] leading-4 text-emerald-900">
            No regression formula. We put {profileLabel} inside one fixed gender, height and BMI range, then use the middle real depth ÷ breadth ratio from that group.
          </p>
          <p className="mt-1 text-[10px] text-emerald-800">
            {profileLabel}: {gender} · {heightCm.toFixed(1)} cm · {weightKg.toFixed(1)} kg{bmi != null ? ` · BMI ${bmi.toFixed(1)}` : ""}
          </p>
          <div className="mt-3 grid gap-2 lg:grid-cols-3">
            {rows.map((row) => {
              const cohort = row.wearDepthCohort;
              const knownAnswer = knownDepthRatioAnswers?.[row.kind] ?? null;
              const difference = cohort && knownAnswer != null ? cohort.medianDepthRatio - knownAnswer : null;
              return (
                <article key={row.kind} className="rounded-xl border border-emerald-200 bg-white p-3">
                  <h6 className="text-xs font-semibold text-slate-950">{LABELS[row.kind]}</h6>
                  {cohort ? (
                    <>
                      <div className="mt-2 rounded-lg bg-slate-50 px-2.5 py-2 text-[10px] leading-4 text-slate-700">
                        <span className="block font-medium text-slate-900">Range we created</span>
                        {cohort.gender} · height {cohort.heightMinCm.toFixed(1)}–{cohort.heightMaxCm.toFixed(1)} cm · BMI {cohort.bmiMin.toFixed(0)}–{cohort.bmiMax.toFixed(0)}
                        <span className="mt-1 block">{cohort.sampleCount.toLocaleString()} measured people</span>
                      </div>
                      <div className="mt-2 text-[10px] text-emerald-800">Direct WEAR middle ratio</div>
                      <div className="font-mono text-2xl font-semibold text-slate-950">{cohort.medianDepthRatio.toFixed(3)}</div>
                      <div className="text-[10px] text-slate-500">middle 80%: {cohort.p10DepthRatio.toFixed(3)}–{cohort.p90DepthRatio.toFixed(3)}</div>
                      {knownAnswer != null && difference != null ? (
                        <div className="mt-2 rounded-lg border border-violet-100 bg-violet-50 px-2.5 py-2 text-[10px] leading-4">
                          <span className="block text-violet-700">Known {profileLabel} answer · test only</span>
                          <span className="font-mono text-sm text-slate-950">{knownAnswer.toFixed(3)}</span>
                          <span className="ml-2 text-slate-600">WEAR difference {difference >= 0 ? "+" : ""}{difference.toFixed(3)}</span>
                        </div>
                      ) : null}
                      {row.kind === "trouserWaist" ? (
                        <p className="mt-2 rounded bg-amber-50 px-2 py-1 text-[10px] leading-4 text-amber-900">
                          This is a stomach/abdomen proxy. WEAR has no exact trouser-waist plane.
                        </p>
                      ) : null}
                      <details className="mt-2 text-[10px] leading-4 text-slate-600">
                        <summary className="cursor-pointer font-medium text-slate-700">Show the real group measurements</summary>
                        <div className="mt-1">Middle breadth {cohort.medianBreadthCm.toFixed(1)} cm · middle depth {cohort.medianDepthCm.toFixed(1)} cm</div>
                        <div>{cohort.measurement}</div>
                      </details>
                    </>
                  ) : (
                    <p className="mt-2 rounded-lg bg-amber-50 px-2.5 py-2 text-[10px] leading-4 text-amber-900">
                      Not enough measured {gender} people exist inside this height/BMI range. No depth result is produced.
                    </p>
                  )}
                </article>
              );
            })}
          </div>
          <p className="mt-2 text-[10px] leading-4 text-emerald-900">
            The saved {profileLabel} ratios are shown only after WEAR is selected, so they can score the result. They never choose or change the WEAR number.
          </p>
        </section>
      ) : null}

      {rowOnly && depthMethod === "wear-absolute-depth" ? (
        <section data-testid="wear-absolute-depth-model" className="mt-3 rounded-xl border-2 border-emerald-300 bg-emerald-50 p-3">
          <h5 className="text-sm font-semibold text-emerald-950">Photo width + WEAR absolute depth</h5>
          <p className="mt-1 text-[11px] leading-4 text-emerald-900">
            Apple/Depth converts the red line to front width in cm. A WEAR-only formula then predicts front-to-back depth in cm. Shane, Nadia and saved answers never trained it.
          </p>
          <div className="mt-3 grid gap-2 lg:grid-cols-3">
            {rows.map((row) => {
              const model = row.wearAbsoluteDepthModel;
              const candidate = measurement?.rows.find((item) => item.kind === row.kind) ?? null;
              const prediction = model && candidate ? predictWearAbsoluteDepthCm(model, {
                breadthCm: candidate.formulaWidthCm,
                heightCm,
                weightKg,
                gender,
              }) : null;
              const impliedRatio = prediction && candidate && candidate.formulaWidthCm > 0
                ? prediction.depthCm / candidate.formulaWidthCm
                : null;
              return (
                <article key={row.kind} className="rounded-xl border border-emerald-200 bg-white p-3">
                  <h6 className="text-xs font-semibold text-slate-950">{LABELS[row.kind]}</h6>
                  {model ? (
                    <>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <div className="rounded-lg bg-blue-50 p-2">
                          <div className="text-[9px] text-blue-700">Photo red width</div>
                          <div className="font-mono text-lg font-semibold text-slate-950">{candidate ? `${candidate.formulaWidthCm.toFixed(1)} cm` : "waiting"}</div>
                          <div className="text-[9px] text-slate-500">Apple/Depth row scale</div>
                        </div>
                        <div className="rounded-lg bg-violet-50 p-2">
                          <div className="text-[9px] text-violet-700">WEAR predicted depth</div>
                          <div className="font-mono text-lg font-semibold text-slate-950">{prediction ? `${prediction.depthCm.toFixed(1)} cm` : "waiting"}</div>
                          <div className="text-[9px] text-slate-500">absolute cm formula</div>
                        </div>
                      </div>
                      <div className="mt-2 rounded-lg bg-slate-50 px-2.5 py-2 text-[10px] leading-4 text-slate-700">
                        Trained on {model.trainingSubjects.toLocaleString()} anonymous people from {model.trainingSurveyCount} surveys.
                        <span className="mt-1 block">WEAR-only validation: average depth error {model.validationMaeCm.toFixed(1)} cm · 90% within {model.validationP90AbsErrorCm.toFixed(1)} cm.</span>
                      </div>
                      <div className="mt-2 text-[10px] text-slate-600">
                        Implied ratio {impliedRatio?.toFixed(3) ?? "n/a"} · information only
                      </div>
                      {candidate ? <div className="mt-2 text-[10px] text-emerald-800">Active circumference {candidate.guidedCm.toFixed(1)} cm</div> : null}
                      {prediction?.outsideTypicalFeatures.length ? (
                        <p className="mt-2 rounded bg-amber-50 px-2 py-1 text-[10px] leading-4 text-amber-900">
                          Outside the model&apos;s typical WEAR range for {prediction.outsideTypicalFeatures.join(", ")}.
                        </p>
                      ) : null}
                    </>
                  ) : (
                    <div className="mt-2 rounded bg-amber-50 px-2 py-1.5 text-[10px] text-amber-900">Absolute-depth model unavailable.</div>
                  )}
                  {row.kind === "trouserWaist" ? (
                    <p className="mt-2 rounded bg-amber-50 px-2 py-1 text-[10px] leading-4 text-amber-900">
                      WEAR uses a stomach/abdomen proxy here, not an exact trouser waistband plane.
                    </p>
                  ) : null}
                </article>
              );
            })}
          </div>
          <p className="mt-2 text-[10px] leading-4 text-emerald-900">This predicts hidden depth; it does not directly see the person&apos;s back. The red width is still measured from the photo.</p>
        </section>
      ) : null}

      {floorRows.length ? (
        <details data-testid="wear-column-translation" className="mt-3 rounded-xl border border-indigo-200 bg-indigo-50/60 p-3">
          <summary className="cursor-pointer text-sm font-medium text-indigo-950">WEAR column meanings · English + فارسی</summary>
          <div className="mt-3 grid gap-3 lg:grid-cols-3">
            {floorRows.map((row) => (
              <article key={row.kind} className="rounded-xl border border-indigo-100 bg-white p-3">
                <h5 className="text-xs font-medium text-slate-950">{LABELS[row.kind]}</h5>
                <code className="mt-2 block rounded bg-slate-100 px-2 py-1 text-[10px] text-slate-900">{row.referenceCohort?.sourceColumn ?? "Column unavailable"}</code>
                <p className="mt-2 text-[11px] leading-5 text-slate-700">{WEAR_COLUMN_TRANSLATIONS[row.kind]}</p>
                <p lang="fa" dir="rtl" className="mt-2 text-right text-[11px] leading-6 text-slate-800">{WEAR_COLUMN_TRANSLATIONS_FA[row.kind]}</p>
              </article>
            ))}
          </div>
          <details className="mt-3 rounded-lg border border-indigo-100 bg-white p-3">
            <summary className="cursor-pointer text-xs font-medium text-slate-900">Translate every old WEAR column</summary>
            <div className="mt-3 grid gap-x-5 gap-y-2 md:grid-cols-2">
              {WEAR_COLUMN_GLOSSARY.map(([column, translation, persianTranslation]) => (
                <div key={column} className="grid gap-1 border-b border-slate-100 pb-2 text-[11px] leading-4 sm:grid-cols-[145px_1fr]">
                  <code className="text-slate-900">{column}</code>
                  <div>
                    <div className="text-slate-600">{translation}</div>
                    <div lang="fa" dir="rtl" className="mt-1 text-right leading-5 text-slate-800">{persianTranslation}</div>
                  </div>
                </div>
              ))}
            </div>
          </details>
        </details>
      ) : null}

      <div className="mt-3 grid gap-2 text-[11px] leading-4 md:grid-cols-4">
        <div className="rounded-lg bg-violet-50 p-2.5">
          <span className="text-violet-600">1 · WEAR 1D</span>
          <div className="mt-1 text-slate-800">Predicts the vertical Y position.</div>
        </div>
        <div className="rounded-lg bg-blue-50 p-2.5">
          <span className="text-blue-600">2 · MEDIAPIPE MASK</span>
          <div className="mt-1 text-slate-800">Finds temporary visible left and right edges.</div>
        </div>
        <div className="rounded-lg bg-emerald-50 p-2.5">
          <span className="text-emerald-700">3 · {depthMethod === "wear-absolute-depth" ? "PHOTO WIDTH + WEAR DEPTH CM" : "PHOTO WIDTH + WEAR RATIO"}</span>
          <div className="mt-1 text-slate-800">
            {depthMethod === "wear-absolute-depth"
              ? "Uses red-line width and predicts depth directly in centimetres."
              : "Uses the middle measured ratio inside the visible height/BMI range. No regression."}
          </div>
        </div>
        <div className="rounded-lg bg-amber-50 p-2.5">
          <span className="text-amber-700">4 · FINAL CALCULATOR</span>
          <div className="mt-1 text-slate-800">
            {depthMethod === "wear-absolute-depth"
              ? "The ellipse uses photo red width plus WEAR-predicted depth."
              : "Apple/Depth scales the red width; the ellipse converts that width and WEAR-ratio depth into circumference."}
          </div>
        </div>
      </div>

      <details className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <summary className="cursor-pointer text-xs font-medium text-slate-800">Row-model debug details</summary>
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
      </details>

      {rowOnly ? (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-4 text-amber-900">
          {depthMethod === "wear-absolute-depth"
            ? "The red line stays the active breadth. WEAR predicts depth in centimetres. Saved ratio sliders stay unchanged and inactive."
            : "The photo model still does not learn body depth. This path uses direct WEAR group ratios without regression. Saved person ratios are test answers only and are never loaded into the calculation."}
        </div>
      ) : null}
      <div className="mt-2 text-[10px] text-slate-500">
        Endpoint source: {endpointSource === "mediapipe-central-torso-mask"
          ? "MediaPipe central torso mask; arm and hand pixels are excluded"
          : endpointSource === "mediapipe-visible-mask"
            ? "MediaPipe visible person mask"
            : "trained local model"}.
      </div>
    </section>
  );
}
