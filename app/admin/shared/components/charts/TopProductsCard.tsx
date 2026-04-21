import { Card } from "@/app/admin/shared/components/Card";
import { EmptyState } from "@/app/admin/shared/components/EmptyState";
import type { BehaviorTopProduct } from "@/app/admin/shared/types";

interface Props {
  products: BehaviorTopProduct[];
  title?: string;
  description?: string;
}

export function TopProductsCard({
  products,
  title = "Most tried products",
  description = "Ranked by try-on count",
}: Props) {
  if (products.length === 0) {
    return (
      <Card title={title} description={description}>
        <EmptyState
          title="No product data yet"
          description="Products will appear here once the SDK sends productId with each try-on."
        />
      </Card>
    );
  }

  const max = products[0]?.tryOns ?? 1;

  return (
    <Card title={title} description={description} bodyClassName="!p-0 !pt-0">
      <ul className="divide-y divide-admin-border-soft">
        {products.map((p, idx) => {
          const pct = Math.min(100, Math.round((p.tryOns / max) * 100));
          return (
            <li
              key={p.productId}
              className="flex items-center gap-[var(--spacing-admin-gap-md)] px-[var(--spacing-admin-card)] py-[var(--spacing-admin-gap-md)]"
            >
              <span className="text-admin-xs font-medium text-text-hint w-[1.25vw] tabular-nums max-lg:w-5 max-lg:text-[11px]">
                {idx + 1}
              </span>
              <div className="flex flex-col gap-[0.208vw] min-w-0 flex-1">
                <span className="text-admin-sm font-medium text-text-primary truncate">
                  {p.productTitle}
                </span>
                <div className="h-[0.208vw] rounded-full bg-admin-muted overflow-hidden max-lg:h-1">
                  <span
                    className="block h-full bg-brand-blue rounded-full"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
              <span className="text-admin-sm font-medium text-text-primary tabular-nums shrink-0">
                {p.tryOns.toLocaleString()}
              </span>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
