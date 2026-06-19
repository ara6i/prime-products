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

export function SettingsPage({ ipLimits }: { ipLimits: IpLimitsResponse }) {
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
