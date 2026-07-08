import Link from "next/link";
import { ArrowRight, LogIn, Search } from "lucide-react";
import type { PdpStudioUser } from "../shared/pdpStudioAuthService";
import type { PdpStudioSidebarGroup } from "../types";
import { PdpStudioIcon } from "./PdpStudioIcon";

export function PdpStudioHeader({
  user,
  groups,
  selectedNavId,
  onSelectNav,
}: {
  user: PdpStudioUser | null;
  groups: PdpStudioSidebarGroup[];
  selectedNavId: string;
  onSelectNav: (id: string) => void;
}) {
  const navItems = groups.flatMap((group) => group.items);

  return (
    <header className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase text-black/[0.45]">Product image workspace</p>
          <h1 className="mt-1 text-2xl font-semibold text-[#19191b] sm:text-3xl">Home</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden h-10 min-w-[260px] items-center gap-2 rounded-lg bg-black/[0.06] px-3 text-sm text-black/[0.45] sm:flex xl:min-w-[440px]">
            <Search className="h-4 w-4" aria-hidden />
            Search tools, templates, products
          </div>
          {user ? (
            <Link
              href="/try-on-test/pdp-studio"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#2154ef] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#193edc]"
            >
              Open editor
              <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
          ) : (
            <span className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#2154ef] px-4 text-sm font-semibold text-white">
              <LogIn className="h-4 w-4" aria-hidden />
              Sign in
            </span>
          )}
        </div>
      </div>

      <div className="-mx-1 flex gap-2 overflow-x-auto pb-1 lg:hidden">
        {navItems.map((item) => (
          <MobileNavItem key={item.id} item={item} active={item.id === selectedNavId} onSelectNav={onSelectNav} />
        ))}
      </div>
    </header>
  );
}

function MobileNavItem({
  item,
  active,
  onSelectNav,
}: {
  item: PdpStudioSidebarGroup["items"][number];
  active: boolean;
  onSelectNav: (id: string) => void;
}) {
  const className = `inline-flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-sm font-medium ${
    active ? "bg-black text-white" : "bg-white text-black/[0.68]"
  }`;
  const content = (
    <>
      <PdpStudioIcon name={item.icon} className="h-4 w-4" />
      {item.label}
    </>
  );

  if (item.href) {
    return (
      <Link href={item.href} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={() => onSelectNav(item.id)} className={className}>
      {content}
    </button>
  );
}
