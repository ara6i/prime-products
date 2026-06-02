import { execFile } from "node:child_process";
import os from "node:os";
import { promisify } from "node:util";
import type {
  CapacityDatabaseMetrics,
  CapacityMetricsSnapshot,
  CapacitySseMetrics,
  CapacityTestLabMetrics,
  CapacityTargetId,
} from "@/app/try-on-test/capacity-lab/types";
import { getServerTarget } from "./capacityTargets";

const execFileAsync = promisify(execFile);
const DROPLET_HOST = process.env.CAPACITY_LAB_DROPLET_HOST ?? "root@167.99.252.27";

interface RawHostMetrics {
  hostLabel?: string;
  cpuPercent?: number | null;
  loadAverage?: number[];
  totalMemoryMb?: number;
  usedMemoryMb?: number;
  memoryPercent?: number;
  process?: CapacityMetricsSnapshot["process"];
}

interface RawBackendHealth {
  mongodb?: {
    connected?: boolean;
    readyState?: string;
    host?: string;
    name?: string;
    pool?: {
      configured?: {
        maxPoolSize?: number;
        minPoolSize?: number;
      };
      current?: {
        totalConnections?: number;
        availableConnections?: number;
        activeConnections?: number;
        waitingRequests?: number;
      };
      utilization?: {
        percent?: number;
        status?: string;
      };
      health?: {
        isHealthy?: boolean;
        needsAttention?: boolean;
        needsImmediateAction?: boolean;
      };
      warnings?: unknown[];
    };
  };
  sse?: {
    activeConnections?: number;
    breakdown?: Record<string, unknown>;
  };
}

interface BackendHealthMetrics {
  database: CapacityDatabaseMetrics | null;
  sse: CapacitySseMetrics | null;
  testLab: CapacityTestLabMetrics | null;
}

export async function readHostMetrics(targetId: CapacityTargetId): Promise<CapacityMetricsSnapshot> {
  const target = getServerTarget(targetId);
  let raw: RawHostMetrics;
  let hostError: string | null = null;

  try {
    raw = target.metricsMode === "droplet"
      ? await readDropletMetrics(target.pm2Name)
      : readLocalMetrics();
  } catch (err) {
    raw = target.metricsMode === "droplet" ? { hostLabel: "Droplet metrics unavailable" } : readLocalMetrics();
    hostError = formatMetricsError(err);
  }

  const health = await readBackendHealth(targetId).catch((err: unknown): BackendHealthMetrics => ({
    database: {
      connected: false,
      readyState: "unknown",
      host: "",
      name: "",
      pool: null,
      error: formatHealthError(err),
    },
    sse: null,
    testLab: null,
  }));

  return normalizeMetrics(targetId, raw, hostError, health);
}

function readLocalMetrics(): RawHostMetrics {
  const totalMemoryMb = bytesToMb(os.totalmem());
  const freeMemoryMb = bytesToMb(os.freemem());
  const usedMemoryMb = Math.max(0, totalMemoryMb - freeMemoryMb);
  const loadAverage = os.loadavg();
  const cpuPercent = loadToCpuPercent(loadAverage[0] ?? 0, os.cpus().length);

  return {
    hostLabel: `${os.hostname()} - local machine`,
    cpuPercent,
    loadAverage,
    totalMemoryMb,
    usedMemoryMb,
    memoryPercent: percent(usedMemoryMb, totalMemoryMb),
    process: null,
  };
}

async function readDropletMetrics(pm2Name: string | null): Promise<RawHostMetrics> {
  const script = buildRemoteMetricsScript(pm2Name);
  if (DROPLET_HOST === "local") {
    const { stdout } = await execFileAsync(
      "node",
      ["-e", script],
      { timeout: 7000, maxBuffer: 1024 * 1024 },
    );
    return JSON.parse(stdout.trim()) as RawHostMetrics;
  }

  const { stdout } = await execFileAsync(
    "ssh",
    ["-o", "BatchMode=yes", "-o", "ConnectTimeout=4", DROPLET_HOST, `node -e ${JSON.stringify(script)}`],
    { timeout: 7000, maxBuffer: 1024 * 1024 },
  );

  return JSON.parse(stdout.trim()) as RawHostMetrics;
}

async function readBackendHealth(targetId: CapacityTargetId): Promise<BackendHealthMetrics> {
  const target = getServerTarget(targetId);
  const primaryPath = targetId === "local" ? "/api/health" : "/health";
  const fallbackPath = targetId === "local" ? "/health" : "/api/health";
  const raw = await fetchHealthJson(new URL(primaryPath, target.baseUrl).toString()).catch(() =>
    fetchHealthJson(new URL(fallbackPath, target.baseUrl).toString()),
  );

  return {
    database: normalizeDatabaseHealth(raw),
    sse: normalizeSseHealth(raw),
    testLab: await readTestLabMetrics(targetId),
  };
}

async function fetchHealthJson(url: string): Promise<RawBackendHealth> {
  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  });

  if (!response.ok) {
    throw new Error(`Health endpoint returned ${response.status}.`);
  }

  return await response.json() as RawBackendHealth;
}

async function readTestLabMetrics(targetId: CapacityTargetId): Promise<CapacityTestLabMetrics | null> {
  if (targetId !== "test") return null;
  const key = getOptionalCapacityApiKey(targetId);
  if (!key) return null;

  const target = getServerTarget(targetId);
  const response = await fetch(new URL("/api/test-lab/sdk-mirror/metrics", target.baseUrl).toString(), {
    cache: "no-store",
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${key}`,
      "User-Agent": "PrimeStyleAI-Capacity-Lab/1.0",
      "x-primestyle-capacity-lab": "true",
    },
    signal: AbortSignal.timeout(5000),
  }).catch(() => null);
  if (!response?.ok) return null;
  const raw = await response.json().catch(() => null);
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const queue = value.queue && typeof value.queue === "object" ? value.queue as Record<string, unknown> : {};
  const sse = value.sse && typeof value.sse === "object" ? value.sse as Record<string, unknown> : {};
  return {
    queue: {
      name: String(queue.name ?? "test-lab-tryon"),
      counts: normalizeCounts(queue.counts),
    },
    workers: Array.isArray(value.workers) ? value.workers.map(normalizeWorkerMetric).filter(Boolean) as CapacityTestLabMetrics["workers"] : [],
    sse: {
      activeGlobalStreams: Number(sse.activeGlobalStreams) || 0,
      activeJobStreams: Number(sse.activeJobStreams) || 0,
      activeStreams: Number(sse.activeStreams) || 0,
    },
    timestamp: String(value.timestamp ?? new Date().toISOString()),
  };
}

function normalizeCounts(raw: unknown): Record<string, number> {
  if (!raw || typeof raw !== "object") return {};
  return Object.fromEntries(Object.entries(raw as Record<string, unknown>).map(([key, value]) => [key, Number(value) || 0]));
}

function normalizeWorkerMetric(raw: unknown): CapacityTestLabMetrics["workers"][number] | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  return {
    workerId: String(value.workerId ?? "unknown"),
    pid: Number(value.pid) || 0,
    host: String(value.host ?? ""),
    concurrency: Number(value.concurrency) || 0,
    activeJobs: Number(value.activeJobs) || 0,
    completedJobs: Number(value.completedJobs) || 0,
    failedJobs: Number(value.failedJobs) || 0,
    rssMb: Number(value.rssMb) || 0,
    heapUsedMb: Number(value.heapUsedMb) || 0,
    cpuPercent: Number(value.cpuPercent) || 0,
    uptimeSec: Number(value.uptimeSec) || 0,
    updatedAt: String(value.updatedAt ?? ""),
  };
}

function getOptionalCapacityApiKey(targetId: CapacityTargetId): string | null {
  const key = process.env[`PRIMESTYLE_CAPACITY_LAB_API_KEY_${targetId.toUpperCase()}`]
    || process.env.PRIMESTYLE_CAPACITY_LAB_API_KEY;
  return key?.trim() || null;
}

function buildRemoteMetricsScript(pm2Name: string | null): string {
  return [
    "const os=require(\"os\")",
    "const {execSync}=require(\"child_process\")",
    `const targetName=${JSON.stringify(pm2Name)}`,
    "const bytesToMb=(value)=>Math.round((value/1024/1024)*10)/10",
    "const percent=(part,total)=>total>0?Math.round((part/total)*1000)/10:0",
    "const totalMemoryMb=bytesToMb(os.totalmem())",
    "const usedMemoryMb=Math.max(0,totalMemoryMb-bytesToMb(os.freemem()))",
    "let processInfo=null",
    "try{const list=JSON.parse(execSync(\"pm2 jlist\",{encoding:\"utf8\",stdio:[\"ignore\",\"pipe\",\"ignore\"]}));const item=targetName?list.find((entry)=>entry.name===targetName):null;if(item){const rssMb=bytesToMb(Number(item.monit&&item.monit.memory)||0);processInfo={name:item.name,pid:Number(item.pid)||null,status:item.pm2_env&&item.pm2_env.status?item.pm2_env.status:\"unknown\",cpuPercent:Number(item.monit&&item.monit.cpu)||0,memoryPercent:percent(rssMb,totalMemoryMb),rssMb};}}catch(error){}",
    "const loadAverage=os.loadavg()",
    "const cpuPercent=Math.min(100,Math.round(((loadAverage[0]||0)/Math.max(1,os.cpus().length))*1000)/10)",
    "console.log(JSON.stringify({hostLabel:os.hostname()+\" - droplet\",cpuPercent,loadAverage,totalMemoryMb,usedMemoryMb,memoryPercent:percent(usedMemoryMb,totalMemoryMb),process:processInfo}))",
  ].join(";");
}

function formatMetricsError(err: unknown): string {
  if (!(err instanceof Error)) return "Unable to read host metrics.";
  if (err.message.includes("timed out")) return "Droplet metrics SSH request timed out.";
  if (err.message.includes("Permission denied")) return "Droplet metrics SSH key was rejected.";
  return "Unable to read droplet metrics over SSH.";
}

function formatHealthError(err: unknown): string {
  if (!(err instanceof Error)) return "Unable to read backend health.";
  if (err.name === "TimeoutError" || err.message.includes("timed out")) return "Backend health request timed out.";
  if (err.message.includes("fetch failed")) return "Backend health endpoint is unreachable.";
  return err.message || "Unable to read backend health.";
}

function normalizeMetrics(
  targetId: CapacityTargetId,
  raw: RawHostMetrics,
  error: string | null,
  health: BackendHealthMetrics,
): CapacityMetricsSnapshot {
  const totalMemoryMb = Number(raw.totalMemoryMb) || 0;
  const usedMemoryMb = Number(raw.usedMemoryMb) || 0;

  return {
    targetId,
    hostLabel: raw.hostLabel ?? "Backend host",
    collectedAt: new Date().toISOString(),
    cpuPercent: typeof raw.cpuPercent === "number" ? raw.cpuPercent : null,
    loadAverage: Array.isArray(raw.loadAverage) ? raw.loadAverage.map((item) => Number(item) || 0) : [],
    totalMemoryMb,
    usedMemoryMb,
    memoryPercent: Number(raw.memoryPercent) || percent(usedMemoryMb, totalMemoryMb),
    process: raw.process ?? null,
    database: health.database,
    sse: health.sse,
    testLab: health.testLab,
    error,
  };
}

function normalizeDatabaseHealth(raw: RawBackendHealth): CapacityDatabaseMetrics | null {
  const mongodb = raw.mongodb;
  if (!mongodb) return null;

  const pool = mongodb.pool
    ? {
      configured: {
        maxPoolSize: Number(mongodb.pool.configured?.maxPoolSize) || 0,
        minPoolSize: Number(mongodb.pool.configured?.minPoolSize) || 0,
      },
      current: {
        totalConnections: Number(mongodb.pool.current?.totalConnections) || 0,
        availableConnections: Number(mongodb.pool.current?.availableConnections) || 0,
        activeConnections: Number(mongodb.pool.current?.activeConnections) || 0,
        waitingRequests: Number(mongodb.pool.current?.waitingRequests) || 0,
      },
      utilization: {
        percent: Number(mongodb.pool.utilization?.percent) || 0,
        status: String(mongodb.pool.utilization?.status ?? "unknown"),
      },
      health: {
        isHealthy: Boolean(mongodb.pool.health?.isHealthy),
        needsAttention: Boolean(mongodb.pool.health?.needsAttention),
        needsImmediateAction: Boolean(mongodb.pool.health?.needsImmediateAction),
      },
      warnings: Array.isArray(mongodb.pool.warnings) ? mongodb.pool.warnings.map(String) : [],
    }
    : null;

  return {
    connected: Boolean(mongodb.connected),
    readyState: String(mongodb.readyState ?? "unknown"),
    host: String(mongodb.host ?? ""),
    name: String(mongodb.name ?? ""),
    pool,
    error: null,
  };
}

function normalizeSseHealth(raw: RawBackendHealth): CapacitySseMetrics | null {
  const sse = raw.sse;
  if (!sse) return null;

  return {
    activeConnections: Number(sse.activeConnections) || 0,
    breakdown: normalizeSseBreakdown(sse.breakdown),
  };
}

function normalizeSseBreakdown(raw: Record<string, unknown> | undefined): Record<string, number> {
  if (!raw) return {};

  return Object.fromEntries(
    Object.entries(raw).map(([key, value]) => [key, Number(value) || 0]),
  );
}

function loadToCpuPercent(load: number, cpuCount: number): number {
  return Math.min(100, Math.round((load / Math.max(1, cpuCount)) * 1000) / 10);
}

function bytesToMb(value: number): number {
  return Math.round((value / 1024 / 1024) * 10) / 10;
}

function percent(part: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((part / total) * 1000) / 10;
}
