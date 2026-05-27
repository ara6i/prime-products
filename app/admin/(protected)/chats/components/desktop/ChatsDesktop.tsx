"use client";

import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Button } from "@/app/shared/components/ui";
import type { UseAdminChatsResult } from "../../hooks/useAdminChats";
import { ChatSessionList } from "../shared/ChatSessionList";

interface ChatsDesktopProps {
  chats: UseAdminChatsResult;
}

export function ChatsDesktop({ chats }: ChatsDesktopProps) {
  return (
    <section className="space-y-[1.042vw]">
      <div className="flex items-end justify-between gap-[1vw]">
        <div>
          <div className="flex items-center gap-[0.521vw]">
            <p className="text-[clamp(12px,0.72vw,14px)] font-semibold uppercase tracking-[0.16em] text-brand-blue">Support</p>
            <span className={`h-[0.521vw] w-[0.521vw] rounded-full ${chats.connected ? "bg-customer-success-text" : "bg-customer-muted"}`} />
            <span className="text-[clamp(12px,0.72vw,14px)] text-customer-muted">{chats.connected ? "Live" : "Connecting"}</span>
          </div>
          <h2 className="mt-[0.35vw] text-[clamp(28px,1.8vw,36px)] font-semibold leading-tight text-text-primary">Live chat</h2>
          <p className="mt-[0.313vw] text-[clamp(13px,0.78vw,15px)] text-text-body">Scan active conversations, then open a focused chat view.</p>
        </div>

        <div className="flex items-center gap-[0.521vw]">
          {chats.view.stats.map((stat) => (
            <div key={stat.label} className="rounded-full border border-customer-border bg-customer-card px-[0.833vw] py-[0.417vw]">
              <span className="text-[clamp(12px,0.72vw,14px)] font-semibold text-text-primary">{stat.value}</span>
              <span className="ml-[0.313vw] text-[clamp(12px,0.72vw,14px)] text-customer-muted">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-[var(--radius-customer-card)] border border-customer-border bg-customer-card p-[0.833vw]">
        <form onSubmit={chats.submitSearch} className="flex min-w-0 items-center gap-[0.521vw]">
          <div className="flex min-w-0 flex-1 items-center gap-[0.521vw] rounded-full border border-customer-border bg-customer-soft px-[0.833vw] py-[0.521vw]">
            <Search className="h-[0.938vw] w-[0.938vw] shrink-0 text-customer-muted" />
            <input
              value={chats.searchInput}
              onChange={(event) => chats.updateSearchInput(event.target.value)}
              placeholder="Search customer, store, chat id"
              className="min-w-0 flex-1 bg-transparent text-[clamp(13px,0.78vw,15px)] text-text-primary outline-none placeholder:text-customer-muted"
            />
          </div>
          <Button type="submit" disabled={chats.isLoading} className="h-[2.292vw] px-[1.042vw] text-[clamp(13px,0.78vw,15px)] font-semibold">
            Search
          </Button>
        </form>
      </div>

      <div className="space-y-[0.833vw]">
        <ChatSessionList
          items={chats.view.items}
          statusFilter={chats.listQuery.status}
          isLoading={chats.isLoading}
          onStatusChange={chats.changeStatusFilter}
          onSelect={chats.selectChat}
          totalItems={chats.view.pagination.totalItems}
        />
        <div className="flex items-center justify-between rounded-[var(--radius-customer-card)] border border-customer-border bg-customer-card px-[1.042vw] py-[0.729vw]">
          <p className="text-[clamp(12px,0.72vw,14px)] text-customer-muted">
            Page {chats.view.pagination.page} of {chats.view.pagination.totalPages}
          </p>
          <div className="flex items-center gap-[0.417vw]">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={chats.isLoading || chats.view.pagination.page <= 1}
              title="Previous page"
              onClick={() => chats.goToPage(chats.view.pagination.page - 1)}
            >
              <ChevronLeft className="h-[0.938vw] w-[0.938vw]" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              disabled={chats.isLoading || chats.view.pagination.page >= chats.view.pagination.totalPages}
              title="Next page"
              onClick={() => chats.goToPage(chats.view.pagination.page + 1)}
            >
              <ChevronRight className="h-[0.938vw] w-[0.938vw]" />
            </Button>
          </div>
        </div>
      </div>

      {chats.error ? (
        <p className="text-[clamp(13px,0.78vw,15px)] font-semibold text-customer-danger-text">
          {chats.error}
        </p>
      ) : null}
    </section>
  );
}
