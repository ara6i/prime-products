import type {
  AdminReplaySession,
  AdminReplaySessionsResponse,
  ReplayPageViewModel,
  ReplaySessionCardView,
} from "../types";

const numberFormatter = new Intl.NumberFormat("en-US");
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

function formatNumber(value: number): string {
  return numberFormatter.format(value);
}

function formatDuration(startedAt: string, lastSeenAt: string): string {
  const start = new Date(startedAt).getTime();
  const end = new Date(lastSeenAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return "Under 1 minute";
  const seconds = Math.max(1, Math.round((end - start) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder ? `${minutes}m ${remainder}s` : `${minutes}m`;
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return dateFormatter.format(date);
}

function compact(values: Array<string | null | undefined>): string {
  return values.filter(Boolean).join(" · ");
}

function sourceLabel(session: AdminReplaySession): string {
  return session.source === "shopify" ? "Shopify SDK" : "Public SDK";
}

function toCard(session: AdminReplaySession): ReplaySessionCardView {
  const title = session.productTitle || session.productId || "Unknown product";
  const subtitle = session.productUrl || session.sessionId;
  const deviceLabel = compact([session.device, session.os, session.browser]) || "Unknown device";
  return {
    session,
    title,
    subtitle,
    sourceLabel: sourceLabel(session),
    deviceLabel,
    eventLabel: `${formatNumber(session.eventCount)} events`,
    durationLabel: formatDuration(session.startedAt, session.lastSeenAt),
    lastSeenLabel: formatDate(session.lastSeenAt),
  };
}

export function mapBehaviorPage(response: AdminReplaySessionsResponse): ReplayPageViewModel {
  const sessions = response.sessions.map(toCard);
  const eventCount = response.sessions.reduce((sum, session) => sum + session.eventCount, 0);
  return {
    sessions,
    totalSessionsLabel: formatNumber(response.sessions.length),
    totalEventsLabel: formatNumber(eventCount),
    latestActivityLabel: sessions[0]?.lastSeenLabel ?? "No sessions yet",
  };
}
