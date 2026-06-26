import Image from "next/image";
import { CustomerDashboardHeader } from "../shared/CustomerDashboardHeader";
import { CustomerDashboardMobileNav } from "../mobile/CustomerDashboardMobileNav";
import { CustomerPlansWorkspace } from "./CustomerPlansWorkspace";
import type { CustomerDashboardViewModel } from "../../types";
import type { CustomerPlansViewModel } from "../../types/plans";

interface CustomerDashboardPlansMobileProps {
  dashboard: CustomerDashboardViewModel;
  plans: CustomerPlansViewModel;
  logoutAction: () => Promise<void>;
}

export function CustomerDashboardPlansMobile({ dashboard, plans, logoutAction }: CustomerDashboardPlansMobileProps) {
  return (
    <div className="min-h-screen text-text-primary lg:hidden">
      <CustomerDashboardHeader
        storeName={dashboard.storeName}
        projectName={dashboard.projectName}
        pageTitle={dashboard.pageTitle}
        dataModeLabel="Billing workspace"
        rangeLabel={dashboard.rangeLabel}
        statusLabel={dashboard.statusLabel}
        statusTone={dashboard.statusTone}
        rangeOptions={dashboard.rangeOptions}
        viewOptions={dashboard.viewOptions}
        logoutAction={logoutAction}
        compact
        compactTitle="Plans"
        showAnalyticsControls={false}
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
        <CustomerPlansWorkspace plans={plans} />
      </main>
    </div>
  );
}
