import { CustomerOverviewWorkspace } from "../overview/CustomerOverviewWorkspace";
import { CustomerDashboardShell } from "../shared/CustomerDashboardShell";
import type { CustomerDashboardViewModel } from "../../types";

interface CustomerDashboardDesktopProps {
  dashboard: CustomerDashboardViewModel;
  logoutAction: () => Promise<void>;
}

export function CustomerDashboardDesktop({ dashboard, logoutAction }: CustomerDashboardDesktopProps) {
  return (
    <CustomerDashboardShell dashboard={dashboard} logoutAction={logoutAction}>
      <CustomerOverviewWorkspace dashboard={dashboard} />
    </CustomerDashboardShell>
  );
}
