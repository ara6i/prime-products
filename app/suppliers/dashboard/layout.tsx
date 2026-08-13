import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: {
    default: "Supplier Dashboard | PrimeStyleAI",
    template: "%s | PrimeStyleAI Supplier",
  },
  description:
    "Match with merchants and influencers, manage selling channels, fulfill orders, and reconcile supplier payouts in one PrimeStyleAI workspace.",
};

export default function SupplierDashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  return children;
}
