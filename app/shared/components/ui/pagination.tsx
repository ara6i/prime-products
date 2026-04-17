import * as React from "react";
import { cn } from "@/app/shared/lib/utils";
import { Button } from "./button";
import {
  ChevronLeftSmallIcon,
  ChevronRightSmallIcon,
} from "@/app/shared/components/icons";

function getPageRange(current: number, total: number): number[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages = new Set<number>();
  pages.add(1);
  pages.add(total);
  pages.add(current);
  if (current > 1) pages.add(current - 1);
  if (current < total) pages.add(current + 1);
  pages.add(2);
  pages.add(total - 1);

  return Array.from(pages)
    .filter((p) => p >= 1 && p <= total)
    .sort((a, b) => a - b);
}

interface PaginationBarProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export function PaginationBar({
  currentPage,
  totalPages,
  onPageChange,
  className,
}: PaginationBarProps) {
  if (totalPages <= 1) return null;

  const pageRange = getPageRange(currentPage, totalPages);

  return (
    <nav
      role="navigation"
      aria-label="pagination"
      className={cn("flex items-center justify-center gap-[0.208vw]", className)}
    >
      <Button
        variant="ghost"
        size="icon-sm"
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        className="h-[1.667vw] w-[1.667vw] rounded-[0.417vw]"
      >
        <ChevronLeftSmallIcon size={16} className="!w-[0.833vw] !h-[0.833vw]" color="var(--text-primary)" />
      </Button>

      {pageRange.map((pageNumber, index) => {
        const prev = pageRange[index - 1];
        const showEllipsis = index > 0 && prev !== undefined && pageNumber - prev > 1;

        return (
          <React.Fragment key={pageNumber}>
            {showEllipsis && (
              <span className="flex h-[1.667vw] w-[1.667vw] items-center justify-center font-sans text-[0.729vw] text-text-hint">
                ...
              </span>
            )}
            <Button
              variant={pageNumber === currentPage ? "primary" : "ghost"}
              size="icon-sm"
              onClick={() => onPageChange(pageNumber)}
              className={cn(
                "h-[1.667vw] w-[1.667vw] rounded-[0.417vw] font-sans text-[0.729vw] font-normal",
                pageNumber === currentPage
                  ? "bg-brand-blue text-white"
                  : "text-text-primary hover:bg-surface-muted"
              )}
            >
              {pageNumber}
            </Button>
          </React.Fragment>
        );
      })}

      <Button
        variant="ghost"
        size="icon-sm"
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        className="h-[1.667vw] w-[1.667vw] rounded-[0.417vw]"
      >
        <ChevronRightSmallIcon size={16} className="!w-[0.833vw] !h-[0.833vw]" color="var(--text-primary)" />
      </Button>
    </nav>
  );
}
