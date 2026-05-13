"use client";

import type { BraRegion, Gender, MetricsInput, UnitSystem } from "../types";
import {
  BRA_CUPS,
  bandRangeForRegion,
  bustFromBraCm,
  cmToIn,
  inToCm,
  kgToLb,
  lbToKg,
} from "../lib/units";

interface Props {
  metrics: MetricsInput;
  onChange: (m: MetricsInput) => void;
}

const REGIONS: BraRegion[] = ["US", "UK", "AU", "EU", "FR", "IT", "JP", "KR"];

export function MetricsForm({ metrics, onChange }: Props) {
  const isMetric = metrics.unitSystem === "metric";

  // Imperial height = feet + inches. Compute both from heightCm.
  const totalIn = cmToIn(metrics.heightCm);
  const heightFt = Math.floor(totalIn / 12);
  const heightInRemainder = Math.round((totalIn - heightFt * 12) * 10) / 10;

  // Display: round display values to a clean step (1 lb / 0.5 kg) so the
  // input doesn't jiggle as the kg <-> lb round-trip introduces decimal noise.
  const wDisplay = isMetric
    ? Math.round(metrics.weightKg * 2) / 2
    : Math.round(kgToLb(metrics.weightKg));
  const bmi = metrics.heightCm > 0
    ? (metrics.weightKg / Math.pow(metrics.heightCm / 100, 2)).toFixed(1)
    : "—";

  const setUnit = (u: UnitSystem) => onChange({ ...metrics, unitSystem: u });
  // Keep storage at full precision; only ROUND on display. Avoids the
  // "type 178 → field jumps to 177.9" feedback loop from kg<->lb rounding.
  const setHeightCm = (cm: number) =>
    onChange({ ...metrics, heightCm: cm });
  const setHeightFtIn = (ft: number, inches: number) => {
    const totalInches = ft * 12 + inches;
    onChange({ ...metrics, heightCm: inToCm(totalInches) });
  };
  const setWeight = (v: number) => {
    const kg = isMetric ? v : lbToKg(v);
    onChange({ ...metrics, weightKg: kg });
  };
  const setGender = (g: Gender) => {
    onChange({
      ...metrics,
      gender: g,
      braSize: g === "female"
        ? metrics.braSize ?? { region: "US", band: 34, cup: "C" }
        : null,
    });
  };

  const bra = metrics.gender === "female" ? metrics.braSize ?? null : null;
  const setBra = (patch: Partial<NonNullable<MetricsInput["braSize"]>>) => {
    const next = { ...(metrics.braSize ?? { region: "US" as BraRegion, band: 34, cup: "C" }), ...patch };
    onChange({ ...metrics, braSize: next });
  };
  const bustCm = bra ? bustFromBraCm(bra.region, bra.band, bra.cup) : null;
  const bandRange = bra ? bandRangeForRegion(bra.region) : null;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-primary">User metrics</h3>
        <div className="inline-flex rounded-md border border-gray-200 overflow-hidden text-xs">
          <button
            type="button"
            onClick={() => setUnit("metric")}
            className={`px-2.5 py-1 ${isMetric ? "bg-brand-blue text-white" : "bg-white text-text-secondary"}`}
          >
            cm / kg
          </button>
          <button
            type="button"
            onClick={() => setUnit("imperial")}
            className={`px-2.5 py-1 ${!isMetric ? "bg-brand-blue text-white" : "bg-white text-text-secondary"}`}
          >
            in / lbs
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {isMetric ? (
          <NumField
            label="Height (cm)"
            value={Math.round(metrics.heightCm)}
            onChange={setHeightCm}
            min={120}
            max={220}
            step={1}
          />
        ) : (
          <div>
            <label className="text-xs text-text-secondary block mb-1.5">Height</label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="number"
                  value={heightFt || ""}
                  onChange={(e) => setHeightFtIn(Number(e.target.value) || 0, heightInRemainder)}
                  min={3}
                  max={7}
                  step={1}
                  className="w-full border border-gray-200 rounded-lg pl-3 pr-8 py-2 text-sm bg-white"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-text-hint">ft</span>
              </div>
              <div className="relative flex-1">
                <input
                  type="number"
                  value={heightInRemainder || ""}
                  onChange={(e) => setHeightFtIn(heightFt, Number(e.target.value) || 0)}
                  min={0}
                  max={11.9}
                  step={0.5}
                  className="w-full border border-gray-200 rounded-lg pl-3 pr-8 py-2 text-sm bg-white"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-text-hint">in</span>
              </div>
            </div>
          </div>
        )}
        <NumField
          label={`Weight (${isMetric ? "kg" : "lbs"})`}
          value={wDisplay}
          onChange={setWeight}
          min={isMetric ? 30 : 66}
          max={isMetric ? 200 : 441}
          step={isMetric ? 0.5 : 1}
        />
        <div>
          <label className="text-xs text-text-secondary block mb-1.5">Gender</label>
          <select
            value={metrics.gender}
            onChange={(e) => setGender(e.target.value as Gender)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
          >
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>
      </div>

      <p className="text-xs text-text-hint">
        BMI = <span className="font-mono tabular-nums">{bmi}</span>{" "}
        {isMetric ? null : (
          <span className="text-text-secondary font-mono">
            · {heightFt}&apos;{heightInRemainder}&quot; = {metrics.heightCm.toFixed(1)} cm
            · {wDisplay} lbs = {metrics.weightKg.toFixed(1)} kg
          </span>
        )}
      </p>

      {bra && bandRange && (
        <div className="pt-3 border-t border-gray-100">
          <h4 className="text-xs font-semibold text-text-primary mb-2 uppercase tracking-wider">Bra size</h4>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-text-secondary block mb-1.5">Region</label>
              <select
                value={bra.region}
                onChange={(e) => setBra({ region: e.target.value as BraRegion })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
              >
                {REGIONS.map((r) => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
            <NumField
              label={`Band (${bandRange.unit})`}
              value={bra.band}
              onChange={(v) => setBra({ band: v })}
              min={bandRange.min}
              max={bandRange.max}
              step={bandRange.step}
            />
            <div>
              <label className="text-xs text-text-secondary block mb-1.5">Cup</label>
              <select
                value={bra.cup}
                onChange={(e) => setBra({ cup: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
              >
                {BRA_CUPS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>
          {bustCm != null && (
            <p className="text-xs text-text-hint mt-2 font-mono">
              bustFromBra({bra.region}, {bra.band}, {bra.cup}) → <span className="text-brand-blue">{bustCm} cm ({cmToIn(bustCm).toFixed(1)} in)</span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function NumField({
  label,
  value,
  onChange,
  min,
  max,
  step,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
}) {
  return (
    <div>
      <label className="text-xs text-text-secondary block mb-1.5">{label}</label>
      <input
        type="number"
        value={value || ""}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        min={min}
        max={max}
        step={step}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white"
      />
    </div>
  );
}
