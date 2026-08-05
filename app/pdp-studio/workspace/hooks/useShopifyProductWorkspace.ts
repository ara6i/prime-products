"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getShopifyConnection,
  getShopifyProduct,
  importShopifyProductMedia,
} from "../services/shopifyProductsService";
import type {
  ShopifyProductDetail,
  ShopifyProductMedia,
} from "../types/shopifyProducts";
import type { PdpStudioToolDefinition } from "../types";
import type { PdpStudioAsset } from "../../platform/types/pdpStudioPlatform";
import { decodeShopifyProductRouteId } from "../utils/shopifyProductRoute";

export type ShopifyProductWorkspacePanel = "tools" | "images" | "shopify";

export function useShopifyProductWorkspace(productId: string) {
  const resolvedProductId = useMemo(
    () => decodeShopifyProductRouteId(productId),
    [productId],
  );
  const [product, setProduct] = useState<ShopifyProductDetail | null>(null);
  const [selectedMediaId, setSelectedMediaId] = useState<string | null>(null);
  const [activePanel, setActivePanel] =
    useState<ShopifyProductWorkspacePanel>("tools");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [launchingToolId, setLaunchingToolId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const connection = await getShopifyConnection();
      if (!connection.connected) {
        throw new Error("Connect your Shopify store before opening a product.");
      }
      const nextProduct = await getShopifyProduct(
        resolvedProductId,
        connection.currency,
      );
      setProduct(nextProduct);
      setSelectedMediaId((current) =>
        current && nextProduct.media.some((media) => media.id === current)
          ? current
          : (nextProduct.media[0]?.id ?? null),
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Shopify product could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, [resolvedProductId]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refresh();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  const selectedMedia = useMemo<ShopifyProductMedia | null>(() => {
    if (!product || !selectedMediaId) return null;
    return product.media.find((media) => media.id === selectedMediaId) ?? null;
  }, [product, selectedMediaId]);

  const prepareToolSource = useCallback(
    async (tool: PdpStudioToolDefinition): Promise<PdpStudioAsset | null> => {
      if (!product) return null;
      setLaunchingToolId(tool.id);
      setError(null);
      try {
        if (!selectedMedia) {
          throw new Error(
            "Choose a Shopify product image before opening this tool.",
          );
        }
        const assets = await importShopifyProductMedia(product.id, [
          selectedMedia.id,
        ]);
        const sourceAsset = assets[0];
        if (!sourceAsset) {
          throw new Error("The selected Shopify image could not be imported.");
        }
        return sourceAsset;
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "The tool could not be opened for this product.",
        );
        return null;
      } finally {
        setLaunchingToolId(null);
      }
    },
    [product, selectedMedia],
  );

  return {
    product,
    selectedMedia,
    loading,
    error,
    launchingToolId,
    returnHref: "/pdp-studio/products",
    setSelectedMediaId,
    activePanel,
    setActivePanel,
    prepareToolSource,
    refresh,
  };
}
