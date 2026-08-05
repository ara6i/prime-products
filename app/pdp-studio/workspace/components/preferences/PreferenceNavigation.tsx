"use client";

import type { PdpStudioPreferenceSection } from "../../types";
import { PdpStudioButton } from "../shared/PdpStudioButton";

interface PreferenceNavigationProps {
  sections: PdpStudioPreferenceSection[];
  activeSection: string;
  onSelect: (section: string) => void;
}

export function PreferenceNavigation({
  sections,
  activeSection,
  onSelect,
}: PreferenceNavigationProps) {
  return (
    <aside className="rounded-[var(--radius-pdp-xl)] border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface)] p-[var(--space-pdp-sm)] shadow-[var(--shadow-pdp-card)] lg:sticky lg:top-[calc(var(--size-pdp-topbar)+1.5rem)]">
      {(["account", "space"] as const).map((group) => (
        <section key={group} className="not-first:mt-[var(--space-pdp-lg)]">
          <h2 className="px-[var(--space-pdp-sm)] text-[0.625rem] font-medium uppercase tracking-[0.14em] text-[var(--color-pdp-muted)]">
            {group}
          </h2>
          <div className="mt-[var(--space-pdp-xs)] grid gap-[var(--space-pdp-2xs)]">
            {sections
              .filter((section) => section.group === group)
              .map((section) => (
                <PdpStudioButton
                  key={section.id}
                  type="button"
                  variant="ghost"
                  data-active={activeSection === section.id}
                  onClick={() => onSelect(section.id)}
                  className="justify-start rounded-[var(--radius-pdp-pill)] bg-transparent px-[var(--space-pdp-sm)] font-normal text-[var(--color-pdp-ink-soft)] data-[active=true]:bg-[var(--color-pdp-ink)] data-[active=true]:text-white"
                >
                  {section.label}
                </PdpStudioButton>
              ))}
          </div>
        </section>
      ))}
    </aside>
  );
}
