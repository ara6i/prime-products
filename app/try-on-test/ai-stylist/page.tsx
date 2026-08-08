import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { TabNav } from "../components/TabNav";
import { isTestLabAvailableForHost } from "../lib/access";
import { AiStylistLabPage } from "./AiStylistLabPage";

export const metadata = {
  title: "AI Stylist Lab — PrimeStyleAI",
};

export default async function Page() {
  const headerStore = await headers();
  if (!isTestLabAvailableForHost(headerStore.get("host"))) notFound();

  return (
    <div className="min-h-screen bg-[#f5f6f8]">
      <TabNav />
      <AiStylistLabPage />
    </div>
  );
}
