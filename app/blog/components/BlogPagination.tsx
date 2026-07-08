import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import type { BlogPaginationViewModel } from "../types";

interface BlogPaginationProps {
  pagination: BlogPaginationViewModel;
}

function getPageHref(page: number): string {
  return page === 1 ? "/blog" : `/blog?page=${page}`;
}

function getPageNumbers(currentPage: number, totalPages: number): number[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const firstPage = 1;
  const lastPage = totalPages;
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);
  const pages = [firstPage];

  for (let page = start; page <= end; page += 1) {
    pages.push(page);
  }

  pages.push(lastPage);
  return Array.from(new Set(pages));
}

export function BlogPagination({ pagination }: BlogPaginationProps) {
  if (pagination.totalPages <= 1) return null;

  const pageNumbers = getPageNumbers(pagination.page, pagination.totalPages);

  return (
    <nav className="mt-10 flex items-center justify-center gap-2" aria-label="Blog pagination">
      <Link
        href={getPageHref(Math.max(1, pagination.page - 1))}
        aria-label="Previous page"
        aria-disabled={!pagination.hasPreviousPage}
        className="flex h-9 w-9 items-center justify-center rounded-full text-text-hint transition hover:bg-white hover:text-brand-blue aria-disabled:pointer-events-none aria-disabled:opacity-40"
      >
        <ChevronLeft size={16} />
      </Link>
      {pageNumbers.map((page, index) => (
        <div key={page} className="flex items-center gap-2">
          {index > 0 && page - pageNumbers[index - 1] > 1 ? (
            <span className="flex h-9 w-5 items-center justify-center text-sm font-bold text-text-hint">
              ...
            </span>
          ) : null}
          <Link
            href={getPageHref(page)}
            aria-current={page === pagination.page ? "page" : undefined}
            className="flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition data-[active=true]:bg-white data-[active=true]:text-brand-blue data-[active=true]:shadow-sm hover:bg-white"
            data-active={page === pagination.page}
          >
            {page}
          </Link>
        </div>
      ))}
      <Link
        href={getPageHref(Math.min(pagination.totalPages, pagination.page + 1))}
        aria-label="Next page"
        aria-disabled={!pagination.hasNextPage}
        className="flex h-9 w-9 items-center justify-center rounded-full text-text-hint transition hover:bg-white hover:text-brand-blue aria-disabled:pointer-events-none aria-disabled:opacity-40"
      >
        <ChevronRight size={16} />
      </Link>
    </nav>
  );
}
