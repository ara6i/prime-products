"use client";

import { useMemo, useState, useTransition } from "react";
import { CheckCircle2, Copy, KeyRound, Loader2, Minus, Plus, Save, ShieldCheck, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/shared/components/ui";
import { createCustomerApiKeyAction } from "../../actions";
import { updateCustomerIpLimitAction } from "../../settings/actions";
import type { CustomerIpLimitSettings, CustomerSettingsViewModel } from "../../types/settings";

interface CustomerSettingsWorkspaceProps {
  settings: CustomerSettingsViewModel;
}

interface KeyState {
  ready: boolean;
  name: string | null;
  keyPrefix: string | null;
  allowedDomains: string[];
  oneTimeKey: string | null;
}

export function CustomerSettingsWorkspace({ settings }: CustomerSettingsWorkspaceProps) {
  const [ipLimit, setIpLimit] = useState(settings.ipLimit);
  const [keyState, setKeyState] = useState<KeyState>({
    ready: settings.apiKey.ready,
    name: settings.apiKey.name,
    keyPrefix: settings.apiKey.keyPrefix,
    allowedDomains: settings.apiKey.allowedDomains,
    oneTimeKey: null,
  });

  return (
    <Tabs defaultValue="settings" className="gap-4">
      <TabsList className="inline-flex w-full max-w-[520px] items-center gap-1 rounded-full border border-customer-border bg-customer-card p-1.5 shadow-sm">
        <SettingsTab value="settings" title="Settings" />
        <SettingsTab value="create-key" title="Create key" />
      </TabsList>

      <TabsContent value="settings" className="mt-0 space-y-4">
        <IpLimitPanel
          apiKeyReady={keyState.ready}
          ipLimit={ipLimit}
          onIpLimitChange={setIpLimit}
        />
        <RecentIpLimitRecords ipLimit={ipLimit} />
      </TabsContent>

      <TabsContent value="create-key" className="mt-0">
        <CreateKeyPanel
          settings={settings}
          keyState={keyState}
          onKeyStateChange={setKeyState}
        />
      </TabsContent>
    </Tabs>
  );
}

function SettingsTab({ value, title }: { value: string; title: string }) {
  return (
    <TabsTrigger
      value={value}
      className="min-h-10 flex-1 rounded-full border-0 px-5 py-2.5 text-center text-sm font-semibold text-text-body data-[state=active]:bg-brand-blue data-[state=active]:text-white"
    >
      {title}
    </TabsTrigger>
  );
}

function IpLimitPanel({
  apiKeyReady,
  ipLimit,
  onIpLimitChange,
}: {
  apiKeyReady: boolean;
  ipLimit: CustomerIpLimitSettings;
  onIpLimitChange: (settings: CustomerIpLimitSettings) => void;
}) {
  const [productEnabled, setProductEnabled] = useState(ipLimit.product.enabled);
  const [productMaxAttempts, setProductMaxAttempts] = useState(ipLimit.product.maxAttemptsPerIpProduct);
  const [storeEnabled, setStoreEnabled] = useState(ipLimit.store.enabled);
  const [storeMaxAttempts, setStoreMaxAttempts] = useState(ipLimit.store.maxAttemptsPerIpMonth);
  const [pending, startTransition] = useTransition();
  const disabled = pending || !apiKeyReady || ipLimit.envHardDisabled;
  const changed =
    productEnabled !== ipLimit.product.enabled ||
    productMaxAttempts !== ipLimit.product.maxAttemptsPerIpProduct ||
    storeEnabled !== ipLimit.store.enabled ||
    storeMaxAttempts !== ipLimit.store.maxAttemptsPerIpMonth;

  const statusText = useMemo(() => {
    if (!apiKeyReady) return "Create a production key first";
    if (ipLimit.envHardDisabled) return "Disabled by environment";
    if (!ipLimit.globalEnabled || !ipLimit.sdkEnabled) return "Limits are off";
    if (productEnabled && storeEnabled) return "Both limits are on";
    if (productEnabled) return "Per-product limit is on";
    if (storeEnabled) return "Global limit is on";
    return "Limits are off";
  }, [apiKeyReady, productEnabled, storeEnabled, ipLimit.envHardDisabled, ipLimit.globalEnabled, ipLimit.sdkEnabled]);

  const save = () => {
    startTransition(async () => {
      const result = await updateCustomerIpLimitAction({
        productEnabled,
        productMaxAttemptsPerIpProduct: productMaxAttempts,
        storeEnabled,
        storeMaxAttemptsPerIpMonth: storeMaxAttempts,
      });
      if (!result.ok || !result.ipLimit) {
        toast.error("Could not save IP limit", { description: result.error });
        return;
      }
      onIpLimitChange(result.ipLimit);
      toast.success("IP limit settings saved");
    });
  };

  return (
    <section className="rounded-[var(--radius-customer-card)] border border-customer-border bg-customer-card">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-customer-border px-5 py-4">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-blue">SDK protection</p>
          <h2 className="mt-1 text-customer-xl font-semibold tracking-[-0.035em] text-text-primary">Try-on limits</h2>
        </div>
        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${
          (productEnabled || storeEnabled) && !disabled ? "bg-customer-success-bg text-customer-success-text" : "bg-customer-soft text-text-body"
        }`}>
          {(productEnabled || storeEnabled) && !disabled ? <ShieldCheck className="h-4 w-4" aria-hidden /> : <ShieldOff className="h-4 w-4" aria-hidden />}
          {statusText}
        </span>
      </header>

      <div className="grid gap-4 p-5 lg:grid-cols-2">
        <LimitScopeCard
          title="Global monthly IP limit"
          description="Caps total SDK try-on generations from the same shopper IP across this workspace each month."
          enabled={storeEnabled}
          maxAttempts={storeMaxAttempts}
          max={1000}
          rangeLabel="Range: 1 to 1,000 per month."
          disabled={disabled}
          onEnabledChange={setStoreEnabled}
          onMaxAttemptsChange={setStoreMaxAttempts}
        />
        <LimitScopeCard
          title="Per-product IP limit"
          description="Caps repeat SDK try-on generations from the same shopper IP on the same product."
          enabled={productEnabled}
          maxAttempts={productMaxAttempts}
          max={20}
          rangeLabel="Range: 1 to 20 per product."
          disabled={disabled}
          onEnabledChange={setProductEnabled}
          onMaxAttemptsChange={setProductMaxAttempts}
        />
        {!apiKeyReady ? (
          <p className="text-sm leading-6 text-amber-700 lg:col-span-2">Create a production key before enabling these limits.</p>
        ) : null}
      </div>

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-customer-border px-5 py-4">
        <p className="text-xs leading-5 text-text-body">
          Global updated {formatDate(ipLimit.store.updatedAt)}. Product updated {formatDate(ipLimit.product.updatedAt)}.
        </p>
        <button
          type="button"
          disabled={disabled || !changed}
          onClick={save}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-brand-blue px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-blue-dark disabled:cursor-not-allowed disabled:opacity-55"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Save className="h-4 w-4" aria-hidden />}
          Save
        </button>
      </footer>
    </section>
  );
}

function LimitScopeCard({
  title,
  description,
  enabled,
  maxAttempts,
  max,
  rangeLabel,
  disabled,
  onEnabledChange,
  onMaxAttemptsChange,
}: {
  title: string;
  description: string;
  enabled: boolean;
  maxAttempts: number;
  max: number;
  rangeLabel: string;
  disabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  onMaxAttemptsChange: (maxAttempts: number) => void;
}) {
  const setClampedAttempts = (value: number) => {
    onMaxAttemptsChange(Math.max(1, Math.min(max, value)));
  };

  return (
    <div className="rounded-2xl border border-customer-border bg-customer-soft p-4">
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        disabled={disabled}
        onClick={() => onEnabledChange(!enabled)}
        className="flex w-full items-start justify-between gap-4 text-left disabled:cursor-not-allowed disabled:opacity-55"
      >
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-text-primary">{title}</span>
          <span className="mt-1 block text-sm leading-6 text-text-body">{description}</span>
        </span>
        <span className={`relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition-colors ${enabled ? "bg-brand-blue" : "bg-customer-border-strong"}`}>
          <span className={`absolute top-1 h-5 w-5 rounded-full bg-customer-card shadow-sm transition-transform ${enabled ? "translate-x-6" : "translate-x-1"}`} />
        </span>
      </button>

      <div className="mt-4">
        <p className="text-sm font-semibold text-text-primary">Allowed try-ons</p>
        <div className="mt-3 flex h-11 items-center rounded-full border border-customer-border bg-customer-card p-1">
          <button
            type="button"
            disabled={disabled}
            onClick={() => setClampedAttempts(maxAttempts - 1)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-text-body transition-colors hover:bg-customer-soft disabled:opacity-40"
            aria-label={`Decrease ${title}`}
          >
            <Minus className="h-4 w-4" aria-hidden />
          </button>
          <input
            type="number"
            min={1}
            max={max}
            value={maxAttempts}
            disabled={disabled}
            onChange={(event) => setClampedAttempts(Number(event.target.value) || 1)}
            className="h-9 min-w-0 flex-1 bg-transparent text-center text-sm font-semibold text-text-primary outline-none"
          />
          <button
            type="button"
            disabled={disabled}
            onClick={() => setClampedAttempts(maxAttempts + 1)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-text-body transition-colors hover:bg-customer-soft disabled:opacity-40"
            aria-label={`Increase ${title}`}
          >
            <Plus className="h-4 w-4" aria-hidden />
          </button>
        </div>
        <p className="mt-2 text-xs leading-5 text-text-body">{rangeLabel}</p>
      </div>
    </div>
  );
}

function CreateKeyPanel({
  settings,
  keyState,
  onKeyStateChange,
}: {
  settings: CustomerSettingsViewModel;
  keyState: KeyState;
  onKeyStateChange: (state: KeyState) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [keyName, setKeyName] = useState(settings.apiKey.name ?? `${settings.store.storeName} production key`);

  const createKey = () => {
    startTransition(async () => {
      const result = await createCustomerApiKeyAction({ name: keyName });
      if (!result.ok) {
        toast.error("Could not create API key", { description: result.error });
        return;
      }
      onKeyStateChange({
        ready: true,
        name: result.name ?? keyState.name ?? keyName,
        keyPrefix: result.keyPrefix ?? keyState.keyPrefix,
        allowedDomains: result.allowedDomains ?? keyState.allowedDomains,
        oneTimeKey: result.key ?? null,
      });
      toast.success(result.created ? "Production key created" : "Production key already exists");
    });
  };

  const copy = async (value: string, label: string) => {
    await navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  };

  return (
    <section className="rounded-[var(--radius-customer-card)] border border-customer-border bg-customer-card">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-customer-border px-5 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-brand-blue">Production access</p>
          <h2 className="mt-1 text-customer-xl font-semibold tracking-[-0.035em] text-text-primary">API key</h2>
        </div>
        {keyState.ready ? (
          <span className="inline-flex items-center gap-2 rounded-full bg-customer-success-bg px-3 py-1 text-xs font-semibold text-customer-success-text">
            <CheckCircle2 className="h-4 w-4" aria-hidden />
            Ready
          </span>
        ) : null}
      </header>

      <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="border-b border-customer-border p-5 lg:border-b-0 lg:border-r">
          <div className="rounded-2xl border border-customer-border bg-customer-soft p-4">
            <p className="text-sm font-semibold text-text-primary">
              {keyState.ready ? "Production key is active." : "Create your production key."}
            </p>
            <p className="mt-2 text-sm leading-6 text-text-body">
              Existing keys are hidden after creation. Store the one-time value when it appears.
            </p>
            <label className="mt-4 block">
              <span className="text-sm font-semibold text-text-primary">Key name</span>
              <input
                type="text"
                value={keyName}
                disabled={pending || keyState.ready}
                onChange={(event) => setKeyName(event.target.value)}
                placeholder={`${settings.store.storeName} production key`}
                className="mt-2 h-11 w-full rounded-xl border border-customer-border bg-customer-card px-3 text-sm font-semibold text-text-primary outline-none transition-colors focus:border-brand-blue disabled:cursor-not-allowed disabled:bg-customer-soft disabled:text-text-body"
              />
            </label>
            {keyState.oneTimeKey ? (
              <div className="mt-4 rounded-xl border border-customer-border bg-customer-success-bg p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-customer-success-text">Shown once</p>
                <div className="mt-2 flex flex-wrap items-center gap-2 rounded-lg bg-customer-card p-2">
                  <code className="min-w-0 flex-1 break-all text-xs text-text-primary">{keyState.oneTimeKey}</code>
                  <button
                    type="button"
                    onClick={() => copy(keyState.oneTimeKey!, "API key")}
                    className="inline-flex h-8 items-center gap-1.5 rounded-full border border-customer-border px-3 text-xs font-semibold text-customer-success-text"
                  >
                    <Copy className="h-3.5 w-3.5" aria-hidden />
                    Copy
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="p-5">
          <SummaryLine label="Name" value={(keyState.name ?? keyName) || "Production key"} />
          <SummaryLine label="Prefix" value={keyState.keyPrefix ?? "Not created"} />
          <SummaryLine label="Domain" value={keyState.allowedDomains.join(", ") || settings.store.domain} />
          <SummaryLine label="Install" value="npm install @primestyleai/tryon" mono />
          <button
            type="button"
            disabled={pending}
            onClick={createKey}
            className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-full bg-brand-blue px-4 text-sm font-semibold text-white transition-colors hover:bg-brand-blue-dark disabled:cursor-not-allowed disabled:opacity-55"
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <KeyRound className="h-4 w-4" aria-hidden />}
            {keyState.ready ? "Check key" : "Create key"}
          </button>
        </div>
      </div>
    </section>
  );
}

function SummaryLine({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="border-b border-customer-border py-3 last:border-b-0">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-customer-muted">{label}</p>
      <p className={`mt-1 break-words text-sm font-semibold text-text-primary ${mono ? "font-mono" : ""}`}>{value}</p>
    </div>
  );
}

function RecentIpLimitRecords({ ipLimit }: { ipLimit: CustomerIpLimitSettings }) {
  return (
    <section className="rounded-[var(--radius-customer-card)] border border-customer-border bg-customer-card">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-customer-border px-5 py-4">
        <div>
          <h2 className="text-customer-lg font-semibold text-text-primary">Recent records</h2>
          <p className="mt-1 text-sm leading-6 text-text-body">IP/product locks for this SDK workspace.</p>
        </div>
        <span className="rounded-full bg-customer-soft px-3 py-1 text-xs font-semibold text-text-body">
          {ipLimit.recentRecords.length}
        </span>
      </header>

      {ipLimit.recentRecords.length ? (
        <div className="divide-y divide-customer-border">
          {ipLimit.recentRecords.map((record) => (
            <div key={record.id} className="grid gap-2 px-5 py-4 text-sm lg:grid-cols-[130px_minmax(0,1fr)_90px_90px_120px]">
              <span className="font-semibold text-text-primary">{record.ipAddressMasked}</span>
              <span className="min-w-0 truncate text-text-body">{record.productTitle || record.productId}</span>
              <span className="text-text-body">{record.attemptCount} attempts</span>
              <span className="text-text-body">{record.blockedAttempts} blocked</span>
              <span className="text-text-body">{formatDate(record.lastAttemptAt)}</span>
            </div>
          ))}
        </div>
      ) : (
        <div className="px-5 py-6 text-sm leading-6 text-text-body">
          No records yet. Records appear after SDK try-on requests reach this workspace.
        </div>
      )}
    </section>
  );
}

function formatDate(value: string | null): string {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
