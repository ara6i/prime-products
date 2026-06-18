"use client";

import { Eye, Star } from "lucide-react";
import { Button } from "@/app/shared/components/ui";
import { Tabs, TabsList, TabsTrigger } from "@/app/shared/components/ui/tabs";
import type { AdminChatStatusFilter, ChatSessionItem } from "../../types";
import { ChatStatusBadge } from "./ChatStatusBadge";

interface ChatSessionListProps {
  items: ChatSessionItem[];
  statusFilter: AdminChatStatusFilter;
  isLoading: boolean;
  onStatusChange: (status: AdminChatStatusFilter) => void;
  onSelect: (id: string) => void;
  totalItems?: number;
  mobile?: boolean;
}

const statusTabs: Array<{ label: string; value: AdminChatStatusFilter }> = [
  { label: "Open", value: "open" },
  { label: "Closed", value: "closed" },
];

function StoreAvatar({
  logoUrl,
  storeLabel,
}: {
  logoUrl: string | null;
  storeLabel: string;
}) {
  const fallback = storeLabel.trim().slice(0, 1).toUpperCase() || "S";
  return (
    <span className="inline-flex h-[1.563vw] w-[1.563vw] shrink-0 items-center justify-center overflow-hidden rounded-full border border-customer-border bg-customer-soft text-[clamp(10px,0.62vw,12px)] font-semibold text-text-primary max-lg:h-[7vw] max-lg:w-[7vw] max-lg:text-[2.8vw]">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt={`${storeLabel} logo`} className="h-full w-full object-cover" />
      ) : (
        fallback
      )}
    </span>
  );
}

function ChatTabs({
  statusFilter,
  isLoading,
  onStatusChange,
  mobile,
}: Pick<ChatSessionListProps, "statusFilter" | "isLoading" | "onStatusChange" | "mobile">) {
  return (
    <Tabs value={statusFilter} onValueChange={(value) => onStatusChange(value as AdminChatStatusFilter)} className="gap-0">
      <TabsList className={mobile ? "gap-[2vw]" : "gap-[0.417vw]"}>
        {statusTabs.map((tab) => (
          <TabsTrigger
            key={tab.value}
            value={tab.value}
            disabled={isLoading}
            className={mobile
              ? "rounded-full border border-customer-border px-[4vw] py-[2vw] text-[3.2vw] font-semibold data-[state=active]:border-brand-blue data-[state=active]:bg-customer-blue data-[state=active]:text-brand-blue"
              : "rounded-full border border-customer-border px-[0.938vw] py-[0.417vw] text-[clamp(12px,0.72vw,14px)] font-semibold data-[state=active]:border-brand-blue data-[state=active]:bg-customer-blue data-[state=active]:text-brand-blue"}
          >
            {tab.label}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}

export function ChatSessionList({
  items,
  statusFilter,
  isLoading,
  onStatusChange,
  onSelect,
  totalItems = items.length,
  mobile = false,
}: ChatSessionListProps) {
  if (mobile) {
    return (
      <section className="space-y-[2.5vw]">
        <div className="flex items-center justify-between gap-[3vw] rounded-[5vw] border border-customer-border bg-customer-card p-[3vw]">
          <ChatTabs statusFilter={statusFilter} isLoading={isLoading} onStatusChange={onStatusChange} mobile />
          <span className="shrink-0 text-[3vw] font-medium text-customer-muted">{totalItems.toLocaleString("en-US")}</span>
        </div>

        {items.length > 0 ? (
          <div className="space-y-[2.5vw]">
            {items.map((item) => (
              <article key={item.id} className="rounded-[5vw] border border-customer-border bg-customer-card p-[4vw]">
                <div className="flex items-start justify-between gap-[3vw]">
                  <div className="min-w-0">
                    <p className="truncate text-[4vw] font-semibold text-text-primary">{item.visitorName}</p>
                    <p className="mt-[1vw] truncate text-[3vw] text-customer-muted">{item.chatNumber} · {item.lastMessageAtLabel}</p>
                  </div>
                  <ChatStatusBadge tone={item.statusTone}>{item.statusLabel}</ChatStatusBadge>
                </div>

                <div className="mt-[2vw] flex min-w-0 items-center gap-[2vw]">
                  <StoreAvatar logoUrl={item.storeLogoUrl} storeLabel={item.storeLabel} />
                  <p className="truncate text-[3.2vw] text-text-body">{item.storeLabel}</p>
                </div>
                <div className="mt-[1.5vw] flex flex-wrap items-center gap-[1.5vw]">
                  {item.supportIssue ? (
                    <span className="rounded-full border border-customer-border bg-customer-soft px-[2.5vw] py-[1vw] text-[2.8vw] font-semibold text-text-body">
                      {item.supportIssue}
                    </span>
                  ) : null}
                  {item.ratingScore ? (
                    <span className="inline-flex items-center gap-[1vw] rounded-full bg-customer-blue px-[2.5vw] py-[1vw] text-[2.8vw] font-semibold text-brand-blue">
                      <Star className="h-[3vw] w-[3vw] fill-current" />
                      {item.ratingScore}/5
                    </span>
                  ) : null}
                </div>
                <p className="mt-[1.5vw] line-clamp-2 text-[3.4vw] leading-relaxed text-text-body">{item.lastMessagePreview}</p>

                <div className="mt-[3vw] flex items-center justify-between gap-[3vw]">
                  <div className="min-w-0">
                    <p className="truncate text-[3vw] text-customer-muted">{item.visitorMeta}</p>
                    {item.hasUnread ? (
                      <p className="mt-[1vw] text-[3vw] font-semibold text-brand-blue">{item.unreadAdminCount} unread</p>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => onSelect(item.id)}
                    className="h-[9vw] shrink-0 cursor-pointer rounded-full px-[4vw] text-[3.2vw] font-semibold"
                  >
                    <Eye className="h-[4vw] w-[4vw]" />
                    View
                  </Button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-[5vw] border border-customer-border bg-customer-card p-[8vw] text-center">
            <p className="text-[4.4vw] font-semibold text-text-primary">{isLoading ? "Loading chats" : "No chats found"}</p>
            <p className="mt-[1.5vw] text-[3.4vw] text-text-body">Live customer conversations will appear here.</p>
          </div>
        )}
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-[var(--radius-customer-card)] border border-customer-border bg-customer-card">
      <div className="flex items-center justify-between border-b border-customer-border px-[1.042vw] py-[0.729vw]">
        <ChatTabs statusFilter={statusFilter} isLoading={isLoading} onStatusChange={onStatusChange} />
        <div className="text-right">
          <p className="text-[clamp(15px,0.94vw,18px)] font-semibold text-text-primary">Inbox</p>
          <p className="mt-[0.2vw] text-[clamp(12px,0.72vw,14px)] text-customer-muted">{totalItems.toLocaleString("en-US")} matching chats</p>
        </div>
      </div>

      {items.length > 0 ? (
        <div className="max-h-[calc(100vh-18.4vw)] overflow-y-auto">
          <table className="w-full table-fixed border-collapse">
            <thead className="sticky top-0 z-10 bg-customer-soft">
              <tr className="border-b border-customer-border text-left text-[clamp(11px,0.68vw,13px)] font-semibold uppercase tracking-[0.08em] text-customer-muted">
                <th className="w-[5.5vw] px-[0.833vw] py-[0.521vw]">Status</th>
                <th className="w-[11.2vw] px-[0.833vw] py-[0.521vw]">Chat ID</th>
                <th className="w-[12vw] px-[0.833vw] py-[0.521vw]">Customer</th>
                <th className="w-[11vw] px-[0.833vw] py-[0.521vw]">Store</th>
                <th className="w-[9.8vw] px-[0.833vw] py-[0.521vw]">Source</th>
                <th className="px-[0.833vw] py-[0.521vw]">Last message</th>
                <th className="w-[9.2vw] px-[0.833vw] py-[0.521vw]">Activity</th>
                <th className="w-[4.8vw] px-[0.833vw] py-[0.521vw]">Unread</th>
                <th className="w-[5.4vw] px-[0.833vw] py-[0.521vw]">Action</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className={`border-b border-customer-border last:border-b-0 ${item.hasUnread ? "bg-customer-blue/35" : "bg-customer-card"}`}
                >
                  <td className="px-[0.833vw] py-[0.625vw] align-middle">
                    <ChatStatusBadge tone={item.statusTone}>{item.statusLabel}</ChatStatusBadge>
                  </td>
                  <td className="px-[0.833vw] py-[0.625vw] align-middle">
                    <p className="truncate text-[clamp(12px,0.72vw,14px)] font-medium text-text-primary">{item.chatNumber}</p>
                  </td>
                  <td className="px-[0.833vw] py-[0.625vw] align-middle">
                    <p className="truncate text-[clamp(13px,0.78vw,15px)] font-medium text-text-primary">{item.visitorName}</p>
                    <p className="mt-[0.156vw] truncate text-[clamp(11px,0.68vw,13px)] text-customer-muted">{item.visitorMeta}</p>
                  </td>
                  <td className="px-[0.833vw] py-[0.625vw] align-middle">
                    <div className="flex min-w-0 items-center gap-[0.521vw]">
                      <StoreAvatar logoUrl={item.storeLogoUrl} storeLabel={item.storeLabel} />
                      <p className="truncate text-[clamp(12px,0.72vw,14px)] text-text-body">{item.storeLabel}</p>
                    </div>
                  </td>
                  <td className="px-[0.833vw] py-[0.625vw] align-middle">
                    <p className="truncate text-[clamp(12px,0.72vw,14px)] text-text-body">{item.sourceLabel}</p>
                    {item.supportIssue ? (
                      <p className="mt-[0.156vw] truncate text-[clamp(11px,0.68vw,13px)] text-customer-muted">{item.supportIssue}</p>
                    ) : null}
                  </td>
                  <td className="px-[0.833vw] py-[0.625vw] align-middle">
                    <p className="truncate text-[clamp(13px,0.78vw,15px)] text-text-primary">{item.lastMessagePreview}</p>
                  </td>
                  <td className="px-[0.833vw] py-[0.625vw] align-middle">
                    <p className="whitespace-nowrap text-[clamp(12px,0.72vw,14px)] text-customer-muted">{item.lastMessageAtLabel}</p>
                    {item.ratingScore ? (
                      <p className="mt-[0.156vw] inline-flex items-center gap-[0.208vw] whitespace-nowrap text-[clamp(11px,0.68vw,13px)] font-semibold text-brand-blue">
                        <Star className="h-[0.729vw] w-[0.729vw] fill-current" />
                        {item.ratingScore}/5
                      </p>
                    ) : null}
                  </td>
                  <td className="px-[0.833vw] py-[0.625vw] align-middle">
                    {item.hasUnread ? (
                      <span className="inline-flex rounded-full bg-customer-blue px-[0.521vw] py-[0.156vw] text-[clamp(11px,0.68vw,13px)] font-semibold text-brand-blue">
                        {item.unreadAdminCount}
                      </span>
                    ) : (
                      <span className="text-[clamp(12px,0.72vw,14px)] text-customer-muted">0</span>
                    )}
                  </td>
                  <td className="px-[0.833vw] py-[0.625vw] align-middle">
                    <Button
                      type="button"
                      variant="ghost"
                      title="View chat"
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
          <p className="text-[clamp(18px,1.15vw,22px)] font-semibold text-text-primary">{isLoading ? "Loading chats" : "No chats found"}</p>
          <p className="mt-[0.5vw] text-[clamp(14px,0.84vw,16px)] text-text-body">Live customer conversations will appear here.</p>
        </div>
      )}
    </section>
  );
}
