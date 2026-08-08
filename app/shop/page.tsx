import type { Metadata } from "next";
import { GlobalShopExperience } from "./components/GlobalShopExperience";

export const metadata: Metadata = {
  title: "PrimeStyleAI Shop · Fashion, styled and fitted for you",
  description:
    "Discover fashion from connected brands, build complete outfits with an AI stylist, virtually try them on, and shop your best size in the PrimeStyleAI global marketplace.",
};

export default function GlobalShopPage() {
  return <GlobalShopExperience />;
}
