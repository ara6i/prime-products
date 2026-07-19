"use client";

const PROVIDERS = [
  {
    name: "Bodygram",
    status: "Signup ready",
    description: "Best first pilot: front + side photos, height, weight, age, and gender. Five evaluation scans are advertised after signup.",
    href: "https://www.platform.bodygram.com/sign-in",
  },
  {
    name: "3DLOOK FitXpress",
    status: "Sales key required",
    description: "Apparel-focused two-photo measurement API. Access tokens are assigned by a 3DLOOK contact.",
    href: "https://3dlook.ai/fitxpress/",
  },
  {
    name: "Size Stream",
    status: "Demo required",
    description: "Enterprise mobile scanning SDK/API with a guided capture flow.",
    href: "https://www.sizestream.com/mobile-scanning/",
  },
  {
    name: "TrueToForm",
    status: "Enterprise API",
    description: "Guided scan and avatar measurements with REST and webhook access on eligible plans.",
    href: "https://www.truetoform.fit/help-center",
  },
] as const;

export interface ThirdPartyMeasurement {
  name: string;
  unit: string;
  value: number;
}

export interface ThirdPartyScanResult {
  provider: string;
  scanId: string | null;
  latencyMs: number;
  measurements: ThirdPartyMeasurement[];
}

interface Props {
  mode: "photo" | "stats-only";
  onModeChange: (mode: "photo" | "stats-only") => void;
  result?: ThirdPartyScanResult | null;
  error?: string | null;
}

export function ThirdPartyProviderPanel({ mode, onModeChange, result, error }: Props) {
  const importantNames = new Set(["bustGirth", "chestGirth", "waistGirth", "bellyWaistGirth", "topHipGirth", "hipGirth", "insideLegLengthR", "outsideLegLengthR"]);
  const importantMeasurements = result?.measurements.filter((measurement) => importantNames.has(measurement.name)) ?? [];
  return (
    <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50 p-4 text-xs text-violet-950">
      <div className="font-semibold">Third-party body-measurement APIs</div>
      <p className="mt-1 leading-relaxed">
        Test-lab comparison only. These services require their own account, consent terms, API key, and guided front + side capture. No provider result is treated as production sizing truth.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => onModeChange("photo")}
          className={`rounded-lg border px-3 py-2 font-semibold ${mode === "photo" ? "border-violet-500 bg-violet-600 text-white" : "border-violet-200 bg-white"}`}
        >
          Photos · front + right side
        </button>
        <button
          type="button"
          onClick={() => onModeChange("stats-only")}
          className={`rounded-lg border px-3 py-2 font-semibold ${mode === "stats-only" ? "border-violet-500 bg-violet-600 text-white" : "border-violet-200 bg-white"}`}
        >
          Stats only · no photo evidence
        </button>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
        {PROVIDERS.map((provider) => (
          <a
            key={provider.name}
            href={provider.href}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-violet-200 bg-white p-3 transition hover:border-violet-400"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="font-semibold">{provider.name}</span>
              <span className="rounded-full bg-violet-100 px-2 py-1 text-[10px] font-medium">{provider.status}</span>
            </div>
            <p className="mt-2 leading-relaxed text-violet-800">{provider.description}</p>
          </a>
        ))}
      </div>
      <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-amber-900">
        Bodygram is configured server-side. Every request can consume a free-trial scan. Stats-only results come from age, gender, height, and weight—not the uploaded photos. Keys stay server-side.
      </div>
      {error ? <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-red-800">Bodygram error: {error}</div> : null}
      {result ? (
        <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-emerald-950">
          <div className="font-semibold">Bodygram result · {result.latencyMs} ms</div>
          <div className="mt-2 grid grid-cols-2 gap-2 md:grid-cols-4">
            {importantMeasurements.map((measurement) => (
              <div key={measurement.name} className="rounded-md border border-emerald-200 bg-white px-2 py-2">
                <div className="text-[10px] text-emerald-700">{measurement.name}</div>
                <div className="mt-1 font-mono font-semibold">
                  {measurement.unit === "mm" ? `${(measurement.value / 10).toFixed(1)} cm` : `${measurement.value} ${measurement.unit}`}
                </div>
              </div>
            ))}
          </div>
          <details className="mt-3">
            <summary className="cursor-pointer font-semibold">All {result.measurements.length} measurements</summary>
            <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-white p-2 text-[10px]">{JSON.stringify(result.measurements, null, 2)}</pre>
          </details>
        </div>
      ) : null}
    </div>
  );
}
