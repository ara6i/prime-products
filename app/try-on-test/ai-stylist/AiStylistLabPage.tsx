"use client";

import { AiStylistBatchProgressPanel } from "./components/AiStylistBatchProgressPanel";
import { useAiStylistBatchProgress } from "./hooks/useAiStylistBatchProgress";
import type { AiStylistBatchProgress } from "./types";

export function AiStylistLabPage({
  initialBatchProgress,
  initialBatchProgressError,
}: {
  initialBatchProgress: AiStylistBatchProgress | null;
  initialBatchProgressError: string | null;
}) {
  const { progress, error, loading, refresh } = useAiStylistBatchProgress(
    initialBatchProgress,
    initialBatchProgressError,
  );

  return (
    <main className="mx-auto w-full max-w-[1480px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <header className="mb-6 rounded-[28px] border border-slate-200 bg-white px-6 py-6 shadow-sm sm:px-8">
        <p className="text-sm font-bold uppercase tracking-[0.18em] text-violet-600">
          AI Stylist Test Lab
        </p>
        <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
          10-outfit progress
        </h1>
        <p className="mt-3 max-w-3xl text-base leading-7 text-slate-600">
          Only the current 10-outfit scenario work is shown here. Supplier intake,
          CJ imports, old 20-outfit statistics, and full catalog audits are hidden.
        </p>
      </header>

      <AiStylistBatchProgressPanel
        progress={progress}
        error={error}
        loading={loading}
        onRefresh={() => void refresh()}
      />
    </main>
  );
}
