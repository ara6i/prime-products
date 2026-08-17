import "server-only";

import type {
  AiStylistLabStatus,
  AiStylistLabStatusResponse,
  AiStylistScenarioCoverage,
  AiStylistScenarioCoverageResponse,
} from "../types";
export { getAiStylistBatchProgress } from "./aiStylistBatchProgress.server";

const STATUS_TIMEOUT_MS = 4_000;
const SCENARIO_TIMEOUT_MS = 4_000;

export interface ServerDataResult<T> {
  data: T | null;
  error: string | null;
}

function backendBaseUrl(): string {
  return (
    process.env.PRIMESTYLE_API_INTERNAL_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    "http://localhost:4000"
  ).replace(/\/$/, "");
}

function testLabApiKey(): string {
  return (
    process.env.PRIMESTYLE_TEST_LAB_API_KEY ||
    process.env.PRIMESTYLE_CAPACITY_LAB_API_KEY ||
    process.env.NEXT_PUBLIC_PRIMESTYLE_TEST_LAB_API_KEY ||
    ""
  );
}

async function readBackendJson<T>(
  path: string,
  timeoutMs: number,
): Promise<ServerDataResult<T>> {
  const apiKey = testLabApiKey();
  if (!apiKey) {
    return {
      data: null,
      error: "The server-side test-lab API key is missing.",
    };
  }

  try {
    const response = await fetch(`${backendBaseUrl()}${path}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      cache: "no-store",
      signal: AbortSignal.timeout(timeoutMs),
    });
    const payload = (await response.json().catch(() => null)) as T | null;

    if (!response.ok || !payload) {
      const message = (payload as { message?: string; error?: string } | null)
        ?.message;
      const error = (payload as { message?: string; error?: string } | null)
        ?.error;
      return {
        data: null,
        error:
          message || error || `Backend request failed (${response.status}).`,
      };
    }

    return { data: payload, error: null };
  } catch (error) {
    return {
      data: null,
      error:
        error instanceof Error
          ? `Unable to reach the PrimeStyleAI backend: ${error.message}`
          : "Unable to reach the PrimeStyleAI backend.",
    };
  }
}

export async function getAiStylistLabStatusForSsr(): Promise<
  ServerDataResult<AiStylistLabStatus>
> {
  const result = await readBackendJson<AiStylistLabStatusResponse>(
    "/api/test-lab/ai-stylist/status",
    STATUS_TIMEOUT_MS,
  );

  if (!result.data?.ok || !result.data.status) {
    return {
      data: null,
      error:
        result.error ||
        result.data?.message ||
        result.data?.error ||
        "Pipeline status request failed.",
    };
  }

  return { data: result.data.status, error: null };
}

export async function getAiStylistScenarioCoverageForSsr(): Promise<
  ServerDataResult<AiStylistScenarioCoverage>
> {
  const result = await readBackendJson<AiStylistScenarioCoverageResponse>(
    "/api/test-lab/ai-stylist/scenario-coverage",
    SCENARIO_TIMEOUT_MS,
  );

  if (!result.data?.ok || !result.data.scenarioCoverage) {
    return {
      data: null,
      error:
        result.error ||
        result.data?.message ||
        result.data?.error ||
        "Scenario status request failed.",
    };
  }

  return { data: result.data.scenarioCoverage, error: null };
}
