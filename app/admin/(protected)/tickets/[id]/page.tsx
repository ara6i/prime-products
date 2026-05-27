import { notFound } from "next/navigation";
import { logoutAction } from "@/app/admin/login/actions";
import { AdminDashboardShell } from "../../components/AdminDashboardShell";
import { AdminDashboardThemeProvider } from "../../components/shared/AdminDashboardThemeProvider";
import { TicketDetailPage } from "../components/TicketDetailPage";
import { mapTicket } from "../mappers/ticketsMapper";
import { fetchAdminTicket } from "../services/ticketsService";

export const dynamic = "force-dynamic";

interface AdminTicketDetailRouteProps {
  params: Promise<{ id: string }>;
}

export default async function AdminTicketDetailRoute({ params }: AdminTicketDetailRouteProps) {
  const { id } = await params;
  const ticket = await fetchAdminTicket(id).catch(() => null);

  if (!ticket) {
    notFound();
  }

  return (
    <AdminDashboardThemeProvider>
      <AdminDashboardShell logoutAction={logoutAction} activeHref="/admin/tickets">
        <TicketDetailPage initialTicket={mapTicket(ticket)} />
      </AdminDashboardShell>
    </AdminDashboardThemeProvider>
  );
}
