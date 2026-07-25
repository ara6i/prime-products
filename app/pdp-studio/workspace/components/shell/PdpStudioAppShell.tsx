"use client";

import type { ReactNode } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/app/shared/components/ui/sheet";
import type { PdpStudioUser } from "../../../shared/pdpStudioAuthService";
import type { PdpStudioWorkspaceView } from "../../types";
import { getPrimaryPdpStudioNavigation } from "../../lib/pdpStudioNavigation";
import { usePdpStudioShellUi } from "../../hooks/usePdpStudioShellUi";
import { PdpStudioSidebar } from "./PdpStudioSidebar";
import { PdpStudioTopbar } from "./PdpStudioTopbar";
import { PdpStudioNavigation } from "./PdpStudioNavigation";
import { PdpStudioCommandPalette } from "./PdpStudioCommandPalette";
import { PdpStudioOverlayHost } from "../overlays/PdpStudioOverlayHost";
import { PdpStudioWorkspaceAuthGate } from "../overlays/PdpStudioWorkspaceAuthGate";
import { PdpStudioUiIcon } from "../shared/PdpStudioUiIcon";

interface PdpStudioAppShellProps {
  user: PdpStudioUser | null;
  view: PdpStudioWorkspaceView;
  children: ReactNode;
}

export function PdpStudioAppShell({
  user,
  view,
  children,
}: PdpStudioAppShellProps) {
  const ui = usePdpStudioShellUi(view.commands);
  const needsAuth = !user;
  const primaryNavigation = getPrimaryPdpStudioNavigation(view.catalog.navigation);

  return (
    <main data-pdp-studio className="min-h-screen overflow-x-clip bg-[var(--color-pdp-paper)] font-[family-name:var(--font-pdp-body)] text-[var(--color-pdp-ink)] max-[599px]:h-[100dvh] max-[599px]:overflow-hidden">
      <div className={needsAuth ? "pointer-events-none select-none blur-[1px]" : ""}>
        <div className="flex min-h-screen">
          <PdpStudioSidebar
            groups={primaryNavigation}
            onOpenOverlay={ui.openOverlay}
          />

          <div className="min-w-0 flex-1 lg:pl-[var(--size-pdp-sidebar)]">
            <PdpStudioTopbar
              onOpenSearch={() => ui.setCommandOpen(true)}
              onOpenMobileNav={() => ui.setMobileNavOpen(true)}
            />
            <div className="w-full px-4 pb-8 sm:px-6 lg:px-8">{children}</div>
          </div>
        </div>
      </div>

      <Sheet
        open={ui.mobileNavOpen}
        onOpenChange={ui.setMobileNavOpen}
      >
        <SheetContent
          side="left"
          className="w-[min(90vw,22rem)] gap-0 border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface)] p-[var(--space-pdp-md)] text-[var(--color-pdp-ink)]"
        >
          <SheetHeader className="border-b border-[var(--color-pdp-rule)] p-0 pb-[var(--space-pdp-md)]">
            <SheetTitle className="font-[family-name:var(--font-pdp-wordmark)] text-[var(--text-pdp-md)]">
              PDP Studio
            </SheetTitle>
            <SheetDescription className="text-[var(--text-pdp-xs)] text-[var(--color-pdp-muted)]">
              Primestyleai’s Space
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 pt-[var(--space-pdp-md)]">
            <PdpStudioNavigation
              groups={primaryNavigation}
              onOpenOverlay={ui.openOverlay}
              onNavigate={() => ui.setMobileNavOpen(false)}
              compact
            />
          </div>
        </SheetContent>
      </Sheet>

      <PdpStudioCommandPalette
        open={ui.commandOpen}
        query={ui.commandQuery}
        commands={ui.filteredCommands}
        onOpenChange={ui.setCommandOpen}
        onQueryChange={ui.setCommandQuery}
        onOpenOverlay={ui.openOverlay}
      />
      <PdpStudioOverlayHost
        activeOverlay={ui.activeOverlay}
        plans={view.catalog.plans}
        onClose={ui.closeOverlay}
        onOpenOverlay={ui.openOverlay}
      />
      {needsAuth ? <PdpStudioWorkspaceAuthGate /> : null}

      <section
        aria-labelledby="pdp-small-window-title"
        className="fixed inset-0 z-[700] hidden place-items-center bg-[var(--color-pdp-paper)] px-8 text-center max-[599px]:grid"
      >
        <div className="max-w-[22rem]">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-[var(--color-pdp-accent-soft)] text-[var(--color-pdp-accent)]">
            <PdpStudioUiIcon name="resize" size={22} />
          </span>
          <h1
            id="pdp-small-window-title"
            className="mt-5 text-[1.25rem] font-semibold"
          >
            Your browser window is too small
          </h1>
          <p className="mt-2 text-[0.875rem] leading-6 text-[var(--color-pdp-muted)]">
            Resize your browser window to be at least 600px wide and 400px high
            to use PDP Studio.
          </p>
        </div>
        <button
          type="button"
          aria-label="Help"
          className="absolute bottom-5 right-5 grid size-9 place-items-center rounded-full border border-[var(--color-pdp-rule)] bg-white text-[var(--color-pdp-ink-soft)] shadow-sm"
        >
          <PdpStudioUiIcon name="help" size={17} />
        </button>
      </section>
    </main>
  );
}
