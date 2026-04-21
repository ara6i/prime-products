import { AdminShell } from "@/app/admin/shared/components/AdminShell";
import { Card } from "@/app/admin/shared/components/Card";
import { EmptyState } from "@/app/admin/shared/components/EmptyState";
import { getGlobalBehavior } from "@/app/admin/shared/services/adminBehaviorService";
import { getDecisionEngine } from "@/app/admin/shared/services/adminDecisionEngineService";
import { StatCard } from "@/app/admin/shared/components/StatCard";
import { DailyActivityChart } from "@/app/admin/shared/components/charts/DailyActivityChart";
import { FunnelCard } from "@/app/admin/shared/components/charts/FunnelCard";
import { TopProductsCard } from "@/app/admin/shared/components/charts/TopProductsCard";
import { TrendingUp, Camera, Shirt, Users } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminConversionPage() {
  const [behavior, de] = await Promise.all([getGlobalBehavior("30d"), getDecisionEngine("30d")]);

  return (
    <AdminShell
      title="Conversion"
      subtitle="Try-on → purchase conversion across all merchants"
    >
      {!behavior || !de ? (
        <Card>
          <EmptyState title="Unable to load analytics" />
        </Card>
      ) : (
        <div className="flex flex-col gap-[var(--spacing-admin-gap-lg)]">
          <div className="grid grid-cols-4 gap-[var(--spacing-admin-gap-lg)] max-lg:grid-cols-2">
            <StatCard
              label="Conversion rate"
              value={
                de.kpis.conversionRate.value !== null
                  ? `${de.kpis.conversionRate.value.toFixed(1)}%`
                  : "—"
              }
              hint="Paid orders / completed try-ons"
              icon={TrendingUp}
              accent="green"
            />
            <StatCard
              label="Completed try-ons"
              value={behavior.kpis.completed}
              hint={`${behavior.kpis.initiated.toLocaleString()} started`}
              icon={Camera}
              accent="blue"
            />
            <StatCard
              label="Cart adds"
              value={behavior.kpis.cartAdds}
              hint="from try-on sessions"
              icon={Shirt}
              accent="purple"
            />
            <StatCard
              label="Unique sessions"
              value={behavior.kpis.uniqueSessions}
              icon={Users}
              accent="amber"
            />
          </div>
          <Card title="Daily try-on activity" description="Last 30 days" bodyClassName="h-[13vw] max-lg:h-56">
            <DailyActivityChart data={behavior.dailyActivity} />
          </Card>
          <div className="grid grid-cols-2 gap-[var(--spacing-admin-gap-lg)] max-lg:grid-cols-1">
            <FunnelCard steps={behavior.funnel} title="Conversion funnel" description="Top-down drop-off" />
            <TopProductsCard products={behavior.topProducts} />
          </div>
        </div>
      )}
    </AdminShell>
  );
}
