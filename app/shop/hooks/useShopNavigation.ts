"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { getCategoryHref } from "../category/mappers/categoryCatalog.mapper";
import { getBrandHref } from "../mappers/shopNavigation.mapper";
import { getAiStylistHref } from "../services/shopNavigation.service";
import type {
  GlobalShopCategory,
  ShopNavigationActions,
  ShopNavigationOptions,
} from "../types/globalShop.types";

export function useShopNavigation(
  options: ShopNavigationOptions = {},
): ShopNavigationActions {
  const router = useRouter();
  const { onNavigate } = options;

  const openCategoryPage = useCallback(
    (category: GlobalShopCategory) => {
      router.push(getCategoryHref(category));
      onNavigate?.();
    },
    [onNavigate, router],
  );

  const openBrandPage = useCallback(
    (brandId: string) => {
      router.push(getBrandHref(brandId));
      onNavigate?.();
    },
    [onNavigate, router],
  );

  return {
    aiStylistHref: getAiStylistHref(),
    openBrandPage,
    openCategoryPage,
  };
}
