"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePdpStudioJobProgress } from "../../platform/hooks/usePdpStudioJobProgress";
import {
  cancelPdpStudioJob,
  retryPdpStudioJob,
} from "../../platform/services/pdpStudioJobService";
import { getPdpStudioAsset } from "../../platform/services/pdpStudioAssetService";
import type { PdpStudioAsset } from "../../platform/types/pdpStudioPlatform";
import { PDP_STUDIO_TOOL_ASSETS } from "../../workspace/data/pdpStudioToolAssets";
import {
  createBackgroundRemovalJob,
  createRetouchJob,
} from "../services/photoEditorService";
import type {
  CutoutMode,
  CutoutSuggestion,
  CutoutTab,
  MaskStroke,
  PhotoEditorDialog,
  PhotoEditorImageDimensions,
  PhotoEditorTool,
} from "../types/photoEditor";
import {
  createRetouchMaskFile,
  readPhotoEditorImageDimensions,
} from "../utils/photoEditorMask";

const FALLBACK_IMAGE_DIMENSIONS: PhotoEditorImageDimensions = {
  width: 1024,
  height: 1024,
};

export function usePhotoEditorWorkspace(tool: PhotoEditorTool) {
  const [sourceFile, setSourceFile] = useState<File | null>(null);
  const [sourceAsset, setSourceAsset] = useState<PdpStudioAsset | null>(null);
  const [localImageUrl, setLocalImageUrl] = useState<string | null>(null);
  const [imageDimensions, setImageDimensions] =
    useState<PhotoEditorImageDimensions>(FALLBACK_IMAGE_DIMENSIONS);
  const [dialog, setDialog] = useState<PhotoEditorDialog | null>(
    tool === "retouch" ? "retouch" : null,
  );
  const [removeBackground, setRemoveBackground] = useState(true);
  const [brushSize, setBrushSize] = useState(44);
  const [cutoutMode, setCutoutMode] = useState<CutoutMode>("erase");
  const [cutoutTab, setCutoutTab] = useState<CutoutTab>("guided");
  const [cutoutSuggestion, setCutoutSuggestion] =
    useState<CutoutSuggestion>("no-cutout");
  const [strokes, setStrokes] = useState<MaskStroke[]>([]);
  const [redoStrokes, setRedoStrokes] = useState<MaskStroke[]>([]);
  const [hasLocalEdit, setHasLocalEdit] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const { job, elapsedSeconds, setJob, watch, stop } =
    usePdpStudioJobProgress();

  const outputAsset =
    job?.status === "succeeded" && job.outputs[0]?.resourceType === "image"
      ? job.outputs[0]
      : null;
  const imageUrl =
    outputAsset?.url ?? sourceAsset?.url ?? localImageUrl ?? PDP_STUDIO_TOOL_ASSETS[tool];
  const sourceAssetId = outputAsset?.id ?? sourceAsset?.id ?? null;
  const hasProcessableSource = Boolean(sourceFile || sourceAssetId);
  const busy =
    submitting || job?.status === "queued" || job?.status === "running";
  const error =
    localError ??
    (job?.status === "failed"
      ? job.error?.message ?? "PDP Studio could not process this image."
      : null);
  const canRemoveBackground =
    tool === "background-remover" && hasProcessableSource && !busy;
  const canApplyRetouch =
    tool === "retouch" &&
    hasProcessableSource &&
    strokes.some((stroke) => stroke.mode === "retouch") &&
    !busy;
  const canRunPromptEdit =
    tool === "retouch" && hasProcessableSource && !busy;

  useEffect(
    () => () => {
      if (localImageUrl) URL.revokeObjectURL(localImageUrl);
    },
    [localImageUrl],
  );

  useEffect(() => {
    const sourceAssetId = new URL(window.location.href).searchParams.get(
      "sourceAssetId",
    );
    if (!sourceAssetId) return;
    let active = true;
    void getPdpStudioAsset(sourceAssetId)
      .then((asset) => {
        if (!active || asset.resourceType !== "image") return;
        setSourceAsset(asset);
        setImageDimensions({
          width: asset.width ?? FALLBACK_IMAGE_DIMENSIONS.width,
          height: asset.height ?? FALLBACK_IMAGE_DIMENSIONS.height,
        });
      })
      .catch((caught) => {
        if (!active) return;
        setLocalError(
          caught instanceof Error
            ? caught.message
            : "The selected Shopify image could not be loaded.",
        );
      });
    return () => {
      active = false;
    };
  }, []);

  const replaceImage = useCallback(
    (file: File | null) => {
      if (!file || !file.type.startsWith("image/")) return;
      stop();
      setJob(null);
      setSourceFile(file);
      setSourceAsset(null);
      setLocalImageUrl((current) => {
        if (current) URL.revokeObjectURL(current);
        return URL.createObjectURL(file);
      });
      setImageDimensions(FALLBACK_IMAGE_DIMENSIONS);
      void readPhotoEditorImageDimensions(file)
        .then(setImageDimensions)
        .catch(() => setImageDimensions(FALLBACK_IMAGE_DIMENSIONS));
      setStrokes([]);
      setRedoStrokes([]);
      setHasLocalEdit(false);
      setLocalError(null);
    },
    [setJob, stop],
  );

  const addStroke = useCallback((stroke: MaskStroke) => {
    if (!stroke.points.length) return;
    setStrokes((current) => [...current, stroke]);
    setRedoStrokes([]);
  }, []);

  const undo = useCallback(() => {
    setStrokes((current) => {
      const latest = current.at(-1);
      if (!latest) return current;
      setRedoStrokes((redo) => [...redo, latest]);
      return current.slice(0, -1);
    });
  }, []);

  const redo = useCallback(() => {
    setRedoStrokes((current) => {
      const latest = current.at(-1);
      if (!latest) return current;
      setStrokes((existing) => [...existing, latest]);
      return current.slice(0, -1);
    });
  }, []);

  const openRetouch = useCallback(() => {
    setStrokes([]);
    setRedoStrokes([]);
    setDialog("retouch");
  }, []);

  const openCutout = useCallback(() => {
    setStrokes([]);
    setRedoStrokes([]);
    setDialog("cutout");
  }, []);

  const cancelEditing = useCallback(() => {
    setStrokes([]);
    setRedoStrokes([]);
    setDialog(null);
  }, []);

  const submitJob = useCallback(
    async (submission: () => ReturnType<typeof createRetouchJob>) => {
      setSubmitting(true);
      setLocalError(null);
      try {
        watch(await submission());
      } catch (caught) {
        setLocalError(
          caught instanceof Error
            ? caught.message
            : "PDP Studio could not process this image.",
        );
      } finally {
        setSubmitting(false);
      }
    },
    [watch],
  );

  const removeImageBackground = useCallback(async () => {
    if (!canRemoveBackground) {
      setLocalError("Upload a source image before removing its background.");
      return;
    }
    await submitJob(() =>
      createBackgroundRemovalJob({ sourceFile, sourceAssetId }),
    );
  }, [
    canRemoveBackground,
    sourceAssetId,
    sourceFile,
    submitJob,
  ]);

  const runPromptEdit = useCallback(async () => {
    if (!canRunPromptEdit) {
      setLocalError("Upload a source image before applying an edit.");
      return;
    }
    await submitJob(() =>
      createRetouchJob({
        sourceFile,
        sourceAssetId,
        ...(prompt.trim() ? { prompt: prompt.trim() } : {}),
      }),
    );
  }, [
    canRunPromptEdit,
    prompt,
    sourceAssetId,
    sourceFile,
    submitJob,
  ]);

  const confirmEditing = useCallback(async () => {
    if (dialog === "cutout") {
      setHasLocalEdit(true);
      setDialog(null);
      return;
    }
    if (!canApplyRetouch) {
      setLocalError(
        hasProcessableSource
          ? "Brush over at least one area to retouch."
          : "Upload a source image before applying retouch.",
      );
      return;
    }

    try {
      const maskFile = await createRetouchMaskFile({
        strokes,
        dimensions: imageDimensions,
      });
      setDialog(null);
      await submitJob(() =>
        createRetouchJob({
          sourceFile,
          sourceAssetId,
          maskFile,
          ...(prompt.trim() ? { prompt: prompt.trim() } : {}),
        }),
      );
    } catch (caught) {
      setLocalError(
        caught instanceof Error
          ? caught.message
          : "The retouch mask could not be prepared.",
      );
    }
  }, [
    canApplyRetouch,
    dialog,
    hasProcessableSource,
    imageDimensions,
    prompt,
    sourceAssetId,
    sourceFile,
    strokes,
    submitJob,
  ]);

  const cancelJob = useCallback(async () => {
    if (!job) return;
    try {
      setJob(await cancelPdpStudioJob(job.id));
    } catch (caught) {
      setLocalError(
        caught instanceof Error ? caught.message : "Unable to cancel this job.",
      );
    }
  }, [job, setJob]);

  const retryJob = useCallback(async () => {
    if (!job) return;
    setLocalError(null);
    try {
      watch(await retryPdpStudioJob(job.id));
    } catch (caught) {
      setLocalError(
        caught instanceof Error ? caught.message : "Unable to retry this job.",
      );
    }
  }, [job, watch]);

  const shareResult = useCallback(async () => {
    if (!outputAsset?.url) return;
    if (navigator.share) {
      await navigator.share({
        title: "PDP Studio image",
        url: outputAsset.url,
      });
      return;
    }
    await navigator.clipboard.writeText(outputAsset.url);
  }, [outputAsset]);

  const imageAspectRatio = useMemo(
    () => imageDimensions.width / imageDimensions.height,
    [imageDimensions],
  );

  return {
    tool,
    imageUrl,
    imageAspectRatio,
    dialog,
    removeBackground,
    brushSize,
    cutoutMode,
    cutoutTab,
    cutoutSuggestion,
    strokes,
    redoStrokes,
    hasLocalEdit,
    prompt,
    job,
    elapsedSeconds,
    outputAsset,
    busy,
    error,
    canRemoveBackground,
    canApplyRetouch,
    canRunPromptEdit,
    replaceImage,
    setRemoveBackground,
    setBrushSize,
    setCutoutMode,
    setCutoutTab,
    setCutoutSuggestion,
    setPrompt,
    addStroke,
    undo,
    redo,
    openRetouch,
    openCutout,
    cancelEditing,
    confirmEditing,
    removeImageBackground,
    runPromptEdit,
    cancelJob,
    retryJob,
    shareResult,
  };
}

export type PhotoEditorWorkspaceController = ReturnType<
  typeof usePhotoEditorWorkspace
>;
