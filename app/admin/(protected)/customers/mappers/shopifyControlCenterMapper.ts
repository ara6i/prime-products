import type {
  CustomerDetailField,
  CustomerListItem,
  ShopifyBehaviorAnalyticsRaw,
  ShopifyControlCenterRaw,
  ShopifyControlCenterView,
  ShopifyMetricCard,
  ShopifyRevenueAnalyticsRaw,
} from "../types";
import type { PreparedMapData } from "@/app/customer/dashboard/utils/map/prepareCustomerMapData";

const FREE_PLAN_PRODUCT_LIMIT = 50;

function formatNumber(value: number | null | undefined): string {
  if (typeof value !== "number") return "Not tracked";
  return new Intl.NumberFormat("en-US").format(value);
}

function formatCurrency(value: number | null | undefined, currency = "USD"): string {
  if (typeof value !== "number") return "Not tracked";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function formatInputDate(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function titleCase(value: string | null | undefined): string {
  if (!value) return "Not available";
  if (value.trim().toLowerCase() === "unknown") return "Unknown device";
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function percent(value: number | null | undefined): string {
  if (typeof value !== "number") return "0%";
  return `${Math.round(value * 100)}%`;
}

function formatShortDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(date);
}

function statusTone(status: string): CustomerListItem["statusTone"] {
  if (status === "active") return "success";
  if (status === "suspended") return "warning";
  if (status === "uninstalled" || status === "archived") return "danger";
  return "default";
}

function card(label: string, value: string, helper: string): ShopifyMetricCard {
  return { label, value, helper };
}

function toneByIndex(index: number): "blue" | "yellow" | "purple" {
  return index % 3 === 0 ? "blue" : index % 3 === 1 ? "yellow" : "purple";
}

function technicalField(label: string, value: string | null | undefined): CustomerDetailField {
  return { label, value: value?.trim() || "Not available" };
}

function fallbackBehavior(): ShopifyBehaviorAnalyticsRaw {
  return {
    range: { days: 30, from: new Date().toISOString() },
    kpis: {
      uniqueSessions: 0,
      initiated: 0,
      completed: 0,
      failed: 0,
      sizeShown: 0,
      sizeAccepted: 0,
      cartAdds: 0,
      completionRate: 0,
      sizeAcceptanceRate: 0,
    },
    dailyActivity: [],
    deviceSplit: [],
    countrySplit: [],
    topProducts: [],
    funnel: [],
  };
}

function fallbackRevenue(): ShopifyRevenueAnalyticsRaw {
  return {
    range: { days: 30, from: new Date().toISOString() },
    currency: "USD",
    orders: {
      total: 0,
      paid: 0,
      revenue: 0,
      paidRevenue: 0,
      refundedAmount: 0,
    },
    attribution: {
      attributedOrders: 0,
      attributedPaidOrders: 0,
      attributedRevenue: 0,
      attributedPaidRevenue: 0,
      completedTryOns: 0,
      conversionRate: 0,
    },
    refundRate: 0,
    topProductsByRevenue: [],
  };
}

export function mapShopifyControlCenter(
  raw: ShopifyControlCenterRaw,
  behaviorRaw?: ShopifyBehaviorAnalyticsRaw | null,
  revenueRaw?: ShopifyRevenueAnalyticsRaw | null,
  preparedMap?: PreparedMapData | null,
): ShopifyControlCenterView {
  const behavior = behaviorRaw ?? fallbackBehavior();
  const revenue = revenueRaw ?? fallbackRevenue();
  const currency = raw.billing.currency || raw.store.currency || revenue.currency || "USD";
  const planLabel = titleCase(raw.billing.plan);
  const statusLabel = titleCase(raw.store.status);
  const subscriptionLabel = titleCase(raw.billing.subscriptionStatus);
  const currentPeriodEndLabel = formatDate(raw.billing.currentPeriodEnd);
  const storeName = raw.store.shopName || raw.store.shopDomain;
  const websiteDomain = raw.store.primaryDomain || raw.store.shopDomain;
  const ownerEmail = raw.store.ownerEmail || "Not available";
  const normalizedPlan = String(raw.billing.plan ?? "").trim().toLowerCase();
  const isFreePlan =
    !normalizedPlan || normalizedPlan === "free" || normalizedPlan === "pilot" || normalizedPlan === "test";
  const productAllowance =
    raw.billing.selectedProductCount ??
    raw.billing.scheduledProductCount ??
    (isFreePlan ? FREE_PLAN_PRODUCT_LIMIT : 0);
  const trialStatusLabel =
    raw.trial.accessReason === "TRIAL_ACTIVE"
      ? "Trial active"
      : raw.trial.accessReason === "TRIAL_EXPIRED"
        ? "Trial expired"
        : raw.trial.accessReason === "ACTIVE_PLAN"
          ? "Paid plan active"
          : titleCase(raw.trial.accessReason);
  const deviceTotal = behavior.deviceSplit.reduce((sum, item) => sum + item.count, 0);
  const funnelMax = Math.max(1, ...behavior.funnel.map((item) => item.count));

  return {
    id: raw.store.id,
    storeName,
    websiteDomain,
    websiteUrl: raw.store.primaryDomainUrl ?? null,
    shopDomain: raw.store.shopDomain,
    ownerEmail,
    status: raw.store.status,
    statusLabel,
    statusTone: statusTone(raw.store.status),
    planLabel,
    subscriptionLabel,
    currentPeriodEndLabel,
    isTestBilling: raw.billing.isTest,
    summaryCards: [
      card("Monthly spend", formatCurrency(raw.billing.monthlySpend, currency), "Current PrimeStyleAI plan"),
      card("Products", formatNumber(productAllowance), "Products covered by plan"),
      card("Try-on balance", formatNumber(raw.usage.tryOnsRemaining), `${formatNumber(raw.usage.tryOnsUsed)} used`),
      card("Due date", currentPeriodEndLabel, "Current billing period end"),
    ],
    billingCards: [
      card("Plan", planLabel, "Current billing plan"),
      card("Monthly total", formatCurrency(raw.billing.monthlySpend, currency), "Platform plus try-on package"),
      card("Annual run rate", formatCurrency(raw.billing.estimatedAnnualSpend, currency), "Estimated from current monthly total"),
      card("Next plan", formatCurrency(raw.billing.scheduledMonthlySpend, currency), `${formatNumber(raw.billing.scheduledProductCount)} products / ${formatNumber(raw.billing.scheduledTryOnPackQuantity)} try-ons`),
      card("Platform fee", formatCurrency(raw.billing.platformFee, currency), "Product coverage fee"),
      card("Try-on pack", formatCurrency(raw.billing.tryOnPackPrice, currency), `${formatNumber(raw.billing.tryOnPackQuantity)} included try-ons`),
    ],
    usageCards: [
      card("Used", formatNumber(raw.usage.tryOnsUsed), `${raw.usage.usagePercent}% of tracked balance`),
      card("Remaining", formatNumber(raw.usage.tryOnsRemaining), "Available to shoppers"),
      card("Size charts", formatNumber(raw.usage.activeSizeCharts), "Configured chart templates"),
      card("Linked products", formatNumber(raw.usage.linkedProducts), "Products with sizing links"),
    ],
    trialCards: [
      card("Trial status", trialStatusLabel, raw.trial.accessMessage),
      card("Trial ends", formatDate(raw.trial.trialEndsAt), `${formatNumber(raw.trial.daysRemaining)} days remaining`),
      card("50% email", formatDate(raw.usage.usageAlert50SentAt), "Usage threshold automation"),
      card("80% email", formatDate(raw.usage.usageAlert80SentAt), "Usage threshold automation"),
    ],
    trial: {
      statusLabel: trialStatusLabel,
      message: raw.trial.accessMessage,
      startedAtLabel: formatDate(raw.trial.trialStartedAt),
      endsAtLabel: formatDate(raw.trial.trialEndsAt),
      endingSoonEmailLabel: formatDate(raw.trial.trialEndingSoonEmailSentAt),
      expiredEmailLabel: formatDate(raw.trial.trialExpiredEmailSentAt),
      canUseStorefront: raw.trial.canUseStorefront,
    },
    billingFormDefaults: {
      plan: raw.billing.plan || "custom",
      selectedProductCount: productAllowance,
      requestedTryOns: raw.billing.tryOnPackQuantity ?? raw.billing.scheduledTryOnPackQuantity ?? raw.usage.tryOnsLimit,
      scheduledEffectiveAt: formatInputDate(raw.billing.scheduledEffectiveAt),
      currentPeriodEnd: formatInputDate(raw.billing.currentPeriodEnd),
      billingUsageEnabled: raw.billing.usageBillingEnabled,
      billingAutoRefillEnabled: raw.billing.autoRefillEnabled,
    },
    usageFormDefaults: {
      tryOnsRemaining: raw.usage.tryOnsRemaining,
      tryOnsUsed: raw.usage.tryOnsUsed,
    },
    profile: {
      label: raw.storeProfile?.hasSizeGuideMapping ? "Size guide mapping connected" : "No size guide mapping",
      helper: raw.storeProfile
        ? `Profile updated ${formatDate(raw.storeProfile.updatedAt)}`
        : "No linked Shopify store profile",
    },
    technicalRows: [
      technicalField("Subscription id", raw.technical.subscriptionId),
      technicalField("Usage line item id", raw.technical.usageLineItemId),
      technicalField("Store profile id", raw.technical.storeProfileId),
      technicalField("Last billing override", formatDate(raw.technical.adminBillingOverrideAt)),
      technicalField("Billing override note", raw.technical.adminBillingOverrideNote),
      technicalField("Last usage adjustment", formatDate(raw.technical.adminUsageAdjustmentAt)),
      technicalField("Usage adjustment note", raw.technical.adminUsageAdjustmentNote),
      technicalField("Trial started", formatDate(raw.trial.trialStartedAt)),
      technicalField("Trial ends", formatDate(raw.trial.trialEndsAt)),
      technicalField("Trial warning email", formatDate(raw.trial.trialEndingSoonEmailSentAt)),
      technicalField("Trial-ended email", formatDate(raw.trial.trialExpiredEmailSentAt)),
    ],
    analytics: {
      rangeLabel: `${behavior.range.days} days`,
      behaviorCards: [
        card("Sessions", formatNumber(behavior.kpis.uniqueSessions), "Unique shopper sessions"),
        card("Try-ons", formatNumber(behavior.kpis.completed), `${formatNumber(behavior.kpis.initiated)} started`),
        card("Completion", percent(behavior.kpis.completionRate), `${formatNumber(behavior.kpis.failed)} failed`),
        card("Size acceptance", percent(behavior.kpis.sizeAcceptanceRate), `${formatNumber(behavior.kpis.sizeAccepted)} accepted`),
      ],
      revenueCards: [
        card("Paid revenue", formatCurrency(revenue.orders.paidRevenue, revenue.currency), `${formatNumber(revenue.orders.paid)} paid orders`),
        card("Try-on revenue", formatCurrency(revenue.attribution.attributedPaidRevenue, revenue.currency), `${formatNumber(revenue.attribution.attributedPaidOrders)} attributed paid orders`),
        card("Conversion", percent(revenue.attribution.conversionRate), "Completed try-ons to paid orders"),
        card("Refund rate", percent(revenue.refundRate), formatCurrency(revenue.orders.refundedAmount, revenue.currency)),
      ],
      dailyActivity: behavior.dailyActivity.map((point) => ({
        date: point.date,
        label: formatShortDate(point.date),
        completed: point.completed,
        initiated: point.initiated,
      })),
      deviceBubbles: behavior.deviceSplit
        .slice()
        .sort((a, b) => b.count - a.count)
        .slice(0, 3)
        .map((item, index) => ({
          label: titleCase(item.device),
          value: formatNumber(item.count),
          percent: deviceTotal > 0 ? Math.round((item.count / deviceTotal) * 100) : 0,
          tone: toneByIndex(index),
        })),
      countrySplit: behavior.countrySplit
        .slice()
        .sort((a, b) => b.count - a.count),
      topProducts: behavior.topProducts
        .slice()
        .sort((a, b) => b.tryOns - a.tryOns)
        .slice(0, 5)
        .map((product, index) => ({
          title: product.productTitle || product.productId || "Unknown product",
          meta: product.productId,
          value: formatNumber(product.tryOns),
          accent: toneByIndex(index),
        })),
      revenueProducts: revenue.topProductsByRevenue
        .slice()
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5)
        .map((product, index) => ({
          title: product.title || product.productId || "Unknown product",
          meta: `${formatNumber(product.orders)} orders`,
          value: formatCurrency(product.revenue, revenue.currency),
          accent: toneByIndex(index),
        })),
      funnel: behavior.funnel.map((item) => ({
        step: titleCase(item.step),
        count: formatNumber(item.count),
        percent: Math.round((item.count / funnelMax) * 100),
      })),
      map: preparedMap ?? null,
    },
  };
}
