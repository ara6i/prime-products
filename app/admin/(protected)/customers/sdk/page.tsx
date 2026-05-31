import { logoutAction } from "@/app/admin/login/actions";
import { AdminDashboardShell } from "../../components/AdminDashboardShell";
import { AdminDashboardThemeProvider } from "../../components/shared/AdminDashboardThemeProvider";
import { CustomersPage } from "../components/CustomersPage";
import { mapCustomersPage } from "../mappers/customersMapper";
import { fetchAdminCustomers } from "../services/customersService";

export const dynamic = "force-dynamic";

export default async function AdminSdkCustomersPage() {
  const response = await fetchAdminCustomers({
    page: 1,
    limit: 25,
    source: "sdk",
    search: "",
  });
  const view = mapCustomersPage(response, "sdk");

  return (
    <AdminDashboardThemeProvider>
      <AdminDashboardShell logoutAction={logoutAction} activeHref="/admin/customers/sdk">
        <CustomersPage initialView={view} source="sdk" />
      </AdminDashboardShell>
    </AdminDashboardThemeProvider>
  );
}
