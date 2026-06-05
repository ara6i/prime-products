import { Button } from "@/app/shared/components/ui/button";
import { CapacityStatCard } from "./CapacityStatCard";
import { formatMs, formatNumber, formatRps } from "../lib/formatters";
import type { CapacityLiveStage, CapacityResultSample, CapacityRunSnapshot } from "../types";

interface RunSummaryProps {
  snapshot: CapacityRunSnapshot | null;
  isRunning: boolean;
  isCancelling: boolean;
  onCancel: () => void;
}

export function RunSummary({ snapshot, isRunning, isCancelling, onCancel }: RunSummaryProps) {
  if (!snapshot) {
    return (
      <section className="rounded-3xl border border-dashed border-gray-300 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold text-text-primary">No run yet</p>
        <p className="mt-2 text-sm text-text-secondary">
          Choose a target and press run. Results, timing, and failures will appear here in real time.
        </p>
      </section>
    );
  }

  const progress = snapshot.total > 0 ? Math.round((snapshot.completed / snapshot.total) * 100) : 0;

  return (
    <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-blue">Current run</p>
          <h2 className="mt-1 text-xl font-semibold text-text-primary">{snapshot.targetLabel}</h2>
          <p className="mt-1 text-sm text-text-secondary">{snapshot.endpoint}</p>
          <p className="mt-1 text-xs font-semibold text-brand-blue">
            Route safety: {snapshot.routeSafety}
            {snapshot.apiPrefix ? ` · ${snapshot.targetBaseUrl}${snapshot.apiPrefix}` : ""}
          </p>
          {snapshot.estimate.estimatedTryOnCalls > 0 && (
            <p className="mt-1 text-xs font-semibold text-brand-blue">Try-on model: {snapshot.config.tryOnModel}</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="w-fit rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-brand-blue">
            {snapshot.status}
          </span>
          {isRunning && (
            <Button
              type="button"
              variant="outline-dark"
              size="sm"
              disabled={isCancelling}
              onClick={onCancel}
              className="px-4 text-xs"
            >
              {isCancelling ? "Cancelling..." : "Cancel run"}
            </Button>
          )}
        </div>
      </div>

      <div className="mt-5 h-3 overflow-hidden rounded-full bg-gray-100">
        <div className="h-full rounded-full bg-brand-blue transition-all" style={{ width: `${progress}%` }} />
      </div>
      <div className="mt-2 flex justify-between text-xs text-text-secondary">
        <span>{formatNumber(snapshot.completed)} of {formatNumber(snapshot.total)} requests</span>
        <span>{progress}%</span>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <CapacityStatCard label="Throughput" value={formatRps(snapshot.rps)} helper="Average from start" tone="blue" />
        <CapacityStatCard label="Success" value={formatNumber(snapshot.success)} helper="Completed journeys" tone="green" />
        <CapacityStatCard label="Failed" value={formatNumber(snapshot.failed)} helper={`${formatNumber(snapshot.timedOut)} timed out`} tone={snapshot.failed > 0 ? "red" : "neutral"} />
        <CapacityStatCard label="Elapsed" value={formatMs(snapshot.elapsedMs)} helper={`${snapshot.inFlight} in flight`} />
      </div>

      {(snapshot.estimate.estimatedTryOnCalls > 0 || snapshot.estimate.estimatedSizingCalls > 0) && (
        <div className="mt-6 grid grid-cols-1 gap-3 lg:grid-cols-4">
          <CapacityStatCard
            label="Image try-ons"
            value={formatNumber(snapshot.estimate.estimatedTryOnCalls)}
            helper={`${snapshot.estimate.tryOnQuotaPercent}% of daily ${formatNumber(snapshot.estimate.tryOnRpdLimit)} cap`}
            tone="blue"
          />
          <CapacityStatCard label="AI sizing calls" value={formatNumber(snapshot.estimate.estimatedSizingCalls)} helper="Age / vision sizing journey" />
          <CapacityStatCard
            label="Try-on tokens"
            value={formatNumber(snapshot.estimate.estimatedTryOnTokens)}
            helper={`${formatNumber(snapshot.estimate.tokensPerTryOn)} token estimate`}
          />
          <CapacityStatCard
            label="Model ceiling"
            value={`${formatNumber(snapshot.estimate.theoreticalTryOnPerMinute)}/min`}
            helper={`Safe target ${formatNumber(snapshot.estimate.safeTryOnPerMinute)}/min`}
            tone="green"
          />
        </div>
      )}

      <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-6">
        <MiniLatency label="Avg" value={snapshot.latency.avgMs} />
        <MiniLatency label="P50" value={snapshot.latency.p50Ms} />
        <MiniLatency label="P95" value={snapshot.latency.p95Ms} />
        <MiniLatency label="P99" value={snapshot.latency.p99Ms} />
        <MiniLatency label="Min" value={snapshot.latency.minMs} />
        <MiniLatency label="Max" value={snapshot.latency.maxMs} />
      </div>

      <LiveStageProgress snapshot={snapshot} />

      <ResultSamples samples={snapshot.resultSamples} />

      <StatusBreakdown counts={snapshot.statusCounts} errors={snapshot.errors} />
    </section>
  );
}

interface MiniLatencyProps {
  label: string;
  value: number;
}

function MiniLatency({ label, value }: MiniLatencyProps) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3">
      <p className="text-xs font-medium text-text-secondary">{label}</p>
      <p className="mt-1 text-sm font-semibold text-text-primary">{formatMs(value)}</p>
    </div>
  );
}

interface LiveStageProgressProps {
  snapshot: CapacityRunSnapshot;
}

function LiveStageProgress({ snapshot }: LiveStageProgressProps) {
  const entries = Object.entries(snapshot.stageCounts);
  const isRealSdkRun = snapshot.estimate.estimatedTryOnCalls > 0 || snapshot.estimate.estimatedSizingCalls > 0;
  if (!isRealSdkRun) return null;

  return (
    <div className="mt-6 rounded-2xl border border-gray-200 bg-gray-50 p-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-text-primary">Live stage progress</p>
          <p className="mt-1 text-xs leading-5 text-text-secondary">
            Shows where each virtual shopper is right now, including backend try-on stages when the test backend exposes debug timing.
          </p>
        </div>
        <p className="text-xs font-semibold text-brand-blue">
          {formatNumber(snapshot.liveStages.length)} active journeys
        </p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {entries.length > 0 ? entries.map(([stage, count]) => (
          <span key={stage} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-text-secondary shadow-sm">
            {count} in {prettifyStage(stage)}
          </span>
        )) : (
          <span className="text-xs text-text-secondary">
            Waiting for the first stage update. If this stays empty during a real run, the lab runner itself is blocked before starting requests.
          </span>
        )}
      </div>

      {snapshot.liveStages.length > 0 && (
        <div className="mt-4 overflow-hidden rounded-2xl border border-gray-200 bg-white">
          <div className="grid grid-cols-[80px_1fr_1fr_92px] gap-3 border-b border-gray-100 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-text-secondary">
            <span>User</span>
            <span>SDK stage</span>
            <span>Backend stage</span>
            <span>Elapsed</span>
          </div>
          <div className="divide-y divide-gray-100">
            {snapshot.liveStages.slice(0, 12).map((stage) => (
              <LiveStageRow key={stage.requestIndex} stage={stage} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface LiveStageRowProps {
  stage: CapacityLiveStage;
}

function LiveStageRow({ stage }: LiveStageRowProps) {
  return (
    <div className="grid grid-cols-[80px_1fr_1fr_92px] gap-3 px-4 py-3 text-xs">
      <span className="font-semibold text-text-primary">#{stage.requestIndex + 1}</span>
      <div className="min-w-0">
        <p className="truncate font-semibold text-text-primary">{prettifyStage(stage.stage)}</p>
        <p className="mt-1 truncate text-text-secondary">
          {stage.recommendedSize ? `size=${stage.recommendedSize}` : stage.detail ?? stage.status}
        </p>
      </div>
      <div className="min-w-0">
        <p className="truncate font-semibold text-text-primary">{stage.backendStage ? prettifyStage(stage.backendStage) : "not inside try-on job yet"}</p>
        <p className="mt-1 truncate text-text-secondary">
          {stage.jobId ? `job=${stage.jobId}` : stage.pollCount > 0 ? `${stage.pollCount} polls` : "waiting"}
        </p>
      </div>
      <span className="font-semibold text-brand-blue">{formatMs(stage.elapsedMs)}</span>
    </div>
  );
}

function prettifyStage(stage: string): string {
  return stage
    .replace(/\./g, " ")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

interface ResultSamplesProps {
  samples: CapacityResultSample[];
}

function ResultSamples({ samples }: ResultSamplesProps) {
  if (!samples.length) {
    return (
      <div className="mt-6 rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4">
        <p className="text-sm font-semibold text-text-primary">Result samples</p>
        <p className="mt-2 text-xs leading-5 text-text-secondary">
          Waiting for the first completed real SDK journey. When one finishes, this will show the suggested size, try-on job id,
          generated image, and stage timings.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/40 p-4">
      <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-text-primary">Result samples</p>
          <p className="mt-1 text-xs text-text-secondary">
            Last {formatNumber(samples.length)} real SDK journeys with size, try-on proof, or failure-stage evidence.
          </p>
        </div>
        <p className="text-xs font-medium text-brand-blue">Showing newest samples</p>
      </div>

      <div className="mt-4 space-y-4">
        {[...samples].reverse().map((sample) => (
          <article key={sample.id} className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-sm">
            <div className="grid grid-cols-1">
              <div className="flex min-h-80 items-center justify-center bg-gray-100 p-3 sm:min-h-[420px]">
                {sample.imageUrl ? (
                  <a href={sample.imageUrl} target="_blank" rel="noreferrer" className="block h-full w-full">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={sample.imageUrl}
                      alt="Generated PrimeStyleAI try-on result"
                      className="mx-auto max-h-[420px] w-full rounded-xl object-contain"
                    />
                  </a>
                ) : (
                  <div className="px-4 text-center text-xs text-text-secondary">
                    No try-on image for this sample yet.
                  </div>
                )}
              </div>

              <div className="p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-brand-blue">
                    HTTP {sample.status}
                  </span>
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-text-secondary">
                    {formatMs(sample.latencyMs)}
                  </span>
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-text-secondary">
                    {new Date(sample.capturedAt).toLocaleTimeString()}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
                  <SampleLine label="Suggested size" value={sample.recommendedSize ?? "n/a"} />
                  <SampleLine label="Model used" value={sample.tryOnModel ?? "n/a"} />
                  <SampleLine label="Try-on job" value={sample.jobId ?? "n/a"} />
                </div>
                <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
                  <SampleLine label="Route safety" value={sample.routeSafety} />
                  <SampleLine label="Route prefix" value={sample.apiPrefix ? `${sample.targetBaseUrl}${sample.apiPrefix}` : sample.targetBaseUrl} />
                </div>

                {sample.message && (
                  <p className="mt-3 rounded-xl bg-gray-50 px-3 py-2 text-xs text-text-secondary">
                    {sample.message}
                  </p>
                )}

                {sample.imageUrl && (
                  <a
                    href={sample.imageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-flex text-xs font-semibold text-brand-blue underline-offset-4 hover:underline"
                  >
                    Open generated image
                  </a>
                )}
              </div>
            </div>

            <div className="border-t border-gray-100 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-text-secondary">Stage timings</p>
              <div className="mt-3 grid grid-cols-1 gap-2 lg:grid-cols-2">
                {sample.stages.map((stage, index) => (
                  <div key={`${sample.id}-${stage.name}-${index}`} className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
                    <div className="flex items-center justify-between gap-2">
                      <p className="min-w-0 break-words text-xs font-semibold text-text-primary">{stage.name}</p>
                      <span className={`shrink-0 text-xs font-semibold ${stage.ok ? "text-emerald-600" : "text-red-600"}`}>
                        {stage.status}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-text-secondary">{formatMs(stage.latencyMs)}</p>
                    {stage.detail && <p className="mt-1 break-words text-xs leading-5 text-text-secondary">{stage.detail}</p>}
                  </div>
                ))}
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

interface SampleLineProps {
  label: string;
  value: string;
}

function SampleLine({ label, value }: SampleLineProps) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
      <p className="text-xs font-medium uppercase tracking-[0.12em] text-text-secondary">{label}</p>
      <p className="mt-1 break-words text-sm font-semibold text-text-primary">{value}</p>
    </div>
  );
}

interface StatusBreakdownProps {
  counts: Record<string, number>;
  errors: string[];
}

function StatusBreakdown({ counts, errors }: StatusBreakdownProps) {
  const entries = Object.entries(counts);

  return (
    <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
        <p className="text-sm font-semibold text-text-primary">Status codes</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {entries.length > 0 ? entries.map(([code, count]) => (
            <span key={code} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-text-secondary shadow-sm">
              {code}: {formatNumber(count)}
            </span>
          )) : <span className="text-xs text-text-secondary">Waiting for first response.</span>}
        </div>
      </div>
      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4">
        <p className="text-sm font-semibold text-text-primary">Error samples</p>
        <div className="mt-3 space-y-2">
          {errors.length > 0 ? errors.map((error) => (
            <p key={error} className="rounded-xl bg-white px-3 py-2 text-xs text-red-600 shadow-sm">{error}</p>
          )) : <p className="text-xs text-text-secondary">No errors captured.</p>}
        </div>
      </div>
    </div>
  );
}
