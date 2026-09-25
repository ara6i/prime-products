import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { TabNav } from "../components/TabNav";
import { isTestLabAvailableForHost } from "../lib/access";
import { WearV6PhotoLab } from "./WearV6PhotoLab";

export const metadata = {
  title: "WEAR 3D Sizing Lab — PrimeStyleAI",
};

export default async function Page({ searchParams }: { searchParams: Promise<{ cohort?: string; view?: string }> }) {
  const headerStore = await headers();
  if (!isTestLabAvailableForHost(headerStore.get("host"))) notFound();
  const params = await searchParams;

  return (
    <div className="min-h-screen bg-gray-50">
      <TabNav />
      <WearV6PhotoLab initialTab={params.view === "commercial-100" ? "commercial-100" : params.cohort === "448" ? "aiad-448" : "v8-photo"} initialView={params.view === "product-sizes" ? "product-sizes" : "measurements"} />
    </div>
  );
}
