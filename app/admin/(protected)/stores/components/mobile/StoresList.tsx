import Link from "next/link";
import { Card } from "@/app/admin/shared/components/Card";
import { StatusPill, SourceBadge } from "@/app/admin/shared/components/StatusPill";
import { EmptyState } from "@/app/admin/shared/components/EmptyState";
import { ShoppingBagIcon } from "@/app/shared/components/icons";
import type { StoresPage } from "@/app/admin/shared/types";
import { StoreRowActions } from "../desktop/StoreRowActions";

interface Props {
  data: StoresPage;
}

export function StoresList({ data }: Props) {
  if (data.stores.length === 0) {
    return (
      <Card>
        <EmptyState
          icon={<ShoppingBagIcon size={20} color="currentColor" />}
          title="No stores match your filters"
          description="Try clearing the search or switching the source tab."
        />
      </Card>
    );
  }

  return (
    <Card bodyClassName="!p-0">
      <ul className="divide-y divide-admin-border-soft">
        {data.stores.map((s) => {
          const display = s.storeName || s.identifier;
          const initial = (display || "?").trim().charAt(0).toUpperCase();
          return (
            <li key={`${s.source}-${s.id}`}>
              <div className="flex items-center gap-3 px-4 py-3">
                <Link
                  href={`/admin/stores/${s.source}/${s.id}`}
                  className="flex items-center gap-3 flex-1 min-w-0"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-blue-pale text-xs font-semibold text-brand-blue">
                    {initial}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-text-primary truncate">
                        {display}
                      </span>
                      <SourceBadge source={s.source} />
                    </div>
                    <div className="text-[11px] text-text-hint truncate mt-0.5">
                      {s.identifier}
                    </div>
                  </div>
                  <StatusPill status={s.status} size="sm" />
                </Link>
                <StoreRowActions store={s} />
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
