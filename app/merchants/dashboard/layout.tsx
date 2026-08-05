import type { Metadata } from "next";
import type { ReactNode } from "react";
import { MerchantDashboardShell } from "../../partner-landing/merchant-dashboard/components/MerchantDashboardExperience";

export const metadata: Metadata = {
  title: "Merchant Dashboard | PrimeStyleAI",
  description:
    "PrimeStyleAI Direct Connected merchant workspace for products, shopper behavior, commerce, campaigns, billing, and governance.",
};

export default function MerchantDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <MerchantDashboardShell>{children}</MerchantDashboardShell>;
}
