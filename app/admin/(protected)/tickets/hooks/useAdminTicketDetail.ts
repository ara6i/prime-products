"use client";

import { type FormEvent, useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { mapTicket } from "../mappers/ticketsMapper";
import { replyAdminTicketClient, updateAdminTicketClient } from "../services/ticketsClientService";
import type { TicketListItem } from "../types";

interface ReplyDraftState {
  html: string;
  text: string;
  hasMedia: boolean;
}

export interface UseAdminTicketDetailResult {
  ticket: TicketListItem;
  replyDraft: ReplyDraftState;
  isReplying: boolean;
  isUpdating: boolean;
  error: string | null;
  notice: string | null;
  goBack: () => void;
  updateReplyDraft: (html: string, text: string, hasMedia: boolean) => void;
  submitReply: (event: FormEvent<HTMLFormElement>) => void;
  solveTicket: () => void;
  togglePinTicket: () => void;
}

const emptyReplyDraft: ReplyDraftState = {
  html: "",
  text: "",
  hasMedia: false,
};

export function useAdminTicketDetail(initialTicket: TicketListItem): UseAdminTicketDetailResult {
  const router = useRouter();
  const [ticket, setTicket] = useState(initialTicket);
  const [replyDraft, setReplyDraft] = useState<ReplyDraftState>(emptyReplyDraft);
  const [isReplying, setIsReplying] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const goBack = useCallback(() => {
    router.push("/admin/tickets");
  }, [router]);

  const updateReplyDraft = useCallback((html: string, text: string, hasMedia: boolean) => {
    setReplyDraft({ html, text, hasMedia });
  }, []);

  const submitReply = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const body = replyDraft.text.trim() || (replyDraft.hasMedia ? "Screenshot attached" : "");
    if (!body) {
      setError("Reply body is required");
      return;
    }

    setIsReplying(true);
    setError(null);
    setNotice(null);

    replyAdminTicketClient(ticket.id, {
      body,
      bodyHtml: replyDraft.html,
    })
      .then((updatedTicket) => {
        setTicket(mapTicket(updatedTicket));
        setReplyDraft(emptyReplyDraft);
        setNotice(
          updatedTicket.replies.some((reply) => reply.emailDelivery.status === "failed")
            ? "Reply saved, but email delivery needs attention."
            : "Answer sent to the requester.",
        );
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to answer ticket");
      })
      .finally(() => setIsReplying(false));
  }, [replyDraft, ticket.id]);

  const solveTicket = useCallback(() => {
    setIsUpdating(true);
    setError(null);
    setNotice(null);
    updateAdminTicketClient(ticket.id, { status: "resolved" })
      .then((updatedTicket) => {
        setTicket(mapTicket(updatedTicket));
        setNotice("Ticket marked as solved.");
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to mark ticket as solved");
      })
      .finally(() => setIsUpdating(false));
  }, [ticket.id]);

  const togglePinTicket = useCallback(() => {
    setIsUpdating(true);
    setError(null);
    setNotice(null);
    updateAdminTicketClient(ticket.id, { isPinned: !ticket.isPinned })
      .then((updatedTicket) => {
        setTicket(mapTicket(updatedTicket));
        setNotice(updatedTicket.isPinned ? "Ticket pinned to the top." : "Ticket unpinned.");
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to update pinned ticket");
      })
      .finally(() => setIsUpdating(false));
  }, [ticket.id, ticket.isPinned]);

  return useMemo(
    () => ({
      ticket,
      replyDraft,
      isReplying,
      isUpdating,
      error,
      notice,
      goBack,
      updateReplyDraft,
      submitReply,
      solveTicket,
      togglePinTicket,
    }),
    [
      ticket,
      replyDraft,
      isReplying,
      isUpdating,
      error,
      notice,
      goBack,
      updateReplyDraft,
      submitReply,
      solveTicket,
      togglePinTicket,
    ],
  );
}
