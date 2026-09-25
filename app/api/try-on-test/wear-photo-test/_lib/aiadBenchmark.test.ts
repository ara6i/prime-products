import { describe, expect, it } from "vitest";
import { aiadMetrics, aiadWaistConfidence } from "./aiadBenchmark";
import type { AiadBenchmarkRow } from "@/app/try-on-test/wear-photo-test/aiadBenchmarkTypes";

function row(index: number): AiadBenchmarkRow {
  const error = index + 1;
  return {
    scanId: `fixture-${index}`,
    subjectId: `fixture-${index}`,
    gender: index % 2 ? "female" : "male",
    heightCm: 170,
    weightKg: index < 4 ? 60 : index < 7 ? 80 : 100,
    imageUrl: "/fixture.png",
    ok: true,
    predicted: { waist: 80 + error },
    sigma: { waist: error },
    actuals: { waist: 80 },
  };
}

describe("Aiad confidence evidence", () => {
  it("reports Shane's exact 50/30/20 fields without dropping large errors", () => {
    const rows = Array.from({ length: 10 }, (_, index) => row(index));
    const confidence = aiadWaistConfidence(rows)!;
    expect(confidence.buckets.map(bucket => bucket.count)).toEqual([5, 3, 2]);
    expect(confidence.buckets[0]!.maeCm).toBe(3);
    expect(confidence.buckets[2]!.maeCm).toBe(9.5);
    expect(confidence.buckets[2]!.catastrophicAbove5Cm).toBe(2);
    expect(confidence.buckets[0]!.bmiMix.under25.count).toBe(4);
    expect(confidence.requestedCohortAvailable).toBe(false);
  });

  it("adds P90, one-inch percentage and catastrophic counts to the full report", () => {
    const waist = aiadMetrics(Array.from({ length: 10 }, (_, index) => row(index))).waist;
    expect(waist.count).toBe(10);
    expect(waist.medianCm).toBe(5.5);
    expect(waist.p90Cm).toBeCloseTo(9.1);
    expect(waist.withinHalfInchPct).toBe(10);
    expect(waist.withinOneInchPct).toBe(20);
    expect(waist.catastrophicAbove5Cm).toBe(5);
  });

  it("refuses to invent confidence buckets when sigma is absent", () => {
    const rows = [row(0)];
    delete rows[0]!.sigma;
    expect(aiadWaistConfidence(rows)).toBeNull();
  });
});
