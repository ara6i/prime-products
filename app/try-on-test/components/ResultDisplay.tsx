"use client";

import { Sparkles } from "lucide-react";
import { cn } from "@/app/shared/lib/utils";
import type { TryOnPhase } from "../lib/types";

export interface ResultDisplayProps {
  modelPreviewUrl: string | null;
  garmentPreviewUrl: string | null;
  resultImageUrl: string | null;
  phase: TryOnPhase;
}

export function ResultDisplay({ modelPreviewUrl, garmentPreviewUrl, resultImageUrl, phase }: ResultDisplayProps) {
  const isLive = phase === "submitting" || phase === "queued" || phase === "generating";

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2">
        <div className="rounded-full bg-brand-blue-pale p-2 text-brand-blue">
          <Sparkles className="size-4" />
        </div>
        <h3 className="text-sm font-semibold text-text-primary">Try-on result</h3>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Slot label="Model" url={modelPreviewUrl} placeholder="upload a photo" />
        <Slot label="Garment" url={garmentPreviewUrl} placeholder="upload a garment" />
        <Slot
          label="Result"
          url={resultImageUrl}
          placeholder={phase === "error" ? "no result" : "result will appear here"}
          isLive={isLive}
          isPrimary
        />
      </div>
    </div>
  );
}

function Slot({
  label,
  url,
  placeholder,
  isLive,
  isPrimary,
}: {
  label: string;
  url: string | null;
  placeholder: string;
  isLive?: boolean;
  isPrimary?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2">
      <span
        className={cn("text-xs font-medium uppercase tracking-wide", isPrimary ? "text-brand-blue-dark" : "text-text-hint")}
      >
        {label}
      </span>
      <div
        className={cn(
          "relative aspect-[3/4] w-full overflow-hidden rounded-xl border border-white/50",
          // Glass substrate so contained images sit on a frosted backdrop and
          // empty placeholders inherit the same look without a gray rectangle.
          "bg-gradient-to-br from-brand-blue-pale/35 via-white/25 to-brand-blue-pale/15 backdrop-blur-md",
          "shadow-[inset_0_1px_0_rgba(255,255,255,0.5)]",
          isPrimary && "ring-2 ring-brand-blue-pale",
        )}
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt={label} className="absolute inset-0 size-full object-contain p-2" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center px-4 text-center text-xs text-text-secondary">
            {placeholder}
          </div>
        )}
        {isLive && isPrimary && <ScanOverlay />}
      </div>
    </div>
  );
}

function ScanOverlay() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-brand-blue/0 via-brand-blue/10 to-brand-blue/0" />
      <div
        className="absolute left-0 right-0 h-1 bg-brand-blue/70 shadow-[0_0_18px_rgba(33,84,239,0.7)]"
        style={{ animation: "ps-tryon-test-scan 2.4s ease-in-out infinite" }}
      />
      <style>{`
        @keyframes ps-tryon-test-scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
}
