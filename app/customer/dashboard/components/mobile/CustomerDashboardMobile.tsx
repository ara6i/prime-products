import Image from "next/image";
import { CustomerOverviewWorkspace } from "../overview/CustomerOverviewWorkspace";
import { CustomerDashboardHeader } from "../shared/CustomerDashboardHeader";
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

      <main className="px-[4vw] pb-[8vw]">
        <CustomerOverviewWorkspace dashboard={dashboard} />
      </main>
    </div>
  );
}
