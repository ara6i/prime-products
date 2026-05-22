import type {
  CapacityMetricsSnapshot,
  CapacityRunConfig,
  CapacityRunSnapshot,
  CapacityStartRunResponse,
  CapacityTargetId,
} from "../types";
import { mapMetricsSnapshot, mapRunSnapshot } from "../mappers/capacityLabMapper";

async function readJson<T>(response: Response): Promise<T> {
  const text = await response.text().catch(() => "");
  const data = parseJson(text);

  if (!response.ok) {
    const message = data && typeof data === "object" && "message" in data
      ? String((data as { message?: unknown }).message)
      : formatResponseError(response, text);
    throw new Error(message);
  }

  return data as T;
}

function parseJson(text: string): unknown {
  if (!text.trim()) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function formatResponseError(response: Response, text: string): string {
  const statusText = response.statusText ? ` ${response.statusText}` : "";
  const snippet = text
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 220);
  return snippet
    ? `Request failed (${response.status}${statusText}): ${snippet}`
    : `Request failed (${response.status}${statusText})`;
}

export async function startCapacityRun(config: CapacityRunConfig): Promise<CapacityStartRunResponse> {
  const response = await fetch("/api/try-on-test/capacity-lab/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(config),
  });
  const raw = await readJson<CapacityStartRunResponse>(response);
  return { runId: raw.runId, snapshot: mapRunSnapshot(raw.snapshot) };
}

export async function getCapacityRunStatus(runId: string): Promise<CapacityRunSnapshot> {
  const response = await fetch(`/api/try-on-test/capacity-lab/status/${encodeURIComponent(runId)}`, {
    credentials: "include",
    cache: "no-store",
  });
  return mapRunSnapshot(await readJson<CapacityRunSnapshot>(response));
}

export async function cancelCapacityRun(runId: string): Promise<CapacityRunSnapshot> {
  const response = await fetch(`/api/try-on-test/capacity-lab/cancel/${encodeURIComponent(runId)}`, {
    method: "POST",
    credentials: "include",
    cache: "no-store",
  });
  return mapRunSnapshot(await readJson<CapacityRunSnapshot>(response));
}

export async function getCapacityMetrics(targetId: CapacityTargetId): Promise<CapacityMetricsSnapshot> {
  const response = await fetch(`/api/try-on-test/capacity-lab/metrics?targetId=${encodeURIComponent(targetId)}`, {
    credentials: "include",
    cache: "no-store",
  });
  return mapMetricsSnapshot(await readJson<CapacityMetricsSnapshot>(response));
}
