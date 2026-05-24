import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Toaster } from "sonner";
import { TabNav } from "../components/TabNav";
import { isTestLabAvailableForHost } from "../lib/access";
import { SizingLabPage } from "./SizingLabPage";

export const metadata = {
  title: "AI Sizing Lab — PrimeStyleAI",
};

export default async function Page() {
  const headerStore = await headers();
  if (!isTestLabAvailableForHost(headerStore.get("host"))) notFound();

  return (
    <div className="min-h-screen bg-gray-50">
      <TabNav />
      <SizingLabPage />
      <Toaster richColors position="top-right" />
    </div>
  );
}
