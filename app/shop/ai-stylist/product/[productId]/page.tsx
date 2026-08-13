import type { Metadata } from "next";
import { StylistProductDetailClient } from "./StylistProductDetailClient";

interface StylistProductPageProps {
  params: Promise<{ productId: string }>;
}

export const metadata: Metadata = {
  title: "AI Stylist Product · PrimeStyleAI",
  description: "Product images, details, sizes, and AI fit information from the PrimeStyleAI catalog.",
};

export default async function StylistProductPage({ params }: StylistProductPageProps) {
  const { productId } = await params;
  return <StylistProductDetailClient key={productId} productId={productId} />;
}
