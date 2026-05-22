import type { CSSProperties } from "react";
import { CustomerDashboardCard } from "./CustomerDashboardCard";
import { CustomerDashboardEmptyState } from "./CustomerDashboardEmptyState";
import type { CustomerDashboardTopProduct } from "../../types";

interface TopProductsCardProps {
  products: CustomerDashboardTopProduct[];
}

interface ProductBarStyle extends CSSProperties {
  "--customer-product-width": string;
}

function getProductBarStyle(percent: number): ProductBarStyle {
  return { "--customer-product-width": `${percent}%` };
}

export function TopProductsCard({ products }: TopProductsCardProps) {
  const max = products[0]?.tryOns ?? 0;

  return (
    <CustomerDashboardCard
      title="Most tried products"
      description="Ranked by try-on count"
      bodyClassName={products.length > 0 ? "!p-0 !pt-[var(--spacing-customer-card)]" : undefined}
    >
      {products.length === 0 ? (
        <CustomerDashboardEmptyState
          title="No product data yet"
          description="Products will appear here once the SDK sends productId with each try-on."
        />
      ) : (
        <ul className="divide-y divide-customer-border">
          {products.slice(0, 6).map((product, index) => {
            const percent = max > 0 ? Math.min(100, Math.round((product.tryOns / max) * 100)) : 0;

            return (
              <li
                key={product.productId}
                className="flex items-center gap-[var(--spacing-customer-gap-md)] px-[var(--spacing-customer-card)] py-[var(--spacing-customer-gap-md)]"
              >
                <span className="w-[1.25vw] shrink-0 text-customer-xs font-medium tabular-nums text-customer-muted max-lg:w-[5vw] max-lg:text-[3vw]">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-customer-sm font-medium text-text-primary max-lg:text-[3.4vw]">
                    {product.productTitle}
                  </span>
                  <div className="mt-[0.208vw] h-[0.208vw] overflow-hidden rounded-full bg-customer-soft max-lg:mt-[1vw] max-lg:h-[1vw]">
                    <span
                      className="block h-full rounded-full bg-brand-blue [width:var(--customer-product-width)]"
                      style={getProductBarStyle(percent)}
                    />
                  </div>
                </div>
                <span className="shrink-0 text-customer-sm font-medium tabular-nums text-text-primary max-lg:text-[3.4vw]">
                  {product.tryOns.toLocaleString()}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </CustomerDashboardCard>
  );
}
