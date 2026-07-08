import type {
  CustomerDashboardDailyPoint,
  CustomerDashboardRawOverview,
  CustomerDashboardTopProduct,
} from "../types";
import type {
  CustomerOverviewActivityRow,
  CustomerOverviewActivityStatus,
  CustomerOverviewChartPoint,
  CustomerOverviewProduct,
  CustomerOverviewStat,
  CustomerOverviewUsageLimit,
  CustomerOverviewViewModel,
} from "../types/overview";
import { formatCompactNumber, formatPercent, formatShortDate } from "../utils/formatters";

interface CustomerOverviewMapperInput {
  metrics: {
    tryOnsStarted: number;
    tryOnsCompleted: number;
    sizeAccepted: number;
    addToCart: number;
    completionRate: number;
    sizeAcceptanceRate: number;
  };
  dailyActivity: CustomerDashboardDailyPoint[];
  topProducts: CustomerDashboardTopProduct[];
  live: boolean;
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

function formatDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function safePercent(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.min(100, Math.round((numerator / denominator) * 100));
}

function statusFromCode(statusCode: number): CustomerOverviewActivityStatus {
  if (statusCode >= 500) return "failed";
  if (statusCode >= 400) return "pending";
  return "completed";
}

function statusLabel(status: CustomerOverviewActivityStatus): string {
  switch (status) {
    case "completed":
      return "Completed";
    case "pending":
      return "Needs review";
    case "failed":
      return "Failed";
  }
}

function compactRequestId(id: string): string {
  return id.length > 8 ? `REQ_${id.slice(-8).toUpperCase()}` : `REQ_${id.toUpperCase()}`;
}

function friendlyEndpoint(endpoint: string): string {
  const normalized = endpoint.replace(/^\/api\/v1\//, "").replace(/^\/api\//, "");
  return normalized
    .split(/[/?_-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function mapStats(raw: CustomerDashboardRawOverview, input: CustomerOverviewMapperInput): CustomerOverviewStat[] {
  const billing = raw.billing;
  const activePlanValue = billing?.active ? formatMoney(billing.totalMonthlyPrice) : "Free";

  return [
    {
      label: "Plan value",
      value: activePlanValue,
      detail: billing?.active ? "Billed monthly" : "No active plan",
      icon: "billing",
      tone: "primary",
    },
    {
      label: "Try-ons completed",
      value: formatCompactNumber(input.metrics.tryOnsCompleted),
      detail: `${formatPercent(input.metrics.completionRate)} completion`,
      icon: "tryOn",
      tone: "strong",
    },
    {
      label: "Size accepts",
      value: formatCompactNumber(input.metrics.sizeAccepted),
      detail: `${formatPercent(input.metrics.sizeAcceptanceRate)} accepted`,
      icon: "sizing",
      tone: "green",
    },
    {
      label: "Cart adds",
      value: formatCompactNumber(input.metrics.addToCart),
      detail: "From try-on sessions",
      icon: "products",
      tone: "neutral",
    },
  ];
}

function mapPlan(raw: CustomerDashboardRawOverview): CustomerOverviewViewModel["plan"] {
  const billing = raw.billing;
  if (!billing?.active) {
    return {
      title: "Plan snapshot",
      value: "Free workspace",
      detail: "Select a plan to unlock product access and monthly try-ons.",
      productLabel: "200 product access",
      tryOnLabel: "50 monthly try-ons",
      renewalLabel: "No renewal scheduled",
    };
  }

  return {
    title: billing.planName,
    value: `${formatMoney(billing.totalMonthlyPrice)}/mo`,
    detail: billing.currentPeriodEnd ? `Renews ${formatShortDate(billing.currentPeriodEnd)}` : "Active monthly plan",
    productLabel: `${billing.selectedProductCount.toLocaleString()} selected / ${billing.productAccessLimit.toLocaleString()} access`,
    tryOnLabel: `${billing.totalTryOnLimit.toLocaleString()} monthly try-ons`,
    renewalLabel: billing.autoRefillEnabled ? "Auto-refill on" : "Auto-refill off",
  };
}

function mapUsageLimit(raw: CustomerDashboardRawOverview, input: CustomerOverviewMapperInput): CustomerOverviewUsageLimit {
  const billing = raw.billing;
  const limit = billing?.active ? billing.totalTryOnLimit : 50;
  const used = input.metrics.tryOnsStarted;

  return {
    title: "Monthly try-on limit",
    usedLabel: `${used.toLocaleString()} used`,
    limitLabel: `${limit.toLocaleString()} available`,
    percent: safePercent(used, limit),
  };
}

function mapChart(points: CustomerDashboardDailyPoint[]): CustomerOverviewChartPoint[] {
  return points.slice(-8).map((point) => ({
    label: formatShortDate(point.date),
    completed: point.completed,
    initiated: point.initiated,
  }));
}

function mapProducts(products: CustomerDashboardTopProduct[]): CustomerOverviewProduct[] {
  const max = products[0]?.tryOns ?? 0;

  return products.slice(0, 4).map((product) => ({
    id: product.productId,
    title: product.productTitle,
    detail: "Try-on demand",
    value: product.tryOns.toLocaleString(),
    percent: safePercent(product.tryOns, max),
  }));
}

function mapActivities(raw: CustomerDashboardRawOverview): CustomerOverviewActivityRow[] {
  const rows = raw.api.recentRequests;
  if (!rows.length) return [];

  return rows.map((request) => {
    const status = statusFromCode(request.statusCode);

    return {
      id: request.id,
      requestId: compactRequestId(request.id),
      activity: friendlyEndpoint(request.endpoint),
      detail: `${request.method} ${request.endpoint}`,
      value: `${request.responseTimeMs}ms`,
      status,
      statusLabel: statusLabel(status),
      dateLabel: formatDateTime(request.createdAt),
    };
  });
}

export function mapCustomerOverview(
  raw: CustomerDashboardRawOverview,
  input: CustomerOverviewMapperInput,
): CustomerOverviewViewModel {
  const greetingName = raw.store.merchantName || raw.store.storeName;

  return {
    greetingName,
    subtitle: input.live
      ? "Monitor storefront usage, product access, and SDK activity."
      : "No SDK events found for this selected range yet.",
    plan: mapPlan(raw),
    stats: mapStats(raw, input),
    usageLimit: mapUsageLimit(raw, input),
    chart: mapChart(input.dailyActivity),
    products: mapProducts(input.topProducts),
    activities: mapActivities(raw),
  };
}
