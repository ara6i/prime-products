import { logoutAction } from "@/app/admin/login/actions";
import { AdminDashboardShell } from "../components/AdminDashboardShell";
import { AdminDashboardThemeProvider } from "../components/shared/AdminDashboardThemeProvider";
import { UsersPage } from "./components/UsersPage";
import { mapProfileUsersPage } from "./mappers/usersMapper";
import { fetchAdminProfileUsers } from "./services/usersService";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const response = await fetchAdminProfileUsers();
  const view = mapProfileUsersPage(response);

  return (
    <AdminDashboardThemeProvider>
      <AdminDashboardShell logoutAction={logoutAction} activeHref="/admin/users">
        <UsersPage view={view} />
      </AdminDashboardShell>
    </AdminDashboardThemeProvider>
  );
}
