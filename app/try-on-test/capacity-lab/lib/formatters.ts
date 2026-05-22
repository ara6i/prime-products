export function formatMs(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0 ms";
  if (value < 1000) return `${Math.round(value)} ms`;
  return `${(value / 1000).toFixed(2)} s`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(Math.round(value));
}

export function formatPercent(value: number | null): string {
  if (value === null || !Number.isFinite(value)) return "n/a";
  return `${value.toFixed(1)}%`;
}

export function formatRps(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0 req/s";
  if (value < 10) return `${value.toFixed(1)} req/s`;
  return `${Math.round(value)} req/s`;
}

export function formatMemory(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "0 MB";
  if (value >= 1024) return `${(value / 1024).toFixed(1)} GB`;
  return `${Math.round(value)} MB`;
}
