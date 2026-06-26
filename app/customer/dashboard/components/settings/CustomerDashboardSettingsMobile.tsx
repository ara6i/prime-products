import Image from "next/image";
import { CustomerDashboardHeader } from "../shared/CustomerDashboardHeader";
import { CustomerDashboardMobileNav } from "../mobile/CustomerDashboardMobileNav";
import { CustomerSettingsWorkspace } from "./CustomerSettingsWorkspace";
import type { CustomerDashboardViewModel } from "../../types";
import type { CustomerSettingsViewModel } from "../../types/settings";

interface CustomerDashboardSettingsMobileProps {
  dashboard: CustomerDashboardViewModel;
  settings: CustomerSettingsViewModel;
  logoutAction: () => Promise<void>;
}

export function CustomerDashboardSettingsMobile({ dashboard, settings, logoutAction }: CustomerDashboardSettingsMobileProps) {
  return (
    <div className="min-h-screen text-text-primary lg:hidden">
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
        compact
        compactTitle="Settings"
        showAnalyticsControls={false}
        leftSlot={
          <Image
            src="/images/landing/optimized/logo-navbar-small.webp"
            alt="PrimeStyleAI"
            width={52}
            height={50}
            priority
            className="h-[11vw] w-auto object-contain"
          />
        }
      />

      <CustomerDashboardMobileNav navItems={dashboard.navItems} />

      <main className="px-[4vw] pb-[8vw]">
        <CustomerSettingsWorkspace settings={settings} />
      </main>
    </div>
  );
}
