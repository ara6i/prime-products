import { CustomerDashboardHeader } from "../shared/CustomerDashboardHeader";
import { CustomerDashboardSidebar } from "../shared/CustomerDashboardSidebar";
import { CustomerDashboardFullDocumentation } from "./CustomerDashboardFullDocumentation";
import type { CustomerDashboardViewModel } from "../../types";

interface CustomerDashboardDocsDesktopProps {
  dashboard: CustomerDashboardViewModel;
  logoutAction: () => Promise<void>;
}

export function CustomerDashboardDocsDesktop({ dashboard, logoutAction }: CustomerDashboardDocsDesktopProps) {
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
          dataModeLabel="Developer reference"
          rangeLabel={dashboard.rangeLabel}
          statusLabel={dashboard.statusLabel}
          statusTone={dashboard.statusTone}
          rangeOptions={dashboard.rangeOptions}
          viewOptions={dashboard.viewOptions}
          logoutAction={logoutAction}
          showAnalyticsControls={false}
        />

        <main className="px-[var(--spacing-customer-content-x)] py-[var(--spacing-customer-content-y)]">
          <CustomerDashboardFullDocumentation />
        </main>
      </div>
    </div>
  );
}
