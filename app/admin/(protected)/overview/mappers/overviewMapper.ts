import { prepareCustomerMapData } from "@/app/customer/dashboard/utils/map/prepareCustomerMapData";
import type {
  OverviewMetric,
  ShopifyDashboardRange,
  ShopifyDashboardRaw,
  ShopifyDashboardView,
} from "../types";

const rangeLabels: Record<ShopifyDashboardRange, string> = {
  today: "Today",
  week: "This week",
  month: "This month",
  range: "90 days",
};

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatCurrency(value: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

function trend(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value}%`;
}

function metric(
  label: string,
  value: string,
  helper: string,
  tone: OverviewMetric["tone"],
  trendValue?: number,
): OverviewMetric {
  return {
    label,
    value,
    helper,
    tone,
    trend: typeof trendValue === "number" ? trend(trendValue) : undefined,
  };
}

function deviceTone(index: number): "blue" | "yellow" | "purple" {
  return index === 1 ? "yellow" : index === 2 ? "purple" : "blue";
}

function rowAccent(index: number): "blue" | "yellow" | "purple" {
  return index === 1 ? "yellow" : index === 2 ? "purple" : "blue";
}

export async function mapShopifyDashboardOverview(raw: ShopifyDashboardRaw): Promise<ShopifyDashboardView> {
  const tryOnRange = raw.ranges?.tryOns ?? raw.range;
  const installRange = raw.ranges?.installs ?? raw.range;
  const deviceTotal = raw.deviceSplit.reduce((sum, item) => sum + item.count, 0);
  const map = await prepareCustomerMapData(raw.impressions.countrySplit, 960, 430);
  const funnel = raw.installs.funnel;

  return {
    tryOnRange,
    installRange,
    selectedDate: raw.ranges?.date ?? null,
    tryOnRangeLabel: rangeLabels[tryOnRange],
    installRangeLabel: rangeLabels[installRange],
    revenue: metric(
      "Revenue",
      formatCurrency(raw.revenue.monthly, raw.currency),
      "Monthly Shopify billing",
      "green",
    ),
    tryOns: metric(
      "Try-ons",
      formatNumber(raw.tryOns.completed),
      `${formatNumber(raw.tryOns.lifetime)} lifetime completed`,
      "blue",
      raw.tryOns.completionGrowthPct,
    ),
    installs: metric(
      "Installs",
      formatNumber(raw.installs.inRange),
      `${formatNumber(raw.installs.active)} active stores`,
      "purple",
      raw.installs.growthPct,
    ),
    impressions: metric(
      "Impressions",
      formatNumber(raw.impressions.total),
      "Try-on starts worldwide",
      "yellow",
      raw.impressions.growthPct,
    ),
    revenueSeries: raw.tryOns.daily.map((point) => ({
      date: point.date,
      label: point.label ?? point.date,
      completed: point.completed,
      initiated: point.initiated,
    })),
    installSeries: raw.installs.series,
    installFunnel: funnel ? [
      {
        label: "First use",
        value: formatNumber(funnel.firstUse),
        helper: `${funnel.firstUseRatePct}% of installs`,
      },
      {
        label: "Free to paid",
        value: formatNumber(funnel.convertedFromFree),
        helper: `${funnel.freeToPaidRatePct}% conversion`,
      },
      {
        label: "Uninstalled",
        value: formatNumber(funnel.uninstalled),
        helper: `${funnel.uninstallRatePct}% uninstall rate`,
      },
      {
        label: "Avg days to paid",
        value: funnel.averageDaysToPaid === null ? "n/a" : String(funnel.averageDaysToPaid),
        helper: `${formatNumber(funnel.paid)} paid · ${formatNumber(funnel.free)} free`,
      },
    ] : [],
    topMerchants: raw.topMerchants.map((merchant, index) => ({
      title: merchant.shopName || merchant.shopDomain,
      meta: `${merchant.ownerEmail ?? merchant.shopDomain} · ${merchant.status}`,
      value: formatNumber(merchant.rangeTryOns || merchant.lifetimeTryOns),
      accent: rowAccent(index),
    })),
    deviceBubbles: raw.deviceSplit.map((item, index) => ({
      label: item.device,
      value: formatNumber(item.count),
      percent: deviceTotal > 0 ? Math.round((item.count / deviceTotal) * 100) : 0,
      tone: deviceTone(index),
    })),
    map,
    countries: raw.impressions.countrySplit.slice(0, 5).map((country) => ({
      label: country.name,
      count: formatNumber(country.count),
      iso2: country.iso2,
    })),
  };
}
