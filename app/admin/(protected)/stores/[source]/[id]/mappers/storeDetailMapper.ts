import type { SizeChartSummary, StoreDetail } from "@/app/admin/shared/types";

type RawDetail = {
  source?: string;
  store?: unknown;
  raw?: unknown;
  storeProfile?: unknown;
  user?: unknown;
  project?: unknown;
  stats?: unknown;
};

export function mapStoreDetail(raw: RawDetail | null | undefined): StoreDetail | null {
  if (!raw || !raw.source) return null;
  return raw as unknown as StoreDetail;
}

type RawChartsPayload = {
  charts?: Array<Partial<SizeChartSummary> & { updatedAt?: string | Date; createdAt?: string | Date }>;
};

function asIso(value: unknown): string {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

export function mapSizeChartSummaries(raw: RawChartsPayload | null | undefined): SizeChartSummary[] {
  if (!raw?.charts) return [];
  return raw.charts.map((c) => ({
    id: String(c.id ?? ""),
    name: c.name ?? "Untitled chart",
    unit: c.unit === "in" ? "in" : "cm",
    gender: c.gender ?? "unisex",
    columnCount: c.columnCount ?? 0,
    rowCount: c.rowCount ?? 0,
    assignedProductCount: c.assignedProductCount ?? 0,
    assignedCollectionCount: c.assignedCollectionCount ?? 0,
    updatedAt: asIso(c.updatedAt),
    createdAt: asIso(c.createdAt),
  }));
}
