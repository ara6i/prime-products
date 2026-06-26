"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { CheckCircle2, Copy, ExternalLink, KeyRound, Loader2, Terminal } from "lucide-react";
import { toast } from "sonner";
import { createCustomerApiKeyAction } from "../../actions";
import type { CustomerDashboardViewModel } from "../../types";

interface CustomerSetupCardProps {
  dashboard: CustomerDashboardViewModel;
}

export function CustomerSetupCard({ dashboard }: CustomerSetupCardProps) {
  const [pending, startTransition] = useTransition();
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const createKey = () => {
    startTransition(async () => {
      const result = await createCustomerApiKeyAction();
      if (!result.ok) {
        toast.error("Could not create API key", { description: result.error });
        return;
      }
      setApiKey(result.key ?? null);
      setMessage(result.message ?? null);
      toast.success(result.created ? "Production key created" : "Production key already exists");
    });
  };

  const copy = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  };

  if (dashboard.productionKeyReady && !apiKey) {
    return (
      <section className="rounded-[var(--radius-customer-card)] border border-customer-border bg-customer-card p-[var(--spacing-customer-card)]">
        <div className="flex flex-wrap items-start justify-between gap-[var(--spacing-customer-gap-md)]">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full bg-green-50 px-3 py-1 text-xs font-semibold text-green-700">
              <CheckCircle2 className="h-4 w-4" aria-hidden />
              Production key ready
            </p>
            <h2 className="mt-3 text-customer-xl font-semibold tracking-[-0.035em] text-text-primary">
              Your SDK workspace is ready.
            </h2>
            <p className="mt-2 max-w-[54ch] text-customer-sm leading-6 text-text-body">
              Latest key prefix: <span className="font-semibold text-text-primary">{dashboard.latestKeyPrefix ?? "Active key"}</span>. Existing keys are not shown again for security.
            </p>
          </div>
          <Link
            href="/customer/dashboard/docs#sdk-installation"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-brand-blue/20 px-4 text-sm font-semibold text-brand-blue transition-colors hover:bg-brand-blue/5"
          >
            Documentation
            <ExternalLink className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-[var(--radius-customer-card)] border border-brand-blue/15 bg-gradient-to-br from-white to-[#f7faff] p-[var(--spacing-customer-card)] shadow-[0_18px_42px_rgba(33,84,239,0.08)]">
      <div className="flex flex-wrap items-start justify-between gap-[var(--spacing-customer-gap-md)]">
        <div>
          <p className="inline-flex items-center gap-2 rounded-full bg-brand-blue/10 px-3 py-1 text-xs font-semibold text-brand-blue">
            <KeyRound className="h-4 w-4" aria-hidden />
            Final setup
          </p>
          <h2 className="mt-3 text-customer-xl font-semibold tracking-[-0.035em] text-text-primary">
            Create your production key.
          </h2>
          <p className="mt-2 max-w-[58ch] text-customer-sm leading-6 text-text-body">
            Your workspace is approved. Create a key, install the React SDK, then open the documentation for the integration steps.
          </p>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={createKey}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-brand-blue px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-blue-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <KeyRound className="h-4 w-4" aria-hidden />}
          {pending ? "Creating" : "Create key"}
        </button>
      </div>

      <div className="mt-[var(--spacing-customer-gap-md)] grid gap-[var(--spacing-customer-gap-sm)] lg:grid-cols-[1fr_auto]">
        <div className="rounded-2xl border border-customer-border bg-white p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
            <Terminal className="h-4 w-4 text-brand-blue" aria-hidden />
            Install SDK
          </div>
          <code className="mt-3 block rounded-xl bg-[#101827] px-4 py-3 text-sm text-[#dbeafe]">
            npm install @primestyleai/tryon
          </code>
        </div>
        <Link
          href="/customer/dashboard/docs#sdk-installation"
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-brand-blue/20 bg-white px-5 text-sm font-semibold text-brand-blue transition-colors hover:bg-brand-blue/5"
        >
          Open docs
          <ExternalLink className="h-4 w-4" aria-hidden />
        </Link>
      </div>

      {apiKey ? (
        <div className="mt-[var(--spacing-customer-gap-md)] rounded-2xl border border-green-200 bg-green-50 p-4">
          <p className="text-sm font-semibold text-green-800">Copy this key now. It will not be shown again.</p>
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl bg-white p-3">
            <code className="min-w-0 flex-1 break-all text-sm text-text-primary">{apiKey}</code>
            <button
              type="button"
              onClick={() => copy(apiKey, "API key")}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-green-200 px-3 text-sm font-semibold text-green-700"
            >
              <Copy className="h-4 w-4" aria-hidden />
              Copy
            </button>
          </div>
        </div>
      ) : message ? (
        <p className="mt-3 text-sm text-text-body">{message}</p>
      ) : null}
    </section>
  );
}
