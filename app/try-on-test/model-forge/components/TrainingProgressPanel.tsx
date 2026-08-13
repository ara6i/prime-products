"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, CircleDashed, Cloud, LoaderCircle, TriangleAlert } from "lucide-react";
import { cn } from "@/app/shared/lib/utils";
import type {
  ModelForgeTrainingStageState,
  ModelForgeTrainingStatus,
} from "../lib/modelForgeProgress";

const STAGE_TONE: Record<ModelForgeTrainingStageState, string> = {
  complete: "border-emerald-200 bg-emerald-50 text-emerald-700",
  running: "border-blue-200 bg-blue-50 text-blue-700",
  queued: "border-gray-200 bg-white text-gray-500",
  failed: "border-red-200 bg-red-50 text-red-700",
  blocked: "border-amber-200 bg-amber-50 text-amber-700",
};

function StageIcon({ state }: { state: ModelForgeTrainingStageState }) {
  if (state === "complete") return <Check className="size-4" aria-hidden="true" />;
  if (state === "running") return <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />;
  if (state === "failed" || state === "blocked") return <TriangleAlert className="size-4" aria-hidden="true" />;
  return <CircleDashed className="size-4" aria-hidden="true" />;
}

function formatUpdatedAt(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.valueOf())
    ? "waiting for first update"
    : new Intl.DateTimeFormat("en", { hour: "numeric", minute: "2-digit", second: "2-digit" }).format(date);
}

export function TrainingProgressPanel({ initialStatus }: { initialStatus: ModelForgeTrainingStatus }) {
  const [status, setStatus] = useState(initialStatus);
  const [connected, setConnected] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      try {
        const response = await fetch("/api/try-on-test/model-forge/status", { cache: "no-store" });
        if (!response.ok) throw new Error(`status ${response.status}`);
        const next = await response.json() as ModelForgeTrainingStatus;
        if (!cancelled) {
          setStatus(next);
          setConnected(true);
        }
      } catch {
        if (!cancelled) setConnected(false);
      }
    };
    void refresh();
    const timer = window.setInterval(refresh, 5_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  const percent = Math.min(100, Math.max(0, status.overallPercent));
  const processedLabel = useMemo(() => (
    `${status.dataset.completedExamples.toLocaleString("en-US")} / ${status.dataset.targetExamples.toLocaleString("en-US")}`
  ), [status.dataset.completedExamples, status.dataset.targetExamples]);
  const isProblem = status.state === "failed" || status.state === "blocked";

  return (
    <section
      className={cn(
        "overflow-hidden rounded-3xl border bg-white shadow-sm",
        isProblem ? "border-amber-200" : "border-blue-200",
      )}
      data-testid="model-forge-live-training-progress"
    >
      <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1fr_auto] lg:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold",
              isProblem ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800",
            )}>
              {status.state === "running" || status.state === "preparing"
                ? <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
                : status.state === "complete"
                  ? <Check className="size-3.5" aria-hidden="true" />
                  : status.state === "waiting"
                    ? <CircleDashed className="size-3.5" aria-hidden="true" />
                    : <TriangleAlert className="size-3.5" aria-hidden="true" />}
              {status.state === "complete"
                ? "Synthetic training complete"
                : status.state === "waiting"
                  ? "Preprocessing saved safely"
                  : isProblem ? "Needs attention" : "Full pipeline running"}
            </span>
            <span className={cn(
              "inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold",
              connected ? "text-gray-600" : "text-amber-700",
            )}>
              <Cloud className="size-3.5" aria-hidden="true" />
              {connected ? "Live update every 5 seconds" : "Reconnecting to status"}
            </span>
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-text-primary">{status.currentStageLabel}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-text-secondary">{status.detail}</p>
        </div>
        <div className="min-w-32 rounded-2xl bg-slate-950 px-5 py-4 text-center text-white">
          <p className="text-3xl font-bold tabular-nums">{percent.toFixed(1)}%</p>
          <p className="mt-1 text-xs text-slate-400">whole pipeline</p>
        </div>
      </div>

      <div className="border-y border-gray-200 bg-gray-50 px-6 py-5 sm:px-8">
        <div
          className="h-4 overflow-hidden rounded-full border border-blue-100 bg-white shadow-inner"
          role="progressbar"
          aria-label="Full WEAR 3D training progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(percent)}
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-400 transition-[width] duration-700"
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="mt-3 flex flex-wrap justify-between gap-2 text-xs font-semibold text-text-secondary">
          <span>{processedLabel} labeled examples processed</span>
          <span>{status.dataset.failedExamples.toLocaleString("en-US")} errors · updated {formatUpdatedAt(status.updatedAt)}</span>
        </div>
      </div>

      <div className="grid gap-3 p-6 sm:grid-cols-2 sm:p-8 xl:grid-cols-3">
        {status.stages.map((stage, index) => (
          <div key={stage.key} className={cn("rounded-2xl border p-4", STAGE_TONE[stage.state])}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <StageIcon state={stage.state} />
                <p className="text-sm font-bold">{index + 1}. {stage.label}</p>
              </div>
              <span className="text-xs font-bold tabular-nums">{stage.percent.toFixed(0)}%</span>
            </div>
            <p className="mt-2 text-xs leading-5 opacity-90">{stage.explanation}</p>
          </div>
        ))}
      </div>

      <div className="border-t border-amber-200 bg-amber-50 px-6 py-4 text-xs leading-5 text-amber-950 sm:px-8">
        <span className="font-bold">Important:</span> reaching 100% here means the synthetic WEAR model was trained and tested. Real customer-photo accuracy still needs a separate paired photo test before SDK release.
      </div>
    </section>
  );
}
