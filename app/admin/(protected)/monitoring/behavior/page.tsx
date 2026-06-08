import { logoutAction } from "@/app/admin/login/actions";
import { AdminDashboardShell } from "../../components/AdminDashboardShell";
import { AdminDashboardThemeProvider } from "../../components/shared/AdminDashboardThemeProvider";
import { BehaviorPage } from "./components/BehaviorPage";
import { mapBehaviorPage } from "./mappers/behaviorMapper";
import { fetchAdminBehavior } from "./services/behaviorService";

export const dynamic = "force-dynamic";

export default async function AdminBehaviorRoute() {
  const response = await fetchAdminBehavior();
  const view = mapBehaviorPage(response);

  return (
    <AdminDashboardThemeProvider>
      <AdminDashboardShell logoutAction={logoutAction} activeHref="/admin/monitoring/behavior">
        <BehaviorPage view={view} clarityProjectId={process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID ?? null} />
      </AdminDashboardShell>
    </AdminDashboardThemeProvider>
  );
}
