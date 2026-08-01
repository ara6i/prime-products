import type { Metadata } from "next";
import { InfluencerLandingExperience } from "../partner-landing/influencer/components/InfluencerLandingExperience";

export const metadata: Metadata = {
  title: "For Influencers · Make Every Look Shoppable | PrimeStyleAI",
  description:
    "Choose approved fashion products, create tracked shoppable looks, and earn validated commission through the PrimeStyleAI creator program.",
};

export default function InfluencerLandingPage() {
  return <InfluencerLandingExperience />;
}
