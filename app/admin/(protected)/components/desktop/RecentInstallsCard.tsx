import Link from "next/link";
import { Card } from "@/app/admin/shared/components/Card";
import { StatusPill } from "@/app/admin/shared/components/StatusPill";
import { EmptyState } from "@/app/admin/shared/components/EmptyState";
import { ArrowRightIcon } from "@/app/shared/components/icons";
import type { RecentShopifyShop } from "@/app/admin/shared/types";

interface Props {
  shops: RecentShopifyShop[];
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function RecentInstallsCard({ shops }: Props) {
  if (shops.length === 0) {
    return (
      <Card title="Recent installs" description="New merchants from the Shopify app">
        <EmptyState
          title="No installs yet"
          description="Installs appear here automatically."
        />
      </Card>
    );
  }

  return (
    <Card
      title="Recent installs"
      description="Newest Shopify merchants"
      action={
        <Link
          href="/admin/stores?source=shopify"
          className="inline-flex items-center gap-[0.313vw] text-admin-sm font-medium text-brand-blue hover:text-brand-blue-dark transition-colors"
        >
          View all
          <ArrowRightIcon size={12} className="!w-[0.625vw] !h-[0.625vw]" color="currentColor" />
        </Link>
      }
      bodyClassName="!pt-0 !p-0"
    >
      <ul className="divide-y divide-admin-border-soft">
        {shops.map((shop) => {
          const display = shop.shopName || shop.shopDomain;
          const initial = (display || "?").trim().charAt(0).toUpperCase();
          return (
            <li key={shop._id}>
              <Link
                href={`/admin/stores/shopify/${shop._id}`}
                className="flex items-center gap-[var(--spacing-admin-gap-md)] px-[var(--spacing-admin-card)] py-[var(--spacing-admin-gap-md)] hover:bg-admin-row-hover transition-colors"
              >
                <span className="flex h-[1.667vw] w-[1.667vw] shrink-0 items-center justify-center rounded-full bg-brand-blue-pale text-admin-xs font-semibold text-brand-blue max-lg:h-8 max-lg:w-8 max-lg:text-xs">
                  {initial}
                </span>
                <div className="flex flex-col min-w-0 flex-1">
                  <span className="text-admin-sm font-medium text-text-primary truncate">
                    {display}
                  </span>
                  <span className="text-admin-xs text-text-hint truncate">
                    {shop.shopDomain}
                  </span>
                </div>
                <span className="text-admin-xs text-text-body capitalize tabular-nums shrink-0">
                  {shop.plan}
                </span>
                <StatusPill status={shop.status} size="sm" />
                <span className="text-admin-xs text-text-hint tabular-nums shrink-0 w-[3.5vw] text-right max-lg:hidden">
                  {formatDate(shop.installedAt)}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
