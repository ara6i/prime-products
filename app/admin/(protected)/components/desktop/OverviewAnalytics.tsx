import { Card } from "@/app/admin/shared/components/Card";
import { StatCard } from "@/app/admin/shared/components/StatCard";
import { EmptyState } from "@/app/admin/shared/components/EmptyState";
import { RevenueChart } from "@/app/admin/shared/components/charts/RevenueChart";
import { InstallsChart } from "@/app/admin/shared/components/charts/InstallsChart";
import { PlanDistributionChart } from "@/app/admin/shared/components/charts/PlanDistributionChart";
import { WorldMap } from "@/app/admin/shared/components/map/WorldMap";
import {
  MonetizationOnIcon,
  PeopleIcon,
  CameraIcon,
  ShoppingBagIcon,
} from "@/app/shared/components/icons";
import type { AnalyticsOverview } from "@/app/admin/shared/types";
import { TopMerchantsCard } from "./TopMerchantsCard";
import { GeoCountriesCard } from "./GeoCountriesCard";
import { RecentInstallsCard } from "./RecentInstallsCard";

interface Props {
  data: AnalyticsOverview | null;
}

function formatUSD(value: number): string {
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}k`;
  return `$${value.toFixed(0)}`;
}

export function OverviewAnalytics({ data }: Props) {
  if (!data) {
    return (
      <Card>
        <EmptyState
          title="Unable to load analytics"
          description="Retry or check that the backend is reachable."
        />
      </Card>
    );
  }

  const { kpis, monthlySeries, planDistributionShopify, topMerchants, geoDistribution, recentShopify } =
    data;

  const growthTone = kpis.installsGrowthPct > 0 ? "up" : kpis.installsGrowthPct < 0 ? "down" : "flat";
  const growthLabel =
    kpis.installsGrowthPct === 0
      ? "0%"
      : `${kpis.installsGrowthPct > 0 ? "+" : ""}${kpis.installsGrowthPct.toFixed(1)}%`;

  return (
    <div className="flex flex-col gap-[var(--spacing-admin-gap-lg)]">
      {/* KPIs */}
      <div className="grid grid-cols-4 gap-[var(--spacing-admin-gap-lg)]">
        <StatCard
          label="MRR (est.)"
          value={formatUSD(kpis.mrr)}
          hint="Active subscriptions and plans"
          icon={MonetizationOnIcon}
          accent="green"
        />
        <StatCard
          label="Revenue · 30d"
          value={formatUSD(kpis.revenue30)}
          hint="Completed payments"
          icon={MonetizationOnIcon}
          accent="blue"
        />
        <StatCard
          label="Active merchants"
          value={kpis.shopifyActive}
          hint={`${kpis.shopifyTotal.toLocaleString()} total · ${kpis.sdkStoresCount.toLocaleString()} SDK`}
          icon={ShoppingBagIcon}
          accent="purple"
        />
        <StatCard
          label="New installs · 30d"
          value={kpis.installsLast30}
          hint="vs previous 30 days"
          icon={PeopleIcon}
          accent="amber"
          trend={{ value: growthLabel, tone: growthTone }}
        />
      </div>

      {/* Revenue + Installs */}
      <div className="grid grid-cols-3 gap-[var(--spacing-admin-gap-lg)]">
        <Card
          title="Revenue"
          description="Last 12 months"
          className="col-span-2"
          bodyClassName="h-[13vw]"
        >
          <RevenueChart data={monthlySeries} />
        </Card>
        <Card
          title="Installs"
          description="Monthly installs"
          bodyClassName="h-[13vw]"
        >
          <InstallsChart data={monthlySeries} />
        </Card>
      </div>

      {/* Plan distribution + Top merchants */}
      <div className="grid grid-cols-3 gap-[var(--spacing-admin-gap-lg)]">
        <Card
          title="Plan distribution"
          description="Shopify merchants by plan"
          bodyClassName="h-[11vw]"
        >
          <PlanDistributionChart data={planDistributionShopify} />
        </Card>
        <Card
          title="Try-on activity"
          description="Last 30 days"
          bodyClassName="h-[11vw]"
        >
          <InstallsChart data={monthlySeries} />
        </Card>
        <TopMerchantsCard merchants={topMerchants.slice(0, 5)} />
      </div>

      {/* World map + geo list */}
      <div className="grid grid-cols-3 gap-[var(--spacing-admin-gap-lg)]">
        <Card
          title="Global footprint"
          description="Merchants by country"
          className="col-span-2"
        >
          <WorldMap data={geoDistribution} />
        </Card>
        <GeoCountriesCard data={geoDistribution} />
      </div>

      {/* Recent installs */}
      <RecentInstallsCard shops={recentShopify} />
    </div>
  );
}
