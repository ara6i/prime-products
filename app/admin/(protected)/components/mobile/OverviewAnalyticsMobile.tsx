import Link from "next/link";
import { Card } from "@/app/admin/shared/components/Card";
import { StatCard } from "@/app/admin/shared/components/StatCard";
import { EmptyState } from "@/app/admin/shared/components/EmptyState";
import { StatusPill } from "@/app/admin/shared/components/StatusPill";
import { RevenueChart } from "@/app/admin/shared/components/charts/RevenueChart";
import { InstallsChart } from "@/app/admin/shared/components/charts/InstallsChart";
import { WorldMap } from "@/app/admin/shared/components/map/WorldMap";
import {
  MonetizationOnIcon,
  PeopleIcon,
  ShoppingBagIcon,
  CameraIcon,
} from "@/app/shared/components/icons";
import type { AnalyticsOverview } from "@/app/admin/shared/types";

interface Props {
  data: AnalyticsOverview | null;
}

function formatUSD(value: number): string {
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`;
  return `$${value.toFixed(0)}`;
}

function flagFromIso2(iso2: string): string {
  if (!iso2 || iso2.length !== 2) return "";
  const base = 0x1f1a5;
  const codePoints = Array.from(iso2.toUpperCase()).map((c) => base + c.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

export function OverviewAnalyticsMobile({ data }: Props) {
  if (!data) {
    return (
      <Card>
        <EmptyState title="Unable to load analytics" description="Retry or check the backend." />
      </Card>
    );
  }

  const { kpis, monthlySeries, topMerchants, geoDistribution, recentShopify } = data;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <StatCard label="MRR" value={formatUSD(kpis.mrr)} icon={MonetizationOnIcon} accent="green" />
        <StatCard
          label="Rev · 30d"
          value={formatUSD(kpis.revenue30)}
          icon={MonetizationOnIcon}
          accent="blue"
        />
        <StatCard
          label="Active"
          value={kpis.shopifyActive}
          hint={`${kpis.shopifyTotal} total`}
          icon={ShoppingBagIcon}
          accent="purple"
        />
        <StatCard
          label="Installs · 30d"
          value={kpis.installsLast30}
          icon={PeopleIcon}
          accent="amber"
          trend={{
            value: `${kpis.installsGrowthPct > 0 ? "+" : ""}${kpis.installsGrowthPct.toFixed(0)}%`,
            tone:
              kpis.installsGrowthPct > 0 ? "up" : kpis.installsGrowthPct < 0 ? "down" : "flat",
          }}
        />
      </div>

      <Card title="Revenue" description="Last 12 months" bodyClassName="h-52">
        <RevenueChart data={monthlySeries} />
      </Card>

      <Card title="Installs" description="Monthly" bodyClassName="h-44">
        <InstallsChart data={monthlySeries} />
      </Card>

      <Card title="Global footprint" description="Merchants by country">
        <WorldMap data={geoDistribution} />
      </Card>

      <Card title="Top countries" bodyClassName="!p-0 !pt-0">
        <ul className="divide-y divide-admin-border-soft">
          {geoDistribution.slice(0, 6).map((g) => (
            <li key={g.iso2} className="flex items-center gap-3 px-5 py-3">
              <span className="text-lg leading-none">{flagFromIso2(g.iso2)}</span>
              <span className="text-sm text-text-primary flex-1 truncate">{g.name}</span>
              <span className="text-sm text-text-body tabular-nums">{g.count}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card title="Top merchants" bodyClassName="!p-0 !pt-0">
        {topMerchants.length === 0 ? (
          <div className="p-5">
            <EmptyState title="No try-on activity yet" />
          </div>
        ) : (
          <ul className="divide-y divide-admin-border-soft">
            {topMerchants.slice(0, 5).map((m, idx) => (
              <li key={m.id}>
                <Link
                  href={`/admin/stores/shopify/${m.id}`}
                  className="flex items-center gap-3 px-5 py-3"
                >
                  <span className="text-xs text-text-hint w-5 tabular-nums">{idx + 1}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-text-primary truncate">
                      {m.shopName || m.shopDomain}
                    </div>
                    <div className="text-xs text-text-hint truncate">{m.shopDomain}</div>
                  </div>
                  <span className="text-sm text-text-primary tabular-nums">
                    {m.tryOnsUsed.toLocaleString()}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card
        title="Recent installs"
        action={
          <Link href="/admin/stores?source=shopify" className="text-sm text-brand-blue">
            View all
          </Link>
        }
        bodyClassName="!p-0 !pt-0"
      >
        {recentShopify.length === 0 ? (
          <div className="p-5">
            <EmptyState title="No installs yet" />
          </div>
        ) : (
          <ul className="divide-y divide-admin-border-soft">
            {recentShopify.map((shop) => {
              const display = shop.shopName || shop.shopDomain;
              const initial = (display || "?").charAt(0).toUpperCase();
              return (
                <li key={shop._id}>
                  <Link
                    href={`/admin/stores/shopify/${shop._id}`}
                    className="flex items-center gap-3 px-5 py-3"
                  >
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-blue-pale text-xs font-semibold text-brand-blue">
                      {initial}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-text-primary truncate">
                        {display}
                      </div>
                      <div className="text-xs text-text-hint truncate">{shop.shopDomain}</div>
                    </div>
                    <StatusPill status={shop.status} size="sm" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
