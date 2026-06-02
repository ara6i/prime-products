import type { CapacityScenarioOption, CapacityTargetOption } from "../types";
import type { TryOnModelId } from "../../lib/models";

export const DEFAULT_CAPACITY_TRY_ON_MODEL: TryOnModelId = "gemini-2.5-flash-image";
const CAPACITY_GEMINI_MAX_REQUESTS = 150;
const CAPACITY_GEMINI_MAX_USERS = 150;

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
    id: "capacity",
    label: "Capacity backend",
    description: process.env.NEXT_PUBLIC_CAPACITY_BACKEND_URL ?? "capacity-be-9a7k.primestyleai.com",
    baseUrl: process.env.NEXT_PUBLIC_CAPACITY_BACKEND_URL ?? "https://capacity-be-9a7k.primestyleai.com",
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
    id: "sdk-real-route-clone",
    label: "SDK real route clone",
    description: "Runs the real public SDK route chain on the separate capacity backend: sizing, try-on submit, global SSE stream, plus fallback status polling.",
    helper: "Calls only the capacity backend clone. It uses /api/v1/sizing/* and /api/v1/tryon exactly like the published SDK.",
    method: "POST",
    path: "/api/v1/sizing/age-check -> /api/v1/sizing/recommend -> /api/v1/tryon -> /api/v1/tryon/stream + /status fallback",
    isGeminiSafe: false,
    maxTotalRequests: CAPACITY_GEMINI_MAX_REQUESTS,
    maxVirtualUsers: CAPACITY_GEMINI_MAX_USERS,
    estimatedTryOnCallsPerRequest: 1,
    estimatedSizingCallsPerRequest: 2,
  },
  {
    id: "shopify-real-route-clone",
    label: "Shopify real route clone",
    description: "Runs the real Shopify route mix on the separate capacity backend: v2 sizing plus legacy Shopify try-on/status/stream.",
    helper: "Calls only the capacity backend clone. It does not touch staging Shopify or live Shopify routes.",
    method: "POST",
    path: "/api/admin/shopify-v2/sizing/age-check -> /sizing/recommend -> /api/admin/shopify/tryon -> returned streamUrl + /status fallback",
    isGeminiSafe: false,
    maxTotalRequests: CAPACITY_GEMINI_MAX_REQUESTS,
    maxVirtualUsers: CAPACITY_GEMINI_MAX_USERS,
    estimatedTryOnCallsPerRequest: 1,
    estimatedSizingCallsPerRequest: 2,
  },
];

export const CAPACITY_USER_PRESETS = [1, 5, 10, 25, 50, 100, 150, 250, 500, 1000] as const;
export const CAPACITY_REQUEST_PRESETS = [10, 25, 50, 100, 150, 500, 1000, 2500, 5000, 10000] as const;

export const DEFAULT_CAPACITY_CONFIG = {
  targetId: "capacity",
  scenarioId: "health",
  totalRequests: 500,
  virtualUsers: 25,
  timeoutMs: 8000,
  tryOnModel: DEFAULT_CAPACITY_TRY_ON_MODEL,
  confirmLive: false,
  confirmGemini: false,
} as const;
