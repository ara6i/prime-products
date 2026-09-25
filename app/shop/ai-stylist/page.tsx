import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "AI Stylist | PrimeStyleAI Shop",
  description:
    "Build five personalized outfits from real PrimeStyleAI catalog products.",
};

export default function ShopAIStylistPage() {
  notFound();
}
