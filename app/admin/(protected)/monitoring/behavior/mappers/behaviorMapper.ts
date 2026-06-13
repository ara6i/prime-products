import type { AdminClaritySessionRaw, AdminClaritySessionsResponse, BehaviorSessionItem, BehaviorViewModel } from "../types";

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function shorten(value: string, left = 10, right = 8): string {
  if (value.length <= left + right + 3) return value;
  return `${value.slice(0, left)}...${value.slice(-right)}`;
}

function sourceLabel(source: string): string {
  if (source === "shopify") return "Shopify";
  if (source === "sdk") return "Public SDK";
  return source || "SDK";
}

function deviceLabel(item: AdminClaritySessionRaw): string {
  return [item.device, item.os, item.browser].filter(Boolean).join(" · ") || "Unknown device";
}

function isLocalHost(host: string | null): boolean {
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

function countryLabel(item: AdminClaritySessionRaw): string {
  const code = item.countryCode;
  if (!code) {
    const host = item.originHost || hostFromUrl(item.originUrl) || hostFromUrl(item.productUrl);
    return isLocalHost(host) ? "Local/dev" : "Not captured";
  }
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code.toUpperCase()) || code.toUpperCase();
  } catch {
    return code.toUpperCase();
  }
}

function hostFromUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

function originLabel(item: AdminClaritySessionRaw): string {
  return item.originHost || hostFromUrl(item.originUrl) || hostFromUrl(item.productUrl) || "Not captured";
}

function productMeta(item: AdminClaritySessionRaw): string {
  const pieces = [item.productId ? `Product ${item.productId}` : null, item.productUrl ? "URL available" : null].filter(Boolean);
  return pieces.join(" · ") || "No product metadata";
}

function mapSession(item: AdminClaritySessionRaw): BehaviorSessionItem {
  const tagName = item.sdkOpenId ? "ps_sdk_open_id" : "ps_session";
  const tagValue = item.sdkOpenId || item.sessionId;
  return {
    id: item.id,
    tagName,
    tagValue,
    sessionId: item.sessionId,
    sdkOpenId: item.sdkOpenId,
    productTitle: item.productTitle || "Unknown product",
    productMeta: productMeta(item),
    productUrl: item.productUrl,
    sourceLabel: sourceLabel(item.source),
    originLabel: originLabel(item),
    countryLabel: countryLabel(item),
    deviceLabel: deviceLabel(item),
    lastSeenLabel: formatDate(item.lastSeenAt),
    eventCountLabel: new Intl.NumberFormat("en-US").format(item.eventCount),
    eventsLabel: item.eventTypes.length ? item.eventTypes.join(", ") : "No events",
    jobIdsLabel: item.jobIds.length ? item.jobIds.map((id) => shorten(id, 8, 6)).join(", ") : "No try-on job",
  };
}

export function mapBehaviorPage(response: AdminClaritySessionsResponse): BehaviorViewModel {
  return {
    sessions: response.items.map(mapSession),
    hasSessions: response.items.length > 0,
  };
}
