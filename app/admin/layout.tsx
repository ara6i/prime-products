import type { ReactNode } from "react";
import { Toaster } from "sonner";

export const metadata = {
  title: "Prime Admin",
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <Toaster position="top-right" richColors closeButton />
    </>
  );
}
