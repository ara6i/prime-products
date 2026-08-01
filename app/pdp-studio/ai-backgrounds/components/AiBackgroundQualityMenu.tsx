"use client";

import { AI_BACKGROUND_QUALITY_OPTIONS } from "../data/aiBackgroundPresets";
import type { AiBackgroundsWorkspaceController } from "../hooks/useAiBackgroundsWorkspace";
import { PdpStudioButton } from "../../workspace/components/shared/PdpStudioButton";

interface AiBackgroundQualityMenuProps {
  ui: AiBackgroundsWorkspaceController;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
export function AiBackgroundQualityMenu({
  ui,
  open,
  onOpenChange,
}: AiBackgroundQualityMenuProps) {
  const current =
    AI_BACKGROUND_QUALITY_OPTIONS.find(
      (option) => option.id === ui.quality,
    ) ?? AI_BACKGROUND_QUALITY_OPTIONS[2];

  return (
    <div className="relative">
      <PdpStudioButton
        type="button"
        variant="ghost"
        aria-label={`Quality: ${current?.label ?? "Standard"}`}
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
        className="min-h-9 gap-2 rounded-[0.55rem] border border-[var(--color-pdp-rule)] bg-white px-3 text-[0.75rem] font-medium shadow-sm"
      >
        {current?.label ?? "Standard"}
        <span className="rounded bg-[var(--color-pdp-surface-soft)] px-1.5 py-0.5 text-[0.625rem]">
          {current?.resolution ?? "1K"}
        </span>
      </PdpStudioButton>
      {open ? (
        <div
          role="radiogroup"
          aria-label="Generation quality"
          className="absolute bottom-[calc(100%+0.6rem)] right-0 z-50 grid w-[min(42rem,calc(100vw-3rem))] gap-2 rounded-[0.875rem] border border-[var(--color-pdp-rule)] bg-white p-3 shadow-[0_22px_65px_rgba(17,24,39,0.18)] sm:grid-cols-3"
        >
          {AI_BACKGROUND_QUALITY_OPTIONS.map((option) => (
            <PdpStudioButton
              key={option.id}
              type="button"
              variant="ghost"
              role="radio"
              aria-checked={ui.quality === option.id}
              onClick={() => {
                ui.setQuality(option.id);
                onOpenChange(false);
              }}
              className={[
                "h-auto min-h-[9rem] min-w-0 flex-col items-stretch justify-start whitespace-normal rounded-[0.7rem] border p-3 text-left",
                ui.quality === option.id
                  ? "border-[var(--color-pdp-accent)] bg-[var(--color-pdp-accent-soft)]"
                  : "border-[var(--color-pdp-rule)]",
              ].join(" ")}
            >
              <span className="flex items-center justify-between gap-2">
                <span className="text-[0.8125rem] font-semibold">
                  {option.label}
                </span>
                <span className="rounded bg-white px-1.5 py-0.5 text-[0.5625rem] font-semibold text-[var(--color-pdp-accent)] shadow-sm">
                  {option.badge}
                </span>
              </span>
              <span className="mt-2 text-[1.25rem] font-semibold text-[var(--color-pdp-accent)]">
                {option.resolution === "4K" ? "4K+" : option.resolution}
              </span>
              <span className="mt-1 grid gap-0.5 text-[0.65rem] leading-4 text-[var(--color-pdp-muted)]">
                {option.features.map((feature) => (
                  <span key={feature}>{feature}</span>
                ))}
              </span>
            </PdpStudioButton>
          ))}
        </div>
      ) : null}
    </div>
  );
}
