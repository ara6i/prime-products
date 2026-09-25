import { logoutAction } from "@/app/admin/login/actions";
import { AdminDashboardShell } from "../components/AdminDashboardShell";
import { AdminDashboardThemeProvider } from "../components/shared/AdminDashboardThemeProvider";
import { InfluencersPage } from "./components/InfluencersPage";
import { mapCreatorWaitlist } from "./mappers/influencersMapper";
import { fetchAdminCreatorWaitlist } from "./services/influencersService";

export const dynamic = "force-dynamic";

export default async function AdminInfluencersPage() {
  const response = await fetchAdminCreatorWaitlist();
  const view = mapCreatorWaitlist(response);

  return (
    <AdminDashboardThemeProvider>
      <AdminDashboardShell logoutAction={logoutAction} activeHref="/admin/influencers">
        <InfluencersPage view={view} />
      </AdminDashboardShell>
    </AdminDashboardThemeProvider>
  );
}
