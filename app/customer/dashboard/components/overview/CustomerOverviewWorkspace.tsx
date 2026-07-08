import { StatusPill } from "../shared/StatusPill";
import type { CustomerDashboardViewModel } from "../../types";
import { CustomerOverviewPerformanceChart } from "./CustomerOverviewPerformanceChart";
import { CustomerOverviewPlanCard } from "./CustomerOverviewPlanCard";
import { CustomerOverviewProductsCard } from "./CustomerOverviewProductsCard";
import { CustomerOverviewRecentActivity } from "./CustomerOverviewRecentActivity";
import { CustomerOverviewStatCard } from "./CustomerOverviewStatCard";

interface CustomerOverviewWorkspaceProps {
  dashboard: CustomerDashboardViewModel;
}

export function CustomerOverviewWorkspace({ dashboard }: CustomerOverviewWorkspaceProps) {
  const overview = dashboard.overview;

  return (
    <div className="grid gap-4 lg:gap-5">
      <section className="flex flex-wrap items-end justify-between gap-4 px-1 pt-3 max-lg:px-0">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-[34px] font-semibold leading-tight tracking-[-0.04em] text-text-primary max-lg:text-[30px]">
              Good morning, {overview.greetingName}
            </h1>
            <StatusPill label={dashboard.statusLabel} tone={dashboard.statusTone} />
          </div>
          <p className="mt-2 max-w-[680px] text-sm leading-6 text-text-body">{overview.subtitle}</p>
        </div>
        <div className="rounded-full border border-customer-border bg-customer-card px-4 py-2 text-sm font-medium text-brand-blue shadow-[0_12px_28px_rgba(33,84,239,0.06)]">
          {dashboard.rangeLabel} · {dashboard.dataModeLabel}
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-[1.05fr_1fr_1.05fr]">
        <CustomerOverviewPlanCard plan={overview.plan} usageLimit={overview.usageLimit} />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-2">
          {overview.stats.map((stat) => (
            <CustomerOverviewStatCard key={stat.label} stat={stat} />
          ))}
        </div>

        <CustomerOverviewPerformanceChart data={overview.chart} />
      </section>

      <section className="grid gap-4 xl:grid-cols-[0.78fr_1.42fr]">
        <CustomerOverviewProductsCard products={overview.products} />
        <CustomerOverviewRecentActivity rows={overview.activities} />
      </section>
    </div>
  );
}
