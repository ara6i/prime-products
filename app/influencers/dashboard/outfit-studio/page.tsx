import type { Metadata } from "next";
import { OutfitStudioExperience } from "../../../partner-landing/influencer-dashboard/components/OutfitStudioExperience";

export const metadata: Metadata = {
  title: "Outfit Studio | PrimeStyleAI Creator Workspace",
  description: "Create campaign-ready outfit images and videos from approved products and creator references.",
};

export default function OutfitStudioPage() {
  return <OutfitStudioExperience />;
}
