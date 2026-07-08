import type {
  CustomerDashboardCountrySlice,
  CustomerDashboardDailyPoint,
  CustomerDashboardDeviceSlice,
  CustomerDashboardFunnelStep,
  CustomerDashboardMetricCard,
  CustomerDashboardNavItem,
  CustomerDashboardNumberRow,
  CustomerDashboardNumberSection,
  CustomerDashboardRange,
  CustomerDashboardRangeOption,
  CustomerDashboardRawActivityPoint,
  CustomerDashboardRawOverview,
  CustomerDashboardSizeInsight,
  CustomerDashboardTopProduct,
  CustomerDashboardView,
  CustomerDashboardViewModel,
  CustomerDashboardViewOption,
} from "../types";
import { mapCustomerOverview } from "./customerOverviewMapper";
import { formatCompactNumber, formatPercent, formatShortDate } from "../utils/formatters";

interface DashboardMetrics {
  productViews: number;
  uniqueVisitors: number;
  tryOnsStarted: number;
  tryOnsCompleted: number;
  sizeRecommendations: number;
  sizeAccepted: number;
  addToCart: number;
  completionRate: number;
  sizeAcceptanceRate: number;
}

const rangeOptions: Array<{ label: string; value: CustomerDashboardRange }> = [
  { label: "7D", value: "7d" },
  { label: "30D", value: "30d" },
  { label: "90D", value: "90d" },
];

const viewOptions: Array<{ label: string; value: CustomerDashboardView }> = [
  { label: "Charts", value: "charts" },
  { label: "Numbers", value: "numbers" },
];

function hasLiveActivity(raw: CustomerDashboardRawOverview): boolean {
  return raw.metrics.tryOnsStarted > 0 || raw.metrics.uniqueVisitors > 0 || raw.metrics.productViews > 0;
}

function daysToRange(days: number): CustomerDashboardRange {
  if (days <= 7) return "7d";
  if (days >= 90) return "90d";
  return "30d";
}

function mapDailyActivity(raw: CustomerDashboardRawOverview): CustomerDashboardDailyPoint[] {
  if (raw.dailyActivity) return raw.dailyActivity;

  return raw.activity.map((point: CustomerDashboardRawActivityPoint) => ({
    date: point.date,
    initiated: point.tryOnsStarted,
    completed: point.tryOnsCompleted,
    failed: point.failed,
  }));
}

function mapFunnel(raw: CustomerDashboardRawOverview): CustomerDashboardFunnelStep[] {
  if (raw.funnel) return raw.funnel;

  return [
    { step: "Product views", count: raw.metrics.productViews },
    { step: "Try-ons started", count: raw.metrics.tryOnsStarted },
    { step: "Try-ons completed", count: raw.metrics.tryOnsCompleted },
    { step: "Cart adds", count: raw.metrics.addToCart },
  ];
}

function mapTopProducts(raw: CustomerDashboardRawOverview): CustomerDashboardTopProduct[] {
  return raw.topProducts.map((product) => ({
    productId: product.productId,
    productTitle: product.productTitle,
    tryOns: product.tryOns,
  }));
}

function mapMetrics(metrics: DashboardMetrics, days: number): CustomerDashboardMetricCard[] {
  return [
    {
      label: "Unique sessions",
      value: formatCompactNumber(metrics.uniqueVisitors),
      detail: `Distinct shoppers in ${days}d`,
      icon: "behavior",
      tone: "neutral",
    },
    {
      label: "Try-ons started",
      value: formatCompactNumber(metrics.tryOnsStarted),
      detail: `${formatCompactNumber(metrics.tryOnsCompleted)} completed`,
      icon: "tryOn",
      tone: "blue",
    },
    {
      label: "Completion rate",
      value: formatPercent(metrics.completionRate),
      detail: "Completed / started",
      icon: "conversion",
      tone: "green",
    },
    {
      label: "Cart adds",
      value: formatCompactNumber(metrics.addToCart),
      detail: "From try-on sessions",
      icon: "products",
      tone: "amber",
    },
  ];
}

type CustomerDashboardNavKey = "overview" | "analytics" | "docs" | "products" | "plans" | "settings";

function mapNavItems(activeNav: CustomerDashboardNavKey = "overview"): CustomerDashboardNavItem[] {
  return [
    { label: "Overview", href: "/customer/dashboard", icon: "dashboard", active: activeNav === "overview", disabled: false },
    { label: "Analytics", href: "/customer/dashboard/analytics", icon: "behavior", active: activeNav === "analytics", disabled: false },
    { label: "Documentation", href: "/customer/dashboard/docs", icon: "docs", active: activeNav === "docs", disabled: false },
    { label: "Products", href: "/customer/dashboard/products", icon: "products", active: activeNav === "products", disabled: false },
    { label: "Plans", href: "/customer/dashboard/plans", icon: "billing", active: activeNav === "plans", disabled: false },
    { label: "Settings", href: "/customer/dashboard/settings", icon: "settings", active: activeNav === "settings", disabled: false },
  ];
}

function mapRangeOptions(
  activeRange: CustomerDashboardRange,
  activeView: CustomerDashboardView,
  baseHref: string,
): CustomerDashboardRangeOption[] {
  return rangeOptions.map((option) => ({
    ...option,
    href: `${baseHref}?range=${option.value}&view=${activeView}`,
    active: option.value === activeRange,
  }));
}

function mapViewOptions(
  activeRange: CustomerDashboardRange,
  activeView: CustomerDashboardView,
  baseHref: string,
): CustomerDashboardViewOption[] {
  return viewOptions.map((option) => ({
    ...option,
    href: `${baseHref}?range=${activeRange}&view=${option.value}`,
    active: option.value === activeView,
  }));
}

function normalizeHistogram(values: number[] | undefined, size: number): number[] {
  if (!values) return Array.from({ length: size }, () => 0);
  return Array.from({ length: size }, (_, index) => values[index] ?? 0);
}

function safePercent(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.min(100, Math.round((numerator / denominator) * 100));
}

function mapFunnelNumberRows(steps: CustomerDashboardFunnelStep[]): CustomerDashboardNumberRow[] {
  const max = steps[0]?.count ?? 0;

  return steps.map((step, index) => {
    const previous = index > 0 ? steps[index - 1]?.count ?? 0 : max;
    const percentOfPrevious = index === 0 ? 100 : safePercent(step.count, previous);

    return {
      label: step.step,
      value: step.count.toLocaleString(),
      detail: index === 0 ? "Starting volume" : `${percentOfPrevious}% of previous`,
      percent: safePercent(step.count, max),
    };
  });
}

function mapActivityNumberRows(points: CustomerDashboardDailyPoint[]): CustomerDashboardNumberRow[] {
  const max = points.reduce((currentMax, point) => Math.max(currentMax, point.initiated), 0);

  return points.slice(-7).reverse().map((point) => ({
    label: formatShortDate(point.date),
    value: point.initiated.toLocaleString(),
    detail: `${point.completed.toLocaleString()} completed · ${point.failed.toLocaleString()} failed`,
    percent: safePercent(point.initiated, max),
  }));
}

function mapDeviceNumberRows(devices: CustomerDashboardDeviceSlice[]): CustomerDashboardNumberRow[] {
  const total = devices.reduce((sum, device) => sum + device.count, 0);

  return devices.map((device) => ({
    label: device.device,
    value: device.count.toLocaleString(),
    detail: `${safePercent(device.count, total)}% of try-ons`,
    percent: safePercent(device.count, total),
  }));
}

function mapCountryNumberRows(countries: CustomerDashboardCountrySlice[]): CustomerDashboardNumberRow[] {
  const total = countries.reduce((sum, country) => sum + country.count, 0);

  return countries.map((country) => ({
    label: country.name,
    value: country.count.toLocaleString(),
    detail: `${safePercent(country.count, total)}% of try-ons`,
    percent: safePercent(country.count, total),
  }));
}

function mapProductNumberRows(products: CustomerDashboardTopProduct[]): CustomerDashboardNumberRow[] {
  const max = products[0]?.tryOns ?? 0;

  return products.slice(0, 7).map((product, index) => ({
    label: `${index + 1}. ${product.productTitle}`,
    value: product.tryOns.toLocaleString(),
    detail: "try-ons",
    percent: safePercent(product.tryOns, max),
  }));
}

function mapPeakNumberRows(hourHistogram: number[], weekdayHistogram: number[]): CustomerDashboardNumberRow[] {
  const weekdayLabels = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const topHours = hourHistogram
    .map((count, hour) => ({ label: `${String(hour).padStart(2, "0")}:00`, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
  const topDays = weekdayHistogram
    .map((count, index) => ({ label: weekdayLabels[index] ?? "Day", count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 3);
  const max = Math.max(...topHours.map((hour) => hour.count), ...topDays.map((day) => day.count), 1);

  return [...topHours, ...topDays].map((item) => ({
    label: item.label,
    value: item.count.toLocaleString(),
    detail: "try-ons",
    percent: safePercent(item.count, max),
  }));
}

function mapSizeInsightNumberRows(sizeInsights: CustomerDashboardSizeInsight[]): CustomerDashboardNumberRow[] {
  return sizeInsights.flatMap((insight) => {
    const genderLabel = insight.gender === "men" ? "Men" : "Women";
    const topSize = insight.topSizes[0];

    return [
      {
        label: `${genderLabel} acceptance rate`,
        value: formatPercent(insight.acceptanceRate),
        detail: `${insight.accepted.toLocaleString()} accepted recommendations`,
        percent: Math.round(insight.acceptanceRate * 100),
      },
      {
        label: `${genderLabel} top size`,
        value: topSize?.label ?? "No size",
        detail: topSize ? `${topSize.count.toLocaleString()} shoppers` : "Waiting for data",
        percent: topSize?.percent ?? 0,
      },
      {
        label: `${genderLabel} changed after try-on`,
        value: insight.changedAfterTryOn.toLocaleString(),
        detail: `${safePercent(insight.changedAfterTryOn, insight.recommendations)}% of recommendations`,
        percent: safePercent(insight.changedAfterTryOn, insight.recommendations),
      },
    ];
  });
}

function mapNumberSections({
  dailyActivity,
  funnel,
  deviceSplit,
  countrySplit,
  topProducts,
  sizeInsights,
  hourHistogram,
  weekdayHistogram,
}: {
  dailyActivity: CustomerDashboardDailyPoint[];
  funnel: CustomerDashboardFunnelStep[];
  deviceSplit: CustomerDashboardDeviceSlice[];
  countrySplit: CustomerDashboardCountrySlice[];
  topProducts: CustomerDashboardTopProduct[];
  sizeInsights: CustomerDashboardSizeInsight[];
  hourHistogram: number[];
  weekdayHistogram: number[];
}): CustomerDashboardNumberSection[] {
  return [
    {
      title: "Try-on activity",
      description: "Started, completed, and failed by day",
      rows: mapActivityNumberRows(dailyActivity),
    },
    {
      title: "Conversion funnel",
      description: "Top-down drop-off",
      rows: mapFunnelNumberRows(funnel),
    },
    {
      title: "Customer countries",
      description: "Where try-ons happen",
      rows: mapCountryNumberRows(countrySplit),
    },
    {
      title: "Devices",
      description: "Mobile / desktop split",
      rows: mapDeviceNumberRows(deviceSplit),
    },
    {
      title: "Most tried products",
      description: "Ranked by try-on count",
      rows: mapProductNumberRows(topProducts),
    },
    {
      title: "Size insights",
      description: "Men and women recommendation behavior",
      rows: mapSizeInsightNumberRows(sizeInsights),
    },
    {
      title: "Peak activity",
      description: "Top hours and days",
      rows: mapPeakNumberRows(hourHistogram, weekdayHistogram),
    },
  ];
}

export function mapCustomerDashboard(
  raw: CustomerDashboardRawOverview,
  activeView: CustomerDashboardView = "charts",
  activeNav: CustomerDashboardNavKey = "overview",
): CustomerDashboardViewModel {
  const ready = raw.workspace.status === "ready";
  const live = hasLiveActivity(raw);
  const metrics = raw.metrics;
  const activeRange = daysToRange(raw.range.days);
  const dailyActivity = mapDailyActivity(raw);
  const funnel = mapFunnel(raw);
  const deviceSplit = raw.deviceSplit ?? [];
  const countrySplit = raw.countrySplit ?? [];
  const topProducts = mapTopProducts(raw);
  const sizeInsights = raw.sizeInsights ?? [];
  const hourHistogram = normalizeHistogram(raw.hourHistogram, 24);
  const weekdayHistogram = normalizeHistogram(raw.weekdayHistogram, 7);
  const overview = mapCustomerOverview(raw, {
    metrics,
    dailyActivity,
    topProducts,
    live,
  });

  return {
    storeName: raw.store.storeName,
    domain: raw.store.domain,
    ownerEmail: raw.store.ownerEmail,
    projectName: raw.workspace.projectName ?? "Production workspace",
    workspaceStatus: raw.workspace.status,
    productionKeyReady: raw.setup.productionKeyReady,
    latestKeyPrefix: raw.workspace.latestKeyPrefix,
    pageTitle: activeNav === "analytics"
      ? "Analytics"
      : activeNav === "docs"
      ? "Documentation"
      : activeNav === "products"
        ? "Products"
        : activeNav === "plans"
          ? "Plans"
          : activeNav === "settings"
            ? "Settings"
            : "Overview",
    dataModeLabel: live ? "Live SDK data" : "No SDK events yet",
    statusLabel: ready ? "Live workspace" : "Setup needs attention",
    statusTone: ready ? "success" : "warning",
    rangeLabel: `Last ${raw.range.days} days`,
    activeView,
    rangeOptions: mapRangeOptions(
      activeRange,
      activeView,
      activeNav === "analytics" ? "/customer/dashboard/analytics" : "/customer/dashboard",
    ),
    viewOptions: mapViewOptions(
      activeRange,
      activeView,
      activeNav === "analytics" ? "/customer/dashboard/analytics" : "/customer/dashboard",
    ),
    navItems: mapNavItems(activeNav),
    metricCards: mapMetrics(metrics, raw.range.days),
    dailyActivity,
    funnel,
    deviceSplit,
    countrySplit,
    topProducts,
    sizeInsights,
    hourHistogram,
    weekdayHistogram,
    numberSections: mapNumberSections({
      dailyActivity,
      funnel,
      deviceSplit,
      countrySplit,
      topProducts,
      sizeInsights,
      hourHistogram,
      weekdayHistogram,
    }),
    overview,
  };
}
