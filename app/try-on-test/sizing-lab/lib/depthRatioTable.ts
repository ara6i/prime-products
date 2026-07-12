import type { Gender } from "../types";

export type DepthRatioTableRowKind = "waist" | "trouserWaist" | "hips";
export type DepthRatioBodyShape =
  | "average"
  | "curvy-hourglass"
  | "pear-hip-dominant"
  | "athletic-inverted"
  | "straight-round";

type DepthRatioTablePart = "waist" | "hips" | "chest";

interface RatioStats {
  p10: number;
  median: number;
  p90: number;
}

interface BmiBand {
  min: number;
  max: number;
  label: string;
  waist: RatioStats;
  hips: RatioStats;
  chest: RatioStats;
}

export interface DepthRatioTableEstimate {
  source: "ANSUR-II empirical depth-ratio table v0";
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
  depthRatioPolicy: "upper-safe-median-to-p90";
  shapeOffset: number;
  depthRatio: number;
  notes: string[];
}

const FEMALE_BANDS: BmiBand[] = [
  { min: 0, max: 20, label: "female BMI <20", waist: { p10: 0.618, median: 0.675, p90: 0.739 }, hips: { p10: 0.574, median: 0.617, p90: 0.683 }, chest: { p10: 0.757, median: 0.850, p90: 0.943 } },
  { min: 20, max: 22, label: "female BMI 20-22", waist: { p10: 0.616, median: 0.674, p90: 0.756 }, hips: { p10: 0.587, median: 0.628, p90: 0.685 }, chest: { p10: 0.777, median: 0.863, p90: 0.950 } },
  { min: 22, max: 24, label: "female BMI 22-24", waist: { p10: 0.634, median: 0.685, p90: 0.759 }, hips: { p10: 0.595, median: 0.642, p90: 0.695 }, chest: { p10: 0.813, median: 0.886, p90: 0.984 } },
  { min: 24, max: 26, label: "female BMI 24-26", waist: { p10: 0.640, median: 0.698, p90: 0.767 }, hips: { p10: 0.603, median: 0.648, p90: 0.701 }, chest: { p10: 0.832, median: 0.909, p90: 0.992 } },
  { min: 26, max: 28, label: "female BMI 26-28", waist: { p10: 0.655, median: 0.709, p90: 0.786 }, hips: { p10: 0.618, median: 0.667, p90: 0.716 }, chest: { p10: 0.850, median: 0.927, p90: 1.008 } },
  { min: 28, max: 30, label: "female BMI 28-30", waist: { p10: 0.672, median: 0.728, p90: 0.800 }, hips: { p10: 0.626, median: 0.673, p90: 0.737 }, chest: { p10: 0.883, median: 0.964, p90: 1.051 } },
  { min: 30, max: 35, label: "female BMI 30-35", waist: { p10: 0.701, median: 0.754, p90: 0.837 }, hips: { p10: 0.645, median: 0.702, p90: 0.757 }, chest: { p10: 0.915, median: 1.000, p90: 1.073 } },
  { min: 35, max: Number.POSITIVE_INFINITY, label: "female BMI 35+", waist: { p10: 0.742, median: 0.781, p90: 0.824 }, hips: { p10: 0.650, median: 0.701, p90: 0.763 }, chest: { p10: 0.957, median: 1.056, p90: 1.118 } },
];

const MALE_BANDS: BmiBand[] = [
  { min: 0, max: 20, label: "male BMI <20", waist: { p10: 0.622, median: 0.677, p90: 0.721 }, hips: { p10: 0.589, median: 0.633, p90: 0.688 }, chest: { p10: 0.708, median: 0.768, p90: 0.860 } },
  { min: 20, max: 22, label: "male BMI 20-22", waist: { p10: 0.639, median: 0.694, p90: 0.747 }, hips: { p10: 0.606, median: 0.651, p90: 0.704 }, chest: { p10: 0.728, median: 0.788, p90: 0.870 } },
  { min: 22, max: 24, label: "male BMI 22-24", waist: { p10: 0.649, median: 0.701, p90: 0.753 }, hips: { p10: 0.624, median: 0.674, p90: 0.731 }, chest: { p10: 0.749, median: 0.821, p90: 0.905 } },
  { min: 24, max: 26, label: "male BMI 24-26", waist: { p10: 0.656, median: 0.705, p90: 0.767 }, hips: { p10: 0.641, median: 0.688, p90: 0.743 }, chest: { p10: 0.778, median: 0.845, p90: 0.928 } },
  { min: 26, max: 28, label: "male BMI 26-28", waist: { p10: 0.663, median: 0.717, p90: 0.780 }, hips: { p10: 0.659, median: 0.709, p90: 0.758 }, chest: { p10: 0.801, median: 0.874, p90: 0.954 } },
  { min: 28, max: 30, label: "male BMI 28-30", waist: { p10: 0.673, median: 0.729, p90: 0.798 }, hips: { p10: 0.675, median: 0.721, p90: 0.776 }, chest: { p10: 0.817, median: 0.890, p90: 0.974 } },
  { min: 30, max: 35, label: "male BMI 30-35", waist: { p10: 0.692, median: 0.750, p90: 0.827 }, hips: { p10: 0.691, median: 0.741, p90: 0.794 }, chest: { p10: 0.843, median: 0.921, p90: 1.007 } },
  { min: 35, max: Number.POSITIVE_INFINITY, label: "male BMI 35+", waist: { p10: 0.725, median: 0.774, p90: 0.865 }, hips: { p10: 0.720, median: 0.765, p90: 0.814 }, chest: { p10: 0.886, median: 0.957, p90: 1.045 } },
];

const SHAPE_THRESHOLDS = {
  female: { waistHipP25: 0.804, waistHipP75: 0.884, shoulderHipP25: 1.229, shoulderHipP75: 1.320 },
  male: { waistHipP25: 0.904, waistHipP75: 0.982, shoulderHipP25: 1.430, shoulderHipP75: 1.525 },
} satisfies Record<Gender, {
  waistHipP25: number;
  waistHipP75: number;
  shoulderHipP25: number;
  shoulderHipP75: number;
}>;

const SHAPE_OFFSETS: Record<Gender, Record<DepthRatioBodyShape, Record<DepthRatioTablePart, number>>> = {
  female: {
    average: { waist: -0.001, hips: -0.001, chest: 0.000 },
    "curvy-hourglass": { waist: 0.002, hips: -0.012, chest: -0.010 },
    "pear-hip-dominant": { waist: -0.015, hips: -0.019, chest: 0.010 },
    "athletic-inverted": { waist: 0.017, hips: 0.028, chest: -0.006 },
    "straight-round": { waist: -0.010, hips: 0.006, chest: 0.010 },
  },
  male: {
    average: { waist: -0.002, hips: -0.001, chest: -0.003 },
    "curvy-hourglass": { waist: -0.001, hips: -0.016, chest: -0.001 },
    "pear-hip-dominant": { waist: -0.012, hips: -0.016, chest: 0.014 },
    "athletic-inverted": { waist: 0.011, hips: 0.022, chest: -0.005 },
    "straight-round": { waist: 0.001, hips: 0.009, chest: 0.005 },
  },
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function round(n: number, d = 3): number {
  const m = 10 ** d;
  return Math.round(n * m) / m;
}

function findBand(gender: Gender, bmi: number): BmiBand {
  const bands = gender === "female" ? FEMALE_BANDS : MALE_BANDS;
  return bands.find((band) => bmi >= band.min && bmi < band.max) ?? bands[bands.length - 1]!;
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

  if (waistHip == null) {
    return { bodyShape: "average", bodyShapeSource: "average-fallback" };
  }

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

  if (waistHip >= thresholds.waistHipP75) {
    return { bodyShape: "straight-round", bodyShapeSource: "waist-hip-width-proxy" };
  }
  if (waistHip <= thresholds.waistHipP25) {
    return { bodyShape: "curvy-hourglass", bodyShapeSource: "waist-hip-width-proxy" };
  }
  return { bodyShape: "average", bodyShapeSource: "waist-hip-width-proxy" };
}

export function estimateDepthRatioFromTable(args: {
  rowKind: DepthRatioTableRowKind;
  gender: Gender;
  bmi: number;
  waistWidthCm?: number | null;
  hipWidthCm?: number | null;
  shoulderWidthCm?: number | null;
}): DepthRatioTableEstimate | null {
  if (!Number.isFinite(args.bmi) || args.bmi <= 0) return null;
  const part = resolvePart(args.rowKind);
  const band = findBand(args.gender, args.bmi);
  const stats = band[part];
  const shape = classifyBodyShape(args);
  const shapeOffset = SHAPE_OFFSETS[args.gender][shape.bodyShape][part];
  const p10 = round(stats.p10 + shapeOffset);
  const median = round(stats.median + shapeOffset);
  const p90 = round(stats.p90 + shapeOffset);
  const upperSafeRatio = round(median + ((p90 - median) * 0.75));
  const depthRatio = round(clamp(upperSafeRatio, p10, p90));
  const notes = [
    "ANSUR II empirical breadth-depth ratio; test-lab prior only.",
    "Selected depthRatio is upper-safe: median + 75% of the median-to-P90 gap.",
    args.rowKind === "trouserWaist"
      ? "ANSUR has no separate trouser-waist plane; using waist/navel proxy."
      : "",
    shape.bodyShapeSource === "waist-hip-width-proxy"
      ? "Body-shape class is inferred from waist/hip widths only; shoulder width is unavailable here."
      : "",
  ].filter(Boolean);

  return {
    source: "ANSUR-II empirical depth-ratio table v0",
    part,
    rowKind: args.rowKind,
    gender: args.gender,
    bmi: round(args.bmi, 1),
    bmiBand: band.label,
    bodyShape: shape.bodyShape,
    bodyShapeSource: shape.bodyShapeSource,
    depthRatioP10: p10,
    depthRatioMedian: median,
    depthRatioP90: p90,
    depthRatioPolicy: "upper-safe-median-to-p90",
    shapeOffset: round(shapeOffset),
    depthRatio,
    notes,
  };
}
