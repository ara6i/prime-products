"use client";

import { ArrowLeft, CheckCircle2, Pin, PinOff } from "lucide-react";
import { Button } from "@/app/shared/components/ui";
import { useAdminTicketDetail } from "../hooks/useAdminTicketDetail";
import type { TicketListItem } from "../types";
import { TicketDetailPanel } from "./shared/TicketDetailPanel";

interface TicketDetailPageProps {
  initialTicket: TicketListItem;
}

export function TicketDetailPage({ initialTicket }: TicketDetailPageProps) {
  const ticket = useAdminTicketDetail(initialTicket);
  const isSolved = ticket.ticket.status === "resolved" || ticket.ticket.status === "closed";

  return (
    <section className="space-y-[1.042vw] max-lg:space-y-[4vw]">
      <div className="flex flex-wrap items-center justify-between gap-[1vw] rounded-[var(--radius-customer-card)] border border-customer-border bg-customer-card px-[1.25vw] py-[1.042vw] max-lg:rounded-[5vw] max-lg:px-[4vw] max-lg:py-[4vw]">
        <div className="flex min-w-0 items-center gap-[0.833vw] max-lg:gap-[3vw]">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            title="Back to tickets"
            onClick={ticket.goBack}
            className="h-[2.083vw] w-[2.083vw] rounded-full max-lg:h-[10vw] max-lg:w-[10vw]"
          >
            <ArrowLeft className="h-[0.938vw] w-[0.938vw] max-lg:h-[4vw] max-lg:w-[4vw]" />
          </Button>
          <div className="min-w-0">
            <p className="text-[clamp(12px,0.72vw,14px)] font-semibold uppercase tracking-[0.16em] text-brand-blue max-lg:text-[3vw]">Ticket detail</p>
            <h2 className="mt-[0.25vw] truncate text-[clamp(26px,1.65vw,32px)] font-semibold leading-tight text-text-primary max-lg:mt-[1vw] max-lg:text-[6vw]">
              {ticket.ticket.ticketNumber}
            </h2>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-[0.521vw] max-lg:gap-[2vw]">
          <Button
            type="button"
            variant="ghost"
            disabled={ticket.isUpdating}
            onClick={ticket.togglePinTicket}
            className="h-[2.292vw] rounded-full px-[0.938vw] text-[clamp(13px,0.78vw,15px)] font-semibold max-lg:h-[10vw] max-lg:px-[4vw] max-lg:text-[3.4vw]"
          >
            {ticket.ticket.isPinned ? <PinOff className="h-[0.938vw] w-[0.938vw] max-lg:h-[4vw] max-lg:w-[4vw]" /> : <Pin className="h-[0.938vw] w-[0.938vw] max-lg:h-[4vw] max-lg:w-[4vw]" />}
            {ticket.ticket.isPinned ? "Unpin" : "Pin"}
          </Button>
          <Button
            type="button"
            disabled={ticket.isUpdating || isSolved}
            onClick={ticket.solveTicket}
            className="h-[2.292vw] rounded-full px-[0.938vw] text-[clamp(13px,0.78vw,15px)] font-semibold max-lg:h-[10vw] max-lg:px-[4vw] max-lg:text-[3.4vw]"
          >
            <CheckCircle2 className="h-[0.938vw] w-[0.938vw] max-lg:h-[4vw] max-lg:w-[4vw]" />
            {isSolved ? "Solved" : "Mark solved"}
          </Button>
        </div>
      </div>

      <TicketDetailPanel
        ticket={ticket.ticket}
        replyDraft={ticket.replyDraft}
        isReplying={ticket.isReplying}
        error={ticket.error}
        notice={ticket.notice}
        onReplyDraftChange={ticket.updateReplyDraft}
        onReplySubmit={ticket.submitReply}
      />
    </section>
  );
}
