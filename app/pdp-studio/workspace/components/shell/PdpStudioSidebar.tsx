"use client";

import type { PdpStudioNavGroup, PdpStudioOverlayId } from "../../types";
import { PdpStudioNavigation } from "./PdpStudioNavigation";
import { PdpStudioButton } from "../shared/PdpStudioButton";
import { PdpStudioUiIcon } from "../shared/PdpStudioUiIcon";

interface PdpStudioSidebarProps {
  groups: PdpStudioNavGroup[];
  onOpenOverlay: (overlay: PdpStudioOverlayId) => void;
}

export function PdpStudioSidebar({ groups, onOpenOverlay }: PdpStudioSidebarProps) {
  return (
    <aside className="fixed inset-y-0 left-0 z-[var(--z-pdp-sticky)] hidden h-[100dvh] w-[var(--size-pdp-sidebar)] border-r border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface)] px-1 py-3 lg:flex lg:flex-col">
      <PdpStudioButton
        type="button"
        variant="ghost"
        onClick={() => onOpenOverlay("space")}
        className="mb-4 min-h-[3.375rem] justify-start gap-3 bg-transparent px-2 text-[var(--color-pdp-ink)] hover:bg-[var(--color-pdp-surface-soft)]"
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-pdp-pill)] bg-[var(--color-pdp-accent-soft)] text-base font-semibold text-[var(--color-pdp-accent)]">
          P
        </span>
        <span className="min-w-0 flex-1 truncate text-left text-[0.875rem] font-semibold">
          PrimeStyleAI&apos;s Space
        </span>
        <PdpStudioUiIcon name="chevron" size={16} />
      </PdpStudioButton>

      <div className="min-h-0 flex flex-1 px-0">
        <PdpStudioNavigation
          groups={groups}
          onOpenOverlay={onOpenOverlay}
        />
      </div>

      <PdpStudioButton
        type="button"
        variant="primary"
        onClick={() => onOpenOverlay("upgrade")}
        className="mt-3 w-full rounded-[var(--radius-pdp-sm)] text-[0.8125rem] font-medium"
      >
        Upgrade Space to Pro
      </PdpStudioButton>
    </aside>
  );
}
