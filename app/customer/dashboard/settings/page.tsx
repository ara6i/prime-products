import { redirect } from "next/navigation";
import { Toaster } from "sonner";
import { logoutAction } from "@/app/customer/login/actions";
import { getCustomerMe } from "@/app/customer/shared/services/customerAuthService";
import { isCustomerOnboardingCompleted } from "@/app/customer/shared/services/customerOnboardingCompletion";
import { CustomerDashboardThemeProvider } from "../components/shared/CustomerDashboardThemeProvider";
import { CustomerDashboardSettingsDesktop } from "../components/settings/CustomerDashboardSettingsDesktop";
import { CustomerDashboardSettingsMobile } from "../components/settings/CustomerDashboardSettingsMobile";
import { mapCustomerDashboard } from "../mappers/dashboardMapper";
import { getCustomerDashboardOverview } from "../services/dashboardService";
import { getCustomerSettings } from "../services/settingsService";

export const dynamic = "force-dynamic";

export default async function CustomerDashboardSettingsPage() {
  const me = await getCustomerMe();

  if (!me) redirect("/customer/login");
  if (me.role !== "merchant") redirect("/customer/login");
  if (!(await isCustomerOnboardingCompleted(me.username))) redirect("/customer/onboarding");

  const [rawDashboard, settings] = await Promise.all([
    getCustomerDashboardOverview(),
    getCustomerSettings(),
  ]);
  const dashboard = mapCustomerDashboard(rawDashboard, "charts", "settings");

  return (
    <CustomerDashboardThemeProvider>
      <CustomerDashboardSettingsDesktop dashboard={dashboard} settings={settings} logoutAction={logoutAction} />
      <CustomerDashboardSettingsMobile dashboard={dashboard} settings={settings} logoutAction={logoutAction} />
      <Toaster position="top-right" closeButton />
    </CustomerDashboardThemeProvider>
  );
}
