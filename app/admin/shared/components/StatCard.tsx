import type { ComponentType, ReactNode } from "react";
import { cn } from "@/app/shared/lib/utils";

type Accent = "blue" | "green" | "purple" | "amber" | "rose" | "neutral";
type Tone = "up" | "down" | "flat";

const accentStyle: Record<Accent, { iconBg: string; iconColor: string }> = {
  blue: { iconBg: "bg-brand-blue-pale", iconColor: "text-brand-blue" },
  green: { iconBg: "bg-admin-status-active-bg", iconColor: "text-admin-status-active-text" },
  purple: { iconBg: "bg-accent-purple-light", iconColor: "text-accent-purple-text" },
  amber: { iconBg: "bg-surface-warning-light", iconColor: "text-warning-text" },
  rose: { iconBg: "bg-admin-status-suspended-bg", iconColor: "text-admin-status-suspended-text" },
  neutral: { iconBg: "bg-admin-muted", iconColor: "text-text-body" },
};

interface Props {
  label: string;
  value: number | string;
  hint?: ReactNode;
  icon?: ComponentType<{ size?: number; color?: string; className?: string }>;
  accent?: Accent;
  trend?: { value: string; tone: Tone };
}

export function StatCard({ label, value, hint, icon: Icon, accent = "blue", trend }: Props) {
  const a = accentStyle[accent];
  const trendColor =
    trend?.tone === "up"
      ? "text-admin-status-active-text"
      : trend?.tone === "down"
        ? "text-admin-status-suspended-text"
        : "text-text-hint";

  return (
    <div className="bg-admin-surface-card rounded-[var(--radius-admin-card)] shadow-admin-card p-[var(--spacing-admin-card)] flex flex-col gap-[var(--spacing-admin-gap-md)] max-lg:rounded-2xl max-lg:p-4 max-lg:gap-3">
      <div className="flex items-start justify-between gap-[var(--spacing-admin-gap-sm)]">
        <span className="text-admin-xs font-medium text-text-hint uppercase tracking-wider max-lg:text-[11px]">
          {label}
        </span>
        {Icon && (
          <span
            className={cn(
              "flex items-center justify-center h-[1.563vw] w-[1.563vw] rounded-[0.417vw] max-lg:h-7 max-lg:w-7 max-lg:rounded-lg shrink-0",
              a.iconBg,
            )}
          >
            <Icon
              size={14}
              className={cn("!w-[0.833vw] !h-[0.833vw] max-lg:!w-4 max-lg:!h-4", a.iconColor)}
              color="currentColor"
            />
          </span>
        )}
      </div>
      <div className="flex items-end justify-between gap-[var(--spacing-admin-gap-sm)]">
        <span className="text-admin-2xl font-semibold text-text-primary tracking-tight leading-none max-lg:text-2xl">
          {typeof value === "number" ? value.toLocaleString() : value}
        </span>
        {trend && (
          <span className={cn("text-admin-xs font-medium tabular-nums", trendColor)}>
            {trend.value}
          </span>
        )}
      </div>
      {hint && <span className="text-admin-xs text-text-hint max-lg:text-[11px]">{hint}</span>}
    </div>
  );
}
