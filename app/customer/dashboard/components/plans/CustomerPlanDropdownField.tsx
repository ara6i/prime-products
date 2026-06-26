"use client";

import { useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CheckIcon, ChevronDownIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/app/shared/components/ui/dropdown-menu";
import { cn } from "@/app/shared/lib/utils";

export interface CustomerPlanDropdownOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface CustomerPlanDropdownFieldProps {
  label: string;
  queryParam?: string;
  value: string;
  helpText?: string;
  options: CustomerPlanDropdownOption[];
}

export function CustomerPlanDropdownField({
  label,
  queryParam,
  value,
  helpText,
  options,
}: CustomerPlanDropdownFieldProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();
  const [selectedValue, setSelectedValue] = useState(value);

  const selectedOption = options.find((option) => option.value === selectedValue) ?? options[0];

  function selectValue(nextValue: string) {
    setSelectedValue(nextValue);

    if (!queryParam) return;

    const params = new URLSearchParams(searchParams.toString());
    params.set(queryParam, nextValue);
    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  return (
    <div className="block">
      <span className="text-customer-xs font-semibold uppercase tracking-[0.12em] text-customer-muted max-lg:text-[2.7vw]">
        {label}
      </span>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className="mt-[0.417vw] flex h-[2.604vw] w-full items-center justify-between gap-[0.625vw] rounded-[0.729vw] border border-customer-border bg-customer-card px-[0.833vw] text-left text-customer-sm font-semibold text-text-primary outline-none transition-colors hover:border-brand-blue/50 focus-visible:border-brand-blue max-lg:mt-[1.5vw] max-lg:h-[11vw] max-lg:gap-[3vw] max-lg:rounded-[3vw] max-lg:px-[4vw] max-lg:text-[3.4vw]"
          >
            <span className="min-w-0 truncate">{selectedOption?.label ?? "Select"}</span>
            <ChevronDownIcon className="h-[0.833vw] w-[0.833vw] shrink-0 text-customer-muted max-lg:h-[3.8vw] max-lg:w-[3.8vw]" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="start"
          side="bottom"
          avoidCollisions={false}
          className="max-h-[18vw] w-[var(--radix-dropdown-menu-trigger-width)] overflow-y-auto max-lg:max-h-[62vw]"
        >
          {options.map((option) => {
            const selected = option.value === selectedValue;

            return (
              <DropdownMenuItem
                key={option.value}
                disabled={option.disabled}
                onSelect={() => selectValue(option.value)}
                className={cn(
                  "justify-between gap-[0.625vw] max-lg:gap-[3vw]",
                  selected && "bg-customer-soft text-brand-blue",
                )}
              >
                <span className="min-w-0 truncate">{option.label}</span>
                {selected ? (
                  <CheckIcon className="h-[0.833vw] w-[0.833vw] shrink-0 max-lg:h-[3.8vw] max-lg:w-[3.8vw]" />
                ) : null}
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>
      {helpText ? (
        <span className="mt-[0.313vw] block text-customer-xs leading-[1.45] text-customer-muted max-lg:mt-[1vw] max-lg:text-[2.8vw]">
          {helpText}
        </span>
      ) : null}
    </div>
  );
}
