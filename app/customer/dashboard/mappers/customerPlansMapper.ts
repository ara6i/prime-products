import type { CustomerDashboardRawOverview } from "../types";
import type { CustomerProductCsvParseResult } from "../types/products";
import type {
  CustomerCustomPlanQuote,
  CustomerPlanProductTier,
  CustomerPlanSummaryCard,
  CustomerPlanTryOnPack,
  CustomerPlansViewModel,
} from "../types/plans";

const FREE_PLAN_INCLUDED_TRY_ONS = 50;
const FREE_PLAN_PRODUCT_LIMIT = 200;

const PRODUCT_FEE_TIERS: Array<{ maxProducts: number | null; fee: number }> = [
  { maxProducts: 200, fee: 29 },
  { maxProducts: 500, fee: 49 },
  { maxProducts: 2_000, fee: 129 },
  { maxProducts: 5_000, fee: 229 },
  { maxProducts: 10_000, fee: 349 },
  { maxProducts: 25_000, fee: 699 },
  { maxProducts: 50_000, fee: 1_299 },
  { maxProducts: 100_000, fee: 2_199 },
  { maxProducts: null, fee: 3_499 },
];

const TRY_ON_PACKS: Array<{ quantity: number; price: number }> = [
  { quantity: 100, price: 50 },
  { quantity: 500, price: 225 },
  { quantity: 1_000, price: 400 },
  { quantity: 5_000, price: 1_750 },
  { quantity: 10_000, price: 3_000 },
];

interface MapCustomerPlansInput {
  dashboard: CustomerDashboardRawOverview;
  products: CustomerProductCsvParseResult;
  productTier?: string;
  requestedTryOns?: string;
  autoRefill?: string;
  checkoutError?: string;
}

function clampNonNegativeInteger(value: number): number {
  return Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  }).format(value);
}

function formatRate(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function productTierValues(): number[] {
  return PRODUCT_FEE_TIERS.map((tier) => tier.maxProducts ?? 100_001);
}

function nearestProductTier(productCount: number): number {
  const normalizedCount = clampNonNegativeInteger(productCount);
  return productTierValues().find((value) => normalizedCount <= value) ?? productTierValues().at(-1) ?? 100_001;
}

function getPlatformFee(productAccessLimit: number): number {
  const tier = PRODUCT_FEE_TIERS.find((item) => (item.maxProducts ?? 100_001) === productAccessLimit);
  return tier?.fee ?? 3_499;
}

function getMatchingTryOnPackForProductTier(productTier: number) {
  const tierIndex = productTierValues().findIndex((value) => value === productTier);
  const packIndex = Math.min(Math.max(tierIndex, 0), TRY_ON_PACKS.length - 1);
  return TRY_ON_PACKS[packIndex] ?? TRY_ON_PACKS[0]!;
}

function getTryOnPack(requestedTryOns: number) {
  const normalizedTryOns = clampNonNegativeInteger(requestedTryOns);
  return TRY_ON_PACKS.find((pack) => normalizedTryOns <= pack.quantity) ?? TRY_ON_PACKS[TRY_ON_PACKS.length - 1]!;
}

function readTryOns(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(String(value ?? "").replace(/[^\d]/g, ""), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(TRY_ON_PACKS[0]!.quantity, parsed);
}

function readProductTier(value: string | undefined, selectedProducts: number): number {
  const fallback = nearestProductTier(selectedProducts);
  const parsed = Number.parseInt(String(value ?? "").replace(/[^\d]/g, ""), 10);
  const valid = productTierValues().includes(parsed) ? parsed : fallback;
  return valid < fallback ? fallback : valid;
}

function selectedProductCount(products: CustomerProductCsvParseResult): number {
  return products.products.filter((product) => products.defaultStates[product.handle]?.currentCycle).length;
}

function buildProductTierLabel(tier: { maxProducts: number | null; fee: number }): string {
  if (tier.maxProducts === null) return `100,000+ products - ${formatMoney(tier.fee)}`;
  return `Up to ${formatNumber(tier.maxProducts)} products - ${formatMoney(tier.fee)}`;
}

function buildCustomQuote(input: {
  selectedProductCount: number;
  productAccessLimit: number;
  requestedTryOns: number;
  autoRefillEnabled: boolean;
}): CustomerCustomPlanQuote {
  const productCount = clampNonNegativeInteger(input.selectedProductCount);
  const productTier = input.productAccessLimit;
  const pack = getTryOnPack(input.requestedTryOns);
  const platformFee = getPlatformFee(productTier);
  const totalMonthlyPrice = platformFee + pack.price;
  const effectiveTryOnRate = pack.price / pack.quantity;
  const savingsPerTryOn = Math.max(0, TRY_ON_PACKS[0]!.price / TRY_ON_PACKS[0]!.quantity - effectiveTryOnRate);
  const matchingTier = PRODUCT_FEE_TIERS.find((tier) => (tier.maxProducts ?? 100_001) === productTier) ?? PRODUCT_FEE_TIERS[0]!;

  return {
    selectedProductCount: productCount,
    productAccessLimit: productTier,
    productTierLabel: buildProductTierLabel(matchingTier),
    platformFee,
    tryOnPackQuantity: pack.quantity,
    tryOnPackPrice: pack.price,
    totalMonthlyPrice,
    effectiveTryOnRate,
    savingsPerTryOn,
    autoRefillEnabled: input.autoRefillEnabled,
    checkoutName: "PrimeStyleAI Custom Plan",
    checkoutDescription: [
      `Includes up to ${formatNumber(productTier)} products and ${formatNumber(pack.quantity)} monthly try-ons.`,
      `Current selection: ${formatNumber(productCount)} products.`,
      `Monthly breakdown: ${formatMoney(platformFee)} platform access + ${formatMoney(pack.price)} included usage.`,
      `Auto-refill: ${input.autoRefillEnabled ? "On" : "Off"}.`,
    ].join(" "),
  };
}

function mapProductTiers(activeTier: string, selectedProducts: number): CustomerPlanProductTier[] {
  const minimumTier = nearestProductTier(selectedProducts);
  return PRODUCT_FEE_TIERS.map((tier) => {
    const tierValue = String(tier.maxProducts ?? 100_001);
    return {
      ...tier,
      value: tierValue,
      label: buildProductTierLabel(tier),
      active: tierValue === activeTier,
      disabled: Number(tierValue) < minimumTier,
    };
  });
}

function mapTryOnPacks(selectedQuantity: number, autoRefillEnabled: boolean, productTier: number): CustomerPlanTryOnPack[] {
  return TRY_ON_PACKS.map((pack) => ({
    quantity: pack.quantity,
    price: pack.price,
    rate: pack.price / pack.quantity,
    label: `${formatNumber(pack.quantity)} try-ons - ${formatMoney(pack.price)}`,
    selected: pack.quantity === selectedQuantity,
    href: `/customer/dashboard/plans?productTier=${productTier}&tryOns=${pack.quantity}${autoRefillEnabled ? "&refill=1" : ""}`,
  }));
}

function mapCurrentPlanCards(input: {
  selectedProducts: number;
  planName: string;
  productLimit: number;
  includedTryOns: number;
  addOnTryOns: number;
  hasActiveMonthlyPlan: boolean;
  usage: { used: number; limit: number; remaining: number; percent: number };
}): CustomerPlanSummaryCard[] {
  const activePlanDetail = input.addOnTryOns > 0
    ? `${formatNumber(input.includedTryOns)} monthly try-ons + ${formatNumber(input.addOnTryOns)} extra this period`
    : `${formatNumber(input.includedTryOns)} monthly try-ons and up to ${formatNumber(input.productLimit)} products`;

  return [
    {
      label: "Current plan",
      value: input.planName,
      detail: input.hasActiveMonthlyPlan
        ? activePlanDetail
        : `${formatNumber(input.includedTryOns)} try-ons and ${formatNumber(input.productLimit)} products included`,
      tone: input.hasActiveMonthlyPlan ? "blue" : "green",
    },
    {
      label: "Product selection",
      value: `${formatNumber(input.selectedProducts)} / ${formatNumber(input.productLimit)}`,
      detail: "Products selected",
      tone: "blue",
    },
    {
      label: "Usage this period",
      value: `${formatNumber(input.usage.used)} / ${formatNumber(input.usage.limit)}`,
      detail: `${formatNumber(input.usage.remaining)} try-ons remaining`,
      tone: input.usage.percent >= 80 ? "rose" : input.usage.percent >= 50 ? "amber" : "neutral",
    },
  ];
}

export function mapCustomerPlans({
  dashboard,
  products,
  productTier,
  requestedTryOns,
  autoRefill,
  checkoutError,
}: MapCustomerPlansInput): CustomerPlansViewModel {
  const selectedProducts = selectedProductCount(products);
  const billing = dashboard.billing;
  const hasActiveMonthlyPlan = Boolean(billing?.active);
  const planName = hasActiveMonthlyPlan ? billing?.planName || "Custom" : "Free";
  const productLimit = hasActiveMonthlyPlan ? billing?.productAccessLimit ?? FREE_PLAN_PRODUCT_LIMIT : FREE_PLAN_PRODUCT_LIMIT;
  const includedTryOns = hasActiveMonthlyPlan ? billing?.monthlyTryOnLimit ?? FREE_PLAN_INCLUDED_TRY_ONS : FREE_PLAN_INCLUDED_TRY_ONS;
  const addOnTryOns = hasActiveMonthlyPlan ? billing?.addOnTryOnsCurrentPeriod ?? 0 : 0;
  const matchedProductTier = nearestProductTier(selectedProducts);
  const selectedProductTier = readProductTier(productTier, selectedProducts);
  const matchedTryOnPack = getMatchingTryOnPackForProductTier(matchedProductTier);
  const selectedTryOns = getTryOnPack(readTryOns(requestedTryOns, matchedTryOnPack.quantity)).quantity;
  const autoRefillEnabled = autoRefill === "1" || autoRefill === "true";
  const usageUsed = Math.max(0, dashboard.metrics.tryOnsCompleted);
  const usageLimit = Math.max(1, includedTryOns + addOnTryOns);
  const usageRemaining = Math.max(0, usageLimit - usageUsed);
  const usagePercent = usageLimit > 0 ? Math.min(100, Math.round((usageUsed / usageLimit) * 100)) : 0;
  const usage = {
    used: usageUsed,
    limit: usageLimit,
    remaining: usageRemaining,
    percent: usagePercent,
    tone: usagePercent >= 80 ? "critical" as const : usagePercent >= 50 ? "warning" as const : "info" as const,
  };
  const quote = buildCustomQuote({
    selectedProductCount: selectedProducts,
    productAccessLimit: selectedProductTier,
    requestedTryOns: selectedTryOns,
    autoRefillEnabled,
  });

  return {
    currentPlanCards: mapCurrentPlanCards({
      selectedProducts,
      planName,
      productLimit,
      includedTryOns,
      addOnTryOns,
      hasActiveMonthlyPlan,
      usage,
    }),
    usage,
    productTiers: mapProductTiers(String(selectedProductTier), selectedProducts),
    tryOnPacks: mapTryOnPacks(quote.tryOnPackQuantity, autoRefillEnabled, quote.productAccessLimit),
    addOnPacks: mapTryOnPacks(quote.tryOnPackQuantity, autoRefillEnabled, quote.productAccessLimit),
    quote,
    freePlan: {
      includedTryOns: FREE_PLAN_INCLUDED_TRY_ONS,
      productLimit: FREE_PLAN_PRODUCT_LIMIT,
    },
    hasActiveMonthlyPlan,
    checkoutReady: quote.selectedProductCount > 0,
    checkoutUnavailableMessage:
      "Select at least one product before starting a plan.",
    checkoutError: checkoutError?.trim() || null,
  };
}

export const customerPlansFormatters = {
  money: formatMoney,
  number: formatNumber,
  rate: formatRate,
};
