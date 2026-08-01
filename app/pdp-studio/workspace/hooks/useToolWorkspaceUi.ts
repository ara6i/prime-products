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
  const [localPreviewState, setPreviewState] = useState<PreviewState>("idle");
  const [previewId, setPreviewId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const objectUrls = useRef<string[]>([]);
  const {
    job,
    elapsedSeconds,
    setJob,
    watch,
    stop,
  } = usePdpStudioJobProgress();
  const previewState: PreviewState = job
    ? job.status === "succeeded"
      ? "ready"
      : job.status === "failed"
        ? "failed"
        : job.status === "cancelled"
          ? "cancelled"
          : "working"
    : localPreviewState;
  const effectiveError =
    error ??
    (job?.status === "failed"
      ? job.error?.message ?? "PDP Studio generation failed."
      : null);

  useEffect(() => {
    const jobId = new URL(window.location.href).searchParams.get("job");
    if (!jobId || tool.mode === "chooser") return;
    let active = true;
    void getPdpStudioJob(jobId)
      .then((job) => {
        if (!active || job.toolId !== tool.id) return;
        setPreviewId(job.id);
        watch(job);
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
  }, [tool.id, tool.mode, watch]);

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
    if (
      tool.mode === "dual-upload" &&
      !tool.referenceUploadsOptional &&
      secondaryFiles.length === 0
    ) {
      return false;
    }
    return true;
  }, [
    previewState,
    primaryFiles.length,
    requiresPrimaryUpload,
    secondaryFiles.length,
    tool.mode,
    tool.referenceUploadsOptional,
  ]);

  function addPrimaryFiles(files: File[]): void {
    const localFiles = toLocalFiles(tool.acceptsMultiple ? files.slice(0, 4) : files.slice(0, 1));
    objectUrls.current.push(...localFiles.map((file) => file.previewUrl));
    setPrimaryFiles(localFiles);
    stop();
    setJob(null);
    setPreviewState("idle");
    setError(null);
  }

  function addSecondaryFiles(files: File[]): void {
    const localFiles = toLocalFiles(files.slice(0, 4));
    objectUrls.current.push(...localFiles.map((file) => file.previewUrl));
    setSecondaryFiles(localFiles);
    stop();
    setJob(null);
    setPreviewState("idle");
    setError(null);
  }

  function selectOption(group: string, optionId: string): void {
    setSelectedOptions((current) => ({ ...current, [group]: optionId }));
    stop();
    setJob(null);
    setPreviewState("idle");
    setError(null);
  }

  async function runPreview(): Promise<void> {
    if (!canPreview || tool.id === "ai-images") return;
    stop();
    setJob(null);
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
      watch(job);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "PDP Studio generation failed.",
      );
      setPreviewState("failed");
    }
  }

  async function cancel(): Promise<void> {
    if (!job) return;
    try {
      const cancelledJob = await cancelPdpStudioJob(job.id);
      setJob(cancelledJob);
      setPreviewState("cancelled");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to cancel this job.");
    }
  }

  async function retry(): Promise<void> {
    if (!job) return;
    setError(null);
    setPreviewState("working");
    try {
      const retriedJob = await retryPdpStudioJob(job.id);
      setPreviewId(retriedJob.id);
      rememberPdpStudioJobId(retriedJob.id);
      watch(retriedJob);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to retry this job.");
      setPreviewState("failed");
    }
  }

  return {
    primaryFiles,
    secondaryFiles,
    prompt,
    selectedOptions,
    previewState,
    previewId,
    job,
    elapsedSeconds,
    error: effectiveError,
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
