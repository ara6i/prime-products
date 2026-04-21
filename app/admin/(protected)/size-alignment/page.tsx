import { AdminShell } from "@/app/admin/shared/components/AdminShell";
import { Card } from "@/app/admin/shared/components/Card";
import { EmptyState } from "@/app/admin/shared/components/EmptyState";
import { StatCard } from "@/app/admin/shared/components/StatCard";
import { getGlobalBehavior } from "@/app/admin/shared/services/adminBehaviorService";
import { Ruler, CheckSquare, RefreshCw } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminSizeAlignmentPage() {
  const b = await getGlobalBehavior("30d");

  return (
    <AdminShell
      title="Size Alignment"
      subtitle="How shoppers respond to AI size recommendations"
    >
      {!b ? (
        <Card>
          <EmptyState title="Unable to load analytics" />
        </Card>
      ) : b.kpis.sizeShown === 0 ? (
        <Card>
          <EmptyState
            title="No size recommendations served yet"
            description="The SDK must be configured to show the size recommendation step. Size-accept events flow into this dashboard after SDK republish."
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-[var(--spacing-admin-gap-lg)]">
          <div className="grid grid-cols-3 gap-[var(--spacing-admin-gap-lg)] max-lg:grid-cols-1">
            <StatCard
              label="Acceptance rate"
              value={`${Math.round(b.kpis.sizeAcceptanceRate * 100)}%`}
              hint={`${b.kpis.sizeAccepted.toLocaleString()} of ${b.kpis.sizeShown.toLocaleString()}`}
              icon={CheckSquare}
              accent="green"
            />
            <StatCard
              label="Shown"
              value={b.kpis.sizeShown}
              hint="Recommendations served"
              icon={Ruler}
              accent="blue"
            />
            <StatCard
              label="Accepted"
              value={b.kpis.sizeAccepted}
              hint="Customer confirmed the size"
              icon={RefreshCw}
              accent="purple"
            />
          </div>

          <Card
            title="Per-gender acceptance"
            description="Requires gender metadata on recommendation events"
          >
            <EmptyState
              title="Gender split not tracked yet"
              description="Add `gender` to the metadata field on SIZE_RECOMMENDATION_SHOWN to unlock this breakdown."
            />
          </Card>
        </div>
      )}
    </AdminShell>
  );
}
