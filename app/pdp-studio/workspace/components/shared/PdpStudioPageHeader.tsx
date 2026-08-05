import type { ReactNode } from "react";

interface PdpStudioPageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export function PdpStudioPageHeader({
  title,
  description,
  actions,
}: PdpStudioPageHeaderProps) {
  return (
    <header className="flex flex-col gap-[var(--space-pdp-md)] sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className="mb-2 text-[0.6875rem] font-medium uppercase tracking-[0.16em] text-[var(--color-pdp-muted)]">
          PDP Studio · Workspace
        </p>
        <h1 className="min-w-0 font-[family-name:var(--font-pdp-display)] text-[var(--text-pdp-xl)] font-medium leading-[1.08] tracking-[-0.035em] text-[var(--color-pdp-ink)] [overflow-wrap:anywhere]">
          {title}
        </h1>
        {description ? (
          <p className="mt-[var(--space-pdp-xs)] max-w-[65ch] text-[var(--text-pdp-sm)] leading-6 text-[var(--color-pdp-muted)]">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-[var(--space-pdp-xs)]">{actions}</div> : null}
    </header>
  );
}
