import type { Metadata } from "next";
import { Bodoni_Moda } from "next/font/google";
import { SupplierLandingExperience } from "../partner-landing/supplier/components/SupplierLandingExperience";

const supplierSerif = Bodoni_Moda({
  variable: "--font-supplier-serif",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "PrimeStyleAI | Connect Your Collection With Merchants",
  description:
    "PrimeStyleAI connects fashion suppliers and manufacturers with retailers, boutiques, ecommerce merchants, dropship sellers, and optional creator demand.",
};

export default function SupplierLandingPage() {
  return (
    <div className={supplierSerif.variable}>
      <SupplierLandingExperience />
    </div>
  );
}
