"use client";

import { useState } from "react";
import { LockKeyhole, ShieldCheck, X } from "lucide-react";
import { IpLimitsPage, type IpLimitsResponse } from "../monitoring/ip-limits/IpLimitsPage";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/app/shared/components/ui/dialog";

interface StyleMatchSettingsResponse {
  settings: {
    enabled: boolean;
    updatedAt: string | null;
    updatedBy: string | null;
  };
  loadError?: string | null;
}

function formatDate(value: string | null): string {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Never";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function StyleMatchSettingsCard({
  initialSettings,
  loadError,
}: {
  initialSettings: StyleMatchSettingsResponse["settings"];
  loadError?: string | null;
}) {
  const [settings, setSettings] = useState(initialSettings);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingEnabled, setPendingEnabled] = useState<boolean | null>(null);

  function requestToggle() {
    if (saving) return;
    setPendingEnabled(!settings.enabled);
    setConfirmOpen(true);
  }

  async function confirmToggleStyleMatch() {
    if (saving || pendingEnabled == null) return;

    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/style-match/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: pendingEnabled }),
      });
      const payload = await response.json().catch(() => null) as StyleMatchSettingsResponse | { message?: string } | null;
      if (!response.ok || !payload || !("settings" in payload)) {
        throw new Error(payload && "message" in payload ? payload.message : "Could not update Style RAG settings");
      }
      setSettings(payload.settings);
      setConfirmOpen(false);
      setPendingEnabled(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update Style RAG settings");
    } finally {
      setSaving(false);
    }
  }

  const confirmationTitle = pendingEnabled ? "Enable Style RAG globally?" : "Disable Style RAG globally?";
  const confirmationCopy = pendingEnabled
    ? "This allows SDK outfit matching for stores that also have their own Style RAG toggle enabled."
    : "This blocks SDK outfit matching for every store, even if a store-level Style RAG toggle is enabled.";

  return (
    <>
      <section id="style-rag" className="rounded-[28px] border border-customer-border bg-customer-card/80 p-4 shadow-[0_18px_70px_rgba(36,58,94,0.08)] lg:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-blue/15 bg-customer-soft px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-blue">
              Style RAG
            </div>
            <h2 className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-text-primary">
              Outfit matching master switch
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-text-body">
              Global off blocks the SDK style-match endpoint for every merchant. Global on still requires each store&apos;s own Style RAG toggle to be enabled.
            </p>
          </div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${settings.enabled ? "bg-customer-success-bg text-customer-success-text" : "bg-customer-soft text-customer-muted"}`}>
            {settings.enabled ? "On" : "Off"}
          </span>
        </div>

        {loadError ? (
          <p className="mt-4 rounded-2xl border border-customer-danger-text/20 bg-customer-danger-bg px-4 py-3 text-sm font-semibold text-customer-danger-text">
            {loadError}
          </p>
        ) : null}

        <div className="mt-5 grid gap-3 rounded-2xl border border-customer-border bg-customer-soft p-4 text-sm text-text-body md:grid-cols-2">
          <div>
            <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-customer-muted">Last updated</span>
            <strong className="mt-1 block text-text-primary">{formatDate(settings.updatedAt)}</strong>
          </div>
          <div>
            <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-customer-muted">Updated by</span>
            <strong className="mt-1 block text-text-primary">{settings.updatedBy || "Not available"}</strong>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={requestToggle}
            disabled={saving || Boolean(loadError)}
            className={`inline-flex h-11 min-w-40 items-center justify-center rounded-2xl px-5 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 ${settings.enabled ? "bg-slate-900" : "bg-brand-blue"}`}
          >
            {saving ? "Saving..." : settings.enabled ? "Turn off" : "Turn on"}
          </button>
          {error ? <p className="text-sm font-semibold text-customer-danger-text">{error}</p> : null}
        </div>
      </section>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent
          showCloseButton={false}
          className="w-[calc(100vw-2rem)] max-w-lg overflow-hidden rounded-[28px] border border-brand-blue/20 bg-customer-card p-0 shadow-[0_30px_100px_rgba(15,23,42,0.30)] duration-300 ease-out data-[state=closed]:slide-out-to-bottom-2 data-[state=open]:slide-in-from-bottom-3"
        >
          <div className="flex items-start justify-between gap-4 border-b border-customer-border bg-customer-soft px-6 py-5">
            <div className="flex gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-blue text-white">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold leading-6 text-text-primary">{confirmationTitle}</DialogTitle>
                <DialogDescription className="mt-1 text-sm leading-5 text-text-body">
                  {confirmationCopy}
                </DialogDescription>
              </div>
            </div>
            <DialogClose asChild>
              <button
                type="button"
                className="rounded-full p-2 text-text-body transition-colors hover:bg-customer-card"
                aria-label="Close Style RAG confirmation"
              >
                <X className="h-5 w-5" />
              </button>
            </DialogClose>
          </div>

          <div className="flex flex-wrap justify-end gap-3 px-6 py-5">
            <DialogClose asChild>
              <button
                type="button"
                className="inline-flex h-11 items-center justify-center rounded-2xl border border-customer-border px-4 text-sm font-semibold text-text-body transition-colors hover:bg-customer-soft"
              >
                Cancel
              </button>
            </DialogClose>
            <button
              type="button"
              onClick={() => void confirmToggleStyleMatch()}
              disabled={saving}
              className={`inline-flex h-11 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-semibold text-white disabled:cursor-wait disabled:opacity-60 ${pendingEnabled ? "bg-brand-blue" : "bg-slate-900"}`}
            >
              <ShieldCheck className="h-4 w-4" />
              {saving ? "Saving..." : pendingEnabled ? "Enable Style RAG" : "Disable Style RAG"}
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function SettingsPage({
  ipLimits,
  styleMatch,
}: {
  ipLimits: IpLimitsResponse;
  styleMatch: StyleMatchSettingsResponse;
}) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isUnlockConfirmOpen, setIsUnlockConfirmOpen] = useState(false);

  return (
    <section className="space-y-7">
      <section className="relative overflow-hidden rounded-[32px] border border-brand-blue/15 bg-[radial-gradient(circle_at_top_left,rgba(44,123,255,0.18),transparent_38%),linear-gradient(135deg,var(--customer-surface-card)_0%,var(--customer-surface-blue)_48%,var(--customer-surface-soft)_100%)] p-6 shadow-[0_24px_80px_rgba(20,36,70,0.10)] lg:p-8">
        <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full border border-brand-blue/15 bg-customer-card/40" aria-hidden />
        <div className="absolute bottom-6 right-8 hidden h-20 w-20 rotate-12 rounded-[28px] border border-customer-success-text/25 bg-customer-success-bg/70 lg:block" aria-hidden />

        <div className="relative grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-blue/15 bg-customer-card/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-blue">
              <LockKeyhole className="h-3.5 w-3.5" />
              Admin settings
            </div>
            <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-[-0.04em] text-text-primary lg:text-5xl">
              Sensitive controls are locked.
            </h1>
          </div>

          <div className="rounded-[24px] border border-customer-border bg-customer-card/80 p-4 shadow-[0_16px_50px_rgba(36,58,94,0.08)] backdrop-blur">
            <p className="text-sm font-semibold text-text-primary">
              {isUnlocked ? "Sensitive controls enabled" : "Unlock required"}
            </p>
            <button
              type="button"
              onClick={() => setIsUnlockConfirmOpen(true)}
              disabled={isUnlocked}
              className="mt-3 inline-flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-brand-blue px-5 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(44,123,255,0.22)] transition-transform hover:-translate-y-0.5 disabled:cursor-default disabled:bg-customer-success-text disabled:hover:translate-y-0"
            >
              <ShieldCheck className="h-4 w-4" />
              {isUnlocked ? "Unlocked" : "Unlock sensitive controls"}
            </button>
          </div>
        </div>
      </section>

      <div className={`space-y-7 transition ${isUnlocked ? "" : "pointer-events-none select-none opacity-45 blur-[1px]"}`} aria-disabled={!isUnlocked}>
        <StyleMatchSettingsCard initialSettings={styleMatch.settings} loadError={styleMatch.loadError} />

        <section id="ip-limits" className="rounded-[28px] border border-customer-border bg-customer-card/80 p-4 shadow-[0_18px_70px_rgba(36,58,94,0.08)] lg:p-6">
          <IpLimitsPage initialData={ipLimits} surface="settings" />
        </section>
      </div>

      <Dialog open={isUnlockConfirmOpen} onOpenChange={setIsUnlockConfirmOpen}>
        <DialogContent
          showCloseButton={false}
          className="w-[calc(100vw-2rem)] max-w-lg overflow-hidden rounded-[28px] border border-brand-blue/20 bg-customer-card p-0 shadow-[0_30px_100px_rgba(15,23,42,0.30)] duration-300 ease-out data-[state=closed]:slide-out-to-bottom-2 data-[state=open]:slide-in-from-bottom-3"
        >
            <div className="flex items-start justify-between gap-4 border-b border-customer-border bg-customer-soft px-6 py-5">
              <div className="flex gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-brand-blue text-white">
                  <LockKeyhole className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-semibold leading-6 text-text-primary">Unlock sensitive controls?</DialogTitle>
                  <DialogDescription className="mt-1 text-sm leading-5 text-text-body">
                    If you continue, this page will allow changes that can touch sensitive admin data.
                  </DialogDescription>
                </div>
              </div>
              <DialogClose asChild>
                <button
                  type="button"
                  className="rounded-full p-2 text-text-body transition-colors hover:bg-customer-card"
                  aria-label="Close unlock confirmation"
                >
                  <X className="h-5 w-5" />
                </button>
              </DialogClose>
            </div>

            <div className="flex flex-wrap justify-end gap-3 px-6 py-5">
              <DialogClose asChild>
                <button
                  type="button"
                  className="inline-flex h-11 items-center justify-center rounded-2xl border border-customer-border px-4 text-sm font-semibold text-text-body transition-colors hover:bg-customer-soft"
                >
                  Keep locked
                </button>
              </DialogClose>
              <button
                type="button"
                onClick={() => {
                  setIsUnlocked(true);
                  setIsUnlockConfirmOpen(false);
                }}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl bg-brand-blue px-4 text-sm font-semibold text-white"
              >
                <ShieldCheck className="h-4 w-4" />
                Enable controls
              </button>
            </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
