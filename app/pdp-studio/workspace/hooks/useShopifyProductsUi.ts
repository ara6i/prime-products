"use client";

import { useEffect, useState } from "react";
import {
  listPdpStudioAssets,
} from "../../platform/services/pdpStudioAssetService";
import {
  createPdpStudioShopifyLink,
  getPdpStudioShopifyConnection,
  importPdpStudioShopifyProduct,
  listPdpStudioShopifyProducts,
  publishPdpStudioAsset,
} from "../../platform/services/pdpStudioShopifyService";
import type {
  PdpStudioAsset,
  PdpStudioShopifyConnection,
  PdpStudioShopifyProduct,
} from "../../platform/types/pdpStudioPlatform";

export function useShopifyProductsUi() {
  const [connection, setConnection] = useState<PdpStudioShopifyConnection | null>(null);
  const [products, setProducts] = useState<PdpStudioShopifyProduct[]>([]);
  const [generated, setGenerated] = useState<PdpStudioAsset[]>([]);
  const [shopDomain, setShopDomain] = useState("");
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [busyId, setBusyId] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      await refresh();
      const params = new URLSearchParams(window.location.search);
      const status = params.get("shopify");
      if (status === "connected") {
        setNotice("Shopify store connected.");
      } else if (status === "publish-enabled") {
        setNotice("Shopify product publishing is enabled.");
        await refresh();
      } else if (status === "error") {
        setError(
          params.get("message") ||
            "The Shopify connection could not be completed.",
        );
      }
      if (status) {
        window.history.replaceState({}, "", window.location.pathname);
      }
    })();
  }, []);

  async function refresh(): Promise<void> {
    setError(null);
    try {
      const nextConnection = await getPdpStudioShopifyConnection();
      setConnection(nextConnection);
      if (nextConnection.connected) {
        const [nextProducts, assets] = await Promise.all([
          listPdpStudioShopifyProducts(),
          listPdpStudioAssets("generated"),
        ]);
        setProducts(nextProducts);
        setGenerated(assets.filter((asset) => asset.resourceType === "image"));
        setSelectedAssetId((current) => current || assets.find((asset) => asset.resourceType === "image")?.id || "");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load Shopify products.");
    }
  }

  async function connect(): Promise<void> {
    setError(null);
    try {
      const link = await createPdpStudioShopifyLink(shopDomain);
      if (!link.linkUrl) throw new Error("The Shopify app link URL is not configured on this environment.");
      window.location.assign(link.linkUrl);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to start Shopify connection.");
    }
  }

  async function importProduct(product: PdpStudioShopifyProduct): Promise<void> {
    setBusyId(product.id);
    setError(null);
    try {
      const assets = await importPdpStudioShopifyProduct(product.id);
      setNotice(`${assets.length} image${assets.length === 1 ? "" : "s"} imported from ${product.title}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to import this product.");
    } finally {
      setBusyId("");
    }
  }

  async function publish(product: PdpStudioShopifyProduct): Promise<void> {
    if (!selectedAssetId) return;
    setBusyId(product.id);
    setError(null);
    try {
      await publishPdpStudioAsset({
        productId: product.id,
        assetId: selectedAssetId,
        altText: `Generated PDP image for ${product.title}`,
      });
      setNotice(`Generated image published to ${product.title}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to publish this image.");
    } finally {
      setBusyId("");
    }
  }

  return {
    connection,
    products,
    generated,
    shopDomain,
    selectedAssetId,
    busyId,
    notice,
    error,
    setShopDomain,
    setSelectedAssetId,
    connect,
    importProduct,
    publish,
    refresh,
  };
}
