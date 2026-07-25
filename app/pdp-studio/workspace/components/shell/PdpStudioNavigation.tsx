"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { PdpStudioNavGroup, PdpStudioOverlayId } from "../../types";
import { usePdpStudioNavigationUi } from "../../hooks/usePdpStudioNavigationUi";
import { PdpStudioUiIcon } from "../shared/PdpStudioUiIcon";
import { PdpStudioButton } from "../shared/PdpStudioButton";

interface PdpStudioNavigationProps {
  groups: PdpStudioNavGroup[];
  onOpenOverlay: (overlay: PdpStudioOverlayId) => void;
  onNavigate?: () => void;
  compact?: boolean;
}

export function PdpStudioNavigation({
  groups,
  onOpenOverlay,
  onNavigate,
  compact = false,
}: PdpStudioNavigationProps) {
  const pathname = usePathname();
  const ui = usePdpStudioNavigationUi();

  return (
    <nav aria-label="PDP Studio" className="flex min-h-0 flex-1 flex-col gap-5 overflow-x-hidden overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {groups.map((group, groupIndex) => (
        <section
          key={group.label ?? `primary-${groupIndex}`}
          className={group.label === "Workspace" ? "mt-auto" : ""}
        >
          {group.label && group.label !== "Workspace" ? (
            <PdpStudioButton
              type="button"
              variant="ghost"
              aria-expanded={ui.expandedGroup === group.label}
              onClick={() => ui.toggleGroup(group.label!)}
              className="min-h-[2.5rem] w-full justify-start gap-3 rounded-[var(--radius-pdp-sm)] bg-transparent px-3 text-[0.8125rem] font-normal text-[var(--color-pdp-muted)] hover:bg-[var(--color-pdp-surface-soft)]"
            >
              <span>{group.label}</span>
              <PdpStudioUiIcon
                name="chevron"
                size={14}
                className={[
                  "ml-auto transition-transform duration-[var(--dur-pdp-short)]",
                  ui.expandedGroup === group.label ? "rotate-180" : "",
                ].join(" ")}
              />
            </PdpStudioButton>
          ) : group.label === "Workspace" ? (
            <h2 className="sr-only">{group.label}</h2>
          ) : null}
          <div
            className={[
              group.label && group.label !== "Workspace" ? "mt-1" : "",
              "grid gap-0.5",
              group.label &&
              group.label !== "Workspace" &&
              ui.expandedGroup !== group.label
                ? "hidden"
                : "",
            ].join(" ")}
          >
            {(group.label === "Workspace" ? group.actions ?? [] : []).map((item) => (
              <PdpStudioButton
                key={item.id}
                type="button"
                variant="ghost"
                onClick={() => onOpenOverlay(item.id)}
                className="min-h-[2.5rem] justify-start gap-3 rounded-[var(--radius-pdp-sm)] bg-transparent px-3 text-[0.875rem] font-normal text-[var(--color-pdp-ink-soft)] hover:bg-[var(--color-pdp-surface-soft)] hover:text-[var(--color-pdp-ink)]"
              >
                <PdpStudioUiIcon name={item.icon} size={20} />
                <span className={compact ? "truncate" : ""}>{item.label}</span>
              </PdpStudioButton>
            ))}
            {(group.routes ?? []).map((item) => {
              const active =
                item.href === "/pdp-studio"
                  ? pathname === item.href
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={[
                    "flex min-h-[2.5rem] items-center gap-3 rounded-[var(--radius-pdp-sm)] px-3",
                    "whitespace-nowrap text-[0.875rem] font-normal outline-none",
                    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-pdp-focus)]",
                    active
                      ? "bg-[var(--color-pdp-accent-soft)] text-[var(--color-pdp-accent-strong)]"
                      : "text-[var(--color-pdp-ink-soft)] hover:bg-[var(--color-pdp-surface-soft)] hover:text-[var(--color-pdp-ink)]",
                  ].join(" ")}
                >
                  <PdpStudioUiIcon name={item.icon} size={20} />
                  <span className="min-w-0 flex-1 truncate">{item.label}</span>
                  {item.badge ? (
                    <span className="rounded bg-[var(--color-pdp-ink)] px-1.5 py-0.5 text-[0.5625rem] font-semibold text-white">
                      {item.badge}
                    </span>
                  ) : null}
                </Link>
              );
            })}
            {(group.label === "Workspace" ? [] : group.actions ?? []).map((item) => (
              <PdpStudioButton
                key={item.id}
                type="button"
                variant="ghost"
                onClick={() => onOpenOverlay(item.id)}
                className="min-h-[2.5rem] justify-start gap-3 rounded-[var(--radius-pdp-sm)] bg-transparent px-3 text-[0.875rem] font-normal text-[var(--color-pdp-ink-soft)] hover:bg-[var(--color-pdp-surface-soft)] hover:text-[var(--color-pdp-ink)]"
              >
                <PdpStudioUiIcon name={item.icon} size={20} />
                <span className={compact ? "truncate" : ""}>{item.label}</span>
              </PdpStudioButton>
            ))}
          </div>
        </section>
      ))}
    </nav>
  );
}
