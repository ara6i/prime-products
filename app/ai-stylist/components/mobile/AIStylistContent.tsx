"use client";

import { useCallback, useMemo, useState } from "react";
import { History, Sparkles } from "lucide-react";
import { useOutfitIntelligence } from "@/app/ai-stylist/hooks/useOutfitIntelligence";
import { useUserInfo } from "@/app/shared/hooks/useUserName";
import type { WeatherData } from "@/app/shared/types";
import type {
  StylistHistorySession,
  StylistTryOnBatchState,
} from "@/app/ai-stylist/types";
import type { WizardGenerationRequest } from "@/app/ai-stylist/components/desktop/StylistOnboardingStepper";
import { StylistGenerationView } from "@/app/ai-stylist/components/desktop/StylistGenerationView";
import { WeatherPill } from "@/app/shared/components/weather-pill/WeatherPill";
import { MobileOutfitSelectionView } from "./MobileOutfitSelectionView";
import { MobileTryOnWorkspace } from "./MobileTryOnWorkspace";
import { StylistOnboardingFlow } from "./StylistOnboardingFlow";
import { StylistHistoryDrawer } from "@/app/ai-stylist/components/desktop/StylistHistoryDrawer";

interface AIStylistContentProps {
  userName?: string | null;
  weather?: WeatherData | null;
  weatherContext?: Record<string, unknown> | null;
  isWeatherLoading?: boolean;
}

export function AIStylistContent({
  userName = null,
  weather = null,
  weatherContext = null,
  isWeatherLoading = false,
}: AIStylistContentProps = {}) {
  const [wizardActive, setWizardActive] = useState(false);
  const [wizardInitialStep, setWizardInitialStep] = useState<0 | 4>(0);
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
    selectedIds,
    selectedOutfits,
    tryOnBatch,
    error,
    generate,
    reset,
    toggleOutfit,
    startSelectedTryOns,
    clearTryOns,
  } = useOutfitIntelligence();

  const start = useCallback(() => {
    reset();
    setReopenedSession(null);
    setWizardInitialStep(0);
    setWizardActive(true);
  }, [reset]);

  const generateLooks = useCallback(
    async ({ imageDataUrl, request }: WizardGenerationRequest) => {
      setWizardActive(false);
      await generate({ imageDataUrl, request });
    },
    [generate],
  );

  const editAnswers = useCallback(() => {
    reset();
    setWizardInitialStep(0);
    setWizardActive(true);
  }, [reset]);

  const editModel = useCallback(() => {
    reset();
    setWizardInitialStep(4);
    setWizardActive(true);
  }, [reset]);

  const resetStylist = useCallback(() => {
    reset();
    setReopenedSession(null);
    setWizardInitialStep(0);
    setWizardActive(false);
  }, [reset]);

  const isGenerating =
    status === "processing-parallel" ||
    status === "processing-model" ||
    status === "building-outfits";
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

  const reopenHistory = useCallback(
    (session: StylistHistorySession) => {
      reset();
      setWizardActive(false);
      setReopenedSession(session);
      setHistoryOpen(false);
    },
    [reset],
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      {wizardActive ? (
        <StylistOnboardingFlow
          initialStep={wizardInitialStep}
          profileGender={userInfo.gender}
          profileColors={userInfo.colors}
          profileStyles={userInfo.styles}
          profileSizing={userInfo}
          weatherContext={weatherContext}
          onCancel={resetStylist}
          onGenerate={generateLooks}
        />
      ) : isGenerating ? (
        <div className="flex min-h-[520px] flex-1 overflow-hidden rounded-[20px] border border-[#e1dfe6] bg-white">
          <StylistGenerationView
            modelStatus={modelPreparationStatus}
            outfitsStatus={outfitPreparationStatus}
            modelError={modelPreparationError}
            onTryAgain={editAnswers}
          />
        </div>
      ) : activeBatch.status !== "idle" ? (
        <MobileTryOnWorkspace
          batch={activeBatch}
          outfits={selectedOutfits}
          onBack={() => {
            setReopenedSession(null);
            clearTryOns();
          }}
          onReset={resetStylist}
          onEditModel={editModel}
        />
      ) : result?.outfits.length ? (
        <MobileOutfitSelectionView
          result={result}
          selectedIds={selectedIds}
          onToggle={toggleOutfit}
          onEditModel={editModel}
          onReset={resetStylist}
          onStartTryOns={() => {
            void startSelectedTryOns();
          }}
          tryOnPreparationStatus={tryOnPreparationStatus}
          tryOnError={error}
        />
      ) : error ? (
        <div className="flex min-h-[520px] flex-1 overflow-hidden rounded-[20px] border border-[#e1dfe6] bg-white">
          <StylistGenerationView
            modelStatus={modelPreparationStatus}
            outfitsStatus={outfitPreparationStatus}
            modelError={modelPreparationError}
            error={error}
            onTryAgain={editAnswers}
          />
        </div>
      ) : (
        <div className="flex min-h-full flex-1 flex-col pb-4">
          <p className="pt-1 text-sm font-medium text-[#4d4a52]">
            Get styled, effortlessly
          </p>
          <div className="flex flex-1 flex-col items-center justify-center px-1 pb-10 pt-14 text-center">
            <h2 className="text-[26px] font-medium leading-tight text-[#24212c]">
              Hey
              {userName || userInfo.firstName
                ? ` ${userName ?? userInfo.firstName}`
                : ""}
              ! <span aria-hidden="true">👋</span>
            </h2>
            {weather && (
              <div className="mt-5 w-full max-w-[340px]">
                <WeatherPill data={weather} />
              </div>
            )}
            {!weather && isWeatherLoading && (
              <div
                aria-label="Finding your local weather"
                className="mt-5 h-[42px] w-full max-w-[340px] animate-pulse rounded-[24px] bg-[#eeeafd]"
              />
            )}
            <div className="mt-6 text-[clamp(11px,3.75vw,17px)] leading-7 tracking-[-0.01em] text-[#24212c]">
              <p className="whitespace-nowrap">
                I can help you build the perfect outfit for today
              </p>
              <p className="whitespace-nowrap">
                Get 5 personalized outfits in under a minute:
              </p>
            </div>
            <div className="mt-6 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setHistoryOpen(true)}
                className="flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-medium text-[#6f6b73]"
              >
                <History className="size-4" />
                History
              </button>
              <button
                type="button"
                onClick={start}
                className="flex min-h-12 items-center gap-2 rounded-full bg-[#7258fa] px-6 text-base font-medium text-white"
              >
                <Sparkles className="size-4" />
                Start Styling
              </button>
            </div>
          </div>
        </div>
      )}
      <StylistHistoryDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onReopen={reopenHistory}
      />
    </div>
  );
}
