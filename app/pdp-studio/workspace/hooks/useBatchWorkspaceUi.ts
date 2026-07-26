"use client";

import { useEffect, useRef, useState } from "react";
import { uploadPdpStudioAsset } from "../../platform/services/pdpStudioAssetService";
import {
  cancelPdpStudioBatch,
  createPdpStudioBatch,
  getPdpStudioBatch,
  pdpStudioBatchDownloadUrl,
  retryFailedPdpStudioBatch,
} from "../../platform/services/pdpStudioBatchService";
import type { PdpStudioBatch } from "../../platform/types/pdpStudioPlatform";
import { mapPdpStudioBatchPreset } from "../mappers/pdpStudioBatchPresetMapper";
import type { PdpStudioLocalFile } from "../types";

export function useBatchWorkspaceUi() {
  const [files, setFiles] = useState<PdpStudioLocalFile[]>([]);
  const [selectedBackground, setSelectedBackground] = useState("transparent-cutout");
  const [batch, setBatch] = useState<PdpStudioBatch | null>(null);
  const [state, setState] = useState<"idle" | "uploading" | "processing" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const objectUrls = useRef<string[]>([]);
  const pollRef = useRef<number | null>(null);

  useEffect(
    () => () => {
      objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
      if (pollRef.current) window.clearInterval(pollRef.current);
    },
    [],
  );

  useEffect(() => {
    const batchId = new URL(window.location.href).searchParams.get("batch");
    if (!batchId) return;
    let active = true;
    void getPdpStudioBatch(batchId)
      .then((next) => {
        if (!active) return;
        setBatch(next);
        const terminal = [
          "succeeded",
          "partially_failed",
          "failed",
          "cancelled",
        ].includes(next.status);
        if (terminal) {
          setState(
            next.status === "succeeded" || next.status === "partially_failed"
              ? "done"
              : "error",
          );
        } else {
          setState("processing");
          startPolling(next.id);
        }
      })
      .catch((caught) => {
        if (!active) return;
        setError(
          caught instanceof Error
            ? caught.message
            : "Unable to resume the Batch.",
        );
        setState("error");
      });
    return () => {
      active = false;
    };
  }, []);

  function addFiles(incoming: File[]): void {
    const localFiles = incoming.slice(0, 250).map((file) => ({
      id: crypto.randomUUID(),
      name: file.name,
      previewUrl: URL.createObjectURL(file),
      file,
    }));
    objectUrls.current.push(...localFiles.map((file) => file.previewUrl));
    setFiles(localFiles);
    setBatch(null);
    setState("idle");
    setError(null);
  }

  function startPolling(batchId: string): void {
    if (pollRef.current) window.clearInterval(pollRef.current);
    const poll = () => {
      void getPdpStudioBatch(batchId)
        .then((next) => {
          setBatch(next);
          const terminal = ["succeeded", "partially_failed", "failed", "cancelled"].includes(next.status);
          if (terminal) {
            setState(next.status === "succeeded" || next.status === "partially_failed" ? "done" : "error");
            if (pollRef.current) window.clearInterval(pollRef.current);
            pollRef.current = null;
          }
        })
        .catch((caught) => {
          setError(caught instanceof Error ? caught.message : "Unable to refresh the Batch.");
        });
    };
    poll();
    pollRef.current = window.setInterval(poll, 2_000);
  }

  async function processBatch(): Promise<void> {
    const rawFiles = files.flatMap((item) => (item.file ? [item.file] : []));
    if (rawFiles.length === 0) return;
    setError(null);
    setState("uploading");
    try {
      const assets = await mapWithConcurrency(rawFiles, 4, uploadPdpStudioAsset);
      setState("processing");
      const processor = mapPdpStudioBatchPreset(selectedBackground);
      const created = await createPdpStudioBatch({
        name: `Background batch ${new Date().toLocaleDateString()}`,
        toolId: processor.toolId,
        inputAssetIds: assets.map((asset) => asset.id),
        ...(processor.prompt ? { prompt: processor.prompt } : {}),
        options: processor.options,
        useBrandKit: false,
      });
      setBatch(created);
      rememberPdpStudioBatchId(created.id);
      startPolling(created.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to start this Batch.");
      setState("error");
    }
  }

  async function cancel(): Promise<void> {
    if (!batch) return;
    const next = await cancelPdpStudioBatch(batch.id);
    setBatch(next);
    setState("error");
  }

  async function retryFailed(): Promise<void> {
    if (!batch) return;
    setState("processing");
    setError(null);
    try {
      const next = await retryFailedPdpStudioBatch(batch.id);
      setBatch(next);
      startPolling(next.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to retry failed items.");
      setState("error");
    }
  }

  return {
    files,
    selectedBackground,
    batch,
    state,
    error,
    canProcess: files.length > 0 && state !== "uploading" && state !== "processing",
    downloadUrl: batch ? pdpStudioBatchDownloadUrl(batch.id) : null,
    addFiles,
    setSelectedBackground,
    processBatch,
    cancel,
    retryFailed,
  };
}

function rememberPdpStudioBatchId(batchId: string): void {
  const url = new URL(window.location.href);
  url.searchParams.set("batch", batchId);
  window.history.replaceState(window.history.state, "", url);
}

async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let nextIndex = 0;
  const runners = Array.from(
    { length: Math.min(concurrency, items.length) },
    async () => {
      while (nextIndex < items.length) {
        const index = nextIndex;
        nextIndex += 1;
        results[index] = await worker(items[index] as T);
      }
    },
  );
  await Promise.all(runners);
  return results;
}
