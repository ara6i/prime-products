import { describe, expect, it } from "vitest";

import { crossSectionPerimeterCm } from "./cameraGeometry";

describe("camera geometry circumference", () => {
  it("walks a closed shape after scaling it to the selected width and depth", () => {
    const diamond = [
      { x: 1, depth: 0 },
      { x: 0, depth: 1 },
      { x: -1, depth: 0 },
      { x: 0, depth: -1 },
    ];
    expect(crossSectionPerimeterCm(diamond, 4, 2)).toBeCloseTo(4 * Math.sqrt(5), 8);
  });

  it("returns no estimate for incomplete geometry", () => {
    expect(crossSectionPerimeterCm([], 30, 20)).toBeNull();
    expect(crossSectionPerimeterCm([{ x: 0, depth: 0 }, { x: 1, depth: 1 }], 30, 20)).toBeNull();
    expect(crossSectionPerimeterCm([{ x: 0, depth: 0 }, { x: 1, depth: 1 }, { x: 0, depth: 2 }], null, 20)).toBeNull();
  });
});
