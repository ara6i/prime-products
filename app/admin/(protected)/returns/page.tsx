import { AdminShell } from "@/app/admin/shared/components/AdminShell";
import { Card } from "@/app/admin/shared/components/Card";
import { EmptyState } from "@/app/admin/shared/components/EmptyState";
import { getDecisionEngine } from "@/app/admin/shared/services/adminDecisionEngineService";
import { StatCard } from "@/app/admin/shared/components/StatCard";
import { PackageOpen, Tag, DollarSign } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminReturnsPage() {
  const de = await getDecisionEngine("30d");

  return (
    <AdminShell
      title="Returns"
      subtitle="Refund amounts and return rates across all merchants"
    >
      {!de ? (
        <Card>
          <EmptyState title="Unable to load analytics" />
        </Card>
      ) : (
        <div className="flex flex-col gap-[var(--spacing-admin-gap-lg)]">
          {de.kpis.returnRate.available ? (
            <div className="grid grid-cols-3 gap-[var(--spacing-admin-gap-lg)] max-lg:grid-cols-1">
              <StatCard
                label="Return rate"
                value={
                  de.kpis.returnRate.value !== null
                    ? `${de.kpis.returnRate.value.toFixed(1)}%`
                    : "—"
                }
                hint="Refunded / paid revenue"
                icon={PackageOpen}
                accent="rose"
              />
              <StatCard
                label="AOV"
                value={
                  de.kpis.aov.value !== null
                    ? new Intl.NumberFormat(undefined, {
                        style: "currency",
                        currency: de.kpis.aov.currency,
                        maximumFractionDigits: 0,
                      }).format(de.kpis.aov.value)
                    : "—"
                }
                icon={DollarSign}
                accent="blue"
              />
              <StatCard
                label="Attributed orders"
                value="—"
                hint="Per-product return breakdown pending"
                icon={Tag}
                accent="neutral"
              />
            </div>
          ) : (
            <Card>
              <EmptyState
                title="No refunds recorded yet"
                description="Refund rate populates once Shopify order + refund webhooks fire. Deploy the Shopify app update to start receiving them."
              />
            </Card>
          )}

          <Card
            title="Return Rate by Category"
            description="Requires Shopify product categorization"
          >
            <EmptyState
              title="Category data unavailable"
              description="Enable by adding a Shopify Admin API call that caches product categories on order webhook. Planned as a follow-up."
            />
          </Card>
        </div>
      )}
    </AdminShell>
  );
}
