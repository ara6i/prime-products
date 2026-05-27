"use client";

import type { FormEvent } from "react";
import { RotateCcw, Send, XCircle } from "lucide-react";
import { Button } from "@/app/shared/components/ui";
import type { AdminChatDetailView } from "../../types";
import { ChatStatusBadge } from "./ChatStatusBadge";

interface ChatConversationPanelProps {
  chat: AdminChatDetailView | null;
  replyDraft: string;
  isLoading: boolean;
  isSending: boolean;
  isUpdating: boolean;
  onReplyDraftChange: (value: string) => void;
  onReplySubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCloseChat: () => void;
  onReopenChat: () => void;
}

function messageClasses(tone: AdminChatDetailView["messages"][number]["tone"]): string {
  if (tone === "admin") {
    return "ml-auto border-brand-blue/20 bg-customer-blue text-text-primary";
  }
  if (tone === "system") {
    return "mx-auto border-customer-border bg-customer-soft text-customer-muted";
  }
  return "mr-auto border-customer-border bg-customer-card text-text-primary";
}

function StoreLogo({
  logoUrl,
  storeLabel,
}: {
  logoUrl: string | null;
  storeLabel: string;
}) {
  const fallback = storeLabel.trim().slice(0, 1).toUpperCase() || "S";
  return (
    <div className="flex h-[2.8vw] w-[2.8vw] shrink-0 items-center justify-center overflow-hidden rounded-full border border-customer-border bg-customer-soft text-[clamp(14px,0.84vw,16px)] font-semibold text-text-primary max-lg:h-[11vw] max-lg:w-[11vw] max-lg:text-[4vw]">
      {logoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={logoUrl} alt={`${storeLabel} logo`} className="h-full w-full object-cover" />
      ) : (
        fallback
      )}
    </div>
  );
}

export function ChatConversationPanel({
  chat,
  replyDraft,
  isLoading,
  isUpdating,
  onReplyDraftChange,
  onReplySubmit,
  onCloseChat,
  onReopenChat,
}: ChatConversationPanelProps) {
  if (!chat) {
    return (
      <section className="flex min-h-[34vw] items-center justify-center rounded-[var(--radius-customer-card)] border border-customer-border bg-customer-card p-[3vw] text-center max-lg:min-h-[70vw] max-lg:rounded-[5vw] max-lg:p-[8vw]">
        <div>
          <p className="text-[clamp(20px,1.25vw,24px)] font-semibold text-text-primary max-lg:text-[5vw]">{isLoading ? "Loading chat" : "Select a chat"}</p>
          <p className="mt-[0.5vw] text-[clamp(14px,0.84vw,16px)] text-text-body max-lg:mt-[2vw] max-lg:text-[3.5vw]">Open a live conversation to reply in real time.</p>
        </div>
      </section>
    );
  }

  const isClosed = chat.session.status === "closed";

  return (
    <section className="flex h-[calc(100vh-16vw)] min-h-[34vw] flex-col overflow-hidden rounded-[var(--radius-customer-card)] border border-customer-border bg-customer-card max-lg:h-auto max-lg:min-h-[120vw] max-lg:rounded-[5vw]">
      <div className="border-b border-customer-border p-[1.042vw] max-lg:p-[4vw]">
        <div className="flex flex-wrap items-start justify-between gap-[1vw] max-lg:gap-[3vw]">
          <div className="flex min-w-0 items-start gap-[0.833vw] max-lg:gap-[3vw]">
            <StoreLogo logoUrl={chat.session.storeLogoUrl} storeLabel={chat.session.storeLabel} />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-[0.417vw] max-lg:gap-[1.5vw]">
                <ChatStatusBadge tone={chat.session.statusTone}>{chat.session.statusLabel}</ChatStatusBadge>
                <span className="text-[clamp(12px,0.72vw,14px)] text-customer-muted max-lg:text-[3vw]">{chat.session.chatNumber}</span>
              </div>
              <h2 className="mt-[0.521vw] truncate text-[clamp(22px,1.45vw,28px)] font-semibold leading-tight text-text-primary max-lg:mt-[2vw] max-lg:text-[5.6vw]">{chat.session.visitorName}</h2>
              <p className="mt-[0.313vw] truncate text-[clamp(13px,0.78vw,15px)] text-text-body max-lg:mt-[1vw] max-lg:text-[3.2vw]">{chat.session.visitorMeta}</p>
              <p className="mt-[0.208vw] truncate text-[clamp(12px,0.72vw,14px)] text-customer-muted max-lg:mt-[0.8vw] max-lg:text-[3vw]">{chat.session.storeLabel} · {chat.session.sourceLabel}</p>
            </div>
          </div>

          <div className="flex items-center gap-[0.521vw] max-lg:gap-[2vw]">
            {isClosed ? (
              <Button type="button" variant="ghost" disabled={isUpdating} onClick={onReopenChat} className="h-[2.292vw] rounded-full px-[0.938vw] text-[clamp(13px,0.78vw,15px)] font-semibold max-lg:h-[10vw] max-lg:px-[4vw] max-lg:text-[3.3vw]">
                <RotateCcw className="h-[0.833vw] w-[0.833vw] max-lg:h-[3.8vw] max-lg:w-[3.8vw]" />
                Reopen
              </Button>
            ) : (
              <Button type="button" variant="ghost" disabled={isUpdating} onClick={onCloseChat} className="h-[2.292vw] rounded-full px-[0.938vw] text-[clamp(13px,0.78vw,15px)] font-semibold max-lg:h-[10vw] max-lg:px-[4vw] max-lg:text-[3.3vw]">
                <XCircle className="h-[0.833vw] w-[0.833vw] max-lg:h-[3.8vw] max-lg:w-[3.8vw]" />
                Close
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-[0.729vw] overflow-y-auto bg-customer-soft/45 p-[1.042vw] max-lg:space-y-[3vw] max-lg:p-[4vw]">
        {chat.messages.map((message) => (
          <article
            key={message.id}
            className={`max-w-[72%] rounded-[0.938vw] border px-[0.833vw] py-[0.625vw] max-lg:max-w-[88%] max-lg:rounded-[4vw] max-lg:px-[4vw] max-lg:py-[3vw] ${messageClasses(message.tone)}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-[0.625vw] max-lg:gap-[2vw]">
              <p className="text-[clamp(12px,0.72vw,14px)] font-semibold max-lg:text-[3.2vw]">{message.authorName}</p>
              <p className="text-[clamp(11px,0.68vw,13px)] text-customer-muted max-lg:text-[2.8vw]">{message.createdAtLabel}</p>
            </div>
            <p className="mt-[0.417vw] whitespace-pre-wrap text-[clamp(14px,0.84vw,16px)] font-normal leading-relaxed max-lg:mt-[1.5vw] max-lg:text-[3.5vw]">{message.body}</p>
          </article>
        ))}
      </div>

      <form onSubmit={onReplySubmit} className="border-t border-customer-border p-[1.042vw] max-lg:p-[4vw]">
        <textarea
          value={replyDraft}
          onChange={(event) => onReplyDraftChange(event.target.value)}
          disabled={isClosed}
          placeholder={isClosed ? "Reopen the chat to reply" : "Type a reply..."}
          className="min-h-[5.2vw] w-full resize-none rounded-[0.833vw] border border-customer-border bg-customer-card px-[0.833vw] py-[0.729vw] text-[clamp(14px,0.84vw,16px)] font-normal leading-relaxed text-text-primary outline-none placeholder:text-customer-muted disabled:bg-customer-soft disabled:text-customer-muted max-lg:min-h-[28vw] max-lg:rounded-[4vw] max-lg:px-[4vw] max-lg:py-[3vw] max-lg:text-[3.5vw]"
        />
        <div className="mt-[0.729vw] flex justify-end max-lg:mt-[3vw]">
          <Button type="submit" disabled={isClosed || !replyDraft.trim()} className="h-[2.604vw] rounded-full px-[1.25vw] text-[clamp(14px,0.84vw,16px)] font-semibold max-lg:h-[11vw] max-lg:px-[5vw] max-lg:text-[3.6vw]">
            <Send className="h-[0.938vw] w-[0.938vw] max-lg:h-[4vw] max-lg:w-[4vw]" />
            Send
          </Button>
        </div>
      </form>
    </section>
  );
}
