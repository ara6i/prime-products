"use client";

import { ChevronDownIcon } from "lucide-react";
import { Button } from "@/app/shared/components/ui";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/app/shared/components/ui";
import type { CustomerProductFilterOption } from "../../types/products";

interface ProductFilterDropdownProps<TValue extends string> {
  label: string;
  value: TValue;
  options: Array<CustomerProductFilterOption<TValue>>;
  onChange: (value: TValue) => void;
}

export function ProductFilterDropdown<TValue extends string>({
  label,
  value,
  options,
  onChange,
}: ProductFilterDropdownProps<TValue>) {
  const selectedLabel = options.find((option) => option.value === value)?.label ?? options[0]?.label ?? "Select";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-[2.292vw] min-w-[9.375vw] justify-between gap-[var(--spacing-customer-gap-sm)] border-customer-border bg-customer-card px-[0.729vw] text-left text-customer-sm font-semibold text-text-primary hover:border-brand-blue/50 max-lg:h-[10.5vw] max-lg:min-w-0 max-lg:px-[3.5vw] max-lg:text-[3.2vw]"
        >
          <span className="min-w-0">
            <span className="block text-[0.521vw] uppercase tracking-[0.12em] text-customer-muted max-lg:text-[2.3vw]">
              {label}
            </span>
            <span className="block truncate">{selectedLabel}</span>
          </span>
          <ChevronDownIcon className="h-[0.833vw] w-[0.833vw] shrink-0 text-customer-muted max-lg:h-[3.5vw] max-lg:w-[3.5vw]" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        {options.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onSelect={() => onChange(option.value)}
            className={option.value === value ? "bg-customer-blue text-brand-blue" : undefined}
          >
            {option.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
