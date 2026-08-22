import { describe, expect, it } from "vitest";
import {
  buildWaistBandDescriptor,
  locateVisibleWaistFraction,
  rankBodyPartShapeCandidates,
  rankDualViewCandidates,
  rankWaistHipShapeCandidates,
  rankWaistCandidates,
  resampleClosedContour,
  resizeClosedShapePerimeter,
  weightedMean,
  WAIST_SLICE_OFFSETS,
  widthAtHeightFraction,
  type GeometryOnlyWaistCandidate,
  type WaistBandDescriptor,
} from "./waistMatcher";

const simpleBody = [
  [0.35, 0], [0.65, 0], [0.64, 0.35], [0.60, 0.58], [0.63, 0.75], [0.61, 1],
  [0.39, 1], [0.37, 0.75], [0.40, 0.58], [0.36, 0.35],
] as const;

describe("waist-only WEAR matcher", () => {
  it("measures normalized photo X in pixels rather than stretching the image", () => {
    const result = widthAtHeightFraction({
      points: simpleBody,
      statureCm: 160,
      yAxis: "down",
      imageWidthPx: 1000,
      imageHeightPx: 2000,
    }, 0.42);
    expect(result?.widthCmEquivalent).toBeGreaterThan(15);
    expect(result?.widthCmEquivalent).toBeLessThan(30);
  });

  it("finds and samples nine independent waist-level slices", () => {
    const space = { points: simpleBody, statureCm: 160, yAxis: "down" as const, imageWidthPx: 1000, imageHeightPx: 2000 };
    const centre = locateVisibleWaistFraction(space);
    expect(centre).not.toBeNull();
    const descriptor = buildWaistBandDescriptor(space, centre!);
    expect(descriptor?.widthsBodyHeight).toHaveLength(9);
  });

  it("ranks with geometry only and reveals labels afterward", () => {
    const descriptor = (value: number): WaistBandDescriptor => ({
      centreHeightFractionFromFeet: 0.6,
      offsets: [...WAIST_SLICE_OFFSETS],
      widthsBodyHeight: Array(WAIST_SLICE_OFFSETS.length).fill(value),
      widthsCmEquivalent: Array(WAIST_SLICE_OFFSETS.length).fill(value * 168),
    });
    const candidates: GeometryOnlyWaistCandidate[] = [
      { scanId: "NA-0001-A", heightCm: 168, weightKg: 70, descriptor: descriptor(0.18) },
      { scanId: "NA-0002-A", heightCm: 168, weightKg: 70, descriptor: descriptor(0.16) },
    ];
    const ranked = rankWaistCandidates(descriptor(0.161), candidates, 2);
    expect(ranked.map((item) => item.scanId)).toEqual(["NA-0002-A", "NA-0001-A"]);
    const labels = new Map([["NA-0001-A", 90], ["NA-0002-A", 78]]);
    expect(weightedMean(ranked, (scanId) => labels.get(scanId) ?? null)).toBeLessThan(84);
  });

  it("walks the resized closed WEAR shape with both target axes", () => {
    expect(resizeClosedShapePerimeter({
      contour: [[-2, -1], [2, -1], [2, 1], [-2, 1]],
      targetBreadthCm: 30,
      targetDepthCm: 20,
    })).toBeCloseTo(100, 6);
  });

  it("ranks front and side together without measurement labels", () => {
    const descriptor = (value: number): WaistBandDescriptor => ({
      centreHeightFractionFromFeet: 0.6,
      offsets: [...WAIST_SLICE_OFFSETS],
      widthsBodyHeight: Array(WAIST_SLICE_OFFSETS.length).fill(value),
      widthsCmEquivalent: Array(WAIST_SLICE_OFFSETS.length).fill(value * 168),
    });
    const ranked = rankDualViewCandidates(descriptor(0.18), descriptor(0.13), [
      { scanId: "NA-0001-A", heightCm: 168, weightKg: 70, front: descriptor(0.181), side: descriptor(0.131) },
      { scanId: "NA-0002-A", heightCm: 168, weightKg: 70, front: descriptor(0.18), side: descriptor(0.16) },
    ]);
    expect(ranked[0]?.scanId).toBe("NA-0001-A");
  });

  it("does not let one excellent view hide a poor second view", () => {
    const descriptor = (values: number[]): WaistBandDescriptor => ({
      centreHeightFractionFromFeet: 0.6,
      offsets: [...WAIST_SLICE_OFFSETS],
      widthsBodyHeight: values,
      widthsCmEquivalent: values.map((value) => value * 168),
    });
    const query = descriptor(Array(9).fill(0.16));
    const ranked = rankDualViewCandidates(query, query, [
      {
        scanId: "ONE-VIEW-ONLY",
        heightCm: 168,
        weightKg: 70,
        front: descriptor(Array(9).fill(0.16)),
        side: descriptor(Array(9).fill(0.20)),
      },
      {
        scanId: "BALANCED",
        heightCm: 168,
        weightKg: 70,
        front: descriptor(Array(9).fill(0.17)),
        side: descriptor(Array(9).fill(0.17)),
      },
    ], 2);
    expect(ranked[0]?.scanId).toBe("BALANCED");
    expect(ranked[0]?.worstViewErrorBodyHeight).toBeLessThan(ranked[1]!.worstViewErrorBodyHeight);
  });

  it("uses the local waist curve as well as the centre width", () => {
    const descriptor = (values: number[]): WaistBandDescriptor => ({
      centreHeightFractionFromFeet: 0.6,
      offsets: [...WAIST_SLICE_OFFSETS],
      widthsBodyHeight: values,
      widthsCmEquivalent: values.map((value) => value * 168),
    });
    const queryValues = [0.18, 0.175, 0.17, 0.165, 0.16, 0.165, 0.17, 0.175, 0.18];
    const query = descriptor(queryValues);
    const ranked = rankDualViewCandidates(query, query, [
      { scanId: "FLAT", heightCm: 168, weightKg: 70, front: descriptor(Array(9).fill(0.16)), side: descriptor(Array(9).fill(0.16)) },
      { scanId: "CURVED", heightCm: 168, weightKg: 70, front: descriptor(queryValues), side: descriptor(queryValues) },
    ], 2);
    expect(ranked[0]?.scanId).toBe("CURVED");
    expect(ranked[0]?.frontShapeErrorBodyHeight).toBe(0);
  });

  it("resamples every real contour to exactly 32 ordered points", () => {
    expect(resampleClosedContour([[-2, -1], [2, -1], [2, 1], [-2, 1]])).toHaveLength(32);
  });

  it("ranks waist and hips in front and side without height or tape", () => {
    const row = (breadth: number, depth: number) => ({
      breadthCm: breadth * 168,
      depthCm: depth * 168,
      breadthBodyHeight: breadth,
      depthBodyHeight: depth,
    });
    const query = {
      waist: { breadthCm: 26.88, depthCm: 21.84, breadthBodyHeight: .16, depthBodyHeight: .13 },
      hips: { breadthCm: 35.28, depthCm: 25.2, breadthBodyHeight: .21, depthBodyHeight: .15 },
    };
    const ranked = rankWaistHipShapeCandidates(query, [
      { scanId: "TALL-CLOSE", heightCm: 180, weightKg: 60, rows: { waist: row(.161, .131), hips: row(.209, .149) } },
      { scanId: "PROFILE-CLOSE", heightCm: 168, weightKg: 70, rows: { waist: row(.16, .17), hips: row(.21, .19) } },
    ]);
    expect(ranked[0]?.scanId).toBe("TALL-CLOSE");
    expect(ranked[0]?.worstErrorBodyHeight).toBeLessThan(ranked[1]!.worstErrorBodyHeight);
  });

  it("can choose a different WEAR person for waist and hips using centimetre spans", () => {
    const row = (breadthCm: number, depthCm: number) => ({
      breadthCm,
      depthCm,
      breadthBodyHeight: breadthCm / 168,
      depthBodyHeight: depthCm / 168,
    });
    const candidates = [
      { scanId: "WAIST", heightCm: 150, weightKg: 50, rows: { waist: row(26.4, 22.2), hips: row(31, 20) } },
      { scanId: "HIPS", heightCm: 180, weightKg: 80, rows: { waist: row(31, 27), hips: row(36.1, 24.9) } },
    ];
    expect(rankBodyPartShapeCandidates({ breadthCm: 26.45, depthCm: 22.21 }, candidates, "waist")[0]?.scanId).toBe("WAIST");
    expect(rankBodyPartShapeCandidates({ breadthCm: 36.11, depthCm: 24.94 }, candidates, "hips")[0]?.scanId).toBe("HIPS");
  });
});
