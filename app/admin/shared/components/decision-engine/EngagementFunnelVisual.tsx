import { Card } from "@/app/admin/shared/components/Card";
import type { DecisionFunnelStep } from "@/app/admin/shared/types";

interface Props {
  steps: DecisionFunnelStep[];
}

// A top-down trapezoid shape: each step is rendered as a horizontal
// trapezoid that gets narrower as the percentage drops. Colors cycle
// through our admin-chart tokens from brand to success.
const stepColors = [
  "var(--admin-chart-2)", // purple
  "var(--admin-chart-1)", // blue
  "#4CC4C1", // teal accent
  "var(--admin-chart-3)", // green (purchase)
];

export function EngagementFunnelVisual({ steps }: Props) {
  // Determine the widths: anchor the first step at 100% and compute
  // subsequent widths as pct of step 1.
  const anchor = steps[0]?.pct ?? 100;
  const widths = steps.map((s) => {
    if (!s.available || s.pct === null) return null;
    if (anchor === 0) return 0;
    return Math.max(12, Math.min(100, (s.pct / anchor) * 100));
  });

  return (
    <Card title="Engagement Funnel" description="Shopper journey through the Decision Engine">
      <div className="flex flex-col gap-[var(--spacing-admin-gap-sm)]">
        {steps.map((s, i) => {
          const w = widths[i];
          const color = stepColors[i] ?? "var(--admin-chart-1)";
          return (
            <div key={s.step} className="flex items-center gap-[var(--spacing-admin-gap-md)]">
              <div className="flex-1 relative h-[2.083vw] max-lg:h-10 flex items-center justify-center">
                {w === null ? (
                  <div
                    className="w-full h-full rounded-[0.313vw] border border-dashed border-admin-border text-admin-xs text-text-hint flex items-center justify-center max-lg:text-[11px] max-lg:rounded-md"
                  >
                    Not available
                  </div>
                ) : (
                  <div
                    className="h-full rounded-[0.313vw] flex items-center justify-center transition-all max-lg:rounded-md"
                    style={{
                      width: `${w}%`,
                      background: color,
                      boxShadow: "inset 0 -1px 0 rgba(0,0,0,0.05)",
                    }}
                  >
                    <span className="text-white text-admin-xs font-semibold max-lg:text-[11px]">
                      {s.pct !== null ? `${s.pct.toFixed(1)}%` : ""}
                    </span>
                  </div>
                )}
              </div>
              <div className="w-[7vw] flex flex-col max-lg:w-28">
                <span className="text-admin-sm font-medium text-text-primary max-lg:text-sm">
                  {s.step}
                </span>
                <span className="text-admin-xs text-text-hint tabular-nums max-lg:text-[11px]">
                  {s.count !== null ? s.count.toLocaleString() : "—"}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
