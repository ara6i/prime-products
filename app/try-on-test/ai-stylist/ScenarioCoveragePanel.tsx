"use client";

import {
  AlertTriangle,
  CheckCircle2,
  CircleGauge,
  RefreshCw,
} from "lucide-react";
import { useMemo, useState } from "react";
import type {
  AiStylistScenarioCoverage,
  AiStylistScenarioCoverageGroup,
} from "./types";

function number(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function progressTone(percent: number): string {
  if (percent >= 100) return "from-emerald-500 to-emerald-400";
  if (percent >= 60) return "from-blue-600 to-violet-500";
  if (percent > 0) return "from-amber-500 to-orange-400";
  return "from-slate-300 to-slate-300";
}

function ProgressBar({
  label,
  value,
  detail,
}: {
  label: string;
  value: number;
  detail: string;
}) {
  const bounded = Math.max(0, Math.min(100, value));
  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-slate-900">{label}</p>
          <p className="mt-1 text-xs text-slate-500">{detail}</p>
        </div>
        <p className="text-xl font-semibold tabular-nums text-slate-950">
          {bounded.toFixed(1)}%
        </p>
      </div>
      <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200/70">
        <div
          className={`h-full rounded-full bg-gradient-to-r transition-[width] duration-500 ${progressTone(bounded)}`}
          style={{ width: `${bounded}%` }}
        />
      </div>
    </div>
  );
}

function GroupBar({ group }: { group: AiStylistScenarioCoverageGroup }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3.5 ring-1 ring-slate-100">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold text-slate-700">{group.label}</p>
        <p className="text-xs font-semibold tabular-nums text-slate-900">
          {group.readinessPercent.toFixed(1)}%
        </p>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white ring-1 ring-slate-200/70">
        <div
          className={`h-full rounded-full bg-gradient-to-r ${progressTone(group.readinessPercent)}`}
          style={{ width: `${group.readinessPercent}%` }}
        />
      </div>
      <div className="mt-2 flex items-center justify-between gap-3 text-[11px] text-slate-500">
        <span>
          {number(group.available)} / {number(group.target)} outfit slots
        </span>
        <span>
          {group.ready}/{group.total} scenarios ready
        </span>
      </div>
    </div>
  );
}

function availabilityStatus(available: number, measured: boolean) {
  if (!measured) return "waiting";
  if (available >= 20) return "ready";
  if (available > 0) return "partial";
  return "missing";
}

export function ScenarioCoveragePanel({
  coverage,
  error,
  onRefresh,
  refreshPending,
}: {
  coverage: AiStylistScenarioCoverage | null;
  error: string | null;
  onRefresh: () => void;
  refreshPending: boolean;
}) {
  const [gender, setGender] = useState("");
  const [occasion, setOccasion] = useState("");
  const [availability, setAvailability] = useState("");
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return (coverage?.scenarios ?? []).filter((scenario) => {
      if (gender && scenario.gender !== gender) return false;
      if (occasion && scenario.occasion !== occasion) return false;
      if (
        availability &&
        availabilityStatus(scenario.available, scenario.measured) !==
          availability
      ) {
        return false;
      }
      if (!normalizedQuery) return true;
      return [
        scenario.id,
        scenario.genderLabel,
        scenario.occasionLabel,
        scenario.seasonLabel,
        scenario.budgetLabel,
        scenario.budgetRange,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [availability, coverage?.scenarios, gender, occasion, query]);

  const summary = coverage?.snapshot.summary;
  const refresh = coverage?.refresh;
  const target = coverage?.definition.targetPerScenario ?? 20;
  const totalScenarios = coverage?.definition.totalScenarios ?? 264;
  const targetSlots =
    coverage?.definition.targetOutfitSlots ?? totalScenarios * target;
  const refreshRunning = refresh?.status === "running";
  const occasions = coverage?.groups.occasion ?? [];
  const topBlocker = coverage?.blockers[0];

  return (
    <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold text-slate-950">
              All {number(totalScenarios)} AI Stylist scenarios
            </h2>
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ${
                coverage?.freshness.isCurrent
                  ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                  : "bg-amber-50 text-amber-700 ring-amber-200"
              }`}
            >
              {coverage?.freshness.isCurrent
                ? "Current catalog"
                : "Refresh needed"}
            </span>
          </div>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">
            Eight occasions keep four seasons. Wedding Guest is combined into
            one All seasons row per gender and budget. Every row needs {target}
            valid outfits.
          </p>
          <p className="mt-1 text-xs text-slate-400">
            Manual only. Recheck after catalog imports settle, then use Check
            progress while an analysis is running.
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshPending}
          className="inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-wait disabled:opacity-60"
        >
          <RefreshCw
            className={`h-4 w-4 ${refreshPending ? "animate-spin" : ""}`}
          />
          {refreshRunning ? "Check progress" : "Recheck all scenarios"}
        </button>
      </div>

      {refreshRunning && (
        <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 p-4">
          <ProgressBar
            label="Current analysis run"
            value={refresh?.percent ?? 0}
            detail={`${number(refresh?.checked ?? 0)} of ${number(refresh?.total ?? totalScenarios)} scenarios checked. Click Check progress when you want an update; the last complete snapshot remains visible below.`}
          />
        </div>
      )}

      {refresh?.status === "failed" && (
        <div className="mt-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">Scenario refresh failed.</p>
            <p className="mt-1">{refresh.error}</p>
          </div>
        </div>
      )}

      {error && (
        <div className="mt-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">
              Live scenario report is unavailable.
            </p>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      )}

      {topBlocker && topBlocker.blockedScenarios > 0 && (
        <div className="mt-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div>
            <p className="font-semibold">
              Main blocker: {topBlocker.label.toLowerCase()} in{" "}
              {number(topBlocker.blockedScenarios)} of {number(totalScenarios)}{" "}
              scenarios.
            </p>
            <p className="mt-1 text-xs leading-5 text-red-700/80">
              {topBlocker.detail}
            </p>
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 p-5">
          <ProgressBar
            label="Outfit capacity readiness"
            value={summary?.outfitReadinessPercent ?? 0}
            detail={`${number(summary?.availableOutfitSlots ?? 0)} of ${number(summary?.targetOutfitSlots ?? targetSlots)} required scenario outfit slots available`}
          />
        </div>
        <div className="rounded-2xl border border-slate-200 p-5">
          <ProgressBar
            label="Fully completed scenarios"
            value={summary?.scenarioReadinessPercent ?? 0}
            detail={`${number(summary?.ready ?? 0)} of ${number(totalScenarios)} scenarios have all ${target} outfits`}
          />
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Ready",
            value: summary?.ready ?? 0,
            detail: `${target}/${target} outfits`,
            tone: "text-emerald-700 bg-emerald-50",
          },
          {
            label: "Partial",
            value: summary?.partial ?? 0,
            detail: `1–${target - 1} outfits`,
            tone: "text-amber-700 bg-amber-50",
          },
          {
            label: "Missing",
            value: summary?.missing ?? 0,
            detail: "0 outfits",
            tone: "text-red-700 bg-red-50",
          },
          {
            label: "Luna QA presets",
            value: coverage?.qaPresets.passed ?? 0,
            detail: `${number(coverage?.qaPresets.failed ?? 0)} failed QA`,
            tone: "text-violet-700 bg-violet-50",
          },
        ].map((item) => (
          <div key={item.label} className={`rounded-xl p-4 ${item.tone}`}>
            <p className="text-2xl font-semibold tabular-nums">
              {number(item.value)}
            </p>
            <p className="mt-1 text-xs font-semibold">{item.label}</p>
            <p className="mt-1 text-[11px] opacity-75">{item.detail}</p>
          </div>
        ))}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[0.7fr_1.3fr]">
        <div>
          <h3 className="text-sm font-semibold text-slate-950">
            Women and Men
          </h3>
          <div className="mt-3 space-y-3">
            {(coverage?.groups.gender ?? []).map((group) => (
              <GroupBar key={group.id} group={group} />
            ))}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold text-slate-950">
            Occasion readiness
          </h3>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {occasions.map((group) => (
              <GroupBar key={group.id} group={group} />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-7 border-t border-slate-100 pt-6">
        <div className="flex flex-col justify-between gap-3 lg:flex-row lg:items-end">
          <div>
            <h3 className="text-sm font-semibold text-slate-950">
              Every scenario
            </h3>
            <p className="mt-1 text-xs text-slate-500">
              {number(rows.length)} shown · Last complete analysis{" "}
              {coverage?.snapshot.generatedAt
                ? new Date(coverage.snapshot.generatedAt).toLocaleString()
                : "has not finished yet"}
            </p>
          </div>
          <div className="grid gap-2 sm:grid-cols-4">
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search scenarios"
              className="h-9 rounded-lg border border-slate-200 px-3 text-xs outline-none ring-blue-500 focus:ring-2"
            />
            <select
              value={gender}
              onChange={(event) => setGender(event.target.value)}
              className="h-9 rounded-lg border border-slate-200 px-3 text-xs outline-none ring-blue-500 focus:ring-2"
            >
              <option value="">All genders</option>
              <option value="female">Women</option>
              <option value="male">Men</option>
            </select>
            <select
              value={occasion}
              onChange={(event) => setOccasion(event.target.value)}
              className="h-9 rounded-lg border border-slate-200 px-3 text-xs outline-none ring-blue-500 focus:ring-2"
            >
              <option value="">All occasions</option>
              {occasions.map((group) => (
                <option key={group.id} value={group.id}>
                  {group.label}
                </option>
              ))}
            </select>
            <select
              value={availability}
              onChange={(event) => setAvailability(event.target.value)}
              className="h-9 rounded-lg border border-slate-200 px-3 text-xs outline-none ring-blue-500 focus:ring-2"
            >
              <option value="">All statuses</option>
              <option value="ready">Ready</option>
              <option value="partial">Partial</option>
              <option value="missing">Missing</option>
              <option value="waiting">Waiting</option>
            </select>
          </div>
        </div>

        <div className="mt-4 max-h-[42rem] overflow-auto rounded-xl border border-slate-200">
          <table className="min-w-full border-collapse text-left text-xs">
            <thead className="sticky top-0 z-10 bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-3 font-semibold">Scenario</th>
                <th className="px-3 py-3 font-semibold">Gender</th>
                <th className="px-3 py-3 font-semibold">Occasion</th>
                <th className="px-3 py-3 font-semibold">Season</th>
                <th className="px-3 py-3 font-semibold">Budget</th>
                <th className="px-3 py-3 text-right font-semibold">Outfits</th>
                <th className="px-3 py-3 text-right font-semibold">Gap</th>
                <th className="px-3 py-3 text-right font-semibold">Products</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((scenario) => {
                const status = availabilityStatus(
                  scenario.available,
                  scenario.measured,
                );
                const tones = {
                  ready: "bg-emerald-50 text-emerald-700",
                  partial: "bg-amber-50 text-amber-700",
                  missing: "bg-red-50 text-red-700",
                  waiting: "bg-slate-100 text-slate-500",
                };
                return (
                  <tr
                    key={scenario.id}
                    className="bg-white hover:bg-slate-50/70"
                  >
                    <td className="px-3 py-3 font-semibold text-slate-900">
                      {scenario.id}
                    </td>
                    <td className="px-3 py-3 text-slate-600">
                      {scenario.genderLabel}
                    </td>
                    <td className="px-3 py-3 text-slate-700">
                      <span className="font-medium">
                        {scenario.occasionLabel}
                      </span>
                      <span className="mt-0.5 block text-[10px] text-slate-400">
                        {scenario.occasionApi}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-slate-600">
                      {scenario.seasonLabel}
                    </td>
                    <td className="px-3 py-3 text-slate-600">
                      <span>{scenario.budgetLabel}</span>
                      <span className="mt-0.5 block text-[10px] text-slate-400">
                        {scenario.budgetRange}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right">
                      <span
                        className={`inline-flex min-w-16 justify-center rounded-full px-2.5 py-1 font-semibold tabular-nums ${tones[status]}`}
                      >
                        {scenario.measured
                          ? `${scenario.available}/${target}`
                          : "Waiting"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-slate-600">
                      {scenario.measured ? scenario.gap : "—"}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-slate-600">
                      {scenario.measured
                        ? number(scenario.eligibleProducts)
                        : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {rows.length === 0 && (
            <div className="p-10 text-center text-sm text-slate-500">
              No scenario matches these filters.
            </div>
          )}
        </div>
      </div>

      <div className="mt-5 flex items-start gap-3 rounded-xl bg-slate-50 p-4 text-xs leading-5 text-slate-600">
        {summary?.ready === coverage?.definition.totalScenarios ? (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
        ) : (
          <CircleGauge className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
        )}
        <p>
          This report measures what the current accepted catalog can assemble
          using the real backend hard rules. Luna QA presets are reported
          separately. The older 894 legacy outfits are not counted here because
          they do not carry every exact scenario dimension from this{" "}
          {number(totalScenarios)}-row plan.
        </p>
      </div>
    </section>
  );
}
