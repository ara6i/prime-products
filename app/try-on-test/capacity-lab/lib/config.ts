import type { CapacityScenarioOption, CapacityTargetOption } from "../types";
import type { TryOnModelId } from "../../lib/models";

export const DEFAULT_CAPACITY_TRY_ON_MODEL: TryOnModelId = "gemini-2.5-flash-image";
const MIRROR_GEMINI_MAX_REQUESTS = 150;
const MIRROR_GEMINI_MAX_USERS = 150;

export const CAPACITY_TARGETS: CapacityTargetOption[] = [
  {
    id: "local",
    label: "Local backend",
    description: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000",
    baseUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000",
    isLive: false,
  },
  {
    id: "test",
    label: "Test backend",
    description: "test-be-9a7k.primestyleai.com",
    baseUrl: "https://test-be-9a7k.primestyleai.com",
    isLive: false,
  },
  {
    id: "live",
    label: "Live API",
    description: "api.primestyleai.com",
    baseUrl: "https://api.primestyleai.com",
    isLive: true,
  },
];

export const CAPACITY_SCENARIOS: CapacityScenarioOption[] = [
  {
    id: "health",
    label: "Backend health check",
    description: "Measures API latency, Mongo readiness, SSE counters, and Node responsiveness without using Gemini.",
    helper: "Safe for thousands of requests. No Gemini quota is consumed.",
    method: "GET",
    path: "target-specific health route",
    isGeminiSafe: true,
    maxTotalRequests: 10000,
    maxVirtualUsers: 1000,
    estimatedTryOnCallsPerRequest: 0,
    estimatedSizingCallsPerRequest: 0,
  },
  {
    id: "sdk-mirror-sse-real",
    label: "SDK exact mirror",
    description: "Runs the isolated test-lab copy of the browser SDK flow: sizing, try-on submit, global SSE stream, plus fallback status polling.",
    helper: "Safe architecture lane: calls only /api/test-lab/sdk-mirror routes. It does not call /api/v1 SDK try-on.",
    method: "POST",
    path: "/api/test-lab/sdk-mirror/sizing/age-check -> /sizing/recommend -> /tryon -> /tryon/stream + /status fallback",
    isGeminiSafe: false,
    maxTotalRequests: MIRROR_GEMINI_MAX_REQUESTS,
    maxVirtualUsers: MIRROR_GEMINI_MAX_USERS,
    estimatedTryOnCallsPerRequest: 1,
    estimatedSizingCallsPerRequest: 2,
  },
  {
    id: "sdk-journey-job-stream-real",
    label: "SDK worker experiment",
    description: "Runs copied test-lab SDK routes: sizing, try-on submit, a job-scoped SSE stream, then one result fetch when the job completes.",
    helper: "Experimental architecture in isolated /test-lab/sdk-mirror routes only. It does not call or change the real /api/v1 SDK try-on route.",
    method: "POST",
    path: "/api/test-lab/sdk-mirror/sizing/age-check -> /sizing/recommend -> /tryon -> /tryon/stream?jobId -> /tryon/result/:jobId",
    isGeminiSafe: false,
    maxTotalRequests: MIRROR_GEMINI_MAX_REQUESTS,
    maxVirtualUsers: MIRROR_GEMINI_MAX_USERS,
    estimatedTryOnCallsPerRequest: 1,
    estimatedSizingCallsPerRequest: 2,
  },
  {
    id: "shopify-mirror-sse-real",
    label: "Shopify exact mirror",
    description: "Runs the isolated Shopify-shaped mirror path with SDK-like sizing, try-on submit, global SSE stream, and fallback status polling.",
    helper: "Safe architecture lane: calls only /api/test-lab/shopify-mirror routes. It does not touch the Shopify app proxy or Shopify backend routes.",
    method: "POST",
    path: "/api/test-lab/shopify-mirror/sizing/age-check -> /sizing/recommend -> /tryon -> /tryon/stream + /status fallback",
    isGeminiSafe: false,
    maxTotalRequests: MIRROR_GEMINI_MAX_REQUESTS,
    maxVirtualUsers: MIRROR_GEMINI_MAX_USERS,
    estimatedTryOnCallsPerRequest: 1,
    estimatedSizingCallsPerRequest: 2,
  },
  {
    id: "shopify-mirror-job-stream-real",
    label: "Shopify worker experiment",
    description: "Runs the isolated Shopify-shaped mirror path with job-scoped SSE and one binary result fetch.",
    helper: "Experimental architecture in isolated /test-lab/shopify-mirror routes only. It does not touch Shopify app routes.",
    method: "POST",
    path: "/api/test-lab/shopify-mirror/sizing/age-check -> /sizing/recommend -> /tryon -> /tryon/stream?jobId -> /tryon/result/:jobId",
    isGeminiSafe: false,
    maxTotalRequests: MIRROR_GEMINI_MAX_REQUESTS,
    maxVirtualUsers: MIRROR_GEMINI_MAX_USERS,
    estimatedTryOnCallsPerRequest: 1,
    estimatedSizingCallsPerRequest: 2,
  },
];

export const CAPACITY_USER_PRESETS = [1, 5, 10, 25, 50, 100, 150, 250, 500, 1000] as const;
export const CAPACITY_REQUEST_PRESETS = [10, 25, 50, 100, 150, 500, 1000, 2500, 5000, 10000] as const;

export const DEFAULT_CAPACITY_CONFIG = {
  targetId: "test",
  scenarioId: "health",
  totalRequests: 500,
  virtualUsers: 25,
  timeoutMs: 8000,
  tryOnModel: DEFAULT_CAPACITY_TRY_ON_MODEL,
  confirmLive: false,
  confirmGemini: false,
} as const;
