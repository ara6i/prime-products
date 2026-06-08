import type { BehaviorRow, BehaviorStatCard, BehaviorViewModel } from "../types";

interface BehaviorPageProps {
  view: BehaviorViewModel;
  clarityProjectId?: string | null;
}

function StatGrid({ stats }: { stats: BehaviorStatCard[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {stats.map((stat) => (
        <article key={stat.label} className="rounded-[var(--radius-customer-card)] border border-customer-border bg-customer-card p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-customer-muted">{stat.label}</p>
          <p className="mt-3 text-3xl font-semibold leading-none text-text-primary">{stat.value}</p>
          <p className="mt-3 text-sm leading-relaxed text-text-body">{stat.helper}</p>
        </article>
      ))}
    </div>
  );
}

function RowList({ title, rows, emptyText }: { title: string; rows: BehaviorRow[]; emptyText: string }) {
  return (
    <section className="rounded-[var(--radius-customer-card)] border border-customer-border bg-customer-card p-5">
      <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
      <div className="mt-4 divide-y divide-customer-border">
        {rows.length ? (
          rows.map((row) => (
            <div key={`${row.label}-${row.helper ?? ""}`} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-text-primary">{row.label}</p>
                {row.helper ? <p className="mt-1 truncate text-xs text-customer-muted">{row.helper}</p> : null}
              </div>
              <p className="shrink-0 text-sm font-semibold text-brand-blue">{row.value}</p>
            </div>
          ))
        ) : (
          <p className="rounded-xl bg-customer-soft px-4 py-5 text-sm text-text-body">{emptyText}</p>
        )}
      </div>
    </section>
  );
}

function ReplayCard({ clarityProjectId }: { clarityProjectId?: string | null }) {
  const href = clarityProjectId
    ? `https://clarity.microsoft.com/projects/view/${encodeURIComponent(clarityProjectId)}/dashboard`
    : null;

  return (
    <section className="rounded-[var(--radius-customer-card)] border border-customer-border bg-customer-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">Session replay</h3>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-text-body">
            We track behavior events here. Full shopper replays stay in Microsoft Clarity; search by the SDK session property <span className="font-semibold text-text-primary">ps_session</span>.
          </p>
        </div>
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex rounded-full border border-customer-border bg-customer-card px-4 py-2 text-sm font-semibold text-brand-blue hover:border-brand-blue/50"
          >
            Open Clarity
          </a>
        ) : null}
      </div>
    </section>
  );
}

export function BehaviorPage({ view, clarityProjectId }: BehaviorPageProps) {
  return (
    <section className="space-y-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-blue">Monitoring</p>
        <h2 className="mt-2 text-3xl font-semibold leading-tight text-text-primary lg:text-4xl">User Behavior</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-text-body lg:text-base">
          Shopper sessions, try-on funnel, devices, countries, and product activity. {view.rangeLabel}.
        </p>
      </div>

      <StatGrid stats={view.stats} />
      <ReplayCard clarityProjectId={clarityProjectId} />

      <div className="grid gap-4 xl:grid-cols-2">
        <RowList title="Funnel" rows={view.funnel} emptyText="No funnel events yet." />
        <RowList title="Top products" rows={view.topProducts} emptyText="No product activity yet." />
        <RowList title="Devices" rows={view.devices} emptyText="No device data yet." />
        <RowList title="Countries" rows={view.countries} emptyText="No country data yet." />
      </div>
    </section>
  );
}
