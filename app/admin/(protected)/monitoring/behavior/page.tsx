import { logoutAction } from "@/app/admin/login/actions";
import { AdminDashboardShell } from "../../components/AdminDashboardShell";
import { AdminDashboardThemeProvider } from "../../components/shared/AdminDashboardThemeProvider";
import { BehaviorPage } from "./components/BehaviorPage";
import { mapBehaviorPage } from "./mappers/behaviorMapper";
import { fetchClaritySessions } from "./services/behaviorService";

export const dynamic = "force-dynamic";

export default async function AdminBehaviorRoute() {
  const projectId =
    process.env.NEXT_PUBLIC_PRIMESTYLE_CLARITY_PROJECT_ID ||
    process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID ||
    "wwb75cfm2z";
  const sessions = await fetchClaritySessions();
  const view = mapBehaviorPage(sessions);

  return (
    <AdminDashboardThemeProvider>
      <AdminDashboardShell logoutAction={logoutAction} activeHref="/admin/monitoring/behavior">
        <BehaviorPage projectId={projectId} view={view} />
      </AdminDashboardShell>
    </AdminDashboardThemeProvider>
  );
}
