import Link from "next/link";
import { EmptyState } from "@/app/admin/shared/components/EmptyState";
import { StatusPill, SourceBadge } from "@/app/admin/shared/components/StatusPill";
import { ShoppingBagIcon } from "@/app/shared/components/icons";
import type { StoresPage } from "@/app/admin/shared/types";
import { StoreRowActions } from "./StoreRowActions";

interface Props {
  data: StoresPage;
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function StoresTable({ data }: Props) {
  if (data.stores.length === 0) {
    return (
      <div className="bg-admin-surface-card rounded-[var(--radius-admin-card)] shadow-admin-card">
        <EmptyState
          icon={<ShoppingBagIcon size={20} className="!w-[1.042vw] !h-[1.042vw]" color="currentColor" />}
          title="No stores match your filters"
          description="Try clearing the search or switching the source tab above."
        />
      </div>
    );
  }

  const thClass =
    "py-[0.521vw] px-[0.625vw] text-[0.573vw] font-semibold tracking-[0.06em] text-text-hint uppercase text-left whitespace-nowrap";
  const tdClass = "py-[0.521vw] px-[0.625vw] text-admin-sm text-text-body align-middle";

  return (
    <div className="bg-admin-surface-card rounded-[var(--radius-admin-card)] shadow-admin-card overflow-hidden">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-admin-muted/50 border-b border-admin-border-soft">
            <th className={`${thClass} pl-[var(--spacing-admin-card)]`}>Store</th>
            <th className={thClass}>Source</th>
            <th className={thClass}>Owner</th>
            <th className={thClass}>Plan</th>
            <th className={thClass}>Status</th>
            <th className={`${thClass} text-right`}>Installed</th>
            <th className={`${thClass} pr-[var(--spacing-admin-card)] text-right`}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.stores.map((s) => {
            const display = s.storeName || s.identifier;
            const initial = (display || "?").trim().charAt(0).toUpperCase();

            return (
              <tr
                key={`${s.source}-${s.id}`}
                className="border-b border-admin-border-soft last:border-0 hover:bg-admin-row-hover/60 transition-colors"
              >
                <td className={`${tdClass} pl-[var(--spacing-admin-card)]`}>
                  <Link
                    href={`/admin/stores/${s.source}/${s.id}`}
                    className="flex items-center gap-[0.521vw] group min-w-0"
                  >
                    <span className="flex h-[1.458vw] w-[1.458vw] shrink-0 items-center justify-center rounded-full bg-brand-blue-pale text-[0.625vw] font-semibold text-brand-blue">
                      {initial}
                    </span>
                    <span className="flex flex-col min-w-0">
                      <span className="text-admin-sm font-medium text-text-primary truncate group-hover:text-brand-blue transition-colors leading-tight">
                        {display}
                      </span>
                      <span className="text-[0.625vw] text-text-hint truncate leading-tight">
                        {s.identifier}
                      </span>
                    </span>
                  </Link>
                </td>
                <td className={tdClass}>
                  <SourceBadge source={s.source} />
                </td>
                <td className={`${tdClass} max-w-[13vw] truncate`}>{s.ownerEmail ?? "—"}</td>
                <td className={`${tdClass} capitalize`}>{s.plan ?? "—"}</td>
                <td className={tdClass}>
                  <StatusPill status={s.status} size="sm" />
                </td>
                <td className={`${tdClass} text-right tabular-nums whitespace-nowrap`}>
                  {formatDate(s.installedAt)}
                </td>
                <td className={`${tdClass} pr-[var(--spacing-admin-card)] text-right`}>
                  <StoreRowActions store={s} />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
