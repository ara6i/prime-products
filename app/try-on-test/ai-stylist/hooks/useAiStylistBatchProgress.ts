"use client";

import { useCallback, useRef, useState } from "react";
import type {
  AiStylistBatchProgress,
  AiStylistBatchProgressResponse,
} from "../types";

export function useAiStylistBatchProgress(
  initialProgress: AiStylistBatchProgress | null,
  initialError: string | null,
) {
  const [progress, setProgress] = useState(initialProgress);
  const [error, setError] = useState<string | null>(initialError);
  const [loading, setLoading] = useState(false);
  const inFlight = useRef(false);

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    try {
      const response = await fetch("/api/try-on-test/ai-stylist/batch-progress", {
        cache: "no-store",
      });
      const payload = (await response.json()) as AiStylistBatchProgressResponse;
      if (!response.ok || !payload.ok || !payload.progress) {
        throw new Error(payload.error || "Batch progress request failed.");
      }
      setProgress(payload.progress);
      setError(null);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Batch progress request failed.",
      );
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  }, []);

  return { progress, error, loading, refresh };
}
