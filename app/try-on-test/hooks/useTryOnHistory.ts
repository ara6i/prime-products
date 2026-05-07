"use client";

import { useCallback, useState } from "react";
import { buildErrorHistoryEntry, buildSuccessHistoryEntry } from "../lib/mappers";
import { HISTORY_LIMIT } from "../lib/config";
import type { TryOnModelId } from "../lib/models";
import type { HistoryEntry, TryOnRunResult } from "../lib/types";

type PromptKind = "default" | "custom" | "n/a";

interface RecordSuccessArgs {
  result: TryOnRunResult;
  startedAt: number;
  prompt: string;
  promptKind: PromptKind;
  modelId: TryOnModelId;
}

interface RecordErrorArgs {
  startedAt: number;
  endedAt: number;
  prompt: string;
  promptKind: PromptKind;
  modelId: TryOnModelId;
  errorMessage: string;
}

/**
 * Owns the rolling list of past runs (success + failure) and the trimming
 * to HISTORY_LIMIT. The page just reads `entries`; mappers do the shape work.
 */
export function useTryOnHistory(): {
  entries: HistoryEntry[];
  recordSuccess: (args: RecordSuccessArgs) => void;
  recordError: (args: RecordErrorArgs) => void;
  clear: () => void;
} {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);

  const recordSuccess = useCallback((args: RecordSuccessArgs) => {
    setEntries((prev) => [buildSuccessHistoryEntry(args), ...prev].slice(0, HISTORY_LIMIT));
  }, []);

  const recordError = useCallback((args: RecordErrorArgs) => {
    setEntries((prev) => [buildErrorHistoryEntry(args), ...prev].slice(0, HISTORY_LIMIT));
  }, []);

  const clear = useCallback(() => setEntries([]), []);

  return { entries, recordSuccess, recordError, clear };
}
