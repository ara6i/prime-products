import type { ReactNode } from "react";

interface PdpStudioPageHeaderProps {
  title: string;
  description: string;
  actions?: ReactNode;
}

export function PdpStudioPageHeader({
  title,
  description,
  actions,
}: PdpStudioPageHeaderProps) {
  return (
    <header className="flex flex-col gap-[var(--space-pdp-md)] border-b border-[var(--color-pdp-rule)] pb-[var(--space-pdp-lg)] sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="min-w-0 font-[family-name:var(--font-pdp-display)] text-[var(--text-pdp-xl)] font-bold leading-tight tracking-[-0.025em] text-[var(--color-pdp-ink)] [overflow-wrap:anywhere]">
          {title}
        </h1>
        <p className="mt-[var(--space-pdp-xs)] max-w-[65ch] text-[var(--text-pdp-sm)] leading-relaxed text-[var(--color-pdp-muted)]">
          {description}
        </p>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-[var(--space-pdp-xs)]">{actions}</div> : null}
    </header>
  );
}
