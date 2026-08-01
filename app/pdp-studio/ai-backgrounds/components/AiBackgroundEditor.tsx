"use client";

import Link from "next/link";
import { useState } from "react";
import type { AiBackgroundAspectRatio } from "../types/aiBackgrounds";
import type { AiBackgroundsWorkspaceController } from "../hooks/useAiBackgroundsWorkspace";
import { AiBackgroundCanvas } from "./AiBackgroundCanvas";
import { AiBackgroundQualityMenu } from "./AiBackgroundQualityMenu";
import { AiBackgroundRail } from "./AiBackgroundRail";
import { PdpStudioButton } from "../../workspace/components/shared/PdpStudioButton";
import { PdpStudioUiIcon } from "../../workspace/components/shared/PdpStudioUiIcon";

const RATIOS: readonly {
  id: AiBackgroundAspectRatio;
  label: string;
}[] = [
  { id: "1:1", label: "Square" },
  { id: "2:3", label: "Portrait 2:3" },
  { id: "3:4", label: "Portrait 3:4" },
  { id: "9:16", label: "Story 9:16" },
  { id: "4:3", label: "Landscape 4:3" },
  { id: "3:2", label: "Landscape 3:2" },
  { id: "16:9", label: "Wide 16:9" },
];

interface AiBackgroundEditorProps {
  ui: AiBackgroundsWorkspaceController;
}

export function AiBackgroundEditor({ ui }: AiBackgroundEditorProps) {
  const [qualityOpen, setQualityOpen] = useState(false);
  const [resizeOpen, setResizeOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <div className="flex h-screen min-h-[36rem] flex-col overflow-hidden bg-white text-[var(--color-pdp-ink)]">
      <header className="relative z-40 flex min-h-16 items-center overflow-x-auto border-b border-[var(--color-pdp-rule)] bg-white px-3">
        <PdpStudioButton
          asChild
          variant="ghost"
          className="min-h-10 min-w-10 rounded-[0.65rem] p-0"
        >
          <Link href="/pdp-studio" aria-label="Go back home">
            <PdpStudioUiIcon name="home" size={18} />
          </Link>
        </PdpStudioButton>
        <div className="ml-6 flex items-center gap-1">
          <ToolbarButton
            icon="plus"
            label="Insert"
            onClick={() => ui.openAssetPicker("insert")}
          />
          <ToolbarButton
            icon="text"
            label="Add text"
            onClick={ui.addTextLayer}
          />
          <ToolbarButton
            icon="image"
            label="Backgrounds"
            onClick={() => ui.setCustomOpen(false)}
          />
          <div className="relative">
            <ToolbarButton
              icon="resize"
              label="Resize"
              expanded={resizeOpen}
              onClick={() => setResizeOpen(!resizeOpen)}
            />
            {resizeOpen ? (
              <div className="absolute left-0 top-12 z-50 grid w-56 gap-1 rounded-[0.75rem] border border-[var(--color-pdp-rule)] bg-white p-2 shadow-[0_20px_60px_rgba(17,24,39,0.18)]">
                {RATIOS.map((ratio) => (
                  <PdpStudioButton
                    key={ratio.id}
                    type="button"
                    variant="ghost"
                    aria-pressed={ui.aspectRatio === ratio.id}
                    onClick={() => {
                      ui.setAspectRatio(ratio.id);
                      setResizeOpen(false);
                    }}
                    className={[
                      "min-h-9 justify-between rounded-[0.5rem] px-3 text-[0.75rem] font-normal",
                      ui.aspectRatio === ratio.id
                        ? "bg-[var(--color-pdp-accent-soft)] text-[var(--color-pdp-accent)]"
                        : "",
                    ].join(" ")}
                  >
                    {ratio.label}
                    <span className="text-[0.625rem] text-[var(--color-pdp-muted)]">
                      {ratio.id}
                    </span>
                  </PdpStudioButton>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <div className="relative">
            <PdpStudioButton
              type="button"
              variant="ghost"
              aria-label="More editor actions"
              aria-expanded={moreOpen}
              onClick={() => setMoreOpen(!moreOpen)}
              className="min-h-10 min-w-10 rounded-full p-0"
            >
              <PdpStudioUiIcon name="more" size={19} />
            </PdpStudioButton>
            {moreOpen ? (
              <div className="absolute right-0 top-12 z-50 w-48 rounded-[0.75rem] border border-[var(--color-pdp-rule)] bg-white p-2 shadow-[0_20px_60px_rgba(17,24,39,0.18)]">
                <PdpStudioButton
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    ui.resetEditor();
                    setMoreOpen(false);
                  }}
                  className="min-h-9 w-full justify-start px-3 text-[0.75rem] font-normal"
                >
                  Start with another image
                </PdpStudioButton>
              </div>
            ) : null}
          </div>
          <PdpStudioButton
            type="button"
            variant="outline"
            disabled={!ui.currentImageUrl}
            onClick={() => void ui.download()}
            className="gap-2"
          >
            <PdpStudioUiIcon name="download" size={16} />
            Download
          </PdpStudioButton>
          <PdpStudioButton
            type="button"
            disabled={!ui.currentImageUrl}
            onClick={() => void ui.share()}
            className="gap-2"
          >
            <PdpStudioUiIcon name="upload" size={16} />
            Share
          </PdpStudioButton>
        </div>
      </header>

      <main className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_18rem] lg:grid-cols-[minmax(0,1fr)_21.5rem] lg:grid-rows-1">
        <section className="flex min-h-0 min-w-0 flex-col">
          <AiBackgroundCanvas ui={ui} />
          <div className="border-t border-[var(--color-pdp-rule)] bg-white px-5 py-3">
            <div className="mx-auto flex max-w-[44rem] items-center gap-2 rounded-[0.8rem] border border-[var(--color-pdp-rule)] bg-white p-1.5 shadow-sm">
              <input
                value={ui.editPrompt}
                onChange={(event) => ui.setEditPrompt(event.target.value)}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    ui.editPrompt.trim() &&
                    !ui.busy
                  ) {
                    void ui.runGeneration("edit", {
                      prompt: ui.editPrompt,
                    });
                  }
                }}
                placeholder="Describe an edit"
                className="h-9 min-w-0 flex-1 bg-transparent px-3 text-[0.75rem] outline-none placeholder:text-[var(--color-pdp-muted)]"
              />
              <AiBackgroundQualityMenu
                ui={ui}
                open={qualityOpen}
                onOpenChange={setQualityOpen}
              />
              <PdpStudioButton
                type="button"
                aria-label="Generate edit"
                disabled={!ui.editPrompt.trim() || ui.busy}
                onClick={() =>
                  void ui.runGeneration("edit", {
                    prompt: ui.editPrompt,
                  })
                }
                className="min-h-9 min-w-9 rounded-[0.55rem] p-0"
              >
                <PdpStudioUiIcon
                  name="arrow"
                  size={16}
                  className="-rotate-90"
                />
              </PdpStudioButton>
            </div>
          </div>
        </section>

        <aside className="flex min-h-0 flex-col border-t border-[var(--color-pdp-rule)] bg-[var(--color-pdp-paper)] lg:border-l lg:border-t-0">
          <AiBackgroundRail ui={ui} />
        </aside>
      </main>
    </div>
  );
}

function ToolbarButton({
  icon,
  label,
  onClick,
  expanded,
}: {
  icon: "plus" | "text" | "image" | "resize";
  label: string;
  onClick: () => void;
  expanded?: boolean;
}) {
  return (
    <PdpStudioButton
      type="button"
      variant="ghost"
      aria-expanded={expanded}
      onClick={onClick}
      className="min-h-11 min-w-16 flex-col gap-0.5 rounded-[0.55rem] px-3 text-[0.625rem] font-normal"
    >
      <PdpStudioUiIcon name={icon} size={17} />
      {label}
    </PdpStudioButton>
  );
}
