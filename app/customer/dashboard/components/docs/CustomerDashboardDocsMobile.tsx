import Image from "next/image";
import { CustomerDashboardHeader } from "../shared/CustomerDashboardHeader";
import { CustomerDashboardMobileNav } from "../mobile/CustomerDashboardMobileNav";
import { CustomerDashboardFullDocumentation } from "./CustomerDashboardFullDocumentation";
import type { CustomerDashboardViewModel } from "../../types";

interface CustomerDashboardDocsMobileProps {
  dashboard: CustomerDashboardViewModel;
  logoutAction: () => Promise<void>;
}

export function CustomerDashboardDocsMobile({ dashboard, logoutAction }: CustomerDashboardDocsMobileProps) {
  return (
    <div className="min-h-screen text-text-primary lg:hidden">
      <CustomerDashboardHeader
        storeName={dashboard.storeName}
        projectName={dashboard.projectName}
        pageTitle={dashboard.pageTitle}
        dataModeLabel="Developer reference"
        rangeLabel={dashboard.rangeLabel}
        statusLabel={dashboard.statusLabel}
        statusTone={dashboard.statusTone}
        rangeOptions={dashboard.rangeOptions}
        viewOptions={dashboard.viewOptions}
        logoutAction={logoutAction}
        compact
        compactTitle="Documentation"
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
        <CustomerDashboardFullDocumentation />
      </main>
    </div>
  );
}
