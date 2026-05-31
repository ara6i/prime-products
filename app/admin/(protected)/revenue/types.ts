export type RevenueView = "full" | "shopify" | "sdk";

export interface ShopifyRevenueSummary {
  totalMrr: number;
  liveMrr: number;
  testMrr: number;
  annualRunRate: number;
  platformFeeMrr: number;
  usagePackageMrr: number;
  scheduledMrr: number;
  activePaidStores: number;
  livePaidStores: number;
  testPaidStores: number;
  freeActiveStores: number;
  activeStores: number;
  totalStores: number;
  averageMrrPerPaidStore: number;
  includedTryOns: number;
  selectedProducts: number;
  tryOnsUsed: number;
  tryOnBalance: number;
}

export interface ShopifyRevenueCompositionItem {
  label: string;
  amount: number;
}

export interface ShopifyRevenuePlanRow {
  label: string;
  stores: number;
  mrr: number;
  tryOns: number;
  products: number;
}

export interface ShopifyRevenueMonth {
  month: string;
  label: string;
  paidStores: number;
  mrr: number;
}

export interface ShopifyRevenueStore {
  id: string;
  shopDomain: string;
  shopName: string | null;
  ownerEmail: string | null;
  plan: string | null;
  billingTest: boolean;
  billingSubscriptionStatus: string | null;
  currentPeriodEnd: string | null;
  monthlyRevenue: number;
  platformFee: number;
  tryOnPackagePrice: number;
  tryOnPackageQuantity: number | null;
  selectedProductCount: number | null;
  effectiveTryOnRate: number | null;
  autoRefillEnabled: boolean;
  scheduledMonthlyRevenue: number | null;
  scheduledEffectiveAt: string | null;
}

export interface ShopifyRevenueReport {
  currency: string;
  generatedAt: string;
  lastUpdatedAt: string | null;
  source: "shopify_billing_records";
  summary: ShopifyRevenueSummary;
  composition: ShopifyRevenueCompositionItem[];
  planBreakdown: ShopifyRevenuePlanRow[];
  monthlySeries: ShopifyRevenueMonth[];
  topStores: ShopifyRevenueStore[];
}
