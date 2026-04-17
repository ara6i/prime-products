"use client";

import { useCallback, useRef, useEffect, useState } from "react";
import Image from "next/image";
import { PersonAddIcon, CameraIcon } from "@/app/shared/components/icons";
import { Button } from "@/app/shared/components/ui";
import type { LandingModel, TryOnPhase } from "@/app/landing/types/try-on";

interface ModelUploadPanelProps {
  models: LandingModel[];
  selectedModelId: string | null;
  uploadedImage: string | null;
  phase: TryOnPhase;
  resultImageUrl: string | null;
  onModelSelect: (modelId: string) => void;
  onImageUpload: (file: File) => void;
}

export function ModelUploadPanel({
  models,
  selectedModelId,
  uploadedImage,
  phase,
  resultImageUrl,
  onModelSelect,
  onImageUpload,
}: ModelUploadPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [resultLoaded, setResultLoaded] = useState(false);
  const [resultVisible, setResultVisible] = useState(false);

  useEffect(() => {
    if (phase === "complete" && resultImageUrl) {
      setResultLoaded(false);
      setResultVisible(false);
    } else {
      setResultLoaded(false);
      setResultVisible(false);
    }
  }, [phase, resultImageUrl]);

  const handleResultLoad = useCallback(() => {
    setResultLoaded(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setResultVisible(true));
    });
  }, []);

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onImageUpload(file);
    },
    [onImageUpload],
  );

  const isGenerating = phase === "generating";
  const isComplete = phase === "complete" && !!resultImageUrl;
  const isAlreadyUsed = phase === "already_used";
  const isFailed = phase === "failed";

  const modelSrc =
    uploadedImage ?? models.find((m) => m.id === selectedModelId)?.imageUrl ?? null;

  return (
    <div className="flex w-[26.042vw] shrink-0 flex-col items-stretch gap-[0.625vw] self-stretch">
      {/* Main preview area */}
      <div className="relative min-h-[21.875vw] flex-1 overflow-hidden rounded-[1.042vw] border-[0.5px] border-input-border bg-surface-muted">
        <div className="flex h-full flex-col items-center justify-center gap-[1.25vw] px-[1.667vw]">
          {modelSrc ? (
            <>
              <div className="relative h-full w-full">
                <Image
                  src={modelSrc}
                  alt="Selected model"
                  fill
                  className="object-contain object-center"
                  sizes="26.042vw"
                  unoptimized={modelSrc.startsWith("blob:")}
                />
              </div>

              {isComplete && resultImageUrl && (
                <div
                  className={`absolute inset-0 bg-surface-muted transition-opacity duration-700 ease-out ${
                    resultVisible ? "opacity-100" : "opacity-0"
                  }`}
                >
                  <Image
                    src={resultImageUrl}
                    alt="Try-on result"
                    fill
                    className="object-contain object-center"
                    sizes="26.042vw"
                    unoptimized
                    onLoad={handleResultLoad}
                  />
                  <div
                    className={`absolute inset-0 rounded-[1.042vw] ring-2 ring-inset ring-brand-blue/40 transition-opacity duration-700 ${
                      resultVisible ? "opacity-100" : "opacity-0"
                    }`}
                  />
                </div>
              )}
            </>
          ) : (
            <>
              <div className="flex items-center gap-[0.365vw] rounded-[0.729vw] border-[1.4px] border-dashed border-input-border p-[0.417vw]">
                <PersonAddIcon size={83} className="!w-[4.323vw] !h-[4.323vw]" color="var(--border-separator)" />
              </div>
              <div className="flex flex-col items-center gap-[0.833vw]">
                <div className="flex flex-row items-center justify-center gap-[0.417vw] w-[15.625vw]">
                  <span className="text-[0.833vw] leading-[1.625] text-text-body whitespace-nowrap">
                    Choose a model or
                  </span>
                  <Button variant="primary" size="sm" className="h-[1.979vw] px-[0.625vw] text-[0.729vw] rounded-[52.083vw]" onClick={handleUploadClick}>
                    <CameraIcon size={16} className="!w-[0.833vw] !h-[0.833vw]" color="white" />
                    Upload Image
                  </Button>
                </div>
                <div className="rounded-[0.417vw] bg-white px-[0.625vw] py-[0.417vw] max-w-[19.74vw]">
                  <p className="text-[0.729vw] leading-[1.57] text-text-subtitle text-center">
                    Your photo is deleted automatically after your session.{"\n"}We do not use your
                    images for AI training.
                  </p>
                </div>
                <Button variant="link" size="sm" className="text-[0.729vw]">
                  Privacy Policy
                </Button>
              </div>
            </>
          )}
        </div>

        {/* Generating overlay */}
        {isGenerating && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-[0.833vw] rounded-[1.042vw] bg-surface-muted/85 backdrop-blur-sm">
            <div className="relative flex h-[3.333vw] w-[3.333vw] items-center justify-center">
              <div className="absolute inset-0 animate-ping rounded-full bg-brand-blue/20" />
              <div className="absolute inset-[0.417vw] animate-pulse rounded-full bg-brand-blue/30" />
              <div className="h-[1.25vw] w-[1.25vw] rounded-full bg-brand-blue" />
            </div>
            <span className="animate-pulse text-[0.729vw] font-medium text-text-primary">
              Styling your look…
            </span>
            <div className="flex gap-[0.208vw]">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-[0.313vw] w-[0.313vw] animate-bounce rounded-full bg-brand-blue"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Already used / failed state */}
        {(isAlreadyUsed || isFailed) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-[0.625vw] rounded-[1.042vw] bg-surface-muted/90 backdrop-blur-sm px-[1.667vw] text-center">
            <p className="text-[0.729vw] text-text-subtitle">
              {isFailed
                ? "Something went wrong with your try-on."
                : "You've already used your free try-on."}
            </p>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Model thumbnails */}
      {(phase === "idle" || phase === "generating") && (
        <div className="flex gap-[0.625vw] self-stretch">
          {models.map((model) => (
            <button
              key={model.id}
              type="button"
              onClick={() => onModelSelect(model.id)}
              disabled={isGenerating}
              className={`h-[7.552vw] flex-1 overflow-hidden rounded-[0.625vw] border-2 transition-colors disabled:opacity-50 ${
                selectedModelId === model.id ? "border-tab-active" : "border-transparent"
              }`}
            >
              <Image
                src={model.imageUrl}
                alt={model.alt}
                width={200}
                height={145}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
