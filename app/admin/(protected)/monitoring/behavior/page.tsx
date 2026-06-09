import { logoutAction } from "@/app/admin/login/actions";
import { AdminDashboardShell } from "../../components/AdminDashboardShell";
import { AdminDashboardThemeProvider } from "../../components/shared/AdminDashboardThemeProvider";
import { BehaviorPage } from "./components/BehaviorPage";
import { mapBehaviorPage } from "./mappers/behaviorMapper";
import { fetchReplaySessions } from "./services/behaviorService";

export const dynamic = "force-dynamic";

export default async function AdminBehaviorRoute() {
  const response = await fetchReplaySessions();
  const view = mapBehaviorPage(response);

  return (
    <AdminDashboardThemeProvider>
      <AdminDashboardShell logoutAction={logoutAction} activeHref="/admin/monitoring/behavior">
        <BehaviorPage view={view} />
      </AdminDashboardShell>
    </AdminDashboardThemeProvider>
  );
}
