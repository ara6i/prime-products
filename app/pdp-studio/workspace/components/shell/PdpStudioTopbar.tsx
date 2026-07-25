"use client";

import { usePathname } from "next/navigation";
import { PdpStudioButton } from "../shared/PdpStudioButton";
import { PdpStudioUiIcon } from "../shared/PdpStudioUiIcon";

interface PdpStudioTopbarProps {
  onOpenSearch: () => void;
  onOpenMobileNav: () => void;
}

export function PdpStudioTopbar({
  onOpenSearch,
  onOpenMobileNav,
}: PdpStudioTopbarProps) {
  const pathname = usePathname();
  const title =
    pathname === "/pdp-studio"
      ? "Home"
      : pathname.includes("/tools/")
        ? "AI Tools"
        : pathname
            .split("/")
            .filter(Boolean)
            .at(-1)
            ?.replaceAll("-", " ")
            .replace(/\b\w/g, (letter) => letter.toUpperCase()) ?? "PDP Studio";

  return (
    <header className="sticky top-0 z-[var(--z-pdp-sticky)] flex min-h-[var(--size-pdp-topbar)] items-center gap-3 bg-[var(--color-pdp-surface)] px-4 lg:px-8">
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

      <h1 className="min-w-0 flex-1 truncate text-[1.5rem] font-semibold tracking-[-0.025em] text-[var(--color-pdp-ink)]">
        {title}
      </h1>

      <PdpStudioButton
        type="button"
        variant="ghost"
        onClick={onOpenSearch}
        className="min-w-0 justify-start gap-2 border-0 bg-[var(--color-pdp-surface-soft)] text-left text-[var(--color-pdp-muted)] hover:bg-[var(--color-pdp-surface-soft)] sm:w-[min(38vw,30rem)]"
      >
        <PdpStudioUiIcon name="search" />
        <span className="hidden truncate text-[0.875rem] font-normal sm:block">
          Search a template
        </span>
      </PdpStudioButton>
    </header>
  );
}
