export interface CustomerPlanProductTier {
  label: string;
  value: string;
  maxProducts: number | null;
  fee: number;
  active: boolean;
  disabled: boolean;
}

export interface CustomerPlanTryOnPack {
  quantity: number;
  price: number;
  rate: number;
  label: string;
  selected: boolean;
  href: string;
}

export interface CustomerPlanSummaryCard {
  label: string;
  value: string;
  detail: string;
  tone: "blue" | "green" | "neutral" | "amber" | "rose";
}

export interface CustomerCustomPlanQuote {
  selectedProductCount: number;
  productAccessLimit: number;
  productTierLabel: string;
  platformFee: number;
  tryOnPackQuantity: number;
  tryOnPackPrice: number;
  totalMonthlyPrice: number;
  effectiveTryOnRate: number;
  savingsPerTryOn: number;
  autoRefillEnabled: boolean;
  checkoutName: string;
  checkoutDescription: string;
}

export interface CustomerPlanUsage {
  used: number;
  limit: number;
  remaining: number;
  percent: number;
  tone: "info" | "warning" | "critical";
}

export interface CustomerPlansViewModel {
  currentPlanCards: CustomerPlanSummaryCard[];
  usage: CustomerPlanUsage;
  productTiers: CustomerPlanProductTier[];
  tryOnPacks: CustomerPlanTryOnPack[];
  addOnPacks: CustomerPlanTryOnPack[];
  quote: CustomerCustomPlanQuote;
  freePlan: {
    includedTryOns: number;
    productLimit: number;
  };
  hasActiveMonthlyPlan: boolean;
  checkoutReady: boolean;
  checkoutUnavailableMessage: string;
  checkoutError: string | null;
}
