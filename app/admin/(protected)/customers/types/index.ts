export type AdminCustomerSource = "sdk" | "shopify";

export interface AdminCustomerStoreRaw {
  id: string;
  source: AdminCustomerSource;
  storeName: string;
  identifier: string;
  ownerEmail: string | null;
  status: string;
  plan: string | null;
  billingTotalMonthlyPrice?: number | null;
  billingSelectedProductCount?: number | null;
  billingCurrentPeriodEnd?: string | null;
  tryOnsUsed: number | null;
  tryOnsRemaining: number | null;
  lastUsedAt: string | null;
  installedAt: string;
  storeProfileId: string | null;
}

export interface ShopifyControlCenterRaw {
  store: {
    id: string;
    shopDomain: string;
    shopName: string | null;
    ownerEmail: string | null;
    currency: string | null;
    timezone: string | null;
    status: string;
    installedAt: string | null;
    uninstalledAt: string | null;
    lastUsedAt: string | null;
    updatedAt: string | null;
  };
  billing: {
    plan: string;
    subscriptionStatus: string | null;
    currentPeriodEnd: string | null;
    currency: string;
    isTest: boolean;
    monthlySpend: number;
    estimatedAnnualSpend: number;
    platformFee: number | null;
    tryOnPackPrice: number | null;
    selectedProductCount: number | null;
    tryOnPackQuantity: number | null;
    effectiveTryOnRate: number | null;
    effectiveProductRate: number | null;
    usageBillingEnabled: boolean;
    usagePrice: number | null;
    usageCap: number | null;
    autoRefillEnabled: boolean;
    autoRefillPackQuantity: number | null;
    scheduledProductCount: number | null;
    scheduledTryOnPackQuantity: number | null;
    scheduledMonthlySpend: number | null;
    scheduledEffectiveAt: string | null;
    approvalUrl: string;
  };
  usage: {
    tryOnsUsed: number;
    tryOnsRemaining: number;
    tryOnsLimit: number;
    usagePercent: number;
    activeSizeCharts: number;
    linkedProducts: number;
    usageAlert50SentAt: string | null;
    usageAlert80SentAt: string | null;
  };
  storeProfile: {
    id: string;
    source: string;
    status: string;
    storeName: string;
    hasSizeGuideMapping: boolean;
    createdAt: string | null;
    updatedAt: string | null;
  } | null;
  technical: {
    subscriptionId: string | null;
    usageLineItemId: string | null;
    storeProfileId: string | null;
    adminBillingOverrideAt: string | null;
    adminBillingOverrideNote: string | null;
    adminBillingOverrideMode: string | null;
    adminUsageAdjustmentAt: string | null;
    adminUsageAdjustmentNote: string | null;
  };
  controls: {
    canUseInternalOverride: boolean;
    canAdjustUsage: boolean;
    canOpenShopifyApproval: boolean;
  };
}

export interface ShopifyBehaviorAnalyticsRaw {
  range: { days: number; from: string };
  kpis: {
    uniqueSessions: number;
    initiated: number;
    completed: number;
    failed: number;
    sizeShown: number;
    sizeAccepted: number;
    cartAdds: number;
    completionRate: number;
    sizeAcceptanceRate: number;
  };
  dailyActivity: Array<{ date: string; initiated: number; completed: number; failed: number }>;
  deviceSplit: Array<{ device: string; count: number }>;
  countrySplit: Array<{ iso2: string; name: string; count: number }>;
  topProducts: Array<{ productId: string; productTitle: string; tryOns: number }>;
  funnel: Array<{ step: string; count: number }>;
}

export interface ShopifyRevenueAnalyticsRaw {
  range: { days: number; from: string };
  currency: string;
  orders: {
    total: number;
    paid: number;
    revenue: number;
    paidRevenue: number;
    refundedAmount: number;
  };
  attribution: {
    attributedOrders: number;
    attributedPaidOrders: number;
    attributedRevenue: number;
    attributedPaidRevenue: number;
    completedTryOns: number;
    conversionRate: number;
  };
  refundRate: number;
  topProductsByRevenue: Array<{ productId: string; title: string; revenue: number; orders: number }>;
}

export interface ShopifyBillingOverridePayload {
  plan: string;
  selectedProductCount: number;
  requestedTryOns: number;
  effectiveMode: "current" | "next_cycle";
  reason: string;
  scheduledEffectiveAt?: string | null;
  currentPeriodEnd?: string | null;
  billingUsageEnabled?: boolean;
  billingAutoRefillEnabled?: boolean;
}

export interface ShopifyUsageLimitsPayload {
  tryOnsRemaining?: number;
  tryOnsUsed?: number;
  grantTryOns?: number;
  reason: string;
}

export interface ShopifyControlCenterMutationResponse {
  ok: boolean;
  controlCenter: ShopifyControlCenterRaw;
}

export interface AdminCustomersResponse {
  stores: AdminCustomerStoreRaw[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface StoreProfileHeaderMappingRaw {
  original: string;
  key: string;
  unit: "cm" | "in" | null;
  label: string;
}

export interface StoreProfileRaw {
  _id: string;
  userId: string | null;
  projectId: string | null;
  shopifyShopId: string | null;
  source: AdminCustomerSource;
  storeName: string;
  sizeGuideConfig: {
    unit: "cm" | "in";
    headerMappings: StoreProfileHeaderMappingRaw[];
    originalHeaders: string[];
    learnedAt: string;
    confirmedAt: string | null;
  } | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminCustomerUserRaw {
  _id: string;
  name?: string | null;
  email?: string | null;
  photoUrl?: string | null;
  isEmailVerified?: boolean | null;
  role?: string | null;
  accountStatus?: string | null;
  gender?: string | null;
  birthYear?: number | null;
  birthMonth?: string | null;
  height?: string | null;
  weight?: string | null;
  bodyType?: string | null;
  shoeSize?: string | null;
  mobileNumber?: string | null;
  styles?: string[] | null;
  colors?: string[] | null;
  budget?: number | null;
  emailNotifications?: boolean | null;
  aiRecommendations?: boolean | null;
  marketingCommunications?: boolean | null;
  onboardingCompleted?: boolean | null;
  tokenBalance?: number | null;
  signupBonusAwarded?: boolean | null;
  lifetimeTokensPurchased?: number | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface AdminCustomerProjectRaw {
  _id: string;
  userId: string;
  name: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface ShopifyCustomerRawDetails {
  shopDomain?: string | null;
  shopName?: string | null;
  ownerEmail?: string | null;
  currency?: string | null;
  timezone?: string | null;
  plan?: string | null;
  status?: string | null;
  tryOnsUsed?: number | null;
  tryOnsRemaining?: number | null;
  billingSubscriptionId?: string | null;
  billingSubscriptionStatus?: string | null;
  billingCurrentPeriodEnd?: string | null;
  billingCurrency?: string | null;
  billingTest?: boolean | null;
  billingUsageEnabled?: boolean | null;
  billingUsagePrice?: number | null;
  billingUsageCap?: number | null;
  billingSelectedProductCount?: number | null;
  billingPlatformFee?: number | null;
  billingTryOnPackQuantity?: number | null;
  billingTryOnPackPrice?: number | null;
  billingTotalMonthlyPrice?: number | null;
  billingEffectiveTryOnRate?: number | null;
  billingEffectiveProductRate?: number | null;
  billingAutoRefillEnabled?: boolean | null;
  billingAutoRefillPackQuantity?: number | null;
  billingScheduledProductCount?: number | null;
  billingScheduledTryOnPackQuantity?: number | null;
  billingScheduledTotalMonthlyPrice?: number | null;
  billingScheduledEffectiveAt?: string | null;
  installedAt?: string | null;
  uninstalledAt?: string | null;
  lastUsedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface AdminCustomerDetailRaw {
  source: AdminCustomerSource;
  store: AdminCustomerStoreRaw;
  raw?: ShopifyCustomerRawDetails;
  storeProfile: StoreProfileRaw | null;
  user?: AdminCustomerUserRaw | null;
  project?: AdminCustomerProjectRaw | null;
  stats: {
    chartCount: number;
    linkedProductCount?: number;
  };
}

export interface AdminCustomerListQuery {
  page: number;
  limit: number;
  source: AdminCustomerSource;
  search: string;
}

export interface CustomerStatCard {
  label: string;
  value: string;
  helper: string;
}

export interface CustomerListItem {
  id: string;
  source: AdminCustomerSource;
  sourceLabel: string;
  storeName: string;
  identifierLabel: string;
  ownerLabel: string;
  statusLabel: string;
  statusTone: "default" | "success" | "warning" | "danger";
  planLabel: string;
  monthlySpendLabel: string;
  productCountLabel: string;
  dueDateLabel: string;
  tryOnsLabel: string;
  lastUsedLabel: string;
  installedLabel: string;
  storeProfileLabel: string;
}

export interface CustomersViewModel {
  source: AdminCustomerSource;
  title: string;
  eyebrow: string;
  description: string;
  stats: CustomerStatCard[];
  items: CustomerListItem[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
  hasCustomers: boolean;
}

export interface CustomerDetailField {
  label: string;
  value: string;
}

export interface CustomerDetailSection {
  title: string;
  fields: CustomerDetailField[];
}

export interface CustomerDetailView {
  source: AdminCustomerSource;
  sourceLabel: string;
  store: CustomerListItem;
  sections: CustomerDetailSection[];
  sizeGuide: {
    unitLabel: string;
    learnedLabel: string;
    confirmedLabel: string;
    originalHeaders: string[];
    mappings: StoreProfileHeaderMappingRaw[];
  } | null;
}

export interface ShopifyMetricCard {
  label: string;
  value: string;
  helper: string;
}

export interface ShopifyControlCenterView {
  id: string;
  storeName: string;
  shopDomain: string;
  ownerEmail: string;
  status: string;
  statusLabel: string;
  statusTone: CustomerListItem["statusTone"];
  planLabel: string;
  subscriptionLabel: string;
  currentPeriodEndLabel: string;
  isTestBilling: boolean;
  summaryCards: ShopifyMetricCard[];
  billingCards: ShopifyMetricCard[];
  usageCards: ShopifyMetricCard[];
  billingFormDefaults: {
    plan: string;
    selectedProductCount: number;
    requestedTryOns: number;
    scheduledEffectiveAt: string;
    currentPeriodEnd: string;
    billingUsageEnabled: boolean;
    billingAutoRefillEnabled: boolean;
  };
  usageFormDefaults: {
    tryOnsRemaining: number;
    tryOnsUsed: number;
  };
  profile: {
    label: string;
    helper: string;
  };
  technicalRows: CustomerDetailField[];
  analytics: {
    rangeLabel: string;
    behaviorCards: ShopifyMetricCard[];
    revenueCards: ShopifyMetricCard[];
    funnel: Array<{ label: string; value: string }>;
    topProducts: Array<{ label: string; helper: string; value: string }>;
    topRevenueProducts: Array<{ label: string; helper: string; value: string }>;
  };
}
