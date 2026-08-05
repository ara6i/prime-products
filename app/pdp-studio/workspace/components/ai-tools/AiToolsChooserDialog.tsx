"use client";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/app/shared/components/ui/dialog";
import type { PdpStudioAuditCatalog } from "../../types";
import type { PdpStudioToolId } from "../../types";
import { isPdpStudioInlineToolId } from "../../data/pdpStudioInlineTools";
import { PdpStudioButton } from "../shared/PdpStudioButton";
import { PdpStudioToolCard } from "../shared/PdpStudioToolCard";
import { PdpStudioUiIcon } from "../shared/PdpStudioUiIcon";

interface AiToolsChooserDialogProps {
  open: boolean;
  tools: PdpStudioAuditCatalog["tools"];
  onOpenChange: (open: boolean) => void;
  onActivateTool: (toolId: PdpStudioToolId) => void;
}

export function AiToolsChooserDialog({
  open,
  tools,
  onOpenChange,
  onActivateTool,
}: AiToolsChooserDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby="ai-tools-chooser-description"
        showCloseButton={false}
        overlayClassName="!z-[999] bg-[var(--color-pdp-ink)]/32 backdrop-blur-[2px]"
        className="!z-[1000] flex h-[calc(100dvh-1.5rem)] max-h-[50rem] w-[calc(100vw-1.5rem)] max-w-[72rem] flex-col gap-0 overflow-hidden rounded-[var(--radius-pdp-xl)] border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface)] p-0 shadow-[var(--shadow-pdp-overlay)] sm:h-[calc(100dvh-4rem)] sm:w-[calc(100vw-4rem)] sm:max-w-[72rem]"
      >
        <DialogClose asChild>
          <PdpStudioButton
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Close"
            className="absolute right-4 top-4 z-10 size-8 rounded-full border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface-soft)] p-0 text-[var(--color-pdp-ink)] hover:bg-[var(--color-pdp-accent-soft)]"
          >
            <PdpStudioUiIcon name="close" size={17} />
          </PdpStudioButton>
        </DialogClose>

        <div className="shrink-0 px-5 pb-4 pt-6 text-center sm:px-7 sm:pb-5 sm:pt-7">
          <DialogTitle className="text-[1.5rem] font-medium leading-tight tracking-[-0.025em] text-[var(--color-pdp-ink)]">
            What do you need?
          </DialogTitle>
          <DialogDescription
            id="ai-tools-chooser-description"
            className="sr-only"
          >
            Choose a PrimeStyleAI image creation workflow.
          </DialogDescription>
        </div>

        <div className="min-h-0 overflow-y-auto px-4 pb-5 sm:px-7 sm:pb-7">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-[1rem] font-medium text-[var(--color-pdp-ink)]">
              Create images with AI
            </h2>
            <span className="text-[0.8125rem] font-medium text-[var(--color-pdp-muted)]">
              See all
            </span>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {tools.map((tool) => (
              <PdpStudioToolCard
                key={tool.id}
                tool={tool}
                onActivate={
                  isPdpStudioInlineToolId(tool.id)
                    ? () => {
                        onOpenChange(false);
                        onActivateTool(tool.id);
                      }
                    : undefined
                }
              />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
