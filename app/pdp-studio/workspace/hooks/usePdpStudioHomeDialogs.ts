"use client";

import { useEffect, useState } from "react";
import { usePdpStudioJobProgress } from "../../platform/hooks/usePdpStudioJobProgress";
import { uploadPdpStudioAsset } from "../../platform/services/pdpStudioAssetService";
import {
  cancelPdpStudioJob,
  createPdpStudioToolJob,
  retryPdpStudioJob,
} from "../../platform/services/pdpStudioJobService";
import { PDP_STUDIO_HOME_TOOL_DIALOGS } from "../data/pdpStudioHomeDialogData";
import type {
  PdpStudioGenerationQuality,
  PdpStudioGenerationSize,
  PdpStudioHomeAiToolId,
  PdpStudioImageLibrarySource,
  PdpStudioImageLibraryTab,
  PdpStudioToolDialogPanel,
} from "../types/homeToolDialog";

interface SelectedLocalImage {
  name: string;
  previewUrl: string;
  file: File;
}

type GenerationState =
  | "idle"
  | "uploading"
  | "working"
  | "ready"
  | "failed"
  | "cancelled";

const QUALITY_TO_IMAGE_SIZE: Record<PdpStudioGenerationQuality, string> = {
  standard: "1K",
  advanced: "2K",
  premium: "4K",
};

const SIZE_TO_ASPECT_RATIO: Record<PdpStudioGenerationSize, string> = {
  original: "1:1",
  "portrait-9-16": "9:16",
  "portrait-3-4": "3:4",
  "portrait-2-3": "2:3",
  square: "1:1",
  "landscape-3-2": "3:2",
  "landscape-4-3": "4:3",
  "landscape-16-9": "16:9",
};

export function usePdpStudioHomeDialogs() {
  const [imageLibrarySource, setImageLibrarySource] =
    useState<PdpStudioImageLibrarySource | null>(null);
  const [imageLibraryTab, setImageLibraryTab] =
    useState<PdpStudioImageLibraryTab>("all");
  const [activeToolId, setActiveToolId] =
    useState<PdpStudioHomeAiToolId | null>(null);
  const [activePanel, setActivePanel] =
    useState<PdpStudioToolDialogPanel>(null);
  const [quality, setQuality] =
    useState<PdpStudioGenerationQuality>("standard");
  const [size, setSize] =
    useState<PdpStudioGenerationSize>("landscape-3-2");
  const [brandEnabled, setBrandEnabled] = useState(false);
  const [brandDescription, setBrandDescription] = useState("");
  const [prompt, setPrompt] = useState("");
  const [selectedImage, setSelectedImage] =
    useState<SelectedLocalImage | null>(null);
  const [referenceImages, setReferenceImages] = useState<SelectedLocalImage[]>(
    [],
  );
  const [localPreviewMessage, setPreviewMessage] = useState<string | null>(null);
  const [localGenerationState, setGenerationState] =
    useState<GenerationState>("idle");
  const [localGenerationError, setGenerationError] = useState<string | null>(
    null,
  );
  const {
    job,
    elapsedSeconds,
    setJob,
    watch,
    stop,
  } = usePdpStudioJobProgress();
  const generationState: GenerationState = job
    ? job.status === "succeeded"
      ? "ready"
      : job.status === "failed"
        ? "failed"
        : job.status === "cancelled"
          ? "cancelled"
          : "working"
    : localGenerationState;
  const generationError =
    localGenerationError ??
    (job?.status === "failed"
      ? job.error?.message ?? "PDP Studio generation failed."
      : null);
  const previewMessage = job
    ? job.status === "succeeded"
      ? "Generation complete."
      : job.status === "cancelled"
        ? "Generation cancelled."
        : `${job.progress.stage} · ${Math.round(job.progress.percent)}%`
    : localPreviewMessage;

  useEffect(() => {
    return () => {
      if (selectedImage?.previewUrl) {
        URL.revokeObjectURL(selectedImage.previewUrl);
      }
    };
  }, [selectedImage]);

  useEffect(() => {
    return () => {
      referenceImages.forEach((image) => URL.revokeObjectURL(image.previewUrl));
    };
  }, [referenceImages]);

  const resetGenerationState = () => {
    stop();
    setJob(null);
    setActivePanel(null);
    setQuality("standard");
    setBrandEnabled(false);
    setBrandDescription("");
    setPrompt("");
    setPreviewMessage(null);
    setSelectedImage(null);
    setReferenceImages([]);
    setGenerationState("idle");
    setGenerationError(null);
  };

  const openImageLibrary = (source: PdpStudioImageLibrarySource) => {
    setImageLibrarySource(source);
    setImageLibraryTab("all");
  };

  const closeImageLibrary = () => {
    setImageLibrarySource(null);
    setImageLibraryTab("all");
  };

  const openAiTool = (toolId: PdpStudioHomeAiToolId) => {
    resetGenerationState();
    setActiveToolId(toolId);
    setSize(PDP_STUDIO_HOME_TOOL_DIALOGS[toolId].defaultSize);
  };

  const closeAiTool = () => {
    setActiveToolId(null);
    resetGenerationState();
  };

  const switchAiTool = (toolId: PdpStudioHomeAiToolId) => {
    stop();
    setJob(null);
    setActiveToolId(toolId);
    setSize(PDP_STUDIO_HOME_TOOL_DIALOGS[toolId].defaultSize);
    setActivePanel(null);
    setPreviewMessage(null);
  };

  const togglePanel = (panel: Exclude<PdpStudioToolDialogPanel, null>) => {
    setActivePanel((current) => (current === panel ? null : panel));
  };

  const selectImageFile = (file: File | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    stop();
    setJob(null);
    setSelectedImage({
      name: file.name,
      previewUrl: URL.createObjectURL(file),
      file,
    });
    setPreviewMessage(null);
    setGenerationState("idle");
    setGenerationError(null);
  };

  const selectReferenceFiles = (files: File[]) => {
    const validFiles = files
      .filter((file) => file.type.startsWith("image/"))
      .slice(0, 4);
    setReferenceImages(
      validFiles.map((file) => ({
        name: file.name,
        previewUrl: URL.createObjectURL(file),
        file,
      })),
    );
    stop();
    setJob(null);
    setGenerationState("idle");
    setGenerationError(null);
  };

  const generatePreview = async () => {
    if (!activeToolId) return;
    const activeTool = PDP_STUDIO_HOME_TOOL_DIALOGS[activeToolId];
    if (activeTool.mode === "chooser") return;
    const requiresImage =
      activeTool.mode !== "text-generator";
    if (requiresImage && !selectedImage) return;
    if (
      activeTool.mode === "dual-upload" &&
      !activeTool.referenceUploadsOptional &&
      referenceImages.length === 0
    ) {
      setGenerationError("Add at least one real product reference image.");
      return;
    }

    stop();
    setJob(null);
    setGenerationError(null);
    setGenerationState("uploading");
    setPreviewMessage("Uploading private assets…");
    try {
      const [inputAssets, referenceAssets] = await Promise.all([
        selectedImage
          ? Promise.all([uploadPdpStudioAsset(selectedImage.file)])
          : Promise.resolve([]),
        Promise.all(
          referenceImages.map((image) =>
            uploadPdpStudioAsset(image.file),
          ),
        ),
      ]);
      setGenerationState("working");
      setPreviewMessage("Creating generation job…");
      const requestedAspectRatio = SIZE_TO_ASPECT_RATIO[size];
      const job = await createPdpStudioToolJob(activeToolId, {
        inputAssetIds: inputAssets.map((asset) => asset.id),
        referenceAssetIds: referenceAssets.map((asset) => asset.id),
        ...(prompt.trim() ? { prompt: prompt.trim() } : {}),
        options: {
          imageSize: QUALITY_TO_IMAGE_SIZE[quality],
          aspectRatio:
            activeToolId === "video-generator"
              ? requestedAspectRatio === "9:16"
                ? "9:16"
                : "16:9"
              : requestedAspectRatio,
          outputCount: activeTool.outputCount,
          ...(activeToolId === "ai-shot-list"
            ? { count: activeTool.outputCount }
            : {}),
        },
        useBrandKit: brandEnabled,
        idempotencyKey: crypto.randomUUID(),
      });
      watch(job);
    } catch (caught) {
      setGenerationState("failed");
      setGenerationError(
        caught instanceof Error
          ? caught.message
          : "PDP Studio generation failed.",
      );
      setPreviewMessage(null);
    }
  };

  const cancelGeneration = async () => {
    if (!job) return;
    try {
      setJob(await cancelPdpStudioJob(job.id));
    } catch (caught) {
      setGenerationError(
        caught instanceof Error
          ? caught.message
          : "Unable to cancel this generation.",
      );
    }
  };

  const retryGeneration = async () => {
    if (!job) return;
    setGenerationError(null);
    setGenerationState("working");
    try {
      watch(await retryPdpStudioJob(job.id));
    } catch (caught) {
      setGenerationState("failed");
      setGenerationError(
        caught instanceof Error
          ? caught.message
          : "Unable to retry this generation.",
      );
    }
  };

  return {
    imageLibrarySource,
    imageLibraryTab,
    activeToolId,
    activePanel,
    quality,
    size,
    brandEnabled,
    brandDescription,
    prompt,
    selectedImage,
    referenceImages,
    previewMessage,
    generationState,
    generationError,
    job,
    elapsedSeconds,
    openImageLibrary,
    closeImageLibrary,
    setImageLibraryTab,
    openAiTool,
    closeAiTool,
    switchAiTool,
    togglePanel,
    setActivePanel,
    setQuality,
    setSize,
    setBrandEnabled,
    setBrandDescription,
    setPrompt,
    selectImageFile,
    selectReferenceFiles,
    generatePreview,
    cancelGeneration,
    retryGeneration,
  };
}

export type PdpStudioHomeDialogsController = ReturnType<
  typeof usePdpStudioHomeDialogs
>;
