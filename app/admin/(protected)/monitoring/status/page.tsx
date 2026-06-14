import { logoutAction } from "@/app/admin/login/actions";
import { AdminDashboardShell } from "../../components/AdminDashboardShell";
import { AdminDashboardThemeProvider } from "../../components/shared/AdminDashboardThemeProvider";
import { PlatformStatusPage } from "./components/PlatformStatusPage";
import { mapPlatformStatus } from "./mappers/statusMapper";
import { fetchPlatformStatus } from "./services/statusService";

export const dynamic = "force-dynamic";

export default async function AdminPlatformStatusRoute() {
  const status = await fetchPlatformStatus();
  const view = mapPlatformStatus(status);

  return (
    <AdminDashboardThemeProvider>
      <AdminDashboardShell logoutAction={logoutAction} activeHref="/admin/monitoring/status">
        <PlatformStatusPage view={view} />
      </AdminDashboardShell>
    </AdminDashboardThemeProvider>
  );
}
