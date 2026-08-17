"use client";

import { useCallback, useRef, useState } from "react";
import type {
  AiStylistScenarioCoverage,
  AiStylistScenarioCoverageResponse,
} from "../types";

interface UseAiStylistScenarioCoverageInput {
  initialCoverage: AiStylistScenarioCoverage | null;
  initialError: string | null;
}

export function useAiStylistScenarioCoverage({
  initialCoverage,
  initialError,
}: UseAiStylistScenarioCoverageInput) {
  const [coverage, setCoverage] = useState<AiStylistScenarioCoverage | null>(
    initialCoverage,
  );
  const [error, setError] = useState<string | null>(initialError);
  const [refreshPending, setRefreshPending] = useState(false);
  const requestInFlightRef = useRef(false);

  const refreshCoverage = useCallback(async () => {
    if (requestInFlightRef.current) return;
    requestInFlightRef.current = true;
    try {
      const response = await fetch(
        "/api/try-on-test/ai-stylist/scenario-coverage",
        { cache: "no-store" },
      );
      const payload =
        (await response.json()) as AiStylistScenarioCoverageResponse;
      if (!response.ok || !payload.ok || !payload.scenarioCoverage) {
        throw new Error(
          payload.message || payload.error || "Scenario status request failed.",
        );
      }
      setCoverage(payload.scenarioCoverage);
      setError(null);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Scenario status request failed.",
      );
    } finally {
      requestInFlightRef.current = false;
    }
  }, []);

  const startRefresh = useCallback(async () => {
    setRefreshPending(true);
    try {
      if (coverage?.refresh.status === "running") {
        await refreshCoverage();
        return;
      }

      const response = await fetch(
        "/api/try-on-test/ai-stylist/scenario-coverage/refresh",
        { method: "POST", cache: "no-store" },
      );
      const payload = (await response.json()) as {
        ok?: boolean;
        error?: string;
        message?: string;
        scenarioCoverage?: AiStylistScenarioCoverage;
      };
      if (!response.ok || !payload.ok) {
        throw new Error(
          payload.message || payload.error || "Scenario refresh failed.",
        );
      }
      if (payload.scenarioCoverage) {
        setCoverage(payload.scenarioCoverage);
        setError(null);
      } else {
        await refreshCoverage();
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Scenario refresh failed.",
      );
    } finally {
      setRefreshPending(false);
    }
  }, [coverage, refreshCoverage]);

  return {
    coverage,
    error,
    refreshPending,
    startRefresh,
  };
}
