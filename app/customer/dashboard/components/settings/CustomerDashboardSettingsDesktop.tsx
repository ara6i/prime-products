import { CustomerDashboardShell } from "../shared/CustomerDashboardShell";
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
    <CustomerDashboardShell
      dashboard={dashboard}
      logoutAction={logoutAction}
      dataModeLabel="Workspace controls"
      showAnalyticsControls={false}
      contentClassName="py-1"
    >
      <CustomerSettingsWorkspace settings={settings} />
    </CustomerDashboardShell>
  );
}
