import Link from "next/link";
import type { ShopifyTryOnOverview, ShopifyTryOnRange, ShopifyTryOnRetailer } from "../types";

const ranges: Array<{ id: ShopifyTryOnRange; label: string }> = [
  { id: "7d", label: "7D" },
  { id: "30d", label: "30D" },
  { id: "90d", label: "90D" },
  { id: "12m", label: "12M" },
];

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatDate(value: string | null | undefined, includeYear = true): string {
  if (!value) return "Not available";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not available";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    ...(includeYear ? { year: "numeric" as const } : {}),
  }).format(date);
}

function formatBucket(bucket: string, range: ShopifyTryOnRange): string {
  if (range === "12m") {
    const [year, month] = bucket.split("-").map(Number);
    return new Intl.DateTimeFormat("en-US", { month: "short" }).format(new Date(Date.UTC(year || 1970, (month || 1) - 1, 1)));
  }
  return formatDate(`${bucket}T00:00:00.000Z`, false);
}

function titleCase(value: string): string {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function statusTone(status: string): string {
  if (status === "active") return "bg-admin-status-active-bg text-admin-status-active-text";
  if (status === "suspended") return "bg-amber-100 text-amber-800";
  if (status === "uninstalled") return "bg-admin-status-suspended-bg text-admin-status-suspended-text";
  return "bg-customer-soft text-text-body";
}

function MetricCard({ label, value, helper }: { label: string; value: string; helper: string }) {
  return (
    <article className="rounded-[var(--radius-customer-card)] border border-customer-border bg-customer-card p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-customer-muted">{label}</p>
      <p className="mt-3 text-3xl font-semibold leading-none text-text-primary">{value}</p>
      <p className="mt-3 text-sm leading-relaxed text-text-body">{helper}</p>
    </article>
  );
}

function RangeTabs({ activeRange }: { activeRange: ShopifyTryOnRange }) {
  return (
    <nav className="flex flex-wrap gap-2" aria-label="Try-on range">
      {ranges.map((range) => {
        const active = range.id === activeRange;
        return (
          <Link
            key={range.id}
            href={`/admin?range=${range.id}`}
            className={[
              "rounded-full border px-4 py-2 text-sm font-semibold transition",
              active
                ? "border-brand-blue bg-brand-blue text-white"
                : "border-customer-border bg-customer-card text-text-body hover:border-brand-blue/50",
            ].join(" ")}
          >
            {range.label}
          </Link>
        );
      })}
    </nav>
  );
}

function TryOnChart({ overview }: { overview: ShopifyTryOnOverview }) {
  const max = Math.max(1, ...overview.series.map((item) => item.tryOns));

  return (
    <section className="rounded-[var(--radius-customer-card)] border border-customer-border bg-customer-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Try-ons by {overview.range === "12m" ? "month" : "date"}</h2>
          <p className="mt-1 text-sm text-text-body">Completed Shopify try-ons only.</p>
        </div>
        <span className="rounded-full bg-customer-soft px-3 py-1 text-xs font-semibold text-text-body">
          Since {formatDate(overview.from)}
        </span>
      </div>

      <div className="mt-6 grid grid-cols-7 gap-2 md:grid-cols-12">
        {overview.series.map((item) => {
          const height = item.tryOns > 0 ? Math.max(8, (item.tryOns / max) * 100) : 2;
          return (
            <div key={item.bucket} className="min-w-0">
              <div className="flex h-40 items-end rounded-xl bg-customer-soft px-1.5 pb-1.5">
                <div className="w-full rounded-t-lg bg-brand-blue" style={{ height: `${height}%` }} />
              </div>
              <p className="mt-2 truncate text-center text-xs font-semibold text-text-primary">{formatBucket(item.bucket, overview.range)}</p>
              <p className="mt-1 text-center text-xs text-customer-muted">{formatNumber(item.tryOns)}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function RetailerName({ retailer }: { retailer: ShopifyTryOnRetailer }) {
  return (
    <div className="min-w-0">
      <p className="truncate font-semibold text-text-primary">{retailer.shopName}</p>
      <p className="mt-1 truncate text-xs text-customer-muted">{retailer.shopDomain}</p>
      {retailer.primaryDomain ? <p className="mt-1 truncate text-xs text-text-body">{retailer.primaryDomain}</p> : null}
    </div>
  );
}

function RetailerTable({ retailers }: { retailers: ShopifyTryOnRetailer[] }) {
  return (
    <section className="overflow-hidden rounded-[var(--radius-customer-card)] border border-customer-border bg-customer-card">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-customer-border p-5">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Shopify retailers</h2>
          <p className="mt-1 text-sm text-text-body">Install status, owner email, and completed try-on usage.</p>
        </div>
        <span className="rounded-full bg-customer-soft px-3 py-1 text-xs font-semibold text-text-body">
          {formatNumber(retailers.length)} installs
        </span>
      </div>

      {retailers.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-[1080px] w-full text-left text-sm">
            <thead className="bg-surface-light text-xs uppercase tracking-[0.1em] text-customer-muted">
              <tr>
                <th className="px-5 py-3 font-semibold">Retailer</th>
                <th className="px-5 py-3 font-semibold">Installer email</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Installed</th>
                <th className="px-5 py-3 font-semibold">Last used</th>
                <th className="px-5 py-3 font-semibold">Range try-ons</th>
                <th className="px-5 py-3 font-semibold">Lifetime</th>
              </tr>
            </thead>
            <tbody>
              {retailers.map((retailer) => (
                <tr key={retailer.id} className="border-t border-customer-border">
                  <td className="px-5 py-4"><RetailerName retailer={retailer} /></td>
                  <td className="px-5 py-4 text-text-body">{retailer.ownerEmail ?? "Not available"}</td>
                  <td className="px-5 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusTone(retailer.status)}`}>
                      {titleCase(retailer.status)}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-text-body">{formatDate(retailer.installedAt)}</td>
                  <td className="px-5 py-4 text-text-body">{formatDate(retailer.lastUsedAt)}</td>
                  <td className="px-5 py-4 font-semibold text-text-primary">{formatNumber(retailer.rangeTryOns)}</td>
                  <td className="px-5 py-4 text-text-body">{formatNumber(retailer.lifetimeTryOns)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-8 text-center">
          <p className="text-lg font-semibold text-text-primary">No Shopify installs yet</p>
          <p className="mt-2 text-sm text-text-body">Installed Shopify stores will appear here.</p>
        </div>
      )}
    </section>
  );
}

export function ShopifyTryOnOverviewPage({ overview }: { overview: ShopifyTryOnOverview }) {
  const topRetailer = overview.kpis.topRetailer;

  return (
    <section className="mx-auto max-w-[1500px] space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-blue">Shopify overview</p>
          <h1 className="mt-2 text-3xl font-semibold leading-tight text-text-primary md:text-4xl">Admin Dashboard</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-text-body">
            Completed Shopify try-ons, install status, and retailer-level usage from the live admin data source.
          </p>
        </div>
        <RangeTabs activeRange={overview.range} />
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Range try-ons" value={formatNumber(overview.kpis.totalTryOns)} helper={`Completed Shopify try-ons since ${formatDate(overview.from)}.`} />
        <MetricCard label="Active installs" value={formatNumber(overview.kpis.activeInstalls)} helper={`${formatNumber(overview.kpis.totalInstalls)} total installs tracked.`} />
        <MetricCard label="Lifetime try-ons" value={formatNumber(overview.kpis.lifetimeTryOns)} helper="Total usage from Shopify shop records." />
        <MetricCard
          label="Top retailer"
          value={topRetailer ? formatNumber(topRetailer.rangeTryOns) : "0"}
          helper={topRetailer ? `${topRetailer.shopName} in selected range.` : "No try-ons in selected range."}
        />
      </section>

      <TryOnChart overview={overview} />
      <RetailerTable retailers={overview.retailers} />
    </section>
  );
}
