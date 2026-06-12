import type { PreparedMapData } from "@/app/customer/dashboard/utils/map/prepareCustomerMapData";

export type ShopifyDashboardRange = "today" | "week" | "month" | "range";

export interface ShopifyDashboardRaw {
  range: ShopifyDashboardRange;
  generatedAt: string;
  from: string;
  currency: string;
  revenue: {
    monthly: number;
    annualRunRate: number;
  };
  installs: {
    total: number;
    active: number;
    suspended: number;
    uninstalled: number;
    inRange: number;
    growthPct: number;
    byWeekday: Array<{ day: string; installs: number }>;
  };
  tryOns: {
    initiated: number;
    completed: number;
    failed: number;
    lifetime: number;
    completionGrowthPct: number;
    initiatedGrowthPct: number;
    daily: Array<{ date: string; initiated: number; completed: number; failed: number }>;
  };
  impressions: {
    total: number;
    growthPct: number;
    countrySplit: Array<{ iso2: string; name: string; count: number }>;
  };
  topProducts: Array<{
    productId: string;
    productTitle: string;
    views: number;
    tryOns: number;
    completed: number;
    activity: number;
  }>;
  deviceSplit: Array<{ device: string; count: number }>;
}

export interface OverviewMetric {
  label: string;
  value: string;
  helper: string;
  trend?: string;
  tone?: "blue" | "green" | "yellow" | "purple";
}

export interface ShopifyDashboardView {
  range: ShopifyDashboardRange;
  rangeLabel: string;
  revenue: OverviewMetric;
  tryOns: OverviewMetric;
  installs: OverviewMetric;
  impressions: OverviewMetric;
  revenueSeries: Array<{ date: string; completed: number; initiated: number }>;
  installSeries: Array<{ day: string; installs: number }>;
  topProducts: Array<{ title: string; meta: string; value: string; accent: "blue" | "yellow" | "purple" }>;
  deviceBubbles: Array<{ label: string; value: string; percent: number; tone: "blue" | "yellow" | "purple" }>;
  map: PreparedMapData;
  countries: Array<{ label: string; count: string; iso2: string }>;
}
