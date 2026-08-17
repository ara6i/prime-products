"use client";

import { useCallback, useRef, useState } from "react";
import type { AiStylistLabStatus, AiStylistLabStatusResponse } from "../types";

interface UseAiStylistLabStatusInput {
  initialStatus: AiStylistLabStatus | null;
  initialError: string | null;
}

export function useAiStylistLabStatus({
  initialStatus,
  initialError,
}: UseAiStylistLabStatusInput) {
  const [status, setStatus] = useState<AiStylistLabStatus | null>(
    initialStatus,
  );
  const [error, setError] = useState<string | null>(initialError);
  const [loading, setLoading] = useState(false);
  const refreshInFlightRef = useRef(false);

  const refresh = useCallback(async () => {
    if (refreshInFlightRef.current) return;
    refreshInFlightRef.current = true;
    setLoading(true);

    try {
      const response = await fetch("/api/try-on-test/ai-stylist/status", {
        method: "GET",
        cache: "no-store",
      });
      const payload = (await response.json()) as AiStylistLabStatusResponse;
      if (!response.ok || !payload.ok || !payload.status) {
        throw new Error(
          payload.message || payload.error || "Pipeline status request failed.",
        );
      }
      setStatus(payload.status);
      setError(null);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Pipeline status request failed.",
      );
    } finally {
      refreshInFlightRef.current = false;
      setLoading(false);
    }
  }, []);

  return { status, error, loading, refresh };
}
