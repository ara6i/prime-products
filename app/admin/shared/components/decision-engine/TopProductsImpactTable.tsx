import { Card } from "@/app/admin/shared/components/Card";
import { EmptyState } from "@/app/admin/shared/components/EmptyState";
import type { DecisionTopProduct } from "@/app/admin/shared/types";

interface Props {
  products: DecisionTopProduct[];
}

function fmtPct(n: number | null): string {
  if (n === null) return "—";
  return `${n.toFixed(1)}%`;
}

export function TopProductsImpactTable({ products }: Props) {
  if (products.length === 0) {
    return (
      <Card title="Top Products by Impact" description="Ranked by try-on volume">
        <EmptyState title="No product data yet" description="Products appear once try-ons carry productId." />
      </Card>
    );
  }

  const thClass =
    "py-[0.521vw] px-[0.625vw] text-[0.573vw] font-semibold tracking-[0.06em] text-text-hint uppercase text-left whitespace-nowrap";
  const tdClass = "py-[0.521vw] px-[0.625vw] text-admin-sm text-text-body align-middle";

  return (
    <Card title="Top Products by Impact" description="Ranked by try-on volume" bodyClassName="!pt-0 !p-0">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-t border-admin-border-soft">
            <th className={`${thClass} pl-[var(--spacing-admin-card)]`}>Product</th>
            <th className={`${thClass} text-right`}>Try-Ons</th>
            <th className={`${thClass} text-right`}>Conversion Lift</th>
            <th className={`${thClass} text-right pr-[var(--spacing-admin-card)]`}>Return Rate</th>
          </tr>
        </thead>
        <tbody>
          {products.map((p) => {
            const initial = (p.productTitle || "?").trim().charAt(0).toUpperCase();
            return (
              <tr key={p.productId} className="border-t border-admin-border-soft">
                <td className={`${tdClass} pl-[var(--spacing-admin-card)]`}>
                  <div className="flex items-center gap-[var(--spacing-admin-gap-md)] min-w-0">
                    <span className="flex h-[2.083vw] w-[2.083vw] shrink-0 items-center justify-center rounded-[0.417vw] bg-brand-blue-pale text-brand-blue text-admin-sm font-semibold max-lg:h-10 max-lg:w-10 max-lg:rounded-xl">
                      {initial}
                    </span>
                    <span className="text-admin-sm font-medium text-text-primary truncate max-lg:text-sm">
                      {p.productTitle}
                    </span>
                  </div>
                </td>
                <td className={`${tdClass} text-right text-text-primary font-medium tabular-nums`}>
                  {p.tryOns.toLocaleString()}
                </td>
                <td className={`${tdClass} text-right`}>
                  {p.conversionLift !== null ? (
                    <span className="inline-flex items-center rounded-full px-[0.521vw] py-[0.104vw] bg-admin-status-active-bg text-admin-status-active-text text-admin-xs font-medium tabular-nums max-lg:px-2 max-lg:py-0.5 max-lg:text-[11px]">
                      +{p.conversionLift.toFixed(1)}%
                    </span>
                  ) : (
                    <span className="text-text-hint">—</span>
                  )}
                </td>
                <td className={`${tdClass} pr-[var(--spacing-admin-card)] text-right`}>
                  <span className="text-text-body tabular-nums">{fmtPct(p.returnRate)}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}
