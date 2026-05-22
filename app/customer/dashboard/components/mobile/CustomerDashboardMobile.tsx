import Image from "next/image";
import { CountrySplitCard } from "../shared/CountrySplitCard";
import { CustomerCountriesMapCard } from "../shared/CustomerCountriesMapCard";
import { CustomerDashboardCard } from "../shared/CustomerDashboardCard";
import { CustomerDashboardHeader } from "../shared/CustomerDashboardHeader";
import { DailyActivityChart } from "../shared/DailyActivityChart";
import { DeviceSplitChart } from "../shared/DeviceSplitChart";
import { FunnelCard } from "../shared/FunnelCard";
import { MetricCard } from "../shared/MetricCard";
import { NumberBreakdownCard } from "../shared/NumberBreakdownCard";
import { PeakActivityCard } from "../shared/PeakActivityCard";
import { SizeInsightsCard } from "../shared/SizeInsightsCard";
import { TopProductsCard } from "../shared/TopProductsCard";
import { CustomerDashboardMobileNav } from "./CustomerDashboardMobileNav";
import type { CustomerDashboardViewModel } from "../../types";

interface CustomerDashboardMobileProps {
  dashboard: CustomerDashboardViewModel;
  logoutAction: () => Promise<void>;
}

export function CustomerDashboardMobile({ dashboard, logoutAction }: CustomerDashboardMobileProps) {
  return (
    <div className="min-h-screen text-text-primary lg:hidden">
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
        compact
        leftSlot={
          <Image
            src="/images/landing/optimized/logo-navbar-small.webp"
            alt="PrimeStyleAI"
            width={52}
            height={50}
            priority
            className="h-[11vw] w-auto object-contain"
          />
        }
      />

      <CustomerDashboardMobileNav navItems={dashboard.navItems} />

      <main className="flex flex-col gap-[5vw] px-[4vw] pb-[8vw]">
        <section className="grid grid-cols-1 gap-[3vw] min-[520px]:grid-cols-2">
          {dashboard.metricCards.map((metric) => (
            <MetricCard key={metric.label} metric={metric} />
          ))}
        </section>

        {dashboard.activeView === "charts" ? (
          <>
            <DailyActivityChart data={dashboard.dailyActivity} />
            <FunnelCard steps={dashboard.funnel} />
            <CustomerDashboardCard title="Devices" description="Mobile / desktop split">
              <DeviceSplitChart data={dashboard.deviceSplit} />
            </CustomerDashboardCard>
            <TopProductsCard products={dashboard.topProducts} />
            <SizeInsightsCard insights={dashboard.sizeInsights} />
            <CustomerCountriesMapCard countries={dashboard.countrySplit} />
            <CountrySplitCard
              countries={dashboard.countrySplit}
              title="Top countries"
              description="Where try-ons happen"
            />
            <PeakActivityCard
              hourHistogram={dashboard.hourHistogram}
              weekdayHistogram={dashboard.weekdayHistogram}
            />
          </>
        ) : (
          dashboard.numberSections.map((section) => (
            <NumberBreakdownCard key={section.title} section={section} />
          ))
        )}
      </main>
    </div>
  );
}
