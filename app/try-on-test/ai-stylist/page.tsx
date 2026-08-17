import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { TabNav } from "../components/TabNav";
import { isTestLabAvailableForHost } from "../lib/access";
import { AiStylistLabPage } from "./AiStylistLabPage";
import {
  getAiStylistBatchProgress,
  getAiStylistLabStatusForSsr,
  getAiStylistScenarioCoverageForSsr,
} from "./server/aiStylistLab.server";

export const metadata = {
  title: "AI Stylist Lab — PrimeStyleAI",
};

export default async function Page() {
  const headerStore = await headers();
  if (!isTestLabAvailableForHost(headerStore.get("host"))) notFound();

  const [statusResult, scenarioResult, batchProgressResult] = await Promise.allSettled([
    getAiStylistLabStatusForSsr(),
    getAiStylistScenarioCoverageForSsr(),
    getAiStylistBatchProgress(),
  ]);

  const status = statusResult.status === "fulfilled"
    ? statusResult.value
    : { data: null, error: "Pipeline status request failed." };
  const scenario = scenarioResult.status === "fulfilled"
    ? scenarioResult.value
    : { data: null, error: "Scenario status request failed." };
  const batchProgress = batchProgressResult.status === "fulfilled"
    ? batchProgressResult.value
    : null;

  return (
    <div className="min-h-screen bg-[#f5f6f8]">
      <TabNav />
      <AiStylistLabPage
        initialStatus={status.data}
        initialStatusError={status.error}
        initialScenarioCoverage={scenario.data}
        initialScenarioError={scenario.error}
        initialBatchProgress={batchProgress}
        initialBatchProgressError={
          batchProgressResult.status === "rejected"
            ? "Saved Batch progress could not be read."
            : null
        }
      />
    </div>
  );
}
