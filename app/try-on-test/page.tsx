import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { Toaster } from "sonner";
import { TryOnTestPage } from "./TryOnTestPage";
import { TabNav } from "./components/TabNav";
import { isTestLabAvailableForHost } from "./lib/access";

export const metadata = {
  title: "Try-On Test Lab — PrimeStyleAI",
};

export default async function Page() {
  const headerStore = await headers();
  if (!isTestLabAvailableForHost(headerStore.get("host"))) notFound();

  return (
    <div className="min-h-screen bg-gray-50">
      <TabNav />
      <TryOnTestPage />
      <Toaster richColors position="top-right" />
    </div>
  );
}
