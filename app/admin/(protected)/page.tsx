import { logoutAction } from "@/app/admin/login/actions";
import { AdminDashboardShell } from "./components/AdminDashboardShell";
import { AdminDashboardThemeProvider } from "./components/shared/AdminDashboardThemeProvider";

export const dynamic = "force-dynamic";

export default function AdminPage() {
  return (
    <AdminDashboardThemeProvider>
      <AdminDashboardShell logoutAction={logoutAction} />
    </AdminDashboardThemeProvider>
  );
}
