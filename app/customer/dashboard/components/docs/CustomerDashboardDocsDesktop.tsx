import { CustomerDashboardShell } from "../shared/CustomerDashboardShell";
import { CustomerDashboardFullDocumentation } from "./CustomerDashboardFullDocumentation";
import type { CustomerDashboardViewModel } from "../../types";

interface CustomerDashboardDocsDesktopProps {
  dashboard: CustomerDashboardViewModel;
  logoutAction: () => Promise<void>;
}

export function CustomerDashboardDocsDesktop({ dashboard, logoutAction }: CustomerDashboardDocsDesktopProps) {
  return (
    <CustomerDashboardShell
      dashboard={dashboard}
      logoutAction={logoutAction}
      dataModeLabel="Developer reference"
      showAnalyticsControls={false}
      contentClassName="py-1"
    >
      <CustomerDashboardFullDocumentation />
    </CustomerDashboardShell>
  );
}
