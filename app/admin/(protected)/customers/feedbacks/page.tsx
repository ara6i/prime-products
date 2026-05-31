import { logoutAction } from "@/app/admin/login/actions";
import { AdminDashboardThemeProvider } from "../../components/shared/AdminDashboardThemeProvider";
import { AdminDashboardShell } from "../../components/AdminDashboardShell";
import { FeedbacksPage } from "../../reports/feedbacks/components/FeedbacksPage";
import { mapFeedbacksPage } from "../../reports/feedbacks/mappers/feedbacksMapper";
import { fetchAdminFeedbacks } from "../../reports/feedbacks/services/feedbacksService";

export const dynamic = "force-dynamic";

export default async function AdminCustomerFeedbacksPage() {
  const response = await fetchAdminFeedbacks();
  const view = mapFeedbacksPage(response);

  return (
    <AdminDashboardThemeProvider>
      <AdminDashboardShell logoutAction={logoutAction} activeHref="/admin/customers/feedbacks">
        <FeedbacksPage view={view} />
      </AdminDashboardShell>
    </AdminDashboardThemeProvider>
  );
}
