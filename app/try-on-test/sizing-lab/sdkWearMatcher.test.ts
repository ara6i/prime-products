import { describe, expect, it } from "vitest";
import { buildQueryFromMask, fixedTopologyMesh, rankSdkWearPart, type SdkWearIndex } from "./sdkWearMatcher";

function index(): SdkWearIndex {
  const person = (scanId: string, heightCm: number, weightKg: number, width: number) => ({
    scanId, subjectId: scanId, role: "test" as const, viewId: "front-50" as const,
    gender: "female" as const, heightCm, weightKg, imagePath: null, renderSize: 192,
    rows: { waist: { frontWidthCm: width, depthCm: 20, heightFractionFromFeet: 90, yNorm: .45, contour32Normalized: [[-.5, 0], [.5, 0], [.5, 1], [-.5, 1]], geometryValid: true, quality: { rawSliceClosed: true, perimeterConsistentWithTape: true } } },
    landmarks2d: {}, segments: {}, revealOnly: { measurementsCm: {}, extractedStandingCm: {}, rowTapeAndCircumferenceCm: { waist: { tape: 79, geometryPerimeter: 78 } } },
  });
  return { schemaVersion: "test", status: "private-test-lab-only", releaseApproved: false, canonicalView: "front-50", personCount: 2, expectedPersonCount: 448, ranking: { profile: { gender: "exact", heightCm: 1, weightKg: 1 }, frontWidthMaxDifferenceCm: 1.27 }, parts: ["waist"], people: [person("A", 168, 70, 30), person("B", 175, 80, 30.1)] };
}

describe("SDK WEAR matcher", () => {
  it("creates a fixed-topology mesh without modifying the outline", () => {
    const mesh = fixedTopologyMesh([[0, 0], [1, 0], [1, 1], [0, 1]]);
    expect(mesh.outline).toHaveLength(64);
    expect(mesh.triangles).toHaveLength(64);
    expect(mesh.triangles[0]).toEqual([64, 0, 1]);
  });

  it("uses the strict profile and half-inch width gate", () => {
    const result = rankSdkWearPart(index(), { outline: [[0, 0], [1, 0], [1, 1]], rowWidths: { waist: { frontWidthCm: 30.1, heightFractionFromFeet: .5 } } }, "waist", 168, 70, "female");
    expect(result.status).toBe("matched");
    expect(result.selected?.scanId).toBe("A");
    expect(result.selected?.profileWindow.tier).toBe("strict");
  });

  it("can refuse progressive expansion when strict replay is requested", () => {
    const result = rankSdkWearPart(index(), { outline: [[0, 0], [1, 0], [1, 1]], rowWidths: { waist: { frontWidthCm: 32, heightFractionFromFeet: .5 } } }, "waist", 168, 70, "female", { strictOnly: true });
    expect(result.status).toBe("unavailable");
    expect(result.selected).toBeNull();
  });

  it("builds a query from a visible mask", () => {
    const mask = new Uint8ClampedArray(20 * 20);
    for (let y = 2; y < 18; y += 1) for (let x = 6; x < 14; x += 1) mask[y * 20 + x] = 255;
    const query = buildQueryFromMask(mask, 20, 20, 168);
    expect(query).not.toBeNull();
    expect(query?.rowWidths.waist?.frontWidthCm).toBeGreaterThan(0);
  });
});
