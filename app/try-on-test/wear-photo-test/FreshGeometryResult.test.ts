import { describe, expect, it } from "vitest";

import { previewFreshGeometry } from "./FreshGeometryResult";
import type { FreshGeometryRow } from "./freshGeometryTypes";

const row: FreshGeometryRow = {
  kind: "waist",
  label: "Natural waist",
  color: "#f59e0b",
  yNorm: 0.5,
  leftXNorm: 0.4,
  rightXNorm: 0.6,
  line: null,
  widthCm: 30,
  depthCm: 20,
  depthWidthRatio: 2 / 3,
  tapeCm: 80,
  shape: [
    { x: 1, depth: 0 },
    { x: 0, depth: 1 },
    { x: -1, depth: 0 },
    { x: 0, depth: -1 },
  ],
  syntheticValidation: null,
};

describe("V8 full-screen line preview", () => {
  it("changes the edited geometry answer when A-to-B changes and preserves raw V8 tape", () => {
    const preview = previewFreshGeometry(
      [row],
      { waist: { leftX: 0.4, rightX: 0.6, y: 0.5 } },
      { waist: { leftX: 0.35, rightX: 0.65, y: 0.5 } },
    )[0]!;

    expect(preview.widthCm).toBeCloseTo(45, 8);
    expect(preview.depthCm).toBeCloseTo(30, 8);
    expect(preview.circumferenceCm).toBeCloseTo(4 * Math.hypot(22.5, 15), 8);
    expect(preview.changed).toBe(true);
    expect(row.tapeCm).toBe(80);
  });
});
