export type StoreSource = "shopify" | "sdk";

export interface UnifiedStore {
  id: string;
  source: StoreSource;
  storeName: string;
  identifier: string;
  ownerEmail: string | null;
  status: string;
  plan: string | null;
  tryOnsUsed: number | null;
  tryOnsRemaining: number | null;
  lastUsedAt: string | null;
  installedAt: string;
  storeProfileId: string | null;
}

export interface StoresPage {
  stores: UnifiedStore[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface OverviewCounts {
  shopifyTotal: number;
  shopifyActive: number;
  shopifyUninstalled: number;
  sdkActive: number;
  totalTemplates: number;
}

export interface RecentShopifyShop {
  _id: string;
  shopDomain: string;
  shopName: string | null;
  ownerEmail: string | null;
  plan: string;
  status: string;
  installedAt: string;
}

export interface AdminOverview {
  counts: OverviewCounts;
  recentShopify: RecentShopifyShop[];
}

export interface AnalyticsKPIs {
  mrr: number;
  revenue30: number;
  shopifyActive: number;
  shopifyTotal: number;
  sdkStoresCount: number;
  totalTryOns: number;
  totalTemplates: number;
  installsLast30: number;
  installsGrowthPct: number;
}

export interface MonthlyPoint {
  month: string;
  revenue: number;
  installs: number;
}

export interface CumulativePoint {
  month: string;
  total: number;
}

export interface PlanDistribution {
  name: string;
  label: string;
  count: number;
}

export interface TopMerchant {
  id: string;
  shopDomain: string;
  shopName: string | null;
  tryOnsUsed: number;
  plan: string;
  status: string;
}

export interface GeoPoint {
  iso2: string;
  name: string;
  count: number;
}

export interface AnalyticsOverview {
  kpis: AnalyticsKPIs;
  monthlySeries: MonthlyPoint[];
  cumulativeSeries: CumulativePoint[];
  planDistributionShopify: PlanDistribution[];
  planDistributionSdk: PlanDistribution[];
  topMerchants: TopMerchant[];
  geoDistribution: GeoPoint[];
  recentShopify: RecentShopifyShop[];
}

export interface DecisionMetricBlock {
  value: number | null;
  delta: number | null;
  desiredDirection: "up" | "down";
  available: boolean;
}

export interface DecisionAovBlock extends DecisionMetricBlock {
  currency: string;
}

export interface DecisionFunnelStep {
  step: string;
  count: number | null;
  pct: number | null;
  available: boolean;
}

export interface DecisionInsight {
  kind: "lift" | "alignment" | "returns" | "activity";
  body: string;
  highlight: string | null;
}

export interface DecisionConversionPoint {
  date: string;
  treatment: number;
  control: number | null;
}

export interface DecisionCategoryRow {
  category: string;
  treatment: number;
  control: number | null;
}

export interface DecisionTopProduct {
  productId: string;
  productTitle: string;
  tryOns: number;
  conversionLift: number | null;
  returnRate: number | null;
  orders: number | null;
}

export interface DecisionEngineOverview {
  range: { days: number; from: string };
  vsControl: { available: boolean; reason?: string };
  kpis: {
    conversionRate: DecisionMetricBlock;
    returnRate: DecisionMetricBlock;
    aov: DecisionAovBlock;
    timeToPurchase: DecisionMetricBlock;
  };
  conversionImpact: {
    series: DecisionConversionPoint[];
    controlAvailable: boolean;
  };
  returnRateByCategory: {
    available: boolean;
    rows: DecisionCategoryRow[];
  };
  keyInsights: DecisionInsight[];
  engagementFunnel: DecisionFunnelStep[];
  sizeAlignment: {
    acceptanceRate: number | null;
    followingSuggestion: number | null;
    changedAfterTryOn: number | null;
    mismatchReductionPct: number | null;
  };
  topProducts: DecisionTopProduct[];
}

export interface RevenueOverview {
  range: { days: number; from: string };
  currency: string;
  orders: {
    total: number;
    paid: number;
    revenue: number;
    paidRevenue: number;
    refundedAmount: number;
  };
  attribution: {
    attributedOrders: number;
    attributedPaidOrders: number;
    attributedRevenue: number;
    attributedPaidRevenue: number;
    completedTryOns: number;
    conversionRate: number;
  };
  refundRate: number;
  topProductsByRevenue: Array<{
    productId: string;
    title: string;
    revenue: number;
    orders: number;
  }>;
}

export interface HeaderMapping {
  original: string;
  key: string;
  unit: "cm" | "in" | null;
  label: string;
}

export interface SizeGuideConfig {
  unit: "cm" | "in";
  headerMappings: HeaderMapping[];
  originalHeaders: string[];
  learnedAt: string;
  confirmedAt: string | null;
}

export interface StoreProfile {
  _id: string;
  source: "sdk" | "shopify";
  storeName: string;
  sizeGuideConfig: SizeGuideConfig | null;
  status: "active" | "archived";
  createdAt: string;
  updatedAt: string;
}

export interface ShopifyStoreDetail {
  source: "shopify";
  store: UnifiedStore;
  raw: {
    shopDomain: string;
    shopName: string | null;
    ownerEmail: string | null;
    currency: string | null;
    timezone: string | null;
    plan: string;
    status: string;
    tryOnsUsed: number;
    tryOnsRemaining: number;
    installedAt: string;
    uninstalledAt: string | null;
    lastUsedAt: string | null;
    createdAt: string;
    updatedAt: string;
  };
  storeProfile: StoreProfile | null;
  stats: {
    chartCount: number;
    linkedProductCount: number;
  };
}

export interface SdkStoreDetail {
  source: "sdk";
  store: UnifiedStore;
  storeProfile: StoreProfile;
  user: { _id: string; name: string; email: string } | null;
  project: { _id: string; name: string; description: string } | null;
  stats: { chartCount: number };
}

export type StoreDetail = ShopifyStoreDetail | SdkStoreDetail;

export interface SizeChartSummary {
  id: string;
  name: string;
  unit: "cm" | "in";
  gender: string;
  columnCount: number;
  rowCount: number;
  assignedProductCount: number;
  assignedCollectionCount: number;
  updatedAt: string;
  createdAt: string;
}

export interface SizeChartSection {
  name: string;
  headers: string[];
  rows: string[][];
}

export interface AppliesToRule {
  productTypes: string[];
  collections: string[];
  tags: string[];
  vendor: string | null;
}

export interface BehaviorKPIs {
  uniqueSessions: number;
  initiated: number;
  completed: number;
  failed: number;
  sizeShown: number;
  sizeAccepted: number;
  cartAdds: number;
  completionRate: number;
  sizeAcceptanceRate: number;
}

export interface BehaviorDailyPoint {
  date: string;
  initiated: number;
  completed: number;
  failed: number;
}

export interface BehaviorDeviceSlice {
  device: string;
  count: number;
}

export interface BehaviorCountrySlice {
  iso2: string;
  name: string;
  count: number;
}

export interface BehaviorTopProduct {
  productId: string;
  productTitle: string;
  tryOns: number;
}

export interface BehaviorFunnelStep {
  step: string;
  count: number;
}

export interface BehaviorOverview {
  range: { days: number; from: string };
  kpis: BehaviorKPIs;
  dailyActivity: BehaviorDailyPoint[];
  hourHistogram: number[];
  weekdayHistogram: number[];
  deviceSplit: BehaviorDeviceSlice[];
  countrySplit: BehaviorCountrySlice[];
  topProducts: BehaviorTopProduct[];
  funnel: BehaviorFunnelStep[];
}

export interface SizeChartDetail {
  _id: string;
  storeProfileId: string;
  name: string;
  gender: "male" | "female" | "unisex";
  unit: "cm" | "in";
  headers: string[];
  rows: string[][];
  sections: SizeChartSection[];
  appliesTo: AppliesToRule;
  productOverrides: string[];
  status: "active" | "draft" | "archived";
  createdAt: string;
  updatedAt: string;
}
