import type { StoresPage, UnifiedStore } from "@/app/admin/shared/types";

export type { StoresPage, UnifiedStore };

export interface StoresFilterState {
  search: string;
  source: "all" | "shopify" | "sdk";
  page: number;
  limit: number;
}
