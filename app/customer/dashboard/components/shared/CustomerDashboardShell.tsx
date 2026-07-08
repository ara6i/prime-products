import type { ReactNode } from "react";
import { cn } from "@/app/shared/lib/utils";
import type { CustomerDashboardViewModel } from "../../types";
import { CustomerDashboardHeader } from "./CustomerDashboardHeader";
import { CustomerDashboardSidebar } from "./CustomerDashboardSidebar";

interface CustomerDashboardShellProps {
  dashboard: CustomerDashboardViewModel;
  logoutAction: () => Promise<void>;
  children: ReactNode;
  dataModeLabel?: string;
  showAnalyticsControls?: boolean;
  showViewControls?: boolean;
  contentClassName?: string;
}

export function CustomerDashboardShell({
  dashboard,
  logoutAction,
  children,
  dataModeLabel,
  showAnalyticsControls = true,
  showViewControls = false,
  contentClassName,
}: CustomerDashboardShellProps) {
  return (
    <div className="hidden min-h-screen bg-customer-page text-text-primary lg:flex">
      <CustomerDashboardSidebar
        navItems={dashboard.navItems}
        storeName={dashboard.storeName}
        domain={dashboard.domain}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <CustomerDashboardHeader
          storeName={dashboard.storeName}
          projectName={dashboard.projectName}
          pageTitle={dashboard.pageTitle}
          dataModeLabel={dataModeLabel ?? dashboard.dataModeLabel}
          rangeLabel={dashboard.rangeLabel}
          statusLabel={dashboard.statusLabel}
          statusTone={dashboard.statusTone}
          rangeOptions={dashboard.rangeOptions}
          viewOptions={dashboard.viewOptions}
          navItems={dashboard.navItems}
          domain={dashboard.domain}
          ownerEmail={dashboard.ownerEmail}
          logoutAction={logoutAction}
          showAnalyticsControls={showAnalyticsControls}
          showViewControls={showViewControls}
        />

        <main className={cn("min-w-0 flex-1 px-[var(--spacing-customer-content-x)] pb-[var(--spacing-customer-content-y)]", contentClassName)}>
          {children}
        </main>
      </div>
    </div>
  );
}
