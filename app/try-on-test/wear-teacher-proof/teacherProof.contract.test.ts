import { describe, expect, it } from "vitest";
import {
  classifyTeacherRatio,
  classifyTeacherRow,
  isTeacherRowApplicable,
} from "./teacherProof.contract";

describe("WEAR teacher proof training contract", () => {
  it("marks a male under-bust row without a source measurement as not applicable", () => {
    expect(isTeacherRowApplicable("underbust", "male", null)).toBe(false);
    expect(classifyTeacherRow({
      applicable: false,
      accepted: false,
      partialGeometryAvailable: false,
      visualGeometryAvailable: false,
      measurementAvailable: false,
    })).toBe("not-applicable");
  });

  it("keeps a female tape-only row visible without making it a geometry teacher", () => {
    expect(isTeacherRowApplicable("underbust", "female", 97.5)).toBe(true);
    expect(classifyTeacherRow({
      applicable: true,
      accepted: false,
      partialGeometryAvailable: false,
      visualGeometryAvailable: false,
      measurementAvailable: true,
    })).toBe("measurement-only");
  });

  it("separates rejected geometry from a missing source measurement", () => {
    expect(classifyTeacherRow({
      applicable: true,
      accepted: false,
      partialGeometryAvailable: false,
      visualGeometryAvailable: true,
      measurementAvailable: true,
    })).toBe("rejected-geometry");
  });

  it("keeps independently certified A-B and C-D targets when the closed shape is masked", () => {
    expect(classifyTeacherRow({
      applicable: true,
      accepted: false,
      partialGeometryAvailable: true,
      visualGeometryAvailable: true,
      measurementAvailable: true,
    })).toBe("partial-geometry");
  });

  it("classifies ratio targets from whichever declared inputs are eligible", () => {
    expect(classifyTeacherRatio({ applicable: true, inputsEligible: false })).toBe("masked");
    expect(classifyTeacherRatio({ applicable: true, inputsEligible: true })).toBe("eligible");
    expect(classifyTeacherRatio({ applicable: false, inputsEligible: false })).toBe("not-applicable");
  });
});
