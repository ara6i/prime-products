"use client";

import { useState } from "react";
import { DEFAULT_TRY_ON_MODEL, getModelEntry, type TryOnModelEntry, type TryOnModelId } from "../lib/models";

/**
 * Owns which model the test page is targeting and exposes the resolved
 * `TryOnModelEntry` so consumers (prompt editor, run hook, history) can
 * key off `family` / `acceptsPrompt` without duplicating registry lookups.
 */
export function useModelSelection(initial: TryOnModelId = DEFAULT_TRY_ON_MODEL): {
  modelId: TryOnModelId;
  setModelId: (next: TryOnModelId) => void;
  entry: TryOnModelEntry;
} {
  const [modelId, setModelId] = useState<TryOnModelId>(initial);
  const entry = getModelEntry(modelId);
  return { modelId, setModelId, entry };
}
