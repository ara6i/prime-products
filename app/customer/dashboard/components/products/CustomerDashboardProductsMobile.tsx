import Image from "next/image";
import { CustomerDashboardHeader } from "../shared/CustomerDashboardHeader";
import { CustomerDashboardMobileNav } from "../mobile/CustomerDashboardMobileNav";
import { CustomerProductCsvWorkspace } from "./CustomerProductCsvWorkspace";
import type { CustomerDashboardViewModel } from "../../types";
import type { CustomerProductCsvParseResult } from "../../types/products";

interface CustomerDashboardProductsMobileProps {
  dashboard: CustomerDashboardViewModel;
  initialProducts: CustomerProductCsvParseResult;
  logoutAction: () => Promise<void>;
}

export function CustomerDashboardProductsMobile({ dashboard, initialProducts, logoutAction }: CustomerDashboardProductsMobileProps) {
  return (
    <div className="min-h-screen text-text-primary lg:hidden">
      <CustomerDashboardHeader
        storeName={dashboard.storeName}
        projectName={dashboard.projectName}
        pageTitle={dashboard.pageTitle}
        dataModeLabel="CSV product workspace"
        rangeLabel={dashboard.rangeLabel}
        statusLabel={dashboard.statusLabel}
        statusTone={dashboard.statusTone}
        rangeOptions={dashboard.rangeOptions}
        viewOptions={dashboard.viewOptions}
        logoutAction={logoutAction}
        compact
        compactTitle="Products"
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
        <CustomerProductCsvWorkspace initialProducts={initialProducts} />
      </main>
    </div>
  );
}
