import { AdminShell } from "@/app/admin/shared/components/AdminShell";
import { Card } from "@/app/admin/shared/components/Card";
import { getDecisionEngine } from "@/app/admin/shared/services/adminDecisionEngineService";
import { DecisionKpiCard } from "@/app/admin/shared/components/decision-engine/DecisionKpiCard";
import { DateRangePicker } from "@/app/admin/shared/components/decision-engine/DateRangePicker";
import { VsControlToggle } from "@/app/admin/shared/components/decision-engine/VsControlToggle";
import { ConversionImpactChart } from "@/app/admin/shared/components/decision-engine/ConversionImpactChart";
import { ReturnRateByCategoryCard } from "@/app/admin/shared/components/decision-engine/ReturnRateByCategoryCard";
import { KeyInsightsCard } from "@/app/admin/shared/components/decision-engine/KeyInsightsCard";
import { EngagementFunnelVisual } from "@/app/admin/shared/components/decision-engine/EngagementFunnelVisual";
import { SizeAlignmentCard } from "@/app/admin/shared/components/decision-engine/SizeAlignmentCard";
import { TopProductsImpactTable } from "@/app/admin/shared/components/decision-engine/TopProductsImpactTable";
import { EmptyState } from "@/app/admin/shared/components/EmptyState";
import { TrendingUp, PackageOpen, Wallet, Timer } from "lucide-react";

export const dynamic = "force-dynamic";

interface SearchParams {
  range?: "7d" | "30d" | "90d";
  vsControl?: "1";
}

function formatPct(n: number | null): string {
  if (n === null) return "—";
  return `${n.toFixed(1)}%`;
}

function formatCurrency(n: number | null, currency: string): string {
  if (n === null) return "—";
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: n >= 1000 ? 0 : 2,
    }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}

export default async function AdminDecisionEnginePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const range = (sp.range ?? "30d") as "7d" | "30d" | "90d";
  const data = await getDecisionEngine(range);

  return (
    <AdminShell
      title="Overview"
      subtitle="Decision Engine"
      headerRight={<DateRangePicker />}
    >
      {!data ? (
        <Card>
          <EmptyState
            title="Unable to load analytics"
            description="Retry or check that the backend is reachable."
          />
        </Card>
      ) : (
        <div className="hidden lg:grid grid-cols-12 gap-[var(--spacing-admin-gap-lg)]">
          {/* Main column */}
          <div className="col-span-9 flex flex-col gap-[var(--spacing-admin-gap-lg)]">
            {/* Big page title row with inline VS toggle */}
            <div className="flex items-center justify-between gap-[var(--spacing-admin-gap-md)] pt-[0.521vw]">
              <h1 className="text-[1.667vw] font-semibold text-text-primary tracking-tight leading-tight">
                Decision Engine Performance
              </h1>
              <VsControlToggle
                available={data.vsControl.available}
                reason={data.vsControl.reason}
              />
            </div>

            {/* KPIs */}
            <div className="grid grid-cols-4 gap-[var(--spacing-admin-gap-lg)]">
              <DecisionKpiCard
                label="Conversion Rate"
                value={formatPct(data.kpis.conversionRate.value)}
                delta={
                  data.kpis.conversionRate.delta !== null
                    ? {
                        pct: data.kpis.conversionRate.delta,
                        desiredDirection: data.kpis.conversionRate.desiredDirection,
                      }
                    : undefined
                }
                unavailableHint={
                  !data.kpis.conversionRate.available
                    ? "Waiting on Shopify orders"
                    : !data.vsControl.available
                      ? "Cohort split pending"
                      : undefined
                }
                icon={TrendingUp}
                accent="violet"
              />
              <DecisionKpiCard
                label="Return Rate"
                value={formatPct(data.kpis.returnRate.value)}
                delta={
                  data.kpis.returnRate.delta !== null
                    ? {
                        pct: data.kpis.returnRate.delta,
                        desiredDirection: data.kpis.returnRate.desiredDirection,
                      }
                    : undefined
                }
                unavailableHint={
                  !data.kpis.returnRate.available
                    ? "Waiting on refunds"
                    : !data.vsControl.available
                      ? "Cohort split pending"
                      : undefined
                }
                icon={PackageOpen}
                accent="amber"
              />
              <DecisionKpiCard
                label="Avg Order Value"
                value={formatCurrency(data.kpis.aov.value, data.kpis.aov.currency)}
                delta={
                  data.kpis.aov.delta !== null
                    ? {
                        pct: data.kpis.aov.delta,
                        desiredDirection: data.kpis.aov.desiredDirection,
                      }
                    : undefined
                }
                unavailableHint={
                  !data.kpis.aov.available
                    ? "Waiting on Shopify orders"
                    : !data.vsControl.available
                      ? "Cohort split pending"
                      : undefined
                }
                icon={Wallet}
                accent="lime"
              />
              <DecisionKpiCard
                label="Time to Purchase"
                value={
                  data.kpis.timeToPurchase.value === null
                    ? "—"
                    : `${data.kpis.timeToPurchase.value}s`
                }
                unavailableHint={
                  !data.kpis.timeToPurchase.available ? "Needs PRODUCT_VIEW tracking" : undefined
                }
                icon={Timer}
                accent="teal"
              />
            </div>

            {/* Conversion impact + return rate by category */}
            <div className="grid grid-cols-5 gap-[var(--spacing-admin-gap-lg)]">
              <Card
                title="Conversion Impact"
                description="Daily, treatment vs control"
                className="col-span-3"
                bodyClassName="h-[13vw]"
              >
                <ConversionImpactChart
                  data={data.conversionImpact.series}
                  controlAvailable={data.conversionImpact.controlAvailable}
                />
              </Card>
              <div className="col-span-2">
                <ReturnRateByCategoryCard
                  available={data.returnRateByCategory.available}
                  rows={data.returnRateByCategory.rows}
                />
              </div>
            </div>

            {/* Size alignment + top products */}
            <div className="grid grid-cols-5 gap-[var(--spacing-admin-gap-lg)]">
              <div className="col-span-2">
                <SizeAlignmentCard
                  acceptanceRate={data.sizeAlignment.acceptanceRate}
                  followingSuggestion={data.sizeAlignment.followingSuggestion}
                  changedAfterTryOn={data.sizeAlignment.changedAfterTryOn}
                  mismatchReductionPct={data.sizeAlignment.mismatchReductionPct}
                />
              </div>
              <div className="col-span-3">
                <TopProductsImpactTable products={data.topProducts} />
              </div>
            </div>
          </div>

          {/* Right rail */}
          <div className="col-span-3 flex flex-col gap-[var(--spacing-admin-gap-lg)]">
            <KeyInsightsCard insights={data.keyInsights} />
            <EngagementFunnelVisual steps={data.engagementFunnel} />
          </div>
        </div>
      )}

      {/* Mobile stack */}
      <div className="lg:hidden flex flex-col gap-4">
        {data && (
          <>
            <div className="flex items-center justify-between gap-3">
              <DateRangePicker />
              <VsControlToggle
                available={data.vsControl.available}
                reason={data.vsControl.reason}
              />
            </div>
            <div className="grid grid-cols-1 gap-3">
              <DecisionKpiCard
                label="Conversion Rate"
                value={formatPct(data.kpis.conversionRate.value)}
                icon={TrendingUp}
                accent="violet"
                unavailableHint={
                  !data.kpis.conversionRate.available ? "Waiting on orders" : undefined
                }
              />
              <DecisionKpiCard
                label="Return Rate"
                value={formatPct(data.kpis.returnRate.value)}
                icon={PackageOpen}
                accent="amber"
                unavailableHint={
                  !data.kpis.returnRate.available ? "Waiting on refunds" : undefined
                }
              />
              <DecisionKpiCard
                label="Avg Order Value"
                value={formatCurrency(data.kpis.aov.value, data.kpis.aov.currency)}
                icon={Wallet}
                accent="lime"
                unavailableHint={!data.kpis.aov.available ? "Waiting on orders" : undefined}
              />
              <DecisionKpiCard
                label="Time to Purchase"
                value={
                  data.kpis.timeToPurchase.value === null
                    ? "—"
                    : `${data.kpis.timeToPurchase.value}s`
                }
                icon={Timer}
                accent="teal"
                unavailableHint="Needs PRODUCT_VIEW tracking"
              />
            </div>
            <KeyInsightsCard insights={data.keyInsights} />
            <EngagementFunnelVisual steps={data.engagementFunnel} />
            <Card title="Conversion Impact" description="Daily conversions" bodyClassName="h-56">
              <ConversionImpactChart
                data={data.conversionImpact.series}
                controlAvailable={data.conversionImpact.controlAvailable}
              />
            </Card>
            <ReturnRateByCategoryCard
              available={data.returnRateByCategory.available}
              rows={data.returnRateByCategory.rows}
            />
            <SizeAlignmentCard
              acceptanceRate={data.sizeAlignment.acceptanceRate}
              followingSuggestion={data.sizeAlignment.followingSuggestion}
              changedAfterTryOn={data.sizeAlignment.changedAfterTryOn}
              mismatchReductionPct={data.sizeAlignment.mismatchReductionPct}
            />
            <TopProductsImpactTable products={data.topProducts} />
          </>
        )}
      </div>
    </AdminShell>
  );
}
