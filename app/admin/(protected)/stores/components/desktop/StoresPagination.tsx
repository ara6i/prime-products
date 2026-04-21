"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/app/shared/lib/utils";

interface Props {
  page: number;
  totalPages: number;
  total: number;
  className?: string;
}

export function StoresPagination({ page, totalPages, total, className }: Props) {
  const router = useRouter();
  const params = useSearchParams();

  // No footer when there's only one page — the result count is shown
  // inline in the filter bar already.
  if (totalPages <= 1) return null;

  const go = (next: number) => {
    const nextParams = new URLSearchParams(params.toString());
    if (next <= 1) nextParams.delete("page");
    else nextParams.set("page", String(next));
    router.replace(`/admin/stores?${nextParams.toString()}`);
  };

  const btnBase =
    "inline-flex items-center justify-center h-[1.563vw] px-[0.625vw] rounded-[0.313vw] border border-admin-border bg-admin-surface-card text-[0.677vw] font-medium text-text-body hover:bg-admin-row-hover hover:text-text-primary transition-colors disabled:opacity-40 disabled:pointer-events-none max-lg:h-8 max-lg:px-3 max-lg:rounded-md max-lg:text-sm";

  return (
    <div className={cn("flex items-center justify-between gap-[0.625vw]", className)}>
      <span className="text-[0.625vw] text-text-hint max-lg:text-[11px]">
        Page <span className="font-medium text-text-primary">{page}</span> of {totalPages}
        <span className="mx-[0.313vw] max-lg:mx-1.5">·</span>
        {total.toLocaleString()} total
      </span>
      <div className="flex items-center gap-[0.313vw] max-lg:gap-2">
        <button
          type="button"
          onClick={() => go(Math.max(1, page - 1))}
          disabled={page <= 1}
          className={btnBase}
        >
          ← Previous
        </button>
        <button
          type="button"
          onClick={() => go(Math.min(totalPages, page + 1))}
          disabled={page >= totalPages}
          className={btnBase}
        >
          Next →
        </button>
      </div>
    </div>
  );
}
