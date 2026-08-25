import type {
  TeacherRatioState,
  TeacherRowId,
  TeacherRowState,
} from "./teacherProof.types";

export function isTeacherRowApplicable(
  id: TeacherRowId,
  gender: string,
  measurementCm: number | null,
) {
  if (id !== "underbust") return true;
  return gender.toLowerCase() === "female" || measurementCm !== null;
}

export function classifyTeacherRow({
  applicable,
  accepted,
  partialGeometryAvailable,
  visualGeometryAvailable,
  measurementAvailable,
}: {
  applicable: boolean;
  accepted: boolean;
  partialGeometryAvailable: boolean;
  visualGeometryAvailable: boolean;
  measurementAvailable: boolean;
}): TeacherRowState {
  if (!applicable) return "not-applicable";
  if (accepted) return "certified";
  if (partialGeometryAvailable) return "partial-geometry";
  if (visualGeometryAvailable) return "rejected-geometry";
  if (measurementAvailable) return "measurement-only";
  return "rejected-geometry";
}

export function classifyTeacherRatio({
  applicable,
  inputsEligible,
}: {
  applicable: boolean;
  inputsEligible: boolean;
}): TeacherRatioState {
  if (!applicable) return "not-applicable";
  return inputsEligible ? "eligible" : "masked";
}
