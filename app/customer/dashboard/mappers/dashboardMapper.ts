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

interface PreviewDashboardData {
  metrics: DashboardMetrics;
  dailyActivity: CustomerDashboardDailyPoint[];
  funnel: CustomerDashboardFunnelStep[];
  deviceSplit: CustomerDashboardDeviceSlice[];
  countrySplit: CustomerDashboardCountrySlice[];
  topProducts: CustomerDashboardTopProduct[];
  sizeInsights: CustomerDashboardSizeInsight[];
  hourHistogram: number[];
  weekdayHistogram: number[];
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

function scaleByRange(value: number, days: number): number {
  return Math.max(1, Math.round((value / 30) * days));
}

function daysToRange(days: number): CustomerDashboardRange {
  if (days <= 7) return "7d";
  if (days >= 90) return "90d";
  return "30d";
}

function toIsoDate(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString();
}

function createPreviewActivity(days: number): CustomerDashboardDailyPoint[] {
  const visiblePoints = days <= 7 ? 7 : days <= 30 ? 10 : 12;
  const step = Math.max(1, Math.floor(days / visiblePoints));
  const baseline = days <= 7 ? 92 : days >= 90 ? 580 : 240;

  return Array.from({ length: visiblePoints }, (_, index) => {
    const remaining = (visiblePoints - index - 1) * step;
    const lift = index * (days <= 7 ? 11 : days >= 90 ? 38 : 19);
    const wave = Math.round(Math.sin(index * 1.15) * (days <= 7 ? 12 : days >= 90 ? 58 : 26));
    const initiated = Math.max(12, baseline + lift + wave);
    const completed = Math.round(initiated * (0.68 + (index % 3) * 0.025));

    return {
      date: toIsoDate(remaining),
      initiated,
      completed,
      failed: Math.max(1, Math.round(initiated * 0.018)),
    };
  });
}

function createPreviewHistogram(days: number): number[] {
  const scale = days <= 7 ? 1 : days >= 90 ? 7 : 3;
  return Array.from({ length: 24 }, (_, hour) => {
    const morning = hour >= 9 && hour <= 12 ? 14 : 0;
    const evening = hour >= 18 && hour <= 22 ? 24 : 0;
    const base = hour >= 7 && hour <= 23 ? 5 : 1;
    return (base + morning + evening + (hour % 4)) * scale;
  });
}

function createPreviewWeekdays(days: number): number[] {
  const scale = days <= 7 ? 1 : days >= 90 ? 8 : 3;
  return [38, 52, 61, 59, 66, 74, 48].map((value) => value * scale);
}

function createPreviewData(raw: CustomerDashboardRawOverview): PreviewDashboardData {
  const days = raw.range.days;
  const metrics: DashboardMetrics = {
    productViews: scaleByRange(38200, days),
    uniqueVisitors: scaleByRange(12430, days),
    tryOnsStarted: scaleByRange(4820, days),
    tryOnsCompleted: scaleByRange(3470, days),
    sizeRecommendations: scaleByRange(3510, days),
    sizeAccepted: scaleByRange(2350, days),
    addToCart: scaleByRange(918, days),
    completionRate: 0.72,
    sizeAcceptanceRate: 0.67,
  };

  return {
    metrics,
    dailyActivity: createPreviewActivity(days),
    funnel: [
      { step: "Product views", count: metrics.productViews },
      { step: "Try-ons started", count: metrics.tryOnsStarted },
      { step: "Try-ons completed", count: metrics.tryOnsCompleted },
      { step: "Cart adds", count: metrics.addToCart },
    ],
    deviceSplit: [
      { device: "mobile", count: Math.round(metrics.tryOnsStarted * 0.64) },
      { device: "desktop", count: Math.round(metrics.tryOnsStarted * 0.29) },
      { device: "tablet", count: Math.round(metrics.tryOnsStarted * 0.07) },
    ],
    countrySplit: [
      { iso2: "US", name: "United States", count: scaleByRange(1850, days) },
      { iso2: "GB", name: "United Kingdom", count: scaleByRange(740, days) },
      { iso2: "CA", name: "Canada", count: scaleByRange(520, days) },
      { iso2: "DE", name: "Germany", count: scaleByRange(390, days) },
      { iso2: "FR", name: "France", count: scaleByRange(330, days) },
      { iso2: "AE", name: "United Arab Emirates", count: scaleByRange(270, days) },
    ],
    topProducts: [
      { productId: "preview-linen-shirt", productTitle: "Linen Shirt", tryOns: scaleByRange(4820, days) },
      { productId: "preview-tailored-blazer", productTitle: "Tailored Blazer", tryOns: scaleByRange(3590, days) },
      { productId: "preview-midi-dress", productTitle: "Midi Dress", tryOns: scaleByRange(5210, days) },
      { productId: "preview-straight-jeans", productTitle: "Straight Jeans", tryOns: scaleByRange(4100, days) },
      { productId: "preview-oversized-coat", productTitle: "Oversized Coat", tryOns: scaleByRange(2960, days) },
    ].sort((a, b) => b.tryOns - a.tryOns),
    sizeInsights: [
      {
        gender: "women",
        shoppers: scaleByRange(6820, days),
        recommendations: scaleByRange(2180, days),
        accepted: scaleByRange(1504, days),
        changedAfterTryOn: scaleByRange(642, days),
        acceptanceRate: 0.69,
        topSizes: [
          { label: "S", count: scaleByRange(510, days), percent: 34 },
          { label: "M", count: scaleByRange(465, days), percent: 31 },
          { label: "L", count: scaleByRange(302, days), percent: 20 },
        ],
      },
      {
        gender: "men",
        shoppers: scaleByRange(5610, days),
        recommendations: scaleByRange(1330, days),
        accepted: scaleByRange(944, days),
        changedAfterTryOn: scaleByRange(386, days),
        acceptanceRate: 0.71,
        topSizes: [
          { label: "M", count: scaleByRange(348, days), percent: 37 },
          { label: "L", count: scaleByRange(292, days), percent: 31 },
          { label: "XL", count: scaleByRange(179, days), percent: 19 },
        ],
      },
    ],
    hourHistogram: createPreviewHistogram(days),
    weekdayHistogram: createPreviewWeekdays(days),
  };
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

function mapNavItems(): CustomerDashboardNavItem[] {
  return [
    { label: "Overview", href: "/customer/dashboard", icon: "dashboard", active: true, disabled: false },
    { label: "Analytics", href: "/customer/dashboard/analytics", icon: "behavior", active: false, disabled: true },
    { label: "Products", href: "/customer/dashboard/products", icon: "products", active: false, disabled: true },
    { label: "Settings", href: "/customer/dashboard/settings", icon: "settings", active: false, disabled: true },
  ];
}

function mapRangeOptions(activeRange: CustomerDashboardRange, activeView: CustomerDashboardView): CustomerDashboardRangeOption[] {
  return rangeOptions.map((option) => ({
    ...option,
    href: `/customer/dashboard?range=${option.value}&view=${activeView}`,
    active: option.value === activeRange,
  }));
}

function mapViewOptions(activeRange: CustomerDashboardRange, activeView: CustomerDashboardView): CustomerDashboardViewOption[] {
  return viewOptions.map((option) => ({
    ...option,
    href: `/customer/dashboard?range=${activeRange}&view=${option.value}`,
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
): CustomerDashboardViewModel {
  const ready = raw.workspace.status === "ready";
  const live = hasLiveActivity(raw);
  const preview = live ? null : createPreviewData(raw);
  const metrics = preview?.metrics ?? raw.metrics;
  const activeRange = daysToRange(raw.range.days);
  const dailyActivity = preview?.dailyActivity ?? mapDailyActivity(raw);
  const funnel = preview?.funnel ?? mapFunnel(raw);
  const deviceSplit = preview?.deviceSplit ?? raw.deviceSplit ?? [];
  const countrySplit = preview?.countrySplit ?? raw.countrySplit ?? [];
  const topProducts = preview?.topProducts ?? mapTopProducts(raw);
  const sizeInsights = preview?.sizeInsights ?? raw.sizeInsights ?? [];
  const hourHistogram = preview?.hourHistogram ?? normalizeHistogram(raw.hourHistogram, 24);
  const weekdayHistogram = preview?.weekdayHistogram ?? normalizeHistogram(raw.weekdayHistogram, 7);

  return {
    storeName: raw.store.storeName,
    domain: raw.store.domain,
    ownerEmail: raw.store.ownerEmail,
    projectName: raw.workspace.projectName ?? "Production workspace",
    pageTitle: "Analytics Overview",
    dataModeLabel: live ? "Live storefront data" : "Preview analytics data",
    statusLabel: ready ? "Live workspace" : "Setup needs attention",
    statusTone: ready ? "success" : "warning",
    rangeLabel: `Last ${raw.range.days} days`,
    activeView,
    rangeOptions: mapRangeOptions(activeRange, activeView),
    viewOptions: mapViewOptions(activeRange, activeView),
    navItems: mapNavItems(),
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
  };
}
