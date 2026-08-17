import { describe, expect, it } from "vitest";
import {
  heightScaledDistanceCm,
  heightScaledLineWidthCm,
  horizontalBodyInterval,
  polylinePerimeter,
  rowYFromMetricHeight,
  signedDifferenceLabel,
  transferClosedContourCircumferenceCm,
} from "./geometry";

describe("WEAR mesh overlay geometry", () => {
  it("selects the torso interval rather than the outer arms", () => {
    const outline = [
      [0.1, 0.2], [0.1, 0.8], [0.2, 0.8], [0.2, 0.3],
      [0.35, 0.3], [0.35, 0.8], [0.65, 0.8], [0.65, 0.3],
      [0.8, 0.3], [0.8, 0.8], [0.9, 0.8], [0.9, 0.2],
    ] as const;
    expect(horizontalBodyInterval(outline, 0.5, 0.5)).toMatchObject({ left: 0.35, right: 0.65 });
  });

  it("uses known stature only as a flat photo scale", () => {
    expect(heightScaledLineWidthCm(
      { left: 0.4, right: 0.6, y: 0.5 },
      1000,
      2000,
      { minimumX: 0.2, maximumX: 0.8, minimumY: 0.1, maximumY: 0.9 },
      160,
    )).toBeCloseTo(20, 6);
  });

  it("measures a diagonal photo ruler without stretching image coordinates", () => {
    expect(heightScaledDistanceCm(
      [0.4, 0.4],
      [0.6, 0.5],
      1000,
      2000,
      { minimumX: 0.2, maximumX: 0.8, minimumY: 0.1, maximumY: 0.9 },
      160,
    )).toBeCloseTo(Math.sqrt(20 ** 2 + 20 ** 2), 6);
  });

  it("places a metric row from the floor using WEAR stature", () => {
    expect(rowYFromMetricHeight(
      { minimumX: 0.2, maximumX: 0.8, minimumY: 0.1, maximumY: 0.9 },
      80,
      160,
    )).toBeCloseTo(0.5, 6);
  });

  it("walks every edge of a closed contour", () => {
    expect(polylinePerimeter([[0, 0], [4, 0], [4, 3], [0, 3]])).toBe(14);
  });

  it("returns the recorded WEAR tape at the original breadth", () => {
    const result = transferClosedContourCircumferenceCm({
      normalizedContour: [[-1, -1], [1, -1], [1, 1], [-1, 1]],
      sourceBreadthCm: 30,
      sourceDepthCm: 20,
      targetBreadthCm: 30,
      recordedCircumferenceCm: 80,
    });
    expect(result).toBeCloseTo(80, 6);
  });

  it("labels the direction from the WEAR body", () => {
    expect(signedDifferenceLabel(-2.24)).toBe("2.2 cm smaller");
    expect(signedDifferenceLabel(3.06)).toBe("3.1 cm wider");
    expect(signedDifferenceLabel(0.01)).toBe("same visible width");
  });
});
