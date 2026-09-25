import type { Metadata } from "next";
import { Bodoni_Moda } from "next/font/google";
import { GlobalShopExperience } from "./components/GlobalShopExperience";

const supplierSerif = Bodoni_Moda({
  variable: "--font-supplier-serif",
  subsets: ["latin"],
  style: ["normal", "italic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "PrimeStyleAI Shop · Fashion, styled and fitted for you",
  description:
    "Discover fashion from connected brands, build complete outfits with an AI stylist, virtually try them on, and shop your best size in the PrimeStyleAI global marketplace.",
};

export default function GlobalShopPage() {
  return (
    <div className={supplierSerif.variable}>
      <GlobalShopExperience />
    </div>
  );
}
