import { AdminShell } from "@/app/admin/shared/components/AdminShell";
import { Card } from "@/app/admin/shared/components/Card";
import { EmptyState } from "@/app/admin/shared/components/EmptyState";
import { getGlobalBehavior } from "@/app/admin/shared/services/adminBehaviorService";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage() {
  const b = await getGlobalBehavior("30d");

  return (
    <AdminShell
      title="Products"
      subtitle="Ranked by try-on activity across all merchants"
    >
      {!b ? (
        <Card>
          <EmptyState title="Unable to load analytics" />
        </Card>
      ) : b.topProducts.length === 0 ? (
        <Card>
          <EmptyState
            title="No product data yet"
            description="Products appear here once try-on events carry a productId. SDK sends it automatically on the latest version."
          />
        </Card>
      ) : (
        <ProductsTable products={b.topProducts} />
      )}
    </AdminShell>
  );
}

function ProductsTable({
  products,
}: {
  products: Array<{ productId: string; productTitle: string; tryOns: number }>;
}) {
  const max = products[0]?.tryOns ?? 1;
  return (
    <Card title={`Top ${products.length} products`} description="Ranked by try-on volume" bodyClassName="!p-0 !pt-0">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-t border-admin-border-soft bg-admin-muted/40">
            <th className="py-[var(--spacing-admin-gap-md)] pl-[var(--spacing-admin-card)] pr-[var(--spacing-admin-gap-md)] text-[0.573vw] font-semibold tracking-[0.06em] text-text-hint uppercase max-lg:text-[10px]">
              #
            </th>
            <th className="py-[var(--spacing-admin-gap-md)] px-[var(--spacing-admin-gap-md)] text-[0.573vw] font-semibold tracking-[0.06em] text-text-hint uppercase max-lg:text-[10px]">
              Product
            </th>
            <th className="py-[var(--spacing-admin-gap-md)] px-[var(--spacing-admin-gap-md)] text-[0.573vw] font-semibold tracking-[0.06em] text-text-hint uppercase text-right max-lg:text-[10px]">
              Try-ons
            </th>
            <th className="py-[var(--spacing-admin-gap-md)] pr-[var(--spacing-admin-card)] text-[0.573vw] font-semibold tracking-[0.06em] text-text-hint uppercase max-lg:text-[10px]">
              Share
            </th>
          </tr>
        </thead>
        <tbody>
          {products.map((p, idx) => {
            const pct = Math.round((p.tryOns / max) * 100);
            return (
              <tr
                key={p.productId}
                className="border-t border-admin-border-soft hover:bg-admin-row-hover"
              >
                <td className="py-[var(--spacing-admin-gap-md)] pl-[var(--spacing-admin-card)] pr-[var(--spacing-admin-gap-md)] text-admin-sm text-text-hint tabular-nums">
                  {idx + 1}
                </td>
                <td className="py-[var(--spacing-admin-gap-md)] px-[var(--spacing-admin-gap-md)]">
                  <span className="text-admin-sm font-medium text-text-primary">
                    {p.productTitle}
                  </span>
                  <span className="block text-admin-xs text-text-hint font-mono">
                    {p.productId}
                  </span>
                </td>
                <td className="py-[var(--spacing-admin-gap-md)] px-[var(--spacing-admin-gap-md)] text-admin-sm text-text-primary text-right font-medium tabular-nums">
                  {p.tryOns.toLocaleString()}
                </td>
                <td className="py-[var(--spacing-admin-gap-md)] pr-[var(--spacing-admin-card)]">
                  <div className="h-[0.313vw] rounded-full bg-admin-muted overflow-hidden max-lg:h-1.5">
                    <span
                      className="block h-full bg-brand-blue rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </Card>
  );
}
