export interface AdminBugReportRawItem {
  id: string;
  createdAt: string;
  source: "visual-qa" | "server" | "client";
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "reviewed" | "ignored";
  title: string;
  summary: string;
  categories: string[];
  jobId: string | null;
  sourceChannel: "sdk" | "shopify" | null;
  shopifyShopId: string | null;
  storeProfileId: string | null;
  apiKeyId: string | null;
  developerProjectId: string | null;
  sessionId: string | null;
  productId: string | null;
  productTitle: string | null;
  productUrl: string | null;
  resultPreviewDataUrl: string | null;
  device: string | null;
  os: string | null;
  browser: string | null;
  countryCode: string | null;
  countryName: string | null;
  store: {
    id: string | null;
    source: "sdk" | "shopify" | null;
    name: string | null;
    domain: string | null;
    shopDomain: string | null;
    shopName: string | null;
    ownerEmail: string | null;
    primaryDomain: string | null;
    primaryDomainUrl: string | null;
    plan: string | null;
    status: string | null;
    storeProfileName: string | null;
    projectName: string | null;
    apiKeyName: string | null;
    keyPrefix: string | null;
    allowedDomains: string[];
    originHost: string | null;
    originUrl: string | null;
  } | null;
  profile: {
    loggedIn: boolean;
    id: string | null;
    name: string | null;
  } | null;
  metadata?: Record<string, unknown>;
}

export interface AdminBugReportsResponse {
  summary: {
    total: number;
    showing: number;
    open: number;
    visualQa: number;
    runtime: number;
    highSeverity: number;
  };
  items: AdminBugReportRawItem[];
}

export interface BugReportStatCard {
  label: string;
  value: string;
  helper: string;
}

export interface BugReportItem {
  id: string;
  source: AdminBugReportRawItem["source"];
  status: AdminBugReportRawItem["status"];
  dateLabel: string;
  sourceLabel: string;
  platformLabel: string;
  severityLabel: string;
  severityTone: string;
  title: string;
  summary: string;
  categoryLabel: string;
  productTitle: string;
  productMeta: string;
  productUrl: string | null;
  storeLabel: string;
  storeMeta: string;
  jobLabel: string;
  profileLabel: string;
  visitorLabel: string;
  deviceLabel: string;
  previewUrl: string | null;
  isVisualTryOnIssue: boolean;
}

export interface BugReportsViewModel {
  stats: BugReportStatCard[];
  items: BugReportItem[];
  hasItems: boolean;
}
