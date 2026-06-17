"use client";

import { useState, useTransition } from "react";
import { RotateCcw, Save, ShieldPlus, Trash2 } from "lucide-react";
import { toast } from "sonner";

export type IpLimitRecord = {
  id: string;
  ipAddressMasked: string;
  source: "sdk" | "shopify";
  scopeId: string | null;
  productId: string;
  productTitle: string | null;
	productUrl: string | null;
	sessionId: string | null;
	firstSeenAt: string | null;
	lastAttemptAt: string | null;
	attemptCount: number;
	blockedAttempts: number;
};

export type IpWhitelistEntry = {
  id: string;
  ipAddressMasked: string;
  label: string | null;
  note: string | null;
  createdAt: string | null;
};

export type IpLimitSettings = {
	enabled: boolean;
	sdkEnabled: boolean;
	shopifyEnabled: boolean;
	sdkMaxAttemptsPerIpProduct: number;
	shopifyMaxAttemptsPerIpProduct: number;
	sdkApiKeyConfigured: boolean;
	sdkApiKeyCount: number;
	envHardDisabled: boolean;
  updatedAt: string | null;
  updatedBy: string | null;
};

export type IpLimitsResponse = {
  settings: IpLimitSettings;
  records: IpLimitRecord[];
  whitelist: IpWhitelistEntry[];
};

type CurrentIpResponse = {
  ipAddress: string | null;
  ipAddressMasked: string | null;
};

function formatDate(value: string | null): string {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

async function readJson(response: Response) {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch {
    return { message: text };
  }
}

function normalizeSettings(settings: IpLimitSettings): IpLimitSettings {
	const raw = settings as Partial<IpLimitSettings>;
	const legacyApiKeyIds = Array.isArray((raw as Partial<IpLimitSettings> & { sdkApiKeyIds?: unknown[] }).sdkApiKeyIds)
		? ((raw as Partial<IpLimitSettings> & { sdkApiKeyIds?: unknown[] }).sdkApiKeyIds ?? []).length
		: 0;
	const sdkApiKeyCount = typeof raw.sdkApiKeyCount === "number" ? raw.sdkApiKeyCount : legacyApiKeyIds;
	const sdkMaxAttemptsPerIpProduct = normalizeAttemptCount(raw.sdkMaxAttemptsPerIpProduct);
	const shopifyMaxAttemptsPerIpProduct = normalizeAttemptCount(raw.shopifyMaxAttemptsPerIpProduct);
	return {
		...settings,
		shopifyEnabled: typeof raw.shopifyEnabled === "boolean" ? raw.shopifyEnabled : false,
		sdkMaxAttemptsPerIpProduct,
		shopifyMaxAttemptsPerIpProduct,
		sdkApiKeyConfigured: typeof raw.sdkApiKeyConfigured === "boolean" ? raw.sdkApiKeyConfigured : sdkApiKeyCount > 0,
		sdkApiKeyCount,
	};
}

function normalizeAttemptCount(value: unknown): number {
	const raw = typeof value === "number" ? value : typeof value === "string" ? Number(value) : 1;
	const n = Number.isFinite(raw) ? Math.floor(raw) : 1;
	return Math.max(1, Math.min(20, n));
}

export function IpLimitsPage({ initialData }: { initialData: IpLimitsResponse }) {
  const initialSettings = normalizeSettings(initialData.settings);
  const [data, setData] = useState(initialData);
  const [settings, setSettings] = useState(initialSettings);
  const [savedSettings, setSavedSettings] = useState(initialSettings);
  const [ipAddress, setIpAddress] = useState("");
  const [productId, setProductId] = useState("");
  const [whitelistIp, setWhitelistIp] = useState("");
  const [whitelistLabel, setWhitelistLabel] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const demoLimitEnabled = settings.enabled && settings.sdkEnabled;
  const savedDemoLimitEnabled = savedSettings.enabled && savedSettings.sdkEnabled;
  const hasSettingsChanges =
    demoLimitEnabled !== savedDemoLimitEnabled ||
    settings.sdkMaxAttemptsPerIpProduct !== savedSettings.sdkMaxAttemptsPerIpProduct;

  const refresh = async () => {
    const response = await fetch("/api/admin/ip-limits?limit=150", { cache: "no-store" });
    if (!response.ok) throw new Error("Failed to refresh IP limits");
    const next = (await response.json()) as IpLimitsResponse;
    const nextSettings = normalizeSettings(next.settings);
    setData(next);
    setSettings(nextSettings);
    setSavedSettings(nextSettings);
  };

  const run = (fn: () => Promise<void>) => {
    setMessage(null);
    startTransition(() => {
      void fn().catch((error) => {
        const text = error instanceof Error ? error.message : "Action failed";
        setMessage(text);
        toast.error(text);
      });
    });
  };

  const resetRecord = (recordId: string) => run(async () => {
    const response = await fetch("/api/admin/ip-limits/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recordId }),
    });
    if (!response.ok) throw new Error((await readJson(response)).message || "Reset failed");
    await refresh();
    setMessage("IP/product limit reset.");
  });

  const resetSpecific = () => run(async () => {
    const response = await fetch("/api/admin/ip-limits/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ipAddress, productId: productId || undefined }),
    });
    if (!response.ok) throw new Error((await readJson(response)).message || "Reset failed");
    const result = await readJson(response);
    await refresh();
    setMessage(`Reset ${result.deletedCount ?? 0} matching record(s).`);
  });

  const fillCurrentIp = (target: "reset" | "whitelist") => run(async () => {
    const response = await fetch("/api/admin/ip-limits/current-ip", { cache: "no-store" });
    if (!response.ok) throw new Error((await readJson(response)).message || "Could not detect current IP");
    const result = (await response.json()) as CurrentIpResponse;
    if (!result.ipAddress) throw new Error("Current IP was not detected");
    if (target === "reset") setIpAddress(result.ipAddress);
    else setWhitelistIp(result.ipAddress);
    setMessage(`Current IP detected: ${result.ipAddressMasked || result.ipAddress}`);
  });

  const whitelistCurrentIp = () => run(async () => {
    const currentResponse = await fetch("/api/admin/ip-limits/current-ip", { cache: "no-store" });
    if (!currentResponse.ok) throw new Error((await readJson(currentResponse)).message || "Could not detect current IP");
    const current = (await currentResponse.json()) as CurrentIpResponse;
    if (!current.ipAddress) throw new Error("Current IP was not detected");

    const response = await fetch("/api/admin/ip-limits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ipAddress: current.ipAddress, label: "Current admin IP" }),
    });
    if (!response.ok) throw new Error((await readJson(response)).message || "Whitelist failed");
    await refresh();
    setMessage(`Current IP whitelisted: ${current.ipAddressMasked || current.ipAddress}`);
  });

  const saveSettings = () => run(async () => {
    if (!hasSettingsChanges) return;
    const response = await fetch("/api/admin/ip-limits/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        enabled: settings.enabled,
        sdkEnabled: settings.sdkEnabled,
        sdkMaxAttemptsPerIpProduct: settings.sdkMaxAttemptsPerIpProduct,
      }),
    });
    if (!response.ok) throw new Error((await readJson(response)).message || "Settings save failed");
    const result = await readJson(response);
    if (result.settings) {
      const nextSettings = normalizeSettings(result.settings as IpLimitSettings);
      setSettings(nextSettings);
      setSavedSettings(nextSettings);
    } else {
      setSavedSettings(settings);
    }
    setMessage(null);
    toast.success("IP limit settings saved");
  });

  const addWhitelist = () => run(async () => {
    const response = await fetch("/api/admin/ip-limits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ipAddress: whitelistIp, label: whitelistLabel || undefined }),
    });
    if (!response.ok) throw new Error((await readJson(response)).message || "Whitelist failed");
    setWhitelistIp("");
    setWhitelistLabel("");
    await refresh();
    setMessage("IP whitelisted.");
  });

  const removeWhitelist = (id: string) => run(async () => {
    const response = await fetch(`/api/admin/ip-limits/whitelist/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error((await readJson(response)).message || "Remove failed");
    await refresh();
    setMessage("Whitelist entry removed.");
  });

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-blue">Monitoring</p>
          <h2 className="mt-2 text-3xl font-semibold leading-tight text-text-primary lg:text-4xl">IP Limits</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-text-body lg:text-base">Prime demo IP/product locks.</p>
        </div>
        <span className="rounded-full border border-customer-border bg-customer-card px-4 py-2 text-sm font-semibold text-text-body">
          {data.records.length} recent records
        </span>
      </div>

      <section className="rounded-[var(--radius-customer-card)] border border-customer-border bg-customer-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h3 className="text-base font-semibold text-text-primary">SDK IP/Product Limit</h3>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${settings.envHardDisabled || !demoLimitEnabled ? "bg-amber-50 text-amber-700" : "bg-green-50 text-green-700"}`}>
            {settings.envHardDisabled ? "Env off" : demoLimitEnabled ? "On" : "Off"}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-customer-border bg-customer-soft p-4">
          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={demoLimitEnabled}
              disabled={settings.envHardDisabled || isPending}
              onChange={(event) => setSettings((current) => ({
                ...current,
                enabled: event.target.checked,
                sdkEnabled: event.target.checked,
              }))}
            />
            <span className="text-sm font-semibold text-text-primary">Limit attempts per IP/product</span>
          </label>
          <span className="text-xs font-medium text-text-body">
            {settings.sdkApiKeyConfigured ? "Demo key configured" : "Demo key missing"}
          </span>
        </div>

        <div className="mt-4 grid gap-2 rounded-lg border border-customer-border bg-white p-4 sm:grid-cols-[minmax(0,1fr)_160px] sm:items-center">
          <div>
            <p className="text-sm font-semibold text-text-primary">Allowed attempts</p>
            <p className="mt-1 text-xs text-text-body">Applies only to configured SDK API key IDs. Default is 1.</p>
          </div>
          <input
            type="number"
            min={1}
            max={20}
            value={settings.sdkMaxAttemptsPerIpProduct}
            disabled={settings.envHardDisabled || isPending}
            onChange={(event) => setSettings((current) => ({
              ...current,
              sdkMaxAttemptsPerIpProduct: normalizeAttemptCount(event.target.value),
            }))}
            className="rounded-lg border border-customer-border bg-white px-3 py-2 text-sm font-semibold text-text-primary outline-none focus:border-brand-blue"
          />
        </div>

        <button
          type="button"
          disabled={settings.envHardDisabled || isPending || !hasSettingsChanges}
          onClick={saveSettings}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          Save settings
        </button>
      </section>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-[var(--radius-customer-card)] border border-customer-border bg-customer-card p-5">
          <h3 className="text-base font-semibold text-text-primary">Reset Specific IP</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <input
              value={ipAddress}
              onChange={(event) => setIpAddress(event.target.value)}
              placeholder="IP address"
              className="rounded-lg border border-customer-border bg-white px-3 py-2 text-sm outline-none focus:border-brand-blue"
            />
            <input
              value={productId}
              onChange={(event) => setProductId(event.target.value)}
              placeholder="Product ID optional"
              className="rounded-lg border border-customer-border bg-white px-3 py-2 text-sm outline-none focus:border-brand-blue"
            />
          </div>
          <button
            type="button"
            disabled={isPending || !ipAddress.trim()}
            onClick={resetSpecific}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => fillCurrentIp("reset")}
            className="ml-3 mt-4 inline-flex items-center gap-2 rounded-lg border border-customer-border px-4 py-2 text-sm font-semibold text-brand-blue disabled:opacity-50"
          >
            Use current IP
          </button>
        </section>

        <section className="rounded-[var(--radius-customer-card)] border border-customer-border bg-customer-card p-5">
          <h3 className="text-base font-semibold text-text-primary">Whitelist IP</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <input
              value={whitelistIp}
              onChange={(event) => setWhitelistIp(event.target.value)}
              placeholder="IP address"
              className="rounded-lg border border-customer-border bg-white px-3 py-2 text-sm outline-none focus:border-brand-blue"
            />
            <input
              value={whitelistLabel}
              onChange={(event) => setWhitelistLabel(event.target.value)}
              placeholder="Label optional"
              className="rounded-lg border border-customer-border bg-white px-3 py-2 text-sm outline-none focus:border-brand-blue"
            />
          </div>
          <button
            type="button"
            disabled={isPending || !whitelistIp.trim()}
            onClick={addWhitelist}
            className="mt-4 inline-flex items-center gap-2 rounded-lg bg-brand-blue px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            <ShieldPlus className="h-4 w-4" />
            Whitelist
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={() => fillCurrentIp("whitelist")}
            className="ml-3 mt-4 inline-flex items-center gap-2 rounded-lg border border-customer-border px-4 py-2 text-sm font-semibold text-brand-blue disabled:opacity-50"
          >
            Use current IP
          </button>
          <button
            type="button"
            disabled={isPending}
            onClick={whitelistCurrentIp}
            className="ml-3 mt-4 inline-flex items-center gap-2 rounded-lg border border-customer-border px-4 py-2 text-sm font-semibold text-brand-blue disabled:opacity-50"
          >
            <ShieldPlus className="h-4 w-4" />
            Whitelist current IP
          </button>
        </section>
      </div>

      {message ? (
        <p className="rounded-lg border border-customer-border bg-customer-card px-4 py-3 text-sm font-semibold text-text-body">{message}</p>
      ) : null}

      <section className="overflow-hidden rounded-[var(--radius-customer-card)] border border-customer-border bg-customer-card">
        <div className="border-b border-customer-border p-5">
          <h3 className="text-base font-semibold text-text-primary">Recent IP/Product Locks</h3>
        </div>
        {data.records.length ? data.records.map((record) => (
          <article key={record.id} className="grid gap-4 border-b border-customer-border p-5 last:border-b-0 xl:grid-cols-[minmax(0,1fr)_180px_120px]">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-text-primary">{record.productTitle || record.productId}</p>
              <p className="mt-1 text-xs text-customer-muted">
                {record.source.toUpperCase()} · {record.ipAddressMasked} · Product {record.productId}
              </p>
              <p className="mt-1 text-xs text-text-body">
                First {formatDate(record.firstSeenAt)} · Last {formatDate(record.lastAttemptAt)} · {record.attemptCount ?? 1} allowed · {record.blockedAttempts} blocked
              </p>
            </div>
            <div className="text-sm text-text-body">
              <p className="font-semibold">Scope</p>
              <p className="mt-1 break-all text-xs text-customer-muted">{record.scopeId || "global"}</p>
            </div>
            <button
              type="button"
              disabled={isPending}
              onClick={() => resetRecord(record.id)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-customer-border px-3 text-sm font-semibold text-brand-blue disabled:opacity-50"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>
          </article>
        )) : (
          <div className="p-8 text-center text-sm text-text-body">No IP/product locks yet.</div>
        )}
      </section>

      <section className="overflow-hidden rounded-[var(--radius-customer-card)] border border-customer-border bg-customer-card">
        <div className="border-b border-customer-border p-5">
          <h3 className="text-base font-semibold text-text-primary">Whitelist</h3>
        </div>
        {data.whitelist.length ? data.whitelist.map((entry) => (
          <article key={entry.id} className="flex flex-wrap items-center justify-between gap-4 border-b border-customer-border p-5 last:border-b-0">
            <div>
              <p className="text-sm font-semibold text-text-primary">{entry.label || entry.ipAddressMasked}</p>
              <p className="mt-1 text-xs text-customer-muted">{entry.ipAddressMasked} · Added {formatDate(entry.createdAt)}</p>
            </div>
            <button
              type="button"
              disabled={isPending}
              onClick={() => removeWhitelist(entry.id)}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-customer-border px-3 text-sm font-semibold text-red-700 disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" />
              Remove
            </button>
          </article>
        )) : (
          <div className="p-8 text-center text-sm text-text-body">No whitelisted IPs.</div>
        )}
      </section>
    </section>
  );
}
