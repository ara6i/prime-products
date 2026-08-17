import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  DatabaseZap,
  ImageIcon,
  RefreshCw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { AiStylistBatchProgress } from "../types";

function number(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function money(value: number | null): string {
  if (value === null) return "Pending";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function duration(value: number | null): string {
  if (value === null) return "Pending";
  const seconds = Math.round(value);
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

function percent(value: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, (value / total) * 100);
}

function ProgressBar({ value, tone }: { value: number; tone: "blue" | "violet" }) {
  return (
    <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
      <div
        className={`h-full rounded-full transition-[width] duration-500 ${
          tone === "blue" ? "bg-blue-600" : "bg-violet-600"
        }`}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

export function AiStylistBatchProgressPanel({
  progress,
  error,
  loading,
  onRefresh,
}: {
  progress: AiStylistBatchProgress | null;
  error: string | null;
  loading: boolean;
  onRefresh: () => void;
}) {
  const gemini = progress?.gemini;
  const luna = progress?.luna;
  const geminiReadyPercent = percent(gemini?.readySources ?? 0, gemini?.uniqueSources ?? 0);
  const lunaJobPercent = percent(luna?.batchJobsSubmitted ?? 0, luna?.batchJobsTotal ?? 20);
  const lunaScenarioPercent = percent(luna?.scenariosCommitted ?? 0, luna?.targetScenarios ?? 0);

  return (
    <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold text-slate-950">
              Luna + Gemini Batch work
            </h2>
            <span className="rounded-full bg-blue-50 px-3 py-1 text-sm font-semibold text-blue-700 ring-1 ring-blue-200">
              Manual refresh only
            </span>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Reads small saved progress files only. It does not recount MongoDB,
            submit a paid job, or poll automatically.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex h-10 items-center justify-center gap-2 self-start rounded-xl bg-blue-600 px-4 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-70"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh Batch progress
        </button>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        <article className="rounded-3xl border border-blue-100 bg-gradient-to-br from-blue-50/80 via-white to-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-blue-700">
                Gemini image refinement
              </p>
              <h3 className="mt-2 text-2xl font-semibold text-slate-950">
                {gemini?.status === "partial" ? "Finished with one missing image" : gemini?.status ?? "Loading"}
              </h3>
            </div>
            <div className="rounded-2xl bg-blue-600 p-3 text-white">
              <ImageIcon className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium text-slate-600">Unique sources ready</span>
              <span className="font-semibold tabular-nums text-slate-950">
                {number(gemini?.readySources ?? 0)} / {number(gemini?.uniqueSources ?? 0)}
              </span>
            </div>
            <ProgressBar value={geminiReadyPercent} tone="blue" />
            <p className="mt-2 text-sm text-slate-500">
              {geminiReadyPercent.toFixed(1)}% ready · {number(gemini?.succeeded ?? 0)} generated · {number(gemini?.reused ?? 0)} reused · {number(gemini?.failed ?? 0)} missing
            </p>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              ["Transparent saved", number(gemini?.transparentSaved ?? 0)],
              ["Duplicate reruns", number(gemini?.duplicateRegenerations ?? 0)],
              ["Elapsed", duration(gemini?.elapsedSeconds ?? null)],
              ["Batch cost", money(gemini?.estimatedCostUsd ?? null)],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-blue-100 bg-white p-3">
                <p className="text-xs font-medium text-slate-500">{label}</p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-slate-950">{value}</p>
              </div>
            ))}
          </div>

          {gemini?.failureMessage && (
            <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-amber-200">
              One source needs retry: {gemini.failureMessage}
            </p>
          )}
        </article>

        <article className="rounded-3xl border border-violet-100 bg-gradient-to-br from-violet-50/80 via-white to-white p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-violet-700">
                Luna outfit scenarios
              </p>
              <h3 className="mt-2 text-2xl font-semibold text-slate-950">
                {luna?.status === "building" ? "Preparing the no-repeat gate" : luna?.status ?? "Loading"}
              </h3>
            </div>
            <div className="rounded-2xl bg-violet-600 p-3 text-white">
              <Sparkles className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-5 space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium text-slate-600">Batch jobs submitted</span>
                <span className="font-semibold tabular-nums text-slate-950">
                  {number(luna?.batchJobsSubmitted ?? 0)} / {number(luna?.batchJobsTotal ?? 20)}
                </span>
              </div>
              <ProgressBar value={lunaJobPercent} tone="violet" />
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="font-medium text-slate-600">New scenarios committed</span>
                <span className="font-semibold tabular-nums text-slate-950">
                  {number(luna?.scenariosCommitted ?? 0)} / {number(luna?.targetScenarios ?? 0)}
                </span>
              </div>
              <ProgressBar value={lunaScenarioPercent} tone="violet" />
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-violet-100 bg-white p-3">
              <Clock3 className="h-4 w-4 text-violet-600" />
              <p className="mt-2 text-xs font-medium text-slate-500">Running now</p>
              <p className="mt-1 text-lg font-semibold text-slate-950">{number(luna?.batchJobsRunning ?? 0)}</p>
            </div>
            <div className="rounded-2xl border border-violet-100 bg-white p-3">
              <DatabaseZap className="h-4 w-4 text-violet-600" />
              <p className="mt-2 text-xs font-medium text-slate-500">Products claimed</p>
              <p className="mt-1 text-lg font-semibold text-slate-950">{number(luna?.uniqueProductsClaimed ?? 0)}</p>
            </div>
            <div className="rounded-2xl border border-violet-100 bg-white p-3">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <p className="mt-2 text-xs font-medium text-slate-500">Illegal repeats</p>
              <p className="mt-1 text-lg font-semibold text-emerald-700">{number(luna?.duplicateNonExemptProducts ?? 0)}</p>
            </div>
            <div className="rounded-2xl border border-violet-100 bg-white p-3">
              <CheckCircle2 className="h-4 w-4 text-violet-600" />
              <p className="mt-2 text-xs font-medium text-slate-500">Estimate</p>
              <p className="mt-1 text-lg font-semibold text-slate-950">{money(luna?.estimatedCostUsd ?? null)}</p>
            </div>
          </div>

          <p className="mt-4 text-sm leading-6 text-slate-600">
            {luna?.message ?? "Waiting for the saved Luna status."}
          </p>
        </article>
      </div>

      {(gemini?.samples.length ?? 0) > 0 && (
        <div className="mt-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-slate-950">Real Gemini results</h3>
              <p className="mt-1 text-sm text-slate-500">Transparent files saved by this exact Batch.</p>
            </div>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200">
              0 duplicate refinements
            </span>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
            {gemini?.samples.map((sample) => (
              <figure key={sample.key} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                <div
                  className="p-3"
                  style={{
                    backgroundImage: "linear-gradient(45deg,#e2e8f0 25%,transparent 25%),linear-gradient(-45deg,#e2e8f0 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e2e8f0 75%),linear-gradient(-45deg,transparent 75%,#e2e8f0 75%)",
                    backgroundPosition: "0 0,0 8px,8px -8px,-8px 0",
                    backgroundSize: "16px 16px",
                  }}
                >
                  {/* Local dynamic Test Lab image route intentionally uses img. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={sample.imageUrl} alt={sample.title} className="h-40 w-full object-contain" loading="lazy" />
                </div>
                <figcaption className="border-t border-slate-200 bg-white px-3 py-2">
                  <p className="truncate text-sm font-semibold text-slate-900">{sample.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{sample.scenarioId} · {sample.slot} · {sample.color}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
