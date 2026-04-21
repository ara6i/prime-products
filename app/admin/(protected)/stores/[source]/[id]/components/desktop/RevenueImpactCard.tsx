import { Card } from "@/app/admin/shared/components/Card";
import { EmptyState } from "@/app/admin/shared/components/EmptyState";
import type { RevenueOverview } from "@/app/admin/shared/types";

interface Props {
  data: RevenueOverview | null;
}

function formatMoney(n: number, currency: string): string {
  const absValue = Math.abs(n);
  const formatter = new Intl.NumberFormat(undefined, {
    style: "currency",
    currency,
    maximumFractionDigits: absValue >= 1000 ? 0 : 2,
  });
  try {
    return formatter.format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}

export function RevenueImpactCard({ data }: Props) {
  if (!data || data.orders.total === 0) {
    return (
      <Card title="Revenue impact" description="Try-on attribution to real orders">
        <EmptyState
          title="No orders in range yet"
          description="Once the Shopify order webhooks fire, attributed revenue shows up here."
        />
      </Card>
    );
  }

  const c = data.currency;
  const attributionPct =
    data.orders.paidRevenue > 0
      ? Math.round((data.attribution.attributedPaidRevenue / data.orders.paidRevenue) * 100)
      : 0;
  const conversionPct = Math.round(data.attribution.conversionRate * 100 * 10) / 10; // 1 decimal

  return (
    <Card
      title="Revenue impact"
      description={`Last ${data.range.days} days · attributed via try-on sessions`}
      bodyClassName="!pt-0"
    >
      <div className="grid grid-cols-4 gap-[var(--spacing-admin-gap-lg)] pt-[var(--spacing-admin-gap-md)] pb-[var(--spacing-admin-gap-lg)] border-b border-admin-border-soft">
        <Metric
          label="Attributed revenue"
          value={formatMoney(data.attribution.attributedPaidRevenue, c)}
          hint={`${attributionPct}% of paid revenue`}
          accent="green"
        />
        <Metric
          label="Attributed orders"
          value={data.attribution.attributedPaidOrders.toString()}
          hint={`${data.orders.paid.toLocaleString()} total paid`}
          accent="blue"
        />
        <Metric
          label="Try-on → purchase"
          value={`${conversionPct}%`}
          hint={`of ${data.attribution.completedTryOns.toLocaleString()} completed try-ons`}
          accent="purple"
        />
        <Metric
          label="Refund rate"
          value={`${Math.round(data.refundRate * 100 * 10) / 10}%`}
          hint={`${formatMoney(data.orders.refundedAmount, c)} refunded`}
          accent={data.refundRate > 0.1 ? "rose" : "neutral"}
        />
      </div>

      <div className="pt-[var(--spacing-admin-gap-md)]">
        <div className="text-admin-xs font-medium text-text-hint uppercase tracking-wider mb-[var(--spacing-admin-gap-sm)]">
          Top products by attributed revenue
        </div>
        {data.topProductsByRevenue.length === 0 ? (
          <div className="text-admin-sm text-text-hint">No product revenue yet.</div>
        ) : (
          <ul className="flex flex-col gap-[var(--spacing-admin-gap-sm)]">
            {data.topProductsByRevenue.slice(0, 5).map((p, idx) => (
              <li
                key={p.productId}
                className="flex items-center gap-[var(--spacing-admin-gap-md)]"
              >
                <span className="text-admin-xs font-medium text-text-hint w-[1.25vw] tabular-nums">
                  {idx + 1}
                </span>
                <span className="text-admin-sm font-medium text-text-primary truncate flex-1">
                  {p.title}
                </span>
                <span className="text-admin-xs text-text-hint tabular-nums">
                  {p.orders} {p.orders === 1 ? "order" : "orders"}
                </span>
                <span className="text-admin-sm font-semibold text-text-primary tabular-nums">
                  {formatMoney(p.revenue, c)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}

function Metric({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string;
  hint?: string;
  accent: "blue" | "green" | "purple" | "rose" | "neutral";
}) {
  const accentClass = {
    blue: "text-brand-blue",
    green: "text-admin-status-active-text",
    purple: "text-accent-purple-text",
    rose: "text-admin-status-suspended-text",
    neutral: "text-text-primary",
  }[accent];

  return (
    <div className="flex flex-col gap-[0.208vw]">
      <span className="text-admin-xs font-medium text-text-hint uppercase tracking-wider">
        {label}
      </span>
      <span className={`text-admin-xl font-semibold tabular-nums leading-none ${accentClass}`}>
        {value}
      </span>
      {hint && <span className="text-admin-xs text-text-hint">{hint}</span>}
    </div>
  );
}
