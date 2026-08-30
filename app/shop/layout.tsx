import type { ReactNode } from "react";
import { ShopReceiptSidebar } from "./components/ShopReceiptSidebar";

export default function ShopLayout({ children }: { children: ReactNode }) {
  return <>{children}<ShopReceiptSidebar /></>;
}
