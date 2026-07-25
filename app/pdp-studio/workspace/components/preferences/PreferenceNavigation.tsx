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
    <aside className="rounded-[var(--radius-pdp-lg)] border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface)] p-[var(--space-pdp-sm)]">
      {(["account", "space"] as const).map((group) => (
        <section key={group} className="not-first:mt-[var(--space-pdp-lg)]">
          <h2 className="px-[var(--space-pdp-sm)] text-[var(--text-pdp-xs)] font-semibold capitalize text-[var(--color-pdp-muted)]">
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
                  className="justify-start bg-transparent px-[var(--space-pdp-sm)] text-[var(--color-pdp-ink-soft)] data-[active=true]:bg-[var(--color-pdp-accent-soft)] data-[active=true]:text-[var(--color-pdp-accent)]"
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
