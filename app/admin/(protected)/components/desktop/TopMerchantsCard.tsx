import Link from "next/link";
import { Card } from "@/app/admin/shared/components/Card";
import { EmptyState } from "@/app/admin/shared/components/EmptyState";
import { StatusPill } from "@/app/admin/shared/components/StatusPill";
import type { TopMerchant } from "@/app/admin/shared/types";

interface Props {
  merchants: TopMerchant[];
}

export function TopMerchantsCard({ merchants }: Props) {
  if (merchants.length === 0) {
    return (
      <Card title="Top merchants" description="Highest try-on usage">
        <EmptyState title="No try-on activity yet" />
      </Card>
    );
  }

  const max = merchants[0]?.tryOnsUsed ?? 1;

  return (
    <Card
      title="Top merchants"
      description="Highest try-on usage"
      bodyClassName="!pt-0 !p-0"
    >
      <ul className="divide-y divide-admin-border-soft">
        {merchants.map((m, idx) => {
          const display = m.shopName || m.shopDomain;
          const pct = Math.min(100, Math.round(((m.tryOnsUsed || 0) / max) * 100));
          return (
            <li key={m.id}>
              <Link
                href={`/admin/stores/shopify/${m.id}`}
                className="flex items-center gap-[var(--spacing-admin-gap-md)] px-[var(--spacing-admin-card)] py-[var(--spacing-admin-gap-md)] hover:bg-admin-row-hover transition-colors"
              >
                <span className="text-admin-xs font-medium text-text-hint w-[1.25vw] tabular-nums max-lg:w-5 max-lg:text-[11px]">
                  {idx + 1}
                </span>
                <div className="flex flex-col gap-[0.208vw] min-w-0 flex-1">
                  <div className="flex items-center gap-[var(--spacing-admin-gap-sm)]">
                    <span className="text-admin-sm font-medium text-text-primary truncate">
                      {display}
                    </span>
                    <StatusPill status={m.status} size="sm" />
                  </div>
                  <div className="h-[0.208vw] rounded-full bg-admin-muted overflow-hidden max-lg:h-1">
                    <span
                      className="block h-full bg-brand-blue rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
                <span className="text-admin-sm font-medium text-text-primary tabular-nums shrink-0">
                  {m.tryOnsUsed.toLocaleString()}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
