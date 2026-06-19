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
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function sourceLabel(source: AdminBugReportRawItem["source"]): string {
  if (source === "visual-qa") return "AI QA";
  if (source === "server") return "Server";
  return "Client";
}

function isParserReport(item: AdminBugReportRawItem): boolean {
  return (
    item.categories.includes("qa_malformed_response") ||
    item.categories.includes("qa_parser_error") ||
    item.metadata?.malformedResponse === true
  );
}

function platformLabel(item: AdminBugReportRawItem): string {
  if (item.sourceChannel === "shopify" || item.store?.source === "shopify") return "Shopify";
  if (item.sourceChannel === "sdk" || item.store?.source === "sdk") return "SDK";
  return item.source === "visual-qa" ? "SDK" : "Unknown";
}

function severityTone(severity: AdminBugReportRawItem["severity"]): string {
  if (severity === "critical" || severity === "high") return "bg-customer-danger-bg text-customer-danger-text";
  if (severity === "medium") return "bg-customer-warning-bg text-customer-warning-text";
  return "bg-customer-blue text-brand-blue";
}

function shortId(value: string | null): string | null {
  return value ? value.slice(-8) : null;
}

function productMeta(item: AdminBugReportRawItem): string {
  const pieces = [
    item.productId ? `Product ${item.productId}` : null,
    item.jobId ? `Job ${shortId(item.jobId)}` : null,
  ].filter(Boolean);
  return pieces.join(" · ") || "No product context";
}

function storeLabel(item: AdminBugReportRawItem): string {
  const name = item.store?.name || item.store?.storeProfileName || item.store?.projectName || item.store?.apiKeyName;
  const domain = item.store?.domain || item.store?.shopDomain || item.store?.originHost || item.store?.allowedDomains?.[0] || null;
  if (name && domain && name !== domain) return `${name} · ${domain}`;
  if (name || domain) return name || domain || "Unknown store";
  if (item.storeProfileId) return `Store ${shortId(item.storeProfileId)}`;
  return "Unknown store";
}

function storeMeta(item: AdminBugReportRawItem): string {
  const pieces = [
    item.store?.projectName ? `Project ${item.store.projectName}` : null,
    item.store?.apiKeyName ? `API key ${item.store.apiKeyName}` : null,
    item.store?.keyPrefix ? `Key ${item.store.keyPrefix}` : null,
    item.store?.status ? `Status ${item.store.status}` : null,
  ].filter(Boolean);
  return pieces.join(" · ");
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
  const parserReport = isParserReport(item);
  const isVisualTryOnIssue = item.source === "visual-qa" && !parserReport;
  return {
    id: item.id,
    source: item.source,
    status: item.status,
    dateLabel: formatDate(item.createdAt),
    sourceLabel: parserReport ? "QA parser" : sourceLabel(item.source),
    platformLabel: platformLabel(item),
    severityLabel: item.severity.toUpperCase(),
    severityTone: severityTone(item.severity),
    title: parserReport ? "QA parser error" : item.title,
    summary: parserReport
      ? "AI QA could not return valid JSON with a clear visible reason after retry. No visual try-on defect was confirmed."
      : item.summary,
    categoryLabel: item.categories.length ? item.categories.join(", ") : "uncategorized",
    productTitle: item.productTitle || "Untitled product",
    productMeta: productMeta(item),
    productUrl: item.productUrl,
    storeLabel: storeLabel(item),
    storeMeta: storeMeta(item),
    jobLabel: item.jobId || "No job id",
    profileLabel: profileLabel(item),
    visitorLabel: visitorLabel(item),
    deviceLabel: deviceLabel(item),
    previewUrl: item.resultPreviewDataUrl,
    isVisualTryOnIssue,
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
