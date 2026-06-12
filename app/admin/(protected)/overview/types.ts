export type ShopifyTryOnRange = "7d" | "30d" | "90d" | "12m";

export interface ShopifyTryOnRetailer {
  id: string;
  shopName: string;
  shopDomain: string;
  primaryDomain: string | null;
  primaryDomainUrl: string | null;
  ownerEmail: string | null;
  status: string;
  installedAt: string | null;
  uninstalledAt: string | null;
  lastUsedAt: string | null;
  rangeTryOns: number;
  lifetimeTryOns: number;
  tryOnsRemaining: number;
}

export interface ShopifyTryOnOverview {
  range: ShopifyTryOnRange;
  generatedAt: string;
  from: string;
  kpis: {
    totalTryOns: number;
    lifetimeTryOns: number;
    activeInstalls: number;
    totalInstalls: number;
    suspendedInstalls: number;
    uninstalledInstalls: number;
    topRetailer: ShopifyTryOnRetailer | null;
  };
  series: Array<{
    bucket: string;
    tryOns: number;
  }>;
  retailers: ShopifyTryOnRetailer[];
}
