"use client";

import { useCallback, useEffect, useState } from "react";
import type { LabImageState } from "../types";

export function useImageInput() {
  const [state, setState] = useState<LabImageState>({
    file: null,
    previewUrl: null,
    width: 0,
    height: 0,
  });

  useEffect(() => {
    const url = state.previewUrl;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [state.previewUrl]);

  const selectFile = useCallback(async (file: File) => {
    const previewUrl = URL.createObjectURL(file);
    // Measure dimensions before setting state
    const dims = await new Promise<{ w: number; h: number }>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ w: img.naturalWidth, h: img.naturalHeight });
      img.onerror = () => resolve({ w: 0, h: 0 });
      img.src = previewUrl;
    });
    setState({ file, previewUrl, width: dims.w, height: dims.h });
  }, []);

  const clear = useCallback(() => {
    setState({ file: null, previewUrl: null, width: 0, height: 0 });
  }, []);

  return { state, selectFile, clear };
}
