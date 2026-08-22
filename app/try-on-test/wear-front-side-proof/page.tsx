import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { TabNav } from "../components/TabNav";
import { isTestLabAvailableForHost } from "../lib/access";
import { FrontSideProofLab } from "./FrontSideProofLab";

export const metadata = { title: "Front + Side WEAR Proof — PrimeStyleAI" };

export default async function Page() {
  const headerStore = await headers();
  if (!isTestLabAvailableForHost(headerStore.get("host"))) notFound();
  return (
    <div className="min-h-screen bg-slate-950">
      <TabNav />
      <FrontSideProofLab />
    </div>
  );
}
