import { notFound } from "next/navigation";
import { logoutAction } from "@/app/admin/login/actions";
import { AdminDashboardShell } from "../../components/AdminDashboardShell";
import { AdminDashboardThemeProvider } from "../../components/shared/AdminDashboardThemeProvider";
import { UserProfileDetailPage } from "../components/UserProfileDetailPage";
import { mapProfileUsersPage } from "../mappers/usersMapper";
import { fetchAdminProfileUsers } from "../services/usersService";
import type { ProfileUserGroupItem } from "../types";

export const dynamic = "force-dynamic";

interface AdminUserProfileRouteProps {
  params: Promise<{ id: string }>;
}

function findByRouteId(items: ProfileUserGroupItem[], routeId: string): ProfileUserGroupItem | undefined {
  const decodedId = decodeURIComponent(routeId);
  return items.find((user) => user.id === decodedId || encodeURIComponent(user.id) === routeId);
}

function searchTermsFromRouteId(routeId: string): string[] {
  const decodedId = decodeURIComponent(routeId);
  return Array.from(
    new Set(
      decodedId
        .split(":")
        .map((part) => part.trim())
        .filter((part) => part.length >= 6),
    ),
  );
}

async function loadUserProfile(routeId: string): Promise<ProfileUserGroupItem | null> {
  const initial = mapProfileUsersPage(await fetchAdminProfileUsers(300));
  const directMatch = findByRouteId(initial.items, routeId);
  if (directMatch) return directMatch;

  for (const term of searchTermsFromRouteId(routeId)) {
    const searched = mapProfileUsersPage(await fetchAdminProfileUsers(50, term));
    const match = findByRouteId(searched.items, routeId);
    if (match) return match;
  }

  return null;
}

export default async function AdminUserProfileRoute({ params }: AdminUserProfileRouteProps) {
  const { id } = await params;
  const item = await loadUserProfile(id);

  if (!item) {
    notFound();
  }

  return (
    <AdminDashboardThemeProvider>
      <AdminDashboardShell logoutAction={logoutAction} activeHref="/admin/users">
        <UserProfileDetailPage user={item} />
      </AdminDashboardShell>
    </AdminDashboardThemeProvider>
  );
}
