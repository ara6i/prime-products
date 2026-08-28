"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  ArrowLeft,
  ArrowRight,
  Camera,
  Check,
  Sparkles,
} from "lucide-react";
import type { OutfitIntelligenceRequest } from "@/app/ai-stylist/types";
import type { WizardGenerationRequest } from "@/app/ai-stylist/components/desktop/StylistOnboardingStepper";
import { FULL_BODY_MODELS } from "@/app/ai-stylist/components/desktop/ModelPreviewCard";
import {
  garmentOptionAsset,
  garmentOptionDescription,
  occasionAsset,
  occasionSkipsSeasonStep,
  STYLIST_GARMENT_OPTIONS,
  STYLIST_OCCASIONS,
  STYLIST_STEP_LABELS,
  type StylistGarmentSelection,
  type StylistGender,
} from "@/app/ai-stylist/data/onboarding";
import { StylistSizingPhotoPicker } from "@/app/ai-stylist/components/shared/StylistSizingPhotoPicker";
import {
  useStylistSizingPhoto,
  type StylistSizingProfile,
} from "@/app/ai-stylist/hooks/useStylistSizingPhoto";

interface StylistOnboardingFlowProps {
  initialStep?: 0 | 4;
  profileGender?: "female" | "male" | null;
  profileColors?: string[];
  profileStyles?: string[];
  profileSizing: StylistSizingProfile;
  weatherContext?: Record<string, unknown> | null;
  onCancel: () => void;
  onGenerate: (request: WizardGenerationRequest) => void | Promise<void>;
}

const SEASONS = [
  {
    id: "spring",
    label: "Spring",
    image: "/images/ai-stylist/onboarding/season-spring.png",
  },
  {
    id: "summer",
    label: "Summer",
    image: "/images/ai-stylist/onboarding/season-summer.png",
  },
  {
    id: "fall",
    label: "Fall",
    image: "/images/ai-stylist/onboarding/season-fall.png",
  },
  {
    id: "winter",
    label: "Winter",
    image: "/images/ai-stylist/onboarding/season-winter.png",
  },
] as const;

const BUDGETS = [
  {
    id: "budget",
    label: "Budget-Friendly",
    range: "Up to $500",
    min: 0,
    max: 500,
  },
  { id: "mid", label: "Mid-Range", range: "$501–$900", min: 501, max: 900 },
  {
    id: "premium",
    label: "Premium",
    range: "$901–$1,600",
    min: 901,
    max: 1600,
  },
  {
    id: "luxury",
    label: "Luxury",
    range: "$1,601–$5,000",
    min: 1601,
    max: 5000,
  },
];

async function assetToDataUrl(src: string): Promise<string> {
  const response = await fetch(src);
  if (!response.ok) throw new Error("Could not load the selected model.");
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("Could not prepare the selected model."));
    reader.onerror = () =>
      reject(new Error("Could not prepare the selected model."));
    reader.readAsDataURL(blob);
  });
}

function SelectCard({
  selected,
  onClick,
  disabled = false,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      disabled={disabled}
      className={`relative min-h-20 overflow-hidden rounded-xl border p-3 text-left ${
        selected
          ? "border-[#2154ef] bg-[#eaf0ff]"
          : "border-[#dedce3] bg-[#f7f7f9]"
      } ${disabled && !selected ? "cursor-not-allowed opacity-45" : ""}`}
    >
      {selected && (
        <span className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#2154ef] text-white">
          <Check className="h-3 w-3" />
        </span>
      )}
      {children}
    </button>
  );
}

export function StylistOnboardingFlow({
  initialStep = 0,
  profileGender = null,
  profileColors = [],
  profileSizing,
  weatherContext = null,
  onCancel,
  onGenerate,
}: StylistOnboardingFlowProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState<number>(initialStep);
  const [occasionId, setOccasionId] = useState("work-office");
  const [stylingGender, setStylingGender] = useState<StylistGender>(
    profileGender === "male" ? "male" : "female",
  );
  const [seasonId, setSeasonId] =
    useState<(typeof SEASONS)[number]["id"]>("fall");
  const [budgetId, setBudgetId] = useState("premium");
  const [selectedGarments, setSelectedGarments] = useState<
    StylistGarmentSelection[]
  >(() => (initialStep === 4 ? ["top", "bottom", "shoe"] : []));
  const [modelMode, setModelMode] = useState<"choose" | "upload">("choose");
  const defaultModel =
    FULL_BODY_MODELS.find((model) => model.gender === stylingGender) ??
    FULL_BODY_MODELS[0];
  const [modelId, setModelId] = useState(defaultModel?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);
  const sizingPhoto = useStylistSizingPhoto({
    profile: profileSizing,
    gender: stylingGender,
  });

  const models = FULL_BODY_MODELS.filter(
    (model) => model.gender === stylingGender,
  );
  const sizingPhotoFocused =
    modelMode === "upload" &&
    sizingPhoto.sizingChoice === "generated" &&
    sizingPhoto.status !== "idle";

  const skipsSeasonStep = occasionSkipsSeasonStep(occasionId);
  const visibleSteps = skipsSeasonStep ? [0, 1, 3, 4] : [0, 2, 1, 3, 4];
  const visibleStepIndex = Math.max(0, visibleSteps.indexOf(step));

  useEffect(() => {
    if (contentRef.current) contentRef.current.scrollTop = 0;
  }, [step]);

  const handleStylingGenderChange = (gender: StylistGender) => {
    setStylingGender(gender);
    if (gender === "male") {
      setSelectedGarments((current) =>
        current.filter((selection) => selection !== "dress"),
      );
    }
    setModelId(
      FULL_BODY_MODELS.find((model) => model.gender === gender)?.id ?? "",
    );
  };

  const handleGarmentOption = (
    option: (typeof STYLIST_GARMENT_OPTIONS)[number],
  ) => {
    setSelectedGarments((current) => {
      if (current.includes(option.id)) {
        return current.filter((selection) => selection !== option.id);
      }
      const withoutConflict =
        option.id === "dress"
          ? current.filter(
              (selection) => selection !== "top" && selection !== "bottom",
            )
          : option.id === "top" || option.id === "bottom"
            ? current.filter((selection) => selection !== "dress")
            : current;
      return withoutConflict.length >= 5
        ? withoutConflict
        : [...withoutConflict, option.id];
    });
  };

  const canContinue =
    (step === 0 && Boolean(occasionId && stylingGender)) ||
    (step === 1 && selectedGarments.length > 0) ||
    (step === 2 && Boolean(seasonId)) ||
    (step === 3 && Boolean(budgetId)) ||
    (step === 4 &&
      (modelMode === "choose" ? Boolean(modelId) : sizingPhoto.canUsePhoto));

  const generate = async () => {
    if (!canContinue || preparing) return;
    const occasion = STYLIST_OCCASIONS.find((item) => item.id === occasionId);
    const budget = BUDGETS.find((item) => item.id === budgetId);
    const model = FULL_BODY_MODELS.find((item) => item.id === modelId);
    if (!occasion || !budget || !selectedGarments.length) return;
    setPreparing(true);
    setError(null);

    try {
      const imageDataUrl =
        modelMode === "upload"
          ? await sizingPhoto.selectedImageDataUrl()
          : model
            ? await assetToDataUrl(
                `/images/ai-stylist/onboarding/model-${
                  FULL_BODY_MODELS.findIndex((item) => item.id === model.id) + 1
                }-generation.png`,
              )
            : null;
      if (!imageDataUrl) throw new Error("Choose or upload a model photo.");

      const temperature =
        typeof weatherContext?.temperature === "number"
          ? weatherContext.temperature
          : null;
      const condition =
        typeof weatherContext?.description === "string"
          ? weatherContext.description
          : typeof weatherContext?.condition === "string"
            ? weatherContext.condition
            : null;
      const request: OutfitIntelligenceRequest = {
        onboarding: {
          gender: stylingGender,
          occasion: occasion.api,
          styleVibes: occasion.vibes,
          season: skipsSeasonStep ? "all-season" : seasonId,
          budget: { min: budget.min, max: budget.max, currency: "USD" },
          preferredColors: profileColors,
          avoidColors: [],
          fitPreferences: [],
          coveragePreferences: [],
          avoidMaterials: [],
          favoriteBrands: [],
          garmentPreferences: {
            selectedSlots: selectedGarments,
          },
          ...(temperature !== null && condition
            ? {
                weather: {
                  temperatureC: temperature,
                  condition,
                  raining: /rain|storm|drizzle|shower/i.test(condition),
                },
              }
            : {}),
        },
        requestedOutfits: 10,
      };
      await onGenerate({ imageDataUrl, request });
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : "Could not prepare the model.",
      );
    } finally {
      setPreparing(false);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col bg-white">
      <div className="shrink-0 px-4 pt-4">
        <div className="flex items-center justify-between text-xs text-[#77737f]">
          <span className="font-medium">{STYLIST_STEP_LABELS[step]}</span>
          <span>
            Step {visibleStepIndex + 1} of {visibleSteps.length}
          </span>
        </div>
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-[#eceaf0]">
          <div
            className="h-full rounded-full bg-[#2154ef] transition-all"
            style={{
              width: `${((visibleStepIndex + 1) / visibleSteps.length) * 100}%`,
            }}
          />
        </div>
      </div>

      <div ref={contentRef} className="min-h-0 flex-1 overflow-y-auto p-4">
        {step === 0 && (
          <>
            <h2 className="text-center text-xl font-semibold">
              What are you dressing for?
            </h2>
            <p className="mt-1 text-center text-xs text-[#77737f]">
              Choose the occasion and who we are styling.
            </p>
            <div className="mx-auto mt-4 max-w-sm">
              <p className="mb-2 text-center text-sm font-semibold text-[#24212c]">
                Who are we styling?
              </p>
              <div className="grid grid-cols-2 rounded-2xl bg-[#f0eef4] p-1.5">
                {(
                  [
                    ["female", "Women"],
                    ["male", "Men"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={stylingGender === value}
                    onClick={() => handleStylingGenderChange(value)}
                    className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                      stylingGender === value
                        ? "bg-white text-[#1847cc] shadow-sm"
                        : "text-[#77737f]"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {STYLIST_OCCASIONS.map((occasion) => (
                <SelectCard
                  key={occasion.id}
                  selected={occasionId === occasion.id}
                  onClick={() => setOccasionId(occasion.id)}
                >
                  <Image
                    src={occasionAsset(stylingGender, occasion.id)}
                    alt=""
                    width={160}
                    height={120}
                    className="mx-auto h-24 w-full object-contain"
                  />
                  <span className="mt-2 block text-center text-sm font-medium">
                    {occasion.label}
                  </span>
                </SelectCard>
              ))}
            </div>
          </>
        )}

        {step === 1 && (
          <>
            <h2 className="text-center text-xl font-semibold">
              What would you like in your outfits?
            </h2>
            <p className="mt-1 text-center text-xs leading-5 text-[#77737f]">
              Choose up to 5 categories. Top and Bottom are separate choices.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {STYLIST_GARMENT_OPTIONS.filter(
                (option) => !(option.womenOnly && stylingGender === "male"),
              ).map((option) => {
                const selected = selectedGarments.includes(option.id);
                const replacesConflict =
                  (option.id === "dress" &&
                    selectedGarments.some((item) =>
                      ["top", "bottom"].includes(item),
                    )) ||
                  (["top", "bottom"].includes(option.id) &&
                    selectedGarments.includes("dress"));
                const limitReached =
                  !selected && selectedGarments.length >= 5 && !replacesConflict;
                const disabled = limitReached || option.unavailable;
                return (
                  <SelectCard
                    key={option.id}
                    selected={selected}
                    disabled={disabled}
                    onClick={() => handleGarmentOption(option)}
                  >
                    <Image
                      src={garmentOptionAsset(option, stylingGender)}
                      alt=""
                      width={160}
                      height={160}
                      className="mx-auto h-24 w-full object-contain"
                    />
                    <span className="mt-1 block text-center text-sm font-semibold text-[#24212c]">
                      {option.label}
                    </span>
                    <span className="mt-0.5 block truncate text-center text-[11px] text-[#77737f]">
                      {option.unavailable
                        ? option.unavailableMessage
                        : limitReached
                        ? "Maximum 5 selected"
                        : garmentOptionDescription(option, stylingGender)}
                    </span>
                  </SelectCard>
                );
              })}
            </div>
            <p className="mt-3 text-center text-xs text-[#77737f]">
              {selectedGarments.length}/5 selected · Dress cannot be combined
              with Top or Bottom.
            </p>
          </>
        )}

        {step === 2 && !skipsSeasonStep && (
          <>
            <h2 className="text-center text-lg font-semibold">
              What weather are you dressing for?
            </h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {SEASONS.map((season) => (
                <SelectCard
                  key={season.id}
                  selected={seasonId === season.id}
                  onClick={() => setSeasonId(season.id)}
                >
                  <Image
                    src={season.image}
                    alt=""
                    width={70}
                    height={70}
                    className="mx-auto h-14 w-auto object-contain"
                  />
                  <span className="mt-1 block text-center text-sm font-semibold">
                    {season.label}
                  </span>
                </SelectCard>
              ))}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <h2 className="text-center text-lg font-semibold">
              How much do you usually spend on an outfit?
            </h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {BUDGETS.map((budget) => (
                <SelectCard
                  key={budget.id}
                  selected={budgetId === budget.id}
                  onClick={() => setBudgetId(budget.id)}
                >
                  <span className="block pt-4 text-center text-sm font-semibold">
                    {budget.label}
                  </span>
                  <span className="mt-1 block text-center text-xs text-[#65636d]">
                    {budget.range}
                  </span>
                </SelectCard>
              ))}
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <h2 className="text-center text-lg font-semibold">
              Choose model to generate outfits
            </h2>
            {!sizingPhotoFocused && (
              <div className="mt-3 flex rounded-full bg-[#f0eef4] p-1">
              <button
                type="button"
                onClick={() => setModelMode("choose")}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-xs ${
                  modelMode === "choose"
                    ? "bg-[#dce6ff] text-[#1847cc]"
                    : "text-[#77737f]"
                }`}
              >
                <Camera className="h-4 w-4" />
                Choose Model
              </button>
              <button
                type="button"
                onClick={() => setModelMode("upload")}
                className={`flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 text-xs ${
                  modelMode === "upload"
                    ? "bg-[#dce6ff] text-[#1847cc]"
                    : "text-[#77737f]"
                }`}
              >
                <Camera className="h-4 w-4" />
                Upload Photo
              </button>
              </div>
            )}

            {modelMode === "choose" ? (
              <div className="mt-4 grid grid-cols-4 gap-2">
                {models.map((model) => {
                  const modelIndex =
                    FULL_BODY_MODELS.findIndex((item) => item.id === model.id) +
                    1;
                  return (
                    <button
                      key={model.id}
                      type="button"
                      aria-pressed={modelId === model.id}
                      onClick={() => setModelId(model.id)}
                      className={`relative aspect-[3/4] overflow-hidden rounded-lg border-2 ${
                        modelId === model.id
                          ? "border-[#2154ef]"
                          : "border-transparent"
                      }`}
                    >
                      <Image
                        src={`/images/ai-stylist/onboarding/model-${modelIndex}.png`}
                        alt={model.name}
                        fill
                        sizes="22vw"
                        className="object-cover"
                      />
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="mt-4">
                <StylistSizingPhotoPicker
                  gender={stylingGender}
                  source={sizingPhoto.source}
                  sizingChoice={sizingPhoto.sizingChoice}
                  savedPhotoUrl={sizingPhoto.savedPhotoUrl}
                  uploaded={sizingPhoto.uploaded}
                  status={sizingPhoto.status}
                  error={sizingPhoto.error}
                  measurements={sizingPhoto.displayedMeasurements}
                  unit={sizingPhoto.displayedUnit}
                  hasSavedMeasurements={sizingPhoto.hasSavedMeasurements}
                  onUseSaved={sizingPhoto.selectSaved}
                  onUpload={sizingPhoto.analyzeUpload}
                  onUseSavedMeasurements={sizingPhoto.useSavedMeasurements}
                  onGenerateMeasurements={sizingPhoto.generateMeasurements}
                  onSaveGeneratedProfile={sizingPhoto.saveGeneratedProfile}
                />
              </div>
            )}
          </>
        )}

        {error && (
          <p
            role="alert"
            className="mt-3 rounded-lg bg-red-50 p-2 text-xs text-red-700"
          >
            {error}
          </p>
        )}
      </div>

      <div className="flex shrink-0 items-center justify-between border-t border-[#e4e2e8] p-4">
        <button
          type="button"
          onClick={() => {
            if (visibleStepIndex === 0) onCancel();
            else setStep(visibleSteps[visibleStepIndex - 1] ?? 0);
          }}
          disabled={preparing}
          className="flex items-center gap-1.5 rounded-full border border-[#c7c3cd] px-4 py-2 text-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Previous
        </button>
        {visibleStepIndex < visibleSteps.length - 1 ? (
          <button
            type="button"
            disabled={!canContinue || preparing}
            onClick={() =>
              setStep(visibleSteps[visibleStepIndex + 1] ?? 4)
            }
            className="flex items-center gap-1.5 rounded-full bg-[#2154ef] px-5 py-2 text-sm font-medium text-white disabled:bg-[#ccc8d3]"
          >
            Next
            <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={generate}
            disabled={!canContinue || preparing}
            className="flex items-center gap-1.5 rounded-full bg-[#2154ef] px-5 py-2 text-sm font-medium text-white disabled:bg-[#ccc8d3]"
          >
            <Sparkles className="h-4 w-4" />
            {preparing ? "Preparing…" : "Generate"}
          </button>
        )}
      </div>
    </div>
  );
}
