import type { CapacityRunConfig, CapacityScenarioId, CapacityTargetId } from "@/app/try-on-test/capacity-lab/types";

interface ServerCapacityTarget {
  id: CapacityTargetId;
  label: string;
  baseUrl: string;
  isLive: boolean;
  pm2Name: string | null;
  metricsMode: "local" | "droplet";
}

export interface ServerCapacityScenario {
  id: CapacityScenarioId;
  method: "GET" | "POST";
  paths: Record<CapacityTargetId, string>;
  isGeminiSafe: boolean;
  maxTotalRequests: number;
  maxVirtualUsers: number;
  estimatedTryOnCallsPerRequest: number;
  estimatedSizingCallsPerRequest: number;
}

const TARGETS: Record<CapacityTargetId, ServerCapacityTarget> = {
  local: {
    id: "local",
    label: "Local backend",
    baseUrl: process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000",
    isLive: false,
    pm2Name: null,
    metricsMode: "local",
  },
  test: {
    id: "test",
    label: "Test backend",
    baseUrl: "https://test-be-9a7k.primestyleai.com",
    isLive: false,
    pm2Name: "primestyle-backend-test",
    metricsMode: "droplet",
  },
  live: {
    id: "live",
    label: "Live API",
    baseUrl: "https://api.primestyleai.com",
    isLive: true,
    pm2Name: "primestyle-backend",
    metricsMode: "droplet",
  },
};

const SCENARIOS: Record<CapacityScenarioId, ServerCapacityScenario> = {
  health: {
    id: "health",
    method: "GET",
    isGeminiSafe: true,
    maxTotalRequests: 10000,
    maxVirtualUsers: 1000,
    estimatedTryOnCallsPerRequest: 0,
    estimatedSizingCallsPerRequest: 0,
    paths: {
      local: "/api/health",
      test: "/health",
      live: "/health",
    },
  },
  "ai-sizing-real": {
    id: "ai-sizing-real",
    method: "POST",
    isGeminiSafe: false,
    maxTotalRequests: 110,
    maxVirtualUsers: 110,
    estimatedTryOnCallsPerRequest: 0,
    estimatedSizingCallsPerRequest: 2,
    paths: {
      local: "/api/v1/sizing/age-check -> /api/v1/sizing/recommend",
      test: "/api/v1/sizing/age-check -> /api/v1/sizing/recommend",
      live: "/api/v1/sizing/age-check -> /api/v1/sizing/recommend",
    },
  },
  "tryon-submit-only-real": {
    id: "tryon-submit-only-real",
    method: "POST",
    isGeminiSafe: false,
    maxTotalRequests: 110,
    maxVirtualUsers: 110,
    estimatedTryOnCallsPerRequest: 1,
    estimatedSizingCallsPerRequest: 0,
    paths: {
      local: "/api/v1/tryon submit only",
      test: "/api/v1/tryon submit only",
      live: "/api/v1/tryon submit only",
    },
  },
  "tryon-no-image-real": {
    id: "tryon-no-image-real",
    method: "POST",
    isGeminiSafe: false,
    maxTotalRequests: 110,
    maxVirtualUsers: 110,
    estimatedTryOnCallsPerRequest: 1,
    estimatedSizingCallsPerRequest: 0,
    paths: {
      local: "/api/v1/tryon -> /api/v1/tryon/status/:jobId?includeImage=false",
      test: "/api/v1/tryon -> /api/v1/tryon/status/:jobId?includeImage=false",
      live: "/api/v1/tryon -> /api/v1/tryon/status/:jobId?includeImage=false",
    },
  },
  "tryon-real": {
    id: "tryon-real",
    method: "POST",
    isGeminiSafe: false,
    maxTotalRequests: 110,
    maxVirtualUsers: 110,
    estimatedTryOnCallsPerRequest: 1,
    estimatedSizingCallsPerRequest: 0,
    paths: {
      local: "/api/v1/tryon -> /api/v1/tryon/status/:jobId",
      test: "/api/v1/tryon -> /api/v1/tryon/status/:jobId",
      live: "/api/v1/tryon -> /api/v1/tryon/status/:jobId",
    },
  },
  "sdk-journey-no-image-real": {
    id: "sdk-journey-no-image-real",
    method: "POST",
    isGeminiSafe: false,
    maxTotalRequests: 110,
    maxVirtualUsers: 110,
    estimatedTryOnCallsPerRequest: 1,
    estimatedSizingCallsPerRequest: 2,
    paths: {
      local: "/api/v1/sizing/age-check -> /api/v1/sizing/recommend -> /api/v1/tryon -> /api/v1/tryon/status/:jobId?includeImage=false",
      test: "/api/v1/sizing/age-check -> /api/v1/sizing/recommend -> /api/v1/tryon -> /api/v1/tryon/status/:jobId?includeImage=false",
      live: "/api/v1/sizing/age-check -> /api/v1/sizing/recommend -> /api/v1/tryon -> /api/v1/tryon/status/:jobId?includeImage=false",
    },
  },
  "sdk-journey-sse-real": {
    id: "sdk-journey-sse-real",
    method: "POST",
    isGeminiSafe: false,
    maxTotalRequests: 110,
    maxVirtualUsers: 110,
    estimatedTryOnCallsPerRequest: 1,
    estimatedSizingCallsPerRequest: 2,
    paths: {
      local: "/api/v1/sizing/age-check -> /api/v1/sizing/recommend -> /api/v1/tryon -> /api/v1/tryon/stream + /status fallback",
      test: "/api/v1/sizing/age-check -> /api/v1/sizing/recommend -> /api/v1/tryon -> /api/v1/tryon/stream + /status fallback",
      live: "/api/v1/sizing/age-check -> /api/v1/sizing/recommend -> /api/v1/tryon -> /api/v1/tryon/stream + /status fallback",
    },
  },
  "sdk-journey-job-stream-real": {
    id: "sdk-journey-job-stream-real",
    method: "POST",
    isGeminiSafe: false,
    maxTotalRequests: 110,
    maxVirtualUsers: 110,
    estimatedTryOnCallsPerRequest: 1,
    estimatedSizingCallsPerRequest: 2,
    paths: {
      local: "/api/test-lab/sdk-mirror/sizing/age-check -> /sizing/recommend -> /tryon -> /tryon/stream?jobId -> /tryon/result/:jobId",
      test: "/api/test-lab/sdk-mirror/sizing/age-check -> /sizing/recommend -> /tryon -> /tryon/stream?jobId -> /tryon/result/:jobId",
      live: "/api/test-lab/sdk-mirror/sizing/age-check -> /sizing/recommend -> /tryon -> /tryon/stream?jobId -> /tryon/result/:jobId",
    },
  },
  "sdk-journey-real": {
    id: "sdk-journey-real",
    method: "POST",
    isGeminiSafe: false,
    maxTotalRequests: 110,
    maxVirtualUsers: 110,
    estimatedTryOnCallsPerRequest: 1,
    estimatedSizingCallsPerRequest: 2,
    paths: {
      local: "/api/v1/sizing/age-check -> /api/v1/sizing/recommend -> /api/v1/tryon -> /api/v1/tryon/status/:jobId",
      test: "/api/v1/sizing/age-check -> /api/v1/sizing/recommend -> /api/v1/tryon -> /api/v1/tryon/status/:jobId",
      live: "/api/v1/sizing/age-check -> /api/v1/sizing/recommend -> /api/v1/tryon -> /api/v1/tryon/status/:jobId",
    },
  },
};

export function getServerTarget(targetId: CapacityRunConfig["targetId"]): ServerCapacityTarget {
  return TARGETS[targetId] ?? TARGETS.test;
}

export function getServerScenario(scenarioId: CapacityRunConfig["scenarioId"]): ServerCapacityScenario {
  return SCENARIOS[scenarioId] ?? SCENARIOS.health;
}

export function buildScenarioUrl(targetId: CapacityRunConfig["targetId"], scenarioId: CapacityRunConfig["scenarioId"]): string {
  const target = getServerTarget(targetId);
  const scenario = getServerScenario(scenarioId);
  const path = scenario.paths[target.id];
  if (path.includes(" -> ")) return `${target.baseUrl.replace(/\/+$/, "")} ${path}`;
  if (path.startsWith("/")) return new URL(path, target.baseUrl).toString();
  return `${target.baseUrl.replace(/\/+$/, "")}/${path}`;
}
