"use client";

import { useState } from "react";
import { AlertTriangle, Database, LockKeyhole, RotateCcw, ShieldCheck, X } from "lucide-react";
import { toast } from "sonner";
import { IpLimitsPage, type IpLimitsResponse } from "../monitoring/ip-limits/IpLimitsPage";

const RESET_PHRASE = "RESET OVERVIEW DATA";

type ResetResult = {
  deletedShopifyEvents?: number;
  updatedShopifyShops?: number;
  database?: string | null;
  message?: string;
};

async function readJson(response: Response): Promise<ResetResult> {
  const text = await response.text();
  try {
    return text ? (JSON.parse(text) as ResetResult) : {};
  } catch {
    return { message: text };
  }
}

export function SettingsPage({ ipLimits }: { ipLimits: IpLimitsResponse }) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [resetResult, setResetResult] = useState<ResetResult | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const canReset = confirmation.trim() === RESET_PHRASE;

  const closeConfirm = () => {
    if (isResetting) return;
    setIsConfirmOpen(false);
    setConfirmation("");
  };

  const resetOverviewData = () => {
    if (!canReset) return;

    setIsResetting(true);
    void (async () => {
      try {
        const response = await fetch("/api/admin/analytics/shopify-dashboard/reset", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ confirmation: RESET_PHRASE }),
        });
        const result = await readJson(response);
        if (!response.ok) throw new Error(result.message || "Overview reset failed");

        setResetResult(result);
        setIsConfirmOpen(false);
        setConfirmation("");
        toast.success("Overview analytics reset completed");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Overview reset failed";
        toast.error(message);
        setResetResult({ message });
      } finally {
        setIsResetting(false);
      }
    })();
  };

  return (
    <section className="space-y-7">
      <section className="relative overflow-hidden rounded-[32px] border border-brand-blue/15 bg-[radial-gradient(circle_at_top_left,rgba(44,123,255,0.18),transparent_38%),linear-gradient(135deg,#FFFFFF_0%,#F4F8FF_48%,#EEF5F2_100%)] p-6 shadow-[0_24px_80px_rgba(20,36,70,0.10)] lg:p-8">
        <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full border border-brand-blue/15 bg-white/40" aria-hidden />
        <div className="absolute bottom-6 right-8 hidden h-20 w-20 rotate-12 rounded-[28px] border border-emerald-200/70 bg-emerald-50/80 lg:block" aria-hidden />

        <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-blue/15 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-blue">
              <LockKeyhole className="h-3.5 w-3.5" />
              Admin settings
            </div>
            <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-[-0.04em] text-text-primary lg:text-5xl">
              Sensitive controls in one place.
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-text-body lg:text-base">
              Manage abuse protection and staging dashboard cleanup with explicit confirmations before anything sensitive changes.
            </p>
          </div>

          <div className="grid gap-3 rounded-[24px] border border-white/80 bg-white/75 p-4 shadow-[0_16px_50px_rgba(36,58,94,0.08)] backdrop-blur">
            <a
              href="#ip-limits"
              className="flex items-center gap-3 rounded-2xl border border-customer-border bg-customer-soft px-4 py-3 text-sm font-semibold text-text-primary transition-colors hover:border-brand-blue/40"
            >
              <ShieldCheck className="h-5 w-5 text-brand-blue" />
              IP limit rules
            </a>
            <a
              href="#danger-zone"
              className="flex items-center gap-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800 transition-colors hover:border-red-300"
            >
              <AlertTriangle className="h-5 w-5" />
              Reset overview data
            </a>
          </div>
        </div>
      </section>

      <section
        id="danger-zone"
        className="overflow-hidden rounded-[28px] border border-red-200 bg-[linear-gradient(135deg,#FFF7F7_0%,#FFFFFF_58%)] shadow-[0_18px_60px_rgba(153,27,27,0.08)]"
      >
        <div className="grid gap-5 p-5 lg:grid-cols-[1fr_auto] lg:items-center lg:p-6">
          <div className="flex gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-700">
              <Database className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-red-700">Danger zone</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-[-0.03em] text-text-primary">Reset overview data</h2>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-text-body">
                Clears Shopify analytics events and resets Shopify try-on counters/last-used markers for the connected test or explicitly enabled database.
                It does not delete stores, billing, subscriptions, installs, users, or profiles.
              </p>
              {resetResult ? (
                <p className="mt-3 rounded-2xl border border-red-100 bg-white px-4 py-3 text-sm font-semibold text-text-body">
                  {resetResult.message
                    ? resetResult.message
                    : `Deleted ${resetResult.deletedShopifyEvents ?? 0} event(s), updated ${resetResult.updatedShopifyShops ?? 0} shop counter(s).`}
                </p>
              ) : null}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsConfirmOpen(true)}
            className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-red-700 px-5 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(185,28,28,0.24)] transition-transform hover:-translate-y-0.5"
          >
            <RotateCcw className="h-4 w-4" />
            Reset data
          </button>
        </div>
      </section>

      <section id="ip-limits" className="rounded-[28px] border border-customer-border bg-white/80 p-4 shadow-[0_18px_70px_rgba(36,58,94,0.08)] lg:p-6">
        <IpLimitsPage initialData={ipLimits} surface="settings" />
      </section>

      {isConfirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">
          <section className="w-full max-w-lg overflow-hidden rounded-[28px] border border-red-100 bg-white shadow-[0_30px_100px_rgba(15,23,42,0.30)]">
            <div className="flex items-start justify-between gap-4 border-b border-red-100 bg-red-50 px-6 py-5">
              <div className="flex gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-red-100 text-red-700">
                  <AlertTriangle className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-text-primary">Confirm overview reset</h3>
                  <p className="mt-1 text-sm leading-5 text-text-body">This action clears analytics history for the overview dashboard.</p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeConfirm}
                disabled={isResetting}
                className="rounded-full p-2 text-text-body hover:bg-white disabled:opacity-50"
                aria-label="Close confirmation"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 px-6 py-5">
              <div className="rounded-2xl border border-red-100 bg-red-50/70 px-4 py-3 text-sm leading-6 text-red-900">
                Type <span className="font-bold">{RESET_PHRASE}</span> to enable the reset button.
              </div>
              <input
                value={confirmation}
                onChange={(event) => setConfirmation(event.target.value)}
                placeholder={RESET_PHRASE}
                className="w-full rounded-2xl border border-customer-border bg-white px-4 py-3 text-sm font-semibold text-text-primary outline-none transition-colors focus:border-red-400"
                autoFocus
              />
              <div className="flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={closeConfirm}
                  disabled={isResetting}
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-customer-border px-4 text-sm font-semibold text-text-body disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={resetOverviewData}
                  disabled={!canReset || isResetting}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-red-700 px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <RotateCcw className="h-4 w-4" />
                  {isResetting ? "Resetting..." : "Confirm reset"}
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}
