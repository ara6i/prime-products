"use client";

import type { WaistTrace } from "../types";

interface Props {
  trace: WaistTrace | null;
}

export function ResultCard({ trace }: Props) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-text-primary mb-3">Trouser waist</h3>
      {!trace ? (
        <p className="text-sm text-text-secondary">Upload a photo and enter metrics to compute.</p>
      ) : (
        <div className="space-y-3">
          <div className="text-3xl font-bold text-brand-blue tabular-nums">
            {trace.finalTrouserWaistIn.toFixed(1)} in
            <span className="text-base font-normal text-text-secondary ml-2">
              ({trace.finalTrouserWaistCm.toFixed(1)} cm)
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <Stat label="Hip bone width" value={`${trace.hipBoneCm} cm`} />
            <Stat label="Hip mask width" value={trace.hipMaskWidthCm > 0 ? `${trace.hipMaskWidthCm} cm` : "—"} />
            <Stat label="Trouser breadth" value={`${trace.trouserWaistBreadthCm} cm`} />
            <Stat label="Depth ratio (β)" value={trace.depthRatio.toFixed(3)} />
            <Stat label="Depth (cm)" value={`${trace.trouserWaistDepthCm} cm`} />
            <Stat label="Z-depth signal" value={`${trace.zDepthCm} cm`} />
            <Stat label="Ellipse perimeter" value={`${trace.trouserWaistCm} cm`} />
            <Stat label="Weight bonus" value={`${trace.directWeightBonusCm >= 0 ? "+" : ""}${trace.directWeightBonusCm} cm`} />
          </div>
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
