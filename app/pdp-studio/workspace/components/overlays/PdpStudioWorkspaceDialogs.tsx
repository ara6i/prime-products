"use client";

import Link from "next/link";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/app/shared/components/ui/dialog";
import type { PdpStudioOverlayId } from "../../types";
import { PdpStudioButton } from "../shared/PdpStudioButton";
import { PdpStudioUiIcon } from "../shared/PdpStudioUiIcon";

interface PdpStudioWorkspaceDialogsProps {
  activeOverlay: PdpStudioOverlayId | null;
  onClose: () => void;
  onOpenOverlay: (overlay: PdpStudioOverlayId) => void;
}

function ApiDialogContent() {
  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-[var(--text-pdp-lg)]">
          Chat about Enterprise integrations
        </DialogTitle>
        <DialogDescription className="text-[var(--text-pdp-sm)] text-[var(--color-pdp-muted)]">
          Connect to one powerful API and automate high-quality image editing
          across your product workflows.
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-[var(--space-pdp-sm)]">
        {[
          "Integrate PrimeStyleAI into your product",
          "Add the API to your internal image-editing process",
          "API Documentation",
          "Talk to Sales",
        ].map((item) => (
          <div key={item} className="flex items-center gap-[var(--space-pdp-sm)] rounded-[var(--radius-pdp-md)] border border-[var(--color-pdp-rule)] p-[var(--space-pdp-md)]">
            <span className="grid size-[2.5rem] shrink-0 place-items-center rounded-[var(--radius-pdp-sm)] bg-[var(--color-pdp-accent-soft)] text-[var(--color-pdp-accent)]">
              <PdpStudioUiIcon name="api" />
            </span>
            <span className="text-[var(--text-pdp-sm)] font-medium">{item}</span>
          </div>
        ))}
      </div>
      <PdpStudioButton type="button" disabled className="w-full">
        Generate my API key
      </PdpStudioButton>
    </>
  );
}

function SpaceDialogContent({
  onOpenOverlay,
}: {
  onOpenOverlay: (overlay: PdpStudioOverlayId) => void;
}) {
  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-[var(--text-pdp-lg)]">Primestyleai’s Space</DialogTitle>
        <DialogDescription className="text-[var(--text-pdp-sm)] text-[var(--color-pdp-muted)]">
          Private workspace · only yours
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-[var(--space-pdp-xs)]">
        <PdpStudioButton asChild type="button" variant="ghost" className="justify-start border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface)] text-[var(--color-pdp-ink)]">
          <Link href="/pdp-studio/preferences">
            <PdpStudioUiIcon name="settings" />
            Manage Space
          </Link>
        </PdpStudioButton>
        <PdpStudioButton type="button" variant="ghost" onClick={() => onOpenOverlay("mobile-login")} className="justify-start border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface)] text-[var(--color-pdp-ink)]">
          <PdpStudioUiIcon name="profile" />
          Log in to mobile app
        </PdpStudioButton>
        <PdpStudioButton asChild type="button" variant="ghost" className="justify-start border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface)] text-[var(--color-pdp-ink)]">
          <Link href="/pdp-studio/preferences">
            <PdpStudioUiIcon name="profile" />
            Open Profile
          </Link>
        </PdpStudioButton>
        <PdpStudioButton type="button" variant="ghost" disabled className="justify-start border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface)] text-[var(--color-pdp-muted)]">
          <PdpStudioUiIcon name="plus" />
          Create a Space · preview only
        </PdpStudioButton>
        <PdpStudioButton type="button" variant="ghost" disabled className="justify-start border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface)] text-[var(--color-pdp-muted)]">
          <PdpStudioUiIcon name="profile" />
          Sign out · preview only
        </PdpStudioButton>
      </div>
    </>
  );
}

function MobileLoginContent() {
  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-[var(--text-pdp-lg)]">Log in to mobile app</DialogTitle>
        <DialogDescription className="text-[var(--text-pdp-sm)] text-[var(--color-pdp-muted)]">
          The QR surface is a non-functional UI preview and carries no sign-in token.
        </DialogDescription>
      </DialogHeader>
      <div className="mx-auto grid aspect-square w-[min(62vw,15rem)] grid-cols-7 gap-[0.2rem] rounded-[var(--radius-pdp-md)] border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface)] p-[var(--space-pdp-md)]">
        {Array.from({ length: 49 }, (_, index) => (
          <span
            key={index}
            className={(index * 7 + index * index) % 5 < 2 ? "bg-[var(--color-pdp-ink)]" : "bg-transparent"}
          />
        ))}
      </div>
      <PdpStudioButton type="button" variant="ghost" disabled className="w-full border border-[var(--color-pdp-rule)] bg-transparent text-[var(--color-pdp-muted)]">
        View login details instead · preview only
      </PdpStudioButton>
    </>
  );
}

export function PdpStudioWorkspaceDialogs({
  activeOverlay,
  onClose,
  onOpenOverlay,
}: PdpStudioWorkspaceDialogsProps) {
  const open = activeOverlay === "api" || activeOverlay === "space" || activeOverlay === "mobile-login";
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="max-w-[min(92vw,34rem)] rounded-[var(--radius-pdp-lg)] border-[var(--color-pdp-rule)] bg-[var(--color-pdp-paper)] text-[var(--color-pdp-ink)]">
        {activeOverlay === "api" ? <ApiDialogContent /> : null}
        {activeOverlay === "space" ? <SpaceDialogContent onOpenOverlay={onOpenOverlay} /> : null}
        {activeOverlay === "mobile-login" ? <MobileLoginContent /> : null}
      </DialogContent>
    </Dialog>
  );
}
