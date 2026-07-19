import type { Gender } from "../types";

export type DepthRatioTableRowKind = "waist" | "trouserWaist" | "hips";
export type DepthRatioBodyShape =
  | "average"
  | "curvy-hourglass"
  | "pear-hip-dominant"
  | "athletic-inverted"
  | "straight-round";

type DepthRatioTablePart = "waist" | "hips";
export type WearFormulaFeature = "bmi" | "rowWidthToHeight" | "waistToHipWidth";

export interface WearDepthRatioFormulaTerm {
  feature: WearFormulaFeature;
  label: string;
  input: number;
  center: number;
  coefficient: number;
  contribution: number;
  trainingP05: number;
  trainingP95: number;
  insideTrainingRange: boolean;
}

export interface DepthRatioTableEstimate {
  source: "WEAR 1D measured depth-ratio regression v1";
  part: DepthRatioTablePart;
  rowKind: DepthRatioTableRowKind;
  gender: Gender;
  bmi: number;
  bmiBand: string;
  bodyShape: DepthRatioBodyShape;
  bodyShapeSource: "waist-hip-width-proxy" | "waist-hip-shoulder-width-proxy" | "average-fallback";
  depthRatioP10: number;
  depthRatioMedian: number;
  depthRatioP90: number;
  depthRatioPolicy: "wear-linear-regression";
  shapeOffset: number;
  depthRatio: number;
  rawDepthRatio: number;
  supportedMin: number;
  supportedMax: number;
  formulaIntercept: number;
  formulaTerms: WearDepthRatioFormulaTerm[];
  trainingSubjects: number;
  trainingSurveys: string[];
  validationMethod: "leave-one-survey-out" | "deterministic-five-fold";
  validationMae: number;
  validationP90AbsError: number;
  confidence: "study-supported" | "limited-study" | "outside-study-range";
  notes: string[];
}

interface FormulaFeatureConfig {
  center: number;
  coefficient: number;
  p05: number;
  p95: number;
}

interface FormulaModel {
  intercept: number;
  features: Partial<Record<WearFormulaFeature, FormulaFeatureConfig>>;
  supportedMin: number;
  supportedMax: number;
  trainingSubjects: number;
  trainingSurveys: string[];
  validationMethod: DepthRatioTableEstimate["validationMethod"];
  validationMae: number;
  validationP90AbsError: number;
}

type FormulaModels = Record<Gender, Record<DepthRatioTableRowKind, FormulaModel>>;

// Generated from the purchased WEAR 1D archive by
// scripts/fit_wear_depth_ratio_formula.py. Shane 2 and Nadia are not present
// in that archive and were not used to choose or adjust any coefficient.
//
// Target: measured front-to-back depth / measured front breadth. This matches
// the physical meaning of the UI slider. Circumference is still a separate
// ellipse approximation made after this ratio is predicted.
const WEAR_FORMULAS: FormulaModels = {
  female: {
    waist: {
      intercept: 0.7043210755,
      features: {
        bmi: { center: 21.822353871, coefficient: 0.01340413, p05: 18.099150535, p95: 26.197595145 },
        rowWidthToHeight: { center: 0.1500292961, coefficient: -1.730642283, p05: 0.129789225, p95: 0.17474561 },
      },
      supportedMin: 0.592051084,
      supportedMax: 0.830298782,
      trainingSubjects: 3573,
      trainingSurveys: ["USAF Women 1968", "US Army Women 1977", "Airline Stewardesses 1972"],
      validationMethod: "leave-one-survey-out",
      validationMae: 0.03944869,
      validationP90AbsError: 0.081346854,
    },
    trouserWaist: {
      intercept: 0.732715849,
      features: {
        bmi: { center: 22.410065316, coefficient: 0.019753455, p05: 18.311137315, p95: 26.993957451 },
        rowWidthToHeight: { center: 0.1845248491, coefficient: -3.096507876, p05: 0.159999084, p95: 0.212287688 },
      },
      supportedMin: 0.594146388,
      supportedMax: 0.91244194,
      trainingSubjects: 255,
      trainingSurveys: ["US Army Women 1977 abdominal-extension row"],
      validationMethod: "deterministic-five-fold",
      validationMae: 0.041148215,
      validationP90AbsError: 0.085601889,
    },
    hips: {
      intercept: 0.6071179007,
      features: {
        bmi: { center: 21.459721014, coefficient: 0.014491822, p05: 18.01275326, p95: 25.725561964 },
        rowWidthToHeight: { center: 0.2129389892, coefficient: -2.421396022, p05: 0.192065898, p95: 0.237283315 },
      },
      supportedMin: 0.5271651,
      supportedMax: 0.703147743,
      trainingSubjects: 2295,
      trainingSurveys: ["USAF Women 1968", "Airline Stewardesses 1972"],
      validationMethod: "leave-one-survey-out",
      validationMae: 0.024123305,
      validationP90AbsError: 0.049994287,
    },
  },
  male: {
    waist: {
      intercept: 0.7312079315,
      features: {
        bmi: { center: 23.807611101, coefficient: 0.010710663, p05: 19.918507021, p95: 28.235947345 },
        rowWidthToHeight: { center: 0.1633572663, coefficient: -1.384037468, p05: 0.139383645, p95: 0.187780292 },
      },
      supportedMin: 0.62010453,
      supportedMax: 0.8515625,
      trainingSubjects: 11251,
      trainingSurveys: ["German Air Force 1968", "US Air Traffic Controllers 1961", "US Naval Aviators 1964", "US Flying Personnel 1950", "NATO 1960-61", "ROKAF 1960"],
      validationMethod: "leave-one-survey-out",
      validationMae: 0.037274419,
      validationP90AbsError: 0.077024178,
    },
    trouserWaist: {
      intercept: 0.7472053648,
      features: {
        bmi: { center: 26.145362269, coefficient: 0.000865845, p05: 18.747075316, p95: 34.430802327 },
        rowWidthToHeight: { center: 0.1812614784, coefficient: 0.798355959, p05: 0.156527669, p95: 0.210755571 },
      },
      supportedMin: 0.633624712,
      supportedMax: 0.905548439,
      trainingSubjects: 563,
      trainingSurveys: ["Canadian Forces 1974 stomach row"],
      validationMethod: "deterministic-five-fold",
      validationMae: 0.041864749,
      validationP90AbsError: 0.081372584,
    },
    hips: {
      intercept: 0.6742636433,
      features: {
        bmi: { center: 23.807611101, coefficient: 0.01033994, p05: 19.918507021, p95: 28.235947345 },
        rowWidthToHeight: { center: 0.1949139446, coefficient: -1.697125957, p05: 0.179010546, p95: 0.212050333 },
        waistToHipWidth: { center: 0.8376477415, coefficient: 0.405890165, p05: 0.742236025, p95: 0.92570544 },
      },
      supportedMin: 0.558500059,
      supportedMax: 0.792284866,
      trainingSubjects: 11251,
      trainingSurveys: ["German Air Force 1968", "US Air Traffic Controllers 1961", "US Naval Aviators 1964", "US Flying Personnel 1950", "NATO 1960-61", "ROKAF 1960"],
      validationMethod: "leave-one-survey-out",
      validationMae: 0.028838725,
      validationP90AbsError: 0.059603541,
    },
  },
};

const FEATURE_LABELS: Record<WearFormulaFeature, string> = {
  bmi: "BMI",
  rowWidthToHeight: "red width ÷ height",
  waistToHipWidth: "waist width ÷ hip width",
};

const SHAPE_THRESHOLDS = {
  female: { waistHipP25: 0.804, waistHipP75: 0.884, shoulderHipP25: 1.229, shoulderHipP75: 1.32 },
  male: { waistHipP25: 0.904, waistHipP75: 0.982, shoulderHipP25: 1.43, shoulderHipP75: 1.525 },
} satisfies Record<Gender, {
  waistHipP25: number;
  waistHipP75: number;
  shoulderHipP25: number;
  shoulderHipP75: number;
}>;

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function round(n: number, digits = 3): number {
  const multiplier = 10 ** digits;
  return Math.round(n * multiplier) / multiplier;
}

function resolvePart(rowKind: DepthRatioTableRowKind): DepthRatioTablePart {
  return rowKind === "hips" ? "hips" : "waist";
}

function classifyBodyShape(args: {
  gender: Gender;
  waistWidthCm?: number | null;
  hipWidthCm?: number | null;
  shoulderWidthCm?: number | null;
}): Pick<DepthRatioTableEstimate, "bodyShape" | "bodyShapeSource"> {
  const waistHip = args.waistWidthCm && args.hipWidthCm && args.hipWidthCm > 0
    ? args.waistWidthCm / args.hipWidthCm
    : null;
  const shoulderHip = args.shoulderWidthCm && args.hipWidthCm && args.hipWidthCm > 0
    ? args.shoulderWidthCm / args.hipWidthCm
    : null;
  const thresholds = SHAPE_THRESHOLDS[args.gender];

  if (waistHip == null) return { bodyShape: "average", bodyShapeSource: "average-fallback" };
  if (shoulderHip != null) {
    if (waistHip <= thresholds.waistHipP25 && shoulderHip < thresholds.shoulderHipP75) {
      return { bodyShape: "curvy-hourglass", bodyShapeSource: "waist-hip-shoulder-width-proxy" };
    }
    if (shoulderHip <= thresholds.shoulderHipP25) {
      return { bodyShape: "pear-hip-dominant", bodyShapeSource: "waist-hip-shoulder-width-proxy" };
    }
    if (shoulderHip >= thresholds.shoulderHipP75) {
      return { bodyShape: "athletic-inverted", bodyShapeSource: "waist-hip-shoulder-width-proxy" };
    }
  }
  if (waistHip >= thresholds.waistHipP75) return { bodyShape: "straight-round", bodyShapeSource: "waist-hip-width-proxy" };
  if (waistHip <= thresholds.waistHipP25) return { bodyShape: "curvy-hourglass", bodyShapeSource: "waist-hip-width-proxy" };
  return { bodyShape: "average", bodyShapeSource: "waist-hip-width-proxy" };
}

function resolveRowWidth(args: {
  rowKind: DepthRatioTableRowKind;
  waistWidthCm?: number | null;
  trouserWidthCm?: number | null;
  hipWidthCm?: number | null;
}): number | null {
  if (args.rowKind === "waist") return args.waistWidthCm ?? null;
  if (args.rowKind === "trouserWaist") return args.trouserWidthCm ?? null;
  return args.hipWidthCm ?? null;
}

export function estimateDepthRatioFromTable(args: {
  rowKind: DepthRatioTableRowKind;
  gender: Gender;
  bmi: number;
  heightCm?: number | null;
  waistWidthCm?: number | null;
  trouserWidthCm?: number | null;
  hipWidthCm?: number | null;
  shoulderWidthCm?: number | null;
}): DepthRatioTableEstimate | null {
  if (!Number.isFinite(args.bmi) || args.bmi <= 0 || !args.heightCm || args.heightCm <= 0) return null;
  const rowWidthCm = resolveRowWidth(args);
  if (!rowWidthCm || rowWidthCm <= 0) return null;

  const model = WEAR_FORMULAS[args.gender][args.rowKind];
  const inputs: Record<WearFormulaFeature, number> = {
    bmi: args.bmi,
    rowWidthToHeight: rowWidthCm / args.heightCm,
    waistToHipWidth: args.waistWidthCm && args.hipWidthCm && args.hipWidthCm > 0
      ? args.waistWidthCm / args.hipWidthCm
      : 1,
  };
  const formulaTerms = (Object.entries(model.features) as Array<[WearFormulaFeature, FormulaFeatureConfig]>)
    .map(([feature, config]) => {
      const input = inputs[feature];
      return {
        feature,
        label: FEATURE_LABELS[feature],
        input: round(input, 5),
        center: round(config.center, 5),
        coefficient: round(config.coefficient, 5),
        contribution: round(config.coefficient * (input - config.center), 5),
        trainingP05: round(config.p05, 5),
        trainingP95: round(config.p95, 5),
        insideTrainingRange: input >= config.p05 && input <= config.p95,
      };
    });
  const rawDepthRatio = model.intercept + formulaTerms.reduce((sum, term) => sum + term.contribution, 0);
  const depthRatio = clamp(rawDepthRatio, model.supportedMin, model.supportedMax);
  const outOfRange = formulaTerms.filter((term) => !term.insideTrainingRange);
  const limitedStudy = model.trainingSurveys.length < 3;
  const confidence: DepthRatioTableEstimate["confidence"] = outOfRange.length
    ? "outside-study-range"
    : limitedStudy
      ? "limited-study"
      : "study-supported";
  const shape = classifyBodyShape(args);
  const predictionLow = clamp(depthRatio - model.validationP90AbsError, model.supportedMin, model.supportedMax);
  const predictionHigh = clamp(depthRatio + model.validationP90AbsError, model.supportedMin, model.supportedMax);
  const notes = [
    "WEAR 1D regression target is measured front-to-back depth divided by measured front breadth.",
    "Shane 2 and Nadia are holdout checks only; their saved ratios are not formula inputs.",
    args.rowKind === "trouserWaist"
      ? "Trouser waist is the weakest row: WEAR uses an abdominal/stomach proxy, not an exact trouser-band plane."
      : "",
    limitedStudy ? `Limited source diversity: ${model.trainingSurveys.length} survey${model.trainingSurveys.length === 1 ? "" : "s"}.` : "",
    outOfRange.length ? `Outside the central WEAR range for: ${outOfRange.map((term) => term.label).join(", ")}.` : "",
    rawDepthRatio !== depthRatio ? "Raw prediction was clamped to the observed WEAR support range." : "",
  ].filter(Boolean);

  return {
    source: "WEAR 1D measured depth-ratio regression v1",
    part: resolvePart(args.rowKind),
    rowKind: args.rowKind,
    gender: args.gender,
    bmi: round(args.bmi, 1),
    bmiBand: confidence === "outside-study-range" ? "outside central WEAR range" : "inside central WEAR range",
    bodyShape: shape.bodyShape,
    bodyShapeSource: shape.bodyShapeSource,
    depthRatioP10: round(predictionLow),
    depthRatioMedian: round(depthRatio),
    depthRatioP90: round(predictionHigh),
    depthRatioPolicy: "wear-linear-regression",
    shapeOffset: 0,
    depthRatio: round(depthRatio),
    rawDepthRatio: round(rawDepthRatio, 5),
    supportedMin: round(model.supportedMin),
    supportedMax: round(model.supportedMax),
    formulaIntercept: round(model.intercept, 5),
    formulaTerms,
    trainingSubjects: model.trainingSubjects,
    trainingSurveys: model.trainingSurveys,
    validationMethod: model.validationMethod,
    validationMae: round(model.validationMae, 4),
    validationP90AbsError: round(model.validationP90AbsError, 4),
    confidence,
    notes,
  };
}
