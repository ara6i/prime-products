"use client";

import { ArrowLeft, RotateCcw, XCircle } from "lucide-react";
import { Button } from "@/app/shared/components/ui";
import { useAdminChatDetail } from "../hooks/useAdminChatDetail";
import type { AdminChatDetailView } from "../types";
import { ChatConversationPanel } from "./shared/ChatConversationPanel";
import { ChatStatusBadge } from "./shared/ChatStatusBadge";

interface ChatDetailPageProps {
  initialChat: AdminChatDetailView;
}

export function ChatDetailPage({ initialChat }: ChatDetailPageProps) {
  const chat = useAdminChatDetail(initialChat);
  const isClosed = chat.chat.session.status === "closed";

  return (
    <section className="space-y-[1.042vw] max-lg:space-y-[4vw]">
      <div className="flex flex-wrap items-center justify-between gap-[1vw] rounded-[var(--radius-customer-card)] border border-customer-border bg-customer-card px-[1.25vw] py-[1.042vw] max-lg:rounded-[5vw] max-lg:px-[4vw] max-lg:py-[4vw]">
        <div className="flex min-w-0 items-center gap-[0.833vw] max-lg:gap-[3vw]">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            title="Back to live chat inbox"
            onClick={chat.goBack}
            className="h-[2.083vw] w-[2.083vw] rounded-full max-lg:h-[10vw] max-lg:w-[10vw]"
          >
            <ArrowLeft className="h-[0.938vw] w-[0.938vw] max-lg:h-[4vw] max-lg:w-[4vw]" />
          </Button>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-[0.521vw] max-lg:gap-[2vw]">
              <p className="text-[clamp(12px,0.72vw,14px)] font-semibold uppercase tracking-[0.16em] text-brand-blue max-lg:text-[3vw]">Live chat</p>
              <span className={`h-[0.521vw] w-[0.521vw] rounded-full max-lg:h-[2vw] max-lg:w-[2vw] ${chat.connected ? "bg-customer-success-text" : "bg-customer-muted"}`} />
              <span className="text-[clamp(12px,0.72vw,14px)] text-customer-muted max-lg:text-[3vw]">{chat.connected ? "Live" : "Connecting"}</span>
            </div>
            <h2 className="mt-[0.25vw] truncate text-[clamp(26px,1.65vw,32px)] font-semibold leading-tight text-text-primary max-lg:mt-[1vw] max-lg:text-[6vw]">
              {chat.chat.session.chatNumber}
            </h2>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-[0.521vw] max-lg:gap-[2vw]">
          <ChatStatusBadge tone={chat.chat.session.statusTone}>{chat.chat.session.statusLabel}</ChatStatusBadge>
          {chat.chat.session.hasUnread ? <ChatStatusBadge tone="warning">{`${chat.chat.session.unreadAdminCount} unread`}</ChatStatusBadge> : null}
          {isClosed ? (
            <Button
              type="button"
              variant="ghost"
              disabled={chat.isUpdating}
              onClick={chat.reopenChat}
              className="h-[2.292vw] rounded-full px-[0.938vw] text-[clamp(13px,0.78vw,15px)] font-semibold max-lg:h-[10vw] max-lg:px-[4vw] max-lg:text-[3.3vw]"
            >
              <RotateCcw className="h-[0.833vw] w-[0.833vw] max-lg:h-[3.8vw] max-lg:w-[3.8vw]" />
              Reopen
            </Button>
          ) : (
            <Button
              type="button"
              variant="ghost"
              disabled={chat.isUpdating}
              onClick={chat.closeChat}
              className="h-[2.292vw] rounded-full px-[0.938vw] text-[clamp(13px,0.78vw,15px)] font-semibold max-lg:h-[10vw] max-lg:px-[4vw] max-lg:text-[3.3vw]"
            >
              <XCircle className="h-[0.833vw] w-[0.833vw] max-lg:h-[3.8vw] max-lg:w-[3.8vw]" />
              Close
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-[minmax(0,1fr)_minmax(16vw,0.34fr)] gap-[1.042vw] max-lg:grid-cols-1 max-lg:gap-[4vw]">
        <ChatConversationPanel
          chat={chat.chat}
          replyDraft={chat.replyDraft}
          isLoading={false}
          isSending={chat.isSending}
          onReplyDraftChange={chat.updateReplyDraft}
          onReplySubmit={chat.sendReply}
        />

        <aside className="space-y-[0.833vw] rounded-[var(--radius-customer-card)] border border-customer-border bg-customer-card p-[1.042vw] max-lg:space-y-[3vw] max-lg:rounded-[5vw] max-lg:p-[4vw]">
          <div>
            <p className="text-[clamp(12px,0.72vw,14px)] font-semibold uppercase tracking-[0.12em] text-customer-muted max-lg:text-[3vw]">Customer</p>
            <h3 className="mt-[0.417vw] truncate text-[clamp(18px,1.15vw,22px)] font-semibold text-text-primary max-lg:mt-[1.5vw] max-lg:text-[4.6vw]">
              {chat.chat.session.visitorName}
            </h3>
            <p className="mt-[0.313vw] text-[clamp(13px,0.78vw,15px)] leading-relaxed text-text-body max-lg:mt-[1vw] max-lg:text-[3.4vw]">
              {chat.chat.session.visitorMeta}
            </p>
          </div>

          <div className="border-t border-customer-border pt-[0.833vw] max-lg:pt-[3vw]">
            <p className="text-[clamp(12px,0.72vw,14px)] font-semibold uppercase tracking-[0.12em] text-customer-muted max-lg:text-[3vw]">Store</p>
            <p className="mt-[0.417vw] truncate text-[clamp(14px,0.84vw,16px)] font-medium text-text-primary max-lg:mt-[1.5vw] max-lg:text-[3.6vw]">
              {chat.chat.session.storeLabel}
            </p>
            <p className="mt-[0.313vw] text-[clamp(12px,0.72vw,14px)] text-customer-muted max-lg:mt-[1vw] max-lg:text-[3vw]">
              {chat.chat.session.sourceLabel}
            </p>
          </div>

          <div className="border-t border-customer-border pt-[0.833vw] max-lg:pt-[3vw]">
            <p className="text-[clamp(12px,0.72vw,14px)] font-semibold uppercase tracking-[0.12em] text-customer-muted max-lg:text-[3vw]">Last activity</p>
            <p className="mt-[0.417vw] text-[clamp(14px,0.84vw,16px)] text-text-primary max-lg:mt-[1.5vw] max-lg:text-[3.6vw]">
              {chat.chat.session.lastMessageAtLabel}
            </p>
          </div>

          {chat.error ? (
            <p className="rounded-[0.625vw] bg-customer-danger-bg px-[0.833vw] py-[0.625vw] text-[clamp(13px,0.78vw,15px)] font-semibold text-customer-danger-text max-lg:rounded-[3vw] max-lg:px-[4vw] max-lg:py-[3vw] max-lg:text-[3.2vw]">
              {chat.error}
            </p>
          ) : null}
        </aside>
      </div>
    </section>
  );
}
