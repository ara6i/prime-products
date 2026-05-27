"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { mapChatSession, mapChatsPage } from "../mappers/chatsMapper";
import { fetchAdminChatsClient } from "../services/chatsClientService";
import type {
  AdminChatListQuery,
  AdminChatsViewModel,
  AdminChatSessionRaw,
  AdminChatStatusFilter,
  AdminChatStreamPayload,
  ChatSessionItem,
} from "../types";

export interface UseAdminChatsResult {
  view: AdminChatsViewModel;
  listQuery: AdminChatListQuery;
  searchInput: string;
  connected: boolean;
  isLoading: boolean;
  error: string | null;
  updateSearchInput: (value: string) => void;
  submitSearch: (event: FormEvent<HTMLFormElement>) => void;
  changeStatusFilter: (status: AdminChatStatusFilter) => void;
  goToPage: (page: number) => void;
  selectChat: (id: string) => void;
}

const defaultQuery: AdminChatListQuery = {
  page: 1,
  limit: 25,
  status: "open",
  query: "",
};

function upsertSession(items: ChatSessionItem[], session: AdminChatSessionRaw): ChatSessionItem[] {
  const mapped = mapChatSession(session);
  const withoutExisting = items.filter((item) => item.id !== mapped.id);
  return [mapped, ...withoutExisting];
}

function shouldShowSession(session: AdminChatSessionRaw, query: AdminChatListQuery): boolean {
  if (query.status !== "all" && session.status !== query.status) return false;
  const term = query.query.trim().toLowerCase();
  if (!term) return true;
  return [
    session.chatNumber,
    session.visitorName,
    session.visitorEmail,
    session.visitorCompany,
    session.storeDomain,
  ].some((value) => value?.toLowerCase().includes(term));
}

export function useAdminChats(initialView: AdminChatsViewModel): UseAdminChatsResult {
  const router = useRouter();
  const [view, setView] = useState(initialView);
  const [listQuery, setListQuery] = useState<AdminChatListQuery>(defaultQuery);
  const [searchInput, setSearchInput] = useState("");
  const [connected, setConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listQueryRef = useRef(listQuery);

  useEffect(() => {
    listQueryRef.current = listQuery;
  }, [listQuery]);

  const loadChats = useCallback((query: AdminChatListQuery) => {
    setIsLoading(true);
    setError(null);
    listQueryRef.current = query;
    fetchAdminChatsClient(query)
      .then((response) => {
        setView(mapChatsPage(response));
        setListQuery(query);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load chats"))
      .finally(() => setIsLoading(false));
  }, []);

  const selectChat = useCallback((id: string) => {
    router.push(`/admin/chats/${encodeURIComponent(id)}`);
  }, [router]);

  useEffect(() => {
    const eventSource = new EventSource("/api/admin/chats/stream");
    eventSource.onopen = () => setConnected(true);
    eventSource.onerror = () => setConnected(false);
    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as AdminChatStreamPayload;
        const session = parsed.data?.session;

        if (typeof parsed.data?.onlineCustomers === "number") {
          setView((current) => ({
            ...current,
            stats: current.stats.map((stat) => (
              stat.label === "Online" ? { ...stat, value: String(parsed.data?.onlineCustomers ?? 0) } : stat
            )),
          }));
        }

        if (session) {
          setView((current) => ({
            ...current,
            items: shouldShowSession(session, listQueryRef.current)
              ? upsertSession(current.items, session)
              : current.items.filter((item) => item.id !== session.id),
          }));
        }
      } catch {
        // Ignore malformed stream events.
      }
    };

    return () => eventSource.close();
  }, []);

  const submitSearch = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    loadChats({ ...listQuery, page: 1, query: searchInput.trim() });
  }, [listQuery, loadChats, searchInput]);

  const changeStatusFilter = useCallback((status: AdminChatStatusFilter) => {
    loadChats({ ...listQuery, status, page: 1 });
  }, [listQuery, loadChats]);

  const goToPage = useCallback((page: number) => {
    const nextPage = Math.min(Math.max(page, 1), view.pagination.totalPages);
    if (nextPage === listQuery.page) return;
    loadChats({ ...listQuery, page: nextPage });
  }, [listQuery, loadChats, view.pagination.totalPages]);

  return useMemo(
    () => ({
      view,
      listQuery,
      searchInput,
      connected,
      isLoading,
      error,
      updateSearchInput: setSearchInput,
      submitSearch,
      changeStatusFilter,
      goToPage,
      selectChat,
    }),
    [
      changeStatusFilter,
      connected,
      error,
      goToPage,
      isLoading,
      listQuery,
      searchInput,
      selectChat,
      submitSearch,
      view,
    ],
  );
}
