import Image from "next/image";
import { CustomerDashboardHeader } from "../shared/CustomerDashboardHeader";
import { CustomerDashboardMobileNav } from "../mobile/CustomerDashboardMobileNav";
import { CustomerAnalyticsWorkspace } from "./CustomerAnalyticsWorkspace";
import type { CustomerDashboardViewModel } from "../../types";

interface CustomerDashboardAnalyticsMobileProps {
  dashboard: CustomerDashboardViewModel;
  logoutAction: () => Promise<void>;
}

export function CustomerDashboardAnalyticsMobile({
  dashboard,
  logoutAction,
}: CustomerDashboardAnalyticsMobileProps) {
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
        compactTitle="Analytics"
        showViewControls={false}
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

      <main className="px-[4vw] pb-[8vw]">
        <CustomerAnalyticsWorkspace dashboard={dashboard} />
      </main>
    </div>
  );
}
