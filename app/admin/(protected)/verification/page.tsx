import { logoutAction } from "@/app/admin/login/actions";
import { AdminDashboardShell } from "../components/AdminDashboardShell";
import { AdminDashboardThemeProvider } from "../components/shared/AdminDashboardThemeProvider";
import { VerificationCenterPage } from "./components/VerificationCenterPage";
import { mapVerificationCenter } from "./mappers/verificationCenterMapper";
import { fetchCustomerVerifications } from "./services/verificationService";

export const dynamic = "force-dynamic";

export default async function AdminVerificationCenterRoute() {
  const response = await fetchCustomerVerifications();
  const view = mapVerificationCenter(response.items);

  return (
      <AdminDashboardThemeProvider>
        <AdminDashboardShell logoutAction={logoutAction} activeHref="/admin/verification">
        <VerificationCenterPage
          view={view}
        />
      </AdminDashboardShell>
    </AdminDashboardThemeProvider>
  );
}
