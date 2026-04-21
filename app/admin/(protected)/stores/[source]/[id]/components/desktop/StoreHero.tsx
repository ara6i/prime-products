import Link from "next/link";
import { StatusPill, SourceBadge } from "@/app/admin/shared/components/StatusPill";
import { ArrowLeftIcon } from "@/app/shared/components/icons";
import type { StoreDetail } from "@/app/admin/shared/types";

interface Props {
  detail: StoreDetail;
}

export function StoreHero({ detail }: Props) {
  return (
    <div className="flex flex-col gap-[var(--spacing-admin-gap-sm)]">
      <Link
        href="/admin/stores"
        className="inline-flex items-center gap-[0.313vw] text-[0.625vw] text-text-body hover:text-brand-blue transition-colors self-start"
      >
        <ArrowLeftIcon size={12} className="!w-[0.521vw] !h-[0.521vw]" color="currentColor" />
        Back to stores
      </Link>

      <div className="flex items-center gap-[0.521vw] flex-wrap">
        <SourceBadge source={detail.store.source} />
        <span className="text-[0.677vw] text-text-body font-mono">{detail.store.identifier}</span>
        {detail.store.ownerEmail && (
          <>
            <span className="text-text-hint">·</span>
            <span className="text-[0.677vw] text-text-body">{detail.store.ownerEmail}</span>
          </>
        )}
        <span className="text-text-hint">·</span>
        <StatusPill status={detail.store.status} size="sm" />
      </div>
    </div>
  );
}
