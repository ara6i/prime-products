export type MerchantDashboardSection =
  | "overview"
  | "products"
  | "integrations"
  | "commerce"
  | "campaigns"
  | "billing"
  | "account";

export type MerchantDashboardRouteSection = Exclude<MerchantDashboardSection, "overview">;

export type MerchantTone = "blue" | "rose" | "orange" | "mint" | "cyan" | "lilac" | "neutral";
export type MerchantStatusTone = "positive" | "warning" | "critical" | "neutral" | "info";
export type MerchantHealth = "good" | "attention" | "blocked";

export interface MerchantViewSummary {
  question: string;
  answer: string;
  metrics?: MerchantMetric[];
}

export interface MerchantPrimaryAction {
  label: string;
  title: string;
  description: string;
  steps: Array<{ title: string; detail: string }>;
}

export type MerchantIconName =
  | "activity"
  | "agreement"
  | "ai"
  | "attribution"
  | "billing"
  | "campaign"
  | "cart"
  | "catalog"
  | "connection"
  | "contact"
  | "decision"
  | "document"
  | "incident"
  | "order"
  | "permission"
  | "privacy"
  | "publisher"
  | "return"
  | "sizing"
  | "support";

export type MerchantViewLayout =
  | "overview"
  | "catalog"
  | "pdp"
  | "matrix"
  | "gallery"
  | "connections"
  | "tests"
  | "decision"
  | "results"
  | "handoff"
  | "ledger"
  | "timeline"
  | "campaigns"
  | "publishers"
  | "terms"
  | "statement"
  | "cases"
  | "exports"
  | "profile"
  | "documents"
  | "contacts"
  | "support"
  | "lifecycle";

export interface MerchantStatus {
  label: string;
  tone: MerchantStatusTone;
}

export interface MerchantMetric {
  label: string;
  value: string;
  detail: string;
  tone: MerchantTone;
  trend?: string;
}

export interface MerchantFeatureCard {
  id: string;
  title: string;
  detail: string;
  meta: string;
  tone: MerchantTone;
  icon: MerchantIconName;
  status: MerchantStatus;
  illustration?: string;
  illustrationAlt?: string;
  fields?: MerchantField[];
}

export interface MerchantField {
  label: string;
  value: string;
  tone?: MerchantStatusTone;
}

export interface MerchantTableColumn {
  key: string;
  label: string;
  width?: string;
}

export interface MerchantRecord {
  id: string;
  title: string;
  subtitle: string;
  icon: MerchantIconName;
  cells: Record<string, string>;
  status: MerchantStatus;
  detailTitle?: string;
  detail?: string;
  fields?: MerchantField[];
  tags?: string[];
  href?: string;
}

export interface MerchantMatrixRow {
  id: string;
  label: string;
  detail: string;
  values: Array<{ label: string; value: string; status?: MerchantStatus }>;
}

export interface MerchantTimelineItem {
  id: string;
  title: string;
  detail: string;
  meta: string;
  icon: MerchantIconName;
  status: MerchantStatus;
}

export interface MerchantChartPoint {
  label: string;
  primary: number;
  secondary: number;
}

export interface MerchantProgress {
  label: string;
  value: number;
  max: number;
  valueLabel: string;
  maxLabel: string;
  detail: string;
  tone: MerchantTone;
}

export interface MerchantTabView {
  id: string;
  label: string;
  detail: string;
  layout: MerchantViewLayout;
  title: string;
  description: string;
  eyebrow?: string;
  metrics?: MerchantMetric[];
  cards?: MerchantFeatureCard[];
  columns?: MerchantTableColumn[];
  records?: MerchantRecord[];
  matrixColumns?: string[];
  matrixRows?: MerchantMatrixRow[];
  timeline?: MerchantTimelineItem[];
  chart?: {
    title: string;
    detail: string;
    primaryLabel: string;
    secondaryLabel: string;
    points: MerchantChartPoint[];
  };
  progress?: MerchantProgress;
  fields?: MerchantField[];
  filters?: string[];
  notice?: string;
  health?: MerchantHealth;
  summary?: MerchantViewSummary;
  primaryAction?: MerchantPrimaryAction;
  evidence?: MerchantField[];
}

export interface MerchantSectionData {
  eyebrow: string;
  title: string;
  detail: string;
  tabs: MerchantTabView[];
}

export interface MerchantDashboardData {
  merchant: {
    name: string;
    legalName: string;
    contact: string;
    email: string;
    avatar: string;
    merchantId: string;
    channel: "DIRECT_CONNECTED";
    integration: string;
  };
  sections: Record<MerchantDashboardSection, MerchantSectionData>;
}

export const MERCHANT_DASHBOARD_ROUTE_SECTIONS: MerchantDashboardRouteSection[] = [
  "products",
  "integrations",
  "commerce",
  "campaigns",
  "billing",
  "account",
];

export function isMerchantDashboardRouteSection(value: string): value is MerchantDashboardRouteSection {
  return MERCHANT_DASHBOARD_ROUTE_SECTIONS.includes(value as MerchantDashboardRouteSection);
}
