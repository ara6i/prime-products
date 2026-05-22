import { Button } from "@/app/shared/components/ui/button";
import { CapacityStatCard } from "./CapacityStatCard";
import { formatMemory, formatPercent } from "../lib/formatters";
import type { CapacityDatabaseMetrics, CapacityMetricsSnapshot } from "../types";

interface HostMetricsPanelProps {
  metrics: CapacityMetricsSnapshot | null;
  isLoading: boolean;
  onRefresh: () => void;
}

export function HostMetricsPanel({ metrics, isLoading, onRefresh }: HostMetricsPanelProps) {
  const database = metrics?.database ?? null;
  const pool = database?.pool ?? null;
  const sse = metrics?.sse ?? null;

  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-blue">Host analytics</p>
          <h2 className="mt-1 text-xl font-semibold text-text-primary">Realtime backend resources</h2>
          <p className="mt-1 text-sm text-text-secondary">
            CPU, RAM, PM2, MongoDB pool pressure, and active SSE connections while capacity checks run.
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onRefresh} disabled={isLoading} className="px-4 text-xs">
          {isLoading ? "Refreshing..." : "Refresh"}
        </Button>
      </div>

      {metrics?.error && (
        <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {metrics.error}
        </p>
      )}

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <CapacityStatCard label="CPU" value={formatPercent(metrics?.cpuPercent ?? null)} helper={metrics?.hostLabel ?? "Waiting"} tone="blue" />
        <CapacityStatCard
          label="Memory"
          value={formatPercent(metrics?.memoryPercent ?? null)}
          helper={metrics ? `${formatMemory(metrics.usedMemoryMb)} of ${formatMemory(metrics.totalMemoryMb)}` : "Waiting"}
          tone="neutral"
        />
        <CapacityStatCard
          label="Load avg"
          value={metrics?.loadAverage?.[0]?.toFixed(2) ?? "n/a"}
          helper={metrics?.loadAverage?.length ? metrics.loadAverage.map((item) => item.toFixed(2)).join(" / ") : "1m / 5m / 15m"}
          tone="neutral"
        />
        <CapacityStatCard
          label="Backend RSS"
          value={metrics?.process ? formatMemory(metrics.process.rssMb) : "n/a"}
          helper={metrics?.process ? `${metrics.process.name} · ${metrics.process.status}` : "PM2 process not found"}
          tone="green"
        />
      </div>

      {metrics?.process && (
        <div className="mt-4 grid grid-cols-1 gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 text-sm sm:grid-cols-4">
          <MetricLine label="PID" value={metrics.process.pid ? String(metrics.process.pid) : "n/a"} />
          <MetricLine label="Process CPU" value={formatPercent(metrics.process.cpuPercent)} />
          <MetricLine label="Process memory" value={formatPercent(metrics.process.memoryPercent)} />
          <MetricLine label="Collected" value={new Date(metrics.collectedAt).toLocaleTimeString()} />
        </div>
      )}

      <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-blue">MongoDB health</p>
            <h3 className="mt-1 text-base font-semibold text-text-primary">Connection pool and request pressure</h3>
          </div>
          <p className="text-xs font-medium text-text-secondary">
            {database?.name ? `Database: ${database.name}` : "Waiting for backend health"}
          </p>
        </div>

        {database?.error && (
          <p className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {database.error}
          </p>
        )}

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <CapacityStatCard
            label="Mongo status"
            value={database ? (database.connected ? "Connected" : "Offline") : "n/a"}
            helper={getDatabaseStatusHelper(database)}
            tone={getDatabaseStatusTone(database)}
          />
          <CapacityStatCard
            label="Pool usage"
            value={pool ? formatPercent(pool.utilization.percent) : "n/a"}
            helper={pool ? `max ${pool.configured.maxPoolSize} · min ${pool.configured.minPoolSize}` : "No pool data yet"}
            tone={getPoolUsageTone(database)}
          />
          <CapacityStatCard
            label="Active"
            value={pool ? `${pool.current.activeConnections}/${pool.current.totalConnections}` : "n/a"}
            helper={pool ? `${pool.current.availableConnections} available connections` : "No pool data yet"}
            tone="neutral"
          />
          <CapacityStatCard
            label="Waiting"
            value={pool ? String(pool.current.waitingRequests) : "n/a"}
            helper={pool?.current.waitingRequests ? "Requests queued for Mongo" : "No queued Mongo requests"}
            tone={pool?.current.waitingRequests ? "red" : "green"}
          />
          <CapacityStatCard
            label="SSE clients"
            value={sse ? String(sse.activeConnections) : "n/a"}
            helper={sse ? formatSseBreakdown(sse.breakdown) : "No SSE data yet"}
            tone="blue"
          />
        </div>

        {database && (
          <div className="mt-4 grid grid-cols-1 gap-3 rounded-2xl border border-blue-100 bg-white p-4 text-sm sm:grid-cols-4">
            <MetricLine label="Ready state" value={database.readyState || "unknown"} />
            <MetricLine label="Mongo host" value={database.host || "n/a"} />
            <MetricLine label="Pool status" value={pool?.utilization.status ?? "unknown"} />
            <MetricLine label="Pool health" value={formatPoolHealth(database)} />
          </div>
        )}

        {!!pool?.warnings.length && (
          <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <p className="font-semibold">Mongo warnings</p>
            <p className="mt-1">{pool.warnings.join(" ")}</p>
          </div>
        )}
      </div>
    </section>
  );
}

interface MetricLineProps {
  label: string;
  value: string;
}

function MetricLine({ label, value }: MetricLineProps) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-text-secondary">{label}</p>
      <p className="mt-1 font-semibold text-text-primary">{value}</p>
    </div>
  );
}

function getDatabaseStatusHelper(database: CapacityDatabaseMetrics | null): string {
  if (!database) return "Backend health not collected yet";
  if (database.error) return "Health endpoint unavailable";
  return database.name ? `${database.name} · ${database.readyState}` : database.readyState;
}

function getDatabaseStatusTone(database: CapacityDatabaseMetrics | null): "green" | "red" | "neutral" {
  if (!database) return "neutral";
  return database.connected && !database.error ? "green" : "red";
}

function getPoolUsageTone(database: CapacityDatabaseMetrics | null): "green" | "red" | "blue" | "neutral" {
  const pool = database?.pool;
  if (!pool) return "neutral";
  if (pool.health.needsImmediateAction || pool.current.waitingRequests > 0) return "red";
  if (pool.health.needsAttention || pool.utilization.percent >= 75) return "blue";
  return "green";
}

function formatPoolHealth(database: CapacityDatabaseMetrics): string {
  const pool = database.pool;
  if (!pool) return "No pool data";
  if (pool.health.needsImmediateAction) return "Immediate action";
  if (pool.health.needsAttention) return "Needs attention";
  if (pool.health.isHealthy) return "Healthy";
  return "Unknown";
}

function formatSseBreakdown(breakdown: Record<string, number>): string {
  const entries = Object.entries(breakdown);
  if (!entries.length) return "No active streams";
  return entries.map(([key, value]) => `${key}: ${value}`).join(" · ");
}
