"use client";

import { type FormEvent, useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { mapTicketsPage } from "../mappers/ticketsMapper";
import {
  fetchAdminTicketsClient,
  replyAdminTicketClient,
  updateAdminTicketClient,
} from "../services/ticketsClientService";
import type {
  AdminTicketListQuery,
  AdminTicketQueue,
  TicketListItem,
  TicketsViewModel,
} from "../types";

interface ReplyDraftState {
  html: string;
  text: string;
  hasMedia: boolean;
}

export interface UseAdminTicketsResult {
  view: TicketsViewModel;
  listQuery: AdminTicketListQuery;
  searchInput: string;
  selectedTicket: TicketListItem | null;
  selectedTicketId: string | null;
  replyDraft: ReplyDraftState;
  isLoading: boolean;
  isReplying: boolean;
  isUpdating: boolean;
  error: string | null;
  notice: string | null;
  selectTicket: (id: string) => void;
  updateSearchInput: (value: string) => void;
  submitSearch: (event: FormEvent<HTMLFormElement>) => void;
  changeQueue: (queue: AdminTicketQueue) => void;
  goToPage: (page: number) => void;
  solveTicket: (id: string) => void;
  togglePinTicket: (id: string, isPinned: boolean) => void;
  updateReplyDraft: (html: string, text: string, hasMedia: boolean) => void;
  submitReply: (event: FormEvent<HTMLFormElement>) => void;
}

const defaultListQuery: AdminTicketListQuery = {
  page: 1,
  limit: 25,
  queue: "pending",
  query: "",
};

const emptyReplyDraft: ReplyDraftState = {
  html: "",
  text: "",
  hasMedia: false,
};

export function useAdminTickets(initialView: TicketsViewModel): UseAdminTicketsResult {
  const router = useRouter();
  const [view, setView] = useState(initialView);
  const [listQuery, setListQuery] = useState(defaultListQuery);
  const [searchInput, setSearchInput] = useState(defaultListQuery.query);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(initialView.items[0]?.id ?? null);
  const [replyDraft, setReplyDraft] = useState<ReplyDraftState>(emptyReplyDraft);
  const [isLoading, setIsLoading] = useState(false);
  const [isReplying, setIsReplying] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const selectedTicket = useMemo(
    () => view.items.find((item) => item.id === selectedTicketId) ?? view.items[0] ?? null,
    [view.items, selectedTicketId],
  );

  const loadTickets = useCallback(async (nextQuery: AdminTicketListQuery) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetchAdminTicketsClient(nextQuery);
      const nextView = mapTicketsPage(response);
      setView(nextView);
      setListQuery(nextQuery);
      setSelectedTicketId((current) => (
        current && nextView.items.some((item) => item.id === current)
          ? current
          : nextView.items[0]?.id ?? null
      ));
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshTickets = useCallback(async () => {
    await loadTickets(listQuery);
  }, [listQuery, loadTickets]);

  const selectTicket = useCallback((id: string) => {
    router.push(`/admin/tickets/${encodeURIComponent(id)}`);
  }, [router]);

  const updateSearchInput = useCallback((value: string) => {
    setSearchInput(value);
  }, []);

  const submitSearch = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void loadTickets({
      ...listQuery,
      page: 1,
      query: searchInput.trim(),
    }).catch((err) => {
      setIsLoading(false);
      setError(err instanceof Error ? err.message : "Failed to load tickets");
    });
  }, [listQuery, loadTickets, searchInput]);

  const changeQueue = useCallback((queue: AdminTicketQueue) => {
    const nextQuery = {
      ...listQuery,
      page: 1,
      queue,
    };
    void loadTickets(nextQuery).catch((err) => {
      setIsLoading(false);
      setError(err instanceof Error ? err.message : "Failed to load tickets");
    });
  }, [listQuery, loadTickets]);

  const goToPage = useCallback((page: number) => {
    const nextPage = Math.min(Math.max(page, 1), view.pagination.totalPages);
    if (nextPage === listQuery.page) return;
    void loadTickets({
      ...listQuery,
      page: nextPage,
    }).catch((err) => {
      setIsLoading(false);
      setError(err instanceof Error ? err.message : "Failed to load tickets");
    });
  }, [listQuery, loadTickets, view.pagination.totalPages]);

  const updateReplyDraft = useCallback((html: string, text: string, hasMedia: boolean) => {
    setReplyDraft({ html, text, hasMedia });
  }, []);

  const solveTicket = useCallback((id: string) => {
    setIsUpdating(true);
    setError(null);
    updateAdminTicketClient(id, { status: "resolved" })
      .then(() => refreshTickets())
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to mark ticket as solved");
      })
      .finally(() => setIsUpdating(false));
  }, [refreshTickets]);

  const togglePinTicket = useCallback((id: string, isPinned: boolean) => {
    setIsUpdating(true);
    setError(null);
    updateAdminTicketClient(id, { isPinned: !isPinned })
      .then(() => refreshTickets())
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to update pinned ticket");
      })
      .finally(() => setIsUpdating(false));
  }, [refreshTickets]);

  const submitReply = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedTicket) return;
    const body = replyDraft.text.trim() || (replyDraft.hasMedia ? "Screenshot attached" : "");
    if (!body) {
      setError("Reply body is required");
      return;
    }

    setIsReplying(true);
    setError(null);
    setNotice(null);

    replyAdminTicketClient(selectedTicket.id, {
      body,
      bodyHtml: replyDraft.html,
    })
      .then((ticket) => {
        setReplyDraft(emptyReplyDraft);
        setNotice(
          ticket.replies.some((reply) => reply.emailDelivery.status === "failed")
            ? "Reply saved, but email delivery needs attention."
            : "Reply sent to the requester.",
        );
        return refreshTickets();
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to reply to ticket");
      })
      .finally(() => {
        setIsReplying(false);
      });
  }, [refreshTickets, replyDraft, selectedTicket]);

  return useMemo(
    () => ({
      view,
      listQuery,
      searchInput,
      selectedTicket,
      selectedTicketId: selectedTicket?.id ?? null,
      replyDraft,
      isLoading,
      isReplying,
      isUpdating,
      error,
      notice,
      selectTicket,
      updateSearchInput,
      submitSearch,
      changeQueue,
      goToPage,
      solveTicket,
      togglePinTicket,
      updateReplyDraft,
      submitReply,
    }),
    [
      view,
      listQuery,
      searchInput,
      selectedTicket,
      replyDraft,
      isLoading,
      isReplying,
      isUpdating,
      error,
      notice,
      selectTicket,
      updateSearchInput,
      submitSearch,
      changeQueue,
      goToPage,
      solveTicket,
      togglePinTicket,
      updateReplyDraft,
      submitReply,
    ],
  );
}
