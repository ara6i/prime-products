import { describe, it, expect } from "vitest";
import { AIAD_LEVELS, aiadGuideLines, aiadProfile, canonicalizeAiadMask, cleanAiadMask, pythonRound, pythonRoundTenth } from "./aiadPreprocessing";

describe("Aiad frozen input contract", () => {
  it("uses the documented profile normalization and sex flags", () => {
    const p = aiadProfile({ heightCm: 170, weightKg: 70, gender: "female" });
    expect([...p.tensor].slice(0, 2)).toEqual([0, 0]); expect(p.tensor[2]).toBeCloseTo(0.027682, 5); expect([...p.tensor].slice(3)).toEqual([1, 0]);
    expect(() => aiadProfile({ heightCm: NaN, weightKg: 70, gender: "male" })).toThrow();
  });
  it("matches Python ties-to-even rounding", () => { expect([1.5, 2.5, -1.5, -2.5].map(pythonRound)).toEqual([2, 2, -2, -2]); });
  it("preserves Python's one-decimal helper output, including binary-float rounding", () => {
    expect([1.25, 1.35, 2.55, 2.65, -1.25, -1.35, -2.55, -2.65].map(pythonRoundTenth)).toEqual([1.2, 1.4, 2.5, 2.6, -1.2, -1.4, -2.5, -2.6]);
  });
  it("normalizes only to 0/1 and uses the exact canonical framing", () => {
    const mask = new Uint8Array(100 * 200); for (let y = 10; y < 190; y++) for (let x = 30; x < 70; x++) mask[y * 100 + x] = 255;
    const clean = cleanAiadMask(mask, 100, 200); const c = canonicalizeAiadMask(clean.mask, 100, 200);
    expect(c.canonicalBox.top).toBe(13); expect(c.canonicalBox.height).toBe(233); expect(new Set(c.tensor)).toEqual(new Set([0, 1])); expect(c.tensor.length).toBe(49152);
    const waist = aiadGuideLines(c, 170).find((g) => g.kind === "waist")!;
    expect(waist.line!.photo.left.x).toBeCloseTo(0.3, 2); expect(waist.line!.photo.right.x).toBeLessThan(0.7);
  });
  it("uses full-precision frozen framing at the half-pixel boundary", () => {
    const mask = new Uint8Array(200 * 500);
    for (let y = 10; y < 476; y++) for (let x = 30; x < 169; x++) mask[y * 200 + x] = 1;
    const c = canonicalizeAiadMask(mask, 200, 500);
    expect(c.transform.nw).toBe(70); // 139 * (233 / 466) = 69.5, ties to even.
    const guides = aiadGuideLines(c, 170);
    expect(guides.map((guide) => guide.kind)).toEqual(AIAD_LEVELS);
    expect(guides.find((guide) => guide.kind === "shoulder")!.endpoints?.row_cm_from_floor).toBe(139.4);
    expect(guides.every((guide) => guide.endpoints && guide.line)).toBe(true);
  });
  it("matches OpenCV nearest-neighbour reciprocal rounding, not a re-associated formula", () => {
    const mask = new Uint8Array(153 * 419).fill(1);
    mask[84 * 153 + 26] = 0;
    const c = canonicalizeAiadMask(mask, 153, 419);
    expect(c.transform.nw).toBe(85);
    // OpenCV samples floor(15 * (1 / (85 / 153))) = 26, not 27.
    expect(c.mask[60 * 192 + 68]).toBe(0);
  });
  it("rejects empty and implausibly filled masks", () => {
    expect(() => cleanAiadMask(new Uint8Array(100), 10, 10)).toThrow();
    expect(() => canonicalizeAiadMask(new Uint8Array(10000).fill(1), 100, 100)).toThrow(/coverage/);
  });
  it("keeps the largest person, fills holes, and selects torso rather than arms", () => {
    const mask = new Uint8Array(192 * 256);
    for (let y = 13; y <= 245; y++) for (let x = 75; x <= 116; x++) mask[y * 192 + x] = 255;
    mask[100 * 192 + 90] = 0; mask[0] = 255;
    const clean = cleanAiadMask(mask, 192, 256);
    expect(clean.mask[100 * 192 + 90]).toBe(1); expect(clean.mask[0]).toBe(0);
    const c = canonicalizeAiadMask(clean.mask, 192, 256);
    const waist = aiadGuideLines(c, 170).find((g) => g.kind === "waist")!;
    expect(waist.line).not.toBeNull();
    const y = Math.round(waist.line!.canonical.left.y * 256);
    for (let rr = y - 2; rr <= y + 2; rr++) { for (let x = 25; x < 35; x++) c.mask[rr * 192 + x] = 255; for (let x = 157; x < 167; x++) c.mask[rr * 192 + x] = 255; }
    const guide = aiadGuideLines(c, 170).find((g) => g.kind === "waist")!;
    expect(guide.line!.canonical.left.x).toBeGreaterThan(0.3);
    expect(guide.endpoints!.full_extent_cm).toBeGreaterThan(guide.endpoints!.width_image_cm);
  });
});
