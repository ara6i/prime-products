import { SDK_WEAR_PARTS, type SdkWearPart } from "@/app/try-on-test/sizing-lab/sdkWearMatcher";
import type {
  WearEvaluationMetric,
  WearEvaluationRow,
  WearSideCatalogPerson,
} from "@/app/try-on-test/wear-side-selector/types";

type ValueSelector = (person: WearSideCatalogPerson, part: SdkWearPart) => number | null | undefined;

function rounded(value: number) {
  return Math.round(value * 1000) / 1000;
}

function evaluateMetric(
  input: WearSideCatalogPerson,
  candidate: WearSideCatalogPerson,
  selector: ValueSelector,
): WearEvaluationMetric {
  const availableInputParts = SDK_WEAR_PARTS.filter((part) => typeof selector(input, part) === "number");
  const rows = availableInputParts.flatMap((part): WearEvaluationRow[] => {
    const inputCm = selector(input, part);
    const candidateCm = selector(candidate, part);
    if (typeof inputCm !== "number" || typeof candidateCm !== "number") return [];
    const signedErrorCm = rounded(candidateCm - inputCm);
    return [{
      part,
      inputCm: rounded(inputCm),
      candidateCm: rounded(candidateCm),
      signedErrorCm,
      absoluteErrorCm: rounded(Math.abs(signedErrorCm)),
    }];
  });
  const absoluteErrors = rows.map((row) => row.absoluteErrorCm);
  return {
    rows,
    meanAbsoluteErrorCm: absoluteErrors.length
      ? rounded(absoluteErrors.reduce((sum, value) => sum + value, 0) / absoluteErrors.length)
      : null,
    worstRowErrorCm: absoluteErrors.length ? rounded(Math.max(...absoluteErrors)) : null,
    coverage: `${rows.length}/${availableInputParts.length}`,
  };
}

export function evaluateSideAndTape(input: WearSideCatalogPerson, candidate: WearSideCatalogPerson) {
  return {
    scanId: candidate.scanId,
    side: evaluateMetric(input, candidate, (person, part) => person.rows[part]?.sideDepthCm),
    tape: evaluateMetric(input, candidate, (person, part) => person.rows[part]?.tapeCm),
  };
}

export function oracleWinner(
  evaluations: readonly ReturnType<typeof evaluateSideAndTape>[],
  metric: "side" | "tape",
) {
  return [...evaluations]
    .filter((evaluation) => evaluation[metric].meanAbsoluteErrorCm != null)
    .sort((left, right) => (
      left[metric].meanAbsoluteErrorCm! - right[metric].meanAbsoluteErrorCm!
      || left[metric].worstRowErrorCm! - right[metric].worstRowErrorCm!
      || left.scanId.localeCompare(right.scanId)
    ))[0]?.scanId ?? null;
}
