"use client";

import { Check, CircleAlert, LoaderCircle, Sparkles } from "lucide-react";
import type { StylistPreparationStatus } from "@/app/ai-stylist/hooks/useOutfitIntelligence";

interface StylistGenerationViewProps {
  modelStatus: StylistPreparationStatus;
  outfitsStatus: StylistPreparationStatus;
  modelError?: string | null;
  error?: string | null;
  onTryAgain: () => void;
}

const STAGES = [
  {
    id: "processing-model",
    title: "Preparing your model",
    detail: "Removing the photo background and fitting the cutout to the disk.",
  },
  {
    id: "building-outfits",
    title: "Building meaningful outfits",
    detail: "Retrieving qualified garments, enforcing outfit rules, and ranking color harmony.",
  },
] as const;

export function StylistGenerationView({
  modelStatus,
  outfitsStatus,
  modelError,
  error,
  onTryAgain,
}: StylistGenerationViewProps) {
  if (error) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center p-8">
        <div className="max-w-md rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
          <h2 className="text-base font-semibold text-red-800">
            The stylist could not finish
          </h2>
          <p className="mt-2 text-sm leading-5 text-red-700">{error}</p>
          <button
            type="button"
            onClick={onTryAgain}
            className="mt-4 rounded-full bg-[#7258fa] px-5 py-2 text-sm font-semibold text-white hover:bg-[#6035f2]"
          >
            Edit answers and try again
          </button>
        </div>
      </div>
    );
  }

  const stageStatuses: StylistPreparationStatus[] = [
    modelStatus,
    outfitsStatus,
  ];
  return (
    <div
      className="flex min-h-0 flex-1 items-center justify-center p-8"
      data-testid="stylist-generation"
      aria-live="polite"
    >
      <div className="w-full max-w-lg">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-[#eeeaff]">
          <Sparkles className="h-7 w-7 text-[#7258fa]" />
        </div>
        <h2 className="mt-5 text-center text-xl font-semibold text-[#24212c]">
          Your stylist is working
        </h2>
        <p className="mx-auto mt-2 max-w-sm text-center text-sm leading-5 text-[#77737f]">
          Your model and outfits are being prepared together.
        </p>

        <div className="mt-7 space-y-3">
          {STAGES.map((stage, index) => {
            const stageStatus = stageStatuses[index];
            const complete = stageStatus === "ready";
            const active = stageStatus === "working";
            const failed = stageStatus === "failed";
            const detail =
              index === 0 && failed && modelError
                ? `${modelError} Outfit generation is continuing.`
                : stage.detail;
            return (
              <div
                key={stage.id}
                className={`flex items-start gap-3 rounded-xl border p-3.5 ${
                  active
                    ? "border-[#bfb3ff] bg-[#f4f1ff]"
                    : complete
                      ? "border-[#dceee2] bg-[#f3fbf6]"
                      : failed
                        ? "border-[#f2d6d2] bg-[#fff7f5]"
                      : "border-[#e4e2e8] bg-white"
                }`}
              >
                <span
                  className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                    active
                      ? "bg-[#7258fa] text-white"
                      : complete
                        ? "bg-[#36a663] text-white"
                        : failed
                          ? "bg-[#d96355] text-white"
                        : "bg-[#efedf2] text-[#99959f]"
                  }`}
                >
                  {active ? (
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                  ) : complete ? (
                    <Check className="h-4 w-4" />
                  ) : failed ? (
                    <CircleAlert className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </span>
                <div>
                  <h3 className="text-sm font-semibold text-[#24212c]">{stage.title}</h3>
                  <p className="mt-0.5 text-xs leading-4 text-[#77737f]">{detail}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
