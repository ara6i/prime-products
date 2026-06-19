import { logoutAction } from "@/app/admin/login/actions";
import { adminFetch } from "@/app/admin/shared/services/adminFetch";
import { AdminDashboardShell } from "../components/AdminDashboardShell";
import { AdminDashboardThemeProvider } from "../components/shared/AdminDashboardThemeProvider";
import type { IpLimitsResponse } from "../monitoring/ip-limits/IpLimitsPage";
import { SettingsPage } from "./SettingsPage";

export const dynamic = "force-dynamic";

export default async function AdminSettingsRoute() {
  const ipLimits = await adminFetch<IpLimitsResponse>("/api/admin/ip-limits?limit=150");

  return (
    <AdminDashboardThemeProvider>
      <AdminDashboardShell logoutAction={logoutAction} activeHref="/admin/settings">
        <SettingsPage ipLimits={ipLimits} />
      </AdminDashboardShell>
    </AdminDashboardThemeProvider>
  );
}
