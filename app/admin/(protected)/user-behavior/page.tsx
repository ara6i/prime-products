import { AdminShell } from "@/app/admin/shared/components/AdminShell";
import { Card } from "@/app/admin/shared/components/Card";
import { EmptyState } from "@/app/admin/shared/components/EmptyState";
import { StatCard } from "@/app/admin/shared/components/StatCard";
import { getGlobalBehavior } from "@/app/admin/shared/services/adminBehaviorService";
import { DeviceSplitChart } from "@/app/admin/shared/components/charts/DeviceSplitChart";
import { CountrySplitCard } from "@/app/admin/shared/components/charts/CountrySplitCard";
import { HourHeatmapCard } from "@/app/admin/shared/components/charts/HourHeatmapCard";
import { Users, Camera, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminUserBehaviorPage() {
  const b = await getGlobalBehavior("30d");

  return (
    <AdminShell
      title="User Behavior"
      subtitle="Session-level snapshot of what customers are doing"
    >
      {!b ? (
        <Card>
          <EmptyState title="Unable to load analytics" />
        </Card>
      ) : (
        <div className="flex flex-col gap-[var(--spacing-admin-gap-lg)]">
          <div className="grid grid-cols-3 gap-[var(--spacing-admin-gap-lg)] max-lg:grid-cols-1">
            <StatCard
              label="Unique sessions"
              value={b.kpis.uniqueSessions}
              hint="Distinct customers in 30d"
              icon={Users}
              accent="blue"
            />
            <StatCard
              label="Try-ons started"
              value={b.kpis.initiated}
              hint={`${b.kpis.completed.toLocaleString()} completed`}
              icon={Camera}
              accent="purple"
            />
            <StatCard
              label="Completion rate"
              value={`${Math.round(b.kpis.completionRate * 100)}%`}
              hint="Completed / started"
              icon={Clock}
              accent="green"
            />
          </div>

          <div className="grid grid-cols-2 gap-[var(--spacing-admin-gap-lg)] max-lg:grid-cols-1">
            <Card title="Devices" description="Mobile / desktop split" bodyClassName="h-[10vw] max-lg:h-auto">
              <DeviceSplitChart data={b.deviceSplit} />
            </Card>
            <CountrySplitCard countries={b.countrySplit} />
          </div>

          <HourHeatmapCard
            hourHistogram={b.hourHistogram}
            weekdayHistogram={b.weekdayHistogram}
          />
        </div>
      )}
    </AdminShell>
  );
}
