"use client";

import { useState, useCallback } from "react";
import { uploadPhoto } from "@/app/try-on/services/vto.service";
import type { SelectionTab, BodyType } from "@/app/try-on/types";

interface UseSelectionPanelParams {
  selectedModelId: string | null;
  onModelSelect: (id: string) => void;
  onUploadedModelSelect: (url: string) => void;
}

export function useSelectionPanel({
  selectedModelId,
  onModelSelect,
  onUploadedModelSelect,
}: UseSelectionPanelParams) {
  const [activeTab, setActiveTab] = useState<SelectionTab>("choose-model");
  const [bodyType, setBodyType] = useState<BodyType>("full-body");
  const [accordionOpen, setAccordionOpen] = useState(false);
  const [previewModelId, setPreviewModelId] = useState<string | null>(
    selectedModelId,
  );

  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleSaveModel = () => {
    if (previewModelId) {
      onModelSelect(previewModelId);
    }
  };

  const handleUploadFile = useCallback(async (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      setUploadError("File size must be under 2MB");
      return;
    }
    const validTypes = ["image/jpeg", "image/png"];
    if (!validTypes.includes(file.type)) {
      setUploadError("Only .jpg and .png files are supported");
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    try {
      const url = await uploadPhoto(file);
      setUploadedPhotoUrl(url);
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Upload failed",
      );
    } finally {
      setIsUploading(false);
    }
  }, []);

  const handleSaveUploadedModel = useCallback(() => {
    if (uploadedPhotoUrl) {
      onUploadedModelSelect(uploadedPhotoUrl);
    }
  }, [uploadedPhotoUrl, onUploadedModelSelect]);

  const handleClearUpload = useCallback(() => {
    setUploadedPhotoUrl(null);
    setUploadError(null);
  }, []);

  return {
    activeTab,
    setActiveTab,
    bodyType,
    setBodyType,
    accordionOpen,
    setAccordionOpen,
    previewModelId,
    setPreviewModelId,
    handleSaveModel,
    // Upload
    uploadedPhotoUrl,
    isUploading,
    uploadError,
    handleUploadFile,
    handleSaveUploadedModel,
    handleClearUpload,
  };
}
