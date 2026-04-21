import type { ReactNode } from "react";
import { AdminSidebar } from "./desktop/AdminSidebar";
import { AdminHeader } from "./desktop/AdminHeader";
import { AdminMobileHeader } from "./mobile/AdminMobileHeader";
import { getAdminMe } from "../services/adminAuthService";

interface Props {
  title: string;
  subtitle?: string;
  headerRight?: ReactNode;
  children: ReactNode;
}

export async function AdminShell({ title, subtitle, headerRight, children }: Props) {
  const me = await getAdminMe();

  return (
    <div className="min-h-screen bg-admin-surface-page">
      <AdminSidebar adminName={me?.username} />
      <AdminMobileHeader title={title} subtitle={subtitle} />
      <div className="lg:pl-[var(--spacing-admin-sidebar)]">
        <AdminHeader title={title} subtitle={subtitle} right={headerRight} />
        <main className="px-[var(--spacing-admin-content-x)] py-[var(--spacing-admin-content-y)] max-lg:px-4 max-lg:pb-8">
          {children}
        </main>
      </div>
    </div>
  );
}
