import type { CSSProperties } from "react";
import { CustomerDashboardCard } from "./CustomerDashboardCard";
import { CustomerDashboardEmptyState } from "./CustomerDashboardEmptyState";
import type { CustomerDashboardFunnelStep } from "../../types";

interface FunnelCardProps {
  steps: CustomerDashboardFunnelStep[];
}

interface FunnelBarStyle extends CSSProperties {
  "--customer-funnel-width": string;
  "--customer-funnel-color": string;
}

const stepColors = [
  "var(--brand-blue)",
  "var(--customer-chart-primary)",
  "var(--customer-chart-secondary)",
  "var(--customer-success-text)",
  "var(--customer-warning-text)",
];

function getStepPercent(count: number, max: number): number {
  if (max <= 0) return 0;
  return Math.min(100, Math.round((count / max) * 100));
}

function getDropFromPrevious(steps: CustomerDashboardFunnelStep[], index: number): number | null {
  if (index === 0) return null;
  const previous = steps[index - 1]?.count ?? 0;
  if (previous <= 0) return null;
  return Math.round(((steps[index]?.count ?? 0) / previous) * 100);
}

function getBarStyle(percent: number, index: number): FunnelBarStyle {
  return {
    "--customer-funnel-width": `${percent}%`,
    "--customer-funnel-color": stepColors[index % stepColors.length] ?? stepColors[0]!,
  };
}

export function FunnelCard({ steps }: FunnelCardProps) {
  const max = steps[0]?.count ?? 0;

  return (
    <CustomerDashboardCard title="Conversion funnel" description="Top-down drop-off">
      {!steps.length || max === 0 ? (
        <CustomerDashboardEmptyState
          title="No customer journey yet"
          description="Events will appear once the SDK starts reporting."
        />
      ) : (
        <ul className="flex flex-col gap-[var(--spacing-customer-gap-md)]">
          {steps.map((step, index) => {
            const percent = getStepPercent(step.count, max);
            const dropFromPrevious = getDropFromPrevious(steps, index);

            return (
              <li key={step.step} className="flex flex-col gap-[0.313vw] max-lg:gap-[1.5vw]">
                <div className="flex items-center justify-between gap-[var(--spacing-customer-gap-md)] text-customer-sm max-lg:text-[3.3vw]">
                  <span className="font-medium text-text-primary">{step.step}</span>
                  <span className="flex items-baseline gap-[var(--spacing-customer-gap-sm)] tabular-nums">
                    <span className="font-semibold text-text-primary">{step.count.toLocaleString()}</span>
                    {dropFromPrevious !== null ? (
                      <span className="text-customer-xs text-customer-muted max-lg:text-[2.8vw]">
                        {dropFromPrevious}% of previous
                      </span>
                    ) : null}
                  </span>
                </div>
                <div className="h-[0.625vw] overflow-hidden rounded-full bg-customer-soft max-lg:h-[2.4vw]">
                  <span
                    className="block h-full rounded-full bg-[var(--customer-funnel-color)] [width:var(--customer-funnel-width)]"
                    style={getBarStyle(percent, index)}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </CustomerDashboardCard>
  );
}
