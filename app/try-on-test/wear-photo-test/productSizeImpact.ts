import type { FreshGeometryPrediction } from "./freshGeometryTypes";
import type { WearV6Prediction } from "./wearV6Types";

export const PRODUCT_TAPE_KEYS = ["neck", "chest", "underbust", "waist", "hips", "thigh"] as const;
export type ProductTapeKey = typeof PRODUCT_TAPE_KEYS[number];
export type ProductTapes = Partial<Record<ProductTapeKey, number | null>>;
export const PRODUCT_GARMENT_GROUPS = [
  { id: "female-dresses", gender: "female", label: "Women’s dresses" },
  { id: "female-tops", gender: "female", label: "Women’s shirts & tops" },
  { id: "female-pants", gender: "female", label: "Women’s pants & trousers" },
  { id: "female-shorts", gender: "female", label: "Women’s shorts" },
  { id: "female-skirts", gender: "female", label: "Women’s skirts" },
  { id: "female-outerwear", gender: "female", label: "Women’s jackets & coats" },
  { id: "male-tops", gender: "male", label: "Men’s shirts & tops" },
  { id: "male-pants", gender: "male", label: "Men’s pants & trousers" },
  { id: "male-shorts", gender: "male", label: "Men’s shorts" },
  { id: "male-outerwear", gender: "male", label: "Men’s jackets & coats" },
] as const;
export type ProductGarmentGroupId = typeof PRODUCT_GARMENT_GROUPS[number]["id"];
export interface ProductSizeInput {
  person: { label: string; gender: "female" | "male"; heightCm: number };
  model: { version: string; sha256: string | null };
  predicted: ProductTapes;
  actuals: ProductTapes;
  deductionCm: number;
}
export type ProductSizeOutcome = "same" | "up" | "down" | "changed_unordered" | "lost_recommendation"
  | "gained_recommendation" | "both_unavailable" | "missingActual" | "missingPrediction" | "unsupported";
export interface ProductSizeRow {
  id: string; title: string; category: string; supplier: string;
  predictedSize: string | null; referenceSize: string | null; outcome: ProductSizeOutcome; step: number | null;
  predictionReason: string | null; referenceReason: string | null;
  issues: string[]; warnings: string[]; basis: string; stockSizes: string[]; chartOnlySizes: string[]; stockOnlySizes: string[];
  tapeFields: string[]; ignoredFields: string[]; missingActual: string[]; missingPrediction: string[];
  charts: { label: string; unit: string; headers: string[]; rows: string[][] }[];
}
export interface ProductSizeResult {
  ok: true; schema: "wear-selected-person-size-impact-v2";
  person: ProductSizeInput["person"]; model: ProductSizeInput["model"];
  inputs: Pick<ProductSizeInput, "predicted" | "actuals" | "deductionCm">;
  catalog: { sha256: string; snapshotAt: string; country: string; seed: string;
    group: { id: ProductGarmentGroupId; label: string; gender: "female" | "male"; products: 100 } };
  counts: Record<ProductSizeOutcome, number> & {
    total: number; predictedAvailable: number; bothRecommended: number; referenceRecommended: number;
    modelUnavailableOnReference: number; missingPredictionOnReference: number;
    samePct: number | null; changedPct: number | null; changedOrLostPct: number | null;
    correctPct: number | null; largerPct: number | null; smallerPct: number | null;
    changedUnorderedPct: number | null; modelUnavailablePct: number | null;
    pairedCoveragePct: number | null; changedOrUnavailablePct: number | null;
  };
  products: ProductSizeRow[]; cameraAppliedToTape: false; sourceDataModified: false;
}

/** Scalar outputs only. No photo, line edits, geometry preview, camera value,
 * dataset identity or recorded tape is fed back to the body model. */
export function selectedPersonSizeInput(
  prediction: FreshGeometryPrediction | WearV6Prediction | null,
  actuals: ProductTapes,
  label: string,
): ProductSizeInput | null {
  if (!prediction) return null;
  const predicted: ProductTapes = {};
  const usable = (value: number | null | undefined): value is number => value != null && Number.isFinite(value) && value > 0;
  if ("aiad" in prediction && prediction.aiad) {
    for (const row of prediction.aiad.measurements) if (usable(row.valueCm)) predicted[row.kind] = row.valueCm;
  } else if ("measurements" in prediction) {
    for (const row of prediction.measurements) if (usable(row.valueCm)) predicted[row.kind] = row.valueCm;
  } else {
    for (const row of prediction.rows) if (usable(row.tapeCm)) predicted[row.kind] = row.tapeCm;
  }
  if (!Object.keys(predicted).length) return null;
  const reference: ProductTapes = {};
  for (const key of PRODUCT_TAPE_KEYS) if (usable(actuals[key])) reference[key] = actuals[key];
  return { person: { label, gender: prediction.profile.gender, heightCm: prediction.profile.heightCm },
    model: { version: prediction.model.version, sha256: "sha256" in prediction.model ? prediction.model.sha256 : null },
    predicted, actuals: reference, deductionCm: 0 };
}

export const PRODUCT_OUTCOME_LABELS: Record<ProductSizeOutcome, string> = {
  same: "Same size", up: "Predicted size is larger", down: "Predicted size is smaller", changed_unordered: "Different size · order unclear",
  lost_recommendation: "Prediction loses the size", gained_recommendation: "Only prediction gives a size", both_unavailable: "Neither finds a size",
  missingActual: "Add saved tape to compare", missingPrediction: "Model does not provide required tape", unsupported: "Chart unavailable",
};
