import type {
  AdminBugReportRawItem,
  AdminBugReportsResponse,
  BugReportItem,
  BugReportStatCard,
  BugReportsViewModel,
} from "../types";

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function sourceLabel(source: AdminBugReportRawItem["source"]): string {
  if (source === "visual-qa") return "AI QA";
  if (source === "server") return "Server";
  return "Client";
}

function severityTone(severity: AdminBugReportRawItem["severity"]): string {
  if (severity === "critical" || severity === "high") return "bg-customer-danger-bg text-customer-danger-text";
  if (severity === "medium") return "bg-customer-warning-bg text-customer-warning-text";
  return "bg-customer-blue text-brand-blue";
}

function productMeta(item: AdminBugReportRawItem): string {
  const pieces = [
    item.sourceChannel ? item.sourceChannel.toUpperCase() : null,
    item.store?.shopDomain ? `Store ${item.store.shopDomain}` : null,
    item.productId ? `Product ${item.productId}` : null,
    item.jobId ? `Job ${item.jobId}` : null,
  ].filter(Boolean);
  return pieces.join(" · ") || "No product context";
}

function storeLabel(item: AdminBugReportRawItem): string {
  if (item.store?.shopName || item.store?.shopDomain) {
    const name = item.store.shopName || item.store.shopDomain;
    const plan = item.store.plan ? ` · ${item.store.plan}` : "";
    const status = item.store.status ? ` · ${item.store.status}` : "";
    return `${name}${plan}${status}`;
  }
  if (item.storeProfileId) return `SDK store profile ${item.storeProfileId}`;
  return "No store context";
}

function profileLabel(item: AdminBugReportRawItem): string {
  if (!item.profile) return "No customer profile";
  const name = item.profile.name || item.profile.id || "Unnamed profile";
  return `${name}${item.profile.loggedIn ? " · logged in" : " · guest/local"}`;
}

function visitorLabel(item: AdminBugReportRawItem): string {
  return item.countryName || item.countryCode || item.sessionId || "Unknown visitor";
}

function deviceLabel(item: AdminBugReportRawItem): string {
  return [item.device, item.os, item.browser].filter(Boolean).join(" · ") || "Unknown device";
}

function mapItem(item: AdminBugReportRawItem): BugReportItem {
  return {
    id: item.id,
    source: item.source,
    status: item.status,
    dateLabel: formatDate(item.createdAt),
    sourceLabel: sourceLabel(item.source),
    severityLabel: item.severity.toUpperCase(),
    severityTone: severityTone(item.severity),
    title: item.title,
    summary: item.summary,
    categoryLabel: item.categories.length ? item.categories.join(", ") : "uncategorized",
    productTitle: item.productTitle || "Untitled product",
    productMeta: productMeta(item),
    productUrl: item.productUrl,
    storeLabel: storeLabel(item),
    profileLabel: profileLabel(item),
    visitorLabel: visitorLabel(item),
    deviceLabel: deviceLabel(item),
    previewUrl: item.resultPreviewDataUrl,
  };
}

function mapStats(response: AdminBugReportsResponse): BugReportStatCard[] {
  return [
    { label: "Open", value: formatNumber(response.summary.open), helper: "Needs review" },
    { label: "AI QA", value: formatNumber(response.summary.visualQa), helper: "Visual try-on flags" },
    { label: "Runtime", value: formatNumber(response.summary.runtime), helper: "Server or client reports" },
    { label: "High severity", value: formatNumber(response.summary.highSeverity), helper: "High and critical issues" },
  ];
}

export function mapBugReportsPage(response: AdminBugReportsResponse): BugReportsViewModel {
  return {
    stats: mapStats(response),
    items: response.items.map(mapItem),
    hasItems: response.items.length > 0,
  };
}
