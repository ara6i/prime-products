"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { cn } from "@/app/shared/lib/utils";
import { SearchIcon } from "@/app/shared/components/icons";

const sources: Array<{ value: "all" | "shopify" | "sdk"; label: string }> = [
  { value: "all", label: "All" },
  { value: "shopify", label: "Shopify" },
  { value: "sdk", label: "SDK" },
];

interface Props {
  total?: number;
}

export function StoresFiltersMobile({ total }: Props) {
  const router = useRouter();
  const params = useSearchParams();
  const currentSearch = params.get("search") ?? "";
  const currentSource = (params.get("source") as "all" | "shopify" | "sdk" | null) ?? "all";

  const commit = useCallback(
    (patch: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v === null || v === "") next.delete(k);
        else next.set(k, v);
      }
      next.delete("page");
      router.replace(`/admin/stores?${next.toString()}`);
    },
    [params, router],
  );

  return (
    <div className="flex flex-col gap-2.5">
      <form
        className="relative"
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const value = (form.elements.namedItem("search") as HTMLInputElement | null)?.value ?? "";
          commit({ search: value.trim() || null });
        }}
      >
        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-hint pointer-events-none">
          <SearchIcon size={14} color="currentColor" />
        </span>
        <input
          key={currentSearch}
          name="search"
          type="search"
          defaultValue={currentSearch}
          placeholder="Search…"
          className="w-full h-9 pl-8 pr-3 rounded-lg border border-admin-border bg-admin-surface-card text-[13px] text-text-primary placeholder:text-text-hint focus:outline-none focus:border-brand-blue"
        />
      </form>

      <div className="flex items-center justify-between gap-3">
        <div className="inline-flex items-center h-8 border-b border-admin-border">
          {sources.map((s) => {
            const active = currentSource === s.value;
            return (
              <button
                key={s.value}
                type="button"
                onClick={() => commit({ source: s.value === "all" ? null : s.value })}
                className={cn(
                  "h-full px-3 text-[13px] font-medium transition-colors border-b-2 -mb-px",
                  active
                    ? "text-text-primary border-brand-blue"
                    : "text-text-body border-transparent",
                )}
              >
                {s.label}
              </button>
            );
          })}
        </div>
        {typeof total === "number" && (
          <span className="text-[11px] text-text-hint tabular-nums">
            {total.toLocaleString()} {total === 1 ? "result" : "results"}
          </span>
        )}
      </div>
    </div>
  );
}
