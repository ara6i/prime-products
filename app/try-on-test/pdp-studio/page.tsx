import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getPdpStudioMe } from "@/app/pdp-studio/shared/pdpStudioAuthService";
import { TabNav } from "../components/TabNav";
import { isTestLabAvailableForHost } from "../lib/access";
import { PdpStudioClient } from "./PdpStudioClient";

export const metadata = {
  title: "PDP Studio - PrimeStyleAI",
};

export default async function PdpStudioPage() {
  const headerStore = await headers();
  if (!isTestLabAvailableForHost(headerStore.get("host"))) notFound();
  const me = await getPdpStudioMe();
  if (!me) redirect("/pdp-studio");

  return (
    <main className="min-h-screen bg-gray-50">
      <TabNav />
      <section className="mx-auto w-full max-w-6xl px-6 py-8">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-blue">PDP Studio</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-[-0.035em] text-slate-950">PDP Studio</h1>
          </div>

          <PdpStudioClient />
        </div>
      </section>
    </main>
  );
}
