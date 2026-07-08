import { CustomerDashboardShell } from "../shared/CustomerDashboardShell";
import { CustomerPlansWorkspace } from "./CustomerPlansWorkspace";
import type { CustomerDashboardViewModel } from "../../types";
import type { CustomerPlansViewModel } from "../../types/plans";

interface CustomerDashboardPlansDesktopProps {
  dashboard: CustomerDashboardViewModel;
  plans: CustomerPlansViewModel;
  logoutAction: () => Promise<void>;
}

export function CustomerDashboardPlansDesktop({ dashboard, plans, logoutAction }: CustomerDashboardPlansDesktopProps) {
  return (
    <CustomerDashboardShell
      dashboard={dashboard}
      logoutAction={logoutAction}
      dataModeLabel="Billing workspace"
      showAnalyticsControls={false}
      contentClassName="py-1"
    >
      <CustomerPlansWorkspace plans={plans} />
    </CustomerDashboardShell>
  );
}
