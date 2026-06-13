"use client";

import { useMemo, useState } from "react";
import type { BugReportItem, BugReportsViewModel } from "../types";

interface BugReportsPageProps {
  view: BugReportsViewModel;
  sentryProjectUrl?: string | null;
}

type BugTab = "tryon" | "runtime";

function EmptyState({ activeTab }: { activeTab: BugTab }) {
  return (
    <div className="p-8 text-center">
      <p className="text-base font-semibold text-text-primary">
        {activeTab === "tryon" ? "No try-on issues" : "No bug reports"}
      </p>
    </div>
  );
}

function ReportsTable({ items, onView }: { items: BugReportItem[]; onView: (item: BugReportItem) => void }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] text-left text-sm">
        <thead className="border-b border-customer-border bg-customer-soft text-xs font-semibold uppercase tracking-[0.1em] text-customer-muted">
          <tr>
            <th className="px-4 py-3">Severity</th>
            <th className="px-4 py-3">Issue</th>
            <th className="px-4 py-3">Product</th>
            <th className="px-4 py-3">Context</th>
            <th className="px-4 py-3">Last seen</th>
            <th className="px-4 py-3 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-customer-border">
          {items.map((item) => (
            <tr key={item.id} className="align-top">
              <td className="px-4 py-4">
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${item.severityTone}`}>
                  {item.severityLabel}
                </span>
              </td>
              <td className="max-w-[280px] px-4 py-4">
                <p className="font-semibold text-text-primary">{item.title}</p>
                <p className="mt-1 line-clamp-2 text-xs text-text-body">{item.summary}</p>
              </td>
              <td className="max-w-[220px] px-4 py-4">
                <p className="font-semibold text-text-primary">{item.productTitle}</p>
                <p className="mt-1 text-xs text-customer-muted">{item.productMeta}</p>
              </td>
              <td className="max-w-[220px] px-4 py-4 text-xs text-text-body">
                <p>{item.sourceLabel}</p>
                <p className="mt-1">{item.deviceLabel}</p>
                <p className="mt-1">{item.visitorLabel}</p>
              </td>
              <td className="px-4 py-4 text-xs text-customer-muted">{item.dateLabel}</td>
              <td className="px-4 py-4 text-right">
                <button
                  type="button"
                  onClick={() => onView(item)}
                  className="inline-flex rounded-lg border border-customer-border px-3 py-2 text-xs font-semibold text-brand-blue hover:border-brand-blue/50"
                >
                  View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DetailDialog({ item, onClose }: { item: BugReportItem; onClose: () => void }) {
  const details = [
    ["Source", item.sourceLabel],
    ["Status", item.status],
    ["Categories", item.categoryLabel],
    ["Product", item.productMeta],
    ["Store", item.storeLabel],
    ["Profile", item.profileLabel],
    ["Visitor", item.visitorLabel],
    ["Device", item.deviceLabel],
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[var(--radius-customer-card)] border border-customer-border bg-customer-card shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-customer-border p-5">
          <div>
            <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${item.severityTone}`}>
              {item.severityLabel}
            </span>
            <h3 className="mt-3 text-lg font-semibold text-text-primary">{item.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-text-body">{item.summary}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg border border-customer-border px-3 py-2 text-sm font-semibold text-text-body">
            Close
          </button>
        </div>

        <div className="grid gap-4 p-5 lg:grid-cols-[minmax(0,1fr)_220px]">
          <dl className="grid gap-3 sm:grid-cols-2">
            {details.map(([label, value]) => (
              <div key={label} className="rounded-lg bg-customer-soft p-3">
                <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-customer-muted">{label}</dt>
                <dd className="mt-1 break-words text-sm text-text-primary">{value || "None"}</dd>
              </div>
            ))}
          </dl>

          {item.previewUrl ? (
            <img src={item.previewUrl} alt="Flagged try-on preview" className="h-[220px] w-full rounded-lg border border-customer-border object-cover" />
          ) : (
            <div className="flex h-[220px] items-center justify-center rounded-lg border border-dashed border-customer-border text-sm text-customer-muted">
              No preview
            </div>
          )}
        </div>

        {item.productUrl ? (
          <div className="border-t border-customer-border p-5">
            <a href={item.productUrl} target="_blank" rel="noreferrer" className="text-sm font-semibold text-brand-blue">
              Open product
            </a>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function BugReportsPage({ view, sentryProjectUrl }: BugReportsPageProps) {
  const [activeTab, setActiveTab] = useState<BugTab>("tryon");
  const [selectedItem, setSelectedItem] = useState<BugReportItem | null>(null);

  const tryOnItems = useMemo(() => view.items.filter((item) => item.source === "visual-qa"), [view.items]);
  const runtimeItems = useMemo(() => view.items.filter((item) => item.source !== "visual-qa"), [view.items]);
  const activeItems = activeTab === "tryon" ? tryOnItems : runtimeItems;

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-blue">Monitoring</p>
          <h2 className="mt-2 text-3xl font-semibold leading-tight text-text-primary lg:text-4xl">Bug Reports</h2>
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

      <div className="inline-flex rounded-lg border border-customer-border bg-customer-card p-1">
        {([
          ["tryon", "Try-on issues", tryOnItems.length],
          ["runtime", "Bug reports", runtimeItems.length],
        ] as const).map(([id, label, count]) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`rounded-md px-4 py-2 text-sm font-semibold ${activeTab === id ? "bg-brand-blue text-white" : "text-text-body hover:text-text-primary"}`}
          >
            {label} · {count}
          </button>
        ))}
      </div>

      <section className="overflow-hidden rounded-[var(--radius-customer-card)] border border-customer-border bg-customer-card">
        {activeItems.length ? <ReportsTable items={activeItems} onView={setSelectedItem} /> : <EmptyState activeTab={activeTab} />}
      </section>

      {selectedItem ? <DetailDialog item={selectedItem} onClose={() => setSelectedItem(null)} /> : null}
    </section>
  );
}
