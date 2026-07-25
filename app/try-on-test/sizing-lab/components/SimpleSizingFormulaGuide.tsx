import type {
  GeminiGuideMeasurement,
  GeminiGuideMeasurementRow,
  GeminiGuideRowKind,
} from "../lib/geminiGuide";
import type { LocalMlNormalizedRowPrediction } from "../lib/localMlSizing";

type FormulaMode = "manual" | "local-ml";

interface FormulaScaleEvidence {
  source: "vertical-tape" | "mask-height" | "pose-landmarks" | "manual-height";
  activeCmPerPx: number;
  anchors: Array<{ label: string; tapeCm: number; yPx: number }>;
}

interface Props {
  mode: FormulaMode;
  measurement: GeminiGuideMeasurement | null;
  wearRowPredictions?: LocalMlNormalizedRowPrediction[];
  heightCm: number;
  weightKg: number;
  gender: "male" | "female";
  scaleEvidence?: FormulaScaleEvidence | null;
}

const ROWS: Array<{ kind: GeminiGuideRowKind; label: string }> = [
  { kind: "waist", label: "Natural waist" },
  { kind: "trouserWaist", label: "Trouser waist" },
  { kind: "hips", label: "Hips" },
];

const FEATURE_LABELS: Record<string, string> = {
  intercept: "1",
  height_z: "height z-score",
  bmi_z: "BMI z-score",
  is_male: "male flag",
  height_z_x_bmi_z: "height z-score × BMI z-score",
  is_male_x_bmi_z: "male flag × BMI z-score",
};

function fixed(value: number | null | undefined, digits = 3): string {
  return typeof value === "number" && Number.isFinite(value) ? value.toFixed(digits) : "waiting";
}

function sourceLabel(source: GeminiGuideMeasurementRow["depthSource"]): string {
  if (source === "manual-depth-ratio") return "your slider";
  if (source === "wear-cohort-median") return "direct WEAR people";
  if (source === "wear-absolute-depth") return "WEAR absolute depth in cm";
  if (source === "local-ml-depth-ratio") return "future trained 3D model";
  if (source.startsWith("side-")) return "side-photo depth";
  if (source === "wear-depth-ratio-formula") return "WEAR regression";
  return "front-only depth estimate";
}

function scaleSourceLabel(measurement: GeminiGuideMeasurement | null, evidence?: FormulaScaleEvidence | null): string {
  if (measurement?.activeScaleSource === "apple-vision-body-depth") return "Apple + Depth row correction";
  if (evidence?.source === "manual-height") return "yellow manual height line";
  if (evidence?.source === "mask-height") return "MediaPipe mask height";
  if (evidence?.source === "pose-landmarks") return "pose-landmark height";
  if (evidence?.source === "vertical-tape") return "saved vertical tape scale";
  return "known-height scale";
}

function StepCard({ number, title, children, tone = "slate" }: {
  number: number;
  title: string;
  children: React.ReactNode;
  tone?: "slate" | "blue" | "violet" | "emerald" | "amber";
}) {
  const tones = {
    slate: "border-slate-200 bg-slate-50 text-slate-800",
    blue: "border-blue-200 bg-blue-50 text-blue-950",
    violet: "border-violet-200 bg-violet-50 text-violet-950",
    emerald: "border-emerald-200 bg-emerald-50 text-emerald-950",
    amber: "border-amber-200 bg-amber-50 text-amber-950",
  };
  return (
    <div className={`rounded-xl border p-3 ${tones[tone]}`}>
      <div className="flex items-center gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-semibold shadow-sm">{number}</span>
        <div className="text-xs font-semibold">{title}</div>
      </div>
      <div className="mt-2 text-[11px] leading-4">{children}</div>
    </div>
  );
}

function WearRegressionEquation({ row }: { row: GeminiGuideMeasurementRow }) {
  const table = row.depthRatioTable?.table;
  if (!table) return null;
  return (
    <div className="mt-2 rounded-lg border border-violet-200 bg-violet-50 p-2 text-[10px] leading-4 text-violet-950">
      <div className="font-semibold">WEAR depth-ratio regression</div>
      <div className="mt-1 font-mono text-[10px] break-words">
        ratio = {table.formulaIntercept.toFixed(5)} {table.formulaTerms.map((term) => (
          <span key={term.feature}> {term.coefficient >= 0 ? "+" : "−"} {Math.abs(term.coefficient).toFixed(5)} × ({term.input.toFixed(5)} − {term.center.toFixed(5)})</span>
        ))}
      </div>
      <div className="mt-1">
        Raw answer {table.rawDepthRatio.toFixed(5)} → limited to the measured WEAR range {table.supportedMin.toFixed(3)}–{table.supportedMax.toFixed(3)} → WEAR suggestion {table.depthRatio.toFixed(3)}.
      </div>
      {row.depthRatioOverride != null ? (
        <div className="mt-1 font-medium text-amber-800">Your slider {row.depthRatio.toFixed(3)} is active instead of the WEAR suggestion.</div>
      ) : null}
    </div>
  );
}

function LocalMlRowEquation({ prediction, heightCm, activeYPx }: {
  prediction?: LocalMlNormalizedRowPrediction;
  heightCm: number;
  activeYPx: number;
}) {
  const formula = prediction?.rowFormula;
  if (!prediction || !formula) return null;
  const coordinateOverride = prediction.reviewedCoordinateOverride;
  const terms = formula.featureNames.map((name, index) => ({
    name,
    value: formula.featureValues[index] ?? 0,
    coefficient: formula.coefficients[index] ?? 0,
  }));
  const targetYNorm = formula.maskTopNorm
    + formula.activeBodyFraction * (formula.maskBottomNorm - formula.maskTopNorm);
  return (
    <div className="mt-2 rounded-lg border border-blue-200 bg-blue-50 p-2 text-[10px] leading-4 text-blue-950">
      <div className="font-semibold">
        Local ML row-height equation{coordinateOverride ? " · comparison only" : ""}
      </div>
      {coordinateOverride ? (
        <div className="mt-1 rounded border border-amber-300 bg-amber-50 px-2 py-1 text-amber-900">
          Active red row: Y {activeYPx}px from {coordinateOverride.label}. Local ML originally predicted Y {coordinateOverride.modelYPx}px.
        </div>
      ) : null}
      <div className="mt-1 font-mono text-[10px] break-words">
        body fraction = {terms.map((term, index) => (
          <span key={`${term.name}-${index}`}>{index ? (term.coefficient >= 0 ? " + " : " − ") : ""}{Math.abs(term.coefficient).toFixed(6)} × {FEATURE_LABELS[term.name] ?? term.name} ({term.value.toFixed(4)})</span>
        ))}
      </div>
      <div className="mt-1">
        Raw {formula.rawBodyFraction.toFixed(4)} → safe range {formula.outputMin.toFixed(4)}–{formula.outputMax.toFixed(4)} → active {formula.activeBodyFraction.toFixed(4)}.
      </div>
      <div>
        Height from floor = {heightCm.toFixed(1)} × (1 − {formula.activeBodyFraction.toFixed(4)}) = <span className="font-semibold">{fixed(prediction.heightFromFloorCm, 1)} cm</span>.
      </div>
      <div>
        Image Y = mask top + active fraction × mask height = {(targetYNorm * 100).toFixed(1)}% of the image.
      </div>
    </div>
  );
}

function LiveRowMath({
  mode,
  label,
  row,
  prediction,
  heightCm,
  weightKg,
  gender,
}: {
  mode: FormulaMode;
  label: string;
  row: GeminiGuideMeasurementRow;
  prediction?: LocalMlNormalizedRowPrediction;
  heightCm: number;
  weightKg: number;
  gender: "male" | "female";
}) {
  const pixelSpan = Math.abs(row.rightXPx - row.leftXPx);
  const cohort = prediction?.wearDepthCohort;
  const absoluteDepthModel = prediction?.wearAbsoluteDepthModel;
  const bmi = weightKg / ((heightCm / 100) ** 2);
  const isMale = gender === "male" ? 1 : 0;
  const absoluteFeatureValues: Record<string, number> = {
    breadthCm: row.formulaWidthCm,
    bmi,
    heightCm,
    isMale,
    breadthMale: row.formulaWidthCm * isMale,
    bmiMale: bmi * isMale,
  };
  const activeWidthCm = row.calculationWidthCm;
  const a = activeWidthCm / 2;
  const b = row.depthCm / 2;
  const usesSideDepth = row.sideDepthAccepted && row.sideDepthRawCm != null;
  const sideComponent = row.sideDepthProjectionLeakRatio == null
    ? null
    : Math.sqrt(Math.max(0.001, 1 - row.sideDepthProjectionLeakRatio ** 2));

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h4 className="text-sm font-semibold text-slate-950">{label}</h4>
        <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-medium text-slate-600">Y {row.yPx}px</span>
      </div>

      {mode === "local-ml" ? (
        <LocalMlRowEquation prediction={prediction} heightCm={heightCm} activeYPx={row.yPx} />
      ) : (
        <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-[10px] leading-4 text-amber-950">
          <span className="font-semibold">Row position:</span> no formula. You placed this red line at Y {row.yPx}px.
        </div>
      )}

      <div className="mt-2 grid gap-2 text-[10px] leading-4 md:grid-cols-2">
        <div className="rounded-lg bg-slate-50 p-2">
          <div className="font-semibold text-slate-800">A · Red pixels</div>
          <div className="mt-1 font-mono text-[10px] text-slate-700">|right − left| = |{row.rightXPx} − {row.leftXPx}| = {pixelSpan}px</div>
          <div className="mt-1 text-slate-600">
            {mode === "local-ml"
              ? prediction?.reviewedCoordinateOverride
                ? `${prediction.reviewedCoordinateOverride.label} supplied the active endpoints. Local ML/MediaPipe originally proposed X ${prediction.reviewedCoordinateOverride.modelLeftXPx}–${prediction.reviewedCoordinateOverride.modelRightXPx}.`
                : "MediaPipe supplied these temporary visible edges."
              : "Your red endpoints supplied these edges."}
          </div>
        </div>
        <div className="rounded-lg bg-blue-50 p-2 text-blue-950">
          <div className="font-semibold">B · Photo red-line breadth</div>
          <div className="mt-1 font-mono text-[10px]">{pixelSpan}px × {row.cmPerPx.toFixed(6)} cm/px = {row.formulaWidthCm.toFixed(2)} cm</div>
          <div className="mt-1 text-blue-800">The red line is a straight front breadth, not circumference. It remains active in both Local ML methods.</div>
        </div>
        <div className="rounded-lg bg-violet-50 p-2 text-violet-950">
          <div className="font-semibold">C · Front-to-back depth</div>
          {usesSideDepth ? (
            <>
              <div className="mt-1 font-mono text-[10px]">
                {row.sideDepthProjectionLeakRatio && row.sideDepthProjectionLeakRatio > 0
                  ? <>({row.sideDepthRawCm!.toFixed(2)} − {row.formulaWidthCm.toFixed(2)} × {fixed(row.sideDepthProjectionLeakRatio, 3)}) ÷ {fixed(sideComponent, 3)} = {row.depthCm.toFixed(2)} cm</>
                  : <>{row.sideDepthRawCm!.toFixed(2)} cm = {row.depthCm.toFixed(2)} cm</>}
              </div>
              <div className="mt-1 text-violet-800">
                {row.sideDepthProjectionLeakRatio && row.sideDepthProjectionLeakRatio > 0
                  ? "Side-photo span corrected for camera projection."
                  : "Side-photo red line directly supplies the front-to-back depth."}
              </div>
            </>
          ) : row.depthSource === "wear-absolute-depth" && absoluteDepthModel ? (
            <>
              <div className="mt-1 font-mono text-[10px] break-words">
                depth = {absoluteDepthModel.interceptCm.toFixed(3)}{absoluteDepthModel.featureNames.map((feature) => {
                  const coefficient = absoluteDepthModel.coefficients[feature] ?? 0;
                  const value = absoluteFeatureValues[feature] ?? 0;
                  const center = absoluteDepthModel.featureCenters[feature] ?? 0;
                  return <span key={feature}> {coefficient >= 0 ? "+" : "−"} {Math.abs(coefficient).toFixed(3)} × ({value.toFixed(2)} − {center.toFixed(2)})</span>;
                })} = {row.depthCm.toFixed(2)} cm
              </div>
              <div className="mt-1 text-violet-800">WEAR predicts centimetres directly. The shown ratio {row.depthRatio.toFixed(3)} is only depth ÷ photo width after prediction.</div>
            </>
          ) : (
            <>
              <div className="mt-1 font-mono text-[10px]">{row.formulaWidthCm.toFixed(2)} cm × {row.depthRatio.toFixed(3)} = {row.depthCm.toFixed(2)} cm</div>
              <div className="mt-1 text-violet-800">Ratio source: {sourceLabel(row.depthSource)}.</div>
            </>
          )}
          {cohort && row.depthSource !== "wear-absolute-depth" ? (
            <div className="mt-1 rounded bg-white/70 p-1.5 text-[10px]">
              Ratio = median of each person&apos;s measured depth ÷ breadth = {cohort.medianDepthRatio.toFixed(3)} from {cohort.sampleCount.toLocaleString()} people in the {cohort.gender}, {cohort.heightMinCm.toFixed(1)}–{cohort.heightMaxCm.toFixed(1)} cm, BMI {cohort.bmiMin.toFixed(0)}–{cohort.bmiMax.toFixed(0)} box. This is a group middle, not a regression formula.
            </div>
          ) : null}
        </div>
        <div className="rounded-lg bg-emerald-50 p-2 text-emerald-950">
          <div className="font-semibold">D · Circumference</div>
          <div className="mt-1 font-mono text-[10px]">a = {activeWidthCm.toFixed(2)} ÷ 2 = {a.toFixed(2)} · b = {row.depthCm.toFixed(2)} ÷ 2 = {b.toFixed(2)}</div>
          <div className="mt-1 font-mono text-[10px] break-words">C = π[3(a+b) − √((3a+b)(a+3b))] = {row.guidedCm.toFixed(2)} cm</div>
          <div className="mt-1 text-emerald-800">This is Ramanujan&apos;s ellipse approximation. Breadth source: photo red line.</div>
        </div>
      </div>

      <WearRegressionEquation row={row} />
    </article>
  );
}

export function SimpleSizingFormulaGuide({
  mode,
  measurement,
  wearRowPredictions,
  heightCm,
  weightKg,
  gender,
  scaleEvidence,
}: Props) {
  const heightM = heightCm / 100;
  const bmi = heightM > 0 ? weightKg / (heightM * heightM) : 0;
  const bodySpanPx = scaleEvidence?.activeCmPerPx && scaleEvidence.activeCmPerPx > 0
    ? heightCm / scaleEvidence.activeCmPerPx
    : null;
  const scaleLabel = scaleSourceLabel(measurement, scaleEvidence);
  const usesAbsoluteDepth = Boolean(measurement?.rows.some((row) => row.depthSource === "wear-absolute-depth"));
  const usesMeasuredSideDepth = Boolean(measurement?.rows.some(
    (row) => row.sideDepthAccepted && row.depthSource === "side-guide-manual-coordinate",
  ));
  const firstAnchor = scaleEvidence?.anchors[0];
  const lastAnchor = scaleEvidence?.anchors[scaleEvidence.anchors.length - 1];

  return (
    <section data-testid="simple-sizing-formula-guide" className="rounded-2xl border-2 border-indigo-200 bg-gradient-to-b from-indigo-50 to-white p-4 text-slate-900 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">How this result is calculated</h3>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-600">
            Read left to right. A formula is shown as math. A model, a mask, or your hand is labelled honestly and is not called a formula.
          </p>
        </div>
        <span className="rounded-full border border-indigo-200 bg-white px-3 py-1 text-[10px] font-semibold text-indigo-800">
          {mode === "local-ml" ? "LOCAL ML" : "MANUAL COORDINATE"}
        </span>
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
        <StepCard number={1} title="Place the red rows" tone={mode === "local-ml" ? "blue" : "amber"}>
          {mode === "local-ml"
            ? "WEAR’s row equation chooses up/down. MediaPipe finds temporary left/right visible edges."
            : "You drag the row and both endpoints. There is no automatic row formula."}
        </StepCard>
        <StepCard number={2} title="Calculate BMI" tone="slate">
          <span className="font-mono">{weightKg.toFixed(1)} kg ÷ ({heightM.toFixed(3)} m × {heightM.toFixed(3)} m) = {bmi.toFixed(1)}</span>
          <div className="mt-1 text-slate-600">BMI helps choose the WEAR group or WEAR regression.</div>
        </StepCard>
        <StepCard number={3} title="Turn pixels into cm" tone="blue">
          <div>Active scale: <span className="font-semibold">{scaleLabel}</span>.</div>
          {measurement?.activeScaleSource === "apple-vision-body-depth" ? (
            <div className="mt-1">Apple/Depth supplies a corrected cm/px for each row; it is a model output, not one flat algebra formula.</div>
          ) : scaleEvidence?.source === "vertical-tape" && firstAnchor && lastAnchor ? (
            <div className="mt-1 font-mono text-[10px]">cm/px = |{lastAnchor.tapeCm}−{firstAnchor.tapeCm}| ÷ |{lastAnchor.yPx}−{firstAnchor.yPx}| = {scaleEvidence.activeCmPerPx.toFixed(6)}</div>
          ) : (
            <div className="mt-1 font-mono text-[10px]">cm/px = {heightCm.toFixed(1)} cm ÷ {fixed(bodySpanPx, 1)}px = {fixed(scaleEvidence?.activeCmPerPx ?? measurement?.activeCmPerPx, 6)}</div>
          )}
        </StepCard>
        <StepCard number={4} title="Estimate body depth" tone="violet">
          {usesMeasuredSideDepth
            ? "The side-photo red endpoints measure front-to-back depth at the same physical height as each front row. Move the side endpoints to correct it. WEAR depth and saved ratio sliders are inactive."
            : mode === "local-ml"
            ? usesAbsoluteDepth
              ? "WEAR uses the photo red-line width, BMI, height and sex to predict front-to-back depth directly in centimetres. Saved ratio sliders are not used."
              : "Direct WEAR mode uses the middle measured depth ÷ breadth ratio from matching people. A slider can override it."
            : "Manual mode uses your slider, accepted side-photo depth, or the visible WEAR regression shown below."}
        </StepCard>
        <StepCard number={5} title="Calculate around the body" tone="emerald">
          Front width and depth become the two diameters of an ellipse. The ellipse perimeter is the circumference result.
        </StepCard>
      </div>

      <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h4 className="text-sm font-semibold text-slate-900">Live math for all three red lines</h4>
          <span className="text-[10px] text-slate-500">{gender} · {heightCm.toFixed(1)} cm · BMI {bmi.toFixed(1)}</span>
        </div>
        {!measurement?.rows.length ? (
          <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-900">
            Run Analyze first. The formulas are ready, but live red-line numbers are still waiting.
          </div>
        ) : (
          <div className="mt-3 grid gap-3">
            {ROWS.map(({ kind, label }) => {
              const row = measurement.rows.find((candidate) => candidate.kind === kind);
              if (!row) return null;
              return (
                <LiveRowMath
                  key={kind}
                  mode={mode}
                  label={label}
                  row={row}
                  prediction={wearRowPredictions?.find((candidate) => candidate.kind === kind)}
                  heightCm={heightCm}
                  weightKg={weightKg}
                  gender={gender}
                />
              );
            })}
          </div>
        )}
      </div>

      <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-[10px] leading-4 text-rose-900">
        {mode === "local-ml"
          ? "Dataset measurements and tape labels are judges only. Saved Shane/Nadia ratios may be displayed for comparison, but they do not choose the Local ML answer."
          : "Dataset measurements and tape labels are judges only. Manual Coordinate may load a saved depth ratio into your slider; when that happens, the live row above says ‘your slider’ and shows the separate untouched WEAR suggestion."}
      </div>
    </section>
  );
}
