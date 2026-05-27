"use client";

import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Button } from "@/app/shared/components/ui";
import type { UseAdminTicketsResult } from "../../hooks/useAdminTickets";
import { TicketList } from "../shared/TicketList";

interface TicketsMobileProps {
  tickets: UseAdminTicketsResult;
}

export function TicketsMobile({ tickets }: TicketsMobileProps) {
  return (
    <section className="space-y-[4vw]">
      <div>
        <p className="text-[3vw] font-semibold uppercase tracking-[0.16em] text-brand-blue">Support</p>
        <div className="mt-[1.5vw] flex items-end justify-between gap-[3vw]">
          <h2 className="text-[8vw] font-semibold leading-tight text-text-primary">Tickets</h2>
          <div className="rounded-full border border-customer-border bg-customer-card px-[3vw] py-[1.5vw] text-[3.2vw] text-text-body">
            {tickets.view.items.length} total
          </div>
        </div>
      </div>

      <form onSubmit={tickets.submitSearch} className="rounded-[5vw] border border-customer-border bg-customer-card p-[3vw]">
        <div className="flex items-center gap-[2vw] rounded-full border border-customer-border bg-customer-soft px-[3.5vw] py-[2.5vw]">
          <Search className="h-[4vw] w-[4vw] shrink-0 text-customer-muted" />
          <input
            value={tickets.searchInput}
            onChange={(event) => tickets.updateSearchInput(event.target.value)}
            placeholder="Search tickets"
            className="min-w-0 flex-1 bg-transparent text-[3.4vw] text-text-primary outline-none placeholder:text-customer-muted"
          />
        </div>
        <div className="mt-[2.5vw] flex items-center gap-[2vw]">
          <Button
            type="submit"
            disabled={tickets.isLoading}
            className="h-[9vw] w-full px-[4vw] text-[3.2vw] font-semibold"
          >
            Search
          </Button>
        </div>
      </form>

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
        mobile
      />

      <div className="flex items-center justify-between rounded-[5vw] border border-customer-border bg-customer-card px-[4vw] py-[3vw]">
        <p className="text-[3.2vw] text-customer-muted">
          Page {tickets.view.pagination.page} of {tickets.view.pagination.totalPages}
        </p>
        <div className="flex items-center gap-[2vw]">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={tickets.isLoading || tickets.view.pagination.page <= 1}
            title="Previous page"
            onClick={() => tickets.goToPage(tickets.view.pagination.page - 1)}
            className="h-[9vw] w-[9vw]"
          >
            <ChevronLeft className="h-[4vw] w-[4vw]" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={tickets.isLoading || tickets.view.pagination.page >= tickets.view.pagination.totalPages}
            title="Next page"
            onClick={() => tickets.goToPage(tickets.view.pagination.page + 1)}
            className="h-[9vw] w-[9vw]"
          >
            <ChevronRight className="h-[4vw] w-[4vw]" />
          </Button>
        </div>
      </div>

    </section>
  );
}
