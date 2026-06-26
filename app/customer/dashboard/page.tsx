import { redirect } from "next/navigation";
import { logoutAction } from "@/app/customer/login/actions";
import { getCustomerMe } from "@/app/customer/shared/services/customerAuthService";
import { isCustomerOnboardingCompleted } from "@/app/customer/shared/services/customerOnboardingCompletion";
import { CustomerDashboardDesktop } from "./components/desktop/CustomerDashboardDesktop";
import { CustomerDashboardMobile } from "./components/mobile/CustomerDashboardMobile";
import { CustomerDashboardThemeProvider } from "./components/shared/CustomerDashboardThemeProvider";
import { mapCustomerDashboard } from "./mappers/dashboardMapper";
import { getCustomerDashboardOverview } from "./services/dashboardService";
import type { CustomerDashboardRange, CustomerDashboardView } from "./types";
import { parseCustomerDashboardRange, parseCustomerDashboardView } from "./utils/range";

export const dynamic = "force-dynamic";

interface CustomerDashboardPageProps {
  searchParams: Promise<{
    range?: CustomerDashboardRange | string;
    view?: CustomerDashboardView | string;
  }>;
}

export default async function CustomerDashboardPage({ searchParams }: CustomerDashboardPageProps) {
  const { range: rawRange, view: rawView } = await searchParams;
  const range = parseCustomerDashboardRange(rawRange);
  const view = parseCustomerDashboardView(rawView);
  const me = await getCustomerMe();

  if (!me) redirect("/customer/login");
  if (me.role !== "merchant") redirect("/customer/login");
  if (!(await isCustomerOnboardingCompleted(me.username))) redirect("/customer/onboarding");

  const rawDashboard = await getCustomerDashboardOverview(range);
  const dashboard = mapCustomerDashboard(rawDashboard, view);

  return (
    <CustomerDashboardThemeProvider>
      <CustomerDashboardDesktop dashboard={dashboard} logoutAction={logoutAction} />
      <CustomerDashboardMobile dashboard={dashboard} logoutAction={logoutAction} />
    </CustomerDashboardThemeProvider>
  );
}
