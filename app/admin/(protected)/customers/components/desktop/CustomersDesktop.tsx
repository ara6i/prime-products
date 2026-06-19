"use client";

import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Button } from "@/app/shared/components/ui";
import type { UseAdminCustomersResult } from "../../hooks/useAdminCustomers";
import { CustomerList } from "../shared/CustomerList";
import { ShopifyUninstallReportCard } from "../shopify/ShopifyUninstallReportCard";

interface CustomersDesktopProps {
  customers: UseAdminCustomersResult;
}

export function CustomersDesktop({ customers }: CustomersDesktopProps) {
  return (
    <section className="space-y-[1.042vw]">
      <div className="flex items-end justify-between gap-[1vw]">
        <div>
          <p className="text-[clamp(12px,0.72vw,14px)] font-semibold uppercase tracking-[0.16em] text-brand-blue">{customers.view.eyebrow}</p>
          <h2 className="mt-[0.35vw] text-[clamp(28px,1.8vw,36px)] font-semibold leading-tight text-text-primary">{customers.view.title}</h2>
          <p className="mt-[0.313vw] max-w-[52vw] text-[clamp(13px,0.78vw,15px)] leading-relaxed text-text-body">{customers.view.description}</p>
          {customers.view.rangeLabel ? (
            <p className="mt-[0.208vw] text-[clamp(12px,0.72vw,14px)] font-medium text-customer-muted">Try-on range: {customers.view.rangeLabel}</p>
          ) : null}
        </div>

        <div className="flex items-center gap-[0.521vw]">
          {customers.view.stats.map((stat) => (
            <div key={stat.label} className="rounded-full border border-customer-border bg-customer-card px-[0.833vw] py-[0.417vw]">
              <span className="text-[clamp(12px,0.72vw,14px)] font-semibold text-text-primary">{stat.value}</span>
              <span className="ml-[0.313vw] text-[clamp(12px,0.72vw,14px)] text-customer-muted">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[var(--radius-customer-card)] border border-customer-border bg-customer-card p-[0.833vw]">
        <form onSubmit={customers.submitSearch} className="flex min-w-0 items-center gap-[0.521vw]">
          <div className="flex min-w-0 flex-1 items-center gap-[0.521vw] rounded-full border border-customer-border bg-customer-soft px-[0.833vw] py-[0.521vw]">
            <Search className="h-[0.938vw] w-[0.938vw] shrink-0 text-customer-muted" />
            <input
              value={customers.searchInput}
              onChange={(event) => customers.updateSearchInput(event.target.value)}
              placeholder="Search store, email, project, domain"
              className="min-w-0 flex-1 bg-transparent text-[clamp(13px,0.78vw,15px)] text-text-primary outline-none placeholder:text-customer-muted"
            />
          </div>
          <Button type="submit" disabled={customers.isLoading} className="h-[2.292vw] px-[1.042vw] text-[clamp(13px,0.78vw,15px)] font-semibold">
            Search
          </Button>
        </form>
      </div>

      {customers.view.shopifyUninstallReport ? (
        <ShopifyUninstallReportCard
          report={customers.view.shopifyUninstallReport}
          isSyncing={customers.isSyncingShopifyUninstalls}
          onSync={customers.syncShopifyUninstalls}
        />
      ) : null}

      <CustomerList
        items={customers.view.items}
        totalItems={customers.view.pagination.totalItems}
        isLoading={customers.isLoading}
        onSelect={customers.selectCustomer}
        source={customers.view.source}
      />

      <div className="flex items-center justify-between rounded-[var(--radius-customer-card)] border border-customer-border bg-customer-card px-[1.042vw] py-[0.729vw]">
        <p className="text-[clamp(12px,0.72vw,14px)] text-customer-muted">
          Page {customers.view.pagination.page} of {customers.view.pagination.totalPages}
        </p>
        <div className="flex items-center gap-[0.417vw]">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={customers.isLoading || customers.view.pagination.page <= 1}
            title="Previous page"
            onClick={() => customers.goToPage(customers.view.pagination.page - 1)}
          >
            <ChevronLeft className="h-[0.938vw] w-[0.938vw]" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={customers.isLoading || customers.view.pagination.page >= customers.view.pagination.totalPages}
            title="Next page"
            onClick={() => customers.goToPage(customers.view.pagination.page + 1)}
          >
            <ChevronRight className="h-[0.938vw] w-[0.938vw]" />
          </Button>
        </div>
      </div>

      {customers.error ? (
        <p className="text-[clamp(13px,0.78vw,15px)] font-semibold text-customer-danger-text">{customers.error}</p>
      ) : null}
    </section>
  );
}
