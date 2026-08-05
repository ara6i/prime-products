"use client";

import { usePathname } from "next/navigation";
import { PdpStudioButton } from "../shared/PdpStudioButton";
import { PdpStudioUiIcon } from "../shared/PdpStudioUiIcon";
import type { PdpStudioUser } from "../../../shared/pdpStudioAuthService";

interface PdpStudioTopbarProps {
  onOpenSearch: () => void;
  onOpenMobileNav: () => void;
  user: PdpStudioUser | null;
}

export function PdpStudioTopbar({
  onOpenSearch,
  onOpenMobileNav,
  user,
}: PdpStudioTopbarProps) {
  const pathname = usePathname();
  const title =
    pathname === "/pdp-studio"
      ? "Home"
      : pathname === "/pdp-studio/ai-tools"
        ? "AI Tools"
      : pathname.includes("/tools/")
        ? "AI Tools"
        : pathname
            .split("/")
            .filter(Boolean)
            .at(-1)
            ?.replaceAll("-", " ")
            .replace(/\b\w/g, (letter) => letter.toUpperCase()) ?? "PDP Studio";

  return (
    <header className="sticky top-0 z-[var(--z-pdp-sticky)] flex min-h-[var(--size-pdp-topbar)] items-center gap-3 border-b border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface)] px-4 sm:px-6 lg:px-8">
      <PdpStudioButton
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Open navigation"
        onClick={onOpenMobileNav}
        className="size-[var(--size-pdp-control)] p-0 text-[var(--color-pdp-ink)] lg:hidden"
      >
        <PdpStudioUiIcon name="menu" />
      </PdpStudioButton>

      <h1 className="min-w-0 flex-1 truncate text-[1rem] font-medium tracking-[-0.015em] text-[var(--color-pdp-ink)] lg:hidden">
        {title}
      </h1>

      <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-3">
        <PdpStudioButton
          type="button"
          variant="ghost"
          onClick={onOpenSearch}
          className="min-w-0 justify-start gap-2 border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface-soft)] text-left text-[var(--color-pdp-muted)] hover:border-[var(--color-pdp-rule-strong)] hover:bg-white sm:w-[min(42vw,24rem)]"
        >
          <PdpStudioUiIcon name="search" size={17} />
          <span className="hidden flex-1 truncate text-[0.8125rem] font-normal sm:block">Search tools and assets</span>
          <span className="hidden rounded-md border border-[var(--color-pdp-rule)] bg-white px-1.5 py-0.5 text-[0.625rem] md:inline">⌘K</span>
        </PdpStudioButton>
        <div className="hidden h-8 w-px bg-[var(--color-pdp-rule)] sm:block" />
        <div className="flex items-center gap-2 rounded-[var(--radius-pdp-pill)] py-1 pl-1 pr-2">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--color-pdp-accent-soft)] text-[0.75rem] font-medium text-[var(--color-pdp-accent)]">
            {(user?.name || user?.email || "P").trim().charAt(0).toUpperCase()}
          </span>
          <span className="hidden max-w-28 truncate text-[0.75rem] font-medium text-[var(--color-pdp-ink-soft)] xl:block">
            {user?.name || "PrimeStyleAI"}
          </span>
        </div>
      </div>
    </header>
  );
}
