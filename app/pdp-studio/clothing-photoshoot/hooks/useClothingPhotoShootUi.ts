"use client";

import { useEffect, useMemo, useState } from "react";
import type { PdpStudioClothingPhotoShootGenerateResult, PdpStudioPhotoShootView } from "../../types";
import { requestClothingPhotoShootGeneration } from "../services/clothingPhotoShootGenerationService";
import { fileToImageDataUri } from "../utils/imageDataUri";

export type ClothingPhotoShootPicker = "model" | "background" | "pose" | "quality" | "size" | "brand";

export function useClothingPhotoShootUi(view: PdpStudioPhotoShootView) {
  const [selectedModelId, setSelectedModelId] = useState(view.models[0]?.id ?? "");
  const [selectedBackgroundId, setSelectedBackgroundId] = useState(view.backgrounds[0]?.id ?? "");
  const [selectedPoseId, setSelectedPoseId] = useState(view.poses[0]?.id ?? "");
  const [selectedQualityId, setSelectedQualityId] = useState(view.qualities.find((item) => item.id === "standard")?.id ?? view.qualities[0]?.id ?? "");
  const [selectedSizeId, setSelectedSizeId] = useState(view.sizes.find((item) => item.id === "portrait-2-3")?.id ?? view.sizes[0]?.id ?? "");
  const [selectedBrandStyleId, setSelectedBrandStyleId] = useState(view.brandStyles[0]?.id ?? "");
  const [activePicker, setActivePicker] = useState<ClothingPhotoShootPicker | null>(null);
  const [prompt, setPrompt] = useState("");
  const [garmentImageDataUri, setGarmentImageDataUri] = useState("");
  const [garmentFileName, setGarmentFileName] = useState("");
  const [garmentFile, setGarmentFile] = useState<File | null>(null);
  const [generatedResults, setGeneratedResults] = useState<PdpStudioClothingPhotoShootGenerateResult[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStartedAt, setGenerationStartedAt] = useState<number | null>(null);
  const [generationElapsedSeconds, setGenerationElapsedSeconds] = useState(0);
  const [generationError, setGenerationError] = useState("");

  const selectedModel = useMemo(
    () => view.models.find((item) => item.id === selectedModelId) ?? view.models[0],
    [selectedModelId, view.models],
  );
  const selectedBackground = useMemo(
    () => view.backgrounds.find((item) => item.id === selectedBackgroundId) ?? view.backgrounds[0],
    [selectedBackgroundId, view.backgrounds],
  );
  const selectedPose = useMemo(
    () => view.poses.find((item) => item.id === selectedPoseId) ?? view.poses[0],
    [selectedPoseId, view.poses],
  );
  const selectedQuality = useMemo(
    () => view.qualities.find((item) => item.id === selectedQualityId) ?? view.qualities[0],
    [selectedQualityId, view.qualities],
  );
  const selectedSize = useMemo(
    () => view.sizes.find((item) => item.id === selectedSizeId) ?? view.sizes[0],
    [selectedSizeId, view.sizes],
  );
  const selectedBrandStyle = useMemo(
    () => view.brandStyles.find((item) => item.id === selectedBrandStyleId) ?? view.brandStyles[0],
    [selectedBrandStyleId, view.brandStyles],
  );

  useEffect(() => {
    if (!generationStartedAt) {
      return;
    }
    const interval = window.setInterval(() => {
      setGenerationElapsedSeconds(Math.max(0, Math.floor((Date.now() - generationStartedAt) / 1000)));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [generationStartedAt]);

  const canGenerate = Boolean(
    garmentFile &&
      selectedModel &&
      selectedBackground &&
      selectedPose &&
      selectedQuality &&
      selectedSize &&
      selectedBrandStyle &&
      !isGenerating,
  );

  async function selectGarmentFile(file: File | undefined): Promise<void> {
    if (!file) return;

    try {
      setGenerationError("");
      setGarmentImageDataUri(await fileToImageDataUri(file));
      setGarmentFileName(file.name);
      setGarmentFile(file);
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : "Could not load clothing image.");
    }
  }

  async function generatePhotoShoot(): Promise<void> {
    if (!canGenerate || !selectedModel || !selectedBackground || !selectedPose || !selectedQuality || !selectedSize || !selectedBrandStyle) {
      setGenerationError("Upload a clothing image and choose model, pose, background, quality, and size.");
      return;
    }

    setIsGenerating(true);
    setGenerationElapsedSeconds(0);
    setGenerationStartedAt(Date.now());
    setGenerationError("");

    try {
      if (!garmentFile) {
        throw new Error("Upload a clothing image before generating.");
      }
      const result = await requestClothingPhotoShootGeneration({
        garmentFile,
        model: selectedModel,
        pose: selectedPose,
        background: selectedBackground,
        quality: selectedQuality,
        size: selectedSize,
        brandStyle: selectedBrandStyle,
        prompt,
      });
      setGeneratedResults((current) => [result, ...current]);
      setActivePicker(null);
    } catch (error) {
      setGenerationError(error instanceof Error ? error.message : "Generation failed.");
    } finally {
      setIsGenerating(false);
      setGenerationStartedAt(null);
      setGenerationElapsedSeconds(0);
    }
  }

  return {
    selectedModel,
    selectedBackground,
    selectedPose,
    selectedQuality,
    selectedSize,
    selectedBrandStyle,
    selectedModelId,
    selectedBackgroundId,
    selectedPoseId,
    selectedQualityId,
    selectedSizeId,
    selectedBrandStyleId,
    activePicker,
    quality: selectedQuality?.resolution ?? "1K",
    size: selectedSize?.label ?? "Portrait (2:3)",
    brandStyle: selectedBrandStyle?.label ?? "Off",
    prompt,
    garmentImageDataUri,
    garmentFileName,
    generatedResults,
    generationError,
    isGenerating,
    generationElapsedSeconds,
    canGenerate,
    openPicker: setActivePicker,
    closePicker: () => setActivePicker(null),
    setSelectedModelId,
    setSelectedBackgroundId,
    setSelectedPoseId,
    setSelectedQualityId,
    setSelectedSizeId,
    setSelectedBrandStyleId,
    setPrompt,
    selectGarmentFile,
    generatePhotoShoot,
  };
}
