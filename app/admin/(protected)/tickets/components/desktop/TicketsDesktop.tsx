"use client";

import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Button } from "@/app/shared/components/ui";
import type { UseAdminTicketsResult } from "../../hooks/useAdminTickets";
import { TicketList } from "../shared/TicketList";

interface TicketsDesktopProps {
  tickets: UseAdminTicketsResult;
}

export function TicketsDesktop({ tickets }: TicketsDesktopProps) {
  const openStat = tickets.view.stats.find((stat) => stat.label === "Open");
  const urgentStat = tickets.view.stats.find((stat) => stat.label === "Urgent");
  const solvedStat = tickets.view.stats.find((stat) => stat.label === "Solved");

  return (
    <section className="space-y-[1.042vw]">
      <div className="flex items-end justify-between gap-[1vw]">
        <div>
          <p className="text-[clamp(12px,0.72vw,14px)] font-semibold uppercase tracking-[0.16em] text-brand-blue">Support</p>
          <h2 className="mt-[0.35vw] text-[clamp(28px,1.8vw,36px)] font-semibold leading-tight text-text-primary">Tickets</h2>
        </div>

        <div className="flex items-center gap-[0.521vw]">
          {[openStat, solvedStat, urgentStat].filter(Boolean).map((stat) => (
            <div key={stat!.label} className="rounded-full border border-customer-border bg-customer-card px-[0.833vw] py-[0.417vw]">
              <span className="text-[clamp(12px,0.72vw,14px)] font-semibold text-text-primary">{stat!.value}</span>
              <span className="ml-[0.313vw] text-[clamp(12px,0.72vw,14px)] text-customer-muted">{stat!.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[var(--radius-customer-card)] border border-customer-border bg-customer-card p-[0.833vw]">
        <form onSubmit={tickets.submitSearch} className="flex min-w-0 flex-1 items-center gap-[0.521vw]">
          <div className="flex min-w-0 flex-1 items-center gap-[0.521vw] rounded-full border border-customer-border bg-customer-soft px-[0.833vw] py-[0.521vw]">
            <Search className="h-[0.938vw] w-[0.938vw] shrink-0 text-customer-muted" />
            <input
              value={tickets.searchInput}
              onChange={(event) => tickets.updateSearchInput(event.target.value)}
              placeholder="Search ticket, customer, email"
              className="min-w-0 flex-1 bg-transparent text-[clamp(13px,0.78vw,15px)] text-text-primary outline-none placeholder:text-customer-muted"
            />
          </div>
          <Button
            type="submit"
            disabled={tickets.isLoading}
            className="h-[2.292vw] px-[1.042vw] text-[clamp(13px,0.78vw,15px)] font-semibold"
          >
            Search
          </Button>
        </form>
      </div>

      <div className="space-y-[0.833vw]">
        <TicketList
          items={tickets.view.items}
          selectedTicketId={null}
          onSelect={tickets.selectTicket}
          onSolve={tickets.solveTicket}
          onTogglePin={tickets.togglePinTicket}
          queue={tickets.listQuery.queue}
          onQueueChange={tickets.changeQueue}
          totalItems={tickets.view.pagination.totalItems}
          isLoading={tickets.isLoading}
          isUpdating={tickets.isUpdating}
        />
        <div className="flex items-center justify-between rounded-[var(--radius-customer-card)] border border-customer-border bg-customer-card px-[1.042vw] py-[0.729vw]">
          <p className="text-[clamp(12px,0.72vw,14px)] text-customer-muted">
            Page {tickets.view.pagination.page} of {tickets.view.pagination.totalPages}
          </p>
          <div className="flex items-center gap-[0.417vw]">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={tickets.isLoading || tickets.view.pagination.page <= 1}
              title="Previous page"
              onClick={() => tickets.goToPage(tickets.view.pagination.page - 1)}
            >
              <ChevronLeft className="h-[0.938vw] w-[0.938vw]" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={tickets.isLoading || tickets.view.pagination.page >= tickets.view.pagination.totalPages}
              title="Next page"
              onClick={() => tickets.goToPage(tickets.view.pagination.page + 1)}
            >
              <ChevronRight className="h-[0.938vw] w-[0.938vw]" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
