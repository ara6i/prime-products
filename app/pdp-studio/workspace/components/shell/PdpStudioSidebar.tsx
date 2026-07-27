"use client";

import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/app/shared/components/ui/dropdown-menu";
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
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <PdpStudioButton
            type="button"
            variant="ghost"
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
        </DropdownMenuTrigger>
        <DropdownMenuContent
          side="right"
          align="start"
          sideOffset={8}
          className="w-64 rounded-xl border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface)] p-1.5 text-[var(--color-pdp-ink)] shadow-xl"
        >
          <DropdownMenuLabel className="flex items-center gap-3 px-2 py-2 font-normal">
            <span className="grid size-9 place-items-center rounded-full bg-[var(--color-pdp-accent-soft)] font-semibold text-[var(--color-pdp-accent)]">P</span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold">PrimeStyleAI&apos;s Space</span>
              <span className="block text-xs text-[var(--color-pdp-muted)]">Only you</span>
            </span>
          </DropdownMenuLabel>
          <DropdownMenuItem className="rounded-lg py-2" onSelect={() => onOpenOverlay("space")}>
            <PdpStudioUiIcon name="plus" size={17} />
            Create a Space
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild className="rounded-lg py-2">
            <Link href="/pdp-studio/preferences">
              <PdpStudioUiIcon name="settings" size={17} />
              Manage Space
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem className="rounded-lg py-2" onSelect={() => onOpenOverlay("mobile-login")}>
            <PdpStudioUiIcon name="profile" size={17} />
            Log in to mobile app
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild className="rounded-lg py-2">
            <Link href="/pdp-studio/preferences">
              <PdpStudioUiIcon name="profile" size={17} />
              Profile
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem className="rounded-lg py-2 text-[var(--color-pdp-muted)]">
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

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
