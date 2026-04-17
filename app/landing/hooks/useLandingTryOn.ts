"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { LANDING_PRODUCTS, LANDING_MODELS } from "@/app/landing/data/try-on-data";
import {
  startGuestTryOn,
  getGuestTryOnStatus,
  imageToBase64,
} from "@/app/landing/services/guest-vto.service";
import type { LandingClothingCategory, TryOnPhase } from "@/app/landing/types/try-on";

const POLL_INTERVAL_MS = 2500;
const POLL_TIMEOUT_MS = 90_000;

export function useLandingTryOn() {
  const [activeCategory, setActiveCategory] = useState<LandingClothingCategory>("upper-body");
  const [selectedModelId, setSelectedModelId] = useState<string | null>(null);
  const [tryOnProductIds, setTryOnProductIds] = useState<Set<string>>(new Set());
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  const [phase, setPhase] = useState<TryOnPhase>("idle");
  const [resultImageUrl, setResultImageUrl] = useState<string | null>(null);

  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pollStart = useRef<number>(0);

  const stopPolling = useCallback(() => {
    if (pollTimer.current) {
      clearTimeout(pollTimer.current);
      pollTimer.current = null;
    }
  }, []);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const pollStatus = useCallback(
    (id: string) => {
      if (Date.now() - pollStart.current > POLL_TIMEOUT_MS) {
        stopPolling();
        setPhase("failed");
        return;
      }

      pollTimer.current = setTimeout(async () => {
        try {
          const data = await getGuestTryOnStatus(id);
          if (data.status === "completed" && data.resultImageUrl) {
            stopPolling();
            setResultImageUrl(data.resultImageUrl);
            setPhase("complete");
          } else if (data.status === "failed") {
            stopPolling();
            setPhase("failed");
          } else {
            pollStatus(id);
          }
        } catch {
          pollStatus(id);
        }
      }, POLL_INTERVAL_MS);
    },
    [stopPolling],
  );

  const handleCategoryChange = useCallback((category: LandingClothingCategory) => {
    setActiveCategory(category);
  }, []);

  const handleModelSelect = useCallback((modelId: string) => {
    setSelectedModelId(modelId);
    setUploadedImage(null);
  }, []);

  const handleTryOn = useCallback((productId: string) => {
    setTryOnProductIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  }, []);

  const handleImageUpload = useCallback((file: File) => {
    const url = URL.createObjectURL(file);
    setUploadedImage(url);
    setSelectedModelId(null);
  }, []);

  const handleGenerate = useCallback(async () => {
    const modelSrc =
      uploadedImage ?? LANDING_MODELS.find((m) => m.id === selectedModelId)?.imageUrl;
    const firstProductId = Array.from(tryOnProductIds)[0];
    const garmentSrc = LANDING_PRODUCTS.find((p) => p.id === firstProductId)?.imageUrl;

    if (!modelSrc || !garmentSrc) return;

    setPhase("generating");
    setResultImageUrl(null);

    try {
      const [modelBase64, garmentBase64] = await Promise.all([
        imageToBase64(modelSrc),
        imageToBase64(garmentSrc),
      ]);

      const result = await startGuestTryOn(modelBase64, garmentBase64);

      if ("alreadyUsed" in result) {
        if (result.status === "completed" && result.resultImageUrl) {
          setResultImageUrl(result.resultImageUrl);
          setPhase("complete");
        } else {
          setPhase("already_used");
        }
        return;
      }

      pollStart.current = Date.now();
      pollStatus(result.jobId);
    } catch {
      setPhase("failed");
    }
  }, [selectedModelId, uploadedImage, tryOnProductIds, pollStatus]);

  const handleReset = useCallback(() => {
    stopPolling();
    setPhase("idle");
    setResultImageUrl(null);
    setSelectedModelId(null);
    setUploadedImage(null);
    setTryOnProductIds(new Set());
  }, [stopPolling]);

  const canGenerate =
    phase === "idle" &&
    (selectedModelId !== null || uploadedImage !== null) &&
    tryOnProductIds.size > 0;

  return {
    products: LANDING_PRODUCTS,
    models: LANDING_MODELS,
    activeCategory,
    selectedModelId,
    tryOnProductIds,
    uploadedImage,
    phase,
    resultImageUrl,
    canGenerate,
    handleCategoryChange,
    handleModelSelect,
    handleTryOn,
    handleImageUpload,
    handleGenerate,
    handleReset,
  };
}
