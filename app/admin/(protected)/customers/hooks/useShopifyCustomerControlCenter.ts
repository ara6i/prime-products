"use client";

import { useCallback, useMemo, useState } from "react";
import { mapShopifyControlCenter } from "../mappers/shopifyControlCenterMapper";
import {
  fetchAdminShopifyBehaviorClient,
  fetchAdminShopifyControlCenterClient,
  fetchAdminShopifyRevenueClient,
  resetCustomerSizeGuideMappingClient,
  updateShopifyBillingOverrideClient,
  updateShopifyStatusClient,
  updateShopifyUsageLimitsClient,
} from "../services/customersClientService";
import type {
  ShopifyBehaviorAnalyticsRaw,
  ShopifyBillingOverridePayload,
  ShopifyControlCenterRaw,
  ShopifyControlCenterView,
  ShopifyRevenueAnalyticsRaw,
  ShopifyUsageLimitsPayload,
} from "../types";

interface ShopifyCustomerControlCenterState {
  controlCenter: ShopifyControlCenterRaw;
  behavior: ShopifyBehaviorAnalyticsRaw | null;
  revenue: ShopifyRevenueAnalyticsRaw | null;
}

export interface UseShopifyCustomerControlCenterResult {
  view: ShopifyControlCenterView;
  isSaving: boolean;
  error: string | null;
  notice: string | null;
  refresh: () => Promise<void>;
  updateBilling: (payload: ShopifyBillingOverridePayload) => Promise<void>;
  updateUsage: (payload: ShopifyUsageLimitsPayload) => Promise<void>;
  setStatus: (status: "active" | "suspended") => Promise<void>;
  resetSizeGuideMapping: () => Promise<void>;
}

export function useShopifyCustomerControlCenter(
  initialView: ShopifyControlCenterView,
  initialControlCenter: ShopifyControlCenterRaw,
  initialBehavior: ShopifyBehaviorAnalyticsRaw | null,
  initialRevenue: ShopifyRevenueAnalyticsRaw | null,
): UseShopifyCustomerControlCenterResult {
  const [state, setState] = useState<ShopifyCustomerControlCenterState>({
    controlCenter: initialControlCenter,
    behavior: initialBehavior,
    revenue: initialRevenue,
  });
  const [optimisticView, setOptimisticView] = useState(initialView);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const applyState = useCallback((next: ShopifyCustomerControlCenterState) => {
    setState(next);
    setOptimisticView(mapShopifyControlCenter(next.controlCenter, next.behavior, next.revenue));
  }, []);

  const refresh = useCallback(async () => {
    setError(null);
    const [controlCenter, behavior, revenue] = await Promise.all([
      fetchAdminShopifyControlCenterClient(state.controlCenter.store.id),
      fetchAdminShopifyBehaviorClient(state.controlCenter.store.id).catch(() => null),
      fetchAdminShopifyRevenueClient(state.controlCenter.store.id).catch(() => null),
    ]);
    applyState({ controlCenter, behavior, revenue });
  }, [applyState, state.controlCenter.store.id]);

  const runMutation = useCallback(async (action: () => Promise<ShopifyControlCenterRaw | null>, message: string) => {
    setIsSaving(true);
    setError(null);
    setNotice(null);
    try {
      const controlCenter = await action();
      if (controlCenter) {
        applyState({
          controlCenter,
          behavior: state.behavior,
          revenue: state.revenue,
        });
      } else {
        await refresh();
      }
      setNotice(message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setIsSaving(false);
    }
  }, [applyState, refresh, state.behavior, state.revenue]);

  const updateBilling = useCallback(async (payload: ShopifyBillingOverridePayload) => {
    await runMutation(async () => {
      const response = await updateShopifyBillingOverrideClient(state.controlCenter.store.id, payload);
      return response.controlCenter;
    }, "Billing override saved.");
  }, [runMutation, state.controlCenter.store.id]);

  const updateUsage = useCallback(async (payload: ShopifyUsageLimitsPayload) => {
    await runMutation(async () => {
      const response = await updateShopifyUsageLimitsClient(state.controlCenter.store.id, payload);
      return response.controlCenter;
    }, "Usage limits updated.");
  }, [runMutation, state.controlCenter.store.id]);

  const setStatus = useCallback(async (status: "active" | "suspended") => {
    await runMutation(async () => {
      await updateShopifyStatusClient(state.controlCenter.store.id, status);
      return null;
    }, status === "active" ? "Shop activated." : "Shop suspended.");
  }, [runMutation, state.controlCenter.store.id]);

  const resetSizeGuideMapping = useCallback(async () => {
    await runMutation(async () => {
      await resetCustomerSizeGuideMappingClient("shopify", state.controlCenter.store.id);
      return null;
    }, "Size-guide mapping reset.");
  }, [runMutation, state.controlCenter.store.id]);

  return useMemo(
    () => ({
      view: optimisticView,
      isSaving,
      error,
      notice,
      refresh,
      updateBilling,
      updateUsage,
      setStatus,
      resetSizeGuideMapping,
    }),
    [
      error,
      isSaving,
      notice,
      optimisticView,
      refresh,
      resetSizeGuideMapping,
      setStatus,
      updateBilling,
      updateUsage,
    ],
  );
}
