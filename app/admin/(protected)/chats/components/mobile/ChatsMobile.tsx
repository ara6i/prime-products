"use client";

import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Button } from "@/app/shared/components/ui";
import type { UseAdminChatsResult } from "../../hooks/useAdminChats";
import { ChatSessionList } from "../shared/ChatSessionList";

interface ChatsMobileProps {
  chats: UseAdminChatsResult;
}

export function ChatsMobile({ chats }: ChatsMobileProps) {
  return (
    <section className="space-y-[4vw]">
      <div>
        <p className="text-[3vw] font-semibold uppercase tracking-[0.16em] text-brand-blue">Support</p>
        <div className="mt-[1vw] flex items-center justify-between gap-[3vw]">
          <h2 className="text-[8vw] font-semibold leading-tight text-text-primary">Live chat</h2>
          <span className={`rounded-full px-[3vw] py-[1vw] text-[3vw] font-semibold ${chats.connected ? "bg-customer-success-bg text-customer-success-text" : "bg-customer-soft text-customer-muted"}`}>
            {chats.connected ? "Live" : "Connecting"}
          </span>
        </div>
        <p className="mt-[2vw] text-[3.4vw] leading-relaxed text-text-body">Scan conversations and open the full chat when you need to reply.</p>
      </div>

      <form onSubmit={chats.submitSearch} className="rounded-[5vw] border border-customer-border bg-customer-card p-[3vw]">
        <div className="flex items-center gap-[2vw] rounded-full border border-customer-border bg-customer-soft px-[4vw] py-[3vw]">
          <Search className="h-[4vw] w-[4vw] shrink-0 text-customer-muted" />
          <input
            value={chats.searchInput}
            onChange={(event) => chats.updateSearchInput(event.target.value)}
            placeholder="Search chats"
            className="min-w-0 flex-1 bg-transparent text-[3.5vw] text-text-primary outline-none placeholder:text-customer-muted"
          />
        </div>
        <Button type="submit" disabled={chats.isLoading} className="mt-[3vw] h-[10vw] w-full px-[4vw] text-[3.4vw] font-semibold">
          Search
        </Button>
      </form>

      <ChatSessionList
        items={chats.view.items}
        statusFilter={chats.listQuery.status}
        isLoading={chats.isLoading}
        onStatusChange={chats.changeStatusFilter}
        onSelect={chats.selectChat}
        totalItems={chats.view.pagination.totalItems}
        mobile
      />

      <div className="flex items-center justify-between rounded-[5vw] border border-customer-border bg-customer-card px-[4vw] py-[3vw]">
        <p className="text-[3vw] text-customer-muted">
          Page {chats.view.pagination.page} of {chats.view.pagination.totalPages}
        </p>
        <div className="flex items-center gap-[2vw]">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={chats.isLoading || chats.view.pagination.page <= 1}
            title="Previous page"
            onClick={() => chats.goToPage(chats.view.pagination.page - 1)}
            className="h-[9vw] w-[9vw]"
          >
            <ChevronLeft className="h-[4vw] w-[4vw]" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            disabled={chats.isLoading || chats.view.pagination.page >= chats.view.pagination.totalPages}
            title="Next page"
            onClick={() => chats.goToPage(chats.view.pagination.page + 1)}
            className="h-[9vw] w-[9vw]"
          >
            <ChevronRight className="h-[4vw] w-[4vw]" />
          </Button>
        </div>
      </div>

      {chats.error ? (
        <p className="text-[3.2vw] font-semibold text-customer-danger-text">
          {chats.error}
        </p>
      ) : null}
    </section>
  );
}
