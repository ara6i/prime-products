import { describe, expect, it } from "vitest";
import type { WearSideCatalogPerson } from "@/app/try-on-test/wear-side-selector/types";
import { rankWearSideCandidates } from "./catalog";
import { evaluateSideAndTape, oracleWinner } from "./evaluation";

function person(
  scanId: string,
  options: {
    gender?: "female" | "male";
    heightCm?: number;
    weightKg?: number;
    chest?: number;
    underbust?: number;
    waist?: number;
    hips?: number;
    side?: number;
    tape?: number | null;
    missing?: "chest" | "underbust" | "waist" | "hips";
  } = {},
): WearSideCatalogPerson {
  const rows = Object.fromEntries((["chest", "underbust", "waist", "hips"] as const).flatMap((part, index) => {
    if (options.missing === part) return [];
    const width = options[part] ?? 30 + index * 2;
    return [[part, {
      frontWidthCm: width,
      sideDepthCm: (options.side ?? 20) + index,
      meshPerimeterCm: null,
      tapeCalibratedDepthCm: null,
      sliceReconstructed: false,
      heightFractionFromFeet: 0.5,
      tapeCm: options.tape === null ? null : (options.tape ?? 80) + index * 3,
    }]];
  }));
  return {
    scanId,
    subjectId: scanId.replace(/-A$/, ""),
    gender: options.gender ?? "female",
    heightCm: options.heightCm ?? 170,
    weightKg: options.weightKg ?? 65,
    role: "test",
    rows,
  };
}

const query = {
  gender: "female" as const,
  heightCm: 170,
  weightKg: 65,
  rowWidths: { chest: 30, underbust: 32, waist: 34, hips: 36 },
  excludeScanId: "NA-0001-A",
};

describe("rankWearSideCandidates", () => {
  it("uses front geometry only and does not serialize hidden side or tape truth", () => {
    const hugeHiddenTruth = person("NA-0002-A", { chest: 30.1, underbust: 32.1, waist: 34.1, hips: 36.1, side: 55, tape: 120 });
    const furtherFront = person("NA-0003-A", { chest: 31, underbust: 33, waist: 35, hips: 37, side: 10, tape: 50 });
    const ranked = rankWearSideCandidates([furtherFront, hugeHiddenTruth], query);
    const order = ranked.rings[0]!.leaderboards.overall.candidateIds;

    expect(order).toEqual(["NA-0002-A", "NA-0003-A"]);
    const publicJson = JSON.stringify(ranked.rings);
    expect(publicJson).not.toContain("sideDepthCm");
    expect(publicJson).not.toContain("tapeCm");
    expect(publicJson).not.toContain("120");
  });

  it("assigns each candidate to exactly one non-cumulative ring", () => {
    const ranked = rankWearSideCandidates([
      person("NA-0002-A", { heightCm: 171, weightKg: 66 }),
      person("NA-0003-A", { heightCm: 171.01, weightKg: 65 }),
      person("NA-0004-A", { heightCm: 172, weightKg: 67 }),
      person("NA-0005-A", { heightCm: 180, weightKg: 75 }),
      person("NA-0006-A", { heightCm: 180.01 }),
      person("NA-0007-A", { gender: "male" }),
      person("NA-0001-A"),
    ], query);

    expect(ranked.rings.map((ring) => ring.candidateCount)).toEqual([1, 2, 0, 0, 0, 0, 0, 0, 0, 1]);
    expect(ranked.candidateCount).toBe(4);
    const allIds = ranked.rings.flatMap((ring) => ring.candidates.map((candidate) => candidate.scanId));
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it("keeps one fixed input torso row set and excludes incomplete candidates from overall only", () => {
    const complete = person("NA-0002-A", { chest: 31, underbust: 33, waist: 35, hips: 37 });
    const incomplete = person("NA-0003-A", { chest: 30.01, missing: "underbust" });
    const ranked = rankWearSideCandidates([complete, incomplete], query);
    expect(ranked.overallRows).toEqual(["chest", "underbust", "waist", "hips"]);
    expect(ranked.rings[0]!.leaderboards.overall.candidateIds).toEqual(["NA-0002-A"]);
    expect(ranked.rings[0]!.leaderboards.chest.candidateIds[0]).toBe("NA-0003-A");
    expect(ranked.rings[0]!.candidates.find((candidate) => candidate.scanId === "NA-0003-A")?.overallCoverage).toBe("0/4");
  });

  it("uses mean, worst row, profile difference, then scan ID for overall ties and picks across ring winners", () => {
    const ringOne = person("NA-0009-A", { chest: 30.5, underbust: 32.5, waist: 34.5, hips: 36.5 });
    const ringTwo = person("NA-0008-A", { heightCm: 171.5, chest: 30.1, underbust: 32.1, waist: 34.1, hips: 36.1 });
    const tieB = person("NA-0011-A", { chest: 30.2, underbust: 32.2, waist: 34.2, hips: 36.2 });
    const tieA = person("NA-0010-A", { chest: 30.2, underbust: 32.2, waist: 34.2, hips: 36.2 });
    const ranked = rankWearSideCandidates([ringOne, ringTwo, tieB, tieA], query);
    expect(ranked.rings[0]!.leaderboards.overall.candidateIds.slice(0, 2)).toEqual(["NA-0010-A", "NA-0011-A"]);
    expect(ranked.globalFrontWinner?.scanId).toBe("NA-0008-A");
    expect(ranked.globalFrontWinner?.ring).toBe(2);
  });
});

describe("hidden evaluation", () => {
  it("reports signed errors, explicit missing-row coverage, and independent oracles", () => {
    const input = person("NA-0001-A", { side: 20, tape: 80 });
    const sideWinner = person("NA-0002-A", { side: 20.1, tape: 90 });
    const tapeWinner = person("NA-0003-A", { side: 25, tape: 80.2, missing: "underbust" });
    const first = evaluateSideAndTape(input, sideWinner);
    const second = evaluateSideAndTape(input, tapeWinner);

    expect(first.side.rows[0]?.signedErrorCm).toBeCloseTo(0.1);
    expect(second.side.coverage).toBe("3/4");
    expect(second.tape.coverage).toBe("3/4");
    expect(oracleWinner([first, second], "side")).toBe("NA-0002-A");
    expect(oracleWinner([first, second], "tape")).toBe("NA-0003-A");
  });
});
