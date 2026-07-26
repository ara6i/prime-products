"use client";

import { useCallback, useEffect, useState } from "react";
import {
  deletePdpStudioAsset,
  listPdpStudioAssets,
  uploadPdpStudioAsset,
} from "../../platform/services/pdpStudioAssetService";
import { listPdpStudioJobs } from "../../platform/services/pdpStudioJobService";
import {
  getPdpStudioShopifyConnection,
  listPdpStudioShopifyProducts,
} from "../../platform/services/pdpStudioShopifyService";
import type {
  PdpStudioAsset,
  PdpStudioJob,
  PdpStudioShopifyConnection,
  PdpStudioShopifyProduct,
} from "../../platform/types/pdpStudioPlatform";

export type PdpStudioLibraryTab = "uploads" | "products" | "generated";

export function usePdpStudioAssetLibrary() {
  const [tab, setTab] = useState<PdpStudioLibraryTab>("uploads");
  const [uploads, setUploads] = useState<PdpStudioAsset[]>([]);
  const [generated, setGenerated] = useState<PdpStudioAsset[]>([]);
  const [products, setProducts] = useState<PdpStudioShopifyProduct[]>([]);
  const [jobs, setJobs] = useState<PdpStudioJob[]>([]);
  const [connection, setConnection] =
    useState<PdpStudioShopifyConnection | null>(null);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [nextUploads, nextGenerated, nextJobs, nextConnection] =
        await Promise.all([
          listPdpStudioAssets("upload"),
          listPdpStudioAssets("generated"),
          listPdpStudioJobs(8),
          getPdpStudioShopifyConnection(),
        ]);
      setUploads(nextUploads);
      setGenerated(nextGenerated);
      setJobs(nextJobs);
      setConnection(nextConnection);
      setProducts(
        nextConnection.connected
          ? await listPdpStudioShopifyProducts()
          : [],
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to load the PDP Studio library.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function upload(files: File[]): Promise<void> {
    if (!files.length) return;
    setWorking(true);
    setError(null);
    try {
      await Promise.all(files.slice(0, 20).map((file) => uploadPdpStudioAsset(file)));
      await refresh();
      setTab("uploads");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Upload failed.");
    } finally {
      setWorking(false);
    }
  }

  async function remove(assetId: string): Promise<void> {
    setWorking(true);
    setError(null);
    try {
      await deletePdpStudioAsset(assetId);
      setUploads((current) => current.filter((asset) => asset.id !== assetId));
      setGenerated((current) =>
        current.filter((asset) => asset.id !== assetId),
      );
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to delete this asset.",
      );
    } finally {
      setWorking(false);
    }
  }

  return {
    tab,
    uploads,
    generated,
    products,
    jobs,
    connection,
    loading,
    working,
    error,
    setTab,
    upload,
    remove,
    refresh,
  };
}
