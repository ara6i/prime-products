import Link from "next/link";
import type {
  RevenueView,
  ShopifyRevenueCompositionItem,
  ShopifyRevenueMonth,
  ShopifyRevenuePlanRow,
  ShopifyRevenueReport,
  ShopifyRevenueStore,
} from "../types";

interface RevenuePageProps {
  activeView: RevenueView;
  shopifyReport: ShopifyRevenueReport;
}

const tabs: Array<{ id: RevenueView; label: string; description: string }> = [
  { id: "full", label: "Full report", description: "All revenue sources" },
  { id: "shopify", label: "Shopify", description: "Admin app billing" },
  { id: "sdk", label: "SDK", description: "Direct SDK sales" },
];

function formatCurrency(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
  }).format(amount);
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

function formatRate(value: number | null | undefined, currency: string): string {
  if (value == null) return "Not set";
  return `${formatCurrency(value, currency)} / try-on`;
}

function formatDate(value: string | null): string {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function percent(value: number, total: number): number {
  if (total <= 0) return 0;
  return Math.max(2, Math.min(100, (value / total) * 100));
}

function MetricCard({
  label,
  value,
  helper,
  tone = "neutral",
}: {
  label: string;
  value: string;
  helper: string;
  tone?: "neutral" | "blue" | "green";
}) {
  const valueClass = tone === "blue" ? "text-brand-blue" : tone === "green" ? "text-customer-success-text" : "text-text-primary";

  return (
    <article className="rounded-[var(--radius-customer-card)] border border-customer-border bg-customer-card p-5">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-customer-muted">{label}</p>
      <p className={`mt-3 text-3xl font-semibold leading-none ${valueClass}`}>{value}</p>
      <p className="mt-3 text-sm leading-relaxed text-text-body">{helper}</p>
    </article>
  );
}

function EmptyPanel({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-[var(--radius-customer-card)] border border-dashed border-customer-border bg-customer-card p-8 text-center">
      <p className="text-lg font-semibold text-text-primary">{title}</p>
      <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-text-body">{body}</p>
    </div>
  );
}

function RevenueTabs({ activeView }: { activeView: RevenueView }) {
  return (
    <nav className="grid gap-3 sm:grid-cols-3" aria-label="Revenue reports">
      {tabs.map((tab) => {
        const isActive = tab.id === activeView;

        return (
          <Link
            key={tab.id}
            href={`/admin/revenue?view=${tab.id}`}
            className={[
              "rounded-[var(--radius-customer-card)] border p-4 transition",
              isActive
                ? "border-brand-blue bg-customer-blue text-text-primary shadow-[0_12px_30px_rgba(37,91,255,0.10)]"
                : "border-customer-border bg-customer-card text-text-body hover:border-brand-blue/45",
            ].join(" ")}
          >
            <span className="block text-base font-semibold">{tab.label}</span>
            <span className="mt-1 block text-sm text-customer-muted">{tab.description}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function RevenueMixChart({
  items,
  total,
  currency,
}: {
  items: ShopifyRevenueCompositionItem[];
  total: number;
  currency: string;
}) {
  return (
    <section className="rounded-[var(--radius-customer-card)] border border-customer-border bg-customer-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">Revenue mix</h3>
          <p className="mt-1 text-sm text-text-body">Where Shopify monthly revenue is coming from.</p>
        </div>
        <p className="text-sm font-semibold text-brand-blue">{formatCurrency(total, currency)} MRR</p>
      </div>

      <div className="mt-6 space-y-5">
        {items.map((item) => (
          <div key={item.label}>
            <div className="mb-2 flex items-center justify-between gap-4 text-sm">
              <span className="font-medium text-text-primary">{item.label}</span>
              <span className="font-semibold text-text-primary">{formatCurrency(item.amount, currency)}</span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-customer-soft">
              <div className="h-full rounded-full bg-brand-blue" style={{ width: `${percent(item.amount, total)}%` }} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function MonthlyChart({
  months,
  currency,
}: {
  months: ShopifyRevenueMonth[];
  currency: string;
}) {
  const maxMrr = Math.max(1, ...months.map((month) => month.mrr));

  return (
    <section className="rounded-[var(--radius-customer-card)] border border-customer-border bg-customer-card p-5">
      <h3 className="text-lg font-semibold text-text-primary">Paid installs</h3>
      <p className="mt-1 text-sm text-text-body">New paid Shopify stores by install month, using current plan value.</p>

      <div className="mt-6 grid grid-cols-6 gap-3">
        {months.map((month) => {
          const barHeight = month.mrr > 0 ? Math.max(8, (month.mrr / maxMrr) * 100) : 2;

          return (
            <div key={month.month} className="min-w-0">
              <div className="flex h-36 items-end rounded-xl bg-customer-soft px-2 pb-2">
                <div className="w-full rounded-t-lg bg-brand-blue" style={{ height: `${barHeight}%` }} />
              </div>
              <p className="mt-2 text-center text-xs font-semibold text-text-primary">{month.label}</p>
              <p className="mt-1 truncate text-center text-xs text-customer-muted">{formatCurrency(month.mrr, currency)}</p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function PlanBreakdown({
  rows,
  currency,
}: {
  rows: ShopifyRevenuePlanRow[];
  currency: string;
}) {
  const maxMrr = Math.max(1, ...rows.map((row) => row.mrr));

  return (
    <section className="rounded-[var(--radius-customer-card)] border border-customer-border bg-customer-card p-5">
      <h3 className="text-lg font-semibold text-text-primary">Plans</h3>
      <p className="mt-1 text-sm text-text-body">Revenue grouped by the selected product and try-on package.</p>

      {rows.length > 0 ? (
        <div className="mt-6 space-y-4">
          {rows.map((row) => (
            <div key={row.label} className="border-b border-customer-border pb-4 last:border-b-0 last:pb-0">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-text-primary">{row.label}</p>
                  <p className="mt-1 text-sm text-customer-muted">
                    {formatNumber(row.stores)} stores · {formatNumber(row.products)} products · {formatNumber(row.tryOns)} try-ons
                  </p>
                </div>
                <p className="font-semibold text-text-primary">{formatCurrency(row.mrr, currency)}</p>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-customer-soft">
                <div className="h-full rounded-full bg-brand-blue" style={{ width: `${percent(row.mrr, maxMrr)}%` }} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-6 rounded-xl bg-customer-soft px-4 py-5 text-sm text-text-body">No paid Shopify plans yet.</p>
      )}
    </section>
  );
}

function TopStoresTable({
  stores,
  currency,
}: {
  stores: ShopifyRevenueStore[];
  currency: string;
}) {
  return (
    <section className="overflow-hidden rounded-[var(--radius-customer-card)] border border-customer-border bg-customer-card">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-customer-border p-5">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">Top Shopify stores</h3>
          <p className="mt-1 text-sm text-text-body">Highest current monthly Shopify billing records.</p>
        </div>
        <span className="rounded-full bg-customer-soft px-3 py-1 text-xs font-semibold text-text-body">Top 10</span>
      </div>

      {stores.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-[920px] w-full text-left text-sm">
            <thead className="bg-customer-soft text-xs uppercase tracking-[0.1em] text-customer-muted">
              <tr>
                <th className="px-5 py-3 font-semibold">Store</th>
                <th className="px-5 py-3 font-semibold">Monthly</th>
                <th className="px-5 py-3 font-semibold">Plan</th>
                <th className="px-5 py-3 font-semibold">Try-ons</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Period end</th>
              </tr>
            </thead>
            <tbody>
              {stores.map((store) => (
                <tr key={store.id} className="border-t border-customer-border">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-text-primary">{store.shopName || store.shopDomain}</p>
                    <p className="mt-1 text-xs text-customer-muted">{store.shopDomain}</p>
                    {store.ownerEmail ? <p className="mt-1 text-xs text-text-body">{store.ownerEmail}</p> : null}
                  </td>
                  <td className="px-5 py-4 font-semibold text-text-primary">{formatCurrency(store.monthlyRevenue, currency)}</td>
                  <td className="px-5 py-4 text-text-body">
                    <p>{formatNumber(store.selectedProductCount ?? 0)} products</p>
                    <p className="mt-1 text-xs text-customer-muted">Platform {formatCurrency(store.platformFee, currency)}</p>
                  </td>
                  <td className="px-5 py-4 text-text-body">
                    <p>{formatNumber(store.tryOnPackageQuantity ?? 0)} included</p>
                    <p className="mt-1 text-xs text-customer-muted">{formatRate(store.effectiveTryOnRate, currency)}</p>
                  </td>
                  <td className="px-5 py-4">
                    <span className="rounded-full bg-customer-soft px-3 py-1 text-xs font-semibold text-text-body">
                      {store.billingTest ? "Test" : "Live"}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-text-body">{formatDate(store.currentPeriodEnd)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-5">
          <p className="rounded-xl bg-customer-soft px-4 py-5 text-sm text-text-body">No active paid Shopify stores yet.</p>
        </div>
      )}
    </section>
  );
}

function OperationsSnapshot({ report }: { report: ShopifyRevenueReport }) {
  const { summary } = report;

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
      <MetricCard label="Included try-ons" value={formatNumber(summary.includedTryOns)} helper="Recurring allowance across paid plans." />
      <MetricCard label="Selected products" value={formatNumber(summary.selectedProducts)} helper="Products enabled for Shopify billing." />
      <MetricCard label="Try-ons used" value={formatNumber(summary.tryOnsUsed)} helper="Usage recorded across active Shopify stores." />
      <MetricCard label="Try-on balance" value={formatNumber(summary.tryOnBalance)} helper="Remaining usage tracked on active stores." />
      <MetricCard label="Scheduled MRR" value={formatCurrency(summary.scheduledMrr, report.currency)} helper="Plan changes queued for next cycle." />
    </section>
  );
}

function ShopifySummary({ report }: { report: ShopifyRevenueReport }) {
  const { summary, currency } = report;

  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <MetricCard label="Shopify MRR" value={formatCurrency(summary.totalMrr, currency)} helper="Current active paid Shopify plans." tone="blue" />
      <MetricCard label="Live MRR" value={formatCurrency(summary.liveMrr, currency)} helper="Real Shopify billing, excluding test charges." tone="green" />
      <MetricCard label="Test MRR" value={formatCurrency(summary.testMrr, currency)} helper="Staging and Shopify test billing records." />
      <MetricCard label="Annual run rate" value={formatCurrency(summary.annualRunRate, currency)} helper="Monthly recurring revenue multiplied by 12." />
      <MetricCard
        label="Paid stores"
        value={formatNumber(summary.activePaidStores)}
        helper={`${formatNumber(summary.livePaidStores)} live · ${formatNumber(summary.testPaidStores)} test · ${formatNumber(summary.freeActiveStores)} free active`}
      />
      <MetricCard label="Average MRR" value={formatCurrency(summary.averageMrrPerPaidStore, currency)} helper="Average revenue per paid Shopify store." />
    </section>
  );
}

function ShopifyReport({ report }: { report: ShopifyRevenueReport }) {
  return (
    <div className="space-y-5">
      <ShopifySummary report={report} />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <RevenueMixChart items={report.composition} total={report.summary.totalMrr} currency={report.currency} />
        <MonthlyChart months={report.monthlySeries} currency={report.currency} />
      </div>

      <PlanBreakdown rows={report.planBreakdown} currency={report.currency} />
      <OperationsSnapshot report={report} />
      <TopStoresTable stores={report.topStores} currency={report.currency} />
    </div>
  );
}

function FullReport({ report }: { report: ShopifyRevenueReport }) {
  return (
    <div className="space-y-5">
      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard
          label="Tracked MRR"
          value={formatCurrency(report.summary.totalMrr, report.currency)}
          helper="Shopify is connected now. SDK revenue will be added here."
          tone="blue"
        />
        <MetricCard label="Paid Shopify stores" value={formatNumber(report.summary.activePaidStores)} helper="Stores with an active approved billing plan." />
        <MetricCard label="SDK revenue" value="Coming soon" helper="Reserved for direct SDK subscriptions and invoices." />
      </section>

      <section className="rounded-[var(--radius-customer-card)] border border-customer-border bg-customer-card p-5">
        <h3 className="text-lg font-semibold text-text-primary">Full report status</h3>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-text-body">
          This report currently uses Shopify billing records. The SDK tab is ready for the direct SDK revenue source when those invoices are connected.
        </p>
      </section>

      <ShopifyReport report={report} />
    </div>
  );
}

function SdkReport() {
  return (
    <EmptyPanel
      title="SDK revenue is ready for the next data source"
      body="This tab is reserved for direct SDK subscriptions, one-time invoices, and any non-Shopify usage revenue. Shopify revenue is available now in the Shopify tab and the full report."
    />
  );
}

export function RevenuePage({ activeView, shopifyReport }: RevenuePageProps) {
  const updatedLabel = formatDate(shopifyReport.lastUpdatedAt || shopifyReport.generatedAt);

  return (
    <section className="mx-auto max-w-[1500px] space-y-6">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-blue">Financial reports</p>
          <h1 className="mt-2 text-3xl font-semibold leading-tight text-text-primary md:text-4xl">Revenue</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-text-body">
            Clean revenue reporting for Shopify billing today, with room for SDK revenue next.
          </p>
        </div>
        <div className="rounded-full border border-customer-border bg-customer-card px-4 py-2 text-sm text-text-body">
          Updated <span className="font-semibold text-text-primary">{updatedLabel}</span>
        </div>
      </header>

      <RevenueTabs activeView={activeView} />

      {activeView === "full" ? <FullReport report={shopifyReport} /> : null}
      {activeView === "shopify" ? <ShopifyReport report={shopifyReport} /> : null}
      {activeView === "sdk" ? <SdkReport /> : null}
    </section>
  );
}
