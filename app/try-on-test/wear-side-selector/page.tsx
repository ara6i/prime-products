import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { TabNav } from "../components/TabNav";
import { isTestLabAvailableForHost } from "../lib/access";
import { SideMeshSelectorLab } from "./SideMeshSelectorLab";

export const metadata = { title: "WEAR Side Mesh Picker — PrimeStyleAI" };

export default async function Page() {
  const headerStore = await headers();
  if (!isTestLabAvailableForHost(headerStore.get("host"))) notFound();
  return (
    <div className="min-h-screen bg-slate-950">
      <TabNav />
      <SideMeshSelectorLab />
    </div>
  );
}
