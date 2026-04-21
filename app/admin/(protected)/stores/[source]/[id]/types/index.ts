import type { StoreDetail, SizeChartSummary } from "@/app/admin/shared/types";

export type { StoreDetail, SizeChartSummary };

export interface StoreDetailPageData {
  detail: StoreDetail | null;
  charts: SizeChartSummary[];
}
