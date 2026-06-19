import { logoutAction } from "@/app/admin/login/actions";
import { AdminDashboardShell } from "../../components/AdminDashboardShell";
import { AdminDashboardThemeProvider } from "../../components/shared/AdminDashboardThemeProvider";
import { CustomersPage } from "../components/CustomersPage";
import { mapCustomersPage } from "../mappers/customersMapper";
import {
  fetchAdminCustomers,
  fetchAdminShopifyTryOnOverview,
  fetchAdminShopifyUninstallReport,
} from "../services/customersService";

export const dynamic = "force-dynamic";

export default async function AdminShopifyCustomersPage() {
  const [response, overview, uninstallReport] = await Promise.all([
    fetchAdminCustomers({
      page: 1,
      limit: 25,
      source: "shopify",
      search: "",
    }),
    fetchAdminShopifyTryOnOverview("30d"),
    fetchAdminShopifyUninstallReport(),
  ]);
  const view = mapCustomersPage(response, "shopify", overview, uninstallReport);

  return (
    <AdminDashboardThemeProvider>
      <AdminDashboardShell logoutAction={logoutAction} activeHref="/admin/customers/shopify">
        <CustomersPage initialView={view} source="shopify" />
      </AdminDashboardShell>
    </AdminDashboardThemeProvider>
  );
}
