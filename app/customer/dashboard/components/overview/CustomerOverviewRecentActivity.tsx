"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import {
  type CustomerOverviewActivityFilter,
  useCustomerOverviewActivity,
} from "../../hooks/useCustomerOverviewActivity";
import type { CustomerOverviewActivityRow, CustomerOverviewActivityStatus } from "../../types/overview";

interface CustomerOverviewRecentActivityProps {
  rows: CustomerOverviewActivityRow[];
}

const filters: Array<{ label: string; value: CustomerOverviewActivityFilter }> = [
  { label: "All", value: "all" },
  { label: "Completed", value: "completed" },
  { label: "Needs review", value: "pending" },
  { label: "Failed", value: "failed" },
];

const statusClassName: Record<CustomerOverviewActivityStatus, string> = {
  completed: "bg-customer-success-bg text-customer-success-text",
  pending: "bg-customer-warning-bg text-customer-warning-text",
  failed: "bg-customer-danger-bg text-customer-danger-text",
};

const dotClassName: Record<CustomerOverviewActivityStatus, string> = {
  completed: "bg-[#36aa62]",
  pending: "bg-[#e6b729]",
  failed: "bg-[#e04d35]",
};

export function CustomerOverviewRecentActivity({ rows }: CustomerOverviewRecentActivityProps) {
  const activity = useCustomerOverviewActivity(rows);

  return (
    <section id="recent-activity" className="rounded-[24px] border border-customer-border bg-customer-card p-5 shadow-[0_16px_44px_rgba(33,84,239,0.06)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-[-0.02em] text-text-primary">Recent activity</h2>
          <p className="mt-1 text-sm text-customer-muted">Latest SDK and dashboard requests</p>
        </div>

        <div className="flex min-w-[320px] flex-wrap items-center gap-2">
          <label className="flex h-11 min-w-[230px] flex-1 items-center gap-2 rounded-full border border-customer-border bg-customer-card px-4 text-sm text-text-body">
            <Search className="h-4 w-4 shrink-0" aria-hidden />
            <input
              value={activity.query}
              onChange={(event) => activity.setQuery(event.target.value)}
              placeholder="Search"
              className="min-w-0 flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-customer-muted"
            />
          </label>

          <div className="flex items-center gap-1 rounded-full border border-customer-border bg-customer-card p-1">
            <SlidersHorizontal className="ml-2 h-4 w-4 text-brand-blue" aria-hidden />
            {filters.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => activity.setFilter(filter.value)}
                className={`h-8 rounded-full px-3 text-xs font-semibold transition-colors ${
                  activity.filter === filter.value
                    ? "bg-brand-blue text-white"
                    : "text-text-body hover:bg-customer-blue hover:text-brand-blue"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-[18px] border border-customer-border">
        <table className="w-full min-w-[760px] border-collapse text-left text-sm">
          <thead className="bg-customer-blue text-xs font-semibold uppercase tracking-[0.06em] text-customer-muted">
            <tr>
              <th className="w-12 px-4 py-3">
                <span className="sr-only">Select</span>
              </th>
              <th className="px-4 py-3">Request ID</th>
              <th className="px-4 py-3">Activity</th>
              <th className="px-4 py-3">Latency</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-customer-border bg-customer-card">
            {activity.visibleRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-sm text-customer-muted">
                  {rows.length === 0 ? "No SDK or dashboard activity in this range yet." : "No activity matches this filter."}
                </td>
              </tr>
            ) : (
              activity.visibleRows.map((row, index) => (
                <tr key={row.id} className={index % 2 === 0 ? "bg-customer-card" : "bg-customer-blue/30"}>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      aria-label={`Select ${row.requestId}`}
                      className="h-4 w-4 rounded border-customer-border accent-brand-blue"
                    />
                  </td>
                  <td className="px-4 py-3 font-medium tabular-nums text-text-primary">{row.requestId}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-text-primary">{row.activity}</p>
                    <p className="mt-0.5 text-xs text-customer-muted">{row.detail}</p>
                  </td>
                  <td className="px-4 py-3 tabular-nums text-text-primary">{row.value}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${statusClassName[row.status]}`}>
                      <span className={`h-1.5 w-1.5 rounded-full ${dotClassName[row.status]}`} />
                      {row.statusLabel}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-body">{row.dateLabel}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
