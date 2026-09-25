import type { ProductTapeKey, ProductTapes } from "./productSizeImpact";

// Pure comparison of existing numbers; no model, camera or network work.
export const TAPE_ERROR_GOAL_CM = 1.27;
export const TAPE_COMPARISON_PARTS: { kind: ProductTapeKey; label: string }[] = [
  { kind: "waist", label: "Waist" },
  { kind: "hips", label: "Hips" },
  { kind: "chest", label: "Chest / bust" },
  { kind: "underbust", label: "Under-bust" },
  { kind: "neck", label: "Neck" },
  { kind: "thigh", label: "Thigh" },
];

const tape = (value: number | null | undefined) => value != null && Number.isFinite(value) && value > 0 ? value : null;

export function compareBodyTapes(predicted: ProductTapes, actuals: ProductTapes) {
  return TAPE_COMPARISON_PARTS.map(part => {
    const realCm = tape(actuals[part.kind]);
    const modelCm = tape(predicted[part.kind]);
    const differenceCm = realCm != null && modelCm != null ? modelCm - realCm : null;
    return { ...part, realCm, modelCm, differenceCm,
      withinGoal: differenceCm == null ? null : Math.abs(differenceCm) <= TAPE_ERROR_GOAL_CM + 1e-9 };
  });
}

export function tapeNumber(value: number | null) {
  return value == null ? "—" : Number(value.toFixed(2)).toString();
}

export function tapeErrorDescription(differenceCm: number) {
  if (differenceCm === 0) return "Exact match";
  const amount = Math.abs(differenceCm) < 0.005 ? "Less than 0.01" : tapeNumber(Math.abs(differenceCm));
  return `${amount} cm too ${differenceCm > 0 ? "high" : "low"}`;
}

export function signedTapeError(differenceCm: number) {
  if (differenceCm === 0) return "0 cm";
  if (Math.abs(differenceCm) < 0.005) return `${differenceCm > 0 ? "+" : "−"}<0.01 cm`;
  return `${differenceCm > 0 ? "+" : "−"}${tapeNumber(Math.abs(differenceCm))} cm`;
}
