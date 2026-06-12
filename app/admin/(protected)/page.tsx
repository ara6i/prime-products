import { logoutAction } from "@/app/admin/login/actions";
import { AdminDashboardShell } from "./components/AdminDashboardShell";
import { AdminDashboardThemeProvider } from "./components/shared/AdminDashboardThemeProvider";
import { ShopifyTryOnOverviewPage } from "./overview/components/ShopifyTryOnOverviewPage";
import { fetchShopifyTryOnOverview } from "./overview/services/overviewService";
import type { ShopifyTryOnRange } from "./overview/types";

export const dynamic = "force-dynamic";

interface AdminPageProps {
  searchParams: Promise<{
    range?: string | string[];
  }>;
}

function parseRange(raw: string | string[] | undefined): ShopifyTryOnRange {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === "7d" || value === "30d" || value === "90d" || value === "12m") return value;
  return "30d";
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const params = await searchParams;
  const range = parseRange(params.range);
  const overview = await fetchShopifyTryOnOverview(range);

  return (
    <AdminDashboardThemeProvider>
      <AdminDashboardShell logoutAction={logoutAction}>
        <ShopifyTryOnOverviewPage overview={overview} />
      </AdminDashboardShell>
    </AdminDashboardThemeProvider>
  );
}
