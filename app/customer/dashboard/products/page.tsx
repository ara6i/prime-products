import { redirect } from "next/navigation";
import { logoutAction } from "@/app/customer/login/actions";
import { getCustomerMe } from "@/app/customer/shared/services/customerAuthService";
import { isCustomerOnboardingCompleted } from "@/app/customer/shared/services/customerOnboardingCompletion";
import { CustomerDashboardThemeProvider } from "../components/shared/CustomerDashboardThemeProvider";
import { CustomerDashboardProductsDesktop } from "../components/products/CustomerDashboardProductsDesktop";
import { CustomerDashboardProductsMobile } from "../components/products/CustomerDashboardProductsMobile";
import { mapCustomerDashboard } from "../mappers/dashboardMapper";
import { getCustomerDashboardOverview } from "../services/dashboardService";
import { getCustomerDemoProducts } from "../services/customerDemoProductsService";

export const dynamic = "force-dynamic";

export default async function CustomerDashboardProductsPage() {
  const me = await getCustomerMe();

  if (!me) redirect("/customer/login");
  if (me.role !== "merchant") redirect("/customer/login");
  if (!(await isCustomerOnboardingCompleted(me.username))) redirect("/customer/onboarding");

  const rawDashboard = await getCustomerDashboardOverview();
  const dashboard = mapCustomerDashboard(rawDashboard, "charts", "products");
  const initialProducts = await getCustomerDemoProducts();

  return (
    <CustomerDashboardThemeProvider>
      <CustomerDashboardProductsDesktop dashboard={dashboard} initialProducts={initialProducts} logoutAction={logoutAction} />
      <CustomerDashboardProductsMobile dashboard={dashboard} initialProducts={initialProducts} logoutAction={logoutAction} />
    </CustomerDashboardThemeProvider>
  );
}
