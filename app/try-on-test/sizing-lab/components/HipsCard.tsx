"use client";

import type { HipsTrace } from "../lib/hipsFormula";

interface Props {
  trace: HipsTrace | null;
}

export function HipsCard({ trace }: Props) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-text-primary mb-3">
        Hips <span className="text-text-hint text-xs font-normal">· backend formula{trace ? ` (${trace.gender})` : ""}</span>
      </h3>
      {!trace ? (
        <p className="text-sm text-text-secondary">Run Analyze to compute.</p>
      ) : (
        <div className="space-y-3">
          <div className={`text-3xl font-bold tabular-nums ${trace.gender === "female" ? "text-pink-600" : "text-brand-blue"}`}>
            {trace.hipsIn.toFixed(1)} in
            <span className="text-base font-normal text-text-secondary ml-2">
              ({trace.hipsCm.toFixed(1)} cm)
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <Stat label="BMI" value={trace.bmi.toFixed(2)} />
            <Stat label="Hip bone (landmark)" value={`${trace.hipBoneCm} cm`} />
            {trace.details.map((d) => (
              <Stat key={d.label} label={d.label} value={d.value} />
            ))}
            <Stat label="Hip breadth" value={`${trace.hipBreadthCm} cm`} />
            <Stat label="Hip depth" value={`${trace.hipDepthCm} cm`} />
            <Stat label="Ellipse perimeter" value={`${trace.hipsCm} cm`} />
          </div>
          <details className="pt-2 border-t border-gray-100">
            <summary className="text-xs font-mono text-text-secondary cursor-pointer">Formula</summary>
            <pre className="mt-2 font-mono text-[11px] text-text-primary whitespace-pre-wrap">
{trace.formula}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-gray-50 rounded-lg px-3 py-2">
      <div className="text-text-hint text-[10px] uppercase tracking-wider">{label}</div>
      <div className="text-text-primary font-mono text-sm tabular-nums">{value}</div>
    </div>
  );
}
