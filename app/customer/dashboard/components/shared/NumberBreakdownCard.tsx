import type { CSSProperties } from "react";
import { CustomerDashboardCard } from "./CustomerDashboardCard";
import { CustomerDashboardEmptyState } from "./CustomerDashboardEmptyState";
import type { CustomerDashboardNumberSection } from "../../types";

interface NumberBreakdownCardProps {
  section: CustomerDashboardNumberSection;
}

interface NumberBarStyle extends CSSProperties {
  "--customer-number-width": string;
}

function getNumberBarStyle(percent: number): NumberBarStyle {
  return { "--customer-number-width": `${Math.max(0, Math.min(100, percent))}%` };
}

export function NumberBreakdownCard({ section }: NumberBreakdownCardProps) {
  return (
    <CustomerDashboardCard
      title={section.title}
      description={section.description}
      bodyClassName={section.rows.length > 0 ? "!p-0 !pt-[var(--spacing-customer-card)]" : undefined}
    >
      {section.rows.length === 0 ? (
        <CustomerDashboardEmptyState title="No numbers yet" />
      ) : (
        <ul className="divide-y divide-customer-border">
          {section.rows.map((row) => (
            <li
              key={`${section.title}-${row.label}`}
              className="grid grid-cols-[1fr_auto] gap-[var(--spacing-customer-gap-md)] px-[var(--spacing-customer-card)] py-[var(--spacing-customer-gap-md)]"
            >
              <div className="min-w-0">
                <div className="truncate text-customer-sm font-medium capitalize text-text-primary max-lg:text-[3.4vw]">
                  {row.label}
                </div>
                <div className="mt-[0.208vw] h-[0.208vw] overflow-hidden rounded-full bg-customer-soft max-lg:mt-[1vw] max-lg:h-[1vw]">
                  <span
                    className="block h-full rounded-full bg-brand-blue [width:var(--customer-number-width)]"
                    style={getNumberBarStyle(row.percent)}
                  />
                </div>
              </div>
              <div className="text-right tabular-nums">
                <div className="text-customer-sm font-semibold text-text-primary max-lg:text-[3.4vw]">
                  {row.value}
                </div>
                <div className="mt-[0.104vw] text-customer-xs text-customer-muted max-lg:mt-[0.5vw] max-lg:text-[3vw]">
                  {row.detail}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </CustomerDashboardCard>
  );
}
