import { logoutAction } from "@/app/admin/login/actions";
import { adminFetch } from "@/app/admin/shared/services/adminFetch";
import { AdminDashboardShell } from "../components/AdminDashboardShell";
import { AdminDashboardThemeProvider } from "../components/shared/AdminDashboardThemeProvider";
import type { IpLimitsResponse } from "../monitoring/ip-limits/IpLimitsPage";
import { SettingsPage } from "./SettingsPage";

export const dynamic = "force-dynamic";

export interface StyleMatchSettingsResponse {
  settings: {
    enabled: boolean;
    updatedAt: string | null;
    updatedBy: string | null;
  };
  loadError?: string | null;
}

function fallbackStyleMatchSettings(message: string): StyleMatchSettingsResponse {
  return {
    settings: {
      enabled: false,
      updatedAt: null,
      updatedBy: null,
    },
    loadError: message,
  };
}

export default async function AdminSettingsRoute() {
  const [ipLimits, styleMatchResult] = await Promise.all([
    adminFetch<IpLimitsResponse>("/api/admin/ip-limits?limit=150"),
    adminFetch<StyleMatchSettingsResponse>("/api/admin/style-match/settings")
      .then((data) => ({ ok: true as const, data }))
      .catch((error: unknown) => ({
        ok: false as const,
        message:
          error && typeof error === "object" && "message" in error
            ? String((error as { message?: unknown }).message)
            : "Could not load Style RAG settings",
      })),
  ]);
  const styleMatch = styleMatchResult.ok
    ? styleMatchResult.data
    : fallbackStyleMatchSettings(styleMatchResult.message);

  return (
    <AdminDashboardThemeProvider>
      <AdminDashboardShell logoutAction={logoutAction} activeHref="/admin/settings">
        <SettingsPage ipLimits={ipLimits} styleMatch={styleMatch} />
      </AdminDashboardShell>
    </AdminDashboardThemeProvider>
  );
}
