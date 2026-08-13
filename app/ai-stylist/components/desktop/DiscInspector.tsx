"use client";

import { type DiscConfig, DISC_DEFAULTS } from "./DiscCanvas";

const SLIDERS: {
  key: keyof DiscConfig;
  label: string;
  min: number;
  max: number;
  step: number;
  color: string;
}[] = [
  { key: "radius",      label: "disc radius",      min: 0.5, max: 7,   step: 0.1,  color: "#ef4444" },
  { key: "height",      label: "disc height",       min: 0.05,max: 2.5, step: 0.01, color: "#3b82f6" },
  { key: "lerp",        label: "spin smoothness",   min: 0.01,max: 1,   step: 0.01, color: "#22c55e" },
  { key: "cameraFov",   label: "camera fov",        min: 10,  max: 90,  step: 1,    color: "#c084fc" },
  { key: "cameraPosY",  label: "camera Y",          min: -1,  max: 6,   step: 0.1,  color: "#a855f7" },
  { key: "cameraPosZ",  label: "camera Z",          min: 1,   max: 14,  step: 0.1,  color: "#a855f7" },
  { key: "discY",       label: "disc Y position",   min: -20, max: 60,  step: 0.5,  color: "#06b6d4" },
  { key: "modelBottom", label: "model height ↕",   min: 0,   max: 60,  step: 0.5,  color: "#f97316" },
  { key: "modelSpread", label: "model spread ↔",   min: 0,   max: 100, step: 1,    color: "#f97316" },
  { key: "modelSize",   label: "model size",        min: 20,  max: 120, step: 1,    color: "#f97316" },
];

interface DiscInspectorProps {
  config: DiscConfig;
  onChange: (c: DiscConfig) => void;
}

export function DiscInspector({ config, onChange }: DiscInspectorProps) {
  const set = (key: keyof DiscConfig) => (e: React.ChangeEvent<HTMLInputElement>) =>
    onChange({ ...config, [key]: parseFloat(e.target.value) });

  const reset = () => onChange({ ...DISC_DEFAULTS });

  return (
    <div className="rounded-[0.833vw] border border-dashed border-amber-400 bg-white p-[0.625vw]">
      <div className="mb-[0.625vw] flex items-center justify-between">
        <div className="flex items-center gap-[0.417vw]">
          <div className="rounded-[0.208vw] bg-amber-100 px-[0.417vw] py-[0.104vw] text-[0.521vw] font-semibold uppercase tracking-wide text-amber-600">
            Disc Inspector
          </div>
          <span className="text-[0.521vw] text-text-muted">Sliders affect the real disc on the left</span>
        </div>
        <button
          onClick={reset}
          className="rounded-[0.313vw] border border-border-light px-[0.417vw] py-[0.104vw] font-mono text-[0.521vw] text-text-muted hover:bg-neutral-50"
        >
          ↺ reset
        </button>
      </div>

      <div className="flex flex-col gap-[0.417vw]">
        {SLIDERS.map(({ key, label, min, max, step, color }) => (
          <div key={key} className="flex items-center gap-[0.625vw]">
            <div className="flex w-[5.625vw] shrink-0 items-center gap-[0.313vw]">
              <div style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
              <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 10, color, fontWeight: 700 }}>
                {label}
              </span>
            </div>
            <input
              type="range"
              min={min} max={max} step={step}
              value={config[key]}
              onChange={set(key)}
              style={{ flex: 1, accentColor: color, cursor: "pointer", height: 4 }}
            />
            <span style={{
              fontFamily: "ui-monospace, monospace", fontSize: 11, fontWeight: 700,
              color, minWidth: 38, textAlign: "right",
            }}>
              {config[key]}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
