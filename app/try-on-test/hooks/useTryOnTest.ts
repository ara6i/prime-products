"use client";

import { useCallback } from "react";
import { toast } from "sonner";
import { useImageFile } from "./useImageFile";
import { useStopwatch } from "./useStopwatch";
import { useTryOnSubmission } from "./useTryOnSubmission";
import { useCustomPrompt } from "./useCustomPrompt";
import { useTryOnHistory } from "./useTryOnHistory";
import { useModelSelection } from "./useModelSelection";
import { TRY_ON_TEST_CONFIG } from "../lib/config";
import { canSubmitTryOn } from "../lib/canSubmit";
import { buildTryOnRunInput } from "../lib/mappers";
import type { TryOnSizingRunData } from "../lib/types";

/**
 * Top-level orchestration hook for the try-on test page. Composes every
 * other hook (image slots, prompt state, submission, stopwatch, history)
 * into a single object the UI can render. The page does no business logic
 * — every async flow, every derivation, every side-effect lives here.
 */
export function useTryOnTest() {
  const model = useImageFile("Model photo");
  const garment = useImageFile("Garment");
  const stopwatch = useStopwatch();
  const prompt = useCustomPrompt();
  const history = useTryOnHistory();
  const modelSelection = useModelSelection();
  const submission = useTryOnSubmission(TRY_ON_TEST_CONFIG);

  // Vertex try-on doesn't accept a prompt, so the empty-prompt check is moot
  // when the selected model ignores the textarea.
  const promptInvalid = modelSelection.entry.acceptsPrompt && prompt.isInvalid;

  const canSubmit = canSubmitTryOn({
    modelDataUri: model.state.dataUri,
    garmentDataUri: garment.state.dataUri,
    isModelCompressing: model.state.isCompressing,
    isGarmentCompressing: garment.state.isCompressing,
    isCustomPromptInvalid: promptInvalid,
    phase: submission.phase,
  });

  const run = useCallback(async (sizing?: TryOnSizingRunData | null) => {
    if (!canSubmit || !model.state.dataUri || !garment.state.dataUri) return;

    const acceptsPrompt = modelSelection.entry.acceptsPrompt;
    const startedAt = Date.now();
    const runInput = buildTryOnRunInput({
      modelDataUri: model.state.dataUri,
      garmentDataUri: garment.state.dataUri,
      customPrompt: sizing ? undefined : acceptsPrompt ? prompt.promptToSend : undefined,
      model: modelSelection.modelId,
      sizing,
    });
    const promptKind = sizing ? "default" : acceptsPrompt ? prompt.promptKind : "n/a";
    const promptForHistory = sizing?.promptPreview || (acceptsPrompt ? prompt.promptForHistory : "(model ignores prompt)");

    submission.reset();
    stopwatch.start();

    try {
      const result = await submission.run(runInput);
      stopwatch.stop();
      history.recordSuccess({
        result,
        startedAt,
        prompt: promptForHistory,
        promptKind,
        modelId: modelSelection.modelId,
      });
    } catch (err) {
      stopwatch.stop();
      const message = err instanceof Error ? err.message : "Try-on failed";
      toast.error(message);
      history.recordError({
        startedAt,
        endedAt: Date.now(),
        prompt: promptForHistory,
        promptKind,
        modelId: modelSelection.modelId,
        errorMessage: message,
      });
    }
  }, [
    canSubmit,
    model.state.dataUri,
    garment.state.dataUri,
    prompt.promptToSend,
    prompt.promptKind,
    prompt.promptForHistory,
    modelSelection.modelId,
    modelSelection.entry.acceptsPrompt,
    submission,
    stopwatch,
    history,
  ]);

  return { model, garment, stopwatch, prompt, history, modelSelection, submission, canSubmit, run };
}
