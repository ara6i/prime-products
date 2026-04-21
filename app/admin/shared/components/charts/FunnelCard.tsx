import { Card } from "@/app/admin/shared/components/Card";
import { EmptyState } from "@/app/admin/shared/components/EmptyState";
import type { BehaviorFunnelStep } from "@/app/admin/shared/types";

interface Props {
  steps: BehaviorFunnelStep[];
  title?: string;
  description?: string;
}

const stepColors = [
  "var(--admin-chart-1)",
  "var(--admin-chart-2)",
  "var(--admin-chart-4)",
  "var(--admin-chart-3)",
  "var(--admin-chart-5)",
];

export function FunnelCard({ steps, title = "Customer journey", description = "Try-on → Cart" }: Props) {
  if (!steps.length || steps[0]!.count === 0) {
    return (
      <Card title={title} description={description}>
        <EmptyState title="No customer journey yet" description="Events will appear once the SDK starts reporting." />
      </Card>
    );
  }

  const max = steps[0]!.count || 1;

  return (
    <Card title={title} description={description}>
      <ul className="flex flex-col gap-[var(--spacing-admin-gap-md)]">
        {steps.map((s, i) => {
          const pct = Math.round((s.count / max) * 100);
          const dropFromPrev =
            i > 0 && steps[i - 1]!.count > 0
              ? Math.round((s.count / steps[i - 1]!.count) * 100)
              : null;
          return (
            <li key={s.step} className="flex flex-col gap-[0.208vw]">
              <div className="flex items-center justify-between text-admin-sm">
                <span className="text-text-primary font-medium">{s.step}</span>
                <span className="flex items-baseline gap-[0.521vw] tabular-nums">
                  <span className="text-text-primary font-semibold">{s.count.toLocaleString()}</span>
                  {dropFromPrev !== null && (
                    <span className="text-[0.625vw] text-text-hint">
                      {dropFromPrev}% of previous
                    </span>
                  )}
                </span>
              </div>
              <div className="h-[0.521vw] rounded-full bg-admin-muted overflow-hidden">
                <span
                  className="block h-full rounded-full transition-all"
                  style={{
                    width: `${pct}%`,
                    background: stepColors[i % stepColors.length],
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
