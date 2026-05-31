import { notFound } from "next/navigation";
import { logoutAction } from "@/app/admin/login/actions";
import { AdminDashboardShell } from "../../../components/AdminDashboardShell";
import { AdminDashboardThemeProvider } from "../../../components/shared/AdminDashboardThemeProvider";
import { CustomerDetailPage } from "../../components/CustomerDetailPage";
import { mapCustomerDetail } from "../../mappers/customersMapper";
import { fetchAdminCustomer } from "../../services/customersService";
import type { AdminCustomerSource } from "../../types";

export const dynamic = "force-dynamic";

interface AdminCustomerDetailRouteProps {
  params: Promise<{
    source: string;
    id: string;
  }>;
}

function isCustomerSource(source: string): source is AdminCustomerSource {
  return source === "sdk" || source === "shopify";
}

export default async function AdminCustomerDetailRoute({ params }: AdminCustomerDetailRouteProps) {
  const { source, id } = await params;
  if (!isCustomerSource(source)) {
    notFound();
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
