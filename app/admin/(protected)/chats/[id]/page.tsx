import { notFound } from "next/navigation";
import { logoutAction } from "@/app/admin/login/actions";
import { AdminDashboardShell } from "../../components/AdminDashboardShell";
import { AdminDashboardThemeProvider } from "../../components/shared/AdminDashboardThemeProvider";
import { ChatDetailPage } from "../components/ChatDetailPage";
import { mapChatDetail } from "../mappers/chatsMapper";
import { fetchAdminChat } from "../services/chatsService";

export const dynamic = "force-dynamic";

interface AdminChatDetailRouteProps {
  params: Promise<{ id: string }>;
}

export default async function AdminChatDetailRoute({ params }: AdminChatDetailRouteProps) {
  const { id } = await params;
  const chat = await fetchAdminChat(id).catch(() => null);

  if (!chat) {
    notFound();
  }

  return (
    <AdminDashboardThemeProvider>
      <AdminDashboardShell logoutAction={logoutAction} activeHref="/admin/chats">
        <ChatDetailPage initialChat={mapChatDetail(chat)} />
      </AdminDashboardShell>
    </AdminDashboardThemeProvider>
  );
}
