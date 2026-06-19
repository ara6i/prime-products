"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { Maximize2, X } from "lucide-react";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/app/shared/components/ui/dialog";
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

function ReportsTable({
  items,
  onView,
  onPreviewImage,
}: {
  items: BugReportItem[];
  onView: (item: BugReportItem) => void;
  onPreviewImage: (item: BugReportItem) => void;
}) {
  const showPreviewColumn = items.some((item) => item.source === "visual-qa" && item.previewUrl);

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px] text-left text-sm">
        <thead className="border-b border-customer-border bg-customer-soft text-xs font-semibold uppercase tracking-[0.1em] text-customer-muted">
          <tr>
            <th className="px-4 py-3">Severity</th>
            {showPreviewColumn ? <th className="px-4 py-3">Generated image</th> : null}
            <th className="px-4 py-3">Issue</th>
            <th className="px-4 py-3">Store</th>
            <th className="px-4 py-3">Platform</th>
            <th className="px-4 py-3">Date / time</th>
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
              {showPreviewColumn ? (
                <td className="px-4 py-4">
                  {item.source === "visual-qa" && item.previewUrl ? (
                    <button
                      type="button"
                      onClick={() => onPreviewImage(item)}
                      className="group relative block overflow-hidden rounded-xl border border-customer-border bg-slate-950"
                      aria-label={`Open generated image full screen for ${item.title}`}
                    >
                      <Image
                        src={item.previewUrl}
                        alt="Generated try-on issue preview"
                        width={64}
                        height={80}
                        className="h-20 w-16 object-contain"
                        loading="lazy"
                        unoptimized
                      />
                      <span className="absolute inset-0 flex items-center justify-center bg-slate-950/0 text-white opacity-0 transition group-hover:bg-slate-950/45 group-hover:opacity-100">
                        <Maximize2 className="h-4 w-4" />
                      </span>
                    </button>
                  ) : (
                    <span className="text-xs text-customer-muted">No image</span>
                  )}
                </td>
              ) : null}
              <td className="max-w-[280px] px-4 py-4">
                <p className="font-semibold text-text-primary">{item.title}</p>
                <p className="mt-1 line-clamp-2 text-xs text-text-body">{item.summary}</p>
              </td>
              <td className="max-w-[220px] px-4 py-4">
                <p className="font-semibold text-text-primary">{item.storeLabel}</p>
              </td>
              <td className="px-4 py-4 text-xs text-text-body">
                <span className="inline-flex rounded-full bg-customer-soft px-2.5 py-1 font-semibold text-brand-blue">
                  {item.platformLabel}
                </span>
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

function FullScreenImageDialog({
  item,
  open,
  onOpenChange,
}: {
  item: BugReportItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const previewUrl = item?.previewUrl;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="h-[calc(100svh-1rem)] w-[calc(100vw-1rem)] max-w-[calc(100vw-1rem)] overflow-hidden rounded-[28px] border border-white/10 bg-slate-950 p-0 shadow-[0_40px_140px_rgba(0,0,0,0.65)] sm:max-w-[calc(100vw-1rem)]"
      >
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex items-start justify-between gap-4 border-b border-white/10 bg-slate-950/95 px-5 py-4 text-white">
            <div className="min-w-0">
              <DialogTitle className="truncate text-base font-semibold text-white">
                {item?.title ?? "Generated try-on image"}
              </DialogTitle>
              <DialogDescription className="mt-1 truncate text-sm text-slate-300">
                {item ? `${item.storeLabel} · ${item.dateLabel}` : "Full-screen admin image preview"}
              </DialogDescription>
            </div>
            <DialogClose asChild>
              <button
                type="button"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white transition hover:bg-white/20"
                aria-label="Close full-screen image"
              >
                <X className="h-5 w-5" />
              </button>
            </DialogClose>
          </div>

          <div className="flex min-h-0 flex-1 items-center justify-center p-3 sm:p-5">
            {previewUrl ? (
              <div className="relative h-full w-full">
                <Image
                  src={previewUrl}
                  alt="Full-screen generated try-on image flagged by AI QA"
                  fill
                  sizes="100vw"
                  className="rounded-2xl object-contain"
                  priority
                  unoptimized
                />
              </div>
            ) : (
              <div className="flex h-full w-full items-center justify-center rounded-2xl border border-dashed border-slate-700 text-center text-sm text-slate-300">
                Generated image was not captured for this QA issue.
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function DetailDialog({
  item,
  onClose,
  onPreviewImage,
}: {
  item: BugReportItem;
  onClose: () => void;
  onPreviewImage: (item: BugReportItem) => void;
}) {
  const isVisualQaIssue = item.isVisualTryOnIssue;
  const details = [
    ["Platform", item.platformLabel],
    ["Store", item.storeLabel],
    ["Date / time", item.dateLabel],
    ["Issue", item.summary],
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

        <div className={`grid gap-4 p-5 ${isVisualQaIssue ? "lg:grid-cols-[minmax(0,1fr)_300px]" : ""}`}>
          <dl className="grid gap-3 sm:grid-cols-2">
            {details.map(([label, value]) => (
              <div key={label} className="rounded-lg bg-customer-soft p-3">
                <dt className="text-xs font-semibold uppercase tracking-[0.1em] text-customer-muted">{label}</dt>
                <dd className="mt-1 break-words text-sm text-text-primary">{value || "None"}</dd>
              </div>
            ))}
          </dl>

          {isVisualQaIssue ? (
            <figure className="rounded-2xl border border-customer-border bg-slate-950 p-3">
              {item.previewUrl ? (
                <button
                  type="button"
                  onClick={() => onPreviewImage(item)}
                  className="group relative block w-full overflow-hidden rounded-xl"
                  aria-label={`Open generated image full screen for ${item.title}`}
                >
                  <Image
                    src={item.previewUrl}
                    alt="Generated try-on image flagged by AI QA"
                    width={520}
                    height={520}
                    className="h-[420px] w-full rounded-xl object-contain transition duration-300 group-hover:scale-[1.01]"
                    unoptimized
                  />
                  <span className="absolute bottom-3 right-3 inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-semibold text-slate-950 shadow-lg">
                    <Maximize2 className="h-3.5 w-3.5" />
                    Full screen
                  </span>
                </button>
              ) : (
                <div className="flex h-[260px] items-center justify-center rounded-xl border border-dashed border-slate-700 text-center text-sm text-slate-300">
                  Generated image was not captured for this QA issue.
                </div>
              )}
              <figcaption className="mt-3 text-xs font-semibold uppercase tracking-[0.12em] text-slate-300">
                Generated try-on image
              </figcaption>
            </figure>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function BugReportsPage({ view, sentryProjectUrl }: BugReportsPageProps) {
  const [activeTab, setActiveTab] = useState<BugTab>("tryon");
  const [selectedItem, setSelectedItem] = useState<BugReportItem | null>(null);
  const [fullScreenItem, setFullScreenItem] = useState<BugReportItem | null>(null);

  const tryOnItems = useMemo(() => view.items.filter((item) => item.isVisualTryOnIssue), [view.items]);
  const runtimeItems = useMemo(() => view.items.filter((item) => !item.isVisualTryOnIssue), [view.items]);
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
        {activeItems.length ? (
          <ReportsTable
            items={activeItems}
            onView={setSelectedItem}
            onPreviewImage={setFullScreenItem}
          />
        ) : <EmptyState activeTab={activeTab} />}
      </section>

      {selectedItem ? (
        <DetailDialog
          item={selectedItem}
          onClose={() => setSelectedItem(null)}
          onPreviewImage={setFullScreenItem}
        />
      ) : null}
      <FullScreenImageDialog
        item={fullScreenItem}
        open={Boolean(fullScreenItem)}
        onOpenChange={(open) => {
          if (!open) setFullScreenItem(null);
        }}
      />
    </section>
  );
}
