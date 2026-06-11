import type { ReactNode } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Toaster } from "sonner";
import { isAdminAvailableForHost } from "./lib/access";

export const metadata = {
  title: "Prime Admin",
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const headerStore = await headers();
  if (!isAdminAvailableForHost(headerStore.get("host"))) {
    redirect("/");
  }

  return (
    <>
      {children}
      <Toaster position="top-right" richColors closeButton />
    </>
  );
}
