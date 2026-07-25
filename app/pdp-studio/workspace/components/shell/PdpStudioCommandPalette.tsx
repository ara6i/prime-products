"use client";

import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/shared/components/ui/dialog";
import { Input } from "@/app/shared/components/ui/input";
import type {
  PdpStudioCommandItem,
  PdpStudioOverlayId,
} from "../../types";
import { PdpStudioButton } from "../shared/PdpStudioButton";
import { PdpStudioUiIcon } from "../shared/PdpStudioUiIcon";

interface PdpStudioCommandPaletteProps {
  open: boolean;
  query: string;
  commands: PdpStudioCommandItem[];
  onOpenChange: (open: boolean) => void;
  onQueryChange: (query: string) => void;
  onOpenOverlay: (overlay: PdpStudioOverlayId) => void;
}

export function PdpStudioCommandPalette({
  open,
  query,
  commands,
  onOpenChange,
  onQueryChange,
  onOpenOverlay,
}: PdpStudioCommandPaletteProps) {
  const router = useRouter();

  function selectCommand(command: PdpStudioCommandItem): void {
    if (command.overlay) {
      onOpenOverlay(command.overlay);
      return;
    }
    if (command.href) {
      onOpenChange(false);
      onQueryChange("");
      router.push(command.href);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80dvh] max-w-[min(92vw,42rem)] overflow-hidden rounded-[var(--radius-pdp-lg)] border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface)] p-0 text-[var(--color-pdp-ink)]">
        <DialogHeader className="border-b border-[var(--color-pdp-rule)] p-[var(--space-pdp-md)]">
          <DialogTitle className="text-[var(--text-pdp-md)]">Search PDP Studio</DialogTitle>
          <DialogDescription className="sr-only">
            Search pages, tools, templates, and workspace actions.
          </DialogDescription>
          <div className="relative mt-[var(--space-pdp-sm)]">
            <PdpStudioUiIcon
              name="search"
              className="pointer-events-none absolute left-[var(--space-pdp-sm)] top-1/2 -translate-y-1/2 text-[var(--color-pdp-muted)]"
            />
            <Input
              autoFocus
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder="Search tools, templates, and pages"
              className="h-[var(--size-pdp-control)] rounded-[var(--radius-pdp-sm)] border-[var(--color-pdp-rule)] bg-[var(--color-pdp-paper)] pl-[2.75rem] text-[var(--text-pdp-sm)] focus-visible:ring-[var(--color-pdp-focus)]"
            />
          </div>
        </DialogHeader>

        <div className="min-h-0 overflow-y-auto p-[var(--space-pdp-xs)]">
          {commands.length ? (
            <div role="listbox" aria-label="Search results" className="grid gap-[var(--space-pdp-2xs)]">
              {commands.map((command) => (
                <PdpStudioButton
                  key={command.id}
                  type="button"
                  variant="ghost"
                  role="option"
                  onClick={() => selectCommand(command)}
                  className="h-auto min-h-[var(--size-pdp-control)] justify-start gap-[var(--space-pdp-sm)] bg-transparent px-[var(--space-pdp-sm)] py-[var(--space-pdp-xs)] text-left text-[var(--color-pdp-ink)] hover:bg-[var(--color-pdp-surface-soft)]"
                >
                  <span className="grid size-[2.25rem] shrink-0 place-items-center rounded-[var(--radius-pdp-xs)] bg-[var(--color-pdp-accent-soft)] text-[var(--color-pdp-accent)]">
                    <PdpStudioUiIcon name={command.icon} />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate">{command.label}</span>
                    <span className="block truncate text-[var(--text-pdp-xs)] font-normal text-[var(--color-pdp-muted)]">
                      {command.description}
                    </span>
                  </span>
                </PdpStudioButton>
              ))}
            </div>
          ) : (
            <p className="p-[var(--space-pdp-lg)] text-center text-[var(--text-pdp-sm)] text-[var(--color-pdp-muted)]">
              No matching tools or pages.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
