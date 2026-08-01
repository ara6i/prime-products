import type { Metadata } from "next";
import { MerchantLandingExperience } from "../partner-landing/merchant/components/MerchantLandingExperience";

export const metadata: Metadata = {
  title: "For Merchants · From Catalog to Confident Cart | PrimeStyleAI",
  description:
    "Connect catalog data, fit and sizing, authorized AI shopping, exact-variant carts, and order reporting through the PrimeStyleAI Connected Merchant Program.",
};

export default function MerchantLandingPage() {
  return <MerchantLandingExperience />;
}
