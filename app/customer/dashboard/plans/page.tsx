import { redirect } from "next/navigation";
import { Toaster } from "sonner";
import { logoutAction } from "@/app/customer/login/actions";
import { getCustomerMe } from "@/app/customer/shared/services/customerAuthService";
import { isCustomerOnboardingCompleted } from "@/app/customer/shared/services/customerOnboardingCompletion";
import { CustomerDashboardThemeProvider } from "../components/shared/CustomerDashboardThemeProvider";
import { CustomerDashboardPlansDesktop } from "../components/plans/CustomerDashboardPlansDesktop";
import { CustomerDashboardPlansMobile } from "../components/plans/CustomerDashboardPlansMobile";
import { mapCustomerDashboard } from "../mappers/dashboardMapper";
import { mapCustomerPlans } from "../mappers/customerPlansMapper";
import { getCustomerDashboardOverview } from "../services/dashboardService";
import { getCustomerDemoProducts } from "../services/customerDemoProductsService";

export const dynamic = "force-dynamic";

interface CustomerDashboardPlansPageProps {
  searchParams: Promise<{
    productTier?: string;
    tryOns?: string;
    refill?: string;
    checkoutError?: string;
  }>;
}

export default async function CustomerDashboardPlansPage({ searchParams }: CustomerDashboardPlansPageProps) {
  const { productTier, tryOns, refill, checkoutError } = await searchParams;
  const me = await getCustomerMe();

  if (!me) redirect("/customer/login");
  if (me.role !== "merchant") redirect("/customer/login");
  if (!(await isCustomerOnboardingCompleted(me.username))) redirect("/customer/onboarding");

  const [rawDashboard, initialProducts] = await Promise.all([
    getCustomerDashboardOverview(),
    getCustomerDemoProducts(),
  ]);
  const dashboard = mapCustomerDashboard(rawDashboard, "charts", "plans");
  const plans = mapCustomerPlans({
    dashboard: rawDashboard,
    products: initialProducts,
    productTier,
    requestedTryOns: tryOns,
    autoRefill: refill,
    checkoutError,
  });

  return (
    <CustomerDashboardThemeProvider>
      <Toaster position="top-right" closeButton richColors />
      <CustomerDashboardPlansDesktop dashboard={dashboard} plans={plans} logoutAction={logoutAction} />
      <CustomerDashboardPlansMobile dashboard={dashboard} plans={plans} logoutAction={logoutAction} />
    </CustomerDashboardThemeProvider>
  );
}
