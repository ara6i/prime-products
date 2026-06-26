import { redirect } from "next/navigation";
import { logoutAction } from "@/app/customer/login/actions";
import { getCustomerMe } from "@/app/customer/shared/services/customerAuthService";
import { isCustomerOnboardingCompleted } from "@/app/customer/shared/services/customerOnboardingCompletion";
import { CustomerDashboardDocsDesktop } from "../components/docs/CustomerDashboardDocsDesktop";
import { CustomerDashboardDocsMobile } from "../components/docs/CustomerDashboardDocsMobile";
import { CustomerDashboardThemeProvider } from "../components/shared/CustomerDashboardThemeProvider";
import { mapCustomerDashboard } from "../mappers/dashboardMapper";
import { getCustomerDashboardOverview } from "../services/dashboardService";

export const dynamic = "force-dynamic";

export default async function CustomerDashboardDocsPage() {
  const me = await getCustomerMe();

  if (!me) redirect("/customer/login");
  if (me.role !== "merchant") redirect("/customer/login");
  if (!(await isCustomerOnboardingCompleted(me.username))) redirect("/customer/onboarding");

  const rawDashboard = await getCustomerDashboardOverview();
  const dashboard = mapCustomerDashboard(rawDashboard, "charts", "docs");

  return (
    <CustomerDashboardThemeProvider>
      <CustomerDashboardDocsDesktop dashboard={dashboard} logoutAction={logoutAction} />
      <CustomerDashboardDocsMobile dashboard={dashboard} logoutAction={logoutAction} />
    </CustomerDashboardThemeProvider>
  );
}
