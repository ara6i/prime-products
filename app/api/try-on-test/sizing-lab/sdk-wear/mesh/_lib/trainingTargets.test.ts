import { describe, expect, it } from "vitest";
import { buildTrainingTargets, summarizeTrainingTargets } from "./trainingTargets";

describe("buildTrainingTargets", () => {
  it("projects LND geometry and never invents points for scalar-only labels", () => {
    const targets = buildTrainingTargets({
      rows: {},
      measurements: [
        {
          id: "measurements_mm:arm_length_shoulder_to_wrist_mm",
          sourceGroup: "measurements_mm",
          sourceKey: "arm_length_shoulder_to_wrist_mm",
          value: 623,
          valueCm: 62.3,
          unit: "mm",
          geometryAvailable: true,
          geometryType: "LND polyline",
          landmarkNames: ["Rt. Acromion", "Rt. Radiale", "Rt. Radial Styloid"],
          canonicalPointsCm: [[-18, 2, 142], [-32, 1, 112], [-45, 0, 88]],
          geometryLengthCm: 60.2,
        },
        {
          id: "measurements_mm:thigh_circumference_left_mm",
          sourceGroup: "measurements_mm",
          sourceKey: "thigh_circumference_left_mm",
          value: 540,
          valueCm: 54,
          unit: "mm",
          geometryAvailable: false,
          geometryUnavailableReason: "no defensible A-B path",
        },
      ],
    });

    expect(targets[0]?.family).toBe("Arms, sleeves and shoulders");
    expect(targets[0]?.frontPointsCm).toEqual([[-18, 142], [-32, 112], [-45, 88]]);
    expect(targets[1]?.status).toBe("recorded-scalar-only");
    expect(targets[1]?.frontPointsCm).toEqual([]);
    expect(summarizeTrainingTargets(targets)).toEqual({
      total: 2,
      exactGeometry: 1,
      exactRows: 0,
      recordedScalarOnly: 1,
      geometryReady: 1,
      geometryRejected: 0,
    });
  });

  it("uses exact PLY A-B points for linked circumference rows", () => {
    const targets = buildTrainingTargets({
      rows: {
        waist: {
          plane: { heightCm: 103 },
          abBreadth: { frontProjectionCm: [[-14, 103], [15, 103]] },
          rawCentralLoopClosed: true,
          qualityFlags: ["raw-central-closed-loop"],
        },
      },
      measurements: [{
        id: "measurements_mm:waist_circumference_mm",
        sourceGroup: "measurements_mm",
        sourceKey: "waist_circumference_mm",
        value: 790,
        valueCm: 79,
        unit: "mm",
        geometryAvailable: true,
        geometryType: "linked anatomical row",
        rowId: "waist",
      }],
    });

    expect(targets[0]?.status).toBe("exact-row-geometry");
    expect(targets[0]?.frontPointsCm).toEqual([[-14, 103], [15, 103]]);
    expect(targets[0]?.geometryLengthCm).toBe(29);
    expect(targets[0]?.planeHeightEligible).toBe(true);
    expect(targets[0]?.geometryTrainingEligible).toBe(true);
  });

  it("keeps a verified row height but rejects reconstructed torso geometry", () => {
    const [target] = buildTrainingTargets({
      rows: {
        chest: {
          plane: { heightCm: 126.7 },
          abBreadth: { frontProjectionCm: [[-18.8, 126.7], [19.2, 126.7]] },
          rawCentralLoopClosed: false,
          qualityFlags: [
            "reconstructed-slab-hull",
            "closed-loop-circumference-not-certified",
            "mesh-loop-vs-recorded-tape-over-12pct",
          ],
        },
      },
      measurements: [{
        id: "measurements_mm:chest_circumference_mm",
        sourceGroup: "measurements_mm",
        sourceKey: "chest_circumference_mm",
        value: 857,
        valueCm: 85.7,
        unit: "mm",
        geometryAvailable: true,
        geometryType: "linked anatomical row",
        rowId: "chest",
      }],
    });

    expect(target?.planeHeightEligible).toBe(true);
    expect(target?.geometryTrainingEligible).toBe(false);
    expect(target?.trainingRejectionReasons.join(" ")).toContain(
      "neither a raw closed loop nor a certified WEAR-landmark-bounded front/back ring",
    );
    expect(summarizeTrainingTargets(target ? [target] : []).geometryRejected).toBe(1);
  });

  it("accepts a certified landmark-bounded front/back torso ring", () => {
    const [target] = buildTrainingTargets({
      rows: {
        chest: {
          plane: { heightCm: 126.7 },
          abBreadth: { frontProjectionCm: [[-14.1, 126.7], [14.7, 126.7]] },
          rawCentralLoopClosed: false,
          certifiedSection: true,
          geometryTrainingEligible: true,
          qualityFlags: [
            "certified-central-torso-arc-ring",
            "arms-excluded-by-WEAR-LND-bounds",
          ],
        },
      },
      measurements: [{
        id: "measurements_mm:chest_circumference_mm",
        sourceGroup: "measurements_mm",
        sourceKey: "chest_circumference_mm",
        value: 857,
        valueCm: 85.7,
        unit: "mm",
        geometryAvailable: true,
        geometryType: "linked anatomical row",
        rowId: "chest",
      }],
    });

    expect(target?.planeHeightEligible).toBe(true);
    expect(target?.geometryTrainingEligible).toBe(true);
    expect(target?.trainingRejectionReasons).toEqual([]);
  });
});
