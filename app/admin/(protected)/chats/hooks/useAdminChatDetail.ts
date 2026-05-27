"use client";

import { type FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { mapChatDetail, mapChatMessage, mapChatSession } from "../mappers/chatsMapper";
import {
  sendAdminChatMessageClient,
  updateAdminChatClient,
} from "../services/chatsClientService";
import type {
  AdminChatDetailRaw,
  AdminChatDetailView,
  AdminChatStreamPayload,
} from "../types";

export interface UseAdminChatDetailResult {
  chat: AdminChatDetailView;
  replyDraft: string;
  connected: boolean;
  isSending: boolean;
  isUpdating: boolean;
  error: string | null;
  goBack: () => void;
  updateReplyDraft: (value: string) => void;
  sendReply: (event: FormEvent<HTMLFormElement>) => void;
  closeChat: () => void;
  reopenChat: () => void;
}

function mergeDetail(current: AdminChatDetailView, detail: AdminChatDetailRaw): AdminChatDetailView {
  const mapped = mapChatDetail(detail);
  if (current.session.id !== mapped.session.id) return current;

  const currentIds = new Set(current.messages.map((message) => message.id));
  return {
    session: mapped.session,
    messages: [
      ...current.messages,
      ...mapped.messages.filter((message) => !currentIds.has(message.id)),
    ],
  };
}

export function useAdminChatDetail(initialChat: AdminChatDetailView): UseAdminChatDetailResult {
  const router = useRouter();
  const [chat, setChat] = useState(initialChat);
  const [replyDraft, setReplyDraft] = useState("");
  const [connected, setConnected] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const chatIdRef = useRef(initialChat.session.id);

  useEffect(() => {
    chatIdRef.current = chat.session.id;
  }, [chat.session.id]);

  const goBack = useCallback(() => {
    router.push("/admin/chats");
  }, [router]);

  useEffect(() => {
    const eventSource = new EventSource("/api/admin/chats/stream");
    eventSource.onopen = () => setConnected(true);
    eventSource.onerror = () => setConnected(false);
    eventSource.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as AdminChatStreamPayload;
        const session = parsed.data?.session;
        const message = parsed.data?.message;

        if (session?.id === chatIdRef.current) {
          setChat((current) => ({
            ...current,
            session: mapChatSession(session),
          }));
        }

        if (message?.sessionId === chatIdRef.current) {
          setChat((current) => {
            if (current.messages.some((item) => item.id === message.id)) return current;
            return {
              ...current,
              messages: [...current.messages, mapChatMessage(message)],
            };
          });
        }
      } catch {
        // Ignore malformed stream events.
      }
    };

    return () => eventSource.close();
  }, []);

  const sendReply = useCallback((event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!replyDraft.trim()) return;

    setIsSending(true);
    setError(null);

    sendAdminChatMessageClient(chat.session.id, { body: replyDraft.trim() })
      .then((detail) => {
        setChat((current) => mergeDetail(current, detail));
        setReplyDraft("");
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to send message"))
      .finally(() => setIsSending(false));
  }, [chat.session.id, replyDraft]);

  const updateChatStatus = useCallback((status: "open" | "closed") => {
    setIsUpdating(true);
    setError(null);

    updateAdminChatClient(chat.session.id, { status })
      .then((detail) => setChat(mapChatDetail(detail)))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to update chat"))
      .finally(() => setIsUpdating(false));
  }, [chat.session.id]);

  return useMemo(
    () => ({
      chat,
      replyDraft,
      connected,
      isSending,
      isUpdating,
      error,
      goBack,
      updateReplyDraft: setReplyDraft,
      sendReply,
      closeChat: () => updateChatStatus("closed"),
      reopenChat: () => updateChatStatus("open"),
    }),
    [
      chat,
      connected,
      error,
      goBack,
      isSending,
      isUpdating,
      replyDraft,
      sendReply,
      updateChatStatus,
    ],
  );
}
