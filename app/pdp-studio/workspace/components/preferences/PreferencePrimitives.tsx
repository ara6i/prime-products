"use client";

import type { ReactNode } from "react";
import { PdpStudioButton } from "../shared/PdpStudioButton";
import { PdpStudioUiIcon } from "../shared/PdpStudioUiIcon";

export function PreferenceCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[var(--radius-pdp-xl)] border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface)] p-4 shadow-[var(--shadow-pdp-card)] sm:p-6">
      <h2 className="text-[var(--text-pdp-lg)] font-medium">{title}</h2>
      {description ? (
        <p className="mt-[var(--space-pdp-xs)] text-[var(--text-pdp-sm)] leading-relaxed text-[var(--color-pdp-muted)]">{description}</p>
      ) : null}
      <div className="mt-[var(--space-pdp-lg)]">{children}</div>
    </section>
  );
}

export function SavedIndicator({ visible }: { visible: boolean }) {
  return visible ? (
    <span role="status" className="flex items-center gap-[var(--space-pdp-xs)] text-[var(--text-pdp-sm)] font-semibold text-[var(--color-pdp-success)]">
      <PdpStudioUiIcon name="check" />
      Saved in this tab
    </span>
  ) : null;
}

export function ToggleRow({
  label,
  description,
  checked,
  onToggle,
}: {
  label: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-[var(--space-pdp-lg)] border-b border-[var(--color-pdp-rule)] py-[var(--space-pdp-md)] last:border-b-0">
      <div>
        <h3 className="text-[var(--text-pdp-sm)] font-medium">{label}</h3>
        <p className="mt-[var(--space-pdp-2xs)] max-w-[60ch] text-[var(--text-pdp-xs)] leading-relaxed text-[var(--color-pdp-muted)]">{description}</p>
      </div>
      <PdpStudioButton
        type="button"
        variant="ghost"
        role="switch"
        aria-checked={checked}
        onClick={onToggle}
        className="min-h-[2rem] min-w-[3.5rem] shrink-0 rounded-[var(--radius-pdp-pill)] bg-[var(--color-pdp-rule)] p-[0.2rem] data-[state=on]:bg-[var(--color-pdp-accent)]"
        data-state={checked ? "on" : "off"}
      >
        <span className={["block size-[1.5rem] rounded-[var(--radius-pdp-pill)] bg-[var(--color-pdp-surface)] transition-transform duration-[var(--dur-pdp-micro)] ease-[var(--ease-pdp-in-out)]", checked ? "translate-x-[0.75rem]" : "-translate-x-[0.75rem]"].join(" ")} />
      </PdpStudioButton>
    </div>
  );
}
