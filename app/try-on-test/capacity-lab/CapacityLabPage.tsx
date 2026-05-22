"use client";

import { CapacityControls } from "./components/CapacityControls";
import { HostMetricsPanel } from "./components/HostMetricsPanel";
import { RunSummary } from "./components/RunSummary";
import { RunTimeline } from "./components/RunTimeline";
import { useCapacityLab } from "./hooks/useCapacityLab";

export function CapacityLabPage() {
  const lab = useCapacityLab();

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-6 py-8">
      <CapacityControls
        config={lab.config}
        targets={lab.targets}
        scenarios={lab.scenarios}
        isStarting={lab.isStarting}
        isRunning={lab.isRunning}
        onConfigChange={lab.updateConfig}
        onStart={lab.startRun}
      />

      {lab.error && (
        <p className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {lab.error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.05fr_0.95fr]">
        <RunSummary
          snapshot={lab.snapshot}
          isRunning={lab.isRunning}
          isCancelling={lab.isCancelling}
          onCancel={lab.cancelRun}
        />
        <HostMetricsPanel metrics={lab.metrics} isLoading={lab.isLoadingMetrics} onRefresh={lab.refreshMetrics} />
      </div>

      <RunTimeline points={lab.snapshot?.timeline ?? []} />
    </main>
  );
}
