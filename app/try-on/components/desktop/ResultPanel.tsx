"use client";

import {
  PersonAddIcon,
  CameraIcon,
  WidgetsIcon,
  GenerateIcon,
  RefreshIcon,
} from "@/app/shared/components/icons";
import { Button } from "@/app/shared/components/ui";
import { GenerationOverlay } from "@/app/try-on/components/GenerationOverlay";
import type {
  Step,
  TryOnProductDetail,
  TryOnStatus,
} from "@/app/try-on/types";

interface ResultPanelProps {
  hasModel: boolean;
  activeStep: Step;
  modelImageUrl?: string;
  selectedItemCount: number;
  selectedProducts: TryOnProductDetail[];
  tryOnStatus: TryOnStatus;
  resultImageUrl: string | null;
  tryOnError: string | null;
  tokenCost: number;
  onUploadClick: () => void;
  onChooseModelClick: () => void;
  onGenerate: () => void;
  onRefresh: () => void;
}

export function ResultPanel({
  hasModel,
  activeStep,
  modelImageUrl,
  selectedItemCount,
  selectedProducts,
  tryOnStatus,
  resultImageUrl,
  tryOnError,
  tokenCost,
  onUploadClick,
  onChooseModelClick,
  onGenerate,
  onRefresh,
}: ResultPanelProps) {
  const isTryOnStep = activeStep === "try-on";
  const isGenerating = tryOnStatus === "generating";
  const hasResult = tryOnStatus === "completed" && !!resultImageUrl;
  const hasError = tryOnStatus === "error";
  const showGenerateBar =
    isTryOnStep && hasModel && selectedItemCount > 0 && !isGenerating;

  const displayImageUrl = hasResult ? resultImageUrl : modelImageUrl;

  return (
    <div
      className={`relative flex flex-1 overflow-hidden rounded-[1.042vw] border border-border-light ${hasModel && displayImageUrl ? "bg-transparent" : "bg-surface-result"}`}
    >
      {hasModel && displayImageUrl ? (
        <div className="relative flex h-full w-full items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={displayImageUrl}
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-cover blur-[100px]"
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={displayImageUrl}
            alt={hasResult ? "Try-on result" : "Selected model"}
            className="relative z-10 h-full w-auto"
          />

          {isGenerating && <GenerationOverlay garments={selectedProducts} />}
        </div>
      ) : (
        <div className="-mt-[0.365vw] flex h-[calc(100%+0.365vw)] w-full items-center justify-center bg-white">
          {!hasModel && (
            <div className="flex max-w-[10.417vw] flex-col items-center gap-[1.25vw]">
              <div className="rounded-[1.042vw] border-2 border-dashed border-border-separator p-[0.625vw]">
                <PersonAddIcon size={120} color="var(--border-separator)" className="!w-[6.25vw] !h-[6.25vw]" />
              </div>
              <div className="flex flex-col items-center gap-[0.208vw] self-stretch">
                <span className="text-[0.729vw] leading-[1.57] text-text-body">
                  No model selected yet
                </span>
                <span className="text-center text-[0.521vw] leading-[1.6] text-text-hint">
                  Choose one of our ready-made models or upload your own photo
                  to start the try-on experience.
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {hasError && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/30 backdrop-blur-sm">
          <div className="flex max-w-[13.542vw] flex-col items-center gap-[0.625vw] rounded-[0.833vw] bg-white p-[1.25vw] shadow-lg">
            <span className="text-[0.729vw] font-medium text-text-error">
              {tryOnError || "Something went wrong"}
            </span>
            <Button variant="primary" size="sm" onClick={onRefresh}>
              Try Again
            </Button>
          </div>
        </div>
      )}

      {!hasModel && !showGenerateBar && !isGenerating && (
        <div className="absolute bottom-[0.833vw] left-1/2 z-20 -translate-x-1/2">
          <div
            className="pointer-events-none absolute overflow-hidden rounded-[9999px]"
            style={{ inset: "-1.302vw" }}
          >
            <div
              className="absolute rounded-[1.771vw]"
              style={{
                left: "1.354vw",
                right: "1.354vw",
                top: "1.615vw",
                bottom: "1.094vw",
                background: "rgba(0, 0, 0, 0.08)",
                backgroundBlendMode: "hard-light",
                filter: "blur(20px)",
              }}
            />
          </div>
          <div className="relative overflow-hidden rounded-[1.771vw]">
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                backdropFilter: "blur(40px)",
                WebkitBackdropFilter: "blur(40px)",
              }}
            />
            <div
              className="pointer-events-none absolute inset-0"
              style={{ background: "rgba(38, 38, 38, 0.15)" }}
            />
            <div
              className="pointer-events-none absolute inset-0"
              style={{ background: "rgba(245, 245, 245, 0.6)" }}
            />
            <div className="relative flex items-center gap-[0.417vw] p-[0.833vw]">
              <Button onClick={onUploadClick}>
                <CameraIcon size={20} color="white" className="!w-[1.042vw] !h-[1.042vw]" />
                Upload
              </Button>
              <Button onClick={onChooseModelClick}>
                <WidgetsIcon size={20} color="white" className="!w-[1.042vw] !h-[1.042vw]" />
                Choose Model
              </Button>
            </div>
          </div>
        </div>
      )}

      {hasModel && !isGenerating && (
        <Button
          variant="icon"
          onClick={onRefresh}
          className="absolute left-[1.042vw] top-[1.042vw] z-20 h-[3.75vw] w-[3.75vw]"
          style={{
            background: "rgba(245, 245, 245, 0.6)",
            backdropFilter: "blur(40px)",
            WebkitBackdropFilter: "blur(40px)",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.08)",
          }}
        >
          <div className="flex h-[1.979vw] w-[2.083vw] items-center justify-center rounded-full bg-brand-blue">
            <RefreshIcon size={16} color="white" className="!w-[0.833vw] !h-[0.833vw]" />
          </div>
        </Button>
      )}

      {showGenerateBar && (
        <div className="absolute bottom-[0.521vw] left-[0.521vw] z-20 rounded-[5.208vw] bg-brand-blue-pale p-[0.625vw]">
          <Button
            variant="primary"
            size="sm"
            onClick={onGenerate}
          >
            <GenerateIcon size={16} color="white" className="!w-[0.833vw] !h-[0.833vw]" />
            <span className="text-[0.729vw] font-normal leading-[1.57] text-white">
              Generate
            </span>
            <span className="flex h-[1.25vw] items-center gap-[0.208vw] rounded-[0.573vw] bg-warning-bg px-[0.208vw] py-[0.104vw]">
              <span className="text-[0.625vw] font-normal leading-[1.667] text-warning-text">
                {tokenCost}
              </span>
            </span>
          </Button>
        </div>
      )}
    </div>
  );
}
