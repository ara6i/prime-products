import type { Metadata } from "next";
import { Manrope, Oswald } from "next/font/google";
import { SupplierLandingExperience } from "../partner-landing/supplier/components/SupplierLandingExperience";

const supplierDisplay = Oswald({
  variable: "--font-supplier-display",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});

const supplierBody = Manrope({
  variable: "--font-supplier-body",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "PrimeStyleAI | Grow Through One Connected Shopping Network",
  description:
    "PrimeStyleAI connects fashion suppliers with merchants, influencers, and customers through one global shopping network and supplier dashboard.",
};

export default function SupplierLandingPage() {
  return (
    <div className={`${supplierDisplay.variable} ${supplierBody.variable}`}>
      <SupplierLandingExperience />
    </div>
  );
}
