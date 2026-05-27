"use client";

import type { FormEvent } from "react";
import { Button } from "@/app/shared/components/ui";
import type { TicketListItem } from "../../types";
import { RichTicketEditor } from "./RichTicketEditor";
import { TicketToneBadge } from "./TicketToneBadge";

interface TicketReplyDraft {
  html: string;
  text: string;
  hasMedia: boolean;
}

interface TicketDetailPanelProps {
  ticket: TicketListItem | null;
  replyDraft: TicketReplyDraft;
  isReplying: boolean;
  error: string | null;
  notice: string | null;
  onReplyDraftChange: (html: string, text: string, hasMedia: boolean) => void;
  onReplySubmit: (event: FormEvent<HTMLFormElement>) => void;
}

function statusTone(status: TicketListItem["status"]): "default" | "warning" | "danger" | "success" {
  if (status === "resolved" || status === "closed") return "success";
  return "danger";
}

function priorityTone(priority: TicketListItem["priority"]): "default" | "warning" | "danger" | "success" {
  if (priority === "urgent") return "danger";
  if (priority === "high") return "warning";
  if (priority === "low") return "success";
  return "default";
}

export function TicketDetailPanel({
  ticket,
  replyDraft,
  isReplying,
  error,
  notice,
  onReplyDraftChange,
  onReplySubmit,
}: TicketDetailPanelProps) {
  if (!ticket) {
    return (
      <div className="rounded-[var(--radius-customer-card)] border border-customer-border bg-customer-card p-[3vw] text-center max-lg:rounded-[5vw] max-lg:p-[8vw]">
        <p className="text-[clamp(18px,1.15vw,22px)] font-semibold text-text-primary max-lg:text-[4.4vw]">No ticket selected</p>
        <p className="mt-[0.5vw] text-[clamp(14px,0.84vw,16px)] text-text-body max-lg:mt-[1.5vw] max-lg:text-[3.4vw]">Incoming email tickets will appear here.</p>
      </div>
    );
  }

  return (
    <section className="rounded-[var(--radius-customer-card)] border border-customer-border bg-customer-card max-lg:rounded-[5vw]">
      <div className="border-b border-customer-border p-[1.25vw] max-lg:p-[4.5vw]">
        <div className="flex flex-wrap items-center gap-[0.417vw] max-lg:gap-[1.5vw]">
          <TicketToneBadge tone={statusTone(ticket.status)}>{ticket.statusLabel}</TicketToneBadge>
          <TicketToneBadge tone={priorityTone(ticket.priority)}>{ticket.priorityLabel}</TicketToneBadge>
          <TicketToneBadge tone={ticket.emailTone}>{ticket.emailLabel}</TicketToneBadge>
        </div>
        <h3 className="mt-[0.729vw] text-[clamp(22px,1.45vw,28px)] font-semibold leading-tight text-text-primary max-lg:mt-[3vw] max-lg:text-[5.6vw]">
          {ticket.subject}
        </h3>
        <p className="mt-[0.4vw] text-[clamp(13px,0.78vw,15px)] text-text-body max-lg:mt-[1.5vw] max-lg:text-[3.2vw]">
          {ticket.ticketNumber} · {ticket.sourceLabel} · {ticket.requesterMeta}
        </p>
      </div>

      <div className="space-y-[0.833vw] p-[1.25vw] max-lg:space-y-[3vw] max-lg:p-[4.5vw]">
        {ticket.thread.map((entry) => (
          <article
            key={entry.id}
            className={entry.tone === "admin"
              ? "ml-[3vw] rounded-[0.938vw] border border-customer-border bg-customer-blue p-[0.833vw] max-lg:ml-[6vw] max-lg:rounded-[4vw] max-lg:p-[4vw]"
              : "mr-[3vw] rounded-[0.938vw] border border-customer-border bg-customer-soft p-[0.833vw] max-lg:mr-[6vw] max-lg:rounded-[4vw] max-lg:p-[4vw]"}
          >
            <div className="flex flex-wrap items-center justify-between gap-[0.625vw] max-lg:gap-[2vw]">
              <div>
                <p className="text-[clamp(14px,0.84vw,16px)] font-semibold text-text-primary max-lg:text-[3.6vw]">{entry.authorLabel}</p>
                <p className="mt-[0.2vw] text-[clamp(12px,0.72vw,14px)] text-customer-muted max-lg:mt-[1vw] max-lg:text-[3vw]">{entry.authorMeta}</p>
              </div>
              <div className="text-right">
                <p className="text-[clamp(12px,0.72vw,14px)] text-customer-muted max-lg:text-[3vw]">{entry.dateLabel}</p>
                {entry.deliveryLabel ? (
                  <div className="mt-[0.25vw] max-lg:mt-[1vw]">
                    <TicketToneBadge tone={entry.deliveryTone}>{entry.deliveryLabel}</TicketToneBadge>
                  </div>
                ) : null}
              </div>
            </div>
            {entry.bodyHtml ? (
              <div
                className="mt-[0.833vw] break-words text-[clamp(14px,0.84vw,16px)] leading-relaxed text-text-body max-lg:mt-[3vw] max-lg:text-[3.5vw] [&_a]:font-semibold [&_a]:text-brand-blue [&_blockquote]:border-l-[0.208vw] [&_blockquote]:border-brand-blue [&_blockquote]:pl-[0.833vw] [&_img]:my-[0.625vw] [&_img]:max-h-[22vw] [&_img]:max-w-full [&_img]:rounded-[0.625vw] [&_li]:ml-[1.25vw] [&_ol]:list-decimal [&_p]:mb-[0.625vw] [&_ul]:list-disc max-lg:[&_blockquote]:pl-[3vw] max-lg:[&_img]:max-h-[80vw] max-lg:[&_li]:ml-[5vw]"
                dangerouslySetInnerHTML={{ __html: entry.bodyHtml }}
              />
            ) : (
              <p className="mt-[0.833vw] whitespace-pre-wrap text-[clamp(14px,0.84vw,16px)] leading-relaxed text-text-body max-lg:mt-[3vw] max-lg:text-[3.5vw]">
                {entry.body}
              </p>
            )}
          </article>
        ))}
      </div>

      <form onSubmit={onReplySubmit} className="border-t border-customer-border p-[1.25vw] max-lg:p-[4.5vw]">
        <label className="block">
          <span className="sr-only">Answer ticket</span>
          <RichTicketEditor
            value={replyDraft.html}
            disabled={isReplying}
            onChange={onReplyDraftChange}
          />
        </label>

        {error ? <p className="mt-[0.833vw] text-[clamp(13px,0.78vw,15px)] font-semibold text-customer-danger-text max-lg:mt-[3vw] max-lg:text-[3.2vw]">{error}</p> : null}
        {notice ? <p className="mt-[0.833vw] text-[clamp(13px,0.78vw,15px)] font-semibold text-customer-success-text max-lg:mt-[3vw] max-lg:text-[3.2vw]">{notice}</p> : null}

        <Button
          type="submit"
          disabled={isReplying || (!replyDraft.text.trim() && !replyDraft.hasMedia)}
          className="mt-[1vw] h-[2.604vw] rounded-full px-[1.25vw] text-[clamp(14px,0.84vw,16px)] font-semibold max-lg:mt-[4vw] max-lg:h-[11vw] max-lg:px-[5vw] max-lg:text-[3.6vw]"
        >
          {isReplying ? "Sending" : "Send answer"}
        </Button>
      </form>
    </section>
  );
}
