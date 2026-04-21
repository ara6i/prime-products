"use server";

import { adminFetch } from "@/app/admin/shared/services/adminFetch";
import {
  mapSizeChartSummaries,
  mapStoreDetail,
} from "../mappers/storeDetailMapper";
import type { SizeChartSummary, StoreDetail } from "@/app/admin/shared/types";

export async function getStoreDetail(
  source: "shopify" | "sdk",
  id: string,
): Promise<StoreDetail | null> {
  try {
    const data = await adminFetch<unknown>(
      `/api/admin/stores/${encodeURIComponent(source)}/${encodeURIComponent(id)}`,
    );
    return mapStoreDetail(data as Parameters<typeof mapStoreDetail>[0]);
  } catch (error) {
    console.error("Failed to load store detail", error);
    return null;
  }
}

export async function listStoreSizeCharts(
  source: "shopify" | "sdk",
  id: string,
): Promise<SizeChartSummary[]> {
  try {
    const data = await adminFetch<unknown>(
      `/api/admin/stores/${encodeURIComponent(source)}/${encodeURIComponent(id)}/size-charts`,
    );
    return mapSizeChartSummaries(data as Parameters<typeof mapSizeChartSummaries>[0]);
  } catch (error) {
    console.error("Failed to load size charts", error);
    return [];
  }
}
