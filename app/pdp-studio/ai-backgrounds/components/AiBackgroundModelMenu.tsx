"use client";

import { AI_BACKGROUND_MODEL_OPTIONS } from "../data/aiBackgroundPresets";
import type { AiBackgroundsWorkspaceController } from "../hooks/useAiBackgroundsWorkspace";
import { PdpStudioButton } from "../../workspace/components/shared/PdpStudioButton";
import { PdpStudioUiIcon } from "../../workspace/components/shared/PdpStudioUiIcon";

interface AiBackgroundModelMenuProps {
  ui: AiBackgroundsWorkspaceController;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
export function AiBackgroundModelMenu({
  ui,
  open,
  onOpenChange,
}: AiBackgroundModelMenuProps) {
  const current =
    AI_BACKGROUND_MODEL_OPTIONS.find(
      (option) => option.id === ui.modelPreset,
    ) ?? AI_BACKGROUND_MODEL_OPTIONS[2];

  return (
    <div className="relative">
      <PdpStudioButton
        type="button"
        variant="ghost"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => onOpenChange(!open)}
        className="min-h-8 gap-1 rounded-full border border-[var(--color-pdp-rule)] bg-white px-3 text-[0.6875rem] font-medium shadow-sm"
      >
        {current?.label}
        <PdpStudioUiIcon name="chevron" size={12} />
      </PdpStudioButton>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-10 z-40 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-[0.875rem] border border-[var(--color-pdp-rule)] bg-white p-2 shadow-[0_22px_65px_rgba(17,24,39,0.18)]"
        >
          {AI_BACKGROUND_MODEL_OPTIONS.map((option) => (
            <PdpStudioButton
              key={option.id}
              type="button"
              variant="ghost"
              role="menuitemradio"
              aria-checked={ui.modelPreset === option.id}
              onClick={() => {
                ui.setModelPreset(option.id);
                onOpenChange(false);
              }}
              className={[
                "h-auto min-h-[4.75rem] w-full items-start justify-start gap-3 rounded-[0.625rem] px-3 py-2.5 text-left",
                ui.modelPreset === option.id
                  ? "bg-[var(--color-pdp-accent-soft)]"
                  : "hover:bg-[var(--color-pdp-surface-soft)]",
              ].join(" ")}
            >
              <span
                className={[
                  "mt-1 grid size-4 shrink-0 place-items-center rounded-full border",
                  ui.modelPreset === option.id
                    ? "border-[var(--color-pdp-accent)]"
                    : "border-[var(--color-pdp-rule-strong)]",
                ].join(" ")}
              >
                {ui.modelPreset === option.id ? (
                  <span className="size-2 rounded-full bg-[var(--color-pdp-accent)]" />
                ) : null}
              </span>
              <span className="min-w-0">
                <span className="flex items-center gap-2 text-[0.8125rem] font-semibold">
                  {option.label}
                  {option.badge ? (
                    <span className="rounded bg-[var(--color-pdp-accent-soft)] px-1.5 py-0.5 text-[0.5625rem] text-[var(--color-pdp-accent)]">
                      {option.badge}
                    </span>
                  ) : null}
                </span>
                <span className="mt-1 block whitespace-normal text-[0.6875rem] leading-4 text-[var(--color-pdp-muted)]">
                  {option.description}
                </span>
              </span>
            </PdpStudioButton>
          ))}
        </div>
      ) : null}
    </div>
  );
}
