import { notFound } from "next/navigation";
import { logoutAction } from "@/app/admin/login/actions";
import { AdminDashboardShell } from "../../../components/AdminDashboardShell";
import { AdminDashboardThemeProvider } from "../../../components/shared/AdminDashboardThemeProvider";
import { CustomerDetailPage } from "../../components/CustomerDetailPage";
import { ShopifyCustomerControlCenterPage } from "../../components/shopify/ShopifyCustomerControlCenterPage";
import { mapCustomerDetail } from "../../mappers/customersMapper";
import { mapShopifyControlCenter } from "../../mappers/shopifyControlCenterMapper";
import { prepareCustomerMapData } from "@/app/customer/dashboard/utils/map/prepareCustomerMapData";
import {
  fetchAdminCustomer,
  fetchAdminShopifyBehavior,
  fetchAdminShopifyControlCenter,
  fetchAdminShopifyRevenue,
} from "../../services/customersService";
import type { AdminCustomerSource } from "../../types";

export const dynamic = "force-dynamic";

interface AdminCustomerDetailRouteProps {
  params: Promise<{
    source: string;
    id: string;
  }>;
  searchParams?: Promise<{
    from?: string;
    to?: string;
  }>;
}

function isCustomerSource(source: string): source is AdminCustomerSource {
  return source === "sdk" || source === "shopify";
}

function parseDateRange(searchParams: { from?: string; to?: string } | undefined): { from: string; to: string } | null {
  const from = searchParams?.from;
  const to = searchParams?.to;
  if (!from || !to) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(from) || !/^\d{4}-\d{2}-\d{2}$/.test(to)) return null;
  if (to < from) return null;
  return { from, to };
}

function defaultDateRange(): { from: string; to: string } {
  const to = new Date();
  const from = new Date(to);
  from.setUTCDate(from.getUTCDate() - 29);
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  };
}

export default async function AdminCustomerDetailRoute({ params, searchParams }: AdminCustomerDetailRouteProps) {
  const { source, id } = await params;
  const query = await searchParams;
  if (!isCustomerSource(source)) {
    notFound();
  }

  if (source === "shopify") {
    const controlCenter = await fetchAdminShopifyControlCenter(id).catch(() => null);
    if (!controlCenter) {
      const customer = await fetchAdminCustomer(source, id).catch(() => null);
      if (!customer) {
        notFound();
      }

      return (
        <AdminDashboardThemeProvider>
          <AdminDashboardShell logoutAction={logoutAction} activeHref="/admin/customers/shopify">
            <CustomerDetailPage customer={mapCustomerDetail(customer)} />
          </AdminDashboardShell>
        </AdminDashboardThemeProvider>
      );
    }

    const selectedRange = parseDateRange(query) ?? defaultDateRange();
    const [behavior, revenue] = await Promise.all([
      fetchAdminShopifyBehavior(id, "30d", selectedRange).catch(() => null),
      fetchAdminShopifyRevenue(id, "30d", selectedRange).catch(() => null),
    ]);
    const map = behavior ? await prepareCustomerMapData(behavior.countrySplit) : null;
    const view = mapShopifyControlCenter(controlCenter, behavior, revenue, map);

    return (
      <AdminDashboardThemeProvider>
        <AdminDashboardShell logoutAction={logoutAction} activeHref="/admin/customers/shopify">
          <ShopifyCustomerControlCenterPage
            initialView={view}
            initialControlCenter={controlCenter}
            initialBehavior={behavior}
            initialRevenue={revenue}
            initialDateRange={selectedRange}
          />
        </AdminDashboardShell>
      </AdminDashboardThemeProvider>
    );
  }

  const customer = await fetchAdminCustomer(source, id).catch(() => null);
  if (!customer) {
    notFound();
  }

  return (
    <AdminDashboardThemeProvider>
      <AdminDashboardShell logoutAction={logoutAction} activeHref={`/admin/customers/${source}`}>
        <CustomerDetailPage customer={mapCustomerDetail(customer)} />
      </AdminDashboardShell>
    </AdminDashboardThemeProvider>
  );
}
