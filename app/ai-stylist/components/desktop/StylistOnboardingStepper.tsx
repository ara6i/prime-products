"use client";

import { useState } from "react";
import Image from "next/image";
import { seasons } from "@/app/catalog/data";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  GenerateIcon,
} from "@/app/shared/components/icons";
import { Button } from "@/app/shared/components/ui";
import type {
  OutfitIntelligenceRequest,
} from "@/app/ai-stylist/types";
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
import { FULL_BODY_MODELS } from "./ModelPreviewCard";
import { StylistSizingPhotoPicker } from "@/app/ai-stylist/components/shared/StylistSizingPhotoPicker";
import {
  useStylistSizingPhoto,
  type StylistSizingProfile,
} from "@/app/ai-stylist/hooks/useStylistSizingPhoto";

type WizardStep = 1 | 2 | 3 | 4 | 5;
type ModelMode = "choose-model" | "upload-photo";

interface WizardGenerationRequest {
  request: OutfitIntelligenceRequest;
  imageDataUrl: string;
}

interface StylistOnboardingStepperProps {
  initialStep?: WizardStep;
  profileGender?: "female" | "male" | null;
  profileColors?: string[];
  profileStyles?: string[];
  profileSizing: StylistSizingProfile;
  weatherContext?: Record<string, unknown> | null;
  isSubmitting?: boolean;
  error?: string | null;
  onCancel: () => void;
  onGenerate: (request: WizardGenerationRequest) => void | Promise<void>;
}

const FIGMA_SEASON_ASSETS: Record<string, string> = {
  spring: "/images/ai-stylist/onboarding/season-spring.png",
  summer: "/images/ai-stylist/onboarding/season-summer.png",
  fall: "/images/ai-stylist/onboarding/season-fall.png",
  winter: "/images/ai-stylist/onboarding/season-winter.png",
};

const BUDGET_OPTIONS = [
  {
    id: "budget-friendly",
    label: "Budget-Friendly",
    range: "Up to $500",
    min: 0,
    max: 500,
    asset: "/images/ai-stylist/onboarding/budget-friendly.png",
  },
  {
    id: "mid-range",
    label: "Mid-Range",
    range: "$501–$900",
    min: 501,
    max: 900,
    asset: "/images/ai-stylist/onboarding/budget-mid-range.png",
  },
  {
    id: "premium",
    label: "Premium",
    range: "$901–$1,600",
    min: 901,
    max: 1600,
    asset: "/images/ai-stylist/onboarding/budget-premium.png",
  },
  {
    id: "luxury",
    label: "Luxury",
    range: "$1,601–$5,000",
    min: 1601,
    max: 5000,
    asset: "/images/ai-stylist/onboarding/budget-luxury.png",
  },
];

const FIGMA_MODEL_ASSETS: Record<string, string> = {
  "model-noah": "/images/ai-stylist/onboarding/model-1.png",
  "model-aria": "/images/ai-stylist/onboarding/model-2.png",
  "model-jade": "/images/ai-stylist/onboarding/model-3.png",
  "model-ryan": "/images/ai-stylist/onboarding/model-4.png",
  "model-luna": "/images/ai-stylist/onboarding/model-5.png",
  "model-leo": "/images/ai-stylist/onboarding/model-6.png",
  "model-zoe": "/images/ai-stylist/onboarding/model-7.png",
  "model-evelyn": "/images/ai-stylist/onboarding/model-8.png",
};

const FIGMA_MODEL_GENERATION_ASSETS: Record<string, string> = {
  "model-noah": "/images/ai-stylist/onboarding/model-1-generation.png",
  "model-aria": "/images/ai-stylist/onboarding/model-2-generation.png",
  "model-jade": "/images/ai-stylist/onboarding/model-3-generation.png",
  "model-ryan": "/images/ai-stylist/onboarding/model-4-generation.png",
  "model-luna": "/images/ai-stylist/onboarding/model-5-generation.png",
  "model-leo": "/images/ai-stylist/onboarding/model-6-generation.png",
  "model-zoe": "/images/ai-stylist/onboarding/model-7-generation.png",
  "model-evelyn": "/images/ai-stylist/onboarding/model-8-generation.png",
};

async function assetToDataUrl(src: string): Promise<string> {
  const response = await fetch(src);
  if (!response.ok) {
    throw new Error(`Could not load model asset (${response.status}).`);
  }

  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new Error("Could not prepare the selected model."));
      }
    };
    reader.onerror = () =>
      reject(new Error("Could not prepare the selected model."));
    reader.readAsDataURL(blob);
  });
}

function OptionCheck({ selected }: { selected: boolean }) {
  return (
    <span
      className={`flex h-[1.042vw] w-[1.042vw] shrink-0 items-center justify-center rounded-[0.208vw] border transition-colors ${
        selected
          ? "border-[#2154ef] bg-[#2154ef]"
          : "border-[#b9b9bd] bg-white"
      }`}
      aria-hidden="true"
    >
      {selected && (
        <CheckIcon
          size={12}
          color="white"
          className="!h-[0.625vw] !w-[0.625vw]"
        />
      )}
    </span>
  );
}

export function StylistOnboardingStepper({
  initialStep = 1,
  profileGender = null,
  profileColors = [],
  profileSizing,
  weatherContext = null,
  isSubmitting = false,
  error = null,
  onCancel,
  onGenerate,
}: StylistOnboardingStepperProps) {
  const [step, setStep] = useState<WizardStep>(initialStep);
  const [occasionId, setOccasionId] = useState("work-office");
  const [stylingGender, setStylingGender] = useState<StylistGender>(
    profileGender === "male" ? "male" : "female",
  );
  const [seasonId, setSeasonId] = useState("fall");
  const [budgetId, setBudgetId] = useState("premium");
  const [selectedGarments, setSelectedGarments] = useState<
    StylistGarmentSelection[]
  >(() => (initialStep === 5 ? ["top", "bottom", "shoe"] : []));
  const [modelMode, setModelMode] = useState<ModelMode>("choose-model");
  const [selectedModelId, setSelectedModelId] = useState(() => {
    const matchingModel = FULL_BODY_MODELS.find(
      (model) =>
        model.gender === (profileGender === "male" ? "male" : "female"),
    );
    const femaleFallback = FULL_BODY_MODELS.find(
      (model) => model.gender === "female",
    );
    return matchingModel?.id ?? femaleFallback?.id ?? FULL_BODY_MODELS[0]?.id ?? "";
  });
  const [isPreparingModel, setIsPreparingModel] = useState(false);
  const [generationAssetError, setGenerationAssetError] = useState<
    string | null
  >(null);
  const sizingPhoto = useStylistSizingPhoto({
    profile: profileSizing,
    gender: stylingGender,
  });

  const models = FULL_BODY_MODELS.filter(
    (model) => model.gender === stylingGender,
  );
  const selectedModel = models.find((model) => model.id === selectedModelId);
  const sizingPhotoFocused =
    modelMode === "upload-photo" &&
    sizingPhoto.sizingChoice === "generated" &&
    sizingPhoto.status !== "idle";

  const skipsSeasonStep = occasionSkipsSeasonStep(occasionId);
  const visibleSteps: WizardStep[] = skipsSeasonStep
    ? [1, 2, 4, 5]
    : [1, 3, 2, 4, 5];
  const visibleStepIndex = Math.max(0, visibleSteps.indexOf(step));

  const handleStylingGenderChange = (gender: StylistGender) => {
    setStylingGender(gender);
    if (gender === "male") {
      setSelectedGarments((current) =>
        current.filter((selection) => selection !== "dress"),
      );
    }
    setSelectedModelId(
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
    (step === 1 && Boolean(occasionId && stylingGender)) ||
    (step === 2 && selectedGarments.length > 0) ||
    (step === 3 && Boolean(seasonId)) ||
    (step === 4 && Boolean(budgetId)) ||
    (step === 5 &&
      (modelMode === "choose-model"
        ? Boolean(selectedModel)
        : sizingPhoto.canUsePhoto));

  const handlePrevious = () => {
    if (isSubmitting) return;
    if (visibleStepIndex === 0) {
      onCancel();
      return;
    }
    setStep(visibleSteps[visibleStepIndex - 1] as WizardStep);
  };

  const handleNext = () => {
    if (!canContinue || isSubmitting || step === 5) return;
    setStep(visibleSteps[visibleStepIndex + 1] as WizardStep);
  };

  const handleGenerate = async () => {
    if (isSubmitting || isPreparingModel) return;

    const occasion = STYLIST_OCCASIONS.find(
      (option) => option.id === occasionId,
    );
    const season = seasons.find((option) => option.id === seasonId);
    const budget = BUDGET_OPTIONS.find((option) => option.id === budgetId);

    if (
      !occasion ||
      !selectedGarments.length ||
      (!skipsSeasonStep && !season) ||
      !budget
    )
      return;

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
    const windSpeed =
      typeof weatherContext?.windSpeed === "number"
        ? weatherContext.windSpeed
        : null;
    const structuredWeather =
      temperature !== null && condition
        ? {
            temperatureC: temperature,
            condition,
            raining: /rain|storm|drizzle|shower/i.test(condition),
            ...(windSpeed !== null ? { windSpeedKph: windSpeed } : {}),
          }
        : undefined;
    setGenerationAssetError(null);
    setIsPreparingModel(true);

    try {
      const chosenImage = modelMode === "upload-photo"
        ? await sizingPhoto.selectedImageDataUrl()
        : selectedModel
          ? await assetToDataUrl(
              FIGMA_MODEL_GENERATION_ASSETS[selectedModel.id] ??
                selectedModel.image,
            )
          : undefined;

      if (!chosenImage) return;
      await onGenerate({
        imageDataUrl: chosenImage,
        request: {
          onboarding: {
            gender: stylingGender,
            occasion: occasion.api,
            styleVibes: occasion.vibes,
            season: skipsSeasonStep
              ? "all-season"
              : (season!.id as OutfitIntelligenceRequest["onboarding"]["season"]),
            budget: {
              min: budget.min,
              max: budget.max,
              currency: "USD",
            },
            preferredColors: profileColors,
            avoidColors: [],
            fitPreferences: [],
            coveragePreferences: [],
            avoidMaterials: [],
            favoriteBrands: [],
            garmentPreferences: {
              selectedSlots: selectedGarments,
            },
            ...(structuredWeather ? { weather: structuredWeather } : {}),
          },
          requestedOutfits: 10,
        },
      });
    } catch (generationError) {
      setGenerationAssetError(
        generationError instanceof Error
          ? generationError.message
          : "Could not prepare the selected model.",
      );
    } finally {
      setIsPreparingModel(false);
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col px-[2.083vw] pb-[1.667vw] pt-[1.458vw]">
      <div className="shrink-0">
        <div className="flex items-center justify-between">
          <span className="text-[0.729vw] font-medium leading-[1.146vw] text-text-muted">
            {STYLIST_STEP_LABELS[step - 1]}
          </span>
          <span className="text-[0.729vw] font-normal leading-[1.146vw] text-text-muted">
            Step {visibleStepIndex + 1} of {visibleSteps.length}
          </span>
        </div>
        <div className="mt-[0.625vw] h-[0.208vw] overflow-hidden rounded-full bg-[#e8e6ed]">
          <div
            className="h-full rounded-full bg-[#2154ef] transition-[width] duration-300"
            style={{
              width: `${((visibleStepIndex + 1) / visibleSteps.length) * 100}%`,
            }}
          />
        </div>
      </div>

      <div
        className={`min-h-0 flex-1 px-[0.208vw] ${
          step === 5 && modelMode === "choose-model"
            ? "overflow-hidden py-[1.042vw]"
            : "overflow-y-auto py-[1.667vw]"
        }`}
      >
        {step === 1 && (
          <section aria-labelledby="occasion-heading">
            <h2
              id="occasion-heading"
              className="text-center text-[1.25vw] font-medium leading-[1.875vw] text-text-primary"
            >
              What are you dressing for?
            </h2>
            <div
              role="group"
              aria-label="Who are we styling?"
              className="mx-auto mt-[0.833vw] grid w-[18.75vw] grid-cols-2 rounded-full bg-[#efedf3] p-[0.208vw]"
            >
              {(
                [
                  ["female", "Women"],
                  ["male", "Men"],
                ] as const
              ).map(([value, label]) => {
                const selected = stylingGender === value;
                return (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => handleStylingGenderChange(value)}
                    className={`rounded-full px-[1.25vw] py-[0.521vw] text-[0.729vw] font-semibold transition-all ${
                      selected
                        ? "bg-white text-[#1847cc] shadow-[0_0.156vw_0.521vw_rgba(33,84,239,0.12)] ring-1 ring-[#aac0ff]"
                        : "text-[#77737f] hover:text-[#423b4c]"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
            <p className="mt-[0.521vw] text-center text-[0.625vw] text-text-muted">
              Who are we styling?
            </p>
            <div className="mx-auto mt-[0.833vw] grid max-w-[33.438vw] grid-cols-4 gap-[0.625vw]">
              {STYLIST_OCCASIONS.map((occasion) => {
                const selected = occasion.id === occasionId;
                return (
                  <button
                    key={occasion.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setOccasionId(occasion.id)}
                    className={`group relative h-[7.604vw] overflow-hidden rounded-[0.625vw] border text-left transition-all ${
                      selected
                        ? "border-[#7da0ff] bg-[#eaf0ff] shadow-[0_0.208vw_0.625vw_rgba(33,84,239,0.12)]"
                        : "border-[#dddbe2] bg-[#f3f2f5] hover:border-[#aac0ff] hover:bg-[#f6f8ff]"
                    }`}
                  >
                    <span className="absolute inset-x-[0.417vw] top-[0.208vw] h-[5.208vw]">
                      <Image
                        src={occasionAsset(stylingGender, occasion.id)}
                        alt=""
                        fill
                        sizes="8vw"
                        className="object-contain transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    </span>
                    <span className="absolute bottom-[0.521vw] left-[0.313vw] right-[0.313vw] text-center text-[0.625vw] font-medium leading-[0.938vw] text-text-primary">
                      {occasion.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {step === 2 && (
          <section aria-labelledby="pieces-heading">
            <h2
              id="pieces-heading"
              className="text-center text-[1.25vw] font-medium leading-[1.875vw] text-text-primary"
            >
              What would you like in your outfits?
            </h2>
            <p className="mt-[0.313vw] text-center text-[0.625vw] leading-[1.042vw] text-text-muted">
              Choose up to 5 categories. Dress cannot be combined with Tops or Bottoms.
            </p>
            <div className="mx-auto mt-[0.833vw] grid max-w-[33.438vw] grid-cols-4 gap-[0.625vw]">
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
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={selected}
                    disabled={disabled}
                    onClick={() => handleGarmentOption(option)}
                    className={`group relative h-[7.604vw] overflow-hidden rounded-[0.625vw] border text-left transition-all ${
                      disabled
                        ? "cursor-not-allowed border-[#e5e3e8] bg-[#f5f4f6] opacity-45"
                        : selected
                          ? "border-[#7da0ff] bg-[#eaf0ff] shadow-[0_0.208vw_0.625vw_rgba(33,84,239,0.12)]"
                          : "border-[#dddbe2] bg-[#f3f2f5] hover:border-[#aac0ff] hover:bg-[#f6f8ff]"
                    }`}
                  >
                    <span className="absolute inset-x-[0.417vw] top-[0.208vw] h-[4.688vw]">
                      <Image
                        src={garmentOptionAsset(option, stylingGender)}
                        alt=""
                        fill
                        sizes="8vw"
                        className="object-contain transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    </span>
                    {selected && (
                      <span className="absolute right-[0.417vw] top-[0.417vw]">
                        <OptionCheck selected />
                      </span>
                    )}
                    <span className="absolute bottom-[0.365vw] left-[0.313vw] right-[0.313vw] text-center">
                      <span className="block text-[0.625vw] font-semibold leading-[0.833vw] text-text-primary">
                        {option.label}
                      </span>
                      <span className="mt-[0.104vw] block truncate text-[0.521vw] leading-[0.729vw] text-text-muted">
                        {option.unavailable
                          ? option.unavailableMessage
                          : limitReached
                          ? "Maximum 5 selected"
                          : garmentOptionDescription(option, stylingGender)}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="mt-[0.521vw] text-center text-[0.573vw] text-text-muted">
              {selectedGarments.length}/5 selected · Tops and Bottoms are separate choices.
            </p>
          </section>
        )}

        {step === 3 && !skipsSeasonStep && (
          <section aria-labelledby="season-heading">
            <h2
              id="season-heading"
              className="text-center text-[1.25vw] font-medium leading-[1.875vw] text-text-primary"
            >
              What weather are you dressing for?
            </h2>
            <div className="mx-auto mt-[1.667vw] grid max-w-[33.438vw] grid-cols-4 gap-[0.833vw]">
              {seasons.map((season) => {
                const selected = season.id === seasonId;
                const asset = FIGMA_SEASON_ASSETS[season.id];
                return (
                  <button
                    key={season.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setSeasonId(season.id)}
                    className={`relative flex h-[5.208vw] items-center overflow-hidden rounded-[0.417vw] border px-[0.833vw] text-left transition-colors ${
                      selected
                        ? "border-[#aac0ff] bg-[#eaf0ff]"
                        : "border-[#d8d8dc] bg-[#eeeef0] hover:border-[#aac0ff]"
                    }`}
                  >
                    <span className="relative z-10 text-[0.833vw] font-medium leading-[1.25vw] text-text-primary">
                      {season.name}
                    </span>
                    {asset && (
                      <span
                        className="pointer-events-none absolute -right-[0.313vw] top-1/2 flex h-[3.75vw] w-[3.75vw] -translate-y-1/2 items-center justify-center"
                        aria-hidden="true"
                      >
                        <Image
                          src={asset}
                          alt=""
                          width={52}
                          height={72}
                          sizes="52px"
                          className="h-[3.75vw] w-[2.708vw] object-contain"
                        />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {step === 4 && (
          <section aria-labelledby="budget-heading">
            <h2
              id="budget-heading"
              className="text-center text-[1.25vw] font-medium leading-[1.875vw] text-text-primary"
            >
              How much do you usually spend on an outfit?
            </h2>
            <div className="mx-auto mt-[1.667vw] grid max-w-[33.438vw] grid-cols-4 gap-[0.833vw]">
              {BUDGET_OPTIONS.map((budget) => {
                const selected = budget.id === budgetId;
                return (
                  <button
                    key={budget.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setBudgetId(budget.id)}
                    className={`relative flex h-[5.208vw] items-center overflow-hidden rounded-[0.417vw] border px-[0.833vw] text-left transition-colors ${
                      selected
                        ? "border-[#aac0ff] bg-[#eaf0ff]"
                        : "border-[#d8d8dc] bg-[#eeeef0] hover:border-[#aac0ff]"
                    }`}
                  >
                    <span className="relative z-10 flex min-w-0 flex-col pr-[2.604vw]">
                      <span className="whitespace-nowrap text-[0.833vw] font-medium leading-[1.25vw] text-text-primary">
                        {budget.label}
                      </span>
                      <span className="whitespace-nowrap text-[0.625vw] font-normal leading-[0.938vw] text-[#65636d]">
                        {budget.range}
                      </span>
                    </span>
                    <span
                      className="pointer-events-none absolute -right-[0.313vw] top-1/2 flex h-[3.75vw] w-[3.75vw] -translate-y-1/2 items-center justify-center"
                      aria-hidden="true"
                    >
                      <Image
                        src={budget.asset}
                        alt=""
                        width={62}
                        height={72}
                        sizes="62px"
                        className="h-[3.75vw] w-[3.229vw] object-contain"
                      />
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {step === 5 && (
          <section
            aria-labelledby="model-heading"
            className="flex h-full min-h-0 flex-col"
          >
            <h2
              id="model-heading"
              className="text-center text-[1.25vw] font-medium leading-[1.875vw] text-text-primary"
            >
              Choose model to generate outfits
            </h2>

            <div
              className={`mx-auto mt-[0.625vw] w-full ${
                sizingPhotoFocused ? "max-w-[36vw]" : "max-w-[29vw]"
              }`}
            >
              {!sizingPhotoFocused && (
                <div
                  role="tablist"
                  aria-label="Model source"
                  className="relative z-10 flex w-fit items-end"
                >
                <button
                  type="button"
                  role="tab"
                  aria-selected={modelMode === "choose-model"}
                  onClick={() => setModelMode("choose-model")}
                  className={`min-w-[4.167vw] rounded-t-[0.313vw] border px-[0.625vw] py-[0.417vw] text-[0.625vw] leading-[1.042vw] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/35 ${
                    modelMode === "choose-model"
                      ? "border-x-border-light border-b-white border-t-[#4f6eff] bg-white text-[#3154f5]"
                      : "border-border-light bg-[#eeeeef] text-text-muted hover:bg-[#f5f5f6]"
                  }`}
                >
                  Choose Model
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={modelMode === "upload-photo"}
                  onClick={() => setModelMode("upload-photo")}
                  className={`min-w-[4.167vw] rounded-t-[0.313vw] border px-[0.625vw] py-[0.417vw] text-[0.625vw] leading-[1.042vw] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue/35 ${
                    modelMode === "upload-photo"
                      ? "border-x-border-light border-b-white border-t-[#4f6eff] bg-white text-[#3154f5]"
                      : "border-border-light bg-[#eeeeef] text-text-muted hover:bg-[#f5f5f6]"
                  }`}
                >
                  Upload Photo
                </button>
                </div>
              )}

              {modelMode === "choose-model" ? (
                <div
                  role="tabpanel"
                  className="-mt-px rounded-b-[0.833vw] rounded-tr-[0.833vw] border border-border-light bg-white p-[0.625vw]"
                >
                <p className="text-[0.625vw] leading-[1.042vw] text-text-primary">
                  No photo needed. Choose from our models and see how outfits
                  look instantly:
                </p>
                <div className="mt-[0.625vw] grid grid-cols-4 gap-[0.417vw]">
                  {models.map((model) => {
                    const selected = selectedModelId === model.id;
                    const preview =
                      FIGMA_MODEL_ASSETS[model.id] ?? model.preview;
                    return (
                      <button
                        key={model.id}
                        type="button"
                        aria-label={`Choose ${model.name}`}
                        aria-pressed={selected}
                        onClick={() => setSelectedModelId(model.id)}
                        className={`relative aspect-[4/5] overflow-hidden rounded-[0.417vw] border-[0.104vw] bg-white transition-colors ${
                          selected
                            ? "border-[#2154ef]"
                            : "border-transparent hover:border-[#aac0ff]"
                        }`}
                      >
                        <Image
                          src={preview}
                          alt={model.name}
                          fill
                          sizes="9vw"
                          className="object-cover object-center"
                        />
                        {selected && (
                          <span className="absolute right-[0.417vw] top-[0.417vw]">
                            <OptionCheck selected />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                </div>
              ) : (
                <div
                  role="tabpanel"
                  className="-mt-px rounded-b-[0.833vw] rounded-tr-[0.833vw] border border-border-light bg-surface-light p-[0.833vw]"
                >
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
            </div>
          </section>
        )}
      </div>

      {(error || generationAssetError) && (
        <div
          role="alert"
          className="mb-[0.625vw] shrink-0 rounded-[0.417vw] border border-red-200 bg-red-50 px-[0.833vw] py-[0.521vw] text-[0.625vw] leading-[1.042vw] text-red-700"
        >
          {error ?? generationAssetError}
        </div>
      )}

      <div className="flex shrink-0 items-center justify-between border-t border-border-light pt-[1.042vw]">
        <Button
          type="button"
          variant="outline-neutral"
          size="default"
          disabled={isSubmitting}
          onClick={handlePrevious}
          className="min-w-[6.25vw]"
        >
          <ArrowLeftIcon
            size={16}
            color="currentColor"
            className="!h-[0.833vw] !w-[0.833vw]"
          />
          Previous
        </Button>

        {step < 5 ? (
          <Button
            type="button"
            size="default"
            disabled={!canContinue || isSubmitting}
            onClick={handleNext}
            className="min-w-[6.25vw] bg-[#2154ef] hover:bg-[#1746d3]"
          >
            Next
            <ArrowRightIcon
              size={16}
              color="white"
              className="!h-[0.833vw] !w-[0.833vw]"
            />
          </Button>
        ) : (
          <Button
            type="button"
            size="default"
            disabled={!canContinue || isSubmitting || isPreparingModel}
            onClick={handleGenerate}
            className="min-w-[9.375vw] bg-[#2154ef] hover:bg-[#1746d3]"
          >
            <GenerateIcon
              size={16}
              color="white"
              className="!h-[0.833vw] !w-[0.833vw]"
            />
            {isSubmitting || isPreparingModel
              ? "Generating…"
              : "Generate Outfits"}
          </Button>
        )}
      </div>
    </div>
  );
}

export type { WizardGenerationRequest };
