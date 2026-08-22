import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { TabNav } from "../components/TabNav";
import { isTestLabAvailableForHost } from "../lib/access";
import { SdkWearMeshPanel } from "../sizing-lab/SdkWearMeshPanel";

export const metadata = {
  title: "SDK · WEAR Mesh — PrimeStyleAI",
};

export default async function Page() {
  const headerStore = await headers();
  if (!isTestLabAvailableForHost(headerStore.get("host"))) notFound();

  return (
    <div className="min-h-screen bg-slate-950">
      <TabNav />
      <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6">
        <SdkWearMeshPanel imageUrl={null} query={null} results={null} heldoutOnly />
      </main>
    </div>
  );
}
