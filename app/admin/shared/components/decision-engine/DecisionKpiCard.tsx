import type { ComponentType } from "react";
import { cn } from "@/app/shared/lib/utils";

type Accent = "violet" | "amber" | "lime" | "teal" | "rose" | "blue";

const accentStyle: Record<Accent, { bg: string; icon: string }> = {
  violet: { bg: "bg-brand-blue-pale", icon: "text-accent-purple-text" },
  amber: { bg: "bg-surface-warning-light", icon: "text-warning-text" },
  lime: { bg: "bg-admin-status-active-bg", icon: "text-admin-status-active-text" },
  teal: { bg: "bg-brand-blue-pale", icon: "text-brand-blue" },
  rose: { bg: "bg-admin-status-suspended-bg", icon: "text-admin-status-suspended-text" },
  blue: { bg: "bg-brand-blue-pale", icon: "text-brand-blue" },
};

interface Props {
  label: string;
  value: string;
  delta?: { pct: number | null; desiredDirection: "up" | "down" };
  icon: ComponentType<{ className?: string; size?: number }>;
  accent: Accent;
  unavailableHint?: string;
}

export function DecisionKpiCard({ label, value, delta, icon: Icon, accent, unavailableHint }: Props) {
  const a = accentStyle[accent];

  let deltaEl: React.ReactNode = null;
  if (delta && delta.pct !== null) {
    const isGoodDirection =
      (delta.pct > 0 && delta.desiredDirection === "up") ||
      (delta.pct < 0 && delta.desiredDirection === "down");
    const isFlat = delta.pct === 0;
    const sign = delta.pct > 0 ? "+" : "";
    const pillClass = isFlat
      ? "bg-admin-muted text-text-hint"
      : isGoodDirection
        ? "bg-admin-status-active-bg text-admin-status-active-text"
        : "bg-admin-status-suspended-bg text-admin-status-suspended-text";
    deltaEl = (
      <span
        className={cn(
          "inline-flex items-center rounded-full px-[0.417vw] py-[0.104vw] text-admin-xs font-medium max-lg:px-2 max-lg:py-0.5 max-lg:text-[11px]",
          pillClass,
        )}
      >
        {sign}
        {delta.pct.toFixed(1)}% vs. control
      </span>
    );
  } else if (unavailableHint) {
    deltaEl = (
      <span className="text-admin-xs text-text-hint italic max-lg:text-[11px]">
        {unavailableHint}
      </span>
    );
  }

  return (
    <div className="bg-admin-surface-card rounded-[var(--radius-admin-card)] shadow-admin-card p-[var(--spacing-admin-card)] flex items-center gap-[var(--spacing-admin-gap-md)] max-lg:rounded-2xl max-lg:p-4 max-lg:gap-3">
      <span
        className={cn(
          "flex items-center justify-center h-[2.604vw] w-[2.604vw] rounded-[0.521vw] shrink-0 max-lg:h-11 max-lg:w-11 max-lg:rounded-xl",
          a.bg,
        )}
      >
        <Icon className={cn("!w-[1.25vw] !h-[1.25vw] max-lg:!w-5 max-lg:!h-5", a.icon)} size={20} />
      </span>
      <div className="flex flex-col gap-[0.156vw] min-w-0 flex-1">
        <span className="text-admin-xs text-text-body max-lg:text-[11px]">{label}</span>
        <span className="text-admin-2xl font-semibold text-text-primary tracking-tight tabular-nums leading-none max-lg:text-3xl">
          {value}
        </span>
        {deltaEl}
      </div>
    </div>
  );
}
