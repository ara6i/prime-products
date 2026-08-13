import type { Metadata } from "next";
import { MerchantLandingExperience } from "../partner-landing/merchant/components/MerchantLandingExperience";

export const metadata: Metadata = {
  title: "PrimeStyleAI | Fashion Commerce Network for Merchants",
  description:
    "Connect products and creators through campaign discovery, merchant analytics, and PDP Studio.",
};

export default function MerchantLandingPage() {
  return <MerchantLandingExperience />;
}
