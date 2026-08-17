import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  ImageIcon,
  Layers3,
  ShieldCheck,
} from "lucide-react";
import type { AiStylistGarmentExtractionProgress } from "../types";

function number(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function money(value: number | null): string {
  if (value === null) return "Calculating";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function duration(value: number | null): string {
  if (value === null) return "Calculating";
  const seconds = Math.max(0, Math.round(value));
  if (seconds < 60) return `${seconds}s`;
  const hours = Math.floor(seconds / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  if (hours < 1) return `${minutes}m`;
  const days = Math.floor(hours / 24);
  if (days < 1) return `${hours}h ${minutes}m`;
  return `${days}d ${hours % 24}h`;
}

function progressPercent(progress: AiStylistGarmentExtractionProgress): number {
  const counts = progress.latestBatch?.counts ?? progress.counts;
  if (counts.total <= 0) return 0;
  const completed = counts.succeeded + counts.needsReview + counts.failed;
  return Math.min(100, (completed / counts.total) * 100);
}

function ExtractionMetric({
  label,
  value,
  detail,
  icon,
}: {
  label: string;
  value: string;
  detail: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-blue-100 bg-white p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-600">{label}</p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-950">
            {value}
          </p>
          <p className="mt-1 text-sm leading-5 text-slate-500">{detail}</p>
        </div>
        <div className="rounded-xl bg-blue-50 p-2.5 text-blue-700">{icon}</div>
      </div>
    </div>
  );
}

function ExtractionSamples({
  progress,
}: {
  progress: AiStylistGarmentExtractionProgress;
}) {
  if (progress.samples.length === 0) {
    return (
      <div className="mt-5 flex min-h-52 items-center justify-center rounded-2xl border border-dashed border-blue-200 bg-white/70 px-6 text-center">
        <div>
          <ImageIcon className="mx-auto h-7 w-7 text-blue-400" />
          <p className="mt-3 text-base font-semibold text-slate-800">
            Generated images will appear here automatically
          </p>
          <p className="mt-1 text-sm text-slate-500">
            The gallery is filled from successful jobs; the original product
            photo remains unchanged.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {progress.samples.map((sample, index) => (
        <article
          key={sample.jobId}
          className="overflow-hidden rounded-2xl border border-blue-100 bg-white"
        >
          <div className="grid grid-cols-2">
            <figure className="border-r border-blue-100 bg-slate-50 p-3">
              <figcaption className="mb-2 text-sm font-semibold text-slate-600">
                Source photo
              </figcaption>
              {/* Dynamic merchant URLs intentionally bypass the static Next Image host list. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={sample.sourceImageUrl}
                alt={`${sample.color} ${sample.garmentCategory} source`}
                className="h-44 w-full rounded-xl object-contain"
                loading={index < 3 ? "eager" : "lazy"}
                fetchPriority={index < 3 ? "high" : "auto"}
              />
            </figure>
            <figure
              className="p-3"
              style={{
                backgroundColor: "#f8fafc",
                backgroundImage:
                  "linear-gradient(45deg,#e2e8f0 25%,transparent 25%),linear-gradient(-45deg,#e2e8f0 25%,transparent 25%),linear-gradient(45deg,transparent 75%,#e2e8f0 75%),linear-gradient(-45deg,transparent 75%,#e2e8f0 75%)",
                backgroundPosition: "0 0,0 8px,8px -8px,-8px 0",
                backgroundSize: "16px 16px",
              }}
            >
              <figcaption className="mb-2 text-sm font-semibold text-slate-700">
                Transparent result
              </figcaption>
              {/* Dynamic generated URLs intentionally bypass the static Next Image host list. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={sample.resultUrl}
                alt={`${sample.color} ${sample.garmentCategory} transparent result`}
                className="h-44 w-full rounded-xl object-contain"
                loading={index < 3 ? "eager" : "lazy"}
                fetchPriority={index < 3 ? "high" : "auto"}
              />
            </figure>
          </div>
          <div className="border-t border-blue-100 px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <p className="truncate text-sm font-semibold text-slate-900">
                {sample.color || "Unspecified color"} · {sample.garmentCategory}
              </p>
              <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-sm font-semibold text-emerald-700">
                {sample.processingStrategyUsed === "direct_alpha"
                  ? "background removal"
                  : sample.modeUsed ?? "generative"}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              {sample.providerLatencyMs
                ? `${(sample.providerLatencyMs / 1_000).toFixed(1)}s processing`
                : "Latency pending"}
              {sample.transparentPixelRatio !== null
                ? ` · ${(sample.transparentPixelRatio * 100).toFixed(0)}% transparent pixels`
                : ""}
            </p>
          </div>
        </article>
      ))}
    </div>
  );
}

export function GarmentExtractionProgressPanel({
  progress,
}: {
  progress: AiStylistGarmentExtractionProgress | null;
}) {
  const completedPercent = progress ? progressPercent(progress) : 0;
  const batchCounts = progress?.latestBatch?.counts ?? progress?.counts;
  const completedPercentLabel =
    completedPercent > 0 && completedPercent < 0.1
      ? "<0.1%"
      : `${completedPercent.toFixed(1)}%`;

  return (
    <section className="mt-6 overflow-hidden rounded-3xl border border-blue-200 bg-gradient-to-br from-[#eef5ff] via-white to-[#f5f2ff] p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold text-slate-950">
              Garment image extraction
            </h2>
            <span className="rounded-full bg-blue-600 px-3 py-1 text-sm font-semibold text-white">
              Manual refresh only
            </span>
          </div>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
            Each distinct product color is processed as its own job. Successful
            transparent PNGs are saved as derived assets and become available to
            the AI Stylist without replacing the merchant&apos;s original photo.
          </p>
        </div>
        <div
          className={`inline-flex items-center gap-2 self-start rounded-full px-3 py-2 text-sm font-semibold ring-1 ${
            progress?.productionUseAllowed
              ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
              : "bg-amber-50 text-amber-800 ring-amber-200"
          }`}
        >
          {progress?.productionUseAllowed ? (
            <ShieldCheck className="h-4 w-4" />
          ) : (
            <AlertTriangle className="h-4 w-4" />
          )}
          {progress?.productionUseAllowed
            ? "Commercial use enabled"
            : "Test Lab only · commercial license not confirmed"}
        </div>
      </div>

      {progress ? (
        <>
          <div className="mt-6 flex flex-col justify-between gap-3 rounded-2xl border border-blue-200 bg-white p-5 sm:flex-row sm:items-center">
            <div>
              <p className="text-base font-semibold text-slate-950">
                Full catalog batch is {progress.latestBatch?.status ?? "starting"}
              </p>
              <p className="mt-1 font-mono text-sm text-slate-500">
                {progress.latestBatch?.batchId ?? "Waiting for batch ID"}
              </p>
            </div>
            <span className="inline-flex items-center gap-2 self-start rounded-full bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700 ring-1 ring-emerald-200 sm:self-auto">
              <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500" />
              {number(batchCounts?.running ?? 0)} processing now
            </span>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <ExtractionMetric
              label="Garment-color variants"
              value={number(batchCounts?.total ?? 0)}
              detail={`${number(progress.candidates.distinctProductColors)} distinct colors found`}
              icon={<Layers3 className="h-5 w-5" />}
            />
            <ExtractionMetric
              label="Transparent PNGs ready"
              value={number(batchCounts?.succeeded ?? 0)}
              detail={`${completedPercentLabel} of the full batch finished`}
              icon={<CheckCircle2 className="h-5 w-5" />}
            />
            <ExtractionMetric
              label="Working now"
              value={number(
                (batchCounts?.running ?? 0) + (batchCounts?.queued ?? 0),
              )}
              detail={`${number(batchCounts?.running ?? 0)} running · ${number(batchCounts?.queued ?? 0)} queued`}
              icon={<Clock3 className="h-5 w-5" />}
            />
            <ExtractionMetric
              label="Needs attention"
              value={number(
                (batchCounts?.needsReview ?? 0) + (batchCounts?.failed ?? 0),
              )}
              detail={`${number(batchCounts?.needsReview ?? 0)} review · ${number(batchCounts?.failed ?? 0)} failed`}
              icon={<AlertTriangle className="h-5 w-5" />}
            />
          </div>

          <div className="mt-5 rounded-2xl border border-blue-100 bg-white p-5">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <p className="text-base font-semibold text-slate-950">
                  Batch progress
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  {number(
                    (batchCounts?.succeeded ?? 0) +
                      (batchCounts?.needsReview ?? 0) +
                      (batchCounts?.failed ?? 0),
                  )}{" "}
                  of {number(batchCounts?.total ?? 0)} variants completed
                </p>
              </div>
              <p className="text-3xl font-semibold tabular-nums text-blue-700">
                {completedPercentLabel}
              </p>
            </div>
            <div className="mt-4 h-4 overflow-hidden rounded-full bg-blue-50 ring-1 ring-blue-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-700 via-blue-500 to-violet-500 transition-[width] duration-500"
                style={{ width: `${completedPercent}%` }}
              />
            </div>
            <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2 xl:grid-cols-4">
              <p>
                <span className="font-semibold text-slate-900">Speed:</span>{" "}
                {progress.performance.imagesPerHour === null
                  ? "Calculating"
                  : `${number(Math.round(progress.performance.imagesPerHour))} images/hour`}
              </p>
              <p>
                <span className="font-semibold text-slate-900">Average:</span>{" "}
                {progress.performance.averageLatencyMs === null
                  ? "Calculating"
                  : `${(progress.performance.averageLatencyMs / 1_000).toFixed(1)}s/image`}
              </p>
              <p>
                <span className="font-semibold text-slate-900">Remaining:</span>{" "}
                {duration(progress.performance.estimatedRemainingSeconds)}
              </p>
              <p>
                <span className="font-semibold text-slate-900">Est. AWS:</span>{" "}
                {money(progress.performance.estimatedRemainingCostUsd)}
              </p>
            </div>
          </div>

          <div className="mt-6">
            <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
              <div>
                <h3 className="text-lg font-semibold text-slate-950">
                  Random completed images
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Source and transparent result are kept side by side for visual
                  QA.
                </p>
              </div>
              <p className="text-sm font-medium text-slate-500">
                Pipeline {progress.pipelineVersion}
              </p>
            </div>
            <ExtractionSamples progress={progress} />
          </div>
        </>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-blue-200 bg-white/80 px-6 py-8 text-center">
          <Clock3 className="mx-auto h-7 w-7 text-blue-500" />
          <p className="mt-3 text-base font-semibold text-slate-900">
            Waiting for the first garment extraction batch
          </p>
          <p className="mx-auto mt-1 max-w-2xl text-sm leading-6 text-slate-500">
            The monitor is ready. Counts and generated image pairs will appear
            automatically when the backend publishes garment extraction status.
          </p>
        </div>
      )}
    </section>
  );
}
