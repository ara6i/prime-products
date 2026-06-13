import { logoutAction } from "@/app/admin/login/actions";
import { adminFetch } from "@/app/admin/shared/services/adminFetch";
import { AdminDashboardShell } from "../../components/AdminDashboardShell";
import { AdminDashboardThemeProvider } from "../../components/shared/AdminDashboardThemeProvider";
import { IpLimitsPage, type IpLimitsResponse } from "./IpLimitsPage";

export const dynamic = "force-dynamic";

export default async function AdminIpLimitsRoute() {
  const initialData = await adminFetch<IpLimitsResponse>("/api/admin/ip-limits?limit=150");

  return (
    <AdminDashboardThemeProvider>
      <AdminDashboardShell logoutAction={logoutAction} activeHref="/admin/monitoring/ip-limits">
        <IpLimitsPage initialData={initialData} />
      </AdminDashboardShell>
    </AdminDashboardThemeProvider>
  );
}
