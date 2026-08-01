"use client";

import {
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { usePdpStudioJobProgress } from "../../platform/hooks/usePdpStudioJobProgress";
import {
  listPdpStudioAssets,
  uploadPdpStudioAsset,
} from "../../platform/services/pdpStudioAssetService";
import {
  cancelPdpStudioJob,
  createPdpStudioToolJob,
  getPdpStudioJob,
  listPdpStudioJobs,
  retryPdpStudioJob,
} from "../../platform/services/pdpStudioJobService";
import type { PdpStudioAsset } from "../../platform/types/pdpStudioPlatform";
import {
  AI_BACKGROUND_AVAILABLE_PRESETS,
  AI_BACKGROUND_AVAILABLE_PRESET_GROUPS,
} from "../data/aiBackgroundPresets";
import { mapAiBackgroundJobOptions } from "../mappers/aiBackgroundJobMapper";
import {
  downloadAiBackgroundCanvas,
  shareAiBackgroundCanvas,
} from "../services/aiBackgroundCanvasService";
import type {
  AiBackgroundAspectRatio,
  AiBackgroundAssetTab,
  AiBackgroundCustomTab,
  AiBackgroundImageLayer,
  AiBackgroundLocalSource,
  AiBackgroundMode,
  AiBackgroundModelPreset,
  AiBackgroundQuality,
  AiBackgroundTextLayer,
} from "../types/aiBackgrounds";

const ASSET_PAGE_SIZE = 40;

export function useAiBackgroundsWorkspace() {
  const [source, setSource] = useState<AiBackgroundLocalSource | null>(null);
  const [reference, setReference] =
    useState<AiBackgroundLocalSource | null>(null);
  const [assetPickerOpen, setAssetPickerOpen] = useState(false);
  const [assetPickerPurpose, setAssetPickerPurpose] = useState<
    "source" | "reference" | "insert"
  >("source");
  const [assetTab, setAssetTab] = useState<AiBackgroundAssetTab>("all");
  const [assetQuery, setAssetQuery] = useState("");
  const deferredAssetQuery = useDeferredValue(assetQuery);
  const [assets, setAssets] = useState<
    Awaited<ReturnType<typeof listPdpStudioAssets>>["assets"]
  >([]);
  const [assetsLoading, setAssetsLoading] = useState(false);
  const [assetsError, setAssetsError] = useState<string | null>(null);
  const [assetsBefore, setAssetsBefore] = useState<string | null>(null);
  const [assetsHasMore, setAssetsHasMore] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [customTab, setCustomTab] =
    useState<AiBackgroundCustomTab>("image");
  const [search, setSearch] = useState("");
  const [modelPreset, setModelPreset] =
    useState<AiBackgroundModelPreset>("v3");
  const [quality, setQuality] = useState<AiBackgroundQuality>("standard");
  const [aspectRatio, setAspectRatio] =
    useState<AiBackgroundAspectRatio>("1:1");
  const [selectedPresetId, setSelectedPresetId] = useState<string | null>(
    null,
  );
  const [imageDescription, setImageDescription] = useState("");
  const [surface, setSurface] = useState("");
  const [environment, setEnvironment] = useState("");
  const [manualPrompt, setManualPrompt] = useState("");
  const [editPrompt, setEditPrompt] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [textLayers, setTextLayers] = useState<AiBackgroundTextLayer[]>([]);
  const [imageLayers, setImageLayers] = useState<AiBackgroundImageLayer[]>([]);
  const [lastSuccessfulAsset, setLastSuccessfulAsset] =
    useState<PdpStudioAsset | null>(null);
  const [restoringJob, setRestoringJob] = useState(true);
  const objectUrls = useRef<string[]>([]);
  const { job, elapsedSeconds, setJob, watch, stop } =
    usePdpStudioJobProgress();

  const currentImageUrl =
    job?.status === "succeeded" && job.outputs[0]?.resourceType === "image"
      ? job.outputs[0].url
      : lastSuccessfulAsset?.url ?? source?.previewUrl ?? null;

  const filteredGroups = useMemo(() => {
    const normalized = search.trim().toLowerCase();
    if (!normalized) return AI_BACKGROUND_AVAILABLE_PRESET_GROUPS;
    const matches = AI_BACKGROUND_AVAILABLE_PRESETS.filter((preset) =>
      preset.label.toLowerCase().includes(normalized),
    );
    return matches.length
      ? [
          {
            id: "search-results",
            label: "Search results",
            presets: matches,
          },
        ]
      : [];
  }, [search]);

  const busy =
    uploading || job?.status === "queued" || job?.status === "running";

  const loadAssets = useCallback(
    async (append = false) => {
      setAssetsLoading(true);
      setAssetsError(null);
      try {
        const sourceFilter =
          assetTab === "all"
            ? undefined
            : assetTab === "uploads"
              ? ("upload" as const)
              : assetTab === "generated"
                ? ("generated" as const)
                : ("shopify" as const);
        const page = await listPdpStudioAssets({
          source: sourceFilter,
          resourceType: "image",
          limit: ASSET_PAGE_SIZE,
          ...(deferredAssetQuery.trim()
            ? { query: deferredAssetQuery.trim() }
            : {}),
          ...(append && assetsBefore ? { before: assetsBefore } : {}),
        });
        setAssets((current) =>
          append
            ? [
                ...current,
                ...page.assets.filter(
                  (asset) => !current.some((item) => item.id === asset.id),
                ),
              ]
            : page.assets,
        );
        setAssetsBefore(page.nextBefore);
        setAssetsHasMore(page.hasMore);
      } catch (caught) {
        setAssetsError(
          caught instanceof Error
            ? caught.message
            : "Unable to load your image library.",
        );
      } finally {
        setAssetsLoading(false);
      }
    },
    [assetTab, deferredAssetQuery, assetsBefore],
  );

  useEffect(() => {
    if (!assetPickerOpen) return;
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setAssetsBefore(null);
      void loadAssets(false);
    });
    return () => {
      active = false;
    };
  }, [assetPickerOpen, assetTab, deferredAssetQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const jobId = new URL(window.location.href).searchParams.get("job");
    if (!jobId) {
      let active = true;
      queueMicrotask(() => {
        if (!active) return;
        setRestoringJob(false);
        setAssetPickerOpen(true);
      });
      return () => {
        active = false;
      };
    }
    let active = true;
    void getPdpStudioJob(jobId)
      .then((resumed) => {
        if (!active || resumed.toolId !== "ai-backgrounds") return;
        setEditorOpen(true);
        setAssetPickerOpen(false);
        if (
          resumed.status === "succeeded" &&
          resumed.outputs[0]?.resourceType === "image"
        ) {
          setLastSuccessfulAsset(resumed.outputs[0]);
        } else {
          void listPdpStudioJobs({
            toolId: "ai-backgrounds",
            status: "succeeded",
            limit: 1,
          }).then((jobs) => {
            const latest = jobs[0]?.outputs[0];
            if (active && latest?.resourceType === "image") {
              setLastSuccessfulAsset(latest);
            }
          });
        }
        watch(resumed);
        setRestoringJob(false);
      })
      .catch((caught) => {
        if (active) {
          setRestoringJob(false);
          setError(
            caught instanceof Error
              ? caught.message
              : "Unable to resume this background job.",
          );
        }
      });
    return () => {
      active = false;
    };
  }, [watch]);

  useEffect(() => {
    const completed =
      job?.status === "succeeded" && job.outputs[0]?.resourceType === "image"
        ? job.outputs[0]
        : null;
    if (!completed) return;
    let active = true;
    queueMicrotask(() => {
      if (active) setLastSuccessfulAsset(completed);
    });
    return () => {
      active = false;
    };
  }, [job]);

  useEffect(
    () => () => {
      objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
      stop();
    },
    [stop],
  );

  function openAssetPicker(
    purpose: "source" | "reference" | "insert",
  ): void {
    setAssetPickerPurpose(purpose);
    if (purpose === "reference") setAssetTab("generated");
    setAssetPickerOpen(true);
  }

  function selectLocalFile(file: File): void {
    if (!file.type.startsWith("image/")) {
      setAssetsError("Choose a PNG, JPG, or WebP image.");
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    objectUrls.current.push(previewUrl);
    selectPickerSource({
      id: crypto.randomUUID(),
      name: file.name,
      previewUrl,
      file,
    });
  }

  function selectAsset(
    asset: Awaited<ReturnType<typeof listPdpStudioAssets>>["assets"][number],
  ): void {
    selectPickerSource({
      id: asset.id,
      name: asset.originalName ?? "PDP Studio image",
      previewUrl: asset.url,
      asset,
    });
  }

  function selectPickerSource(value: AiBackgroundLocalSource): void {
    if (assetPickerPurpose === "source") {
      setSource(value);
    } else if (assetPickerPurpose === "reference") {
      const currentOutputId =
        job?.status === "succeeded" ? job.outputs[0]?.id : null;
      if (value.asset?.id && value.asset.id === currentOutputId) {
        setAssetsError(
          "Choose a different image—the current canvas cannot also be its own reference.",
        );
        return;
      }
      setReference(value);
      setAssetsError(null);
    } else {
      setImageLayers((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          url: value.previewUrl,
          x: 0.65,
          y: 0.65,
          width: 0.25,
          height: 0.25,
        },
      ]);
      setAssetPickerOpen(false);
    }
  }

  function confirmAssetSelection(): void {
    if (assetPickerPurpose === "source" && source) {
      setAssetPickerOpen(false);
      setEditorOpen(true);
      setError(null);
    } else if (assetPickerPurpose === "reference" && reference) {
      setAssetPickerOpen(false);
    }
  }

  async function runGeneration(
    mode: AiBackgroundMode,
    input: {
      presetId?: string;
      prompt?: string;
      surface?: string;
      environment?: string;
    } = {},
  ): Promise<void> {
    const latestOutput =
      lastSuccessfulAsset ??
      (job?.status === "succeeded" && job.outputs[0]?.resourceType === "image"
        ? job.outputs[0]
        : null);
    if (!source && !latestOutput) {
      openAssetPicker("source");
      return;
    }
    if (mode === "reference" && !reference) {
      openAssetPicker("reference");
      return;
    }
    stop();
    setError(null);
    setUploading(true);
    try {
      const sourceAsset = latestOutput
        ? latestOutput
        : source?.asset ??
          (source?.file ? await uploadPdpStudioAsset(source.file) : null);
      const referenceAsset =
        mode === "reference"
          ? reference?.asset ??
            (reference?.file
              ? await uploadPdpStudioAsset(reference.file)
              : null)
          : null;
      if (!sourceAsset) throw new Error("The source image could not be prepared.");
      if (mode === "reference" && !referenceAsset) {
        throw new Error("The reference image could not be prepared.");
      }
      if (source?.file && !source.asset && !latestOutput) {
        setSource((current) =>
          current ? { ...current, asset: sourceAsset } : current,
        );
      }
      if (reference?.file && referenceAsset && !reference.asset) {
        setReference((current) =>
          current ? { ...current, asset: referenceAsset } : current,
        );
      }
      setUploading(false);
      const created = await createPdpStudioToolJob("ai-backgrounds", {
        inputAssetIds: [sourceAsset.id],
        referenceAssetIds: referenceAsset ? [referenceAsset.id] : [],
        ...(input.prompt?.trim() ? { prompt: input.prompt.trim() } : {}),
        options: {
          ...mapAiBackgroundJobOptions({
            mode,
            modelPreset,
            quality,
            aspectRatio,
            ...(input.presetId ? { presetId: input.presetId } : {}),
            ...(input.surface ? { surface: input.surface } : {}),
            ...(input.environment ? { environment: input.environment } : {}),
          }),
        },
        useBrandKit: false,
        idempotencyKey: crypto.randomUUID(),
      });
      setJob(created);
      rememberJob(created.id);
      watch(created);
      setCustomOpen(false);
      if (mode === "preset") setSelectedPresetId(input.presetId ?? null);
      if (mode === "edit") setEditPrompt("");
    } catch (caught) {
      setUploading(false);
      setError(
        caught instanceof Error
          ? caught.message
          : "AI Backgrounds could not start this generation.",
      );
    }
  }

  function canGenerateCustom(): boolean {
    if (customTab === "image") return Boolean(reference);
    if (customTab === "assisted") return Boolean(surface.trim());
    return Boolean(manualPrompt.trim());
  }

  async function generateCustom(): Promise<void> {
    if (!canGenerateCustom()) return;
    if (customTab === "image") {
      await runGeneration("reference", { prompt: imageDescription });
    } else if (customTab === "assisted") {
      await runGeneration("assisted", { surface, environment });
    } else {
      await runGeneration("manual", { prompt: manualPrompt });
    }
  }

  async function cancel(): Promise<void> {
    if (!job) return;
    try {
      setJob(await cancelPdpStudioJob(job.id));
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to cancel this job.",
      );
    }
  }

  async function retry(): Promise<void> {
    if (!job) return;
    setError(null);
    try {
      const retried = await retryPdpStudioJob(job.id);
      setJob(retried);
      rememberJob(retried.id);
      watch(retried);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Unable to retry this job.",
      );
    }
  }

  function addTextLayer(): void {
    setTextLayers((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        text: "Double-click to edit",
        x: 0.1,
        y: 0.1,
        fontSize: 0.035,
        color: "#172033",
      },
    ]);
  }

  function updateTextLayer(id: string, text: string): void {
    setTextLayers((current) =>
      current.map((layer) => (layer.id === id ? { ...layer, text } : layer)),
    );
  }

  async function download(): Promise<void> {
    if (!currentImageUrl) return;
    await downloadAiBackgroundCanvas({
      baseUrl: currentImageUrl,
      aspectRatio,
      textLayers,
      imageLayers,
    });
  }

  async function share(): Promise<void> {
    if (!currentImageUrl) return;
    const shared = await shareAiBackgroundCanvas({
      baseUrl: currentImageUrl,
      aspectRatio,
      textLayers,
      imageLayers,
    });
    if (!shared) await download();
  }

  function resetEditor(): void {
    stop();
    setJob(null);
    setSource(null);
    setReference(null);
    setLastSuccessfulAsset(null);
    setEditorOpen(false);
    setAssetPickerPurpose("source");
    setAssetPickerOpen(true);
    setCustomOpen(false);
    setError(null);
    setTextLayers([]);
    setImageLayers([]);
    setSelectedPresetId(null);
    const url = new URL(window.location.href);
    url.searchParams.delete("job");
    window.history.replaceState(window.history.state, "", url);
  }

  return {
    source,
    reference,
    assetPickerOpen,
    assetPickerPurpose,
    assetTab,
    assetQuery,
    assets,
    assetsLoading,
    assetsError,
    assetsHasMore,
    editorOpen,
    customOpen,
    customTab,
    search,
    modelPreset,
    quality,
    aspectRatio,
    selectedPresetId,
    imageDescription,
    surface,
    environment,
    manualPrompt,
    editPrompt,
    job,
    elapsedSeconds,
    error,
    uploading,
    busy,
    restoringJob,
    currentImageUrl,
    filteredGroups,
    textLayers,
    imageLayers,
    setAssetPickerOpen,
    setAssetTab,
    setAssetQuery,
    setCustomOpen,
    setCustomTab,
    setSearch,
    setModelPreset,
    setQuality,
    setAspectRatio,
    setImageDescription,
    setSurface,
    setEnvironment,
    setManualPrompt,
    setEditPrompt,
    selectLocalFile,
    selectAsset,
    confirmAssetSelection,
    openAssetPicker,
    loadMoreAssets: () => loadAssets(true),
    runGeneration,
    canGenerateCustom,
    generateCustom,
    cancel,
    retry,
    addTextLayer,
    updateTextLayer,
    download,
    share,
    resetEditor,
  };
}

export type AiBackgroundsWorkspaceController = ReturnType<
  typeof useAiBackgroundsWorkspace
>;

function rememberJob(jobId: string): void {
  const url = new URL(window.location.href);
  url.searchParams.set("job", jobId);
  window.history.replaceState(window.history.state, "", url);
}
