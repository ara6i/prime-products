import type { TryOnPhase } from "./types";
import { isLivePhase } from "./runPhase";

export interface CanSubmitInputs {
  modelDataUri: string | null;
  garmentDataUri: string | null;
  isModelCompressing: boolean;
  isGarmentCompressing: boolean;
  isCustomPromptInvalid: boolean;
  phase: TryOnPhase;
}

/**
 * Pure derivation: returns whether the test page can fire a try-on now.
 * Centralized so the button enabling and the run-handler use the same rules.
 */
export function canSubmitTryOn(inputs: CanSubmitInputs): boolean {
  if (!inputs.modelDataUri || !inputs.garmentDataUri) return false;
  if (inputs.isModelCompressing || inputs.isGarmentCompressing) return false;
  if (inputs.isCustomPromptInvalid) return false;
  if (isLivePhase(inputs.phase)) return false;
  return true;
}
