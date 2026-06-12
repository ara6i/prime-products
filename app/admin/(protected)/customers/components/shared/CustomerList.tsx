"use client";

import { Eye } from "lucide-react";
import { Button } from "@/app/shared/components/ui";
import type { AdminCustomerSource, CustomerListItem } from "../../types";
import { CustomerStatusBadge } from "./CustomerStatusBadge";

interface CustomerListProps {
  items: CustomerListItem[];
  totalItems: number;
  isLoading: boolean;
  onSelect: (id: string) => void;
  source: AdminCustomerSource;
  mobile?: boolean;
}

export function CustomerList({
  items,
  totalItems,
  isLoading,
  onSelect,
  source,
  mobile = false,
}: CustomerListProps) {
  const isShopify = source === "shopify";

  if (mobile) {
    if (items.length === 0) {
      return (
        <div className="rounded-[5vw] border border-customer-border bg-customer-card p-[8vw] text-center">
          <p className="text-[4.4vw] font-semibold text-text-primary">{isLoading ? "Loading customers" : "No customers found"}</p>
          <p className="mt-[1.5vw] text-[3.4vw] text-text-body">Customer stores will appear here once connected.</p>
        </div>
      );
    }

    return (
      <div className="space-y-[2.5vw]">
        {items.map((item) => (
          <article key={item.id} className="rounded-[5vw] border border-customer-border bg-customer-card p-[4vw]">
            <div className="flex items-start justify-between gap-[3vw]">
              <div className="min-w-0">
                <p className="truncate text-[4vw] font-semibold text-text-primary">{item.storeName}</p>
                <p className="mt-[1vw] truncate text-[3vw] text-customer-muted">{item.sourceLabel} · {item.identifierLabel}</p>
              </div>
              <CustomerStatusBadge tone={item.statusTone}>{item.statusLabel}</CustomerStatusBadge>
            </div>

            <div className="mt-[3vw] grid gap-[2vw] text-[3.2vw]">
              <p className="truncate text-text-body">Owner: {item.ownerLabel}</p>
              <p className="truncate text-text-body">Plan: {item.planLabel}{isShopify ? ` · ${item.monthlySpendLabel}` : ""}</p>
              {isShopify ? <p className="truncate text-text-body">Products: {item.productCountLabel}</p> : null}
              {isShopify ? (
                <>
                  <p className="truncate text-text-body">Range try-ons: {item.rangeTryOnsLabel}</p>
                  <p className="truncate text-text-body">Lifetime try-ons: {item.lifetimeTryOnsLabel}</p>
                </>
              ) : (
                <p className="truncate text-text-body">Try-ons: {item.tryOnsLabel}</p>
              )}
              <p className="truncate text-customer-muted">{isShopify ? "Due" : "Installed"}: {isShopify ? item.dueDateLabel : item.installedLabel}</p>
            </div>

            <div className="mt-[3vw] flex justify-end">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onSelect(item.id)}
                className="h-[9vw] cursor-pointer rounded-full px-[4vw] text-[3.2vw] font-semibold"
              >
                <Eye className="h-[4vw] w-[4vw]" />
                View
              </Button>
            </div>
          </article>
        ))}
      </div>
    );
  }

  return (
    <section className="overflow-hidden rounded-[var(--radius-customer-card)] border border-customer-border bg-customer-card">
      <div className="flex items-center justify-between border-b border-customer-border px-[1.042vw] py-[0.729vw]">
        <div>
          <p className="text-[clamp(15px,0.94vw,18px)] font-semibold text-text-primary">{isShopify ? "Shopify customer table" : "Customer table"}</p>
          <p className="mt-[0.2vw] text-[clamp(12px,0.72vw,14px)] text-customer-muted">{totalItems.toLocaleString("en-US")} matching customers</p>
        </div>
        <span className="rounded-full bg-customer-blue px-[0.625vw] py-[0.208vw] text-[clamp(11px,0.68vw,13px)] font-semibold text-brand-blue">
          {items.length} shown
        </span>
      </div>

      {items.length > 0 ? (
        <div className="max-h-[calc(100vh-18.4vw)] overflow-y-auto">
          <table className="w-full table-fixed border-collapse">
            <thead className="sticky top-0 z-10 bg-customer-soft">
              <tr className="border-b border-customer-border text-left text-[clamp(11px,0.68vw,13px)] font-semibold uppercase tracking-[0.08em] text-customer-muted">
                <th className="w-[5.8vw] px-[0.833vw] py-[0.521vw]">Status</th>
                <th className="w-[13vw] px-[0.833vw] py-[0.521vw]">Store</th>
                <th className="w-[14vw] px-[0.833vw] py-[0.521vw]">Owner</th>
                <th className="w-[15vw] px-[0.833vw] py-[0.521vw]">{isShopify ? "Plan / Spend" : "Identifier"}</th>
                <th className="px-[0.833vw] py-[0.521vw]">{isShopify ? "Products / Try-ons" : "Plan / Usage"}</th>
                <th className="w-[13vw] px-[0.833vw] py-[0.521vw]">{isShopify ? "Due / Activity" : "Dates"}</th>
                <th className="w-[5.8vw] px-[0.833vw] py-[0.521vw]">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-b border-customer-border bg-customer-card last:border-b-0">
                  <td className="px-[0.833vw] py-[0.625vw] align-middle">
                    <CustomerStatusBadge tone={item.statusTone}>{item.statusLabel}</CustomerStatusBadge>
                  </td>
                  <td className="px-[0.833vw] py-[0.625vw] align-middle">
                    <p className="truncate text-[clamp(13px,0.78vw,15px)] font-medium text-text-primary">{item.storeName}</p>
                    <p className="mt-[0.156vw] truncate text-[clamp(11px,0.68vw,13px)] text-customer-muted">{item.identifierLabel}</p>
                  </td>
                  <td className="px-[0.833vw] py-[0.625vw] align-middle">
                    <p className="truncate text-[clamp(12px,0.72vw,14px)] text-text-body">{item.ownerLabel}</p>
                  </td>
                  <td className="px-[0.833vw] py-[0.625vw] align-middle">
                    <p className="truncate text-[clamp(12px,0.72vw,14px)] font-medium text-text-primary">{isShopify ? item.planLabel : item.identifierLabel}</p>
                    {isShopify ? <p className="mt-[0.156vw] truncate text-[clamp(11px,0.68vw,13px)] text-customer-muted">{item.monthlySpendLabel}</p> : null}
                  </td>
                  <td className="px-[0.833vw] py-[0.625vw] align-middle">
                    <p className="truncate text-[clamp(12px,0.72vw,14px)] font-medium text-text-primary">{isShopify ? item.productCountLabel : item.planLabel}</p>
                    <p className="mt-[0.156vw] truncate text-[clamp(11px,0.68vw,13px)] text-customer-muted">
                      {isShopify ? `${item.rangeTryOnsLabel} range / ${item.lifetimeTryOnsLabel} lifetime` : item.tryOnsLabel}
                    </p>
                  </td>
                  <td className="px-[0.833vw] py-[0.625vw] align-middle">
                    <p className="truncate text-[clamp(12px,0.72vw,14px)] text-text-body">{isShopify ? item.dueDateLabel : item.installedLabel}</p>
                    <p className="mt-[0.156vw] truncate text-[clamp(11px,0.68vw,13px)] text-customer-muted">Last: {item.lastUsedLabel}</p>
                  </td>
                  <td className="px-[0.833vw] py-[0.625vw] align-middle">
                    <Button
                      type="button"
                      variant="ghost"
                      title="View customer"
                      className="h-[1.875vw] cursor-pointer rounded-full px-[0.625vw] text-[clamp(11px,0.68vw,13px)] font-medium"
                      onClick={() => onSelect(item.id)}
                    >
                      <Eye className="h-[0.833vw] w-[0.833vw]" />
                      View
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="p-[2vw] text-center">
          <p className="text-[clamp(18px,1.15vw,22px)] font-semibold text-text-primary">{isLoading ? "Loading customers" : "No customers found"}</p>
          <p className="mt-[0.5vw] text-[clamp(14px,0.84vw,16px)] text-text-body">Customer stores will appear here once connected.</p>
        </div>
      )}
    </section>
  );
}
