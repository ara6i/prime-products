"use client";

import { useEffect, useState } from "react";
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
}

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
  const [previewMessage, setPreviewMessage] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (selectedImage?.previewUrl) {
        URL.revokeObjectURL(selectedImage.previewUrl);
      }
    };
  }, [selectedImage]);

  const resetGenerationState = () => {
    setActivePanel(null);
    setQuality("standard");
    setBrandEnabled(false);
    setBrandDescription("");
    setPrompt("");
    setPreviewMessage(null);
    setSelectedImage(null);
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
    setSelectedImage({
      name: file.name,
      previewUrl: URL.createObjectURL(file),
    });
    setPreviewMessage(null);
  };

  const generatePreview = () => {
    if (!activeToolId) return;
    const activeTool = PDP_STUDIO_HOME_TOOL_DIALOGS[activeToolId];
    const requiresImage =
      activeTool.mode !== "text-generator" && activeTool.mode !== "chooser";
    if (requiresImage && !selectedImage) return;
    if (!requiresImage && !prompt.trim()) return;
    setPreviewMessage(
      "UI preview ready. AI generation is intentionally not connected in this local UI build.",
    );
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
    previewMessage,
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
    generatePreview,
  };
}

export type PdpStudioHomeDialogsController = ReturnType<
  typeof usePdpStudioHomeDialogs
>;
