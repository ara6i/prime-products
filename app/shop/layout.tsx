import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ShopReceiptSidebar } from "./components/ShopReceiptSidebar";

const SHOP_BRAND_ICON = "/merchants/icon.png";

export const metadata: Metadata = {
  icons: {
    icon: [
      {
        url: SHOP_BRAND_ICON,
        type: "image/png",
        sizes: "600x600",
      },
    ],
    shortcut: SHOP_BRAND_ICON,
    apple: [
      {
        url: SHOP_BRAND_ICON,
        type: "image/png",
        sizes: "600x600",
      },
    ],
  },
};

export default function ShopLayout({ children }: { children: ReactNode }) {
  return <>{children}<ShopReceiptSidebar /></>;
}
