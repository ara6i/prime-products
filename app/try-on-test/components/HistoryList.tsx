"use client";

import { History as HistoryIcon, AlertCircle } from "lucide-react";
import { cn } from "@/app/shared/lib/utils";
import type { HistoryEntry } from "../lib/types";

export interface HistoryListProps {
  entries: HistoryEntry[];
  onClear: () => void;
}

export function HistoryList({ entries, onClear }: HistoryListProps) {
  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-gray-200 bg-white px-6 py-10 text-center">
        <div className="rounded-full bg-gray-100 p-2 text-text-hint">
          <HistoryIcon className="size-4" />
        </div>
        <p className="text-sm text-text-hint">Run history will show here so you can compare prompts at a glance.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-brand-blue-pale p-2 text-brand-blue">
            <HistoryIcon className="size-4" />
          </div>
          <h3 className="text-sm font-semibold text-text-primary">History</h3>
          <span className="text-xs text-text-hint">({entries.length})</span>
        </div>
        <button
          type="button"
          onClick={onClear}
          className="text-xs text-text-hint hover:text-text-primary transition-colors"
        >
          Clear
        </button>
      </div>

      <div className="grid grid-cols-12 gap-2 px-2 pb-1 text-[10px] uppercase tracking-wider text-text-hint">
        <span className="col-span-2">Time</span>
        <span className="col-span-1">Total</span>
        <span className="col-span-1">Ack</span>
        <span className="col-span-1">Gen</span>
        <span className="col-span-3">Model</span>
        <span className="col-span-1">Prompt</span>
        <span className="col-span-3">Notes</span>
      </div>

      <ul className="flex flex-col gap-1">
        {entries.map((entry, index) => (
          <li
            key={entry.id}
            className={cn(
              "grid grid-cols-12 items-center gap-2 rounded-lg px-2 py-2 text-xs transition-colors",
              index === 0 ? "bg-brand-blue-pale/40" : "hover:bg-gray-50",
              entry.status === "error" && "bg-red-50",
            )}
          >
            <span className="col-span-2 text-text-secondary">{formatClock(entry.startedAt)}</span>
            <span className="col-span-1 font-mono font-semibold tabular-nums text-text-primary">
              {entry.status === "error" ? "—" : `${(entry.totalMs / 1000).toFixed(2)}s`}
            </span>
            <span className="col-span-1 font-mono tabular-nums text-text-secondary">
              {entry.ackMs == null ? "—" : `${(entry.ackMs / 1000).toFixed(2)}s`}
            </span>
            <span className="col-span-1 font-mono tabular-nums text-text-secondary">
              {entry.generationMs == null ? "—" : `${(entry.generationMs / 1000).toFixed(2)}s`}
            </span>
            <span className="col-span-3 truncate font-mono text-[11px] text-text-secondary" title={entry.modelId}>
              {entry.modelId}
            </span>
            <span className="col-span-1">
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-medium",
                  entry.promptKind === "custom"
                    ? "bg-brand-blue-pale text-brand-blue-dark"
                    : entry.promptKind === "n/a"
                      ? "bg-purple-100 text-purple-700"
                      : "bg-gray-100 text-text-secondary",
                )}
              >
                {entry.promptKind}
              </span>
            </span>
            <span className="col-span-3 truncate text-text-secondary">
              {entry.status === "error" ? (
                <span className="inline-flex items-center gap-1 text-red-600">
                  <AlertCircle className="size-3" /> {entry.errorMessage ?? "failed"}
                </span>
              ) : (
                entry.promptPreview || <span className="text-text-hint">(empty)</span>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function formatClock(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
