import type { TryOnPhase } from "./types";

export function isLivePhase(phase: TryOnPhase): boolean {
  return phase === "submitting" || phase === "queued" || phase === "generating";
}

export function describeRunPhase(phase: TryOnPhase): string {
  switch (phase) {
    case "submitting":
      return "Submitting…";
    case "queued":
      return "Queued…";
    case "generating":
      return "Generating…";
    default:
      return "Run try-on";
  }
}
