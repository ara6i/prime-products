"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  createShopifyConnectionLink,
  disconnectShopifyConnection,
  getShopifyConnection,
  importShopifyProductImages,
  listShopifyProducts,
} from "../services/shopifyProductsService";
import type {
  ShopifyConnection,
  ShopifyProduct,
  ShopifyProductsStatusFilter,
  ShopifyProductsViewMode,
} from "../types/shopifyProducts";

const EMPTY_CONNECTION: ShopifyConnection = {
  connected: false,
  shopDomain: null,
  storeName: null,
  currency: null,
  canPublish: false,
  publishAccessUrl: null,
};

export function useShopifyProducts() {
  const searchParams = useSearchParams();
  const [connection, setConnection] =
    useState<ShopifyConnection>(EMPTY_CONNECTION);
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [loadingConnection, setLoadingConnection] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [importingProductIds, setImportingProductIds] = useState<Set<string>>(
    new Set(),
  );
  const [importedCounts, setImportedCounts] = useState<Record<string, number>>(
    {},
  );
  const [endCursor, setEndCursor] = useState<string | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [searchDraft, setSearchDraft] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<ShopifyProductsStatusFilter>("all");
  const [viewMode, setViewMode] = useState<ShopifyProductsViewMode>("grid");
  const [error, setError] = useState<string | null>(
    searchParams.get("shopify") === "error"
      ? searchParams.get("message") || "Shopify connection failed."
      : null,
  );
  const [onboardingOpen, setOnboardingOpen] = useState(
    searchParams.get("onboarding") === "1",
  );
  const [tourStep, setTourStep] = useState(0);

  const buildShopifyQuery = useCallback(() => {
    const parts: string[] = [];
    const normalizedSearch = searchQuery.trim();
    if (normalizedSearch) parts.push(normalizedSearch);
    if (statusFilter !== "all") parts.push(`status:${statusFilter}`);
    return parts.join(" ");
  }, [searchQuery, statusFilter]);

  const loadProducts = useCallback(
    async ({
      append = false,
      after,
    }: { append?: boolean; after?: string } = {}) => {
      if (append) {
        setLoadingMore(true);
      } else {
        setLoadingProducts(true);
      }
      setError(null);
      try {
        const page = await listShopifyProducts({
          limit: 30,
          after,
          query: buildShopifyQuery() || undefined,
          currency: connection.currency,
        });
        setProducts((current) =>
          append ? [...current, ...page.products] : page.products,
        );
        setEndCursor(page.endCursor);
        setHasNextPage(page.hasNextPage);
      } catch (caught) {
        setError(
          caught instanceof Error
            ? caught.message
            : "Shopify products could not be loaded.",
        );
      } finally {
        if (append) {
          setLoadingMore(false);
        } else {
          setLoadingProducts(false);
        }
      }
    },
    [buildShopifyQuery, connection.currency],
  );

  const refreshConnection = useCallback(async () => {
    setLoadingConnection(true);
    setError(null);
    try {
      const nextConnection = await getShopifyConnection();
      setConnection(nextConnection);
      return nextConnection;
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Shopify connection could not be loaded.",
      );
      return EMPTY_CONNECTION;
    } finally {
      setLoadingConnection(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshConnection();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [refreshConnection]);

  useEffect(() => {
    if (!connection.connected) return;
    const timer = window.setTimeout(() => {
      void loadProducts();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [connection.connected, loadProducts]);

  const connect = useCallback(async (shopDomain: string) => {
    setConnecting(true);
    setError(null);
    try {
      const linkUrl = await createShopifyConnectionLink(shopDomain);
      window.location.assign(linkUrl);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Shopify installation could not start.",
      );
      setConnecting(false);
    }
  }, []);

  const disconnect = useCallback(async () => {
    setDisconnecting(true);
    setError(null);
    try {
      await disconnectShopifyConnection();
      setConnection(EMPTY_CONNECTION);
      setProducts([]);
      setEndCursor(null);
      setHasNextPage(false);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Shopify could not be disconnected.",
      );
    } finally {
      setDisconnecting(false);
    }
  }, []);

  const importProduct = useCallback(async (productId: string) => {
    setImportingProductIds((current) => new Set(current).add(productId));
    setError(null);
    try {
      const count = await importShopifyProductImages(productId);
      setImportedCounts((current) => ({ ...current, [productId]: count }));
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Product images could not be imported.",
      );
    } finally {
      setImportingProductIds((current) => {
        const next = new Set(current);
        next.delete(productId);
        return next;
      });
    }
  }, []);

  const submitSearch = useCallback(() => {
    setSearchQuery(searchDraft.trim());
  }, [searchDraft]);

  const clearSearch = useCallback(() => {
    setSearchDraft("");
    setSearchQuery("");
  }, []);

  const onboardingReady =
    connection.connected && !loadingProducts && !error;
  const onboardingProductCount = products.length;
  const tourProductImages = useMemo(
    () =>
      products
        .map((product) => product.featuredImage)
        .filter((image): image is string => Boolean(image))
        .slice(0, 6),
    [products],
  );

  return {
    connection,
    products,
    loadingConnection,
    loadingProducts,
    loadingMore,
    connecting,
    disconnecting,
    importingProductIds,
    importedCounts,
    hasNextPage,
    searchDraft,
    statusFilter,
    viewMode,
    error,
    onboardingOpen,
    onboardingReady,
    onboardingProductCount,
    tourStep,
    tourProductImages,
    setSearchDraft,
    setStatusFilter,
    setViewMode,
    setOnboardingOpen,
    setTourStep,
    connect,
    disconnect,
    importProduct,
    submitSearch,
    clearSearch,
    refreshProducts: () => loadProducts(),
    loadMore: () =>
      loadProducts({ append: true, after: endCursor ?? undefined }),
  };
}
