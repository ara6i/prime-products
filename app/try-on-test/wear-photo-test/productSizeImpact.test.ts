import { describe, expect, it } from "vitest";
import { selectedPersonSizeInput } from "./productSizeImpact";
import { cameraFixture, workbenchFixture } from "./aiadWorkbench.testFixtures";

describe("selected-person product size inputs", () => {
  it("uses original Aiad tape, not edited rows or Apple/Depth Pro geometry", () => {
    const p = cameraFixture(60, 80).prediction;
    p.rows[3]!.tapeCm = 200;
    const before = JSON.stringify(p);
    const request = selectedPersonSizeInput(p, { waist: 99, hips: 113 }, "Shahnaz 2");
    expect(request?.predicted.waist).toBe(85);
    expect(request?.actuals.waist).toBe(99);
    expect(request?.deductionCm).toBe(0);
    expect(JSON.stringify(request)).not.toMatch(/cameraFusion|canonicalMask|imageDataUrl|line/);
    expect(JSON.stringify(p)).toBe(before);
  });
  it("keeps missing reference tape missing and uses the prediction’s profile", () => {
    const p = workbenchFixture(); p.profile.gender = "male"; p.profile.heightCm = 171.2;
    const request = selectedPersonSizeInput(p, { waist: null }, "Shane");
    expect(request?.actuals).toEqual({});
    expect(request?.person).toEqual({ label: "Shane", gender: "male", heightCm: 171.2 });
    expect(selectedPersonSizeInput(null, { waist: 99 }, "Upload")).toBeNull();
  });
});
