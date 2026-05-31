import { logoutAction } from "@/app/admin/login/actions";
import { AdminDashboardShell } from "../components/AdminDashboardShell";
import { AdminDashboardThemeProvider } from "../components/shared/AdminDashboardThemeProvider";
import { RevenuePage } from "./components/RevenuePage";
import { fetchShopifyRevenueReport } from "./services/revenueService";
import type { RevenueView } from "./types";

export const dynamic = "force-dynamic";

interface AdminRevenueRouteProps {
  searchParams: Promise<{
    view?: string | string[];
  }>;
}

function parseRevenueView(raw: string | string[] | undefined): RevenueView {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === "full" || value === "shopify" || value === "sdk") return value;
  return "shopify";
}

export default async function AdminRevenueRoute({ searchParams }: AdminRevenueRouteProps) {
  const params = await searchParams;
  const activeView = parseRevenueView(params.view);
  const shopifyReport = await fetchShopifyRevenueReport();

  return (
    <AdminDashboardThemeProvider>
      <AdminDashboardShell logoutAction={logoutAction} activeHref="/admin/revenue">
        <RevenuePage activeView={activeView} shopifyReport={shopifyReport} />
      </AdminDashboardShell>
    </AdminDashboardThemeProvider>
  );
}
