import type { BugReportItem, BugReportStatCard, BugReportsViewModel } from "../types";

interface BugReportsPageProps {
  view: BugReportsViewModel;
  sentryProjectUrl?: string | null;
}

function StatGrid({ stats }: { stats: BugReportStatCard[] }) {
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

function BugReportCard({ item }: { item: BugReportItem }) {
  return (
    <article className="grid gap-4 border-t border-customer-border p-5 xl:grid-cols-[180px_minmax(0,1fr)_240px]">
      <div className="min-w-0">
        <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${item.severityTone}`}>
          {item.severityLabel}
        </span>
        <p className="mt-3 text-sm font-semibold text-brand-blue">{item.sourceLabel}</p>
        <p className="mt-1 text-sm text-customer-muted">{item.dateLabel}</p>
      </div>

      <div className="min-w-0">
        <h3 className="text-lg font-semibold text-text-primary">{item.title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-text-body">{item.summary}</p>
        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.1em] text-customer-muted">{item.categoryLabel}</p>
        <div className="mt-4 rounded-xl bg-customer-soft p-4">
          <p className="text-sm font-semibold text-text-primary">{item.productTitle}</p>
          <p className="mt-1 text-xs text-customer-muted">{item.productMeta}</p>
          <p className="mt-2 text-xs text-text-body">{item.visitorLabel} · {item.deviceLabel}</p>
          {item.productUrl ? (
            <a href={item.productUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-xs font-semibold text-brand-blue">
              Open product
            </a>
          ) : null}
        </div>
      </div>

      {item.previewUrl ? (
        <img
          src={item.previewUrl}
          alt="Flagged try-on preview"
          className="h-[220px] w-full rounded-2xl border border-customer-border bg-surface-light object-cover"
        />
      ) : (
        <div className="flex h-[220px] items-center justify-center rounded-2xl border border-dashed border-customer-border bg-surface-light text-sm text-customer-muted">
          No preview
        </div>
      )}
    </article>
  );
}

export function BugReportsPage({ view, sentryProjectUrl }: BugReportsPageProps) {
  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-blue">Monitoring</p>
          <h2 className="mt-2 text-3xl font-semibold leading-tight text-text-primary lg:text-4xl">Bug Reports</h2>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-text-body lg:text-base">
            AI visual QA flags and internal runtime reports. Deep stack traces stay in Sentry when configured.
          </p>
        </div>
        {sentryProjectUrl ? (
          <a
            href={sentryProjectUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex rounded-full border border-customer-border bg-customer-card px-4 py-2 text-sm font-semibold text-brand-blue hover:border-brand-blue/50"
          >
            Open Sentry
          </a>
        ) : null}
      </div>

      <StatGrid stats={view.stats} />

      <section className="overflow-hidden rounded-[var(--radius-customer-card)] border border-customer-border bg-customer-card">
        {view.hasItems ? (
          view.items.map((item) => <BugReportCard key={item.id} item={item} />)
        ) : (
          <div className="p-8 text-center">
            <p className="text-lg font-semibold text-text-primary">No bug reports yet</p>
            <p className="mt-2 text-sm text-text-body">AI QA flags and runtime issues will appear here.</p>
          </div>
        )}
      </section>
    </section>
  );
}
