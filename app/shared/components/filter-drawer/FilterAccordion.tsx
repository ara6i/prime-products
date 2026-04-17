"use client";

import { useState } from "react";
import { ChevronDownSmallIcon } from "@/app/shared/components/icons";
import { Button } from "@/app/shared/components/ui";

interface FilterAccordionProps {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export function FilterAccordion({
  title,
  count,
  defaultOpen = true,
  children,
}: FilterAccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-[0.417vw] ${
        isOpen
          ? "border border-brand-blue-light"
          : "border border-surface-segment"
      }`}
    >
      <Button
        variant="ghost"
        onClick={() => setIsOpen(!isOpen)}
        className={`h-auto w-full justify-start gap-[0.417vw] rounded-none px-[0.833vw] py-[0.833vw] ${
          isOpen ? "bg-surface-blue-pale hover:bg-surface-blue-pale/90" : "bg-white hover:bg-white/90"
        }`}
      >
        <span className="text-[0.729vw] font-normal leading-[1.57] text-text-primary">
          {title}
        </span>
        {count !== undefined && (
          <span className="font-poppins text-[0.729vw] font-normal leading-[1.43] text-text-caption">
            ({count})
          </span>
        )}
        <ChevronDownSmallIcon
          size={16}
          className={`ml-auto !w-[0.833vw] !h-[0.833vw] transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
          color="var(--text-neutral)"
        />
      </Button>

      {isOpen && (
        <>
          <div className="border-t border-brand-blue-light" />
          <div className="flex flex-col gap-[0.833vw] bg-surface-blue-pale px-[0.833vw] pb-[0.833vw] pt-[0.625vw]">
            {children}
          </div>
        </>
      )}
    </div>
  );
}
