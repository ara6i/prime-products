"use client";

import { useCallback, useMemo, useState } from "react";
import { useOutfitIntelligence } from "@/app/ai-stylist/hooks/useOutfitIntelligence";
import { useUserInfo } from "@/app/shared/hooks/useUserName";
import type { WeatherData } from "@/app/shared/types";
import type {
  OutfitSuggestion,
  StylistHistorySession,
  StylistTryOnBatchState,
} from "@/app/ai-stylist/types";
import { NewChatView } from "./NewChatView";
import { OutfitSelectionView } from "./OutfitSelectionView";
import { StylistGenerationView } from "./StylistGenerationView";
import { StylistTryOnBatchView } from "./StylistTryOnBatchView";
import {
  StylistOnboardingStepper,
  type WizardGenerationRequest,
} from "./StylistOnboardingStepper";
import { StylistPlatform } from "./StylistPlatform";
import { StylistHistoryDrawer } from "./StylistHistoryDrawer";

interface AIStylistContentProps {
  onEditingChange?: (isEditing: boolean, onBack?: () => void) => void;
  userName?: string | null;
  weather?: WeatherData | null;
  weatherContext?: Record<string, unknown> | null;
}

export function AIStylistContent({
  userName = null,
  weather = null,
  weatherContext = null,
}: AIStylistContentProps = {}) {
  const [wizardActive, setWizardActive] = useState(false);
  const [wizardInitialStep, setWizardInitialStep] = useState<1 | 5>(1);
  const [diskOutfits, setDiskOutfits] = useState<OutfitSuggestion[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [reopenedSession, setReopenedSession] =
    useState<StylistHistorySession | null>(null);
  const userInfo = useUserInfo();
  const {
    status,
    modelPreparationStatus,
    outfitPreparationStatus,
    modelPreparationError,
    tryOnPreparationStatus,
    result,
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
  } = useOutfitIntelligence();

  const handleStartStyling = useCallback(() => {
    reset();
    setDiskOutfits([]);
    setReopenedSession(null);
    setWizardInitialStep(1);
    setWizardActive(true);
  }, [reset]);

  const handleCancelWizard = useCallback(() => {
    reset();
    setWizardActive(false);
  }, [reset]);

  const handleWizardGenerate = useCallback(
    async ({ imageDataUrl, request }: WizardGenerationRequest) => {
      setWizardActive(false);
      await generate({ imageDataUrl, request });
    },
    [generate],
  );

  const handleEditAnswers = useCallback(() => {
    reset();
    setDiskOutfits([]);
    setReopenedSession(null);
    setWizardInitialStep(1);
    setWizardActive(true);
  }, [reset]);

  const handleEditModel = useCallback(() => {
    reset();
    setDiskOutfits([]);
    setReopenedSession(null);
    setWizardInitialStep(5);
    setWizardActive(true);
  }, [reset]);

  const handleReset = useCallback(() => {
    reset();
    setDiskOutfits([]);
    setReopenedSession(null);
    setWizardActive(false);
  }, [reset]);

  const isGenerating =
    status === "processing-parallel" ||
    status === "processing-model" ||
    status === "building-outfits";
  const hasOutfits = Boolean(result?.outfits.length);
  const activeBatch = useMemo<StylistTryOnBatchState>(() => {
    if (!reopenedSession) return tryOnBatch;
    return {
      batchId: reopenedSession.groupKey,
      status: reopenedSession.status,
      tokenCost: 20,
      jobs: reopenedSession.jobs,
      startedAt: new Date(reopenedSession.createdAt).getTime(),
      finishedAt:
        reopenedSession.status === "processing"
          ? undefined
          : new Date(
              reopenedSession.updatedAt ?? reopenedSession.createdAt,
            ).getTime(),
    };
  }, [reopenedSession, tryOnBatch]);
  const completedPlatformOutfits = useMemo<OutfitSuggestion[]>(() => {
    const selectedById = new Map(
      selectedOutfits.map((outfit) => [outfit.id, outfit]),
    );
    return activeBatch.jobs
      .filter(
        (job) =>
          job.status === "completed" &&
          job.discStatus === "completed" &&
          Boolean(job.discImageUrl),
      )
      .slice(0, 5)
      .map((job) => {
        const outfit = selectedById.get(job.outfitId);
        const products =
          outfit?.items.map((item) => ({
            id: item.id,
            productId: item.styleRagId,
            name: item.title,
            category: item.slot,
            brand: item.brand ?? item.merchantName,
            imageUrl: item.cutoutImageUrl ?? item.imageUrl,
            price: item.price,
            affiliateUrl: item.affiliateUrl ?? item.productUrl,
            recommendedSize: item.recommendedSize,
            sizeConfidence: item.sizeConfidence,
            sizeStatus: item.sizeStatus,
          })) ??
          job.products?.map((item) => ({
            id: item.id,
            productId: item.styleRagId,
            name: item.name,
            category: item.category,
            brand: item.brand,
            imageUrl: item.imageUrl,
            price: item.price,
            affiliateUrl: item.affiliateUrl ?? item.productUrl,
            recommendedSize: item.recommendedSize,
            sizeConfidence: item.sizeConfidence,
            sizeStatus: item.sizeStatus,
          })) ??
          [];
        const totalPrice =
          outfit?.totalPrice ??
          job.products?.reduce((sum, item) => sum + (item.price ?? 0), 0) ??
          0;
        const currency =
          outfit?.currency ?? job.products?.[0]?.currency ?? "USD";
        return {
          id: job.outfitId,
          title: job.label,
          budget: totalPrice
            ? new Intl.NumberFormat("en-US", {
                style: "currency",
                currency,
                maximumFractionDigits: 0,
              }).format(totalPrice)
            : "",
          itemCount: products.length,
          imageUrl: job.imageUrl ?? (job.discImageUrl as string),
          transparentImageUrl: job.discImageUrl,
          items: products,
          isBookmarked: false,
        };
      });
  }, [activeBatch.jobs, selectedOutfits]);

  const platformOutfits =
    completedPlatformOutfits.length > 0
      ? completedPlatformOutfits
      : diskOutfits;
  const platformModelImageUrl = modelImageUrl;
  const activeDiscSlotImages = useMemo(() => {
    if (activeBatch.status === "idle") return undefined;
    const batchFinished =
      activeBatch.status === "completed" ||
      activeBatch.status === "partial" ||
      activeBatch.status === "failed";
    if (!batchFinished) {
      return [modelImageUrl ?? "", "", "", "", ""];
    }

    const completedDiscImages = Array.from({ length: 5 }, (_, index) => {
      const job = activeBatch.jobs[index];
      return job?.discStatus === "completed" && job.discImageUrl
        ? job.discImageUrl
        : "";
    });
    if (completedDiscImages.some(Boolean)) return completedDiscImages;

    return [modelImageUrl ?? "", "", "", "", ""];
  }, [activeBatch.jobs, activeBatch.status, modelImageUrl]);
  const usesInitialPlatform =
    !platformModelImageUrl &&
    platformOutfits.length === 0 &&
    activeDiscSlotImages === undefined;

  const handleBackToOutfits = useCallback(() => {
    if (completedPlatformOutfits.length > 0) {
      setDiskOutfits(completedPlatformOutfits);
    }
    setReopenedSession(null);
    clearTryOns();
  }, [clearTryOns, completedPlatformOutfits]);

  const handleReopenHistory = useCallback(
    (session: StylistHistorySession) => {
      reset();
      setWizardActive(false);
      setDiskOutfits([]);
      setReopenedSession(session);
      setHistoryOpen(false);
    },
    [reset],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-[42.083vw] max-h-full min-h-0 flex-none gap-[0.625vw] self-stretch">
        <StylistPlatform
          key={usesInitialPlatform ? "initial-models" : "active-session"}
          outfits={platformOutfits}
          showModels={!platformModelImageUrl && platformOutfits.length === 0}
          modelImageUrl={platformModelImageUrl}
          slotImages={activeDiscSlotImages}
        />

        <div className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-[1.042vw] border border-border-light bg-white">
          {wizardActive ? (
            <StylistOnboardingStepper
              initialStep={wizardInitialStep}
              profileGender={userInfo.gender}
              profileColors={userInfo.colors}
              profileStyles={userInfo.styles}
              profileSizing={userInfo}
              weatherContext={weatherContext}
              isSubmitting={false}
              error={error}
              onCancel={handleCancelWizard}
              onGenerate={handleWizardGenerate}
            />
          ) : isGenerating ? (
            <StylistGenerationView
              modelStatus={modelPreparationStatus}
              outfitsStatus={outfitPreparationStatus}
              modelError={modelPreparationError}
              onTryAgain={handleEditAnswers}
            />
          ) : activeBatch.status !== "idle" ? (
            <StylistTryOnBatchView
              batch={activeBatch}
              outfits={selectedOutfits}
              onBack={handleBackToOutfits}
              onReset={handleReset}
            />
          ) : result && hasOutfits ? (
            <OutfitSelectionView
              result={result}
              isLoadingMore={isLoadingMore}
              selectedIds={selectedIds}
              onToggle={toggleOutfit}
              onSwapItems={swapOutfitItems}
              onEditModel={handleEditModel}
              onReset={handleReset}
              onStartTryOns={() => {
                void startSelectedTryOns();
              }}
              modelImageUrl={modelImageUrl}
              modelPreparationStatus={modelPreparationStatus}
              modelPreparationError={modelPreparationError}
              tryOnPreparationStatus={tryOnPreparationStatus}
              tryOnError={error}
            />
          ) : error ? (
            <StylistGenerationView
              modelStatus={modelPreparationStatus}
              outfitsStatus={outfitPreparationStatus}
              modelError={modelPreparationError}
              error={error}
              onTryAgain={handleEditAnswers}
            />
          ) : (
            <NewChatView
              onStartStyling={handleStartStyling}
              onOpenHistory={() => setHistoryOpen(true)}
              isLoading={false}
              weather={weather}
              userName={userName ?? userInfo.firstName}
            />
          )}
        </div>
      </div>
      <StylistHistoryDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onReopen={handleReopenHistory}
      />
    </div>
  );
}
