import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { TabNav } from "../components/TabNav";
import { isTestLabAvailableForHost } from "../lib/access";
import { WearEverythingLab } from "./WearEverythingLab";
import { getWearEverythingModel } from "./wearEverything.server";

export const metadata = {
  title: "WEAR Everything — PrimeStyleAI Test Lab",
};

export default async function Page() {
  const headerStore = await headers();
  if (!isTestLabAvailableForHost(headerStore.get("host"))) notFound();
  const model = await getWearEverythingModel();
  return (
    <div className="min-h-screen bg-slate-100">
      <TabNav />
      <WearEverythingLab model={model} />
    </div>
  );
}
