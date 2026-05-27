import { logoutAction } from "@/app/admin/login/actions";
import { AdminDashboardThemeProvider } from "../../components/shared/AdminDashboardThemeProvider";
import { AdminDashboardShell } from "../../components/AdminDashboardShell";
import { FeedbacksPage } from "./components/FeedbacksPage";
import { mapFeedbacksPage } from "./mappers/feedbacksMapper";
import { fetchAdminFeedbacks } from "./services/feedbacksService";

export const dynamic = "force-dynamic";

export default async function AdminFeedbacksPage() {
  const response = await fetchAdminFeedbacks();
  const view = mapFeedbacksPage(response);

  return (
    <AdminDashboardThemeProvider>
      <AdminDashboardShell logoutAction={logoutAction} activeHref="/admin/reports/feedbacks">
        <FeedbacksPage view={view} />
      </AdminDashboardShell>
    </AdminDashboardThemeProvider>
  );
}
