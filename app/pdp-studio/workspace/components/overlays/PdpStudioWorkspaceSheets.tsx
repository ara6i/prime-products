"use client";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/app/shared/components/ui/sheet";
import type { PdpStudioOverlayId } from "../../types";
import { PdpStudioButton } from "../shared/PdpStudioButton";
import { PdpStudioUiIcon } from "../shared/PdpStudioUiIcon";

interface PdpStudioWorkspaceSheetsProps {
  activeOverlay: PdpStudioOverlayId | null;
  onClose: () => void;
}

function HelpContent() {
  return (
    <div className="flex min-h-0 flex-1 flex-col p-4">
      <div className="rounded-2xl bg-[var(--color-pdp-accent-soft)] p-6">
        <h3 className="text-lg font-semibold">How can we help?</h3>
        <p className="mt-1 text-sm text-[var(--color-pdp-muted)]">
          Browse guides or start a support conversation.
        </p>
      </div>
      <div className="mt-4 grid gap-2">
        {["Getting started", "Batch and exports", "Plans and billing", "Brand Kit and templates"].map((item) => (
          <PdpStudioButton key={item} type="button" variant="ghost" className="justify-between border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface)] text-[var(--color-pdp-ink)]">
            {item}
            <PdpStudioUiIcon name="arrow" />
          </PdpStudioButton>
        ))}
      </div>
      <div className="mt-auto grid grid-cols-3 border-t border-[var(--color-pdp-rule)] pt-3 text-center text-xs text-[var(--color-pdp-muted)]">
        <span>Home</span>
        <span>Messages</span>
        <span>Help</span>
      </div>
    </div>
  );
}

export function PdpStudioWorkspaceSheets({
  activeOverlay,
  onClose,
}: PdpStudioWorkspaceSheetsProps) {
  const helpOpen = activeOverlay === "help";

  return (
    <Sheet open={helpOpen} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <SheetContent
        side="right"
        overlayClassName="bg-black/45 backdrop-blur-[1px]"
        className="w-[min(94vw,25rem)] gap-0 border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface)] p-0 text-[var(--color-pdp-ink)]"
      >
        <SheetHeader className="border-b border-[var(--color-pdp-rule)] p-4">
          <SheetTitle className="text-[var(--text-pdp-lg)]">Help</SheetTitle>
          <SheetDescription className="sr-only">
            PDP Studio help and support panel
          </SheetDescription>
        </SheetHeader>
        <HelpContent />
      </SheetContent>
    </Sheet>
  );
}
