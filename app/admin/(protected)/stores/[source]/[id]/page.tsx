import { notFound } from "next/navigation";
import { AdminShell } from "@/app/admin/shared/components/AdminShell";
import { Card } from "@/app/admin/shared/components/Card";
import { getStoreDetail, listStoreSizeCharts } from "./services/storeDetailService";
import { getStoreBehavior } from "@/app/admin/shared/services/adminBehaviorService";
import { getStoreRevenue } from "@/app/admin/shared/services/adminRevenueService";
import { RevenueImpactCard } from "./components/desktop/RevenueImpactCard";
import { StoreHero } from "./components/desktop/StoreHero";
import { StoreMetaCard } from "./components/desktop/StoreMetaCard";
import { StoreStats } from "./components/desktop/StoreStats";
import { SizeChartsList } from "./components/desktop/SizeChartsList";
import { TryOnsGauge } from "./components/desktop/TryOnsGauge";
import { StoreActivityCard } from "./components/desktop/StoreActivityCard";
import { DailyActivityChart } from "@/app/admin/shared/components/charts/DailyActivityChart";
import { FunnelCard } from "@/app/admin/shared/components/charts/FunnelCard";
import { DeviceSplitChart } from "@/app/admin/shared/components/charts/DeviceSplitChart";
import { TopProductsCard } from "@/app/admin/shared/components/charts/TopProductsCard";
import { CountrySplitCard } from "@/app/admin/shared/components/charts/CountrySplitCard";
import { HourHeatmapCard } from "@/app/admin/shared/components/charts/HourHeatmapCard";
import { StoreDetailMobile } from "./components/mobile/StoreDetailMobile";
import type { StoreSource } from "@/app/admin/shared/types";

export const dynamic = "force-dynamic";

export default async function AdminStoreDetailPage({
  params,
}: {
  params: Promise<{ source: string; id: string }>;
}) {
  const { source: rawSource, id } = await params;
  if (rawSource !== "shopify" && rawSource !== "sdk") notFound();
  const source = rawSource as StoreSource;

  const [detail, charts, behavior, revenue] = await Promise.all([
    getStoreDetail(source, id),
    listStoreSizeCharts(source, id),
    source === "shopify" ? getStoreBehavior(id, "30d") : Promise.resolve(null),
    source === "shopify" ? getStoreRevenue(id, "30d") : Promise.resolve(null),
  ]);

  if (!detail) notFound();

  const title = detail.store.storeName || detail.store.identifier;
  const subtitle =
    source === "shopify"
      ? `Shopify merchant · ${detail.store.identifier}`
      : `SDK store · ${detail.store.identifier}`;

  return (
    <AdminShell title={title} subtitle={subtitle}>
      <div className="hidden lg:flex flex-col gap-[var(--spacing-admin-gap-lg)]">
        <StoreHero detail={detail} />
        <StoreStats detail={detail} />

        {detail.source === "shopify" && (
          <div className="grid grid-cols-2 gap-[var(--spacing-admin-gap-lg)]">
            <TryOnsGauge
              used={detail.raw.tryOnsUsed}
              remaining={detail.raw.tryOnsRemaining}
              plan={detail.raw.plan}
            />
            <StoreActivityCard
              installedAt={detail.raw.installedAt}
              lastUsedAt={detail.raw.lastUsedAt}
              tryOnsUsed={detail.raw.tryOnsUsed}
              tryOnsRemaining={detail.raw.tryOnsRemaining}
              plan={detail.raw.plan}
            />
          </div>
        )}

        {detail.source === "shopify" && behavior && (
          <>
            <div className="grid grid-cols-3 gap-[var(--spacing-admin-gap-lg)]">
              <Card
                title="Try-on activity"
                description="Last 30 days"
                className="col-span-2"
                bodyClassName="h-[12vw]"
              >
                <DailyActivityChart data={behavior.dailyActivity} />
              </Card>
              <FunnelCard steps={behavior.funnel} />
            </div>

            <div className="grid grid-cols-3 gap-[var(--spacing-admin-gap-lg)]">
              <Card title="Devices" description="Mobile / desktop split" bodyClassName="h-[10vw]">
                <DeviceSplitChart data={behavior.deviceSplit} />
              </Card>
              <TopProductsCard products={behavior.topProducts} />
              <CountrySplitCard countries={behavior.countrySplit} />
            </div>

            <HourHeatmapCard
              hourHistogram={behavior.hourHistogram}
              weekdayHistogram={behavior.weekdayHistogram}
            />

            <RevenueImpactCard data={revenue} />
          </>
        )}

        <StoreMetaCard detail={detail} />
        <SizeChartsList charts={charts} source={source} storeId={id} />
      </div>

      <div className="lg:hidden">
        <StoreDetailMobile
          detail={detail}
          charts={charts}
          source={source}
          storeId={id}
          config={null}
        />
      </div>
    </AdminShell>
  );
}
