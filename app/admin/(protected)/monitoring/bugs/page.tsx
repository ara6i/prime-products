import { logoutAction } from "@/app/admin/login/actions";
import { AdminDashboardShell } from "../../components/AdminDashboardShell";
import { AdminDashboardThemeProvider } from "../../components/shared/AdminDashboardThemeProvider";
import { BugReportsPage } from "./components/BugReportsPage";
import { mapBugReportsPage } from "./mappers/bugReportsMapper";
import { fetchAdminBugReports } from "./services/bugReportsService";

export const dynamic = "force-dynamic";

export default async function AdminBugReportsRoute() {
  const response = await fetchAdminBugReports();
  const view = mapBugReportsPage(response);
  const sentryProjectUrl = process.env.SENTRY_PROJECT_URL || process.env.NEXT_PUBLIC_SENTRY_PROJECT_URL || null;

  return (
    <AdminDashboardThemeProvider>
      <AdminDashboardShell logoutAction={logoutAction} activeHref="/admin/monitoring/bugs">
        <BugReportsPage view={view} sentryProjectUrl={sentryProjectUrl} />
      </AdminDashboardShell>
    </AdminDashboardThemeProvider>
  );
}
