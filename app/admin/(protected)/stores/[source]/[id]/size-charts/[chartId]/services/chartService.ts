"use server";

import { adminFetch } from "@/app/admin/shared/services/adminFetch";
import { mapSizeChartDetail } from "../mappers/chartMapper";
import type { SizeChartDetail } from "@/app/admin/shared/types";

export async function getSizeChart(
  source: "shopify" | "sdk",
  id: string,
  chartId: string,
): Promise<SizeChartDetail | null> {
  try {
    const data = await adminFetch<unknown>(
      `/api/admin/stores/${encodeURIComponent(source)}/${encodeURIComponent(id)}/size-charts/${encodeURIComponent(chartId)}`,
    );
    return mapSizeChartDetail(data as Parameters<typeof mapSizeChartDetail>[0]);
  } catch (error) {
    console.error("Failed to load size chart", error);
    return null;
  }
}
