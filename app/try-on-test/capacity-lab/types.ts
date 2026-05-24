import type { TryOnModelId } from "../lib/models";

export type CapacityTargetId = "local" | "test" | "live";
export type CapacityScenarioId =
  | "health"
  | "sdk-mirror-sse-real"
  | "sdk-journey-job-stream-real"
  | "shopify-mirror-sse-real"
  | "shopify-mirror-job-stream-real";
export type CapacityRouteSafety = "health" | "mirror-only";
export type CapacityRunStatus = "queued" | "running" | "completed" | "failed" | "stopped";

export interface CapacityTargetOption {
  id: CapacityTargetId;
  label: string;
  description: string;
  baseUrl: string;
  isLive: boolean;
}

export interface CapacityScenarioOption {
  id: CapacityScenarioId;
  label: string;
  description: string;
  method: "GET" | "POST";
  path: string;
  isGeminiSafe: boolean;
  helper: string;
  maxTotalRequests: number;
  maxVirtualUsers: number;
  estimatedTryOnCallsPerRequest: number;
  estimatedSizingCallsPerRequest: number;
}

export interface CapacityRunConfig {
  targetId: CapacityTargetId;
  scenarioId: CapacityScenarioId;
  totalRequests: number;
  virtualUsers: number;
  timeoutMs: number;
  tryOnModel: TryOnModelId;
  confirmLive: boolean;
  confirmGemini: boolean;
}

export interface CapacityLatencyStats {
  avgMs: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  minMs: number;
  maxMs: number;
}

export interface CapacityTimelinePoint {
  elapsedMs: number;
  completed: number;
  success: number;
  failed: number;
  rps: number;
  p95Ms: number;
}

export interface CapacityRunEstimate {
  tryOnModel: string;
  tryOnModelLabel: string;
  tokensPerTryOn: number;
  tryOnRpmLimit: number;
  tryOnTpmLimit: number;
  tryOnRpdLimit: number;
  quotaLabel: string;
  estimatedTryOnCalls: number;
  estimatedSizingCalls: number;
  estimatedTryOnTokens: number;
  tryOnQuotaPercent: number;
  theoreticalTryOnPerMinute: number;
  safeTryOnPerMinute: number;
}

export interface CapacityResultStageSample {
  name: string;
  status: number;
  ok: boolean;
  latencyMs: number;
  detail: string | null;
}

export interface CapacityResultSample {
  id: string;
  capturedAt: string;
  scenarioId: CapacityScenarioId;
  routeSafety: CapacityRouteSafety;
  targetBaseUrl: string;
  apiPrefix: string | null;
  status: number;
  latencyMs: number;
  tryOnModel: string | null;
  recommendedSize: string | null;
  jobId: string | null;
  imageUrl: string | null;
  message: string | null;
  stages: CapacityResultStageSample[];
}

export interface CapacityLiveStage {
  requestIndex: number;
  stage: string;
  status: "running" | "completed" | "failed";
  startedAt: string;
  updatedAt: string;
  elapsedMs: number;
  jobId: string | null;
  recommendedSize: string | null;
  backendStage: string | null;
  pollCount: number;
  detail: string | null;
}

export interface CapacityRunSnapshot {
  runId: string;
  status: CapacityRunStatus;
  config: CapacityRunConfig;
  targetLabel: string;
  endpoint: string;
  routeSafety: CapacityRouteSafety;
  targetBaseUrl: string;
  apiPrefix: string | null;
  startedAt: string;
  completedAt: string | null;
  elapsedMs: number;
  completed: number;
  total: number;
  inFlight: number;
  success: number;
  failed: number;
  timedOut: number;
  rps: number;
  latency: CapacityLatencyStats;
  statusCounts: Record<string, number>;
  errors: string[];
  timeline: CapacityTimelinePoint[];
  estimate: CapacityRunEstimate;
  resultSamples: CapacityResultSample[];
  liveStages: CapacityLiveStage[];
  stageCounts: Record<string, number>;
}

export interface CapacityProcessMetrics {
  name: string;
  pid: number | null;
  status: string;
  cpuPercent: number;
  memoryPercent: number;
  rssMb: number;
}

export interface CapacityMongoPoolMetrics {
  configured: {
    maxPoolSize: number;
    minPoolSize: number;
  };
  current: {
    totalConnections: number;
    availableConnections: number;
    activeConnections: number;
    waitingRequests: number;
  };
  utilization: {
    percent: number;
    status: string;
  };
  health: {
    isHealthy: boolean;
    needsAttention: boolean;
    needsImmediateAction: boolean;
  };
  warnings: string[];
}

export interface CapacityDatabaseMetrics {
  connected: boolean;
  readyState: string;
  host: string;
  name: string;
  pool: CapacityMongoPoolMetrics | null;
  error: string | null;
}

export interface CapacitySseMetrics {
  activeConnections: number;
  breakdown: Record<string, number>;
}

export interface CapacityTestLabWorkerMetrics {
  workerId: string;
  pid: number;
  host: string;
  concurrency: number;
  activeJobs: number;
  completedJobs: number;
  failedJobs: number;
  rssMb: number;
  heapUsedMb: number;
  cpuPercent: number;
  uptimeSec: number;
  updatedAt: string;
}

export interface CapacityTestLabMetrics {
  queue: {
    name: string;
    counts: Record<string, number>;
  };
  workers: CapacityTestLabWorkerMetrics[];
  sse: {
    activeGlobalStreams: number;
    activeJobStreams: number;
    activeStreams: number;
  };
  timestamp: string;
}

export interface CapacityMetricsSnapshot {
  targetId: CapacityTargetId;
  hostLabel: string;
  collectedAt: string;
  cpuPercent: number | null;
  loadAverage: number[];
  totalMemoryMb: number;
  usedMemoryMb: number;
  memoryPercent: number;
  process: CapacityProcessMetrics | null;
  database: CapacityDatabaseMetrics | null;
  sse: CapacitySseMetrics | null;
  testLab: CapacityTestLabMetrics | null;
  error: string | null;
}

export interface CapacityStartRunResponse {
  runId: string;
  snapshot: CapacityRunSnapshot;
}
