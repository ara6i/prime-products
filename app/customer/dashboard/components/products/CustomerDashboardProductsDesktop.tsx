import { CustomerDashboardShell } from "../shared/CustomerDashboardShell";
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
    <CustomerDashboardShell
      dashboard={dashboard}
      logoutAction={logoutAction}
      dataModeLabel="Catalog workspace"
      showAnalyticsControls={false}
      contentClassName="py-1"
    >
      <CustomerProductCsvWorkspace initialProducts={initialProducts} verifiedWebsiteUrl={dashboard.domain} />
    </CustomerDashboardShell>
  );
}
