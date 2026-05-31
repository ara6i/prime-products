import { logoutAction } from "@/app/admin/login/actions";
import { AdminDashboardShell } from "../../components/AdminDashboardShell";
import { AdminDashboardThemeProvider } from "../../components/shared/AdminDashboardThemeProvider";
import { CustomersPage } from "../components/CustomersPage";
import { mapCustomersPage } from "../mappers/customersMapper";
import { fetchAdminCustomers } from "../services/customersService";

export const dynamic = "force-dynamic";

export default async function AdminShopifyCustomersPage() {
  const response = await fetchAdminCustomers({
    page: 1,
    limit: 25,
    source: "shopify",
    search: "",
  });
  const view = mapCustomersPage(response, "shopify");

  return (
    <AdminDashboardThemeProvider>
      <AdminDashboardShell logoutAction={logoutAction} activeHref="/admin/customers/shopify">
        <CustomersPage initialView={view} source="shopify" />
      </AdminDashboardShell>
    </AdminDashboardThemeProvider>
  );
}
