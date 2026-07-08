import { CountrySplitCard } from "../shared/CountrySplitCard";
import { CustomerCountriesMapCard } from "../shared/CustomerCountriesMapCard";
import { CustomerDashboardCard } from "../shared/CustomerDashboardCard";
import { DailyActivityChart } from "../shared/DailyActivityChart";
import { DeviceSplitChart } from "../shared/DeviceSplitChart";
import { FunnelCard } from "../shared/FunnelCard";
import { MetricCard } from "../shared/MetricCard";
import { NumberBreakdownCard } from "../shared/NumberBreakdownCard";
import { PeakActivityCard } from "../shared/PeakActivityCard";
import { SizeInsightsCard } from "../shared/SizeInsightsCard";
import { TopProductsCard } from "../shared/TopProductsCard";
import type { CustomerDashboardViewModel } from "../../types";
import { formatCompactNumber } from "../../utils/formatters";

interface CustomerAnalyticsWorkspaceProps {
  dashboard: CustomerDashboardViewModel;
}

function getPeakHourLabel(hourHistogram: number[]): string {
  const peak = hourHistogram.reduce(
    (best, count, hour) => (count > best.count ? { count, hour } : best),
    { count: 0, hour: 0 },
  );

  if (peak.count === 0) return "Waiting for traffic";
  return `${String(peak.hour).padStart(2, "0")}:00`;
}

function getSizeChangeSignal(dashboard: CustomerDashboardViewModel): number {
  return dashboard.sizeInsights.reduce((sum, insight) => sum + insight.changedAfterTryOn, 0);
}

export function CustomerAnalyticsWorkspace({ dashboard }: CustomerAnalyticsWorkspaceProps) {
  const isNumbersView = dashboard.activeView === "numbers";
  const totalStarted = dashboard.dailyActivity.reduce((sum, point) => sum + point.initiated, 0);
  const totalCompleted = dashboard.dailyActivity.reduce((sum, point) => sum + point.completed, 0);
  const topCountry = dashboard.countrySplit[0];
  const topProduct = dashboard.topProducts[0];
  const sizeChangeSignal = getSizeChangeSignal(dashboard);

  return (
    <div className="grid gap-4 lg:gap-5">
      <section className="overflow-hidden rounded-customer-card border border-customer-border bg-customer-card shadow-customer-card">
        <div className="grid gap-5 p-[var(--spacing-customer-card)] xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.35fr)]">
          <div className="flex min-w-0 flex-col justify-between gap-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-blue">Analytics</p>
              <h1 className="mt-2 text-[32px] font-semibold leading-tight tracking-[-0.045em] text-text-primary max-lg:text-[8vw]">
                Storefront performance
              </h1>
              <p className="mt-3 max-w-[560px] text-sm leading-6 text-text-body max-lg:text-[3.5vw]">
                Try-on volume, customer geography, product demand, sizing behavior, and peak shopping activity in one workspace.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-customer-border bg-customer-soft p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-customer-muted">Started</p>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-text-primary">
                  {formatCompactNumber(totalStarted)}
                </p>
              </div>
              <div className="rounded-2xl border border-customer-border bg-customer-soft p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-customer-muted">Completed</p>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-text-primary">
                  {formatCompactNumber(totalCompleted)}
                </p>
              </div>
              <div className="rounded-2xl border border-customer-border bg-customer-soft p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-customer-muted">Peak hour</p>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-text-primary">
                  {getPeakHourLabel(dashboard.hourHistogram)}
                </p>
              </div>
              <div className="rounded-2xl border border-customer-border bg-customer-soft p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-customer-muted">Size changes</p>
                <p className="mt-2 text-2xl font-semibold tracking-[-0.04em] text-text-primary">
                  {formatCompactNumber(sizeChangeSignal)}
                </p>
              </div>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {dashboard.metricCards.map((metric) => (
              <MetricCard key={metric.label} metric={metric} />
            ))}
          </div>
        </div>

        <div className="grid border-t border-customer-border md:grid-cols-2">
          <div className="border-b border-customer-border p-5 md:border-r xl:border-b-0">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-customer-muted">Top country</p>
            <p className="mt-2 truncate text-lg font-semibold text-text-primary">
              {topCountry ? topCountry.name : "Waiting for countries"}
            </p>
            <p className="mt-1 text-sm text-text-body">
              {topCountry ? `${topCountry.count.toLocaleString()} try-ons` : "No country data yet"}
            </p>
          </div>
          <div className="border-b border-customer-border p-5 xl:border-b-0">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-customer-muted">Top product</p>
            <p className="mt-2 truncate text-lg font-semibold text-text-primary">
              {topProduct ? topProduct.productTitle : "Waiting for products"}
            </p>
            <p className="mt-1 text-sm text-text-body">
              {topProduct ? `${topProduct.tryOns.toLocaleString()} try-ons` : "No product data yet"}
            </p>
          </div>
        </div>
      </section>

      {isNumbersView ? (
        <section className="grid gap-4 xl:grid-cols-2">
          {dashboard.numberSections.map((section) => (
            <NumberBreakdownCard key={section.title} section={section} />
          ))}
        </section>
      ) : (
        <>
          <section className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(380px,0.8fr)]">
            <DailyActivityChart data={dashboard.dailyActivity} />
            <CustomerCountriesMapCard countries={dashboard.countrySplit} />
          </section>

          <section className="grid gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)_minmax(0,1fr)]">
            <CustomerDashboardCard title="Devices" description="Mobile, desktop, and tablet split">
              <DeviceSplitChart data={dashboard.deviceSplit} />
            </CustomerDashboardCard>
            <FunnelCard steps={dashboard.funnel} />
            <PeakActivityCard
              hourHistogram={dashboard.hourHistogram}
              weekdayHistogram={dashboard.weekdayHistogram}
            />
          </section>

          <section className="grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <TopProductsCard products={dashboard.topProducts} />
            <CountrySplitCard
              countries={dashboard.countrySplit}
              title="Country ranking"
              description="Highest-volume customer locations"
            />
          </section>

          <SizeInsightsCard insights={dashboard.sizeInsights} />
        </>
      )}
    </div>
  );
}
