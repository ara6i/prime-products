import { performance } from "node:perf_hooks";
import type {
  CapacityLatencyStats,
  CapacityLiveStage,
  CapacityResultSample,
  CapacityResultStageSample,
  CapacityRunConfig,
  CapacityRunSnapshot,
  CapacityRunStatus,
  CapacityTimelinePoint,
} from "@/app/try-on-test/capacity-lab/types";
import { TRY_ON_MODELS, type TryOnModelId } from "@/app/try-on-test/lib/models";
import { getCapacityTryOnModelEstimate } from "@/app/try-on-test/capacity-lab/lib/modelEstimates";
import { assertCapacityRouteSafety, buildScenarioUrl, getCapacityRouteAudit, getServerScenario, getServerTarget } from "./capacityTargets";
import { executeGeminiScenario } from "./geminiScenarioRunner";

interface MutableCapacityRun extends CapacityRunSnapshot {
  startedAtMs: number;
  latencies: number[];
  lastTimelineAtMs: number;
  nextRequestIndex: number;
  abortControllers: Set<AbortController>;
  liveStageMap: Map<number, MutableLiveStage>;
}

interface MutableLiveStage extends CapacityLiveStage {
  startedAtMs: number;
}

interface GlobalRunStore {
  runs: Map<string, MutableCapacityRun>;
}

const globalForRuns = globalThis as typeof globalThis & { __primeStyleCapacityLab?: GlobalRunStore };
const store = globalForRuns.__primeStyleCapacityLab ?? { runs: new Map<string, MutableCapacityRun>() };
globalForRuns.__primeStyleCapacityLab = store;

const MAX_TEST_REQUESTS = 10000;
const MAX_TEST_USERS = 1000;
const MAX_LIVE_REQUESTS = 1000;
const MAX_LIVE_USERS = 50;
const DEFAULT_CAPACITY_TRY_ON_MODEL: TryOnModelId = "gemini-2.5-flash-image";
const MAX_ERRORS = 8;
const MAX_RESULT_SAMPLES = 6;
const MAX_TIMELINE_POINTS = 90;
const RUN_TTL_MS = 60 * 60 * 1000;

export function normalizeRunConfig(raw: Partial<CapacityRunConfig>): CapacityRunConfig {
  const targetId = raw.targetId === "local" || raw.targetId === "test" || raw.targetId === "live" ? raw.targetId : "test";
  const scenarioId = isScenarioId(raw.scenarioId) ? raw.scenarioId : "health";
  const target = getServerTarget(targetId);
  const scenario = getServerScenario(scenarioId);

  const totalLimit = scenario.isGeminiSafe
    ? (target.isLive ? MAX_LIVE_REQUESTS : MAX_TEST_REQUESTS)
    : scenario.maxTotalRequests;
  const userLimit = scenario.isGeminiSafe
    ? (target.isLive ? MAX_LIVE_USERS : MAX_TEST_USERS)
    : scenario.maxVirtualUsers;
  const defaultTotal = scenario.isGeminiSafe ? 500 : Math.min(10, totalLimit);
  const defaultUsers = scenario.isGeminiSafe ? 25 : Math.min(10, userLimit);
  const totalRequests = clampInteger(raw.totalRequests, 1, totalLimit, defaultTotal);
  const virtualUsers = clampInteger(raw.virtualUsers, 1, userLimit, defaultUsers);
  const timeoutMs = scenario.isGeminiSafe
    ? clampInteger(raw.timeoutMs, 1000, 60000, 8000)
    : clampInteger(raw.timeoutMs, 30000, 180000, 120000);

  return {
    targetId,
    scenarioId,
    totalRequests,
    virtualUsers: Math.min(virtualUsers, totalRequests),
    timeoutMs,
    tryOnModel: isTryOnModelId(raw.tryOnModel) ? raw.tryOnModel : DEFAULT_CAPACITY_TRY_ON_MODEL,
    confirmLive: Boolean(raw.confirmLive),
    confirmGemini: Boolean(raw.confirmGemini),
  };
}

export function createCapacityRun(rawConfig: Partial<CapacityRunConfig>): CapacityRunSnapshot {
  cleanupOldRuns();
  assertSupportedScenario(rawConfig.scenarioId);

  const config = normalizeRunConfig(rawConfig);
  const target = getServerTarget(config.targetId);
  const scenario = getServerScenario(config.scenarioId);
  const routeAudit = assertCapacityRouteSafety(config);

  if (target.isLive && !config.confirmLive) {
    throw new Error("Live API runs require explicit confirmation.");
  }
  if (!scenario.isGeminiSafe && !config.confirmGemini) {
    throw new Error("Real Gemini runs require explicit confirmation because every request consumes quota.");
  }

  const runId = crypto.randomUUID();
  const now = new Date();
  const run: MutableCapacityRun = {
    runId,
    status: "queued",
    config,
    targetLabel: target.label,
    endpoint: `${scenario.method} ${buildScenarioUrl(config.targetId, config.scenarioId)}`,
    routeSafety: routeAudit.routeSafety,
    targetBaseUrl: routeAudit.targetBaseUrl,
    apiPrefix: routeAudit.apiPrefix,
    startedAt: now.toISOString(),
    completedAt: null,
    elapsedMs: 0,
    completed: 0,
    total: config.totalRequests,
    inFlight: 0,
    success: 0,
    failed: 0,
    timedOut: 0,
    rps: 0,
    latency: emptyLatency(),
    statusCounts: {},
    errors: [],
    timeline: [],
    estimate: estimateRun(config),
    resultSamples: [],
    liveStages: [],
    stageCounts: {},
    startedAtMs: performance.now(),
    latencies: [],
    lastTimelineAtMs: 0,
    nextRequestIndex: 0,
    abortControllers: new Set<AbortController>(),
    liveStageMap: new Map<number, MutableLiveStage>(),
  };

  store.runs.set(runId, run);
  void runCapacityCheck(run);

  return snapshotRun(run);
}

export function getCapacityRun(runId: string): CapacityRunSnapshot | null {
  const run = store.runs.get(runId);
  if (!run) return null;
  return snapshotRun(run);
}

export function cancelCapacityRun(runId: string): CapacityRunSnapshot | null {
  const run = store.runs.get(runId);
  if (!run) return null;

  if (run.status !== "queued" && run.status !== "running") {
    return snapshotRun(run);
  }

  run.status = "stopped";
  run.completedAt = new Date().toISOString();
  run.elapsedMs = performance.now() - run.startedAtMs;
  run.rps = calculateRps(run);
  addError(run, "Run cancelled by user");

  for (const controller of run.abortControllers) {
    controller.abort();
  }
  pushTimeline(run, true);

  return snapshotRun(run);
}

async function runCapacityCheck(run: MutableCapacityRun): Promise<void> {
  if (run.status === "stopped") return;
  run.status = "running";
  pushTimeline(run, true);

  const workerCount = Math.min(run.config.virtualUsers, run.config.totalRequests);
  const workers = Array.from({ length: workerCount }, () => runWorker(run));

  try {
    await Promise.all(workers);
    if (run.status === "running") finishRun(run, "completed");
  } catch (err) {
    addError(run, err instanceof Error ? err.message : "Capacity run failed");
    finishRun(run, "failed");
  }
}

async function runWorker(run: MutableCapacityRun): Promise<void> {
  while (run.status === "running") {
    const requestIndex = run.nextRequestIndex;
    if (requestIndex >= run.config.totalRequests) return;
    run.nextRequestIndex += 1;
    run.inFlight += 1;

    try {
      await executeRequest(run, requestIndex);
    } finally {
      run.inFlight = Math.max(0, run.inFlight - 1);
      clearLiveStage(run, requestIndex);
    }
  }
}

async function executeRequest(run: MutableCapacityRun, requestIndex: number): Promise<void> {
  assertCapacityRouteSafety(run.config);
  const url = buildScenarioUrl(run.config.targetId, run.config.scenarioId);
  const scenario = getServerScenario(run.config.scenarioId);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), run.config.timeoutMs);
  const startedAt = performance.now();
  run.abortControllers.add(controller);
  updateLiveStage(run, requestIndex, {
    stage: scenario.isGeminiSafe ? "http.request" : "sdk.journey.queued",
    status: "running",
  });

  try {
    if (scenario.isGeminiSafe) {
      const response = await fetch(url, {
        method: scenario.method,
        cache: "no-store",
        headers: {
          "User-Agent": "PrimeStyleAI-Capacity-Lab/1.0",
          "x-primestyle-capacity-lab": "true",
        },
        signal: controller.signal,
      });
      const responseBody = response.ok
        ? ""
        : await response.text().catch(() => "");
      if (response.ok) await response.arrayBuffer().catch(() => undefined);
      if (run.status === "stopped") return;
      if (!response.ok) addError(run, formatHttpError(url, response.status, response.statusText, responseBody));
      recordResult(run, response.status, response.ok, performance.now() - startedAt);
      return;
    }

    const result = await executeGeminiScenario(
      run.config.scenarioId,
      run.config.targetId,
      run.config.tryOnModel,
      controller.signal,
      (progress) => updateLiveStage(run, requestIndex, progress),
    );
    if (run.status === "stopped") return;
    if (!result.ok) addError(run, formatHttpError(url, result.status, "", result.body));
    recordResult(run, result.status, result.ok, performance.now() - startedAt, false, result.body);
  } catch (err) {
    const isTimeout = err instanceof Error && err.name === "AbortError";
    if (run.status === "stopped") return;
    updateLiveStage(run, requestIndex, {
      stage: isTimeout ? "request.timeout" : "request.failed",
      status: "failed",
      detail: isTimeout ? "Request timed out" : err instanceof Error ? err.message : "Request failed",
    });
    recordResult(run, 0, false, performance.now() - startedAt, isTimeout);
    addError(run, isTimeout ? "Request timed out" : err instanceof Error ? err.message : "Request failed");
  } finally {
    clearTimeout(timeoutId);
    run.abortControllers.delete(controller);
  }
}

function recordResult(
  run: MutableCapacityRun,
  status: number,
  ok: boolean,
  latencyMs: number,
  timedOut = false,
  body = "",
): void {
  run.completed += 1;
  run.latencies.push(Math.max(0, latencyMs));
  run.statusCounts[String(status)] = (run.statusCounts[String(status)] ?? 0) + 1;
  if (ok) run.success += 1;
  else run.failed += 1;
  if (timedOut) run.timedOut += 1;
  if (body) addResultSample(run, status, latencyMs, body);
  run.latency = calculateLatency(run.latencies);
  run.elapsedMs = performance.now() - run.startedAtMs;
  run.rps = calculateRps(run);
  pushTimeline(run, false);
}

function finishRun(run: MutableCapacityRun, status: CapacityRunStatus): void {
  run.status = status;
  run.completedAt = new Date().toISOString();
  run.elapsedMs = performance.now() - run.startedAtMs;
  run.rps = calculateRps(run);
  run.latency = calculateLatency(run.latencies);
  pushTimeline(run, true);
}

function snapshotRun(run: MutableCapacityRun): CapacityRunSnapshot {
  run.elapsedMs = performance.now() - run.startedAtMs;
  run.rps = calculateRps(run);
  run.latency = calculateLatency(run.latencies);
  return {
    runId: run.runId,
    status: run.status,
    config: run.config,
    targetLabel: run.targetLabel,
    endpoint: run.endpoint,
    routeSafety: run.routeSafety,
    targetBaseUrl: run.targetBaseUrl,
    apiPrefix: run.apiPrefix,
    startedAt: run.startedAt,
    completedAt: run.completedAt,
    elapsedMs: run.elapsedMs,
    completed: run.completed,
    total: run.total,
    inFlight: run.inFlight,
    success: run.success,
    failed: run.failed,
    timedOut: run.timedOut,
    rps: run.rps,
    latency: run.latency,
    statusCounts: run.statusCounts,
    errors: run.errors,
    timeline: run.timeline,
    estimate: run.estimate,
    resultSamples: run.resultSamples,
    liveStages: Array.from(run.liveStageMap.values())
      .map(stripMutableLiveStage)
      .sort((left, right) => right.elapsedMs - left.elapsedMs)
      .slice(0, 24),
    stageCounts: run.stageCounts,
  };
}

function updateLiveStage(
  run: MutableCapacityRun,
  requestIndex: number,
  patch: Partial<Omit<CapacityLiveStage, "requestIndex" | "startedAt" | "updatedAt" | "elapsedMs">>,
): void {
  const now = new Date();
  const existing = run.liveStageMap.get(requestIndex);
  const startedAtMs = existing?.startedAtMs ?? performance.now();
  const next: MutableLiveStage = {
    requestIndex,
    stage: patch.stage ?? existing?.stage ?? "queued",
    status: patch.status ?? existing?.status ?? "running",
    startedAt: existing?.startedAt ?? now.toISOString(),
    updatedAt: now.toISOString(),
    elapsedMs: performance.now() - startedAtMs,
    jobId: patch.jobId !== undefined ? patch.jobId : existing?.jobId ?? null,
    recommendedSize: patch.recommendedSize !== undefined ? patch.recommendedSize : existing?.recommendedSize ?? null,
    backendStage: patch.backendStage !== undefined ? patch.backendStage : existing?.backendStage ?? null,
    pollCount: patch.pollCount !== undefined ? patch.pollCount : existing?.pollCount ?? 0,
    detail: patch.detail !== undefined ? patch.detail : existing?.detail ?? null,
    startedAtMs,
  };

  run.liveStageMap.set(requestIndex, next);
  rebuildStageCounts(run);
}

function clearLiveStage(run: MutableCapacityRun, requestIndex: number): void {
  run.liveStageMap.delete(requestIndex);
  rebuildStageCounts(run);
}

function rebuildStageCounts(run: MutableCapacityRun): void {
  const counts: Record<string, number> = {};
  for (const stage of run.liveStageMap.values()) {
    const key = stage.backendStage ? `${stage.stage} -> ${stage.backendStage}` : stage.stage;
    counts[key] = (counts[key] ?? 0) + 1;
  }
  run.stageCounts = counts;
}

function stripMutableLiveStage(stage: MutableLiveStage): CapacityLiveStage {
  return {
    requestIndex: stage.requestIndex,
    stage: stage.stage,
    status: stage.status,
    startedAt: stage.startedAt,
    updatedAt: stage.updatedAt,
    elapsedMs: stage.elapsedMs,
    jobId: stage.jobId,
    recommendedSize: stage.recommendedSize,
    backendStage: stage.backendStage,
    pollCount: stage.pollCount,
    detail: stage.detail,
  };
}

function addResultSample(run: MutableCapacityRun, status: number, latencyMs: number, body: string): void {
  const sample = parseResultSample(run.config.scenarioId, getCapacityRouteAudit(run.config), status, latencyMs, body);
  if (!sample) return;
  run.resultSamples = [...run.resultSamples, sample].slice(-MAX_RESULT_SAMPLES);
}

function parseResultSample(
  scenarioId: CapacityRunConfig["scenarioId"],
  routeAudit: ReturnType<typeof getCapacityRouteAudit>,
  status: number,
  latencyMs: number,
  body: string,
): CapacityResultSample | null {
  const raw = parseJson(body);
  if (!raw || typeof raw !== "object") return null;

  const root = raw as Record<string, unknown>;
  const result = root.result && typeof root.result === "object" && !Array.isArray(root.result)
    ? root.result as Record<string, unknown>
    : root;
  const stages = Array.isArray(root.stages) ? root.stages : [];
  const sdkStageSamples = stages
    .filter((stage): stage is Record<string, unknown> => Boolean(stage) && typeof stage === "object" && !Array.isArray(stage))
    .map(mapStageSample)
    .slice(-10);

  const backendStageSamples = extractBackendStageSamples(result);
  const stageSamples = [...sdkStageSamples, ...backendStageSamples].slice(-24);

  const recommendedSize = getString(result, "recommendedSize") ?? getString(root, "recommendedSize");
  const tryOnModel = getString(result, "tryOnModel") ?? getString(root, "tryOnModel");
  const jobId = getString(result, "jobId") ?? getString(root, "jobId");
  const imageUrl = getString(result, "imageUrl") ?? getString(root, "imageUrl");
  const message = getString(result, "message") ?? getString(root, "message");

  if (!recommendedSize && !jobId && !imageUrl && !message && !stageSamples.length) return null;

  return {
    id: crypto.randomUUID(),
    capturedAt: new Date().toISOString(),
    scenarioId,
    routeSafety: routeAudit.routeSafety,
    targetBaseUrl: routeAudit.targetBaseUrl,
    apiPrefix: routeAudit.apiPrefix,
    status,
    latencyMs,
    tryOnModel,
    recommendedSize,
    jobId,
    imageUrl,
    message,
    stages: stageSamples,
  };
}

function mapStageSample(stage: Record<string, unknown>): CapacityResultStageSample {
  return {
    name: getString(stage, "name") ?? "stage",
    status: Number(stage.status) || 0,
    ok: Boolean(stage.ok),
    latencyMs: Number(stage.latencyMs) || 0,
    detail: getString(stage, "detail"),
  };
}

function extractBackendStageSamples(result: Record<string, unknown>): CapacityResultStageSample[] {
  const debugTiming = result.debugTiming;
  if (!debugTiming || typeof debugTiming !== "object" || Array.isArray(debugTiming)) return [];

  const stages = (debugTiming as Record<string, unknown>).stages;
  if (!Array.isArray(stages)) return [];

  return stages
    .filter((stage): stage is Record<string, unknown> => Boolean(stage) && typeof stage === "object" && !Array.isArray(stage))
    .map((stage) => {
      const name = getString(stage, "name") ?? "stage";
      const detail = stage.detail && typeof stage.detail === "object" && !Array.isArray(stage.detail)
        ? summarizeDebugDetail(stage.detail as Record<string, unknown>)
        : null;

      return {
        name: `backend.${name}`,
        status: 200,
        ok: true,
        latencyMs: Number(stage.durationMs) || 0,
        detail,
      };
    })
    .slice(-14);
}

function summarizeDebugDetail(detail: Record<string, unknown>): string | null {
  const parts = Object.entries(detail)
    .map(([key, value]) => {
      if (value === null || value === undefined) return null;
      if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
        return `${key}=${value}`;
      }
      return `${key}=${JSON.stringify(value).slice(0, 80)}`;
    })
    .filter(Boolean);

  return parts.length ? parts.join(", ").slice(0, 220) : null;
}

function pushTimeline(run: MutableCapacityRun, force: boolean): void {
  const now = performance.now();
  if (!force && now - run.lastTimelineAtMs < 1000) return;

  const point: CapacityTimelinePoint = {
    elapsedMs: now - run.startedAtMs,
    completed: run.completed,
    success: run.success,
    failed: run.failed,
    rps: calculateRps(run),
    p95Ms: run.latency.p95Ms,
  };

  run.timeline = [...run.timeline.slice(-(MAX_TIMELINE_POINTS - 1)), point];
  run.lastTimelineAtMs = now;
}

function calculateLatency(values: number[]): CapacityLatencyStats {
  if (values.length === 0) return emptyLatency();
  const sorted = [...values].sort((a, b) => a - b);
  const sum = sorted.reduce((total, value) => total + value, 0);
  return {
    avgMs: sum / sorted.length,
    p50Ms: percentile(sorted, 50),
    p95Ms: percentile(sorted, 95),
    p99Ms: percentile(sorted, 99),
    minMs: sorted[0] ?? 0,
    maxMs: sorted.at(-1) ?? 0,
  };
}

function percentile(sortedValues: number[], percentileValue: number): number {
  if (sortedValues.length === 0) return 0;
  const index = Math.min(sortedValues.length - 1, Math.ceil((percentileValue / 100) * sortedValues.length) - 1);
  return sortedValues[index] ?? 0;
}

function calculateRps(run: MutableCapacityRun): number {
  const elapsedSeconds = Math.max((performance.now() - run.startedAtMs) / 1000, 0.001);
  return run.completed / elapsedSeconds;
}

function addError(run: MutableCapacityRun, message: string): void {
  if (run.errors.includes(message)) return;
  run.errors = [...run.errors, message].slice(-MAX_ERRORS);
}

function formatHttpError(url: string, status: number, statusText: string, body: string): string {
  const statusLabel = statusText ? ` ${statusText}` : "";
  const snippet = toErrorSnippet(body);
  return snippet
    ? `HTTP ${status}${statusLabel} from ${url}: ${snippet}`
    : `HTTP ${status}${statusLabel} from ${url}`;
}

function toErrorSnippet(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 220);
}

function parseJson(value: string): unknown {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
}

function getString(value: Record<string, unknown>, key: string): string | null {
  const raw = value[key];
  return typeof raw === "string" && raw.trim() ? raw.trim() : null;
}

function emptyLatency(): CapacityLatencyStats {
  return { avgMs: 0, p50Ms: 0, p95Ms: 0, p99Ms: 0, minMs: 0, maxMs: 0 };
}

function estimateRun(config: CapacityRunConfig) {
  const scenario = getServerScenario(config.scenarioId);
  const modelEstimate = getCapacityTryOnModelEstimate(config.tryOnModel);
  const estimatedTryOnCalls = config.totalRequests * scenario.estimatedTryOnCallsPerRequest;
  const estimatedSizingCalls = config.totalRequests * scenario.estimatedSizingCallsPerRequest;
  const estimatedTryOnTokens = estimatedTryOnCalls * modelEstimate.tokensPerTryOn;
  return {
    tryOnModel: modelEstimate.modelId,
    tryOnModelLabel: modelEstimate.modelLabel,
    tokensPerTryOn: modelEstimate.tokensPerTryOn,
    tryOnRpmLimit: modelEstimate.rpmLimit,
    tryOnTpmLimit: modelEstimate.tpmLimit,
    tryOnRpdLimit: modelEstimate.rpdLimit,
    quotaLabel: modelEstimate.quotaLabel,
    estimatedTryOnCalls,
    estimatedSizingCalls,
    estimatedTryOnTokens,
    tryOnQuotaPercent: estimatedTryOnCalls > 0 && modelEstimate.rpdLimit > 0
      ? Math.round((estimatedTryOnCalls / modelEstimate.rpdLimit) * 1000) / 10
      : 0,
    theoreticalTryOnPerMinute: modelEstimate.theoreticalTryOnPerMinute,
    safeTryOnPerMinute: modelEstimate.safeTryOnPerMinute,
  };
}

function isScenarioId(value: unknown): value is CapacityRunConfig["scenarioId"] {
  return (
    value === "health" ||
    value === "sdk-mirror-sse-real" ||
    value === "sdk-journey-job-stream-real" ||
    value === "shopify-mirror-sse-real" ||
    value === "shopify-mirror-job-stream-real"
  );
}

function assertSupportedScenario(value: unknown): void {
  if (value === undefined || value === null || value === "") return;
  if (isScenarioId(value)) return;
  throw new Error("Unsupported or unsafe capacity scenario. Stress tests are mirror-only and cannot call real SDK or Shopify backend routes.");
}

function isTryOnModelId(value: unknown): value is TryOnModelId {
  return typeof value === "string" && TRY_ON_MODELS.some((model) => model.id === value);
}

function clampInteger(value: unknown, min: number, max: number, fallback: number): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function cleanupOldRuns(): void {
  const now = performance.now();
  for (const [runId, run] of store.runs.entries()) {
    if (now - run.startedAtMs > RUN_TTL_MS) store.runs.delete(runId);
  }
}
