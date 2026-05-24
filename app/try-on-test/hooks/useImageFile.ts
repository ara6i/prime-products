"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { compressToJpegDataUri, dataUriBytes } from "../lib/imageUtils";

interface ImageState {
  file: File | null;
  /** Object URL for <img> previews — revoked on cleanup. */
  previewUrl: string | null;
  /** JPEG data URI ready to send to the backend. Null until compression completes. */
  dataUri: string | null;
  isCompressing: boolean;
  error: string | null;
  bytes: number;
}

/**
 * File slot for one image (model photo or garment). Compresses to JPEG on
 * select so the upload payload mirrors what the SDK ships, and exposes both
 * the data URI (for the backend) and an object URL (for the preview).
 */
export function useImageFile(label: string): {
  state: ImageState;
  selectFile: (file: File) => Promise<void>;
  selectImageUrl: (url: string, name?: string) => Promise<void>;
  clear: () => void;
} {
  const [state, setState] = useState<ImageState>({
    file: null,
    previewUrl: null,
    dataUri: null,
    isCompressing: false,
    error: null,
    bytes: 0,
  });

  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    };
  }, []);

  const selectFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith("image/")) {
        setState((prev) => ({ ...prev, error: `${label}: please select an image file.` }));
        return;
      }

      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      const previewUrl = URL.createObjectURL(file);
      previewUrlRef.current = previewUrl;

      setState({ file, previewUrl, dataUri: null, isCompressing: true, error: null, bytes: 0 });

      try {
        const dataUri = await compressToJpegDataUri(file, { maxDimension: 1024, quality: 0.85 });
        setState((prev) => ({
          ...prev,
          dataUri,
          isCompressing: false,
          bytes: dataUriBytes(dataUri),
        }));
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to compress image";
        setState((prev) => ({ ...prev, isCompressing: false, error: `${label}: ${message}` }));
      }
    },
    [label],
  );

  const selectImageUrl = useCallback(
    async (url: string, name?: string) => {
      if (!url) {
        setState((prev) => ({ ...prev, error: `${label}: image URL is empty.` }));
        return;
      }

      setState((prev) => ({ ...prev, isCompressing: true, error: null, bytes: 0 }));

      try {
        const response = await fetch(`/api/try-on-test/image-proxy?url=${encodeURIComponent(url)}`);
        if (!response.ok) {
          const data = await response.json().catch(() => ({} as { message?: string }));
          throw new Error(data.message || `Image download failed (${response.status})`);
        }

        const blob = await response.blob();
        const file = new File([blob], sanitizeFileName(name || `${label}.jpg`), {
          type: blob.type || "image/jpeg",
        });
        await selectFile(file);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Failed to load remote image";
        setState((prev) => ({ ...prev, isCompressing: false, error: `${label}: ${message}` }));
        throw err;
      }
    },
    [label, selectFile],
  );

  const clear = useCallback(() => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
    previewUrlRef.current = null;
    setState({ file: null, previewUrl: null, dataUri: null, isCompressing: false, error: null, bytes: 0 });
  }, []);

  return { state, selectFile, selectImageUrl, clear };
}

function sanitizeFileName(name: string): string {
  const cleaned = name.replace(/[^\w.-]+/g, "-").replace(/^-+|-+$/g, "");
  return cleaned || "image.jpg";
}
