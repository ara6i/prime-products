"use client";

import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  Clock3,
  Database,
  ImageIcon,
  PackageCheck,
  RefreshCw,
  Ruler,
  ScanSearch,
  Shirt,
  Sparkles,
} from "lucide-react";
import { useMemo } from "react";
import type {
  AiStylistLabStatus,
  AiStylistBatchProgress,
  AiStylistCjMensShoesProgress,
  AiStylistGenderSegment,
  AiStylistProductPreview,
  AiStylistScenarioCoverage,
} from "./types";
import { AiStylistBatchProgressPanel } from "./components/AiStylistBatchProgressPanel";
import { useAiStylistBatchProgress } from "./hooks/useAiStylistBatchProgress";
import { useAiStylistLabStatus } from "./hooks/useAiStylistLabStatus";
import { useAiStylistScenarioCoverage } from "./hooks/useAiStylistScenarioCoverage";
import { ScenarioCoveragePanel } from "./ScenarioCoveragePanel";

function number(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function money(value: number | null, currency: string): string {
  if (value === null) return "No price";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function relativeTime(value: string | null): string {
  if (!value) return "Not synced yet";
  const elapsed = Date.now() - new Date(value).getTime();
  if (elapsed < 60_000) return "Just now";
  if (elapsed < 3_600_000) return `${Math.floor(elapsed / 60_000)}m ago`;
  if (elapsed < 86_400_000) return `${Math.floor(elapsed / 3_600_000)}h ago`;
  return `${Math.floor(elapsed / 86_400_000)}d ago`;
}

function title(value: string): string {
  return value
    .replaceAll("_", " ")
    .replaceAll("-", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function percent(value: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min(100, Math.round((value / total) * 100));
}

function StatusPill({
  active,
  children,
}: {
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
        active
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
          : "bg-amber-50 text-amber-700 ring-1 ring-amber-200"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${active ? "bg-emerald-500" : "bg-amber-500"}`}
      />
      {children}
    </span>
  );
}

function MetricCard({
  label,
  value,
  detail,
  icon,
  tone,
}: {
  label: string;
  value: number;
  detail: string;
  icon: React.ReactNode;
  tone: "blue" | "violet" | "emerald" | "amber";
}) {
  const tones = {
    blue: "bg-blue-50 text-blue-700",
    violet: "bg-violet-50 text-violet-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
  };
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
            {number(value)}
          </p>
          <p className="mt-1 text-xs text-slate-500">{detail}</p>
        </div>
        <div className={`rounded-xl p-2.5 ${tones[tone]}`}>{icon}</div>
      </div>
    </section>
  );
}

function TargetProgress({
  label,
  value,
  target,
  detail,
  tone,
}: {
  label: string;
  value: number;
  target: number;
  detail: string;
  tone: "blue" | "emerald" | "violet";
}) {
  const progress = percent(value, target);
  const tones = {
    blue: "from-blue-600 to-cyan-400",
    emerald: "from-emerald-600 to-emerald-400",
    violet: "from-violet-600 to-fuchsia-400",
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">{label}</p>
          <p className="mt-1 text-xs text-slate-500">{detail}</p>
        </div>
        <p className="text-xl font-semibold tabular-nums text-slate-950">
          {progress}%
        </p>
      </div>
      <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200/70">
        <div
          className={`h-full rounded-full bg-gradient-to-r transition-[width] duration-500 ${tones[tone]}`}
          style={{ width: `${progress}%` }}
        />
      </div>
      <p className="mt-3 text-xs font-medium tabular-nums text-slate-600">
        {number(value)} / {number(target)}
      </p>
    </div>
  );
}

function CjMensShoesProgressPanel({
  progress,
  automationActive,
}: {
  progress: AiStylistCjMensShoesProgress | null;
  automationActive: boolean;
}) {
  const audit = progress?.audit ?? null;
  const target = progress?.target ?? 3_000;

  return (
    <section className="mt-6 overflow-hidden rounded-3xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-violet-50 p-6 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-slate-950">
              CJ men&apos;s shoes · 3,000 target
            </h2>
            <span className="rounded-full bg-blue-600 px-2.5 py-1 text-[11px] font-semibold text-white">
              Live supplier progress
            </span>
          </div>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600">
            Shopify intake, Luna enrichment, and the full CJ catalog audit are
            tracked separately from Trendsi. Shopify products stay Draft; only
            products that pass the AI Stylist gate enter the curated catalog.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusPill active={automationActive}>
            Luna automation {automationActive ? "running" : "not running"}
          </StatusPill>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
            {number(progress?.activeBatches ?? 0)} active CJ batch
            {(progress?.activeBatches ?? 0) === 1 ? "" : "es"}
          </span>
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <TargetProgress
          label="Shopify → backend intake"
          value={progress?.imported ?? 0}
          target={target}
          detail={`${number(progress?.remainingToImportTarget ?? target)} products still needed`}
          tone="blue"
        />
        <TargetProgress
          label="AI Stylist ready"
          value={progress?.ragReady ?? 0}
          target={target}
          detail={`${number(progress?.remainingToReadyTarget ?? target)} still need to pass Luna and RAG`}
          tone="emerald"
        />
        <TargetProgress
          label="Qualified CJ supply"
          value={audit?.catalogQualified ?? 0}
          target={target}
          detail="Men + image + inventory + size-guide catalog gate"
          tone="violet"
        />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-8">
        {[
          ["CJ catalog", audit?.scannedProducts ?? 0],
          ["Basic qualified", audit?.catalogQualified ?? 0],
          ["New candidates", audit?.newCatalogQualified ?? 0],
          ["Images present", progress?.withImages ?? 0],
          ["Inventory ≥ 10", progress?.inventoryQualified ?? 0],
          ["Chart evidence", progress?.sizeChartDetected ?? 0],
          ["Ready for Luna", progress?.readyForLuna ?? 0],
          ["Needs review", progress?.needsReview ?? 0],
        ].map(([label, value]) => (
          <div
            key={String(label)}
            className="rounded-xl bg-white/80 px-3 py-3 ring-1 ring-slate-200/70"
          >
            <p className="text-lg font-semibold tabular-nums text-slate-950">
              {number(Number(value))}
            </p>
            <p className="mt-1 text-[10px] leading-4 text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      {audit ? (
        <div className="mt-5 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
              <div>
                <p className="text-sm font-semibold text-amber-950">
                  CJ alone is short by{" "}
                  {number(progress?.minimumOtherSupplierGap ?? 0)} products
                  before Luna.
                </p>
                <p className="mt-1 text-xs leading-5 text-amber-800/80">
                  {number(audit.catalogQualified)} of{" "}
                  {number(audit.reportedTotalRecords)} catalog products passed
                  the basic source gate. A second supplier is required to reach
                  3,000 qualified men&apos;s shoes.
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
              Live-detail sample
            </p>
            <p className="mt-2 text-xl font-semibold tabular-nums text-slate-950">
              {number(audit.verification.shippingAndVariantVerified)} /{" "}
              {number(audit.verification.requested)} passed
            </p>
            <p className="mt-1 text-xs leading-5 text-slate-500">
              Variants, inventory, size evidence, and US shipping. Only{" "}
              {number(audit.verification.reviewedProducts)} sampled product had
              CJ customer reviews.
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          The full CJ catalog audit has not been persisted yet. Live Shopify and
          Luna counts remain available above.
        </div>
      )}

      <p className="mt-4 text-[11px] text-slate-500">
        Last CJ product sync{" "}
        {relativeTime(progress?.lastProductUpdateAt ?? null)}
        {audit?.generatedAt
          ? ` · Full catalog audit ${relativeTime(audit.generatedAt)}`
          : ""}
      </p>
    </section>
  );
}

function BreakdownBars({
  title: sectionTitle,
  values,
  empty,
}: {
  title: string;
  values: Record<string, number>;
  empty: string;
}) {
  const rows = useMemo(
    () => Object.entries(values).sort((left, right) => right[1] - left[1]),
    [values],
  );
  const maximum = Math.max(...rows.map(([, count]) => count), 1);
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-sm font-semibold text-slate-950">{sectionTitle}</h2>
      <div className="mt-5 space-y-4">
        {rows.length === 0 && <p className="text-sm text-slate-500">{empty}</p>}
        {rows.map(([label, count]) => (
          <div key={label}>
            <div className="mb-1.5 flex items-center justify-between gap-3 text-xs">
              <span className="font-medium text-slate-600">{title(label)}</span>
              <span className="tabular-nums text-slate-500">
                {number(count)}
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#2154ef] to-[#7c5cff]"
                style={{ width: `${Math.max(3, (count / maximum) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CompactBreakdown({
  values,
  empty,
}: {
  values: Record<string, number>;
  empty: string;
}) {
  const rows = useMemo(
    () => Object.entries(values).sort((left, right) => right[1] - left[1]),
    [values],
  );
  const maximum = Math.max(...rows.map(([, count]) => count), 1);

  if (rows.length === 0)
    return <p className="text-xs text-slate-400">{empty}</p>;

  return (
    <div className="space-y-2.5">
      {rows.map(([label, count]) => (
        <div key={label}>
          <div className="mb-1 flex items-center justify-between gap-3 text-[11px]">
            <span className="font-medium text-slate-600">{title(label)}</span>
            <span className="tabular-nums text-slate-500">{number(count)}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#2154ef] to-[#7c5cff]"
              style={{ width: `${Math.max(3, (count / maximum) * 100)}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function GenderSegmentCard({ segment }: { segment: AiStylistGenderSegment }) {
  const isUnknown = segment.id === "unknown";

  return (
    <section
      className={`rounded-2xl border bg-white p-5 ${
        isUnknown ? "border-amber-200" : "border-slate-200"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-950">
            {segment.label}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {isUnknown
              ? "Gender not saved by the supplier import"
              : "Confirmed catalog gender"}
          </p>
        </div>
        <p
          className={`text-3xl font-semibold tabular-nums ${isUnknown ? "text-amber-700" : "text-slate-950"}`}
        >
          {number(segment.total)}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {[
          ["Inventory ≥ 10", segment.inventoryQualified],
          ["Categorized", segment.categorized],
          ["Priced", segment.priced],
        ].map(([label, value]) => (
          <div
            key={String(label)}
            className="rounded-xl bg-slate-50 px-3 py-2.5"
          >
            <p className="text-base font-semibold tabular-nums text-slate-900">
              {number(Number(value))}
            </p>
            <p className="mt-0.5 text-[10px] leading-4 text-slate-500">
              {label}
            </p>
          </div>
        ))}
      </div>

      <div className="mt-5 border-t border-slate-100 pt-4">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
          Categories
        </p>
        <CompactBreakdown
          values={segment.categories}
          empty="No categories yet."
        />
      </div>

      <div className="mt-5 border-t border-slate-100 pt-4">
        <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
          Price ranges
        </p>
        <CompactBreakdown
          values={segment.priceBands}
          empty="No qualifying prices yet."
        />
      </div>
    </section>
  );
}

function ProductRow({ product }: { product: AiStylistProductPreview }) {
  return (
    <div className="flex items-center gap-3 border-b border-slate-100 py-3 last:border-0">
      <div className="flex h-14 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
        {product.imageUrl ? (
          // Supplier URLs are dynamic and intentionally bypass Next Image's host allow-list in this lab.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.imageUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <ImageIcon className="h-4 w-4 text-slate-400" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-800">
          {product.title}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          {title(product.slot)} · {product.inventory ?? 0} units ·{" "}
          {title(product.pipelineStage)}
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm font-semibold tabular-nums text-slate-900">
          {money(product.price, product.currency)}
        </p>
        <p className="mt-1 text-[11px] text-slate-400">
          {relativeTime(product.updatedAt)}
        </p>
      </div>
    </div>
  );
}

interface AiStylistLabPageProps {
  initialStatus: AiStylistLabStatus | null;
  initialStatusError: string | null;
  initialScenarioCoverage: AiStylistScenarioCoverage | null;
  initialScenarioError: string | null;
  initialBatchProgress: AiStylistBatchProgress | null;
  initialBatchProgressError: string | null;
}

export function AiStylistLabPage({
  initialStatus,
  initialStatusError,
  initialScenarioCoverage,
  initialScenarioError,
  initialBatchProgress,
  initialBatchProgressError,
}: AiStylistLabPageProps) {
  const { status, error, loading, refresh } = useAiStylistLabStatus({
    initialStatus,
    initialError: initialStatusError,
  });
  const {
    coverage: scenarioCoverage,
    error: scenarioError,
    refreshPending: scenarioRefreshPending,
    startRefresh: refreshScenarios,
  } = useAiStylistScenarioCoverage({
    initialCoverage: initialScenarioCoverage,
    initialError: initialScenarioError,
  });
  const {
    progress: batchProgress,
    error: batchProgressError,
    loading: batchProgressLoading,
    refresh: refreshBatchProgress,
  } = useAiStylistBatchProgress(
    initialBatchProgress,
    initialBatchProgressError,
  );

  const total = status?.summary.total ?? 0;

  return (
    <main className="mx-auto w-full max-w-7xl px-6 py-8">
      <header className="overflow-hidden rounded-3xl bg-[#111827] px-7 py-7 text-white shadow-lg shadow-slate-900/10">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-blue-100 ring-1 ring-white/15">
                PrimeStyleAI Test Lab
              </span>
              <StatusPill active={Boolean(status?.sync.lastProductUpdateAt)}>
                {status?.sync.lastProductUpdateAt
                  ? "Backend connected"
                  : "Waiting for intake"}
              </StatusPill>
              <StatusPill active={status?.liveFreshness?.isCurrent ?? false}>
                {status?.liveFreshness?.isCurrent
                  ? "Saved catalog snapshot"
                  : "Read saved snapshot"}
              </StatusPill>
            </div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              AI Stylist pipeline
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
              This test-lab page is the showcase and monitor only. The backend
              processes Trendsi products, then publishes accepted records into
              the curated catalog used by the main MyAIFitting AI Stylist.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right text-xs text-slate-400">
              <p>Manual refresh only</p>
              <p className="mt-1 text-slate-300">
                {status?.liveFreshness?.refreshRunning
                  ? "Backend recount finishing…"
                  : status?.liveFreshness?.checkedAt
                    ? `Last refreshed ${relativeTime(status.liveFreshness.checkedAt)}`
                    : "Not refreshed yet"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void refresh()}
              disabled={loading}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-slate-900 transition hover:bg-blue-50 disabled:cursor-wait disabled:opacity-70"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh snapshot
            </button>
          </div>
        </div>
      </header>

      {error && (
        <div className="mt-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">
              The dashboard cannot read the backend yet.
            </p>
            <p className="mt-0.5">{error}</p>
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Trendsi intake"
          value={total}
          detail={`Last change ${relativeTime(status?.sync.lastProductUpdateAt ?? null)}`}
          icon={<Database className="h-5 w-5" />}
          tone="blue"
        />
        <MetricCard
          label="Passed inventory gate"
          value={status?.summary.inventoryQualified ?? 0}
          detail={`${number(status?.summary.excludedLowInventory ?? 0)} below ${status?.scope.minimumInventory ?? 10} units`}
          icon={<PackageCheck className="h-5 w-5" />}
          tone="violet"
        />
        <MetricCard
          label="Ready for Luna"
          value={status?.summary.readyForLuna ?? 0}
          detail="Eligible, priced, categorized, and has an image"
          icon={<Sparkles className="h-5 w-5" />}
          tone="amber"
        />
        <MetricCard
          label="Live in MyAIFitting"
          value={status?.destination.liveProducts ?? 0}
          detail={`Main AI Stylist catalog · ${relativeTime(status?.destination.lastPublishedAt ?? null)}`}
          icon={<CheckCircle2 className="h-5 w-5" />}
          tone="emerald"
        />
      </div>

      <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-base font-semibold text-slate-950">
              Pipeline progress
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Each number is calculated by the backend. This monitor never
              submits a paid Luna batch.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <StatusPill active={Boolean(status?.sync.lunaAutomationActive)}>
              Luna automation{" "}
              {status?.sync.lunaAutomationActive ? "running" : "not running"}
            </StatusPill>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
              {status?.sync.activeBatches ?? 0} active batch
              {status?.sync.activeBatches === 1 ? "" : "es"}
            </span>
          </div>
        </div>
        <div className="mt-7 grid gap-3 md:grid-cols-4 xl:grid-cols-8">
          {(status?.stages ?? []).map((stage, index, stages) => (
            <div
              key={stage.id}
              className="relative rounded-xl bg-slate-50 p-4 ring-1 ring-slate-100"
            >
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                {stage.label}
              </p>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-slate-900">
                {number(stage.count)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {percent(stage.count, total)}% of intake
              </p>
              {index < stages.length - 1 && (
                <ArrowRight className="absolute -right-2.5 top-1/2 z-10 hidden h-5 w-5 -translate-y-1/2 rounded-full bg-white text-slate-300 md:block" />
              )}
            </div>
          ))}
          {!status &&
            Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="h-28 animate-pulse rounded-xl bg-slate-100"
              />
            ))}
        </div>
      </section>

      <CjMensShoesProgressPanel
        progress={status?.supplierProgress?.cjMensShoes ?? null}
        automationActive={Boolean(status?.sync.lunaAutomationActive)}
      />

      <AiStylistBatchProgressPanel
        progress={batchProgress}
        error={batchProgressError}
        loading={batchProgressLoading}
        onRefresh={() => void refreshBatchProgress()}
      />

      <ScenarioCoveragePanel
        coverage={scenarioCoverage}
        error={scenarioError}
        onRefresh={() => void refreshScenarios()}
        refreshPending={scenarioRefreshPending}
      />

      <section className="mt-6">
        <div className="mb-4 flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-base font-semibold text-slate-950">
              Women and Men catalog split
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Every group is split again by product category and qualifying
              price range.
            </p>
          </div>
          {(status?.breakdowns.gender.unknown ?? 0) > 0 && (
            <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
              <AlertTriangle className="h-3.5 w-3.5" />
              {number(status?.breakdowns.gender.unknown ?? 0)} need gender
              classification
            </span>
          )}
        </div>
        <div className="grid gap-6 xl:grid-cols-3">
          {(status?.genderSegments ?? []).map((segment) => (
            <GenderSegmentCard key={segment.id} segment={segment} />
          ))}
          {!status &&
            Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="h-[32rem] animate-pulse rounded-2xl bg-slate-100"
              />
            ))}
        </div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <BreakdownBars
          title="Category organization"
          values={status?.breakdowns.category ?? {}}
          empty="No categorized products yet."
        />
        <BreakdownBars
          title="Price distribution"
          values={status?.breakdowns.priceBands ?? {}}
          empty="No priced products yet."
        />
        <BreakdownBars
          title="Review issues"
          values={status?.breakdowns.qualityReasons ?? {}}
          empty="No enrichment review issues recorded."
        />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-950">
                Newest backend records
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Confirms that Shopify intake is reaching the catalog.
              </p>
            </div>
            <Activity className="h-5 w-5 text-blue-600" />
          </div>
          <div className="mt-3">
            {(status?.products.recent ?? []).map((product) => (
              <ProductRow key={product.id} product={product} />
            ))}
            {status && status.products.recent.length === 0 && (
              <p className="py-8 text-center text-sm text-slate-500">
                No Trendsi records found.
              </p>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-semibold text-slate-950">
                Price-sorted catalog
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Lowest-priced products that passed image and inventory gates.
              </p>
            </div>
            <CircleDollarSign className="h-5 w-5 text-violet-600" />
          </div>
          <div className="mt-3">
            {(status?.products.lowestPrices ?? []).map((product) => (
              <ProductRow key={product.id} product={product} />
            ))}
            {status && status.products.lowestPrices.length === 0 && (
              <p className="py-8 text-center text-sm text-slate-500">
                No qualifying priced products found.
              </p>
            )}
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50/50 p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-semibold text-emerald-950">
              Main MyAIFitting AI Stylist catalog
            </h2>
            <p className="mt-1 text-xs text-emerald-800/70">
              These are the newest Trendsi records actually visible to the main
              AI Stylist gate—not test-lab-only records.
            </p>
          </div>
          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
        </div>
        <div className="mt-3 grid gap-x-6 lg:grid-cols-2">
          {(status?.products.mainLive ?? []).map((product) => (
            <ProductRow key={product.id} product={product} />
          ))}
          {status && status.products.mainLive.length === 0 && (
            <p className="py-8 text-sm text-emerald-800">
              No Trendsi product has been published to the main AI Stylist
              catalog yet.
            </p>
          )}
        </div>
      </section>

      <section className="mt-6 grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 sm:grid-cols-2 xl:grid-cols-5">
        {[
          {
            label: "Images present",
            value: status?.summary.withImages ?? 0,
            icon: ImageIcon,
          },
          {
            label: "Categorized",
            value: status?.summary.categorized ?? 0,
            icon: Shirt,
          },
          {
            label: "Chart evidence",
            value: status?.summary.sizeChartDetected ?? 0,
            icon: Ruler,
          },
          {
            label: "Needs review",
            value: status?.summary.needsReview ?? 0,
            icon: ScanSearch,
          },
          {
            label: "Enriching now",
            value: status?.summary.enriching ?? 0,
            icon: Clock3,
          },
        ].map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-3 rounded-xl bg-slate-50 px-4 py-3"
          >
            <item.icon className="h-4 w-4 text-slate-500" />
            <div>
              <p className="text-lg font-semibold tabular-nums text-slate-900">
                {number(item.value)}
              </p>
              <p className="text-xs text-slate-500">{item.label}</p>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
