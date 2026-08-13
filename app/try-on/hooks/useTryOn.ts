"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  startTryOn,
  checkTryOnStatus,
} from "@/app/try-on/services/vto.service";
import type { TryOnStatus, TryOnProductDetail } from "@/app/try-on/types";

const POLL_INTERVAL = 3000;

async function preloadImage(imageUrl: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const image = new Image();

    image.onload = () => {
      image.decode().then(resolve).catch(resolve);
    };
    image.onerror = () => reject(new Error("Generated image could not be loaded"));
    image.src = imageUrl;
  });
}

export function useTryOn() {
  const [status, setStatus] = useState<TryOnStatus>("idle");
  const [resultImageUrl, setResultImageUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const galleryIdRef = useRef<string | null>(null);
  const pollTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const abortRef = useRef(false);

  const revealCompletedImage = useCallback(
    async (imageUrl: string, galleryId: string) => {
      clearTimeout(pollTimerRef.current);

      try {
        await preloadImage(imageUrl);
      } catch {
        // The browser can still retry the image when it is rendered.
      }

      if (abortRef.current || galleryIdRef.current !== galleryId) return;

      setResultImageUrl(imageUrl);
      setStatus("completed");
    },
    [],
  );

  // Listen for VTO updates dispatched by useUnifiedStream via window events
  useEffect(() => {
    const handler = (e: Event) => {
      const data = (e as CustomEvent).detail;
      if (!galleryIdRef.current) return;
      if (data.galleryId !== galleryIdRef.current) return;

      if (data.status === "completed" && data.imageUrl) {
        void revealCompletedImage(data.imageUrl, data.galleryId);
      } else if (data.status === "failed") {
        setError(data.error || "Generation failed");
        setStatus("error");
        clearTimeout(pollTimerRef.current);
      }
    };

    window.addEventListener("vto-update", handler);
    return () => window.removeEventListener("vto-update", handler);
  }, [revealCompletedImage]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      abortRef.current = true;
      clearTimeout(pollTimerRef.current);
    };
  }, []);

  // Polling fallback — in case SSE misses the event
  const startPolling = useCallback((galleryId: string) => {
    const poll = async () => {
      if (abortRef.current) return;
      try {
        const data = await checkTryOnStatus(galleryId);
        if (abortRef.current) return;
        if (data.status === "completed" && data.imageUrl) {
          void revealCompletedImage(data.imageUrl, galleryId);
        } else if (data.status === "failed") {
          setError(data.error || "Generation failed. Please try again.");
          setStatus("error");
        } else {
          pollTimerRef.current = setTimeout(poll, POLL_INTERVAL);
        }
      } catch {
        if (!abortRef.current) {
          pollTimerRef.current = setTimeout(poll, POLL_INTERVAL);
        }
      }
    };
    pollTimerRef.current = setTimeout(poll, POLL_INTERVAL);
  }, [revealCompletedImage]);

  const generate = useCallback(
    async (params: {
      modelImage: string;
      garments: TryOnProductDetail[];
    }) => {
      if (!params.modelImage || params.garments.length === 0) return;

      setStatus("generating");
      setError(null);
      setResultImageUrl(null);
      abortRef.current = false;
      clearTimeout(pollTimerRef.current);
      galleryIdRef.current = null;

      const resolvedModelUrl = params.modelImage.startsWith("http")
        ? params.modelImage
        : `${window.location.origin}${params.modelImage}`;

      try {
        const response = await startTryOn({
          modelImage: resolvedModelUrl,
          garmentImages: params.garments.map((g) => g.imageUrl),
          products: params.garments.map((g) => ({
            product_id: g.id,
            name: g.name,
            brand: g.brand,
            price: g.price,
            category: g.category,
            image_url: g.imageUrl,
            ...(g.affiliateUrl ? { affiliate_url: g.affiliateUrl } : {}),
          })),
          source: "tryon",
        });

        galleryIdRef.current = response.galleryId;

        // Start polling as fallback (SSE via useUnifiedStream is primary)
        startPolling(response.galleryId);
      } catch (err) {
        setStatus("error");
        setError(
          err instanceof Error ? err.message : "Something went wrong",
        );
      }
    },
    [startPolling],
  );

  const reset = useCallback(() => {
    setStatus("idle");
    setResultImageUrl(null);
    setError(null);
    galleryIdRef.current = null;
    abortRef.current = true;
    clearTimeout(pollTimerRef.current);
  }, []);

  return {
    status,
    resultImageUrl,
    error,
    generate,
    reset,
  };
}

export function estimateTokenCost(garmentCount: number): number {
  if (garmentCount <= 0) return 0;
  if (garmentCount === 1) return 5;
  if (garmentCount === 2) return 8;
  if (garmentCount === 3) return 10;
  return 12;
}
