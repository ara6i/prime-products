import type { StoresPage, UnifiedStore } from "@/app/admin/shared/types";

type RawStore = Partial<UnifiedStore> & {
  installedAt?: string | Date;
  lastUsedAt?: string | Date | null;
};

type RawPage = {
  stores?: RawStore[];
  pagination?: Partial<StoresPage["pagination"]>;
};

const emptyPage: StoresPage = {
  stores: [],
  pagination: { page: 1, limit: 20, total: 0, totalPages: 1 },
};

function asIsoString(value: unknown): string {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function asNullableIsoString(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

export function mapStoresPage(raw: RawPage | null | undefined): StoresPage {
  if (!raw) return emptyPage;
  return {
    stores: (raw.stores ?? []).map((s) => ({
      id: String(s.id ?? ""),
      source: s.source === "sdk" ? "sdk" : "shopify",
      storeName: s.storeName ?? "",
      identifier: s.identifier ?? "",
      ownerEmail: s.ownerEmail ?? null,
      status: s.status ?? "active",
      plan: s.plan ?? null,
      tryOnsUsed: typeof s.tryOnsUsed === "number" ? s.tryOnsUsed : null,
      tryOnsRemaining: typeof s.tryOnsRemaining === "number" ? s.tryOnsRemaining : null,
      lastUsedAt: asNullableIsoString(s.lastUsedAt),
      installedAt: asIsoString(s.installedAt),
      storeProfileId: s.storeProfileId ?? null,
    })),
    pagination: {
      page: raw.pagination?.page ?? 1,
      limit: raw.pagination?.limit ?? 20,
      total: raw.pagination?.total ?? 0,
      totalPages: raw.pagination?.totalPages ?? 1,
    },
  };
}
