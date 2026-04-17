"use client";

import { useCallback, useRef, useEffect, useState } from "react";
import Image from "next/image";
import { PersonAddIcon, CameraIcon } from "@/app/shared/components/icons";
import { Button } from "@/app/shared/components/ui";
import type { LandingModel, TryOnPhase } from "@/app/landing/types/try-on";

interface MobileModelPanelProps {
  models: LandingModel[];
  selectedModelId: string | null;
  uploadedImage: string | null;
  phase: TryOnPhase;
  resultImageUrl: string | null;
  onModelSelect: (id: string) => void;
  onImageUpload: (file: File) => void;
}

export function MobileModelPanel({
  models,
  selectedModelId,
  uploadedImage,
  phase,
  resultImageUrl,
  onModelSelect,
  onImageUpload,
}: MobileModelPanelProps) {
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

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onImageUpload(file);
    },
    [onImageUpload],
  );

  const isGenerating = phase === "generating";
  const isComplete = phase === "complete" && !!resultImageUrl;

  const modelSrc =
    uploadedImage ?? models.find((m) => m.id === selectedModelId)?.imageUrl ?? null;

  return (
    <div className="flex flex-col gap-3">
      {/* Main preview */}
      <div className="relative h-[280px] w-full overflow-hidden rounded-[20px] border-[0.5px] border-input-border bg-surface-muted">
        {modelSrc ? (
          <>
            {/* Model layer — always visible underneath */}
            <div className="relative h-full w-full">
              <Image
                src={modelSrc}
                alt="Selected model"
                fill
                className="object-contain object-center"
                sizes="100vw"
                unoptimized={modelSrc.startsWith("blob:")}
              />
            </div>

            {/* Result layer — fades in on top, bg covers model beneath */}
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
                  sizes="100vw"
                  unoptimized
                  onLoad={handleResultLoad}
                />
                <div
                  className={`absolute inset-0 rounded-[20px] ring-2 ring-inset ring-brand-blue/40 transition-opacity duration-700 ${
                    resultVisible ? "opacity-100" : "opacity-0"
                  }`}
                />
              </div>
            )}
          </>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-4 px-6">
            <PersonAddIcon size={64} color="var(--border-separator)" />
            <div className="flex flex-col items-center gap-2">
              <p className="text-center text-sm text-text-body">
                Choose a model below or upload your photo
              </p>
              <Button variant="primary" size="sm" onClick={() => fileInputRef.current?.click()}>
                <CameraIcon size={16} color="white" />
                Upload Photo
              </Button>
            </div>
          </div>
        )}

        {isGenerating && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-[20px] bg-surface-muted/85 backdrop-blur-sm">
            <div className="relative flex h-12 w-12 items-center justify-center">
              <div className="absolute inset-0 animate-ping rounded-full bg-brand-blue/20" />
              <div className="absolute inset-1 animate-pulse rounded-full bg-brand-blue/30" />
              <div className="h-4 w-4 rounded-full bg-brand-blue" />
            </div>
            <span className="animate-pulse text-sm font-medium text-text-primary">
              Styling your look…
            </span>
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  className="h-1.5 w-1.5 animate-bounce rounded-full bg-brand-blue"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
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

      {/* Model thumbnails — horizontal scroll */}
      {(phase === "idle" || phase === "generating") && (
        <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {models.map((model) => (
            // Model thumbnail grid — exception to Button rule per CODING-GUIDE
            <button
              key={model.id}
              type="button"
              onClick={() => onModelSelect(model.id)}
              disabled={isGenerating}
              className={`h-[90px] w-[68px] shrink-0 overflow-hidden rounded-[10px] border-2 transition-colors disabled:opacity-50 ${
                selectedModelId === model.id ? "border-tab-active" : "border-transparent"
              }`}
            >
              <Image
                src={model.imageUrl}
                alt={model.alt}
                width={68}
                height={90}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
