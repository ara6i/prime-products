import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { getAdminMe } from "@/app/admin/shared/services/adminAuthService";

export default async function ProtectedAdminLayout({ children }: { children: ReactNode }) {
  const me = await getAdminMe();
  if (!me) {
    redirect("/admin/login");
  }
  return <>{children}</>;
}
