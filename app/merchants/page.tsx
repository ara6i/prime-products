import type { Metadata } from "next";
import { MerchantLandingExperience } from "../partner-landing/merchant/components/MerchantLandingExperience";

export const metadata: Metadata = {
  title: "PrimeStyleAI | Fashion Commerce Network for Merchants",
  description:
    "Connect your catalog to creators, PDP Studio, AI sizing, virtual try-on, outfit building, and measurable fashion commerce through PrimeStyleAI.",
};

export default function MerchantLandingPage() {
  return <MerchantLandingExperience />;
}
