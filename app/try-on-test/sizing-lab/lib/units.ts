/**
 * Unit conversions for the lab's metrics form. Internal state stays in
 * cm and kg — the UI converts on display + on input.
 */

export const CM_PER_IN = 2.54;
export const KG_PER_LB = 0.45359237;

export const cmToIn = (cm: number): number => cm / CM_PER_IN;
export const inToCm = (inches: number): number => inches * CM_PER_IN;
export const kgToLb = (kg: number): number => kg / KG_PER_LB;
export const lbToKg = (lb: number): number => lb * KG_PER_LB;

/** Cup label → inch offset (US/UK/AU). Mirrors backend bustFromBra(). */
export const US_CUP_OFFSET_IN: Record<string, number> = {
  A: 1, B: 2, C: 3, D: 4,
  DD: 5, DDD: 6, E: 6, F: 7, FF: 8, G: 9, GG: 10, H: 11, HH: 12,
};

export const BRA_CUPS = ["A", "B", "C", "D", "DD", "DDD", "E", "F", "FF", "G", "GG", "H", "HH"];

/** Approximate bra-size → bust circumference in cm. Mirrors backend. */
export function bustFromBraCm(region: string, band: number, cup: string): number | null {
  if (!band || !cup) return null;
  const cupKey = (cup.split(/[/+]/)[0] ?? "").toUpperCase().trim();
  const reg = region.toUpperCase();
  if (reg === "US" || reg === "UK" || reg === "AU") {
    const offset = US_CUP_OFFSET_IN[cupKey];
    if (offset == null) return null;
    return Math.round((band + offset) * 2.54 * 10) / 10;
  }
  const cupIdx = "ABCDEFGHIJK".indexOf(cupKey[0] ?? "A");
  if (cupIdx < 0) return null;
  return Math.round((band + 12 + cupIdx * 2) * 10) / 10;
}

/** Typical band sizes by region. US/UK/AU are inches; EU/FR/IT/JP/KR are cm. */
export function bandRangeForRegion(region: string): { min: number; max: number; step: number; unit: string } {
  const reg = region.toUpperCase();
  if (reg === "US" || reg === "UK" || reg === "AU") return { min: 28, max: 50, step: 1, unit: "in" };
  return { min: 60, max: 130, step: 5, unit: "cm" };
}
