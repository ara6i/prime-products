"use client";

import type { FormEvent } from "react";
import { Send } from "lucide-react";
import { Button } from "@/app/shared/components/ui";
import type { AdminChatDetailView } from "../../types";

interface ChatConversationPanelProps {
  chat: AdminChatDetailView | null;
  replyDraft: string;
  isLoading: boolean;
  isSending: boolean;
  onReplyDraftChange: (value: string) => void;
  onReplySubmit: (event: FormEvent<HTMLFormElement>) => void;
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

export function ChatConversationPanel({
  chat,
  replyDraft,
  isLoading,
  isSending,
  onReplyDraftChange,
  onReplySubmit,
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
      <div className="min-h-0 flex-1 space-y-[0.729vw] overflow-y-auto bg-customer-soft/45 p-[1.042vw] max-lg:space-y-[3vw] max-lg:p-[4vw]">
        {chat.session.ratingScore && chat.session.ratingNote ? (
          <div className="rounded-[0.833vw] border border-brand-blue/20 bg-customer-card px-[0.833vw] py-[0.625vw] text-[clamp(13px,0.78vw,15px)] text-text-body max-lg:rounded-[4vw] max-lg:px-[4vw] max-lg:py-[3vw] max-lg:text-[3.3vw]">
            <p className="font-semibold text-text-primary">Support rating note</p>
            <p className="mt-[0.313vw] whitespace-pre-wrap leading-relaxed max-lg:mt-[1.5vw]">{chat.session.ratingNote}</p>
            {chat.session.ratedAtLabel ? (
              <p className="mt-[0.313vw] text-[clamp(11px,0.68vw,13px)] text-customer-muted max-lg:mt-[1.5vw] max-lg:text-[2.8vw]">
                Rated {chat.session.ratedAtLabel}
              </p>
            ) : null}
          </div>
        ) : null}
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

      <form onSubmit={onReplySubmit} className="border-t border-customer-border p-[0.833vw] max-lg:p-[3vw]">
        <textarea
          value={replyDraft}
          onChange={(event) => onReplyDraftChange(event.target.value)}
          disabled={isSending || isClosed}
          placeholder={isClosed ? "Reopen the chat to reply" : "Type a reply..."}
          className="min-h-[3.333vw] w-full resize-none rounded-[0.729vw] border border-customer-border bg-customer-card px-[0.833vw] py-[0.521vw] text-[clamp(14px,0.84vw,16px)] font-normal leading-relaxed text-text-primary outline-none placeholder:text-customer-muted disabled:bg-customer-soft disabled:text-customer-muted max-lg:min-h-[18vw] max-lg:rounded-[3.5vw] max-lg:px-[4vw] max-lg:py-[2.5vw] max-lg:text-[3.5vw]"
        />
        <div className="mt-[0.521vw] flex justify-end max-lg:mt-[2vw]">
          <Button type="submit" disabled={isSending || isClosed || !replyDraft.trim()} className="h-[2.292vw] rounded-full px-[1.042vw] text-[clamp(13px,0.78vw,15px)] font-semibold max-lg:h-[10vw] max-lg:px-[4.5vw] max-lg:text-[3.4vw]">
            <Send className="h-[0.938vw] w-[0.938vw] max-lg:h-[4vw] max-lg:w-[4vw]" />
            {isSending ? "Sending" : "Send"}
          </Button>
        </div>
      </form>
    </section>
  );
}
