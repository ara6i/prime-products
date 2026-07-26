"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePdpStudioJobProgress } from "../../platform/hooks/usePdpStudioJobProgress";
import { uploadPdpStudioAsset } from "../../platform/services/pdpStudioAssetService";
import {
  cancelPdpStudioJob,
  createPdpStudioToolJob,
  getPdpStudioJob,
  retryPdpStudioJob,
} from "../../platform/services/pdpStudioJobService";
import { mapPdpStudioToolOptions } from "../mappers/pdpStudioToolRequestMapper";
import type {
  PdpStudioLocalFile,
  PdpStudioToolDefinition,
} from "../types";

type PreviewState =
  | "idle"
  | "uploading"
  | "working"
  | "ready"
  | "failed"
  | "cancelled";

function toLocalFiles(files: File[]): PdpStudioLocalFile[] {
  return files.map((file) => ({
    id: crypto.randomUUID(),
    name: file.name,
    previewUrl: URL.createObjectURL(file),
    file,
  }));
}

export function useToolWorkspaceUi(tool: PdpStudioToolDefinition) {
  const [primaryFiles, setPrimaryFiles] = useState<PdpStudioLocalFile[]>([]);
  const [secondaryFiles, setSecondaryFiles] = useState<PdpStudioLocalFile[]>([]);
  const [prompt, setPrompt] = useState("");
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(
    () =>
      Object.fromEntries(
        (tool.options ?? []).map((option) => [option.label, option.values[0]?.id ?? ""]),
      ),
  );
  const [previewState, setPreviewState] = useState<PreviewState>("idle");
  const [previewId, setPreviewId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const objectUrls = useRef<string[]>([]);
  const progress = usePdpStudioJobProgress();

  useEffect(() => {
    const jobId = new URL(window.location.href).searchParams.get("job");
    if (!jobId || tool.mode === "chooser") return;
    let active = true;
    void getPdpStudioJob(jobId)
      .then((job) => {
        if (!active || job.toolId !== tool.id) return;
        setPreviewId(job.id);
        progress.watch(job);
      })
      .catch((caught) => {
        if (!active) return;
        setError(
          caught instanceof Error
            ? caught.message
            : "Unable to resume the PDP Studio job.",
        );
      });
    return () => {
      active = false;
    };
  }, [progress.watch, tool.id, tool.mode]);

  useEffect(
    () => () => {
      objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
    },
    [],
  );

  const requiresPrimaryUpload = !["text-generator", "chooser"].includes(tool.mode);
  const canPreview = useMemo(() => {
    if (previewState === "uploading" || previewState === "working") return false;
    if (requiresPrimaryUpload && primaryFiles.length === 0) return false;
    if (tool.mode === "dual-upload" && secondaryFiles.length === 0) return false;
    if (tool.mode === "text-generator" && !prompt.trim()) return false;
    return true;
  }, [previewState, primaryFiles.length, prompt, requiresPrimaryUpload, secondaryFiles.length, tool.mode]);

  function addPrimaryFiles(files: File[]): void {
    const localFiles = toLocalFiles(tool.acceptsMultiple ? files.slice(0, 4) : files.slice(0, 1));
    objectUrls.current.push(...localFiles.map((file) => file.previewUrl));
    setPrimaryFiles(localFiles);
    setPreviewState("idle");
    setError(null);
  }

  function addSecondaryFiles(files: File[]): void {
    const localFiles = toLocalFiles(files.slice(0, 4));
    objectUrls.current.push(...localFiles.map((file) => file.previewUrl));
    setSecondaryFiles(localFiles);
    setPreviewState("idle");
    setError(null);
  }

  function selectOption(group: string, optionId: string): void {
    setSelectedOptions((current) => ({ ...current, [group]: optionId }));
    setPreviewState("idle");
    setError(null);
  }

  async function runPreview(): Promise<void> {
    if (!canPreview || tool.id === "ai-images") return;
    setError(null);
    setPreviewState("uploading");
    try {
      const [primaryAssets, referenceAssets] = await Promise.all([
        Promise.all(
          primaryFiles.flatMap((item) =>
            item.file ? [uploadPdpStudioAsset(item.file)] : [],
          ),
        ),
        Promise.all(
          secondaryFiles.flatMap((item) =>
            item.file ? [uploadPdpStudioAsset(item.file)] : [],
          ),
        ),
      ]);
      const mapped = mapPdpStudioToolOptions(tool, selectedOptions);
      setPreviewState("working");
      const job = await createPdpStudioToolJob(tool.id, {
        inputAssetIds: primaryAssets.map((asset) => asset.id),
        referenceAssetIds: referenceAssets.map((asset) => asset.id),
        ...(prompt.trim() ? { prompt: prompt.trim() } : {}),
        options: mapped.options,
        useBrandKit: mapped.useBrandKit,
        idempotencyKey: crypto.randomUUID(),
      });
      setPreviewId(job.id);
      rememberPdpStudioJobId(job.id);
      progress.watch(job);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "PDP Studio generation failed.",
      );
      setPreviewState("failed");
    }
  }

  async function cancel(): Promise<void> {
    if (!progress.job) return;
    try {
      const job = await cancelPdpStudioJob(progress.job.id);
      progress.setJob(job);
      setPreviewState("cancelled");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to cancel this job.");
    }
  }

  async function retry(): Promise<void> {
    if (!progress.job) return;
    setError(null);
    setPreviewState("working");
    try {
      const job = await retryPdpStudioJob(progress.job.id);
      setPreviewId(job.id);
      rememberPdpStudioJobId(job.id);
      progress.watch(job);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to retry this job.");
      setPreviewState("failed");
    }
  }

  useEffect(() => {
    if (!progress.job) return;
    if (progress.job.status === "succeeded") setPreviewState("ready");
    else if (progress.job.status === "failed") {
      setPreviewState("failed");
      setError(progress.job.error?.message ?? "PDP Studio generation failed.");
    } else if (progress.job.status === "cancelled") setPreviewState("cancelled");
    else setPreviewState("working");
  }, [progress.job]);

  return {
    primaryFiles,
    secondaryFiles,
    prompt,
    selectedOptions,
    previewState,
    previewId,
    job: progress.job,
    error,
    canPreview,
    setPrompt,
    addPrimaryFiles,
    addSecondaryFiles,
    selectOption,
    runPreview,
    cancel,
    retry,
  };
}

function rememberPdpStudioJobId(jobId: string): void {
  const url = new URL(window.location.href);
  url.searchParams.set("job", jobId);
  window.history.replaceState(window.history.state, "", url);
}
