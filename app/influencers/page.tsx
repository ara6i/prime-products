import type { Metadata } from "next";
import { InfluencerLandingExperience } from "../partner-landing/influencer/components/InfluencerLandingExperience";

export const metadata: Metadata = {
  metadataBase: new URL("https://creators.primestyleai.com"),
  title: "For Influencers · Make Every Look Shoppable | PrimeStyleAI",
  description:
    "Connect with fashion merchants, create a public shoppable profile, and earn validated commission through the PrimeStyleAI creator program.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    url: "/",
    type: "website",
    title: "For Influencers · Make Every Look Shoppable | PrimeStyleAI",
    description:
      "Connect with fashion merchants, create a public shoppable profile, and earn validated commission through the PrimeStyleAI creator program.",
  },
};

export default function InfluencerLandingPage() {
  return <InfluencerLandingExperience />;
}
