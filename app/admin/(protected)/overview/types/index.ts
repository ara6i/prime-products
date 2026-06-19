import type { PreparedMapData } from "@/app/customer/dashboard/utils/map/prepareCustomerMapData";

export type ShopifyDashboardRange = "today" | "week" | "month" | "range";

export interface ShopifyDashboardRaw {
  range: ShopifyDashboardRange;
  ranges?: {
    tryOns: ShopifyDashboardRange;
    installs: ShopifyDashboardRange;
    date: string | null;
  };
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
    uninstalledInRange?: number;
    inRange: number;
    growthPct: number;
    series: Array<{ label: string; installs: number }>;
    funnel?: {
      installed: number;
      firstUse: number;
      free: number;
      paid: number;
      convertedFromFree: number;
      uninstalled: number;
      firstUseRatePct: number;
      freeToPaidRatePct: number;
      uninstallRatePct: number;
      averageDaysToPaid: number | null;
    };
  };
  tryOns: {
    initiated: number;
    completed: number;
    failed: number;
    lifetime: number;
    completionGrowthPct: number;
    initiatedGrowthPct: number;
    daily: Array<{ date: string; label?: string; initiated: number; completed: number; failed: number }>;
  };
  impressions: {
    total: number;
    growthPct: number;
    countrySplit: Array<{ iso2: string; name: string; count: number }>;
  };
  topMerchants: Array<{
    shopId: string;
    shopDomain: string;
    shopName: string;
    ownerEmail: string | null;
    status: "active" | "suspended" | "uninstalled";
    installedAt: string;
    rangeTryOns: number;
    lifetimeTryOns: number;
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

export interface OverviewSignal {
  label: string;
  value: string;
  helper: string;
  tone: "blue" | "green" | "yellow" | "purple";
}

export interface ShopifyDashboardView {
  tryOnRange: ShopifyDashboardRange;
  installRange: ShopifyDashboardRange;
  selectedDate: string | null;
  tryOnRangeLabel: string;
  installRangeLabel: string;
  revenue: OverviewMetric;
  tryOns: OverviewMetric;
  installs: OverviewMetric;
  impressions: OverviewMetric;
  revenueSeries: Array<{ date: string; label: string; completed: number; initiated: number }>;
  installSeries: Array<{ label: string; installs: number }>;
  installFunnel: Array<{ label: string; value: string; helper: string }>;
  signals: OverviewSignal[];
  topMerchants: Array<{ title: string; meta: string; value: string; accent: "blue" | "yellow" | "purple" }>;
  deviceBubbles: Array<{ label: string; value: string; percent: number; tone: "blue" | "yellow" | "purple" }>;
  map: PreparedMapData;
  countries: Array<{ label: string; count: string; iso2: string }>;
}
