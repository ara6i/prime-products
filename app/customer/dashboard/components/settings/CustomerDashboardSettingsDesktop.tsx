import { CustomerDashboardHeader } from "../shared/CustomerDashboardHeader";
import { CustomerDashboardSidebar } from "../shared/CustomerDashboardSidebar";
import { CustomerSettingsWorkspace } from "./CustomerSettingsWorkspace";
import type { CustomerDashboardViewModel } from "../../types";
import type { CustomerSettingsViewModel } from "../../types/settings";

interface CustomerDashboardSettingsDesktopProps {
  dashboard: CustomerDashboardViewModel;
  settings: CustomerSettingsViewModel;
  logoutAction: () => Promise<void>;
}

export function CustomerDashboardSettingsDesktop({ dashboard, settings, logoutAction }: CustomerDashboardSettingsDesktopProps) {
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
          dataModeLabel="Workspace controls"
          rangeLabel={dashboard.rangeLabel}
          statusLabel={dashboard.statusLabel}
          statusTone={dashboard.statusTone}
          rangeOptions={dashboard.rangeOptions}
          viewOptions={dashboard.viewOptions}
          logoutAction={logoutAction}
          showAnalyticsControls={false}
        />

        <main className="px-[var(--spacing-customer-content-x)] py-[var(--spacing-customer-content-y)]">
          <CustomerSettingsWorkspace settings={settings} />
        </main>
      </div>
    </div>
  );
}
