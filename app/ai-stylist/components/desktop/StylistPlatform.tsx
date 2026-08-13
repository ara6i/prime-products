"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/app/shared/components/ui";
import {
  CloseIcon,
  RotateLeftIcon,
  RotateRightIcon,
  SettingsIcon,
} from "@/app/shared/components/icons";
import { useTurntableRotation } from "@/app/ai-stylist/hooks/useTurntableRotation";
import {
  INITIAL_STYLIST_LOOKS,
  MODEL_PLATFORM_IMAGES,
} from "@/app/ai-stylist/data";
import type { OutfitSuggestion } from "@/app/ai-stylist/types";
import { InitialLookProductRail } from "./InitialLookProductRail";
import { ModelCarousel } from "./ModelCarousel";
import { StylistDisc } from "./StylistDisc";

const PLATFORM_SLOT_COUNT = 5;
const TUNER_GAP = 12;
const TUNER_VIEWPORT_PADDING = 12;
const TUNER_WIDTH = 288;

interface PlatformTuning {
  discBottom: number;
  discPerspective: number;
  discScale: number;
  discTilt: number;
  centerBrightness: number;
  modelOffsetX: number;
  modelOffsetY: number;
  modelScale: number;
  modelSpacing: number;
}

interface TunerPosition {
  left: number;
  maxHeight: number;
  top: number;
  width: number;
}

const DEFAULT_TUNING: PlatformTuning = {
  discBottom: 0.5,
  discPerspective: 98,
  discScale: 100,
  discTilt: -11,
  centerBrightness: 103,
  modelOffsetX: 1,
  modelOffsetY: -4,
  modelScale: 90,
  modelSpacing: 100,
};

const INITIAL_MODELS_TUNING: PlatformTuning = {
  discBottom: -0.5,
  discPerspective: 93,
  discScale: 103,
  discTilt: -12,
  centerBrightness: 100,
  modelOffsetX: 1,
  modelOffsetY: -4,
  modelScale: 117,
  modelSpacing: 101,
};

const TUNING_CONTROLS: {
  key: keyof PlatformTuning;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
}[] = [
  {
    key: "modelSpacing",
    label: "Model spacing",
    min: 55,
    max: 145,
    step: 1,
    unit: "%",
  },
  {
    key: "modelScale",
    label: "Model size",
    min: 75,
    max: 130,
    step: 1,
    unit: "%",
  },
  {
    key: "modelOffsetX",
    label: "Models left / right",
    min: -15,
    max: 15,
    step: 0.5,
    unit: "%",
  },
  {
    key: "modelOffsetY",
    label: "Models up / down",
    min: -10,
    max: 10,
    step: 0.5,
    unit: "%",
  },
  {
    key: "discScale",
    label: "Disc size",
    min: 80,
    max: 120,
    step: 1,
    unit: "%",
  },
  {
    key: "discBottom",
    label: "Disc up / down",
    min: -10,
    max: 10,
    step: 0.5,
    unit: "%",
  },
  {
    key: "discTilt",
    label: "Disc front / back",
    min: -18,
    max: 18,
    step: 0.5,
    unit: "°",
  },
  {
    key: "discPerspective",
    label: "Disc perspective",
    min: 80,
    max: 120,
    step: 1,
    unit: "%",
  },
  {
    key: "centerBrightness",
    label: "Center model brightness",
    min: 65,
    max: 145,
    step: 1,
    unit: "%",
  },
];

interface StylistPlatformProps {
  outfits: OutfitSuggestion[];
  showModels?: boolean;
  modelImageUrl?: string | null;
  slotImages?: string[];
}

export function StylistPlatform({
  outfits,
  showModels = true,
  modelImageUrl = null,
  slotImages,
}: StylistPlatformProps) {
  const usesInitialModelPreset =
    showModels && !modelImageUrl && !slotImages && outfits.length === 0;
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [tuningOpen, setTuningOpen] = useState(false);
  const [tuning, setTuning] = useState<PlatformTuning>(() =>
    usesInitialModelPreset ? INITIAL_MODELS_TUNING : DEFAULT_TUNING,
  );
  const platformRef = useRef<HTMLDivElement>(null);
  const tunerButtonRef = useRef<HTMLButtonElement>(null);
  const [tunerPosition, setTunerPosition] = useState<TunerPosition>({
    left: TUNER_VIEWPORT_PADDING,
    maxHeight: 560,
    top: TUNER_VIEWPORT_PADDING,
    width: TUNER_WIDTH,
  });

  const generatedImages = useMemo(
    () =>
      Array.from({ length: PLATFORM_SLOT_COUNT }, (_, index) =>
        slotImages
          ? slotImages[index] ?? ""
          : outfits[index]?.transparentImageUrl ?? "",
      ),
    [outfits, slotImages],
  );

  const hasGeneratedImages = generatedImages.some(Boolean);

  const displayImages = useMemo(() => {
    if (slotImages) return generatedImages;
    if (hasGeneratedImages) return generatedImages;
    if (modelImageUrl) {
      return [modelImageUrl, "", "", "", ""];
    }
    return showModels
      ? Array.from(
          { length: PLATFORM_SLOT_COUNT },
          (_, index) => MODEL_PLATFORM_IMAGES[index] || "",
        )
      : generatedImages;
  }, [
    generatedImages,
    hasGeneratedImages,
    modelImageUrl,
    showModels,
    slotImages,
  ]);

  const readyImageCount = useMemo(
    () => displayImages.filter(Boolean).length,
    [displayImages],
  );

  const normalizeAvailableIndex = useCallback(
    (candidate: number) => {
      if (readyImageCount === 0 || displayImages[candidate]) {
        return candidate;
      }

      for (let distance = 1; distance < PLATFORM_SLOT_COUNT; distance += 1) {
        const next = (candidate + distance) % PLATFORM_SLOT_COUNT;
        const previous =
          (candidate - distance + PLATFORM_SLOT_COUNT) % PLATFORM_SLOT_COUNT;
        if (displayImages[next]) return next;
        if (displayImages[previous]) return previous;
      }

      return candidate;
    },
    [displayImages, readyImageCount],
  );

  const handleRotationIndexChange = useCallback(
    (index: number) => setSelectedIndex(normalizeAvailableIndex(index)),
    [normalizeAvailableIndex],
  );

  const activeIndex = normalizeAvailableIndex(selectedIndex);

  const { rotationRef, isDragging, pointerHandlers } = useTurntableRotation({
    modelCount: PLATFORM_SLOT_COUNT,
    selectedIndex: activeIndex,
    onIndexChange: handleRotationIndexChange,
  });

  const navigate = useCallback((direction: "prev" | "next") => {
    setSelectedIndex((current) => {
      const activeCurrent = normalizeAvailableIndex(current);
      const step = direction === "prev" ? -1 : 1;

      if (readyImageCount === 0) {
        return (activeCurrent + step + PLATFORM_SLOT_COUNT) % PLATFORM_SLOT_COUNT;
      }

      for (let distance = 1; distance <= PLATFORM_SLOT_COUNT; distance += 1) {
        const candidate =
          (activeCurrent + step * distance + PLATFORM_SLOT_COUNT) %
          PLATFORM_SLOT_COUNT;
        if (displayImages[candidate]) return candidate;
      }

      return activeCurrent;
    });
  }, [normalizeAvailableIndex, displayImages, readyImageCount]);

  const orderedReadyIndexes = displayImages
    .map((image, index) => (image ? index : -1))
    .filter((index) => index >= 0);
  const displayedIndex = Math.max(1, orderedReadyIndexes.indexOf(activeIndex) + 1);
  const displayedCount = Math.max(1, readyImageCount);
  const baseModelSize = modelImageUrl ? 60 : 53;
  const activeInitialLook = INITIAL_STYLIST_LOOKS[activeIndex];

  const updateTuning = useCallback(
    (key: keyof PlatformTuning, value: number) => {
      setTuning((current) => ({ ...current, [key]: value }));
    },
    [],
  );

  const updateTunerPosition = useCallback(() => {
    const button = tunerButtonRef.current;
    const platform = platformRef.current;
    if (!button || !platform) return;

    const buttonRect = button.getBoundingClientRect();
    const platformRect = platform.getBoundingClientRect();
    const width = Math.min(
      TUNER_WIDTH,
      window.innerWidth - TUNER_VIEWPORT_PADDING * 2,
    );
    const preferredLeft = platformRect.right + TUNER_GAP;
    const left =
      preferredLeft + width <= window.innerWidth - TUNER_VIEWPORT_PADDING
        ? preferredLeft
        : Math.max(
            TUNER_VIEWPORT_PADDING,
            buttonRect.left - width - TUNER_GAP,
          );
    const top = Math.max(TUNER_VIEWPORT_PADDING, buttonRect.top);

    setTunerPosition({
      left,
      maxHeight: Math.max(
        240,
        window.innerHeight - top - TUNER_VIEWPORT_PADDING,
      ),
      top,
      width,
    });
  }, []);

  useEffect(() => {
    if (!tuningOpen) return;

    updateTunerPosition();
    window.addEventListener("resize", updateTunerPosition);
    window.addEventListener("scroll", updateTunerPosition, true);

    return () => {
      window.removeEventListener("resize", updateTunerPosition);
      window.removeEventListener("scroll", updateTunerPosition, true);
    };
  }, [tuningOpen, updateTunerPosition]);

  const toggleTuner = useCallback(() => {
    if (!tuningOpen) updateTunerPosition();
    setTuningOpen((open) => !open);
  }, [tuningOpen, updateTunerPosition]);

  return (
    <div
      ref={platformRef}
      className={`${usesInitialModelPreset ? "w-[42.708vw]" : "w-[29.271vw]"} relative isolate flex shrink-0 overflow-hidden rounded-[1.042vw] border border-black/[0.07] bg-white`}
    >
      {usesInitialModelPreset && activeInitialLook ? (
        <InitialLookProductRail look={activeInitialLook} />
      ) : null}

      <div
        className="relative min-w-0 flex-1 overflow-hidden bg-[#d9d7dd]"
        style={{
          backgroundImage:
            "url('/images/ai-stylist/Gemini_Generated_Image_fjyzt7fjyzt7fjyz.png')",
          backgroundPosition: "center top",
          backgroundRepeat: "no-repeat",
          backgroundSize: "100% 114%",
        }}
      >
        <StylistDisc
          rotationRef={rotationRef}
          bottomPercent={22.8 + tuning.discBottom}
          perspective={tuning.discPerspective}
          scale={tuning.discScale}
          tilt={tuning.discTilt}
        />

        <div className="pointer-events-none absolute inset-0 z-[4]">
          <ModelCarousel
            images={displayImages}
            rotationRef={rotationRef}
            selectedIndex={activeIndex}
            modelBottom={35 + tuning.modelOffsetY}
            modelSpread={30 * (tuning.modelSpacing / 100)}
            modelSize={baseModelSize * (tuning.modelScale / 100)}
            modelDepth={4.5}
            modelOffsetX={tuning.modelOffsetX}
            activeBrightness={tuning.centerBrightness / 100}
          />
        </div>

        <div
          className="absolute inset-0 z-10"
          aria-label="Rotate outfit platform"
          style={{
            cursor: isDragging ? "grabbing" : "grab",
            touchAction: "pan-y",
          }}
          onPointerDown={pointerHandlers.onPointerDown}
          onPointerMove={pointerHandlers.onPointerMove}
          onPointerUp={pointerHandlers.onPointerUp}
          onPointerCancel={pointerHandlers.onPointerUp}
        />

        <div
          className="absolute right-3 top-3 z-40"
          onPointerDown={(event) => event.stopPropagation()}
        >
          <button
            ref={tunerButtonRef}
            type="button"
            aria-controls="stylist-platform-tuner"
            aria-expanded={tuningOpen}
            aria-label="Adjust disc layout"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/70 bg-white/90 text-[#343238] shadow-[0_4px_16px_rgba(25,25,30,0.18)] backdrop-blur-md transition hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2"
            onClick={toggleTuner}
          >
            {tuningOpen ? (
              <CloseIcon size={16} className="h-4 w-4" color="currentColor" />
            ) : (
              <SettingsIcon size={17} className="h-[17px] w-[17px]" color="currentColor" />
            )}
          </button>

        </div>

      {tuningOpen &&
        createPortal(
          <div
            id="stylist-platform-tuner"
            role="dialog"
            aria-label="Adjust disc and model layout"
            className="fixed z-[90] overflow-y-auto rounded-2xl border border-white/80 bg-white/95 shadow-[0_18px_48px_rgba(28,25,38,0.24)] backdrop-blur-xl"
            style={tunerPosition}
            onPointerDown={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-[#eceaf0] px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-[#27242d]">
                  Adjust platform
                </p>
                <p className="mt-0.5 text-[11px] leading-4 text-[#77727f]">
                  Changes appear on the disc immediately.
                </p>
              </div>
              <button
                type="button"
                className="rounded-md px-2 py-1 text-[11px] font-medium text-brand-blue transition hover:bg-brand-blue/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
                onClick={() => {
                  setTuning(
                    usesInitialModelPreset
                      ? INITIAL_MODELS_TUNING
                      : DEFAULT_TUNING,
                  );
                  setSelectedIndex(0);
                }}
              >
                Reset
              </button>
            </div>

            <div className="border-b border-[#eceaf0] px-4 py-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-medium text-[#514c58]">
                  Center outfit
                </span>
                <span className="text-[11px] text-[#77727f]">
                  Select the front model
                </span>
              </div>
              <div
                role="group"
                aria-label="Select center outfit"
                className="grid grid-cols-5 gap-1.5"
              >
                {displayImages.map((image, index) => (
                  <button
                    key={index}
                    type="button"
                    aria-label={`Center outfit ${index + 1}`}
                    aria-pressed={activeIndex === index}
                    disabled={!image}
                    className="flex h-7 items-center justify-center rounded-lg border border-[#e4e1e8] text-[11px] font-semibold text-[#625d69] transition hover:border-brand-blue/50 hover:bg-brand-blue/5 disabled:cursor-not-allowed disabled:opacity-30 aria-pressed:border-brand-blue aria-pressed:bg-brand-blue aria-pressed:text-white"
                    onClick={() => setSelectedIndex(index)}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3 px-4 py-3.5">
              {TUNING_CONTROLS.map(
                ({ key, label, min, max, step, unit }) => (
                  <label key={key} className="block">
                    <span className="mb-1.5 flex items-center justify-between gap-3">
                      <span className="text-[11px] font-medium text-[#514c58]">
                        {label}
                      </span>
                      <output
                        htmlFor={`platform-tuning-${key}`}
                        className="min-w-10 text-right text-[11px] tabular-nums text-[#77727f]"
                      >
                        {tuning[key] > 0 &&
                        (key === "modelOffsetX" ||
                          key === "modelOffsetY" ||
                          key === "discBottom" ||
                          key === "discTilt")
                          ? "+"
                          : ""}
                        {tuning[key]}
                        {unit}
                      </output>
                    </span>
                    <input
                      id={`platform-tuning-${key}`}
                      type="range"
                      min={min}
                      max={max}
                      step={step}
                      value={tuning[key]}
                      aria-label={label}
                      className="block h-1.5 w-full cursor-pointer accent-[#5b32ff]"
                      onChange={(event) =>
                        updateTuning(key, Number(event.target.value))
                      }
                    />
                  </label>
                ),
              )}
            </div>
          </div>,
          document.body,
        )}

        <div className="absolute bottom-[16.5%] left-1/2 z-30 flex -translate-x-1/2 items-center gap-[0.417vw]">
          <Button
            type="button"
            variant="icon"
            size="sm"
            aria-label="Previous outfit"
            className="flex h-[1.875vw] w-[1.875vw] items-center justify-center rounded-full bg-brand-blue hover:bg-brand-blue hover:brightness-95 active:brightness-90"
            style={{ boxShadow: "2px 2px 8px rgba(0,0,0,0.25)" }}
            onClick={() => navigate("prev")}
          >
            <RotateLeftIcon
              size={16}
              className="!h-[0.833vw] !w-[0.833vw]"
              color="white"
            />
          </Button>
          <span className="text-[0.729vw] font-bold leading-[1.146vw] text-brand-blue">
            {displayedIndex}
          </span>
          <span className="text-[0.729vw] font-normal leading-[1.146vw] text-text-muted">
            of {displayedCount}
          </span>
          <Button
            type="button"
            variant="icon"
            size="sm"
            aria-label="Next outfit"
            className="flex h-[1.875vw] w-[1.875vw] items-center justify-center rounded-full bg-brand-blue hover:bg-brand-blue hover:brightness-95 active:brightness-90"
            style={{ boxShadow: "2px 2px 8px rgba(0,0,0,0.25)" }}
            onClick={() => navigate("next")}
          >
            <RotateRightIcon
              size={16}
              className="!h-[0.833vw] !w-[0.833vw]"
              color="white"
            />
          </Button>
        </div>
      </div>
    </div>
  );
}
