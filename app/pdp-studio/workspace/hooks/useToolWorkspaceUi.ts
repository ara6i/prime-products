"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { previewPdpStudioToolConfiguration } from "../services/pdpStudioUiService";
import type {
  PdpStudioLocalFile,
  PdpStudioToolDefinition,
} from "../types";

type PreviewState = "idle" | "working" | "ready";

function toLocalFiles(files: File[]): PdpStudioLocalFile[] {
  return files.map((file) => ({
    id: crypto.randomUUID(),
    name: file.name,
    previewUrl: URL.createObjectURL(file),
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
  const objectUrls = useRef<string[]>([]);

  useEffect(
    () => () => {
      objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
    },
    [],
  );

  const requiresPrimaryUpload = !["text-generator", "chooser"].includes(tool.mode);
  const canPreview = useMemo(() => {
    if (previewState === "working") return false;
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
  }

  function addSecondaryFiles(files: File[]): void {
    const localFiles = toLocalFiles(files.slice(0, 4));
    objectUrls.current.push(...localFiles.map((file) => file.previewUrl));
    setSecondaryFiles(localFiles);
    setPreviewState("idle");
  }

  function selectOption(group: string, optionId: string): void {
    setSelectedOptions((current) => ({ ...current, [group]: optionId }));
    setPreviewState("idle");
  }

  async function runPreview(): Promise<void> {
    if (!canPreview) return;
    setPreviewState("working");
    const result = await previewPdpStudioToolConfiguration();
    setPreviewId(result.id);
    setPreviewState("ready");
  }

  return {
    primaryFiles,
    secondaryFiles,
    prompt,
    selectedOptions,
    previewState,
    previewId,
    canPreview,
    setPrompt,
    addPrimaryFiles,
    addSecondaryFiles,
    selectOption,
    runPreview,
  };
}
