import type {
  CustomerDetailField,
  CustomerListItem,
  ShopifyBehaviorAnalyticsRaw,
  ShopifyControlCenterRaw,
  ShopifyControlCenterView,
  ShopifyMetricCard,
  ShopifyRevenueAnalyticsRaw,
} from "../types";

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

function statusTone(status: string): CustomerListItem["statusTone"] {
  if (status === "active") return "success";
  if (status === "suspended") return "warning";
  if (status === "uninstalled" || status === "archived") return "danger";
  return "default";
}

function card(label: string, value: string, helper: string): ShopifyMetricCard {
  return { label, value, helper };
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
): ShopifyControlCenterView {
  const behavior = behaviorRaw ?? fallbackBehavior();
  const revenue = revenueRaw ?? fallbackRevenue();
  const currency = raw.billing.currency || raw.store.currency || revenue.currency || "USD";
  const planLabel = titleCase(raw.billing.plan);
  const statusLabel = titleCase(raw.store.status);
  const subscriptionLabel = titleCase(raw.billing.subscriptionStatus);
  const currentPeriodEndLabel = formatDate(raw.billing.currentPeriodEnd);
  const storeName = raw.store.shopName || raw.store.shopDomain;
  const ownerEmail = raw.store.ownerEmail || "Not available";
  const trialStatusLabel =
    raw.trial.accessReason === "TRIAL_ACTIVE"
      ? "Trial active"
      : raw.trial.accessReason === "TRIAL_EXPIRED"
        ? "Trial expired"
        : raw.trial.accessReason === "ACTIVE_PLAN"
          ? "Paid plan active"
          : titleCase(raw.trial.accessReason);

  return {
    id: raw.store.id,
    storeName,
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
      card("Products", formatNumber(raw.billing.selectedProductCount), "Products covered by plan"),
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
      expiredEmailLabel: formatDate(raw.trial.trialExpiredEmailSentAt),
      canUseStorefront: raw.trial.canUseStorefront,
    },
    billingFormDefaults: {
      plan: raw.billing.plan || "custom",
      selectedProductCount: raw.billing.selectedProductCount ?? raw.billing.scheduledProductCount ?? 0,
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
      funnel: behavior.funnel.map((item) => ({
        label: item.step,
        value: formatNumber(item.count),
      })),
      topProducts: behavior.topProducts.slice(0, 8).map((item) => ({
        label: item.productTitle || item.productId,
        helper: item.productId,
        value: formatNumber(item.tryOns),
      })),
      topRevenueProducts: revenue.topProductsByRevenue.slice(0, 8).map((item) => ({
        label: item.title || item.productId,
        helper: `${formatNumber(item.orders)} orders`,
        value: formatCurrency(item.revenue, revenue.currency),
      })),
    },
  };
}
