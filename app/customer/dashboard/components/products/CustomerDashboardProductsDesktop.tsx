import { CustomerDashboardHeader } from "../shared/CustomerDashboardHeader";
import { CustomerDashboardSidebar } from "../shared/CustomerDashboardSidebar";
import { CustomerProductCsvWorkspace } from "./CustomerProductCsvWorkspace";
import type { CustomerDashboardViewModel } from "../../types";
import type { CustomerProductCsvParseResult } from "../../types/products";

interface CustomerDashboardProductsDesktopProps {
  dashboard: CustomerDashboardViewModel;
  initialProducts: CustomerProductCsvParseResult;
  logoutAction: () => Promise<void>;
}

export function CustomerDashboardProductsDesktop({ dashboard, initialProducts, logoutAction }: CustomerDashboardProductsDesktopProps) {
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
          dataModeLabel="CSV product workspace"
          rangeLabel={dashboard.rangeLabel}
          statusLabel={dashboard.statusLabel}
          statusTone={dashboard.statusTone}
          rangeOptions={dashboard.rangeOptions}
          viewOptions={dashboard.viewOptions}
          logoutAction={logoutAction}
          showAnalyticsControls={false}
        />

        <main className="px-[var(--spacing-customer-content-x)] py-[var(--spacing-customer-content-y)]">
          <CustomerProductCsvWorkspace initialProducts={initialProducts} />
        </main>
      </div>
    </div>
  );
}
