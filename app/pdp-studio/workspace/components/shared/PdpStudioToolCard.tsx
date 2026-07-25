import Link from "next/link";
import type { PdpStudioToolDefinition } from "../../types";
import { PdpStudioUiIcon } from "./PdpStudioUiIcon";

interface PdpStudioToolCardProps {
  tool: PdpStudioToolDefinition;
  compact?: boolean;
}

export function PdpStudioToolCard({
  tool,
  compact = false,
}: PdpStudioToolCardProps) {
  return (
    <Link
      href={tool.href}
      className={[
        "group relative flex min-w-0 flex-col border border-[var(--color-pdp-rule)] bg-[var(--color-pdp-surface)] text-[var(--color-pdp-ink)] outline-none",
        "transition-[background-color,transform] duration-[var(--dur-pdp-short)] ease-[var(--ease-pdp-out)]",
        "hover:-translate-y-px hover:bg-[var(--color-pdp-surface-soft)]",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-pdp-focus)]",
        compact
          ? "min-h-[4.25rem] rounded-[var(--radius-pdp-md)] p-2.5"
          : "min-h-[10rem] rounded-[var(--radius-pdp-lg)] p-[var(--space-pdp-lg)]",
      ].join(" ")}
    >
      <div className="flex items-start justify-between gap-[var(--space-pdp-sm)]">
        <span className="grid size-[2.5rem] place-items-center rounded-[var(--radius-pdp-sm)] bg-[var(--color-pdp-accent-soft)] text-[var(--color-pdp-accent)]">
          <PdpStudioUiIcon name={tool.icon} />
        </span>
        {tool.badge ? (
          <span className="rounded-[var(--radius-pdp-pill)] bg-[var(--color-pdp-ink)] px-[var(--space-pdp-xs)] py-[var(--space-pdp-3xs)] text-[var(--text-pdp-xs)] font-semibold text-[var(--color-pdp-surface)]">
            {tool.badge}
          </span>
        ) : null}
      </div>
      <h3 className={compact ? "mt-2 text-sm font-bold leading-tight" : "mt-[var(--space-pdp-md)] text-[var(--text-pdp-md)] font-bold leading-tight"}>
        {tool.label}
      </h3>
      {!compact ? (
        <p className="mt-[var(--space-pdp-xs)] line-clamp-2 text-[var(--text-pdp-sm)] leading-relaxed text-[var(--color-pdp-muted)]">
          {tool.description}
        </p>
      ) : null}
      {!compact ? (
        <span className="mt-auto flex items-center gap-[var(--space-pdp-xs)] pt-[var(--space-pdp-md)] text-[var(--text-pdp-xs)] font-semibold text-[var(--color-pdp-accent)]">
          Open
          <PdpStudioUiIcon
            name="arrow"
            className="transition-transform duration-[var(--dur-pdp-micro)] ease-[var(--ease-pdp-out)] group-hover:translate-x-0.5"
          />
        </span>
      ) : null}
    </Link>
  );
}
