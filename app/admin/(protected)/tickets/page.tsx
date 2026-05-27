import { logoutAction } from "@/app/admin/login/actions";
import { AdminDashboardShell } from "../components/AdminDashboardShell";
import { AdminDashboardThemeProvider } from "../components/shared/AdminDashboardThemeProvider";
import { TicketsPage } from "./components/TicketsPage";
import { mapTicketsPage } from "./mappers/ticketsMapper";
import { fetchAdminTickets } from "./services/ticketsService";

export const dynamic = "force-dynamic";

export default async function AdminTicketsPage() {
  const response = await fetchAdminTickets({
    page: 1,
    limit: 25,
    queue: "pending",
    query: "",
  });
  const view = mapTicketsPage(response);

  return (
    <AdminDashboardThemeProvider>
      <AdminDashboardShell logoutAction={logoutAction} activeHref="/admin/tickets">
        <TicketsPage initialView={view} />
      </AdminDashboardShell>
    </AdminDashboardThemeProvider>
  );
}
