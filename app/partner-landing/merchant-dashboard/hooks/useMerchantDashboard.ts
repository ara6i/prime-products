"use client";

import { useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MERCHANT_DASHBOARD_DATA } from "../data/merchantDashboardData";
import { mapMerchantDashboard } from "../mappers/merchantDashboardMapper";
import type { MerchantDashboardSection } from "../types";

export function resolveMerchantTabId(tabIds: string[], requestedTab: string | null) {
  if (!tabIds.length) return "";
  return requestedTab && tabIds.includes(requestedTab) ? requestedTab : tabIds[0];
}

export function buildMerchantTabHref(pathname: string, firstTabId: string, tabId: string, currentQuery = "") {
  const next = new URLSearchParams(currentQuery);
  if (tabId === firstTabId) next.delete("tab");
  else next.set("tab", tabId);
  const query = next.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function useMerchantDashboard(section: MerchantDashboardSection) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sectionData = MERCHANT_DASHBOARD_DATA.sections[section];
  const activeTabId = resolveMerchantTabId(sectionData.tabs.map((tab) => tab.id), searchParams.get("tab"));

  const viewModel = useMemo(
    () => mapMerchantDashboard(MERCHANT_DASHBOARD_DATA, section, activeTabId),
    [activeTabId, section],
  );

  const setActiveTab = (tabId: string) => {
    router.push(buildMerchantTabHref(pathname, sectionData.tabs[0].id, tabId, searchParams.toString()), { scroll: false });
  };

  return { viewModel, activeTabId, setActiveTab };
}
