import Link from "next/link";
import type { PdpStudioSidebarGroup, PdpStudioSidebarItem } from "../types";
import { PdpStudioIcon } from "./PdpStudioIcon";

export function PdpStudioSidebar({
  groups,
  selectedNavId,
  onSelectNav,
}: {
  groups: PdpStudioSidebarGroup[];
  selectedNavId: string;
  onSelectNav: (id: string) => void;
}) {
  return (
    <aside className="hidden border-r border-black/10 bg-[#ededee] px-4 py-5 lg:flex lg:flex-col">
      <Link href="/" className="flex items-center gap-2 px-2 text-xl font-bold text-[#171717]">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#171717] text-white">
          <PdpStudioIcon name="layout" className="h-4 w-4" />
        </span>
        PDP Studio
      </Link>

      <nav className="mt-8 flex flex-1 flex-col gap-7">
        {groups.map((group, index) => (
          <div key={group.label ?? `group-${index}`}>
            {group.label ? <p className="px-3 text-xs font-semibold text-black/[0.45]">{group.label}</p> : null}
            <div className="mt-2 space-y-1">
              {group.items.map((item) => (
                <SidebarItem key={item.id} item={item} active={item.id === selectedNavId} onSelectNav={onSelectNav} />
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}

function SidebarItem({
  item,
  active,
  onSelectNav,
}: {
  item: PdpStudioSidebarItem;
  active: boolean;
  onSelectNav: (id: string) => void;
}) {
  const className = `flex h-10 w-full items-center gap-3 rounded-lg px-3 text-left text-sm font-medium transition-colors ${
    active ? "bg-black/[0.08] text-black" : "text-black/[0.68] hover:bg-black/5 hover:text-black"
  }`;
  const content = (
    <>
      <PdpStudioIcon name={item.icon} className="h-4 w-4" />
      <span>{item.label}</span>
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
    <button
      type="button"
      onClick={() => onSelectNav(item.id)}
      className={className}
    >
      {content}
    </button>
  );
}
