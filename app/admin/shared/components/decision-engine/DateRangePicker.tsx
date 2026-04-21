"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { DropdownMenu } from "radix-ui";
import { Calendar, ChevronDown } from "lucide-react";
import { cn } from "@/app/shared/lib/utils";

const RANGES: Array<{ value: "7d" | "30d" | "90d"; label: string }> = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
];

export function DateRangePicker() {
  const router = useRouter();
  const params = useSearchParams();
  const current = (params.get("range") as "7d" | "30d" | "90d" | null) ?? "30d";
  const currentLabel = RANGES.find((r) => r.value === current)?.label ?? "Last 30 days";

  const select = (value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value === "30d") next.delete("range");
    else next.set("range", value);
    router.replace(`?${next.toString()}`);
  };

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-[0.417vw] h-[1.979vw] px-[0.833vw] rounded-[0.521vw] border border-admin-border bg-admin-surface-card text-admin-sm font-medium text-text-primary hover:bg-admin-row-hover transition-colors outline-none max-lg:h-9 max-lg:px-3 max-lg:rounded-xl max-lg:text-sm max-lg:gap-2"
        >
          <Calendar className="!w-[0.833vw] !h-[0.833vw] text-text-body max-lg:!w-4 max-lg:!h-4" strokeWidth={1.8} />
          <span>{currentLabel}</span>
          <ChevronDown className="!w-[0.729vw] !h-[0.729vw] text-text-hint max-lg:!w-4 max-lg:!h-4" strokeWidth={1.8} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={4}
          className="z-50 min-w-[9vw] rounded-[0.521vw] border border-admin-border bg-admin-surface-card shadow-admin-elevated p-[0.208vw] max-lg:min-w-[160px] max-lg:rounded-xl max-lg:p-1.5"
        >
          {RANGES.map((r) => (
            <DropdownMenu.Item
              key={r.value}
              onSelect={() => select(r.value)}
              className={cn(
                "flex items-center px-[0.625vw] py-[0.313vw] rounded-[0.313vw] text-admin-sm text-text-primary outline-none cursor-pointer data-[highlighted]:bg-admin-row-hover max-lg:px-3 max-lg:py-1.5 max-lg:rounded-md max-lg:text-sm",
                current === r.value && "font-semibold",
              )}
            >
              {r.label}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
