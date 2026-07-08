import { CustomerDashboardShell } from "../shared/CustomerDashboardShell";
import { CustomerAnalyticsWorkspace } from "./CustomerAnalyticsWorkspace";
import type { CustomerDashboardViewModel } from "../../types";

interface CustomerDashboardAnalyticsDesktopProps {
  dashboard: CustomerDashboardViewModel;
  logoutAction: () => Promise<void>;
}

export function CustomerDashboardAnalyticsDesktop({
  dashboard,
  logoutAction,
}: CustomerDashboardAnalyticsDesktopProps) {
  return (
    <CustomerDashboardShell
      dashboard={dashboard}
      logoutAction={logoutAction}
      dataModeLabel={dashboard.dataModeLabel}
      showViewControls={false}
      contentClassName="py-1"
    >
      <CustomerAnalyticsWorkspace dashboard={dashboard} />
    </CustomerDashboardShell>
  );
}
