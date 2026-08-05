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
import { PdpStudioButton } from "../shared/PdpStudioButton";
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
    <main data-pdp-studio className="min-h-screen overflow-x-clip bg-[var(--color-pdp-paper)] font-[family-name:var(--font-pdp-body)] text-[var(--color-pdp-ink)]">
      <div className={needsAuth ? "pointer-events-none select-none blur-[1px]" : ""}>
        <div className="flex min-h-screen">
          <PdpStudioSidebar
            groups={primaryNavigation}
            user={user}
            onOpenOverlay={ui.openOverlay}
          />

          <div className="min-w-0 flex-1 lg:pl-[var(--size-pdp-sidebar)]">
            <PdpStudioTopbar
              user={user}
              onOpenSearch={() => ui.setCommandOpen(true)}
              onOpenMobileNav={() => ui.setMobileNavOpen(true)}
            />
            <div className="mx-auto w-full max-w-[var(--size-pdp-content)] px-4 pb-10 pt-5 sm:px-6 sm:pt-7 lg:px-8 lg:pb-12">{children}</div>
          </div>
        </div>
      </div>

      <Sheet
        open={ui.mobileNavOpen}
        onOpenChange={ui.setMobileNavOpen}
      >
        <SheetContent
          side="left"
          className="w-[min(88vw,20rem)] gap-0 border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface)] p-5 text-[var(--color-pdp-ink)]"
        >
          <SheetHeader className="border-b border-[var(--color-pdp-rule)] p-0 pb-[var(--space-pdp-md)]">
            <SheetTitle className="font-[family-name:var(--font-pdp-display)] text-[var(--text-pdp-md)] font-medium">
              PrimeStyleAI Studio
            </SheetTitle>
            <SheetDescription className="text-[var(--text-pdp-xs)] text-[var(--color-pdp-muted)]">
              Creative workspace
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
      {!needsAuth ? (
        <PdpStudioButton
          type="button"
          variant="ghost"
          size="icon"
          aria-label="Help"
          onClick={() => ui.openOverlay("help")}
          className="fixed bottom-4 right-4 z-[var(--z-pdp-sticky)] size-10 min-h-0 rounded-full border border-[var(--color-pdp-rule)] bg-white p-0 text-[var(--color-pdp-ink-soft)] shadow-[var(--shadow-pdp-card)] hover:border-[var(--color-pdp-rule-strong)] hover:bg-[var(--color-pdp-surface-soft)]"
        >
          <PdpStudioUiIcon name="help" size={17} />
        </PdpStudioButton>
      ) : null}
      {needsAuth ? <PdpStudioWorkspaceAuthGate /> : null}

    </main>
  );
}
