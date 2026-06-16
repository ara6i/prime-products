"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Eye, Search } from "lucide-react";
import type { ProfileUserListItem, ProfileUsersViewModel } from "../types";

interface UsersPageProps {
  view: ProfileUsersViewModel;
}

function matchesSearch(item: ProfileUserListItem, query: string): boolean {
  if (!query) return true;
  const raw = item.raw;
  return [
    item.profileLabel,
    item.accountLabel,
    item.sourceLabel,
    item.originLabel,
    item.deviceLabel,
    item.countryLabel,
    raw.profileId,
    raw.userId,
    raw.sessionId,
    raw.storeName,
    raw.storeDomain,
    raw.productTitle,
    raw.productId,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(query);
}

function UsersTable({ items }: { items: ProfileUserListItem[] }) {
  if (!items.length) {
    return (
      <div className="p-8 text-center">
        <p className="text-base font-semibold text-text-primary">No users found</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[920px] text-left text-sm">
        <thead className="border-b border-customer-border bg-customer-soft text-xs font-semibold uppercase tracking-[0.1em] text-customer-muted">
          <tr>
            <th className="px-4 py-3">User</th>
            <th className="px-4 py-3">Source</th>
            <th className="px-4 py-3">Origin</th>
            <th className="px-4 py-3">Device</th>
            <th className="px-4 py-3">Activity</th>
            <th className="px-4 py-3 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-customer-border">
          {items.map((item) => (
            <tr key={item.id} className="align-top">
              <td className="max-w-[270px] px-4 py-4">
                <p className="truncate font-semibold text-text-primary">{item.profileLabel}</p>
                <p className="mt-1 truncate text-xs text-customer-muted">{item.accountLabel}</p>
              </td>
              <td className="px-4 py-4">
                <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${item.sourceTone}`}>
                  {item.sourceLabel}
                </span>
              </td>
              <td className="max-w-[230px] px-4 py-4">
                <p className="truncate font-semibold text-text-primary">{item.originLabel}</p>
                <p className="mt-1 truncate text-xs text-customer-muted">{item.raw.storeName || item.raw.productTitle || "No store/product"}</p>
              </td>
              <td className="max-w-[220px] px-4 py-4">
                <p className="truncate text-text-body">{item.deviceLabel}</p>
                <p className="mt-1 truncate text-xs text-customer-muted">{item.countryLabel}</p>
              </td>
              <td className="px-4 py-4">
                <p className="font-medium text-text-primary">{item.activityLabel}</p>
                <p className="mt-1 text-xs text-customer-muted">{item.lastSeenLabel}</p>
              </td>
              <td className="px-4 py-4 text-right">
                <Link
                  href={`/admin/users/${encodeURIComponent(item.id)}`}
                  className="inline-flex items-center gap-2 rounded-lg border border-customer-border px-3 py-2 text-xs font-semibold text-brand-blue hover:border-brand-blue/50"
                >
                  <Eye className="h-4 w-4" />
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function UsersPage({ view }: UsersPageProps) {
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();
  const filteredItems = useMemo(
    () => view.items.filter((item) => matchesSearch(item, normalizedQuery)),
    [normalizedQuery, view.items],
  );

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand-blue">Admin</p>
          <h2 className="mt-2 text-3xl font-semibold leading-tight text-text-primary lg:text-4xl">Users</h2>
          <p className="mt-2 text-sm text-customer-muted">
            {view.summary.total.toLocaleString("en-US")} profiles · {view.summary.loggedInProfiles.toLocaleString("en-US")} logged in
          </p>
        </div>

        <label className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-customer-muted" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search users"
            className="h-11 w-full rounded-lg border border-customer-border bg-customer-card pl-10 pr-3 text-sm text-text-primary outline-none focus:border-brand-blue/60"
          />
        </label>
      </div>

      <section className="overflow-hidden rounded-[var(--radius-customer-card)] border border-customer-border bg-customer-card">
        <UsersTable items={filteredItems} />
      </section>
    </section>
  );
}
