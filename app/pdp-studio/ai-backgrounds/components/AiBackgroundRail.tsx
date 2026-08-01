"use client";

import { useState } from "react";
import type { AiBackgroundsWorkspaceController } from "../hooks/useAiBackgroundsWorkspace";
import { AiBackgroundCustomPanel } from "./AiBackgroundCustomPanel";
import { AiBackgroundModelMenu } from "./AiBackgroundModelMenu";
import { PdpStudioButton } from "../../workspace/components/shared/PdpStudioButton";
import { PdpStudioUiIcon } from "../../workspace/components/shared/PdpStudioUiIcon";

interface AiBackgroundRailProps {
  ui: AiBackgroundsWorkspaceController;
}

export function AiBackgroundRail({ ui }: AiBackgroundRailProps) {
  const [modelOpen, setModelOpen] = useState(false);

  if (ui.customOpen) return <AiBackgroundCustomPanel ui={ui} />;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="flex items-center gap-3 px-4 pb-3 pt-4">
        <PdpStudioButton
          type="button"
          variant="ghost"
          aria-label="Back to PDP Studio"
          onClick={ui.resetEditor}
          className="min-h-8 min-w-8 rounded-full p-0"
        >
          <PdpStudioUiIcon name="arrow" size={16} className="rotate-180" />
        </PdpStudioButton>
        <h1 className="text-[1rem] font-semibold">AI Backgrounds</h1>
        <div className="ml-auto">
          <AiBackgroundModelMenu
            ui={ui}
            open={modelOpen}
            onOpenChange={setModelOpen}
          />
        </div>
      </header>

      <div className="px-4">
        <PdpStudioButton
          type="button"
          onClick={() => ui.setCustomOpen(true)}
          className="w-full gap-2"
        >
          <PdpStudioUiIcon name="edit-with-ai" size={16} />
          Create a background
        </PdpStudioButton>
        <label className="relative mt-4 block">
          <PdpStudioUiIcon
            name="search"
            size={16}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-pdp-muted)]"
          />
          <input
            type="search"
            value={ui.search}
            onChange={(event) => ui.setSearch(event.target.value)}
            placeholder="Search for backgrounds"
            className="h-10 w-full rounded-[0.625rem] border border-[var(--color-pdp-rule)] bg-white pl-9 pr-9 text-[0.75rem] outline-none placeholder:text-[var(--color-pdp-muted)] focus:border-[var(--color-pdp-accent)] focus:ring-2 focus:ring-[var(--color-pdp-accent-soft)]"
          />
          {ui.search ? (
            <PdpStudioButton
              type="button"
              variant="ghost"
              aria-label="Clear background search"
              onClick={() => ui.setSearch("")}
              className="absolute right-1.5 top-1/2 min-h-7 min-w-7 -translate-y-1/2 rounded-full p-0"
            >
              <PdpStudioUiIcon name="close" size={13} />
            </PdpStudioButton>
          ) : null}
        </label>
      </div>

      <div className="mt-4 min-h-0 flex-1 overflow-y-auto px-4 pb-8">
        {ui.filteredGroups.length ? (
          <div className="grid gap-6">
            {ui.filteredGroups.map((group) => (
              <section key={group.id}>
                <h2 className="mb-2 text-[0.75rem] font-semibold">
                  {group.label}
                </h2>
                <div className="grid grid-cols-2 gap-2.5">
                  {group.presets.map((preset) => (
                    <PdpStudioButton
                      key={preset.id}
                      type="button"
                      variant="ghost"
                      disabled={ui.busy}
                      aria-pressed={ui.selectedPresetId === preset.id}
                      onClick={() =>
                        void ui.runGeneration("preset", {
                          presetId: preset.id,
                        })
                      }
                      className={[
                        "group h-auto min-h-0 min-w-0 flex-col items-stretch justify-start gap-1 overflow-hidden rounded-[0.7rem] border bg-white p-1 text-left",
                        ui.selectedPresetId === preset.id
                          ? "border-2 border-[var(--color-pdp-accent)]"
                          : "border-[var(--color-pdp-rule)]",
                      ].join(" ")}
                    >
                      <span className="relative block aspect-square overflow-hidden rounded-[0.5rem] bg-[var(--color-pdp-surface-soft)]">
                        {/* The final files are generated only through the signed-in ChatGPT browser. */}
                        <img
                          src={preset.image}
                          alt=""
                          loading="lazy"
                          className="size-full object-cover transition-transform duration-200 group-hover:scale-[1.025]"
                          onError={(event) => {
                            event.currentTarget.src =
                              "/images/pdp-studio/presets/clean-white.png";
                          }}
                        />
                        {ui.busy && ui.selectedPresetId === preset.id ? (
                          <span className="absolute inset-0 grid place-items-center bg-white/70 text-[var(--color-pdp-accent)]">
                            <PdpStudioUiIcon
                              name="sparkles"
                              size={17}
                              className="animate-pulse"
                            />
                          </span>
                        ) : null}
                      </span>
                      <span className="block w-full truncate px-1 pb-1 text-center text-[0.6875rem] font-normal">
                        <HighlightedLabel label={preset.label} query={ui.search} />
                      </span>
                    </PdpStudioButton>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="grid min-h-48 place-items-center text-center">
            <div>
              <PdpStudioUiIcon
                name="search"
                size={20}
                className="mx-auto text-[var(--color-pdp-muted)]"
              />
              <p className="mt-3 text-[0.75rem] font-medium">
                No backgrounds found
              </p>
              <p className="mt-1 text-[0.6875rem] text-[var(--color-pdp-muted)]">
                Try a material, mood, place, or color.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function HighlightedLabel({
  label,
  query,
}: {
  label: string;
  query: string;
}) {
  const normalizedQuery = query.trim().toLowerCase();
  const start = normalizedQuery
    ? label.toLowerCase().indexOf(normalizedQuery)
    : -1;
  if (start < 0) return label;
  const end = start + normalizedQuery.length;
  return (
    <>
      {label.slice(0, start)}
      <mark className="rounded-sm bg-amber-100 px-0.5 text-inherit">
        {label.slice(start, end)}
      </mark>
      {label.slice(end)}
    </>
  );
}
