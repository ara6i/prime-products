import type { AdminOverview, OverviewCounts, RecentShopifyShop } from "@/app/admin/shared/types";

type RawOverview = {
  counts?: Partial<OverviewCounts>;
  recentShopify?: Array<Partial<RecentShopifyShop> & { installedAt?: string | Date }>;
};

const zeroCounts: OverviewCounts = {
  shopifyTotal: 0,
  shopifyActive: 0,
  shopifyUninstalled: 0,
  sdkActive: 0,
  totalTemplates: 0,
};

function asIsoString(value: unknown): string {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

export function mapOverview(raw: RawOverview | null | undefined): AdminOverview {
  if (!raw) return { counts: zeroCounts, recentShopify: [] };

  return {
    counts: { ...zeroCounts, ...(raw.counts ?? {}) },
    recentShopify: (raw.recentShopify ?? []).map((shop) => ({
      _id: String(shop._id ?? ""),
      shopDomain: shop.shopDomain ?? "",
      shopName: shop.shopName ?? null,
      ownerEmail: shop.ownerEmail ?? null,
      plan: shop.plan ?? "free",
      status: shop.status ?? "active",
      installedAt: asIsoString(shop.installedAt),
    })),
  };
}
