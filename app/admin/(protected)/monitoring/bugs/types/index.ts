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
  dateLabel: string;
  sourceLabel: string;
  severityLabel: string;
  severityTone: string;
  title: string;
  summary: string;
  categoryLabel: string;
  productTitle: string;
  productMeta: string;
  productUrl: string | null;
  visitorLabel: string;
  deviceLabel: string;
  previewUrl: string | null;
}

export interface BugReportsViewModel {
  stats: BugReportStatCard[];
  items: BugReportItem[];
  hasItems: boolean;
}
