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
import type { PdpStudioUser } from "../../../shared/pdpStudioAuthService";
import { PdpStudioNavigation } from "./PdpStudioNavigation";
import { PdpStudioButton } from "../shared/PdpStudioButton";
import { PdpStudioUiIcon } from "../shared/PdpStudioUiIcon";
import { logoutAction } from "../../../login/actions";

interface PdpStudioSidebarProps {
  groups: PdpStudioNavGroup[];
  user: PdpStudioUser | null;
  onOpenOverlay: (overlay: PdpStudioOverlayId) => void;
}

export function PdpStudioSidebar({ groups, user, onOpenOverlay }: PdpStudioSidebarProps) {
  const initial = (user?.name || user?.email || "P").trim().charAt(0).toUpperCase();
  return (
    <aside className="fixed inset-y-0 left-0 z-[var(--z-pdp-sticky)] hidden h-[100dvh] w-[var(--size-pdp-sidebar)] border-r border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface)] px-4 py-5 lg:flex lg:flex-col">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <PdpStudioButton
            type="button"
            variant="ghost"
            className="mb-8 min-h-[3.25rem] justify-start gap-3 bg-transparent px-1 text-[var(--color-pdp-ink)] hover:bg-transparent"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-[var(--radius-pdp-pill)] bg-[var(--color-pdp-accent)] text-sm font-medium text-white shadow-[0_0.5rem_1.25rem_rgb(47_91_234_/_0.18)]">
              {initial}
            </span>
            <span className="min-w-0 flex-1 text-left">
              <span className="block truncate text-[0.8125rem] font-medium">PrimeStyleAI</span>
              <span className="mt-0.5 block truncate text-[0.6875rem] font-normal text-[var(--color-pdp-muted)]">Creative workspace</span>
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
            <span className="grid size-9 place-items-center rounded-full bg-[var(--color-pdp-accent)] font-medium text-white">{initial}</span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{user?.name || "PrimeStyleAI Studio"}</span>
              <span className="block truncate text-xs text-[var(--color-pdp-muted)]">{user?.email || "Private workspace"}</span>
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
          <form action={logoutAction}><DropdownMenuItem asChild className="rounded-lg py-2 text-[var(--color-pdp-muted)]"><button type="submit" className="w-full">Sign out</button></DropdownMenuItem></form>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="min-h-0 flex flex-1 px-0">
        <PdpStudioNavigation
          groups={groups}
          onOpenOverlay={onOpenOverlay}
        />
      </div>

      <button
        type="button"
        onClick={() => onOpenOverlay("upgrade")}
        className="mt-4 rounded-[var(--radius-pdp-lg)] border border-[var(--color-pdp-accent-border)] bg-[var(--color-pdp-surface-blue)] p-4 text-left shadow-[var(--shadow-pdp-card)] transition hover:border-[var(--color-pdp-accent)]"
      >
        <span className="block text-[0.8125rem] font-medium text-[var(--color-pdp-ink)]">Unlock every workflow</span>
        <span className="mt-1 block text-[0.6875rem] leading-4 text-[var(--color-pdp-muted)]">Upgrade your Space and process larger catalogs.</span>
        <span className="mt-3 inline-flex items-center gap-1.5 text-[0.75rem] font-medium text-[var(--color-pdp-accent)]">
          View plans <PdpStudioUiIcon name="arrow" size={13} />
        </span>
      </button>
    </aside>
  );
}
