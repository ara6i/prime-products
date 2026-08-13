import type { Metadata } from "next";
import { headers } from "next/headers";
import { ShopAIStylistClient } from "./ShopAIStylistClient";

const MOBILE_USER_AGENT =
  /Mobile|Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i;

export const metadata: Metadata = {
  title: "AI Stylist | PrimeStyleAI Shop",
  description:
    "Build five personalized outfits from real PrimeStyleAI catalog products.",
};

export default async function ShopAIStylistPage() {
  const requestHeaders = await headers();
  const initialIsMobile = MOBILE_USER_AGENT.test(
    requestHeaders.get("user-agent") ?? "",
  );

  return <ShopAIStylistClient initialIsMobile={initialIsMobile} />;
}
