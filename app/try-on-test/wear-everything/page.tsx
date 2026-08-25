import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { TabNav } from "../components/TabNav";
import { isTestLabAvailableForHost } from "../lib/access";
import { WearEverythingLab } from "./WearEverythingLab";
import { getWearEverythingCanaryIds, getWearEverythingModel } from "./wearEverything.server";

export const metadata = {
  title: "WEAR Everything — PrimeStyleAI Test Lab",
};

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ scan?: string | string[] }>;
}) {
  const headerStore = await headers();
  if (!isTestLabAvailableForHost(headerStore.get("host"))) notFound();
  const canaryIds = await getWearEverythingCanaryIds();
  const requested = (await searchParams).scan;
  const scanId = typeof requested === "string" && canaryIds.includes(requested)
    ? requested
    : canaryIds[0] ?? "IT-4028-A";
  const model = await getWearEverythingModel(scanId);
  return (
    <div className="min-h-screen bg-slate-100">
      <TabNav />
      <WearEverythingLab model={model} canaryIds={canaryIds} />
    </div>
  );
}
