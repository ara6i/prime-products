import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { TabNav } from "../components/TabNav";
import { isTestLabAvailableForHost } from "../lib/access";
import { AiStylistLabPage } from "./AiStylistLabPage";
import { getAiStylistBatchProgress } from "./server/aiStylistLab.server";

export const metadata = {
  title: "AI Stylist Lab — PrimeStyleAI",
};

export default async function Page() {
  const headerStore = await headers();
  if (!isTestLabAvailableForHost(headerStore.get("host"))) notFound();

  const batchProgressResult = await getAiStylistBatchProgress()
    .then((data) => ({ data, error: null }))
    .catch(() => ({
      data: null,
      error: "Saved Batch progress could not be read.",
    }));

  return (
    <div className="min-h-screen bg-[#f5f6f8]">
      <TabNav />
      <AiStylistLabPage
        initialBatchProgress={batchProgressResult.data}
        initialBatchProgressError={batchProgressResult.error}
      />
    </div>
  );
}
