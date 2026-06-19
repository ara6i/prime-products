import { logoutAction } from "@/app/admin/login/actions";
import { AdminDashboardShell } from "./components/AdminDashboardShell";
import { AdminDashboardThemeProvider } from "./components/shared/AdminDashboardThemeProvider";
import { ShopifyOverviewPage } from "./overview/components/ShopifyOverviewPage";
import { mapShopifyDashboardOverview } from "./overview/mappers/overviewMapper";
import { fetchShopifyDashboardOverview } from "./overview/services/overviewService";
import type { ShopifyDashboardRange } from "./overview/types";

export const dynamic = "force-dynamic";

interface AdminPageProps {
  searchParams: Promise<{
    range?: string | string[];
    tryOnRange?: string | string[];
    installRange?: string | string[];
    date?: string | string[];
  }>;
}

function parseRange(raw: string | string[] | undefined): ShopifyDashboardRange {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === "today" || value === "week" || value === "month" || value === "range") return value;
  return "today";
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const params = await searchParams;
  const date = Array.isArray(params.date) ? params.date[0] : params.date;
  const raw = await fetchShopifyDashboardOverview({
    tryOnRange: parseRange(params.tryOnRange ?? params.range),
    installRange: parseRange(params.installRange ?? params.range),
    date,
  });
  const view = await mapShopifyDashboardOverview(raw);

  return (
    <AdminDashboardThemeProvider>
      <AdminDashboardShell logoutAction={logoutAction} activeHref="/admin">
        <ShopifyOverviewPage view={view} />
      </AdminDashboardShell>
    </AdminDashboardThemeProvider>
  );
}
