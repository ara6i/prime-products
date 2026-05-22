import { CountrySplitCard } from "../shared/CountrySplitCard";
import { CustomerCountriesMapCard } from "../shared/CustomerCountriesMapCard";
import { CustomerDashboardCard } from "../shared/CustomerDashboardCard";
import { CustomerDashboardHeader } from "../shared/CustomerDashboardHeader";
import { CustomerDashboardSidebar } from "../shared/CustomerDashboardSidebar";
import { DailyActivityChart } from "../shared/DailyActivityChart";
import { DeviceSplitChart } from "../shared/DeviceSplitChart";
import { FunnelCard } from "../shared/FunnelCard";
import { MetricCard } from "../shared/MetricCard";
import { NumberBreakdownCard } from "../shared/NumberBreakdownCard";
import { PeakActivityCard } from "../shared/PeakActivityCard";
import { SizeInsightsCard } from "../shared/SizeInsightsCard";
import { TopProductsCard } from "../shared/TopProductsCard";
import type { CustomerDashboardViewModel } from "../../types";

interface CustomerDashboardDesktopProps {
  dashboard: CustomerDashboardViewModel;
  logoutAction: () => Promise<void>;
}

export function CustomerDashboardDesktop({ dashboard, logoutAction }: CustomerDashboardDesktopProps) {
  return (
    <div className="hidden min-h-screen text-text-primary lg:flex">
      <CustomerDashboardSidebar
        navItems={dashboard.navItems}
        storeName={dashboard.storeName}
        domain={dashboard.domain}
      />

      <div className="min-w-0 flex-1">
        <CustomerDashboardHeader
          storeName={dashboard.storeName}
          projectName={dashboard.projectName}
          pageTitle={dashboard.pageTitle}
          dataModeLabel={dashboard.dataModeLabel}
          rangeLabel={dashboard.rangeLabel}
          statusLabel={dashboard.statusLabel}
          statusTone={dashboard.statusTone}
          rangeOptions={dashboard.rangeOptions}
          viewOptions={dashboard.viewOptions}
          logoutAction={logoutAction}
        />

        <main className="px-[var(--spacing-customer-content-x)] py-[var(--spacing-customer-content-y)]">
          <section className="grid grid-cols-4 gap-[var(--spacing-customer-gap-md)]">
            {dashboard.metricCards.map((metric) => (
              <MetricCard key={metric.label} metric={metric} />
            ))}
          </section>

          {dashboard.activeView === "charts" ? (
            <section className="mt-[var(--spacing-customer-gap-lg)] grid gap-[var(--spacing-customer-gap-lg)]">
              <div className="grid grid-cols-[1.35fr_0.85fr] gap-[var(--spacing-customer-gap-lg)]">
                <DailyActivityChart data={dashboard.dailyActivity} />
                <FunnelCard steps={dashboard.funnel} />
              </div>

              <div className="grid grid-cols-[1.35fr_0.85fr] gap-[var(--spacing-customer-gap-lg)]">
                <CustomerCountriesMapCard countries={dashboard.countrySplit} />
                <CountrySplitCard
                  countries={dashboard.countrySplit}
                  title="Top countries"
                  description="Where try-ons happen"
                />
              </div>

              <div className="grid grid-cols-[0.85fr_1.15fr] gap-[var(--spacing-customer-gap-lg)]">
                <CustomerDashboardCard
                  title="Devices"
                  description="Mobile / desktop split"
                  bodyClassName="h-[10.417vw]"
                >
                  <DeviceSplitChart data={dashboard.deviceSplit} />
                </CustomerDashboardCard>
                <TopProductsCard products={dashboard.topProducts} />
              </div>

              <SizeInsightsCard insights={dashboard.sizeInsights} />

              <PeakActivityCard
                hourHistogram={dashboard.hourHistogram}
                weekdayHistogram={dashboard.weekdayHistogram}
              />
            </section>
          ) : (
            <section className="mt-[var(--spacing-customer-gap-lg)] grid grid-cols-2 gap-[var(--spacing-customer-gap-lg)]">
              {dashboard.numberSections.map((section) => (
                <NumberBreakdownCard key={section.title} section={section} />
              ))}
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
