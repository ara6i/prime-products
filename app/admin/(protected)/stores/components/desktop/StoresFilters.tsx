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

export function StoresFilters({ total }: Props) {
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
    <div className="flex items-center justify-between gap-[0.625vw]">
      <div className="flex items-center gap-[0.833vw] flex-1 min-w-0">
        {/* Source tabs — Linear/Shopify style, underline under the active one */}
        <div className="inline-flex items-center h-[1.667vw] border-b border-admin-border">
          {sources.map((s) => {
            const active = currentSource === s.value;
            return (
              <button
                key={s.value}
                type="button"
                onClick={() => commit({ source: s.value === "all" ? null : s.value })}
                className={cn(
                  "h-full px-[0.625vw] text-[0.677vw] font-medium transition-colors border-b-[0.104vw] -mb-[0.052vw]",
                  active
                    ? "text-text-primary border-brand-blue"
                    : "text-text-body border-transparent hover:text-text-primary",
                )}
              >
                {s.label}
              </button>
            );
          })}
        </div>

        {typeof total === "number" && (
          <span className="text-[0.625vw] text-text-hint tabular-nums">
            {total.toLocaleString()} {total === 1 ? "result" : "results"}
          </span>
        )}
      </div>

      <form
        className="w-[18vw] max-w-full relative"
        onSubmit={(e) => {
          e.preventDefault();
          const form = e.currentTarget;
          const value = (form.elements.namedItem("search") as HTMLInputElement | null)?.value ?? "";
          commit({ search: value.trim() || null });
        }}
      >
        <span className="absolute left-[0.521vw] top-1/2 -translate-y-1/2 text-text-hint pointer-events-none">
          <SearchIcon size={12} className="!w-[0.625vw] !h-[0.625vw]" color="currentColor" />
        </span>
        <input
          key={currentSearch}
          name="search"
          type="search"
          defaultValue={currentSearch}
          placeholder="Search…"
          className="w-full h-[1.667vw] pl-[1.563vw] pr-[0.521vw] rounded-[0.313vw] border border-admin-border bg-admin-surface-card text-[0.677vw] text-text-primary placeholder:text-text-hint focus:outline-none focus:border-brand-blue focus:ring-[0.052vw] focus:ring-brand-blue-pale transition-colors"
        />
      </form>
    </div>
  );
}
