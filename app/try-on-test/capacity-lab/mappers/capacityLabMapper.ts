import type {
  CapacityMetricsSnapshot,
  CapacityRunConfig,
  CapacityRunSnapshot,
  CapacityScenarioOption,
  CapacityTargetOption,
} from "../types";
import { DEFAULT_CAPACITY_TRY_ON_MODEL } from "../lib/config";
import { TRY_ON_MODELS, type TryOnModelId } from "../../lib/models";
import { getCapacityTryOnModelEstimate } from "../lib/modelEstimates";

const EMPTY_LATENCY = {
  avgMs: 0,
  p50Ms: 0,
  p95Ms: 0,
  p99Ms: 0,
  minMs: 0,
  maxMs: 0,
};

const DEFAULT_MODEL_ESTIMATE = getCapacityTryOnModelEstimate(DEFAULT_CAPACITY_TRY_ON_MODEL);

export function mapRunConfig(raw: Partial<CapacityRunConfig>): CapacityRunConfig {
  return {
    targetId: raw.targetId ?? "test",
    scenarioId: raw.scenarioId ?? "health",
    totalRequests: Number(raw.totalRequests) || 500,
    virtualUsers: Number(raw.virtualUsers) || 25,
    timeoutMs: Number(raw.timeoutMs) || 8000,
    tryOnModel: isTryOnModelId(raw.tryOnModel) ? raw.tryOnModel : DEFAULT_CAPACITY_TRY_ON_MODEL,
    confirmLive: Boolean(raw.confirmLive),
    confirmGemini: Boolean(raw.confirmGemini),
  };
}

export function mapRunSnapshot(raw: Partial<CapacityRunSnapshot>): CapacityRunSnapshot {
  return {
    runId: String(raw.runId ?? ""),
    status: raw.status ?? "queued",
    config: mapRunConfig(raw.config ?? {}),
    targetLabel: String(raw.targetLabel ?? "Backend"),
    endpoint: String(raw.endpoint ?? ""),
    routeSafety: raw.routeSafety === "mirror-only" ? "mirror-only" : "health",
    targetBaseUrl: String(raw.targetBaseUrl ?? ""),
    apiPrefix: typeof raw.apiPrefix === "string" ? raw.apiPrefix : null,
    startedAt: String(raw.startedAt ?? new Date().toISOString()),
    completedAt: raw.completedAt ?? null,
    elapsedMs: Number(raw.elapsedMs) || 0,
    completed: Number(raw.completed) || 0,
    total: Number(raw.total) || 0,
    inFlight: Number(raw.inFlight) || 0,
    success: Number(raw.success) || 0,
    failed: Number(raw.failed) || 0,
    timedOut: Number(raw.timedOut) || 0,
    rps: Number(raw.rps) || 0,
    latency: raw.latency ?? EMPTY_LATENCY,
    statusCounts: raw.statusCounts ?? {},
    errors: raw.errors ?? [],
    timeline: raw.timeline ?? [],
    estimate: raw.estimate ?? {
      tryOnModel: DEFAULT_CAPACITY_TRY_ON_MODEL,
      tryOnModelLabel: DEFAULT_MODEL_ESTIMATE.modelLabel,
      tokensPerTryOn: DEFAULT_MODEL_ESTIMATE.tokensPerTryOn,
      tryOnRpmLimit: DEFAULT_MODEL_ESTIMATE.rpmLimit,
      tryOnTpmLimit: DEFAULT_MODEL_ESTIMATE.tpmLimit,
      tryOnRpdLimit: DEFAULT_MODEL_ESTIMATE.rpdLimit,
      quotaLabel: DEFAULT_MODEL_ESTIMATE.quotaLabel,
      estimatedTryOnCalls: 0,
      estimatedSizingCalls: 0,
      estimatedTryOnTokens: 0,
      tryOnQuotaPercent: 0,
      theoreticalTryOnPerMinute: DEFAULT_MODEL_ESTIMATE.theoreticalTryOnPerMinute,
      safeTryOnPerMinute: DEFAULT_MODEL_ESTIMATE.safeTryOnPerMinute,
    },
    resultSamples: raw.resultSamples ?? [],
    liveStages: raw.liveStages ?? [],
    stageCounts: raw.stageCounts ?? {},
  };
}

export function mapMetricsSnapshot(raw: Partial<CapacityMetricsSnapshot>): CapacityMetricsSnapshot {
  return {
    targetId: raw.targetId ?? "test",
    hostLabel: String(raw.hostLabel ?? "Backend host"),
    collectedAt: String(raw.collectedAt ?? new Date().toISOString()),
    cpuPercent: typeof raw.cpuPercent === "number" ? raw.cpuPercent : null,
    loadAverage: raw.loadAverage ?? [],
    totalMemoryMb: Number(raw.totalMemoryMb) || 0,
    usedMemoryMb: Number(raw.usedMemoryMb) || 0,
    memoryPercent: Number(raw.memoryPercent) || 0,
    process: raw.process ?? null,
    database: raw.database ?? null,
    sse: raw.sse ?? null,
    testLab: raw.testLab ?? null,
    error: raw.error ?? null,
  };
}

export function getTargetById(targets: CapacityTargetOption[], id: CapacityRunConfig["targetId"]): CapacityTargetOption {
  return targets.find((target) => target.id === id) ?? targets[0]!;
}

export function getScenarioById(
  scenarios: CapacityScenarioOption[],
  id: CapacityRunConfig["scenarioId"],
): CapacityScenarioOption {
  return scenarios.find((scenario) => scenario.id === id) ?? scenarios[0]!;
}

function isTryOnModelId(value: unknown): value is TryOnModelId {
  return typeof value === "string" && TRY_ON_MODELS.some((model) => model.id === value);
}
