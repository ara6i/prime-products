import type { Metadata } from "next";
import { InfluencerProfileExperience } from "../../partner-landing/influencer-profile/components/InfluencerProfileExperience";

export const metadata: Metadata = {
  title: "Maya Laurent · Shoppable Fashion Stories | PrimeStyleAI",
  description:
    "Watch Maya Laurent's latest fashion stories and shop the garments featured in her PrimeStyleAI lookbook.",
};

export default function MayaLaurentProfilePage() {
  return <InfluencerProfileExperience />;
}
