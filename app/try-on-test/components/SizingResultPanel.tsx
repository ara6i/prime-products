"use client";

import { ClipboardList, Sparkles } from "lucide-react";
import type { PreparedSizing } from "../hooks/useTryOnSizing";

interface SizingResultPanelProps {
  prepared: PreparedSizing | null;
}

export function SizingResultPanel({ prepared }: SizingResultPanelProps) {
  if (!prepared) {
    return (
      <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <PanelTitle title="Sizing result" />
        <p className="text-sm text-text-secondary">Build sizing to see the recommended size, fitInfo, silhouetteContext, and final backend prompt.</p>
      </section>
    );
  }

  const { sizingResult, fitInfo, silhouetteContext, promptPreview } = prepared;

  return (
    <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <PanelTitle title="AI sizing result" />
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Metric label="Recommended" value={sizingResult.recommendedSize || "N/A"} />
          <Metric label="Confidence" value={sizingResult.confidence || "N/A"} />
          <Metric label="Unit" value={String(sizingResult.unit || "cm")} />
          <Metric label="fitInfo areas" value={String(fitInfo.length)} />
        </div>
        {sizingResult.reasoning && <p className="mt-3 rounded-lg bg-gray-50 px-3 py-2 text-xs text-text-secondary">{sizingResult.reasoning}</p>}
        <pre className="mt-3 max-h-64 overflow-auto rounded-lg bg-gray-950 p-3 text-xs leading-relaxed text-gray-100">
          {JSON.stringify({ fitInfo, silhouetteContext }, null, 2)}
        </pre>
      </div>

      <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-3 flex items-center justify-between gap-3">
          <PanelTitle title="Final backend prompt" />
          <span className="rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700">
            {promptPreview.promptBranch}
          </span>
        </div>
        <pre className="max-h-[420px] overflow-auto whitespace-pre-wrap rounded-lg bg-gray-950 p-3 text-xs leading-relaxed text-gray-100">
          {promptPreview.prompt}
        </pre>
      </div>
    </section>
  );
}

function PanelTitle({ title }: { title: string }) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <div className="rounded-md bg-brand-blue-pale p-2 text-brand-blue">
        {title.includes("prompt") ? <Sparkles className="size-4" /> : <ClipboardList className="size-4" />}
      </div>
      <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-gray-50 px-3 py-2">
      <div className="text-xs text-text-hint">{label}</div>
      <div className="mt-1 truncate font-medium text-text-primary">{value}</div>
    </div>
  );
}
