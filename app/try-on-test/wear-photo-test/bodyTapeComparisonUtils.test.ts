import { describe, expect, it } from "vitest";
import { compareBodyTapes, signedTapeError, tapeErrorDescription } from "./bodyTapeComparisonUtils";

describe("body tape error calculations", () => {
  it("subtracts real tape from the original prediction and puts waist and hips first", () => {
    const rows = compareBodyTapes({ waist: 102.3, hips: 111.5, chest: 116.7 }, { waist: 99, hips: 113, chest: 106 });
    expect(rows.map(row => row.kind)).toEqual(["waist", "hips", "chest", "underbust", "neck", "thigh"]);
    expect(rows[0]!.differenceCm).toBeCloseTo(3.3);
    expect(rows[1]!.differenceCm).toBeCloseTo(-1.5);
    expect(rows[2]!.differenceCm).toBeCloseTo(10.7);
    expect(rows.slice(0, 3).every(row => row.withinGoal === false)).toBe(true);
  });

  it("scores the explicit half-inch goal using unrounded differences", () => {
    expect(compareBodyTapes({ waist: 101.27 }, { waist: 100 })[0]!.withinGoal).toBe(true);
    expect(compareBodyTapes({ waist: 101.28 }, { waist: 100 })[0]!.withinGoal).toBe(false);
    expect(compareBodyTapes({ waist: 98.72 }, { waist: 100 })[0]!.withinGoal).toBe(false);
  });

  it("never turns missing, zero or invalid numbers into a successful zero error", () => {
    const rows = compareBodyTapes({ waist: 90, hips: 0, chest: Infinity, neck: -1, thigh: 50 }, { hips: 99, chest: 100, neck: 40, thigh: NaN });
    expect(rows.every(row => row.differenceCm === null && row.withinGoal === null)).toBe(true);
  });

  it("explains the sign in plain English and does not call a tiny nonzero difference exact", () => {
    expect(signedTapeError(3.3)).toBe("+3.3 cm");
    expect(signedTapeError(-1.5)).toBe("−1.5 cm");
    expect(tapeErrorDescription(10.7)).toBe("10.7 cm too high");
    expect(tapeErrorDescription(-1.5)).toBe("1.5 cm too low");
    expect(tapeErrorDescription(0)).toBe("Exact match");
    expect(tapeErrorDescription(0.001)).toBe("Less than 0.01 cm too high");
    expect(signedTapeError(-0.001)).toBe("−<0.01 cm");
  });
});
