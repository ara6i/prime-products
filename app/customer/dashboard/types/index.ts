import type { CustomerOverviewViewModel } from "./overview";

export type CustomerDashboardRange = "7d" | "30d" | "90d";

export type CustomerDashboardView = "charts" | "numbers";

export type CustomerWorkspaceStatus = "ready" | "needs_key" | "not_created";

export type CustomerDashboardTheme = "light" | "dark";

export interface CustomerDashboardRawStore {
  username: string;
  storeName: string;
  merchantName: string;
  domain: string;
  ownerEmail: string;
}

export interface CustomerDashboardRawOverview {
  store: CustomerDashboardRawStore;
  workspace: {
    status: CustomerWorkspaceStatus;
    projectId: string | null;
    projectName: string | null;
    storeProfileId: string | null;
    apiKeyCount: number;
    latestKeyPrefix: string | null;
    latestKeyLastUsedAt: string | null;
  };
  setup: {
    domainConfigured: boolean;
    productionKeyReady: boolean;
    eventsReceiving: boolean;
  };
  range: {
    days: number;
    from: string;
  };
  metrics: {
    productViews: number;
    uniqueVisitors: number;
    tryOnsStarted: number;
    tryOnsCompleted: number;
    sizeRecommendations: number;
    sizeAccepted: number;
    addToCart: number;
    completionRate: number;
    sizeAcceptanceRate: number;
    apiRequests: number;
    apiSuccessRate: number;
    avgResponseTimeMs: number;
  };
  billing?: CustomerDashboardRawBilling | null;
  activity: CustomerDashboardRawActivityPoint[];
  topProducts: CustomerDashboardRawTopProduct[];
  api: {
    endpoints: CustomerDashboardRawEndpoint[];
    recentRequests: CustomerDashboardRawRequest[];
  };
  review?: CustomerDashboardRawReview | null;
  dailyActivity?: CustomerDashboardDailyPoint[];
  funnel?: CustomerDashboardFunnelStep[];
  deviceSplit?: CustomerDashboardDeviceSlice[];
  countrySplit?: CustomerDashboardCountrySlice[];
  sizeInsights?: CustomerDashboardSizeInsight[];
  hourHistogram?: number[];
  weekdayHistogram?: number[];
}

export interface CustomerDashboardRawBilling {
  status: "free" | "active" | "cancelled" | "expired" | "past_due";
  active: boolean;
  planName: string;
  selectedProductCount: number;
  productAccessLimit: number;
  monthlyTryOnLimit: number;
  tryOnPackPrice: number;
  platformFee: number;
  totalMonthlyPrice: number;
  autoRefillEnabled: boolean;
  addOnTryOnsCurrentPeriod: number;
  totalTryOnLimit: number;
  lemonSqueezySubscriptionId: string | null;
  currentPeriodEnd: string | null;
}

export interface CustomerDashboardRawReview {
  id: string | null;
  status: "draft" | "domain_pending" | "auto_reviewing" | "manual_review" | "approved" | "rejected";
  approvalSource: "auto" | "manual" | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  notes: string | null;
}

export interface CustomerDashboardRawActivityPoint {
  date: string;
  tryOnsStarted: number;
  tryOnsCompleted: number;
  failed: number;
}

export interface CustomerDashboardRawTopProduct {
  productId: string;
  productTitle: string;
  tryOns: number;
  topSize: string | null;
  topSizePct: number | null;
}

export interface CustomerDashboardRawEndpoint {
  endpoint: string;
  count: number;
  avgLatencyMs: number;
}

export interface CustomerDashboardRawRequest {
  id: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTimeMs: number;
  createdAt: string;
  error: string | null;
}

export type CustomerDashboardIconKey =
  | "dashboard"
  | "conversion"
  | "returns"
  | "tryOn"
  | "sizing"
  | "api"
  | "docs"
  | "security"
  | "billing"
  | "settings"
  | "products"
  | "reports"
  | "behavior"
  | "insight";

export interface CustomerDashboardNavItem {
  label: string;
  href: string;
  icon: CustomerDashboardIconKey;
  active: boolean;
  disabled: boolean;
}

export interface CustomerDashboardMetricCard {
  label: string;
  value: string;
  detail: string;
  icon: CustomerDashboardIconKey;
  tone: "blue" | "green" | "neutral" | "amber" | "rose";
}

export interface CustomerDashboardRangeOption {
  label: string;
  value: CustomerDashboardRange;
  href: string;
  active: boolean;
}

export interface CustomerDashboardViewOption {
  label: string;
  value: CustomerDashboardView;
  href: string;
  active: boolean;
}

export interface CustomerDashboardNumberRow {
  label: string;
  value: string;
  detail: string;
  percent: number;
}

export interface CustomerDashboardNumberSection {
  title: string;
  description: string;
  rows: CustomerDashboardNumberRow[];
}

export interface CustomerDashboardDailyPoint {
  date: string;
  initiated: number;
  completed: number;
  failed: number;
}

export interface CustomerDashboardFunnelStep {
  step: string;
  count: number;
}

export interface CustomerDashboardDeviceSlice {
  device: string;
  count: number;
}

export interface CustomerDashboardCountrySlice {
  iso2: string;
  name: string;
  count: number;
}

export interface CustomerDashboardTopProduct {
  productId: string;
  productTitle: string;
  tryOns: number;
}

export type CustomerDashboardSizeInsightGender = "men" | "women";

export interface CustomerDashboardSizeInsightSize {
  label: string;
  count: number;
  percent: number;
}

export interface CustomerDashboardSizeInsight {
  gender: CustomerDashboardSizeInsightGender;
  shoppers: number;
  recommendations: number;
  accepted: number;
  changedAfterTryOn: number;
  acceptanceRate: number;
  topSizes: CustomerDashboardSizeInsightSize[];
}

export interface CustomerDashboardViewModel {
  storeName: string;
  domain: string;
  ownerEmail: string;
  projectName: string;
  workspaceStatus: CustomerWorkspaceStatus;
  productionKeyReady: boolean;
  latestKeyPrefix: string | null;
  pageTitle: string;
  dataModeLabel: string;
  statusLabel: string;
  statusTone: "success" | "warning";
  rangeLabel: string;
  activeView: CustomerDashboardView;
  rangeOptions: CustomerDashboardRangeOption[];
  viewOptions: CustomerDashboardViewOption[];
  navItems: CustomerDashboardNavItem[];
  metricCards: CustomerDashboardMetricCard[];
  dailyActivity: CustomerDashboardDailyPoint[];
  funnel: CustomerDashboardFunnelStep[];
  deviceSplit: CustomerDashboardDeviceSlice[];
  countrySplit: CustomerDashboardCountrySlice[];
  topProducts: CustomerDashboardTopProduct[];
  sizeInsights: CustomerDashboardSizeInsight[];
  hourHistogram: number[];
  weekdayHistogram: number[];
  numberSections: CustomerDashboardNumberSection[];
  overview: CustomerOverviewViewModel;
}
