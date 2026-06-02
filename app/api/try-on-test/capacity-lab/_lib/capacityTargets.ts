import type { CapacityRouteSafety, CapacityRunConfig, CapacityScenarioId, CapacityTargetId } from "@/app/try-on-test/capacity-lab/types";

export const SDK_REAL_ROUTE_PREFIX = "/api/v1";
export const SHOPIFY_LEGACY_ROUTE_PREFIX = "/api/admin/shopify";
export const SHOPIFY_V2_ROUTE_PREFIX = "/api/admin/shopify-v2";

const CAPACITY_BACKEND_BASE_URL = process.env.PRIMESTYLE_CAPACITY_BACKEND_URL
  ?? process.env.NEXT_PUBLIC_CAPACITY_BACKEND_URL
  ?? "https://capacity-be-9a7k.primestyleai.com";
const CAPACITY_GEMINI_MAX_REQUESTS = 150;
const CAPACITY_GEMINI_MAX_USERS = 150;
const UNSAFE_STRESS_HOST_PATTERNS = [
  "api.primestyleai.com",
  "test-be-9a7k.primestyleai.com",
];

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

export interface CapacityRouteAudit {
  routeSafety: CapacityRouteSafety;
  targetBaseUrl: string;
  apiPrefix: string | null;
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
  capacity: {
    id: "capacity",
    label: "Capacity backend",
    baseUrl: CAPACITY_BACKEND_BASE_URL,
    isLive: false,
    pm2Name: "primestyle-backend-capacity",
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
      capacity: "/health",
      live: "/health",
    },
  },
  "sdk-real-route-clone": {
    id: "sdk-real-route-clone",
    method: "POST",
    isGeminiSafe: false,
    maxTotalRequests: CAPACITY_GEMINI_MAX_REQUESTS,
    maxVirtualUsers: CAPACITY_GEMINI_MAX_USERS,
    estimatedTryOnCallsPerRequest: 1,
    estimatedSizingCallsPerRequest: 2,
    paths: {
      local: `${SDK_REAL_ROUTE_PREFIX}/sizing/age-check -> /sizing/recommend -> /tryon -> /tryon/stream + /status fallback`,
      test: `${SDK_REAL_ROUTE_PREFIX}/sizing/age-check -> /sizing/recommend -> /tryon -> /tryon/stream + /status fallback`,
      capacity: `${SDK_REAL_ROUTE_PREFIX}/sizing/age-check -> /sizing/recommend -> /tryon -> /tryon/stream + /status fallback`,
      live: `${SDK_REAL_ROUTE_PREFIX}/sizing/age-check -> /sizing/recommend -> /tryon -> /tryon/stream + /status fallback`,
    },
  },
  "shopify-real-route-clone": {
    id: "shopify-real-route-clone",
    method: "POST",
    isGeminiSafe: false,
    maxTotalRequests: CAPACITY_GEMINI_MAX_REQUESTS,
    maxVirtualUsers: CAPACITY_GEMINI_MAX_USERS,
    estimatedTryOnCallsPerRequest: 1,
    estimatedSizingCallsPerRequest: 2,
    paths: {
      local: `${SHOPIFY_V2_ROUTE_PREFIX}/sizing/age-check -> /sizing/recommend -> ${SHOPIFY_LEGACY_ROUTE_PREFIX}/tryon -> returned streamUrl + /status fallback`,
      test: `${SHOPIFY_V2_ROUTE_PREFIX}/sizing/age-check -> /sizing/recommend -> ${SHOPIFY_LEGACY_ROUTE_PREFIX}/tryon -> returned streamUrl + /status fallback`,
      capacity: `${SHOPIFY_V2_ROUTE_PREFIX}/sizing/age-check -> /sizing/recommend -> ${SHOPIFY_LEGACY_ROUTE_PREFIX}/tryon -> returned streamUrl + /status fallback`,
      live: `${SHOPIFY_V2_ROUTE_PREFIX}/sizing/age-check -> /sizing/recommend -> ${SHOPIFY_LEGACY_ROUTE_PREFIX}/tryon -> returned streamUrl + /status fallback`,
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

export function getScenarioApiPrefix(scenarioId: CapacityScenarioId): string | null {
  if (scenarioId === "sdk-real-route-clone") return SDK_REAL_ROUTE_PREFIX;
  if (scenarioId === "shopify-real-route-clone") return `${SHOPIFY_V2_ROUTE_PREFIX} + ${SHOPIFY_LEGACY_ROUTE_PREFIX}`;
  return null;
}

export function getCapacityRouteAudit(config: CapacityRunConfig): CapacityRouteAudit {
  const target = getServerTarget(config.targetId);
  const scenario = getServerScenario(config.scenarioId);
  return {
    routeSafety: scenario.isGeminiSafe ? "health" : "capacity-clone",
    targetBaseUrl: target.baseUrl.replace(/\/+$/, ""),
    apiPrefix: getScenarioApiPrefix(config.scenarioId),
  };
}

export function assertCapacityRouteSafety(config: CapacityRunConfig): CapacityRouteAudit {
  const scenario = getServerScenario(config.scenarioId);
  const audit = getCapacityRouteAudit(config);
  if (scenario.isGeminiSafe) return audit;

  if (config.targetId !== "capacity") {
    throw new Error("Capacity stress tests are locked to the separate capacity backend clone. Staging, live, and local stress targets are blocked.");
  }

  if (!audit.targetBaseUrl.includes("capacity-be-9a7k.primestyleai.com") && !process.env.PRIMESTYLE_CAPACITY_BACKEND_URL) {
    throw new Error("Capacity backend URL must be the dedicated capacity backend clone.");
  }

  const resolvedRoute = buildScenarioUrl(config.targetId, config.scenarioId);
  const unsafePattern = UNSAFE_STRESS_HOST_PATTERNS.find((pattern) => resolvedRoute.includes(pattern));
  if (unsafePattern) {
    throw new Error(`Unsafe capacity host blocked before execution: ${unsafePattern}`);
  }

  return audit;
}
