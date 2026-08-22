import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { TabNav } from "../components/TabNav";
import { isTestLabAvailableForHost } from "../lib/access";
import { WearCpuProgressLab } from "./WearCpuProgressLab";

export const metadata = {
  title: "WEAR CPU Progress — PrimeStyleAI Test Lab",
};

export default async function Page() {
  const headerStore = await headers();
  if (!isTestLabAvailableForHost(headerStore.get("host"))) notFound();
  return (
    <div className="min-h-screen bg-slate-100">
      <TabNav />
      <WearCpuProgressLab />
    </div>
  );
}
