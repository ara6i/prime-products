import { logoutAction } from "@/app/admin/login/actions";
import { AdminDashboardShell } from "../components/AdminDashboardShell";
import { AdminDashboardThemeProvider } from "../components/shared/AdminDashboardThemeProvider";
import { ChatsPage } from "./components/ChatsPage";
import { mapChatsPage } from "./mappers/chatsMapper";
import { fetchAdminChats } from "./services/chatsService";

export const dynamic = "force-dynamic";

export default async function AdminChatsPage() {
  const response = await fetchAdminChats({
    page: 1,
    limit: 25,
    status: "open",
    query: "",
  });
  const view = mapChatsPage(response);

  return (
    <AdminDashboardThemeProvider>
      <AdminDashboardShell logoutAction={logoutAction} activeHref="/admin/chats">
        <ChatsPage initialView={view} />
      </AdminDashboardShell>
    </AdminDashboardThemeProvider>
  );
}
