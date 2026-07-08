import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { CustomerOverviewProduct } from "../../types/overview";

interface CustomerOverviewProductsCardProps {
  products: CustomerOverviewProduct[];
}

export function CustomerOverviewProductsCard({ products }: CustomerOverviewProductsCardProps) {
  return (
    <section className="rounded-[24px] border border-customer-border bg-customer-card p-5 shadow-[0_16px_44px_rgba(33,84,239,0.06)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-[-0.02em] text-text-primary">Top products</h2>
          <p className="mt-1 text-sm text-customer-muted">Ranked by try-on demand</p>
        </div>
        <Link
          href="/customer/dashboard/products"
          className="flex h-9 items-center gap-1 rounded-full bg-customer-blue px-3 text-sm font-semibold text-brand-blue transition-colors hover:bg-customer-soft"
        >
          Manage
          <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
      </div>

      <div className="mt-5 grid gap-3">
        {products.length === 0 ? (
          <div className="rounded-[18px] bg-customer-blue p-4 text-sm text-text-body">
            Products appear here when the SDK sends completed try-ons.
          </div>
        ) : (
          products.map((product) => (
            <article key={product.id} className="rounded-[18px] bg-customer-blue p-3">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-text-primary">{product.title}</p>
                  <p className="mt-0.5 text-xs text-customer-muted">{product.detail}</p>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-text-primary">{product.value}</span>
              </div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-customer-card">
                <span
                  className="block h-full rounded-full bg-brand-blue"
                  style={{ width: `${product.percent}%` }}
                />
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
