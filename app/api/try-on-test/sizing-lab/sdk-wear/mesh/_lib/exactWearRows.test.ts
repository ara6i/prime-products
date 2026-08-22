import { describe, expect, it } from "vitest";
import { buildExactWearRows } from "./exactWearRows";

const landmark = (x: number, y: number, z: number) => ({
  canonical3dCm: [x, y, z] as const,
  front2dCm: [x, z] as const,
});

describe("buildExactWearRows", () => {
  it("uses raw PLY waist intersections instead of Iliocristale landmarks", () => {
    const rows = buildExactWearRows({
      landmarks: {
        source: "exact paired WEAR LND",
        points: {
          "Rt. Iliocristale": landmark(-20, 2, 101),
          "Lt. Iliocristale": landmark(20, 2, 101),
          "Rt. Trochanterion": landmark(-18, 2, 90),
          "Lt. Trochanterion": landmark(18, 2, 90),
        },
      },
      rows: {
        waist: {
          sourceGeometry: "raw WEAR PLY plane intersection",
          planeProtocol: "horizontal plane at WEAR recorded preferred-waist height",
          plane: { heightCm: 108.3, heightSource: "WEAR profile waist_height_mm" },
          abBreadth: {
            aCanonicalCm: [-15.4, 2.4, 108.3],
            bCanonicalCm: [16.5, 2.4, 108.3],
            frontProjectionCm: [[-15.4, 108.3], [16.5, 108.3]],
          },
          qualityFlags: ["raw-central-closed-loop"],
        },
      },
    });

    expect(rows.waist?.evidenceType).toBe("ply-cross-section");
    expect(rows.waist?.a.name).toBe("A · PLY left waist edge");
    expect(rows.waist?.b.name).toBe("B · PLY right waist edge");
    expect(rows.waist?.distance3dCm).toBeCloseTo(31.9);
    expect(rows.waist?.planeHeightCm).toBe(108.3);
    expect(rows.waist?.qualityFlags).toEqual(["raw-central-closed-loop"]);
    expect(rows.hips?.evidenceType).toBe("wear-lnd-segment");
  });

  it("does not manufacture a waist row when the PLY section is unavailable", () => {
    const rows = buildExactWearRows({
      landmarks: {
        points: {
          "Rt. Iliocristale": landmark(-20, 2, 101),
          "Lt. Iliocristale": landmark(20, 2, 101),
        },
      },
    });

    expect(rows.waist).toBeUndefined();
  });
});
