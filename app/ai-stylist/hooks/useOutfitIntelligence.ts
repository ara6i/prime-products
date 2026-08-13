"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  generateIntelligentOutfits,
  prepareStylistTryOnInputs,
  processStylistGarmentCutouts,
  processStylistModelPhoto,
  recommendStylistOutfitSizes,
  startStylistTryOnBatch,
  waitForStylistTryOnJob,
} from "@/app/ai-stylist/services/stylist.service";
import type {
  IntelligentOutfit,
  OutfitIntelligenceRequest,
  OutfitIntelligenceResponse,
  StylistTryOnBatchState,
  StylistTryOnJob,
} from "@/app/ai-stylist/types";

export type OutfitIntelligenceStatus =
  | "idle"
  | "processing-parallel"
  | "processing-model"
  | "building-outfits"
  | "ready";

export type StylistPreparationStatus =
  | "idle"
  | "working"
  | "ready"
  | "failed";

export interface OutfitGenerationInput {
  imageDataUrl: string;
  request: OutfitIntelligenceRequest;
}

const EMPTY_TRY_ON_BATCH: StylistTryOnBatchState = {
  status: "idle",
  tokenCost: 20,
  jobs: [],
};

const INITIAL_OUTFIT_COUNT = 5;
const MAX_OUTFIT_COUNT = 20;
const CUTOUT_BATCH_SIZE = 3;
const CUTOUT_REQUEST_CONCURRENCY = 6;

function waitForNextPaint(): Promise<void> {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
}

function sortOutfitsForDisplay(
  outfits: IntelligentOutfit[],
): IntelligentOutfit[] {
  const normalizedTextIdentity = (value: string | null) =>
    String(value ?? "")
      .trim()
      .toLowerCase()
      .replace(/['’]/g, "")
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  const unique = new Map<string, IntelligentOutfit>();
  for (const outfit of outfits) unique.set(outfit.id, outfit);
  const ranked = Array.from(unique.values()).sort(
    (left, right) =>
      right.items.length - left.items.length ||
      right.score.total - left.score.total,
  );
  const usedItems = new Set<string>();
  return ranked.filter((outfit) => {
    const itemKeys = outfit.items.flatMap((item) => {
      let imageKey = item.imageUrl.trim().toLowerCase();
      try {
        const parsed = new URL(item.imageUrl);
        imageKey = `${parsed.hostname}${parsed.pathname}`.toLowerCase();
      } catch {
        // Preserve the stored image URL for non-standard upstream references.
      }
      return [
        `style:${item.styleRagId}`,
        `product:${item.id}`,
        `image:${imageKey}`,
        `title:${normalizedTextIdentity(
          item.brand || item.merchantName,
        )}:${normalizedTextIdentity(item.title)}`,
      ];
    });
    if (itemKeys.some((key) => usedItems.has(key))) return false;
    itemKeys.forEach((key) => usedItems.add(key));
    return true;
  });
}

function attachCutouts(
  outfits: IntelligentOutfit[],
  cutoutById: Map<string, string>,
): IntelligentOutfit[] {
  if (!cutoutById.size) return outfits;
  return outfits.map((outfit) => ({
    ...outfit,
    items: outfit.items.map((item) => ({
      ...item,
      cutoutImageUrl:
        cutoutById.get(item.styleRagId) ?? item.cutoutImageUrl,
    })),
  }));
}

function attachSizeRecommendations(
  outfits: IntelligentOutfit[],
  recommendations: Awaited<ReturnType<typeof recommendStylistOutfitSizes>>,
): IntelligentOutfit[] {
  const byId = new Map(
    recommendations.map((recommendation) => [
      recommendation.styleRagId,
      recommendation,
    ]),
  );
  return outfits.map((outfit) => ({
    ...outfit,
    items: outfit.items.map((item) => {
      const recommendation = byId.get(item.styleRagId);
      if (!recommendation) return item;
      return {
        ...item,
        recommendedSize: recommendation.recommendedSize,
        sizeConfidence: recommendation.confidence,
        sizeStatus: recommendation.status,
        sizeReason: recommendation.reason,
      };
    }),
  }));
}

export interface OutfitItemSwap {
  sourceOutfitId: string;
  sourceStyleRagId: string;
  targetOutfitId: string;
  targetStyleRagId: string;
}

export function useOutfitIntelligence() {
  const [status, setStatus] = useState<OutfitIntelligenceStatus>("idle");
  const [modelPreparationStatus, setModelPreparationStatus] =
    useState<StylistPreparationStatus>("idle");
  const [outfitPreparationStatus, setOutfitPreparationStatus] =
    useState<StylistPreparationStatus>("idle");
  const [modelPreparationError, setModelPreparationError] =
    useState<string | null>(null);
  const [tryOnPreparationStatus, setTryOnPreparationStatus] =
    useState<StylistPreparationStatus>("idle");
  const [result, setResult] = useState<OutfitIntelligenceResponse | null>(null);
  const [modelPreviewImageUrl, setModelPreviewImageUrl] =
    useState<string | null>(null);
  const [modelImageUrl, setModelImageUrl] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [tryOnBatch, setTryOnBatch] =
    useState<StylistTryOnBatchState>(EMPTY_TRY_ON_BATCH);
  const generationIdRef = useRef(0);
  const tryOnRunIdRef = useRef(0);
  const requestedCutoutsRef = useRef(new Set<string>());
  const requestedSizesRef = useRef(new Set<string>());
  const preparedTryOnKeyRef = useRef("");
  const preparedTryOnPromiseRef = useRef<Promise<void> | null>(null);
  const activeTryOnPreparationKeyRef = useRef("");
  const readyTryOnPreparationKeyRef = useRef("");

  const warmStylistTryOnInputs = useCallback(
    (
      modelImage: string,
      outfits: IntelligentOutfit[],
    ): Promise<void> => {
      const garmentImages = Array.from(
        new Set(
          outfits.flatMap((outfit) =>
            outfit.items
              .map((item) => item.cutoutImageUrl ?? item.imageUrl)
              .filter(Boolean),
          ),
        ),
      );
      if (!garmentImages.length) return Promise.resolve();

      const cacheKey = `${modelImage}|${garmentImages.slice().sort().join("|")}`;
      if (preparedTryOnKeyRef.current === cacheKey) {
        return preparedTryOnPromiseRef.current ?? Promise.resolve();
      }

      preparedTryOnKeyRef.current = cacheKey;
      const promise = prepareStylistTryOnInputs({
        modelImage,
        garmentImages,
      })
        .then(() => undefined)
        .catch((prepareError) => {
          if (preparedTryOnKeyRef.current === cacheKey) {
            preparedTryOnKeyRef.current = "";
          }
          throw prepareError;
        })
        .finally(() => {
          if (
            preparedTryOnKeyRef.current === cacheKey &&
            preparedTryOnPromiseRef.current === promise
          ) {
            preparedTryOnPromiseRef.current = null;
          }
        });
      preparedTryOnPromiseRef.current = promise;
      return promise;
    },
    [],
  );

  const requestGarmentCutouts = useCallback(
    async (outfits: IntelligentOutfit[], generationId: number) => {
      const pendingIds = Array.from(
        new Set(
          outfits.flatMap((outfit) =>
            outfit.items
              .filter(
                (item) =>
                  !item.cutoutImageUrl &&
                  !requestedCutoutsRef.current.has(item.styleRagId),
              )
              .map((item) => item.styleRagId),
          ),
        ),
      );
      pendingIds.forEach((styleRagId) =>
        requestedCutoutsRef.current.add(styleRagId),
      );

      const batches: string[][] = [];
      for (let offset = 0; offset < pendingIds.length; offset += CUTOUT_BATCH_SIZE) {
        batches.push(pendingIds.slice(offset, offset + CUTOUT_BATCH_SIZE));
      }
      const cutoutById = new Map<string, string>();
      let nextBatch = 0;

      async function worker() {
        for (;;) {
          if (generationIdRef.current !== generationId) return;
          const batch = batches[nextBatch];
          nextBatch += 1;
          if (!batch) return;
          try {
            const prepared = await processStylistGarmentCutouts(batch);
            if (generationIdRef.current !== generationId) return;
            prepared.forEach((item) => {
              if (item.cutoutImageUrl) {
                cutoutById.set(item.styleRagId, item.cutoutImageUrl);
              }
            });
          } catch {
            // A failed cutout is excluded from the clean outfit grid.
          }
        }
      }

      await Promise.all(
        Array.from(
          { length: Math.min(CUTOUT_REQUEST_CONCURRENCY, batches.length) },
          () => worker(),
        ),
      );
      return cutoutById;
    },
    [],
  );

  const prepareGarmentCutouts = useCallback(
    async (outfits: IntelligentOutfit[], generationId: number) => {
      const cutoutById = await requestGarmentCutouts(outfits, generationId);
      if (generationIdRef.current !== generationId || !cutoutById.size) return;
      setResult((current) =>
        current
          ? {
              ...current,
              outfits: attachCutouts(current.outfits, cutoutById),
            }
          : current,
      );
    },
    [requestGarmentCutouts],
  );

  useEffect(() => {
    if (status !== "ready" || !result?.outfits.length) return;
    void prepareGarmentCutouts(
      result.outfits,
      generationIdRef.current,
    );
  }, [prepareGarmentCutouts, result?.outfits, status]);

  useEffect(() => {
    if (status !== "ready" || !result?.outfits.length) return;
    const pendingIds = Array.from(
      new Set(
        result.outfits.flatMap((outfit) =>
          outfit.items
            .filter(
              (item) =>
                !item.sizeStatus &&
                !requestedSizesRef.current.has(item.styleRagId),
            )
            .map((item) => item.styleRagId),
        ),
      ),
    );
    if (!pendingIds.length) return;
    pendingIds.forEach((styleRagId) =>
      requestedSizesRef.current.add(styleRagId),
    );
    const generationId = generationIdRef.current;
    setResult((current) =>
      current
        ? {
            ...current,
            outfits: current.outfits.map((outfit) => ({
              ...outfit,
              items: outfit.items.map((item) =>
                pendingIds.includes(item.styleRagId)
                  ? { ...item, sizeStatus: "loading" as const }
                  : item,
              ),
            })),
          }
        : current,
    );
    void recommendStylistOutfitSizes(pendingIds)
      .then((recommendations) => {
        if (generationIdRef.current !== generationId) return;
        setResult((current) =>
          current
            ? {
                ...current,
                outfits: attachSizeRecommendations(
                  current.outfits,
                  recommendations,
                ),
              }
            : current,
        );
      })
      .catch(() => {
        if (generationIdRef.current !== generationId) return;
        setResult((current) =>
          current
            ? {
                ...current,
                outfits: current.outfits.map((outfit) => ({
                  ...outfit,
                  items: outfit.items.map((item) =>
                    pendingIds.includes(item.styleRagId)
                      ? {
                          ...item,
                          sizeStatus: "unavailable" as const,
                          sizeReason: "RECOMMENDATION_FAILED",
                        }
                      : item,
                  ),
                })),
              }
            : current,
        );
      });
  }, [result?.outfits, status]);

  useEffect(() => {
    if (status !== "ready" || !modelImageUrl || !result?.outfits.length) return;
    const selected = result.outfits.filter((outfit) =>
      selectedIds.includes(outfit.id),
    );
    const priorityOutfits =
      selected.length > 0
        ? selected
        : result.outfits.slice(0, INITIAL_OUTFIT_COUNT);
    const preparationKey = `${modelImageUrl}|${priorityOutfits
      .flatMap((outfit) =>
        outfit.items.map((item) => item.cutoutImageUrl ?? item.imageUrl),
      )
      .slice()
      .sort()
      .join("|")}`;

    if (selected.length === 0) {
      activeTryOnPreparationKeyRef.current = "";
      readyTryOnPreparationKeyRef.current = "";
      // Selected outfits are external input to this preparation state machine.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTryOnPreparationStatus("idle");
      void warmStylistTryOnInputs(modelImageUrl, priorityOutfits).catch(() => {
        // This is only speculative warming before the user selects outfits.
      });
      return;
    }

    activeTryOnPreparationKeyRef.current = preparationKey;
    if (readyTryOnPreparationKeyRef.current === preparationKey) {
      setTryOnPreparationStatus("ready");
      return;
    }

    setTryOnPreparationStatus("working");
    void warmStylistTryOnInputs(modelImageUrl, priorityOutfits)
      .then(() => {
        if (activeTryOnPreparationKeyRef.current !== preparationKey) return;
        readyTryOnPreparationKeyRef.current = preparationKey;
        setTryOnPreparationStatus("ready");
      })
      .catch(() => {
        if (activeTryOnPreparationKeyRef.current !== preparationKey) return;
        setTryOnPreparationStatus("failed");
      });
  }, [
    modelImageUrl,
    result?.outfits,
    selectedIds,
    status,
    warmStylistTryOnInputs,
  ]);

  const generate = useCallback(async (input: OutfitGenerationInput) => {
    const generationId = generationIdRef.current + 1;
    generationIdRef.current = generationId;
    setError(null);
    setResult(null);
    setSelectedIds([]);
    setModelPreviewImageUrl(input.imageDataUrl);
    setModelImageUrl(null);
    setIsLoadingMore(false);
    requestedCutoutsRef.current.clear();
    requestedSizesRef.current.clear();
    preparedTryOnKeyRef.current = "";
    setTryOnBatch(EMPTY_TRY_ON_BATCH);
    setModelPreparationStatus("working");
    setOutfitPreparationStatus("working");
    setModelPreparationError(null);
    setTryOnPreparationStatus("idle");
    setStatus("processing-parallel");

    try {
      const requestedTotal = Math.min(
        MAX_OUTFIT_COUNT,
        Math.max(INITIAL_OUTFIT_COUNT, input.request.requestedOutfits),
      );
      const modelPromise = processStylistModelPhoto(input.imageDataUrl)
        .then((processedModel) => {
          if (generationIdRef.current !== generationId) return;
          setModelImageUrl(processedModel.imageUrl);
          setModelPreparationStatus("ready");
          return processedModel;
        })
        .catch((modelError) => {
          if (generationIdRef.current !== generationId) return;
          setModelPreparationStatus("failed");
          setModelPreparationError(
            modelError instanceof Error
              ? modelError.message
              : "The model photo could not be prepared.",
          );
          throw modelError;
        });
      const outfitsPromise = generateIntelligentOutfits({
        ...input.request,
        requestedOutfits: Math.min(INITIAL_OUTFIT_COUNT, requestedTotal),
        deliveryMode: "fast-start",
        excludeOutfitIds: [],
      })
        .catch((outfitError) => {
          if (generationIdRef.current === generationId) {
            setOutfitPreparationStatus("failed");
          }
          throw outfitError;
        });
      const [modelOutcome, outfitsOutcome] = await Promise.allSettled([
        modelPromise,
        outfitsPromise,
      ]);
      if (generationIdRef.current !== generationId) return false;
      if (
        modelOutcome.status === "rejected" ||
        outfitsOutcome.status === "rejected"
      ) {
        const generationError =
          modelOutcome.status === "rejected"
            ? modelOutcome.reason
            : outfitsOutcome.status === "rejected"
              ? outfitsOutcome.reason
              : null;
        setStatus("idle");
        setError(
          generationError instanceof Error
            ? generationError.message
            : "The stylist could not prepare your model and outfits.",
        );
        return false;
      }

      const generated = outfitsOutcome.value;
      if (!generated.outfits.length) {
        setOutfitPreparationStatus("failed");
        setResult(generated);
        setStatus("ready");
        setError(
          "No complete outfits matched these answers. Increase the budget or change the occasion and try again.",
        );
        return false;
      }

      // Both requests run in parallel, but model preparation is the first
      // visible milestone. Defer the outfit check until the model check has
      // rendered so the progress sequence reads correctly.
      await waitForNextPaint();
      if (generationIdRef.current !== generationId) return false;
      await new Promise((resolve) => window.setTimeout(resolve, 250));
      if (generationIdRef.current !== generationId) return false;
      setOutfitPreparationStatus("ready");
      await waitForNextPaint();
      await new Promise((resolve) => window.setTimeout(resolve, 300));
      if (generationIdRef.current !== generationId) return false;

      const firstOutfits = sortOutfitsForDisplay(generated.outfits).slice(
        0,
        INITIAL_OUTFIT_COUNT,
      );
      setResult({ ...generated, outfits: firstOutfits });
      setStatus("ready");

      if (
        firstOutfits.length > 0 &&
        firstOutfits.length < requestedTotal
      ) {
        setIsLoadingMore(true);
        await waitForNextPaint();
        try {
          const remainingOutfitCount =
            requestedTotal - firstOutfits.length;
          const expanded = await generateIntelligentOutfits({
            ...input.request,
            requestedOutfits: remainingOutfitCount,
            deliveryMode: "full",
            excludeOutfitIds: firstOutfits.map((outfit) => outfit.id),
          });
          if (generationIdRef.current !== generationId) return false;
          // Keep the first five stable while the deeper result loads. Re-sorting
          // the combined list can remove already-selected outfit IDs and leave
          // the UI showing selections that can no longer be generated.
          const cleanExpanded = [
            ...firstOutfits,
            ...sortOutfitsForDisplay(expanded.outfits),
          ].slice(0, requestedTotal);
          if (cleanExpanded.length > firstOutfits.length) {
            setResult((current) =>
              current
                ? {
                    ...current,
                    outfits: cleanExpanded,
                  }
                : current,
            );
          }
        } catch {
          // Keep the fast first five available if the deeper rerank is slow
          // or unavailable.
        }
        if (generationIdRef.current !== generationId) return false;
        setIsLoadingMore(false);
      }
      return true;
    } catch (generationError) {
      if (generationIdRef.current !== generationId) return false;
      setOutfitPreparationStatus("failed");
      setStatus("idle");
      setError(
        generationError instanceof Error
          ? generationError.message
          : "The stylist could not generate outfits.",
      );
      return false;
    }
  }, []);

  const reset = useCallback(() => {
    generationIdRef.current += 1;
    setStatus("idle");
    setModelPreparationStatus("idle");
    setOutfitPreparationStatus("idle");
    setModelPreparationError(null);
    setResult(null);
    setModelPreviewImageUrl(null);
    setModelImageUrl(null);
    setSelectedIds([]);
    setError(null);
    setIsLoadingMore(false);
    requestedCutoutsRef.current.clear();
    requestedSizesRef.current.clear();
    preparedTryOnKeyRef.current = "";
    preparedTryOnPromiseRef.current = null;
    activeTryOnPreparationKeyRef.current = "";
    readyTryOnPreparationKeyRef.current = "";
    tryOnRunIdRef.current += 1;
    setTryOnBatch(EMPTY_TRY_ON_BATCH);
  }, []);

  const toggleOutfit = useCallback((outfitId: string) => {
    setSelectedIds((current) => {
      if (current.includes(outfitId)) {
        return current.filter((id) => id !== outfitId);
      }
      const limit = result?.selectionLimit ?? 5;
      if (current.length >= limit) return current;
      return [...current, outfitId];
    });
  }, [result?.selectionLimit]);

  const swapOutfitItems = useCallback((swap: OutfitItemSwap) => {
    if (swap.sourceOutfitId === swap.targetOutfitId || !result) return false;
    const sourceOutfit = result.outfits.find(
      (outfit) => outfit.id === swap.sourceOutfitId,
    );
    const targetOutfit = result.outfits.find(
      (outfit) => outfit.id === swap.targetOutfitId,
    );
    const sourceItem = sourceOutfit?.items.find(
      (item) => item.styleRagId === swap.sourceStyleRagId,
    );
    const targetItem = targetOutfit?.items.find(
      (item) => item.styleRagId === swap.targetStyleRagId,
    );
    if (
      !sourceOutfit ||
      !targetOutfit ||
      !sourceItem ||
      !targetItem ||
      sourceItem.slot !== targetItem.slot ||
      sourceItem.styleRagId === targetItem.styleRagId
    ) {
      return false;
    }

    setResult((current) => {
      if (!current) return current;
      const currentSourceOutfit = current.outfits.find(
        (outfit) => outfit.id === swap.sourceOutfitId,
      );
      const currentTargetOutfit = current.outfits.find(
        (outfit) => outfit.id === swap.targetOutfitId,
      );
      const currentSourceItem = currentSourceOutfit?.items.find(
        (item) => item.styleRagId === swap.sourceStyleRagId,
      );
      const currentTargetItem = currentTargetOutfit?.items.find(
        (item) => item.styleRagId === swap.targetStyleRagId,
      );
      if (
        !currentSourceOutfit ||
        !currentTargetOutfit ||
        !currentSourceItem ||
        !currentTargetItem ||
        currentSourceItem.slot !== currentTargetItem.slot ||
        currentSourceItem.styleRagId === currentTargetItem.styleRagId
      ) {
        return current;
      }

      return {
        ...current,
        outfits: current.outfits.map((outfit) => {
          if (
            outfit.id !== currentSourceOutfit.id &&
            outfit.id !== currentTargetOutfit.id
          ) {
            return outfit;
          }
          const incoming =
            outfit.id === currentSourceOutfit.id
              ? currentTargetItem
              : currentSourceItem;
          const outgoingStyleRagId =
            outfit.id === currentSourceOutfit.id
              ? currentSourceItem.styleRagId
              : currentTargetItem.styleRagId;
          const items = outfit.items.map((item) =>
            item.styleRagId === outgoingStyleRagId ? incoming : item,
          );
          return {
            ...outfit,
            items,
            totalPrice: Number(
              items.reduce((sum, item) => sum + item.price, 0).toFixed(2),
            ),
          };
        }),
      };
    });
    return true;
  }, [result]);

  const selectedOutfits = useMemo(
    () =>
      selectedIds
        .map((id) => result?.outfits.find((outfit) => outfit.id === id))
        .filter((outfit): outfit is IntelligentOutfit => Boolean(outfit)),
    [result?.outfits, selectedIds],
  );

  const startSelectedTryOns = useCallback(async () => {
    if (!modelImageUrl || selectedOutfits.length === 0) return false;
    const runId = tryOnRunIdRef.current + 1;
    tryOnRunIdRef.current = runId;

    setError(null);
    setTryOnPreparationStatus("working");
    try {
      await warmStylistTryOnInputs(modelImageUrl, selectedOutfits);
      if (tryOnRunIdRef.current !== runId) return false;
      setTryOnPreparationStatus("ready");
    } catch {
      if (tryOnRunIdRef.current !== runId) return false;
      setTryOnPreparationStatus("failed");
      setError(
        "The selected garment images could not be prepared. Please try again.",
      );
      return false;
    }

    const startedAt = Date.now();
    const queuedJobs: StylistTryOnJob[] = selectedOutfits.map((outfit) => ({
      outfitId: outfit.id,
      label: outfit.label,
      status: "queued",
      discStatus: "pending",
      startedAt,
      products: outfit.items.map((item) => ({
        id: item.id,
        styleRagId: item.styleRagId,
        name: item.title,
        category: item.slot,
        brand: item.brand ?? item.merchantName,
        imageUrl: item.cutoutImageUrl ?? item.imageUrl,
        price: item.price,
        currency: item.currency,
        affiliateUrl: item.affiliateUrl ?? undefined,
        productUrl: item.productUrl,
        recommendedSize: item.recommendedSize ?? undefined,
        sizeConfidence: item.sizeConfidence ?? undefined,
        sizeStatus:
          item.sizeStatus && item.sizeStatus !== "loading"
            ? item.sizeStatus
            : undefined,
      })),
    }));
    setTryOnBatch({
      status: "starting",
      tokenCost: 20,
      jobs: queuedJobs,
      startedAt,
    });

    try {
      const started = await startStylistTryOnBatch({
        clientBatchId: crypto.randomUUID(),
        modelImage: modelImageUrl,
        outfits: selectedOutfits,
      });
      if (tryOnRunIdRef.current !== runId) return false;
      const labelsById = new Map(
        selectedOutfits.map((outfit) => [outfit.id, outfit.label]),
      );
      const processingJobs: StylistTryOnJob[] = started.jobs.map((job) => ({
        outfitId: job.outfitId,
        label: labelsById.get(job.outfitId) ?? "Selected outfit",
        galleryId: job.galleryId,
        status: job.status,
        discStatus: "pending",
        startedAt,
        products: queuedJobs.find(
          (queued) => queued.outfitId === job.outfitId,
        )?.products,
      }));
      setTryOnBatch({
        batchId: started.batchId,
        status: "processing",
        tokenCost: started.tokenCost,
        jobs: processingJobs,
        startedAt,
      });

      const updateProgress = (nextJob: StylistTryOnJob) => {
        if (tryOnRunIdRef.current !== runId) return;
        setTryOnBatch((current) => ({
          ...current,
          jobs: current.jobs.map((job) =>
            job.outfitId === nextJob.outfitId ? nextJob : job,
          ),
        }));
      };
      const terminalJobs = await Promise.all(
        processingJobs.map((job) =>
          waitForStylistTryOnJob({
            job,
            onProgress: updateProgress,
            isCancelled: () => tryOnRunIdRef.current !== runId,
          }),
        ),
      );
      if (tryOnRunIdRef.current !== runId) return false;
      const completedCount = terminalJobs.filter(
        (job) => job.status === "completed",
      ).length;
      const terminalStatus =
        completedCount === terminalJobs.length
          ? "completed"
          : completedCount > 0
            ? "partial"
            : "failed";
      setTryOnBatch({
        batchId: started.batchId,
        status: terminalStatus,
        tokenCost: started.tokenCost,
        jobs: terminalJobs,
        startedAt,
        finishedAt: Date.now(),
        ...(completedCount === 0
          ? { error: "None of the selected outfits could be rendered." }
          : {}),
      });
      return completedCount > 0;
    } catch (tryOnError) {
      if (tryOnRunIdRef.current !== runId) return false;
      const message =
        tryOnError instanceof Error
          ? tryOnError.message
          : "The selected outfit try-ons could not be started.";
      setTryOnBatch({
        status: "failed",
        tokenCost: 20,
        jobs: queuedJobs.map((job) => ({
          ...job,
          status: "failed",
          finishedAt: Date.now(),
          error: message,
        })),
        startedAt,
        finishedAt: Date.now(),
        error: message,
      });
      return false;
    }
  }, [modelImageUrl, selectedOutfits, warmStylistTryOnInputs]);

  const clearTryOns = useCallback(() => {
    tryOnRunIdRef.current += 1;
    setTryOnBatch(EMPTY_TRY_ON_BATCH);
  }, []);

  return {
    status,
    modelPreparationStatus,
    outfitPreparationStatus,
    modelPreparationError,
    tryOnPreparationStatus,
    result,
    modelPreviewImageUrl,
    modelImageUrl,
    selectedIds,
    selectedOutfits,
    tryOnBatch,
    isLoadingMore,
    error,
    generate,
    reset,
    toggleOutfit,
    swapOutfitItems,
    startSelectedTryOns,
    clearTryOns,
  };
}
