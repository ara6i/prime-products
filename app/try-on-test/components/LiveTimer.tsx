"use client";

import { Clock } from "lucide-react";
import { cn } from "@/app/shared/lib/utils";
import { formatElapsed } from "../hooks/useStopwatch";
import type { TryOnPhase, TryOnRunTimings } from "../lib/types";

export interface LiveTimerProps {
  elapsedMs: number;
  phase: TryOnPhase;
  timings: TryOnRunTimings;
}

const PHASE_LABEL: Record<TryOnPhase, string> = {
  idle: "Ready",
  submitting: "Submitting",
  queued: "Queued",
  generating: "Generating",
  done: "Done",
  error: "Error",
};

const PHASE_TONE: Record<TryOnPhase, string> = {
  idle: "bg-gray-100 text-text-hint",
  submitting: "bg-brand-blue-pale text-brand-blue-dark",
  queued: "bg-brand-blue-pale text-brand-blue-dark",
  generating: "bg-brand-blue-pale text-brand-blue-dark",
  done: "bg-green-100 text-green-700",
  error: "bg-red-100 text-red-700",
};

export function LiveTimer({ elapsedMs, phase, timings }: LiveTimerProps) {
  const isLive = phase === "submitting" || phase === "queued" || phase === "generating";
  const display = phase === "idle" ? "00:00.00" : formatElapsed(elapsedMs);

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="inline-flex items-center gap-2 text-sm font-semibold text-text-primary">
          <div className="rounded-full bg-brand-blue-pale p-2 text-brand-blue">
            <Clock className="size-4" />
          </div>
          Elapsed
        </div>
        <span className={cn("rounded-full px-3 py-1 text-xs font-medium", PHASE_TONE[phase])}>
          {PHASE_LABEL[phase]}
          {isLive && <span className="ml-2 inline-flex">{liveDots}</span>}
        </span>
      </div>

      <div
        className={cn(
          "font-mono text-5xl font-semibold tabular-nums tracking-tight transition-colors",
          phase === "done" && "text-green-700",
          phase === "error" && "text-red-700",
          isLive && "text-brand-blue-dark",
          phase === "idle" && "text-text-hint",
        )}
      >
        {display}
      </div>

      <BreakdownRow
        label="Backend ack"
        valueMs={timings.ackMs}
        hint="POST /api/v1/tryon → 202"
        active={phase === "submitting"}
      />
      <BreakdownRow
        label="Generation"
        valueMs={timings.generationMs}
        hint="Gemini call (pass 1)"
        active={phase === "queued" || phase === "generating"}
      />
      <BreakdownRow
        label="End-to-end"
        valueMs={timings.totalMs}
        hint="Submit → SSE completed"
        active={isLive}
        emphasized
      />
    </div>
  );
}

function BreakdownRow({
  label,
  valueMs,
  hint,
  active,
  emphasized,
}: {
  label: string;
  valueMs: number | null;
  hint: string;
  active: boolean;
  emphasized?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between rounded-lg px-3 py-2 transition-colors",
        active && "bg-brand-blue-pale/40",
        emphasized && "bg-gray-50",
      )}
    >
      <div className="flex flex-col">
        <span className={cn("text-xs font-medium", emphasized ? "text-text-primary" : "text-text-secondary")}>
          {label}
        </span>
        <span className="text-[10px] text-text-hint">{hint}</span>
      </div>
      <span
        className={cn(
          "font-mono text-sm tabular-nums",
          valueMs == null ? "text-text-hint" : emphasized ? "font-semibold text-text-primary" : "text-text-primary",
        )}
      >
        {valueMs == null ? "—" : `${(valueMs / 1000).toFixed(2)}s`}
      </span>
    </div>
  );
}

const liveDots = (
  <span className="inline-flex gap-0.5">
    <Dot delay="0ms" />
    <Dot delay="120ms" />
    <Dot delay="240ms" />
  </span>
);

function Dot({ delay }: { delay: string }) {
  return (
    <span
      className="size-1 rounded-full bg-current animate-pulse"
      style={{ animationDelay: delay, animationDuration: "1s" }}
    />
  );
}
