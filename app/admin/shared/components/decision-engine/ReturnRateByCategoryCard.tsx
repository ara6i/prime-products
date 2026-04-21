import { Card } from "@/app/admin/shared/components/Card";
import { EmptyState } from "@/app/admin/shared/components/EmptyState";
import type { DecisionCategoryRow } from "@/app/admin/shared/types";

interface Props {
  available: boolean;
  rows: DecisionCategoryRow[];
}

export function ReturnRateByCategoryCard({ available, rows }: Props) {
  if (!available || rows.length === 0) {
    return (
      <Card title="Return Rate by Category" description="Treatment vs control per category">
        <EmptyState
          title="Category data not yet available"
          description="Enable by caching Shopify product categories via the Admin API. Numbers populate the moment categories are mapped."
        />
      </Card>
    );
  }

  const max = rows.reduce((m, r) => Math.max(m, r.treatment, r.control ?? 0), 0.01);

  return (
    <Card title="Return Rate by Category" description="Treatment vs control">
      <ul className="flex flex-col gap-[var(--spacing-admin-gap-md)]">
        {rows.map((r) => {
          const treatmentPct = (r.treatment / max) * 100;
          const controlPct = ((r.control ?? 0) / max) * 100;
          return (
            <li key={r.category} className="grid grid-cols-[5.5vw_1fr] items-center gap-[var(--spacing-admin-gap-md)]">
              <span className="text-admin-sm text-text-primary font-medium">{r.category}</span>
              <div className="flex flex-col gap-[0.208vw]">
                <Bar
                  color="var(--admin-border)"
                  pctWidth={controlPct}
                  value={`${(r.control ?? 0).toFixed(1)}%`}
                  label="control"
                />
                <Bar
                  color="var(--admin-chart-2)"
                  pctWidth={treatmentPct}
                  value={`${r.treatment.toFixed(1)}%`}
                  label="with engine"
                />
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function Bar({
  color,
  pctWidth,
  value,
  label,
}: {
  color: string;
  pctWidth: number;
  value: string;
  label: string;
}) {
  return (
    <div className="flex items-center gap-[0.417vw]">
      <div className="flex-1 h-[0.625vw] rounded-full bg-admin-muted overflow-hidden max-lg:h-2">
        <span
          className="block h-full rounded-full"
          style={{ width: `${Math.min(100, pctWidth)}%`, background: color }}
        />
      </div>
      <span className="text-admin-xs text-text-body tabular-nums w-[3vw] text-right max-lg:w-12 max-lg:text-[11px]">
        {value}
      </span>
      <span className="text-[0.573vw] text-text-hint w-[4vw] max-lg:w-14 max-lg:text-[10px]">
        {label}
      </span>
    </div>
  );
}
