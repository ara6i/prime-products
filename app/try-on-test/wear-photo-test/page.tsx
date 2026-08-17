import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { TabNav } from "../components/TabNav";
import { isTestLabAvailableForHost } from "../lib/access";
import { WearV6PhotoLab } from "./WearV6PhotoLab";

export const metadata = {
  title: "WEAR 3D Sizing Lab — PrimeStyleAI",
};

export default async function Page() {
  const headerStore = await headers();
  if (!isTestLabAvailableForHost(headerStore.get("host"))) notFound();

  return (
    <div className="min-h-screen bg-gray-50">
      <TabNav />
      <WearV6PhotoLab />
    </div>
  );
}
