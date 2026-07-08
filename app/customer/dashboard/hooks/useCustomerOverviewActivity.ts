"use client";

import { useMemo, useState } from "react";
import type { CustomerOverviewActivityRow, CustomerOverviewActivityStatus } from "../types/overview";

export type CustomerOverviewActivityFilter = "all" | CustomerOverviewActivityStatus;

export function useCustomerOverviewActivity(rows: CustomerOverviewActivityRow[]) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<CustomerOverviewActivityFilter>("all");

  const visibleRows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesFilter = filter === "all" || row.status === filter;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        row.requestId.toLowerCase().includes(normalizedQuery) ||
        row.activity.toLowerCase().includes(normalizedQuery) ||
        row.detail.toLowerCase().includes(normalizedQuery);

      return matchesFilter && matchesQuery;
    });
  }, [filter, query, rows]);

  return {
    query,
    setQuery,
    filter,
    setFilter,
    visibleRows,
  };
}
