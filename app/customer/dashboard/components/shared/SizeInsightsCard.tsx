import type { CSSProperties } from "react";
import { CustomerDashboardCard } from "./CustomerDashboardCard";
import { CustomerDashboardEmptyState } from "./CustomerDashboardEmptyState";
import type { CustomerDashboardSizeInsight, CustomerDashboardSizeInsightSize } from "../../types";
import { formatCompactNumber, formatPercent } from "../../utils/formatters";

interface SizeInsightsCardProps {
  insights: CustomerDashboardSizeInsight[];
}

interface SizeBarStyle extends CSSProperties {
  "--customer-size-width": string;
}

function getSizeBarStyle(size: CustomerDashboardSizeInsightSize): SizeBarStyle {
  return { "--customer-size-width": `${Math.max(0, Math.min(100, size.percent))}%` };
}

function getGenderLabel(gender: CustomerDashboardSizeInsight["gender"]): string {
  return gender === "men" ? "Men" : "Women";
}

export function SizeInsightsCard({ insights }: SizeInsightsCardProps) {
  return (
    <CustomerDashboardCard title="Size insights" description="Men and women recommendation behavior">
      {insights.length === 0 ? (
        <CustomerDashboardEmptyState title="No size insights yet" />
      ) : (
        <div className="grid grid-cols-2 gap-[var(--spacing-customer-gap-lg)] max-lg:grid-cols-1 max-lg:gap-[4vw]">
          {insights.map((insight) => (
            <article
              key={insight.gender}
              className="rounded-[0.833vw] border border-customer-border bg-customer-soft/45 p-[var(--spacing-customer-gap-lg)] max-lg:rounded-[4vw] max-lg:p-[4vw]"
            >
              <div className="flex items-start justify-between gap-[var(--spacing-customer-gap-md)]">
                <div>
                  <p className="text-customer-xs font-semibold uppercase tracking-[0.12em] text-brand-blue max-lg:text-[2.8vw]">
                    {getGenderLabel(insight.gender)}
                  </p>
                  <p className="mt-[0.313vw] text-customer-sm text-text-body max-lg:mt-[1vw] max-lg:text-[3.2vw]">
                    {formatCompactNumber(insight.shoppers)} shoppers with size guidance
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-customer-2xl font-semibold tracking-[-0.04em] text-text-primary max-lg:text-[7vw]">
                    {formatPercent(insight.acceptanceRate)}
                  </p>
                  <p className="text-customer-xs text-customer-muted max-lg:text-[3vw]">accepted</p>
                </div>
              </div>

              <div className="mt-[var(--spacing-customer-gap-lg)] grid grid-cols-2 gap-[var(--spacing-customer-gap-md)] max-lg:mt-[4vw] max-lg:gap-[3vw]">
                <div className="rounded-[0.625vw] bg-customer-card p-[var(--spacing-customer-gap-md)] max-lg:rounded-[3vw] max-lg:p-[3vw]">
                  <p className="text-customer-xs uppercase tracking-[0.12em] text-customer-muted max-lg:text-[2.8vw]">
                    Recommendations
                  </p>
                  <p className="mt-[0.313vw] text-customer-lg font-semibold text-text-primary max-lg:mt-[1vw] max-lg:text-[4vw]">
                    {formatCompactNumber(insight.recommendations)}
                  </p>
                </div>
                <div className="rounded-[0.625vw] bg-customer-card p-[var(--spacing-customer-gap-md)] max-lg:rounded-[3vw] max-lg:p-[3vw]">
                  <p className="text-customer-xs uppercase tracking-[0.12em] text-customer-muted max-lg:text-[2.8vw]">
                    Changed size
                  </p>
                  <p className="mt-[0.313vw] text-customer-lg font-semibold text-text-primary max-lg:mt-[1vw] max-lg:text-[4vw]">
                    {formatCompactNumber(insight.changedAfterTryOn)}
                  </p>
                </div>
              </div>

              <div className="mt-[var(--spacing-customer-gap-lg)] flex flex-col gap-[var(--spacing-customer-gap-sm)] max-lg:mt-[4vw] max-lg:gap-[2.5vw]">
                {insight.topSizes.map((size) => (
                  <div key={`${insight.gender}-${size.label}`}>
                    <div className="mb-[0.208vw] flex items-center justify-between text-customer-xs max-lg:mb-[1vw] max-lg:text-[3vw]">
                      <span className="font-medium text-text-primary">Size {size.label}</span>
                      <span className="tabular-nums text-customer-muted">
                        {size.count.toLocaleString()} · {size.percent}%
                      </span>
                    </div>
                    <div className="h-[0.313vw] overflow-hidden rounded-full bg-customer-card max-lg:h-[1.4vw]">
                      <span
                        className="block h-full rounded-full bg-brand-blue [width:var(--customer-size-width)]"
                        style={getSizeBarStyle(size)}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </CustomerDashboardCard>
  );
}
