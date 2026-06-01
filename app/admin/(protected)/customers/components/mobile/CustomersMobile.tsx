"use client";

import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Button } from "@/app/shared/components/ui";
import type { UseAdminCustomersResult } from "../../hooks/useAdminCustomers";
import { CustomerList } from "../shared/CustomerList";

interface CustomersMobileProps {
  customers: UseAdminCustomersResult;
}

export function CustomersMobile({ customers }: CustomersMobileProps) {
  return (
    <section className="space-y-[4vw]">
      <div>
        <p className="text-[3vw] font-semibold uppercase tracking-[0.16em] text-brand-blue">{customers.view.eyebrow}</p>
        <div className="mt-[1.5vw] flex items-end justify-between gap-[3vw]">
          <h2 className="text-[8vw] font-semibold leading-tight text-text-primary">{customers.view.title}</h2>
          <div className="rounded-full border border-customer-border bg-customer-card px-[3vw] py-[1.5vw] text-[3.2vw] text-text-body">
            {customers.view.pagination.totalItems} total
          </div>
        </div>
        <p className="mt-[2vw] text-[3.4vw] leading-relaxed text-text-body">{customers.view.description}</p>
      </div>

      <form onSubmit={customers.submitSearch} className="rounded-[5vw] border border-customer-border bg-customer-card p-[3vw]">
        <div className="flex items-center gap-[2vw] rounded-full border border-customer-border bg-customer-soft px-[3.5vw] py-[2.5vw]">
          <Search className="h-[4vw] w-[4vw] shrink-0 text-customer-muted" />
          <input
            value={customers.searchInput}
            onChange={(event) => customers.updateSearchInput(event.target.value)}
            placeholder="Search customers"
            className="min-w-0 flex-1 bg-transparent text-[3.4vw] text-text-primary outline-none placeholder:text-customer-muted"
          />
        </div>
        <Button type="submit" disabled={customers.isLoading} className="mt-[2.5vw] h-[9vw] w-full px-[4vw] text-[3.2vw] font-semibold">
          Search
        </Button>
      </form>

      <CustomerList
        items={customers.view.items}
        totalItems={customers.view.pagination.totalItems}
        isLoading={customers.isLoading}
        onSelect={customers.selectCustomer}
        source={customers.view.source}
        mobile
      />

      <div className="flex items-center justify-between rounded-[5vw] border border-customer-border bg-customer-card px-[4vw] py-[3vw]">
        <p className="text-[3.2vw] text-customer-muted">
          Page {customers.view.pagination.page} of {customers.view.pagination.totalPages}
        </p>
        <div className="flex items-center gap-[2vw]">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={customers.isLoading || customers.view.pagination.page <= 1}
            title="Previous page"
            onClick={() => customers.goToPage(customers.view.pagination.page - 1)}
            className="h-[9vw] w-[9vw]"
          >
            <ChevronLeft className="h-[4vw] w-[4vw]" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={customers.isLoading || customers.view.pagination.page >= customers.view.pagination.totalPages}
            title="Next page"
            onClick={() => customers.goToPage(customers.view.pagination.page + 1)}
            className="h-[9vw] w-[9vw]"
          >
            <ChevronRight className="h-[4vw] w-[4vw]" />
          </Button>
        </div>
      </div>

      {customers.error ? (
        <p className="text-[3.2vw] font-semibold text-customer-danger-text">{customers.error}</p>
      ) : null}
    </section>
  );
}
